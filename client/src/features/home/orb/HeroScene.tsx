import { useEffect, useRef, useState, type ReactNode } from 'react';
import { supportsWebGL, useAllowMotion } from '../../../components/effects/preferences';
import { cn } from '../../../lib/cn';
import type { OrbScene } from './orbController';

const LOAD_TIMEOUT_MS = 20_000;

function prefersSavingData(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData === true;
}

type Status = 'waiting' | 'loading' | 'ready' | 'failed';

interface HeroSceneProps {
  /** Accessible description of what the scene shows. */
  label: string;
  /** Static artwork shown first, and kept whenever the 3D scene is not used. */
  poster: ReactNode;
  /** Must give the element a size and position (e.g. `absolute inset-0`). */
  className: string;
  /** Called with the running scene once its first frame is drawn. */
  onReady?: (scene: OrbScene) => void;
}

/**
 * The hero's 3D mountains, drawn behind a static poster. The scene code is fetched and mounted
 * when the hero is near the viewport, with WebGL available, motion allowed and data saving off.
 * Any failure (no WebGL, a lost context, a stall) leaves the poster in place.
 */
export function HeroScene({ label, poster, className, onReady }: HeroSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  const allowMotion = useAllowMotion();
  const [nearViewport, setNearViewport] = useState(false);
  const [status, setStatus] = useState<Status>('waiting');
  const eligible = allowMotion && supportsWebGL() && !prefersSavingData();
  const mount = eligible && nearViewport && status !== 'failed';

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || nearViewport) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setNearViewport(true);
      },
      { rootMargin: '300px 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [nearViewport]);

  useEffect(() => {
    const host = canvasRef.current;
    if (!mount || !host) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    setStatus((current) => (current === 'waiting' ? 'loading' : current));
    const timer = window.setTimeout(() => setStatus((current) => (current === 'ready' ? current : 'failed')), LOAD_TIMEOUT_MS);

    import('./mountainScene')
      .then(({ createMountainScene }) => {
        if (cancelled) return;
        const scene = createMountainScene(host, () => setStatus('failed'));
        dispose = () => scene.dispose();
        return scene.ready.then(() => {
          if (cancelled) return;
          setStatus('ready');
          onReadyRef.current?.(scene);
        });
      })
      .catch(() => {
        if (!cancelled) setStatus('failed');
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      dispose?.();
    };
  }, [mount]);

  const showing = status === 'ready' && mount;
  return (
    <div ref={containerRef} role="img" aria-label={label} data-scene-status={status === 'failed' ? 'failed' : mount ? status : 'poster'} className={cn('overflow-hidden', className)}>
      <div aria-hidden="true" className={cn('absolute inset-0 transition-opacity duration-1000', showing ? 'opacity-0' : 'opacity-100')}>
        {poster}
      </div>
      {mount ? <div ref={canvasRef} className={cn('absolute inset-0 transition-opacity duration-1000', showing ? 'opacity-100' : 'opacity-0')} /> : null}
    </div>
  );
}

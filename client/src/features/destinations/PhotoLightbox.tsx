import { ChevronLeft, ChevronRight, ImageOff, X } from 'lucide-react';
import { AnimatePresence, motion, type PanInfo } from 'motion/react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useAllowMotion } from '../../components/effects/preferences';
import { cn } from '../../lib/cn';
import { imageSrcSet, imageUrl } from '../../lib/images';
import type { ImageRef } from '../../lib/types';

interface LightboxProps {
  images: ImageRef[];
  /** Index to show, or null when closed. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
  place: string;
}

/**
 * Full-screen photo viewer on the native <dialog> (focus trap, Escape, focus restoration).
 * Previous/next buttons, arrow keys, swipe and the thumbnail strip all move between photos.
 */
export function PhotoLightbox({ images, index, onIndexChange, place }: LightboxProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const allowMotion = useAllowMotion();
  const [direction, setDirection] = useState(0);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const open = index !== null;
  const count = images.length;
  const position = index ?? 0;
  const current = index === null ? undefined : images[index];

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const go = (step: number) => {
    if (index === null || count < 2) return;
    setDirection(step);
    onIndexChange((index + step + count) % count);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(-1);
    }
  };

  const onDragEnd = (_event: unknown, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -400) go(1);
    else if (info.offset.x > 60 || info.velocity.x > 400) go(-1);
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
      onCancel={(event) => {
        event.preventDefault();
        onIndexChange(null);
      }}
      className="m-0 h-svh max-h-none w-screen max-w-none bg-[#070b0a] p-0 text-paper backdrop:bg-black/80"
    >
      {open && current ? (
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <h2 id={titleId} className="min-w-0 truncate text-small">
              <span className="font-serif text-[1.35rem]">{place}</span>
              <span className="tabular ml-3 text-paper/60" aria-live="polite">
                Photo {position + 1} of {count}
              </span>
            </h2>
            <button
              type="button"
              onClick={() => onIndexChange(null)}
              aria-label="Close photos"
              className="grid size-10 place-items-center rounded-full text-paper/80 transition-colors hover:bg-paper/10 hover:text-paper"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </header>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <AnimatePresence initial={false} custom={direction}>
              <motion.figure
                key={current.src}
                custom={direction}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 pb-4 sm:px-20"
                initial={allowMotion ? { opacity: 0, x: direction * 80 } : { opacity: 0 }}
                animate={{ opacity: 1, x: 0, transition: { duration: allowMotion ? 0.45 : 0.15, ease: [0.22, 0.61, 0.36, 1] } }}
                exit={allowMotion ? { opacity: 0, x: direction * -80, transition: { duration: 0.3 } } : { opacity: 0, transition: { duration: 0.1 } }}
                drag={count > 1 ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.3}
                onDragEnd={onDragEnd}
              >
                {failed.has(current.src) ? (
                  <div className="grid aspect-[4/3] w-full max-w-2xl place-items-center rounded-[4px] bg-paper/5 text-paper/60">
                    <span className="flex items-center gap-2">
                      <ImageOff aria-hidden="true" className="size-5" /> Photo unavailable
                    </span>
                  </div>
                ) : (
                  <img
                    src={imageUrl(current.src, { width: 2000 })}
                    srcSet={imageSrcSet(current.src, undefined, 2600)}
                    sizes="100vw"
                    alt={current.alt}
                    draggable={false}
                    onError={() => setFailed((previous) => new Set(previous).add(current.src))}
                    className="max-h-[calc(100%-3rem)] w-auto max-w-full rounded-[3px] object-contain select-none"
                  />
                )}
                <figcaption className="max-w-2xl text-center text-micro text-paper/65">
                  {current.alt}. Photo by{' '}
                  <a href={current.credit.url} target="_blank" rel="noopener noreferrer" className="underline decoration-paper/40 underline-offset-2 hover:decoration-paper">
                    {current.credit.name}
                  </a>{' '}
                  on Unsplash.
                </figcaption>
              </motion.figure>
            </AnimatePresence>

            {count > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Previous photo"
                  className="absolute top-1/2 left-3 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-paper backdrop-blur transition-[background-color,transform] hover:bg-black/60 active:scale-95"
                >
                  <ChevronLeft aria-hidden="true" className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Next photo"
                  className="absolute top-1/2 right-3 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-paper backdrop-blur transition-[background-color,transform] hover:bg-black/60 active:scale-95"
                >
                  <ChevronRight aria-hidden="true" className="size-6" />
                </button>
              </>
            ) : null}
          </div>

          {count > 1 ? (
            <div role="group" aria-label="Choose a photo" className="flex justify-center gap-2 px-4 py-4">
              {images.map((image, imageIndex) => (
                <button
                  key={image.src}
                  type="button"
                  onClick={() => {
                    setDirection(imageIndex > position ? 1 : -1);
                    onIndexChange(imageIndex);
                  }}
                  aria-label={`Show photo ${imageIndex + 1}: ${image.alt}`}
                  aria-current={imageIndex === index ? 'true' : undefined}
                  className={cn(
                    'h-12 w-16 overflow-hidden rounded-[3px] bg-paper/10 ring-offset-2 ring-offset-[#070b0a] transition-[opacity,box-shadow]',
                    imageIndex === index ? 'opacity-100 ring-2 ring-paper' : 'opacity-50 hover:opacity-90',
                  )}
                >
                  <img src={imageUrl(image.src, { width: 160, ratio: 4 / 3 })} alt="" className="size-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}

import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import * as THREE from 'three';
import { useAllowMotion } from '../../../components/effects/preferences';
import { useTheme } from '../../../components/ui/ThemeToggle';
import type { DestinationCard } from '../../../lib/types';
import { GlobeController, latLngToVector } from './controller';
import { buildGlobeTexture } from './texture';

interface GlobeProps {
  destinations: DestinationCard[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Interactive globe of the current results. Drag (or use arrow keys) to turn it; choose a pin to
 * select a destination. It mirrors the list beside it, which remains the accessible way to choose.
 */
export default function DestinationGlobe({ destinations, selectedId, onSelect }: GlobeProps) {
  const allowMotion = useAllowMotion();
  const { isLight } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [controller] = useState(() => new GlobeController());
  const dragging = useRef<{ x: number; y: number; id: number } | null>(null);
  const [visible, setVisible] = useState(true);
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: THREE.CanvasTexture | null = null;
    void buildGlobeTexture(2048, isLight).then((canvas) => {
      if (cancelled) return;
      created = new THREE.CanvasTexture(canvas);
      created.colorSpace = THREE.SRGBColorSpace;
      created.anisotropy = 4;
      setTexture(created);
    });
    return () => {
      cancelled = true;
      created?.dispose();
    };
  }, [isLight]);

  // Only render frames while the globe is on screen and the tab is visible.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting) && !document.hidden));
    observer.observe(element);
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Turn to the selected destination.
  const selected = destinations.find((item) => item.id === selectedId);
  useEffect(() => {
    if (selected) controller.face(selected.location.lat, selected.location.lng);
  }, [selected, controller]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragging.current;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    // On touch, vertical movement scrolls the page (touch-action: pan-y); only turn horizontally.
    controller.turn(dx, event.pointerType === 'touch' ? 0 : dy);
    dragging.current = { ...drag, x: event.clientX, y: event.clientY };
  };
  const endDrag = () => {
    dragging.current = null;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (controller.nudge(event.key)) event.preventDefault();
  };

  return (
    <div
      ref={containerRef}
      role="application"
      aria-roledescription="globe"
      aria-label={`Globe showing ${destinations.length} destinations. Arrow keys turn it. Choose a destination from the list to locate it.`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
      className="relative aspect-square w-full cursor-grab touch-pan-y rounded-full outline-offset-8 select-none active:cursor-grabbing"
    >
      <Canvas
        camera={{ position: [0, 0, 3.55], fov: 38 }}
        dpr={[1, 1.75]}
        frameloop={visible ? 'always' : 'never'}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        aria-hidden="true"
      >
        <Scene
          texture={texture}
          destinations={destinations}
          selectedId={selectedId}
          onSelect={onSelect}
          controller={controller}
          allowMotion={allowMotion}
          isLight={isLight}
        />
      </Canvas>
    </div>
  );
}

interface SceneProps {
  texture: THREE.CanvasTexture | null;
  destinations: DestinationCard[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  controller: GlobeController;
  allowMotion: boolean;
  isLight: boolean;
}

function Scene({ texture, destinations, selectedId, onSelect, controller, allowMotion, isLight }: SceneProps) {
  const group = useRef<THREE.Group>(null);

  useFrame((_state, delta) => {
    if (group.current) controller.tick(group.current, delta, allowMotion);
  });

  return (
    <>
      <group ref={group}>
        <mesh
          onClick={(event: ThreeEvent<MouseEvent>) => event.stopPropagation()}
          onPointerOver={(event: ThreeEvent<PointerEvent>) => event.stopPropagation()}
        >
          <sphereGeometry args={[1, 96, 64]} />
          {/* Keyed so the material recompiles with the map once the texture is ready. */}
          {texture ? (
            <meshBasicMaterial key={isLight ? 'textured-light' : 'textured-dark'} map={texture} />
          ) : (
            <meshBasicMaterial key="plain" color={isLight ? '#ede6db' : '#10201b'} />
          )}
        </mesh>
        {destinations.map((destination) => (
          <Marker key={destination.id} destination={destination} selected={destination.id === selectedId} onSelect={onSelect} allowMotion={allowMotion} isLight={isLight} />
        ))}
      </group>
      <Atmosphere isLight={isLight} />
    </>
  );
}

function Marker({ destination, selected, onSelect, allowMotion, isLight }: { destination: DestinationCard; selected: boolean; onSelect: (id: string) => void; allowMotion: boolean; isLight: boolean }) {
  const position = useMemo(() => latLngToVector(destination.location.lat, destination.location.lng, 1.004), [destination.location.lat, destination.location.lng]);
  const orientation = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), position.clone().normalize()), [position]);
  const [hovered, setHovered] = useState(false);
  const ring = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const mesh = ring.current;
    if (!mesh) return;
    const pulse = selected && allowMotion ? 1 + ((clock.getElapsedTime() * 0.9) % 1) * 1.6 : 1.4;
    mesh.scale.setScalar(pulse);
    const material = mesh.material as THREE.MeshBasicMaterial;
    material.opacity = selected ? (allowMotion ? 1 - ((clock.getElapsedTime() * 0.9) % 1) : 0.6) : hovered ? 0.6 : 0;
  });

  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = 'pointer';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hovered]);

  const size = selected ? 0.03 : hovered ? 0.026 : 0.019;
  const pinColor = selected ? (isLight ? '#96502f' : '#e3a184') : isLight ? '#14211d' : '#f5f2ea';
  const ringColor = isLight ? '#96502f' : '#e3a184';

  return (
    <group position={position} quaternion={orientation}>
      <mesh
        onClick={(event: ThreeEvent<MouseEvent>) => {
          event.stopPropagation();
          // Ignore the click that ends a drag.
          if (event.delta > 6) return;
          onSelect(destination.id);
        }}
        onPointerOver={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        {/* Generous invisible hit area so pins are easy to tap. */}
        <circleGeometry args={[0.06, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0.002]}>
        <circleGeometry args={[size, 24]} />
        <meshBasicMaterial color={pinColor} />
      </mesh>
      <mesh ref={ring} position={[0, 0, 0.001]}>
        <ringGeometry args={[0.03, 0.036, 32]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** A thin warm halo, drawn behind the sphere with a fresnel falloff. */
function Atmosphere({ isLight }: { isLight: boolean }) {
  const haloColor = isLight ? '#d8c8b8' : '#c98263';
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: { color: { value: new THREE.Color(haloColor) } },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          uniform vec3 color;
          varying vec3 vNormal;
          void main() {
            float intensity = clamp(pow(0.66 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.6), 0.0, 1.0);
            gl_FragColor = vec4(color, intensity * 0.85);
          }`,
      }),
    [haloColor],
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh scale={1.1} material={material}>
      <sphereGeometry args={[1, 64, 48]} />
    </mesh>
  );
}

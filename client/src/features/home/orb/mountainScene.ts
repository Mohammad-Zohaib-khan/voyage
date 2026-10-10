import * as THREE from 'three';
import { LIGHT_OBJECT, ORB_OBJECT, RIDGE_OBJECTS } from './orbController';

/**
 * The home page hero scene: a glowing orb hanging in the saddle between two craggy peaks, with a
 * low ridge in front that it can sink behind. Built from code (no downloaded assets) so it loads
 * with the page's own three.js. Units match the orb controller's tuning: the orb rests at y=60 and
 * clears the peaks when it rises 160.
 */

export interface MountainScene {
  findObjectByName(name: string): THREE.Object3D | undefined;
  /** Resolves once the first frame has been drawn. */
  ready: Promise<void>;
  dispose(): void;
}

// ── Deterministic gradient noise ────────────────────────────────────────────────────────────────

function createNoise(seed: number) {
  const perm = new Uint8Array(512);
  const source = Array.from({ length: 256 }, (_, i) => i);
  let state = seed;
  for (let i = 255; i > 0; i -= 1) {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    const j = state % (i + 1);
    [source[i], source[j]] = [source[j] as number, source[i] as number];
  }
  for (let i = 0; i < 512; i += 1) perm[i] = source[i & 255] as number;

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const grad = (hash: number, x: number, y: number) => {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  };

  /** Perlin noise in roughly [-1, 1]. */
  return (x: number, y: number): number => {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const aa = perm[(perm[xi] as number) + yi] as number;
    const ab = perm[(perm[xi] as number) + yi + 1] as number;
    const ba = perm[(perm[xi + 1] as number) + yi] as number;
    const bb = perm[(perm[xi + 1] as number) + yi + 1] as number;
    const x1 = THREE.MathUtils.lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
    const x2 = THREE.MathUtils.lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
    return THREE.MathUtils.lerp(x1, x2, v) * 0.7;
  };
}

const noise = createNoise(7);

/** Ridged multi-octave noise in [0, 1]: sharp crests, like eroded rock. */
function ridged(x: number, z: number, octaves = 6): number {
  let total = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let weight = 1;
  for (let i = 0; i < octaves; i += 1) {
    let n = 1 - Math.abs(noise(x * frequency, z * frequency));
    n *= n * weight;
    weight = THREE.MathUtils.clamp(n * 1.6, 0, 1);
    total += n * amplitude;
    amplitude *= 0.5;
    frequency *= 2.05;
  }
  return total;
}

function peak(dx: number, dz: number, radius: number, height: number): number {
  const d = Math.hypot(dx, dz * 1.15) / radius;
  return height * Math.exp(-Math.pow(d, 1.7));
}

// ── Terrain ─────────────────────────────────────────────────────────────────────────────────────

const BASE_Y = -100;
const ROCK_DARK = new THREE.Color('#121010');
const ROCK_LIGHT = new THREE.Color('#6e5a4b');

/** A displaced grid in the XZ plane, centred on its own origin so it can turn in place. */
function terrain(width: number, depth: number, segX: number, segZ: number, centerZ: number, height: (x: number, z: number) => number): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(width, depth, segX, segZ);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(position.count * 3);
  const color = new THREE.Color();
  let maxHeight = 1;
  const heights = new Float32Array(position.count);
  for (let i = 0; i < position.count; i += 1) {
    const h = height(position.getX(i), position.getZ(i) + centerZ);
    heights[i] = h;
    maxHeight = Math.max(maxHeight, h);
    position.setY(i, BASE_Y + h);
  }
  geometry.computeVertexNormals();
  const normal = geometry.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i) + centerZ;
    const t = THREE.MathUtils.clamp((heights[i] as number) / maxHeight, 0, 1);
    // Flatter ledges catch more light than steep faces.
    const flat = THREE.MathUtils.smoothstep(normal.getY(i), 0.45, 0.95);
    const grain = 0.55 + 0.45 * ridged(x * 0.03, z * 0.03, 3);
    color.copy(ROCK_DARK).lerp(ROCK_LIGHT, Math.min(1, (0.25 + 0.75 * Math.pow(t, 1.1)) * grain * (0.45 + 0.75 * flat)));
    colors.set([color.r, color.g, color.b], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.08 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = centerZ;
  return mesh;
}

/** Two peaks either side of the orb, joined by a long craggy range. */
function farRangeHeight(x: number, z: number): number {
  const shape =
    peak(x + 350, z + 560, 210, 235) +
    peak(x - 340, z + 580, 205, 228) +
    peak(x + 820, z + 640, 260, 120) +
    peak(x - 860, z + 660, 270, 110) +
    34 * Math.exp(-Math.pow((z + 600) / 200, 2)) * (0.6 + 0.4 * noise(x * 0.004, 3.1));
  const crags = ridged(x * 0.0042, z * 0.0042);
  const edge = THREE.MathUtils.smoothstep(z, -1150, -950) * (1 - THREE.MathUtils.smoothstep(z, -230, -140));
  const detail = ridged(x * 0.02 + 5, z * 0.02 + 9, 5);
  // Gullies: noise stretched across the slope reads as erosion running down the faces.
  const gullies = ridged(x * 0.035 + 2, z * 0.009 + 7, 3);
  const weight = shape / 235;
  return Math.max(0, shape * (0.55 + 0.75 * crags) + 10 * crags + weight * (55 * detail + 28 * gullies)) * edge;
}

/** A low ridge in front of the orb, dipping in the middle and climbing at the sides. */
function nearRidgeHeight(x: number, z: number): number {
  const hump = Math.exp(-Math.pow((z - 40) / 80, 2));
  const sides = 26 + 70 * Math.pow(Math.min(Math.abs(x) / 900, 1), 1.4);
  const crags = ridged(x * 0.006 + 11, z * 0.006 + 4);
  const detail = ridged(x * 0.022 + 3, z * 0.022 + 1, 4);
  return Math.max(0, hump * sides * (0.74 + 0.45 * crags + 0.18 * detail));
}

// ── Orb ─────────────────────────────────────────────────────────────────────────────────────────

const ORB_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const ORB_FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float facing = clamp(dot(vNormal, vView), 0.0, 1.0);
    float rim = 1.0 - facing;
    vec3 core = vec3(0.70, 0.27, 0.05);
    vec3 body = vec3(1.0, 0.50, 0.10);
    vec3 color = mix(core, body, smoothstep(0.05, 0.75, rim));
    float warm = pow(clamp(dot(vNormal, normalize(vec3(0.6, -0.55, 0.55))), 0.0, 1.0), 2.5);
    color = mix(color, vec3(1.0, 0.86, 0.38), warm * 0.85);
    float cool = pow(clamp(dot(vNormal, normalize(vec3(-0.6, 0.5, 0.4))), 0.0, 1.0), 3.0);
    color += vec3(0.25, 0.12, 0.02) * cool;
    color *= 0.96 + 0.04 * sin(uTime * 1.3);
    gl_FragColor = vec4(color, 1.0);
  }
`;

function glowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 140, 50, 0.55)');
    gradient.addColorStop(0.35, 'rgba(255, 105, 30, 0.22)');
    gradient.addColorStop(1, 'rgba(255, 90, 20, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ── Scene ───────────────────────────────────────────────────────────────────────────────────────

export function createMountainScene(container: HTMLElement, onContextLost?: () => void): MountainScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#000000');
  scene.fog = new THREE.Fog('#000000', 1300, 2900);

  const camera = new THREE.PerspectiveCamera(32, 16 / 9, 10, 5000);
  camera.position.set(0, 120, 900);
  const target = new THREE.Vector3(0, 40, -560);

  const far = terrain(3000, 1000, 420, 150, -650, farRangeHeight);
  far.name = RIDGE_OBJECTS[0];
  // The near ridge runs on towards the camera as open ground, just under the valley floor.
  const near = terrain(2400, 1300, 320, 216, 40, nearRidgeHeight);
  near.position.y = -1.5;
  near.name = RIDGE_OBJECTS[1];

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(4000, 1650),
    new THREE.MeshStandardMaterial({ color: '#0d0b0a', roughness: 0.45, metalness: 0.25 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, BASE_Y + 1, -675);

  const orbUniforms = { uTime: { value: 0 } };
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(62, 64, 32),
    new THREE.ShaderMaterial({ uniforms: orbUniforms, vertexShader: ORB_VERTEX, fragmentShader: ORB_FRAGMENT, toneMapped: false }),
  );
  orb.name = ORB_OBJECT;
  orb.position.set(0, 40, -620);
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }),
  );
  glow.scale.set(420, 420, 1);
  glow.renderOrder = -1;
  orb.add(glow);
  // The orb lights the rock around it, so the ridges darken as it sinks.
  const orbLight = new THREE.PointLight('#ff6a1c', 110_000, 0, 2);
  orbLight.position.set(0, 0, 70);
  orb.add(orbLight);

  const cursorLight = new THREE.PointLight('#ffe2c4', 80_000, 0, 2);
  cursorLight.name = LIGHT_OBJECT;
  cursorLight.position.set(0, 300, -100);

  const rim = new THREE.DirectionalLight('#7f93b8', 0.35);
  rim.position.set(-400, 300, -1400);

  scene.add(far, near, floor, orb, cursorLight, rim, new THREE.HemisphereLight('#3a4152', '#090705', 0.55));

  // Size to the container; portrait screens widen the view so both peaks stay in frame.
  const resize = () => {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const horizontal = THREE.MathUtils.degToRad(46);
    const fitWidth = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(horizontal / 2) / camera.aspect));
    camera.fov = THREE.MathUtils.clamp(Math.max(32, fitWidth), 32, 62);
    // On tall screens the hero copy fills the lower half, so lift the scene into the space above it.
    const lift = camera.aspect < 0.9 ? 0.32 : 0;
    if (lift > 0) camera.setViewOffset(width, height, 0, height * lift, width, height);
    else camera.clearViewOffset();
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  // Render only while on screen and the tab is visible.
  let visible = true;
  let frame = 0;
  const clock = new THREE.Timer();
  let resolveReady: () => void = () => undefined;
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });
  const loop = (now: number) => {
    clock.update(now);
    orbUniforms.uTime.value = clock.getElapsed();
    renderer.render(scene, camera);
    resolveReady();
    if (visible) frame = requestAnimationFrame(loop);
  };
  const setVisible = (next: boolean) => {
    if (next === visible) return;
    visible = next;
    cancelAnimationFrame(frame);
    if (visible) frame = requestAnimationFrame(loop);
  };
  const intersection = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting) && !document.hidden));
  intersection.observe(container);
  const onVisibility = () => setVisible(!document.hidden);
  document.addEventListener('visibilitychange', onVisibility);
  const onLost = (event: Event) => {
    event.preventDefault();
    setVisible(false);
    onContextLost?.();
  };
  renderer.domElement.addEventListener('webglcontextlost', onLost);
  frame = requestAnimationFrame(loop);

  return {
    findObjectByName: (name) => scene.getObjectByName(name),
    ready,
    dispose() {
      cancelAnimationFrame(frame);
      visible = false;
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Sprite) {
          (object.geometry as THREE.BufferGeometry).dispose();
          const materials: THREE.Material[] = Array.isArray(object.material) ? (object.material as THREE.Material[]) : [object.material as THREE.Material];
          for (const material of materials) {
            (material as THREE.Material & { map?: THREE.Texture | null }).map?.dispose();
            material.dispose();
          }
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

/** The parts of a scene object the controller moves (satisfied by a three.js Object3D). */
export interface SceneObject {
  position: { x: number; y: number; z: number };
  rotation: { y: number };
  scale: { x: number; y: number; z: number };
}

/** A loaded scene whose objects can be looked up by name. */
export interface OrbScene {
  findObjectByName(name: string): SceneObject | undefined;
}

/**
 * Drives the home page "orb in the mountains" scene from the page: the orb answering the search,
 * rising to choose a place, the ridges turning with the pointer and the light following it. It
 * only moves the scene's named objects, so the scene itself stays a plain description.
 */

interface Tracked {
  object: SceneObject;
  position: { x: number; y: number; z: number };
  rotationY: number;
  scale: number;
}

/** Names of objects in the published scene. If the scene changes, the controller degrades to doing nothing. */
export const ORB_OBJECT = 'sphere';
export const RIDGE_OBJECTS = ['mountain', 'mountain2'] as const;
export const LIGHT_OBJECT = 'cursorLight';

// Tuned against the live scene: +160 clears the ridges, -120 hides the orb behind the near ridge.
const ORB_RISE_UNITS = 160;
const ORB_SINK_UNITS = 120;
const ORB_SWAY_UNITS = 18;
const RIDGE_TURN_RADIANS = 0.07;
const LIGHT_SWAY_UNITS = { x: 420, y: 140 };

function track(object: SceneObject | undefined): Tracked | null {
  if (!object) return null;
  return {
    object,
    position: { x: object.position.x, y: object.position.y, z: object.position.z },
    rotationY: object.rotation.y,
    scale: object.scale.x,
  };
}

function approach(current: number, target: number, rate: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

export class OrbController {
  private orb: Tracked | null = null;
  private ridges: Tracked[] = [];
  private light: Tracked | null = null;
  private pointer = { x: 0, y: 0 };
  private lift = 0;
  private pulseStart = -Infinity;
  private state = { x: 0, y: 0, lift: 0, pulse: 0 };

  /**
   * Connects to a loaded scene. Returns false if the expected objects are missing. With `rise`,
   * the orb starts sunk behind the ridge and rises into place.
   */
  attach(scene: OrbScene, { rise = false } = {}): boolean {
    this.orb = track(scene.findObjectByName(ORB_OBJECT));
    this.ridges = RIDGE_OBJECTS.map((name) => track(scene.findObjectByName(name))).filter((item): item is Tracked => item !== null);
    this.light = track(scene.findObjectByName(LIGHT_OBJECT));
    if (rise) this.state.lift = -1;
    return this.orb !== null;
  }

  detach() {
    this.orb = null;
    this.ridges = [];
    this.light = null;
  }

  get attached() {
    return this.orb !== null;
  }

  /** Pointer position over the hero, each axis from -1 to 1. */
  setPointer(x: number, y: number) {
    this.pointer = { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
  }

  /** How high the orb should sit: -1 (sunk behind the ridge) to 1 (high in the sky). */
  setLift(value: number) {
    this.lift = Math.max(-1, Math.min(1, value));
  }

  /** A brief swell, used when the orb makes a choice. */
  pulse(now = performance.now()) {
    this.pulseStart = now;
  }

  /** Eases every tracked object towards its target; call once per animation frame. */
  step(dt: number, now = performance.now()) {
    const { orb } = this;
    if (!orb) return;
    const seconds = Math.min(dt, 0.1);
    this.state.x = approach(this.state.x, this.pointer.x, 3, seconds);
    this.state.y = approach(this.state.y, this.pointer.y, 3, seconds);
    this.state.lift = approach(this.state.lift, this.lift, 2.2, seconds);
    const elapsed = (now - this.pulseStart) / 1000;
    this.state.pulse = elapsed >= 0 && elapsed < 1.6 ? Math.sin((elapsed / 1.6) * Math.PI) : 0;

    orb.object.position.x = orb.position.x + this.state.x * ORB_SWAY_UNITS;
    const lift = this.state.lift;
    orb.object.position.y = orb.position.y + lift * (lift >= 0 ? ORB_RISE_UNITS : ORB_SINK_UNITS) - this.state.y * 8;
    const scale = orb.scale * (1 + Math.max(0, this.state.lift) * 0.1 + this.state.pulse * 0.28);
    orb.object.scale.x = scale;
    orb.object.scale.y = scale;
    orb.object.scale.z = scale;

    for (const ridge of this.ridges) {
      ridge.object.rotation.y = ridge.rotationY + this.state.x * RIDGE_TURN_RADIANS;
    }
    if (this.light) {
      this.light.object.position.x = this.light.position.x + this.state.x * LIGHT_SWAY_UNITS.x;
      this.light.object.position.y = this.light.position.y - this.state.y * LIGHT_SWAY_UNITS.y;
    }
  }

  /** True while anything is still moving, so the render loop can idle once settled. */
  get settling() {
    return (
      Math.abs(this.state.x - this.pointer.x) > 0.002 ||
      Math.abs(this.state.y - this.pointer.y) > 0.002 ||
      Math.abs(this.state.lift - this.lift) > 0.002 ||
      this.state.pulse > 0
    );
  }
}

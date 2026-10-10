import * as THREE from 'three';

const DEG = Math.PI / 180;
export const MAX_PITCH = 1.1;

/** Unit-sphere position for a latitude/longitude, matching the equirectangular texture. */
export function latLngToVector(lat: number, lng: number, radius = 1): THREE.Vector3 {
  const phi = (90 - lat) * DEG;
  const theta = (lng + 180) * DEG;
  return new THREE.Vector3(-radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
}

/** The yaw/pitch that turns a given place to face the camera. */
export function rotationFacing(lat: number, lng: number): { yaw: number; pitch: number } {
  const point = latLngToVector(lat, lng);
  const yaw = Math.atan2(-point.x, point.z);
  const horizontal = Math.hypot(point.x, point.z);
  return { yaw, pitch: clampPitch(Math.atan2(point.y, horizontal)) };
}

function clampPitch(value: number) {
  return Math.max(-MAX_PITCH, Math.min(MAX_PITCH, value));
}

/**
 * Holds the globe's target orientation outside React state, so pointer input and the render loop
 * can update it every frame without re-rendering.
 */
export class GlobeController {
  private yaw = -0.4;
  private pitch = 0.35;
  private lastInteraction = 0;

  private touched() {
    this.lastInteraction = performance.now();
  }

  turn(dx: number, dy: number) {
    this.yaw += dx * 0.006;
    this.pitch = clampPitch(this.pitch + dy * 0.005);
    this.touched();
  }

  nudge(key: string): boolean {
    const step = 0.25;
    if (key === 'ArrowLeft') this.yaw -= step;
    else if (key === 'ArrowRight') this.yaw += step;
    else if (key === 'ArrowUp') this.pitch = clampPitch(this.pitch + step);
    else if (key === 'ArrowDown') this.pitch = clampPitch(this.pitch - step);
    else return false;
    this.touched();
    return true;
  }

  face(lat: number, lng: number) {
    const next = rotationFacing(lat, lng);
    // Take the short way round from the current heading.
    const turns = Math.round((this.yaw - next.yaw) / (Math.PI * 2));
    this.yaw = next.yaw + turns * Math.PI * 2;
    this.pitch = next.pitch;
    this.touched();
  }

  /** Called every frame: idle drift, then ease the object towards the target. */
  tick(object: THREE.Object3D, delta: number, allowMotion: boolean) {
    if (allowMotion && performance.now() - this.lastInteraction > 4000) this.yaw += delta * 0.06;
    const ease = allowMotion ? 1 - Math.pow(0.002, delta) : 1;
    object.rotation.y += (this.yaw - object.rotation.y) * ease;
    object.rotation.x += (this.pitch - object.rotation.x) * ease;
  }
}

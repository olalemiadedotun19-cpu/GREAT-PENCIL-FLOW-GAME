import * as THREE from 'three';

export interface PathSample {
  distance: number;
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
  right: THREE.Vector3;
  width: number;
  banking: number;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generates slight hand-drawn graphite jitter (micro-imperfections)
 */
export function sketchJitter(magnitude = 0.05): number {
  return (Math.random() - 0.5) * 2 * magnitude;
}

/**
 * Computes Catmull-Rom point for 4 control points P0, P1, P2, P3 at t in [0, 1]
 */
export function catmullRom(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3,
  t: number,
  out = new THREE.Vector3()
): THREE.Vector3 {
  const t2 = t * t;
  const t3 = t2 * t;

  out.x =
    0.5 *
    (2 * p1.x +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

  out.y =
    0.5 *
    (2 * p1.y +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

  out.z =
    0.5 *
    (2 * p1.z +
      (-p0.z + p2.z) * t +
      (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
      (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3);

  return out;
}

/**
 * Computes Catmull-Rom derivative (tangent)
 */
export function catmullRomTangent(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3,
  t: number,
  out = new THREE.Vector3()
): THREE.Vector3 {
  const t2 = t * t;

  out.x =
    0.5 *
    (-p0.x +
      p2.x +
      (4 * p0.x - 10 * p1.x + 8 * p2.x - 2 * p3.x) * t +
      (-3 * p0.x + 9 * p1.x - 9 * p2.x + 3 * p3.x) * t2);

  out.y =
    0.5 *
    (-p0.y +
      p2.y +
      (4 * p0.y - 10 * p1.y + 8 * p2.y - 2 * p3.y) * t +
      (-3 * p0.y + 9 * p1.y - 9 * p2.y + 3 * p3.y) * t2);

  out.z =
    0.5 *
    (-p0.z +
      p2.z +
      (4 * p0.z - 10 * p1.z + 8 * p2.z - 2 * p3.z) * t +
      (-3 * p0.z + 9 * p1.z - 9 * p2.z + 3 * p3.z) * t2);

  return out.normalize();
}

/**
 * Parallel Transport / Rotation Minimizing Frame (RMF) step
 * Computes a smooth unbanked normal and right vector from previous frame
 */
export function parallelTransport(
  prevTangent: THREE.Vector3,
  currTangent: THREE.Vector3,
  prevNormal: THREE.Vector3
): { normal: THREE.Vector3; right: THREE.Vector3 } {
  const v1 = prevTangent;
  const v2 = currTangent;
  const c = v1.dot(v2);

  let normal: THREE.Vector3;

  if (c > 0.99999) {
    normal = prevNormal.clone();
  } else if (c < -0.99999) {
    // 180 flip fallback
    normal = prevNormal.clone().negate();
  } else {
    const axis = new THREE.Vector3().crossVectors(v1, v2).normalize();
    const angle = Math.acos(clamp(c, -1, 1));
    normal = prevNormal.clone().applyAxisAngle(axis, angle);
  }

  // Ensure normal stays strictly perpendicular to tangent
  normal.sub(currTangent.clone().multiplyScalar(normal.dot(currTangent))).normalize();

  // If normal points downward too much, gently keep biased towards world up
  if (normal.y < 0.35) {
    const worldUp = new THREE.Vector3(0, 1, 0);
    const orthoUp = worldUp.sub(currTangent.clone().multiplyScalar(worldUp.dot(currTangent)));
    if (orthoUp.lengthSq() > 0.01) {
      normal.lerp(orthoUp.normalize(), 0.15).normalize();
    }
  }

  const right = new THREE.Vector3().crossVectors(currTangent, normal).normalize();
  return { normal, right };
}

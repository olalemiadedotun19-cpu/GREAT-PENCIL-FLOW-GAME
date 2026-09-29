import * as THREE from 'three';
import { PathSample, lerp } from './utils';

export class FlowPath {
  private samples: PathSample[] = [];

  constructor() {}

  public clear(): void {
    this.samples = [];
  }

  public getSampleCount(): number {
    return this.samples.length;
  }

  public getMinDistance(): number {
    if (this.samples.length === 0) return 0;
    return this.samples[0].distance;
  }

  public getMaxDistance(): number {
    if (this.samples.length === 0) return 0;
    return this.samples[this.samples.length - 1].distance;
  }

  public getLastSample(): PathSample | null {
    if (this.samples.length === 0) return null;
    return this.samples[this.samples.length - 1];
  }

  public appendSamples(newSamples: PathSample[]): void {
    if (newSamples.length === 0) return;
    this.samples.push(...newSamples);
  }

  public pruneBehind(minDistance: number): void {
    if (this.samples.length < 50) return;

    // Binary search for cut index
    let low = 0;
    let high = this.samples.length - 1;
    let cutIndex = -1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.samples[mid].distance < minDistance) {
        cutIndex = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    if (cutIndex > 10) {
      // Keep a buffer of at least 5 behind the cut
      const removeCount = Math.max(0, cutIndex - 5);
      if (removeCount > 0) {
        this.samples.splice(0, removeCount);
      }
    }
  }

  /**
   * Samples the path at an exact distance along the spline with linear interpolation
   */
  public getSampleAtDistance(distance: number): PathSample | null {
    const len = this.samples.length;
    if (len === 0) return null;

    if (distance <= this.samples[0].distance) {
      return this.samples[0];
    }
    if (distance >= this.samples[len - 1].distance) {
      return this.samples[len - 1];
    }

    // Binary search for segment
    let low = 0;
    let high = len - 1;
    let idx = 0;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.samples[mid].distance <= distance) {
        idx = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const s0 = this.samples[idx];
    const s1 = this.samples[Math.min(idx + 1, len - 1)];

    if (s0 === s1 || s1.distance === s0.distance) {
      return s0;
    }

    const t = (distance - s0.distance) / (s1.distance - s0.distance);

    // Interpolate
    const position = new THREE.Vector3().lerpVectors(s0.position, s1.position, t);
    const tangent = new THREE.Vector3().lerpVectors(s0.tangent, s1.tangent, t).normalize();
    const normal = new THREE.Vector3().lerpVectors(s0.normal, s1.normal, t).normalize();
    const right = new THREE.Vector3().crossVectors(tangent, normal).normalize();
    const width = lerp(s0.width, s1.width, t);
    const banking = lerp(s0.banking, s1.banking, t);

    return {
      distance,
      position,
      tangent,
      normal,
      right,
      width,
      banking,
    };
  }

  public getAllSamples(): readonly PathSample[] {
    return this.samples;
  }
}

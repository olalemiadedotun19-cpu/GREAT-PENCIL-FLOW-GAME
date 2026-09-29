import * as THREE from 'three';
import { CONFIG } from './config';
import { FlowPath } from './FlowPath';
import {
  PathSample,
  catmullRom,
  catmullRomTangent,
  parallelTransport,
  randomRange,
  randomChoice,
  clamp,
} from './utils';

export type PathPattern =
  | 'STRAIGHT'
  | 'GENTLE_LEFT'
  | 'GENTLE_RIGHT'
  | 'S_CURVE'
  | 'UPHILL'
  | 'DOWNHILL'
  | 'WAVE'
  | 'BANKED_TURN'
  | 'NARROW_PASSAGE'
  | 'WIDE_HIGHWAY';

export interface ChunkInfo {
  startDistance: number;
  endDistance: number;
  pattern: PathPattern;
  samples: PathSample[];
}

export class PathGenerator {
  private flowPath: FlowPath;
  private currentPos = new THREE.Vector3(0, 0, 0);
  private currentTangent = new THREE.Vector3(0, 0, -1);
  private currentNormal = new THREE.Vector3(0, 1, 0);
  private currentBanking = 0;
  private currentWidth = CONFIG.path.defaultWidth;
  private currentDistance = 0;
  private lastPattern: PathPattern = 'STRAIGHT';
  private chunks: ChunkInfo[] = [];

  constructor(flowPath: FlowPath) {
    this.flowPath = flowPath;
    this.reset();
  }

  public reset(): void {
    this.flowPath.clear();
    this.chunks = [];
    this.currentPos.set(0, 0, 0);
    this.currentTangent.set(0, 0, -1).normalize();
    this.currentNormal.set(0, 1, 0);
    this.currentBanking = 0;
    this.currentWidth = CONFIG.path.defaultWidth;
    this.currentDistance = 0;
    this.lastPattern = 'STRAIGHT';

    // Initial safe straight runway (so player starts with smooth footing)
    this.generateChunk('STRAIGHT', 50.0);
    this.generateChunk('STRAIGHT', 40.0);
  }

  public update(playerDistance: number): void {
    // Keep path generated well ahead of player
    const targetDistance = playerDistance + CONFIG.path.lookAheadChunks * CONFIG.path.chunkLength;

    while (this.currentDistance < targetDistance) {
      const pattern = this.selectNextPattern(this.currentDistance);
      this.generateChunk(pattern, CONFIG.path.chunkLength);
    }

    // Prune old samples and chunks far behind player
    const pruneDist = playerDistance - CONFIG.path.removeBehindDistance;
    this.flowPath.pruneBehind(pruneDist);
    this.chunks = this.chunks.filter((c) => c.endDistance >= pruneDist);
  }

  private selectNextPattern(distance: number): PathPattern {
    // If previous pattern was an S-curve or banked turn, FORCE a smooth straight buffer chunk!
    if (this.lastPattern === 'S_CURVE' || this.lastPattern === 'BANKED_TURN') {
      return randomChoice(['STRAIGHT', 'WIDE_HIGHWAY', 'STRAIGHT']);
    }

    // 1. Stage 1: The Sketchbook (0-500m) - gentle curves, small elevation
    if (distance < 500) {
      const stage1Choices: PathPattern[] = [
        'STRAIGHT',
        'GENTLE_LEFT',
        'GENTLE_RIGHT',
        'STRAIGHT',
        'WAVE',
        'WIDE_HIGHWAY',
      ];
      return randomChoice(stage1Choices.filter((p) => p !== this.lastPattern));
    }

    // 2. Stage 2: The City (500-1500m) - urban grid sweeps, avenue bridges
    if (distance < 1500) {
      const stage2Choices: PathPattern[] = [
        'STRAIGHT',
        'GENTLE_LEFT',
        'GENTLE_RIGHT',
        'BANKED_TURN',
        'UPHILL',
        'WIDE_HIGHWAY',
        'STRAIGHT',
      ];
      return randomChoice(stage2Choices.filter((p) => p !== this.lastPattern));
    }

    // 3. Stage 3: The Rooftops (1500-3000m) - elevated skybridges, dizzying narrow passages
    if (distance < 3000) {
      const stage3Choices: PathPattern[] = [
        'UPHILL',
        'BANKED_TURN',
        'NARROW_PASSAGE',
        'WAVE',
        'S_CURVE',
        'STRAIGHT',
        'WIDE_HIGHWAY',
      ];
      return randomChoice(stage3Choices.filter((p) => p !== this.lastPattern));
    }

    // 4. Stage 4: Mountains & Canyons (3000-5000m) - soaring canyon plunges, steep climbs, mountain curves
    if (distance < 5000) {
      const stage4Choices: PathPattern[] = [
        'DOWNHILL',
        'UPHILL',
        'BANKED_TURN',
        'S_CURVE',
        'WAVE',
        'NARROW_PASSAGE',
        'STRAIGHT',
      ];
      return randomChoice(stage4Choices.filter((p) => p !== this.lastPattern));
    }

    // 5. Stage 5 & 6: Surreal Ink World & Blueprint (5000m+) - surreal undulating waves, dynamic corkscrew banking
    const lateChoices: PathPattern[] = [
      'S_CURVE',
      'BANKED_TURN',
      'WAVE',
      'DOWNHILL',
      'UPHILL',
      'NARROW_PASSAGE',
      'WIDE_HIGHWAY',
      'STRAIGHT',
    ];
    return randomChoice(lateChoices.filter((p) => p !== this.lastPattern));
  }

  public generateChunk(pattern: PathPattern, length: number): ChunkInfo {
    this.lastPattern = pattern;
    const startDistance = this.currentDistance;

    // We build 4 control points: P0 (previous guide), P1 (current start), P2 (mid/feature), P3 (end)
    const p1 = this.currentPos.clone();
    // P0 extends backward along currentTangent
    const p0 = p1.clone().sub(this.currentTangent.clone().multiplyScalar(length * 0.35));

    // Calculate feature delta based on pattern
    const deltaForward = this.currentTangent.clone();
    let deltaRight = new THREE.Vector3().crossVectors(deltaForward, this.currentNormal).normalize();
    const up = new THREE.Vector3(0, 1, 0);

    let lateralCurve = 0;
    let elevationChange = 0;
    let targetBanking = 0;
    let targetWidth = CONFIG.path.defaultWidth;

    switch (pattern) {
      case 'STRAIGHT':
        lateralCurve = randomRange(-0.5, 0.5);
        elevationChange = randomRange(-0.5, 0.5);
        targetBanking = 0;
        targetWidth = CONFIG.path.defaultWidth;
        break;

      case 'GENTLE_LEFT':
        lateralCurve = randomRange(-11, -7);
        elevationChange = randomRange(-1.2, 1.2);
        targetBanking = -0.16;
        targetWidth = CONFIG.path.defaultWidth;
        break;

      case 'GENTLE_RIGHT':
        lateralCurve = randomRange(7, 11);
        elevationChange = randomRange(-1.2, 1.2);
        targetBanking = 0.16;
        targetWidth = CONFIG.path.defaultWidth;
        break;

      case 'S_CURVE':
        // Smooth, flowing S-curve with moderate dynamic banking
        lateralCurve = randomChoice([-1, 1]) * randomRange(8, 12);
        elevationChange = randomRange(-1.5, 2.0);
        targetBanking = lateralCurve > 0 ? 0.20 : -0.20;
        targetWidth = CONFIG.path.defaultWidth;
        break;

      case 'UPHILL':
        lateralCurve = randomRange(-2, 2);
        elevationChange = randomRange(3.5, 5.5);
        targetBanking = 0;
        targetWidth = CONFIG.path.defaultWidth;
        break;

      case 'DOWNHILL':
        lateralCurve = randomRange(-2, 2);
        elevationChange = randomRange(-5.0, -3.5);
        targetBanking = 0;
        targetWidth = CONFIG.path.defaultWidth;
        break;

      case 'WAVE':
        lateralCurve = randomRange(-3, 3);
        elevationChange = randomRange(-2.5, 2.5);
        targetBanking = randomRange(-0.10, 0.10);
        targetWidth = CONFIG.path.defaultWidth;
        break;

      case 'BANKED_TURN':
        const dir = Math.random() > 0.5 ? 1 : -1;
        // Wide sweeping curve with moderate, exciting roller-coaster banking
        lateralCurve = dir * randomRange(9, 14);
        elevationChange = randomRange(-1.8, 1.8);
        targetBanking = dir * 0.24;
        targetWidth = CONFIG.path.defaultWidth;
        break;

      case 'NARROW_PASSAGE':
        lateralCurve = randomRange(-1.5, 1.5);
        elevationChange = randomRange(-0.8, 0.8);
        targetBanking = 0;
        targetWidth = CONFIG.path.minWidth;
        break;

      case 'WIDE_HIGHWAY':
        lateralCurve = randomRange(-3, 3);
        elevationChange = randomRange(-1.5, 1.5);
        targetBanking = 0;
        targetWidth = CONFIG.path.maxWidth;
        break;
    }

    // Midpoint control point P2
    let p2: THREE.Vector3;
    let p3: THREE.Vector3;

    if (pattern === 'S_CURVE') {
      // For S-curve, P2 swings one direction, P3 comes back
      p2 = p1
        .clone()
        .add(deltaForward.clone().multiplyScalar(length * 0.45))
        .add(deltaRight.clone().multiplyScalar(lateralCurve))
        .add(up.clone().multiplyScalar(elevationChange * 0.5));

      p3 = p1
        .clone()
        .add(deltaForward.clone().multiplyScalar(length))
        .add(deltaRight.clone().multiplyScalar(-lateralCurve * 0.5))
        .add(up.clone().multiplyScalar(elevationChange));
    } else if (pattern === 'WAVE') {
      // Crest up at P2, crest down at P3
      p2 = p1
        .clone()
        .add(deltaForward.clone().multiplyScalar(length * 0.45))
        .add(deltaRight.clone().multiplyScalar(lateralCurve * 0.5))
        .add(up.clone().multiplyScalar(5.0));

      p3 = p1
        .clone()
        .add(deltaForward.clone().multiplyScalar(length))
        .add(deltaRight.clone().multiplyScalar(lateralCurve))
        .add(up.clone().multiplyScalar(elevationChange));
    } else {
      // Standard smooth transition
      p2 = p1
        .clone()
        .add(deltaForward.clone().multiplyScalar(length * 0.5))
        .add(deltaRight.clone().multiplyScalar(lateralCurve * 0.4))
        .add(up.clone().multiplyScalar(elevationChange * 0.5));

      p3 = p1
        .clone()
        .add(deltaForward.clone().multiplyScalar(length))
        .add(deltaRight.clone().multiplyScalar(lateralCurve))
        .add(up.clone().multiplyScalar(elevationChange));
    }

    // P4 guide point for smooth exit
    const exitTangent = new THREE.Vector3().subVectors(p3, p2).normalize();
    const p4 = p3.clone().add(exitTangent.clone().multiplyScalar(length * 0.35));

    // Sample spline
    const sampleStep = CONFIG.path.sampleStep;
    const numSteps = Math.max(10, Math.round(length / sampleStep));
    const newSamples: PathSample[] = [];

    let prevPos = p1.clone();
    let runningDist = this.currentDistance;

    const startWidth = this.currentWidth;
    const startBanking = this.currentBanking;

    let prevTangent = this.currentTangent.clone();
    let prevNormal = this.currentNormal.clone();

    for (let i = 1; i <= numSteps; i++) {
      const t = i / numSteps;
      const pos = catmullRom(p0, p1, p2, p3, t);

      // Tangent is Catmull derivative
      const tangent = catmullRomTangent(p0, p1, p2, p3, t);

      // Distance increment
      const stepDist = pos.distanceTo(prevPos);
      runningDist += stepDist;
      prevPos.copy(pos);

      // Banking and width interpolation
      const banking = THREE.MathUtils.lerp(startBanking, targetBanking, t);
      const width = THREE.MathUtils.lerp(startWidth, targetWidth, t);

      // Compute continuous base frame via parallel transport (unbanked reference)
      const frame = parallelTransport(prevTangent, tangent, prevNormal);
      const baseNormal = frame.normal;
      const baseRight = frame.right;

      // Apply banking angle cleanly to this sample only (never compounds!)
      const normal = baseNormal.clone();
      const right = baseRight.clone();
      if (banking !== 0) {
        normal.applyAxisAngle(tangent, banking);
        right.applyAxisAngle(tangent, banking);
      }

      newSamples.push({
        distance: runningDist,
        position: pos.clone(),
        tangent: tangent.clone(),
        normal,
        right,
        width,
        banking,
      });

      prevTangent = tangent;
      prevNormal = baseNormal;
    }

    // Update generator state for next chunk
    const lastSample = newSamples[newSamples.length - 1];
    this.currentPos.copy(lastSample.position);
    this.currentTangent.copy(lastSample.tangent);
    this.currentNormal.copy(prevNormal);
    this.currentBanking = targetBanking;
    this.currentWidth = targetWidth;
    this.currentDistance = runningDist;

    this.flowPath.appendSamples(newSamples);

    const chunkInfo: ChunkInfo = {
      startDistance,
      endDistance: this.currentDistance,
      pattern,
      samples: newSamples,
    };
    this.chunks.push(chunkInfo);

    return chunkInfo;
  }

  public getRecentChunks(): readonly ChunkInfo[] {
    return this.chunks;
  }
}

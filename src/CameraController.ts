import * as THREE from 'three';
import { CONFIG } from './config';
import { PlayerBall } from './PlayerBall';
import { PathSample, damp } from './utils';
import { FlowPath } from './FlowPath';

export class CameraController {
  public camera: THREE.PerspectiveCamera;
  private currentPos = new THREE.Vector3(0, 6, 10);
  private currentLookAt = new THREE.Vector3(0, 1, 0);
  private currentUp = new THREE.Vector3(0, 1, 0);
  private trauma = 0;

  // Scratch vectors to eliminate GC pauses during 60fps loop
  private _roadDir = new THREE.Vector3();
  private _roadRight = new THREE.Vector3();
  private _targetPos = new THREE.Vector3();
  private _targetLook = new THREE.Vector3();
  private _targetUp = new THREE.Vector3(0, 1, 0);
  private _worldUp = new THREE.Vector3(0, 1, 0);

  constructor() {
    this.camera = new THREE.PerspectiveCamera(
      58,
      window.innerWidth / window.innerHeight,
      0.15, // Low near clip so track geometry right under camera doesn't clip
      1200
    );
    this.camera.position.copy(this.currentPos);
    this.camera.up.copy(this.currentUp);
  }

  public reset(initialSample: PathSample | null): void {
    if (initialSample) {
      const forward = initialSample.tangent;
      const pos = initialSample.position;

      this.currentPos.copy(pos)
        .addScaledVector(forward, -CONFIG.camera.distanceBehind)
        .add(new THREE.Vector3(0, CONFIG.camera.heightAbove + 1.2, 0));

      this.currentLookAt.copy(pos)
        .add(new THREE.Vector3(0, 0.95, 0))
        .addScaledVector(forward, 3.5);

      this.currentUp.set(0, 1, 0);
    } else {
      this.currentPos.set(0, 6.0, 9.0);
      this.currentLookAt.set(0, 1.0, -10);
      this.currentUp.set(0, 1, 0);
    }

    this.camera.position.copy(this.currentPos);
    this.camera.up.copy(this.currentUp);
    this.camera.lookAt(this.currentLookAt);
  }

  /**
   * Cinematic introduction camera sequence (3-4 seconds before run begins)
   */
  public updateIntro(
    t: number, // 0.0 to 1.0 progress through intro
    startSample: PathSample,
    pencilPos: THREE.Vector3,
    ballPos: THREE.Vector3
  ): void {
    // Stage 1 (0.0 to 0.45): High dramatic artist perspective watching pencil draw runway
    // Stage 2 (0.45 to 0.8): Ball rolls in, camera swoops around to follow angle
    // Stage 3 (0.8 to 1.0): Camera locks behind the ball, poised for roll-off!
    const forward = startSample.tangent;
    const right = startSample.right;

    if (t < 0.5) {
      const p = t / 0.5;
      // High sweeping isometric artist angle
      this._targetPos.copy(startSample.position)
        .addScaledVector(forward, -8.0 + p * 4.0)
        .addScaledVector(right, 14.0 - p * 6.0)
        .add(new THREE.Vector3(0, 12.0 - p * 4.0, 0));

      this._targetLook.copy(pencilPos).add(new THREE.Vector3(0, 0.5, 0));
      this._targetUp.set(0, 1, 0);
    } else {
      const p = (t - 0.5) / 0.5;
      const smoothP = p * p * (3 - 2 * p); // smoothstep

      const highPos = new THREE.Vector3()
        .copy(startSample.position)
        .addScaledVector(forward, -4.0)
        .addScaledVector(right, 8.0)
        .add(new THREE.Vector3(0, 8.0, 0));

      const behindPos = new THREE.Vector3()
        .copy(ballPos)
        .addScaledVector(forward, -CONFIG.camera.distanceBehind)
        .addScaledVector(startSample.normal, CONFIG.camera.heightAbove + 1.2);

      this._targetPos.lerpVectors(highPos, behindPos, smoothP);
      this._targetLook.lerpVectors(
        pencilPos,
        new THREE.Vector3().copy(ballPos).addScaledVector(forward, 4.0).add(new THREE.Vector3(0, 0.95, 0)),
        smoothP
      );
      this._targetUp.lerpVectors(this._worldUp, startSample.normal, smoothP);
    }

    this.currentPos.copy(this._targetPos);
    this.currentLookAt.copy(this._targetLook);
    this.currentUp.copy(this._targetUp);

    this.camera.position.copy(this.currentPos);
    this.camera.up.copy(this.currentUp);
    this.camera.lookAt(this.currentLookAt);
  }

  public update(
    playerBall: PlayerBall,
    pathSample: PathSample | null,
    dt: number,
    flowPath?: FlowPath
  ): void {
    const ballPos = playerBall.getPosition();
    const ballState = playerBall.state;

    if (ballState.isFalling || !pathSample) {
      this._targetPos.copy(this.currentPos);
      this._targetPos.y = Math.max(this._targetPos.y, ballPos.y + 5.5);

      this._targetLook.copy(ballPos);
      this._targetLook.y = Math.max(this._targetLook.y, this._targetPos.y - 8.0);
      this._targetUp.copy(this._worldUp);
    } else {
      // 1. CALCULATE ROAD CURVATURE DIRECTION & ANTICIPATION
      const aheadDist = ballState.distance + 18.0;
      const sampleAhead = flowPath ? flowPath.getSampleAtDistance(aheadDist) : null;
      const aheadTangent = sampleAhead ? sampleAhead.tangent : pathSample.tangent;

      this._roadDir.copy(pathSample.tangent).lerp(aheadTangent, 0.5).normalize();
      this._roadRight.crossVectors(this._roadDir, pathSample.normal).normalize();

      // 2. PATH ELEVATION & DOWNHILL VISIBILITY PROTECTION:
      // Computes future road gradient to adjust camera elevation before the drop
      let forwardSlope = pathSample.tangent.y;
      const slopeLookaheadSample = flowPath ? flowPath.getSampleAtDistance(ballState.distance + 26.0) : null;
      if (slopeLookaheadSample) {
        forwardSlope = (slopeLookaheadSample.position.y - ballPos.y) / 26.0;
      }
      const downhillFactor = Math.max(0, -forwardSlope);

      // When descending, the camera lifts up and tucks slightly closer
      // so the player looks cleanly DOWN the slope without crests blocking the view!
      const distBehind = Math.max(6.4, (CONFIG.camera.distanceBehind || 8.2) - downhillFactor * 2.2);
      const heightAbove = (CONFIG.camera.heightAbove || 4.5) + 0.8 + (downhillFactor * 4.2);

      this._targetPos.copy(ballPos)
        .addScaledVector(this._roadDir, -distBehind)
        .addScaledVector(pathSample.normal, heightAbove)
        .addScaledVector(this._roadRight, ballState.lateralOffset * 0.18);

      // 3. MULTI-POINT TRACK SURFACE CLEARANCE:
      if (flowPath) {
        // Road surface under camera
        const behindDist = Math.max(0, ballState.distance - distBehind);
        const behindSample = flowPath.getSampleAtDistance(behindDist);
        if (behindSample) {
          this._targetPos.y = Math.max(this._targetPos.y, behindSample.position.y + 3.6);
        }

        // Road surface at midpoint
        const midDist = Math.max(0, ballState.distance - distBehind * 0.5);
        const midSample = flowPath.getSampleAtDistance(midDist);
        if (midSample) {
          this._targetPos.y = Math.max(this._targetPos.y, midSample.position.y + 3.2);
        }
      }

      this._targetPos.y = Math.max(this._targetPos.y, ballPos.y + 2.6);

      // 4. PATH-AWARE FORWARD LOOK-AHEAD TARGET (Looks down into descents):
      const ballSpeed = typeof ballState.currentSpeed === 'number' ? ballState.currentSpeed : CONFIG.player.startSpeed;
      const lookAheadDist = Math.max(22.0, (CONFIG.camera.lookAheadDistance || 18.0) + (ballSpeed / 20.0) * 8.0 + downhillFactor * 18.0);
      
      let lookedAtPath = false;
      if (flowPath) {
        const lookSample = flowPath.getSampleAtDistance(ballState.distance + lookAheadDist);
        if (lookSample) {
          this._targetLook.copy(lookSample.position)
            .addScaledVector(lookSample.normal, 1.6)
            .addScaledVector(lookSample.right, ballState.lateralOffset * 0.2);
          lookedAtPath = true;
        }
      }

      if (!lookedAtPath) {
        this._targetLook.copy(ballPos)
          .addScaledVector(this._roadDir, lookAheadDist)
          .addScaledVector(pathSample.normal, 1.6)
          .addScaledVector(this._roadRight, ballState.lateralOffset * 0.2);
      }

      // 5. CAMERA BENDS AND ROLLS WITH ROAD BANKING:
      this._targetUp.copy(pathSample.normal);
    }

    // 6. FRAME-RATE INDEPENDENT SMOOTH EXPONENTIAL DAMPING (Zero jitter)
    const posLerpFactor = 1 - Math.exp(-8.0 * dt);
    const lookLerpFactor = 1 - Math.exp(-9.5 * dt);

    this.currentPos.lerp(this._targetPos, posLerpFactor);
    this.currentLookAt.lerp(this._targetLook, lookLerpFactor);
    this.currentUp.lerp(this._targetUp, posLerpFactor).normalize();

    // Dynamic FOV on boost
    const baseFov = window.innerWidth < window.innerHeight ? 68 : 62;
    const targetFov = ballState.isBoosted ? baseFov + 6 : baseFov;
    this.camera.fov = damp(this.camera.fov, targetFov, 6, dt);
    this.camera.updateProjectionMatrix();

    this.camera.position.copy(this.currentPos);
    this.camera.up.copy(this.currentUp);

    // Apply trauma shake if active
    if (this.trauma > 0.01) {
      const shake = this.trauma * this.trauma;
      this.camera.position.x += (Math.random() - 0.5) * shake * 1.8;
      this.camera.position.y += (Math.random() - 0.5) * shake * 1.8;
      this.camera.position.z += (Math.random() - 0.5) * shake * 1.2;
      this.trauma = Math.max(0, this.trauma - dt * 2.8);
    }

    this.camera.lookAt(this.currentLookAt);
  }

  public addTrauma(amount: number): void {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  public onResize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.fov = width < height ? 68 : 58;
    this.camera.updateProjectionMatrix();
  }
}

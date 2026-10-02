import * as THREE from 'three';
import { CONFIG } from './config';
import { PathSample, damp, clamp } from './utils';
import { PencilStyleDefinition } from './PencilStyleSystem';

export interface BallState {
  distance: number;
  lateralOffset: number;
  lateralVelocity: number;
  targetLateralOffset: number;
  jumpHeight: number;
  jumpVelocity: number;
  currentSpeed: number;
  isAirborne: boolean;
  isFalling: boolean;
  fallTime: number;
  isDead: boolean;
  isBoosted: boolean;
  boostTimer: number;
  worldPos: THREE.Vector3;
  worldVelocity: THREE.Vector3;
  surfaceContact: boolean;
}

export class PlayerBall {
  public group: THREE.Group;
  private squashGroup: THREE.Group;
  private visualSphere: THREE.Group;
  private ballMesh: THREE.Mesh;
  private wireframeMesh: THREE.LineSegments;
  private equatorMesh: THREE.Mesh;
  private shadowMesh: THREE.Mesh;

  public state: BallState;
  
  // Physically correct roll orientation accumulator (Quaternion)
  private rollingQuat = new THREE.Quaternion();
  private leanAngle = 0;
  private landingCompression = 0;

  // Scratch vectors to eliminate GC memory allocations in the 60fps loop
  private _ballPos = new THREE.Vector3();
  private _backward = new THREE.Vector3();
  private _rotMat = new THREE.Matrix4();
  private _pathQuat = new THREE.Quaternion();
  private _deltaQuat = new THREE.Quaternion();
  private _localRollAxis = new THREE.Vector3();
  private _localUp = new THREE.Vector3(0, 1, 0);

  constructor() {
    this.group = new THREE.Group();

    // squashGroup handles local path-aligned lean, landing squash, and speed stretch
    this.squashGroup = new THREE.Group();
    this.group.add(this.squashGroup);

    // visualSphere handles the rolling orientation
    this.visualSphere = new THREE.Group();
    this.squashGroup.add(this.visualSphere);

    const radius = CONFIG.player.radius;

    // 1. Hand-drawn styled Ball Mesh
    const sphereGeo = new THREE.SphereGeometry(radius, 32, 28);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0xf7f5f0, // warm paper white
      roughness: 0.6,
      metalness: 0.05,
    });
    this.ballMesh = new THREE.Mesh(sphereGeo, sphereMat);
    this.ballMesh.castShadow = true;
    this.visualSphere.add(this.ballMesh);

    // Sketchy graphite contour lines and longitude lines around the ball
    const wireGeo = new THREE.WireframeGeometry(sphereGeo);
    const wireMat = new THREE.LineBasicMaterial({
      color: CONFIG.visual.graphiteDark,
      linewidth: 1,
      transparent: true,
      opacity: 0.45,
    });
    this.wireframeMesh = new THREE.LineSegments(wireGeo, wireMat);
    this.visualSphere.add(this.wireframeMesh);

    // Decorative sketchy graphite equator band
    const equatorGeo = new THREE.TorusGeometry(radius * 1.002, 0.024, 8, 36);
    const equatorMat = new THREE.MeshBasicMaterial({
      color: CONFIG.visual.graphiteDark,
    });
    this.equatorMesh = new THREE.Mesh(equatorGeo, equatorMat);
    this.visualSphere.add(this.equatorMesh);

    // 2. Soft graphite drop shadow on the paper surface
    const shadowGeo = new THREE.CircleGeometry(radius * 1.15, 24);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: CONFIG.visual.graphiteDark,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });
    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.group.add(this.shadowMesh);

    this.state = {
      distance: 0,
      lateralOffset: 0,
      lateralVelocity: 0,
      targetLateralOffset: 0,
      jumpHeight: 0,
      jumpVelocity: 0,
      currentSpeed: CONFIG.player.startSpeed,
      isAirborne: false,
      isFalling: false,
      fallTime: 0,
      isDead: false,
      isBoosted: false,
      boostTimer: 0,
      worldPos: new THREE.Vector3(),
      worldVelocity: new THREE.Vector3(),
      surfaceContact: true,
    };
  }

  public setSkin(skinId: string): void {
    const mat = this.ballMesh.material as THREE.MeshStandardMaterial;
    const wireMat = this.wireframeMesh.material as THREE.LineBasicMaterial;
    const eqMat = this.equatorMesh.material as THREE.MeshBasicMaterial;

    switch (skinId) {
      case 'marble':
        mat.color.setHex(0xe2ddd5);
        mat.roughness = 0.3;
        mat.metalness = 0.1;
        wireMat.color.setHex(0x524d47);
        eqMat.color.setHex(0x524d47);
        break;
      case 'graphite_core':
        mat.color.setHex(0x1a1918);
        mat.roughness = 0.35;
        mat.metalness = 0.85;
        wireMat.color.setHex(0x57534e);
        eqMat.color.setHex(0x57534e);
        break;
      case 'eraser_pink':
        mat.color.setHex(0xe07272);
        mat.roughness = 0.75;
        mat.metalness = 0.02;
        wireMat.color.setHex(0x4895ef);
        eqMat.color.setHex(0x4895ef);
        break;
      case 'ink_splat':
        mat.color.setHex(0x0f0e0d);
        mat.roughness = 0.15;
        mat.metalness = 0.3;
        wireMat.color.setHex(0x383533);
        eqMat.color.setHex(0x383533);
        break;
      case 'blueprint':
        mat.color.setHex(0x0284c7);
        mat.roughness = 0.4;
        mat.metalness = 0.2;
        wireMat.color.setHex(0xffffff);
        eqMat.color.setHex(0xffffff);
        break;
      case 'gold_leaf':
        mat.color.setHex(0xdfab34);
        mat.roughness = 0.25;
        mat.metalness = 0.95;
        wireMat.color.setHex(0x78350f);
        eqMat.color.setHex(0x78350f);
        break;
      case 'neon_sketch':
        mat.color.setHex(0x06d6a0);
        mat.roughness = 0.3;
        mat.metalness = 0.1;
        wireMat.color.setHex(0x118ab2);
        eqMat.color.setHex(0x118ab2);
        break;
      case 'classic':
      default:
        mat.color.setHex(0xf7f5f0);
        mat.roughness = 0.6;
        mat.metalness = 0.05;
        wireMat.color.setHex(CONFIG.visual.graphiteDark);
        eqMat.color.setHex(CONFIG.visual.graphiteDark);
        break;
    }
  }

  public applyPencilStyle(style: PencilStyleDefinition): void {
    if (!style) return;
    if (this.shadowMesh?.material) {
      (this.shadowMesh.material as THREE.MeshBasicMaterial).color.setHex(style.primaryColor);
    }
  }

  public reset(): void {
    this.state.distance = 0;
    this.state.lateralOffset = 0;
    this.state.lateralVelocity = 0;
    this.state.targetLateralOffset = 0;
    this.state.jumpHeight = 0;
    this.state.jumpVelocity = 0;
    this.state.currentSpeed = CONFIG.player.startSpeed;
    this.state.isAirborne = false;
    this.state.isFalling = false;
    this.state.fallTime = 0;
    this.state.isDead = false;
    this.state.isBoosted = false;
    this.state.boostTimer = 0;
    this.state.surfaceContact = true;
    this.state.worldPos.set(0, 0, 0);
    this.state.worldVelocity.set(0, 0, 0);

    this.rollingQuat.identity();
    this.leanAngle = 0;
    this.landingCompression = 0;

    this.group.quaternion.identity();
    this.squashGroup.rotation.set(0, 0, 0);
    this.squashGroup.scale.set(1, 1, 1);
    this.visualSphere.quaternion.identity();
    this.visualSphere.scale.set(1, 1, 1);
    this.visualSphere.visible = true;
    this.shadowMesh.visible = true;
    this.group.scale.set(1, 1, 1);
  }

  public activateBoost(duration: number): void {
    this.state.isBoosted = true;
    this.state.boostTimer = Math.max(this.state.boostTimer, duration);
  }

  public setTargetLateralOffset(offset: number): void {
    if (this.state.isFalling || this.state.isDead) return;
    this.state.targetLateralOffset = offset;
  }

  public shiftTargetLateral(delta: number): void {
    if (this.state.isFalling || this.state.isDead) return;
    this.state.targetLateralOffset += delta;
  }

  public jump(): boolean {
    if (this.state.isFalling || this.state.isAirborne || this.state.isDead) return false;
    this.state.isAirborne = true;
    this.state.surfaceContact = false;
    this.state.jumpVelocity = CONFIG.player.jumpForce;
    return true;
  }

  public update(
    dt: number,
    currentSpeed: number,
    pathSample: PathSample | null,
    onLand?: () => void,
    onFall?: () => void
  ): void {
    const radius = CONFIG.player.radius;
    this.state.currentSpeed = currentSpeed;

    // Update boost timer
    if (this.state.isBoosted) {
      this.state.boostTimer -= dt;
      if (this.state.boostTimer <= 0) {
        this.state.isBoosted = false;
        this.state.boostTimer = 0;
      }
    }

    // Handle Falling physics (detached completely from track)
    if (this.state.isFalling) {
      if (this.state.isDead) return;

      this.state.fallTime += dt;
      if (this.state.fallTime > 0.85) {
        this.state.isDead = true;
        this.visualSphere.visible = false;
        return;
      }

      this.state.worldVelocity.y -= CONFIG.player.gravity * 1.1 * dt;
      this.state.worldVelocity.x *= 0.98;
      this.state.worldVelocity.z *= 0.98;

      this.state.worldPos.addScaledVector(this.state.worldVelocity, dt);
      this.group.position.copy(this.state.worldPos);

      // Tumble tumbling in free fall
      this._deltaQuat.setFromAxisAngle(this._localRollAxis, dt * 5.0);
      this.visualSphere.quaternion.multiply(this._deltaQuat);
      this.shadowMesh.visible = false;
      return;
    }

    if (!pathSample) return;

    // 1. Advance distance along path (Forward kinematics)
    const deltaForward = currentSpeed * dt;
    this.state.distance += deltaForward;

    // 2. Natural lateral movement with 2nd-Order Critically Damped Spring
    const halfWidth = pathSample.width * 0.5;
    const steerLimit = halfWidth * 0.88;

    // Constrain input target safely within track bounds unless airborne
    if (!this.state.isAirborne) {
      this.state.targetLateralOffset = clamp(this.state.targetLateralOffset, -steerLimit, steerLimit);
    }

    const prevOffset = this.state.lateralOffset;

    // Analytic critically damped spring (frequency omega = 16 rad/s)
    const omega = 16.0;
    const deltaX = this.state.lateralOffset - this.state.targetLateralOffset;
    const decay = Math.exp(-omega * dt);
    const temp = (this.state.lateralVelocity + omega * deltaX) * dt;

    this.state.lateralOffset = this.state.targetLateralOffset + (deltaX + temp) * decay;
    this.state.lateralVelocity = (this.state.lateralVelocity - omega * temp) * decay;

    // Soft curb boundary restitution force if entering outer curb zone
    if (!this.state.isAirborne && Math.abs(this.state.lateralOffset) > steerLimit) {
      const overstep = Math.abs(this.state.lateralOffset) - steerLimit;
      this.state.lateralVelocity -= Math.sign(this.state.lateralOffset) * overstep * 40.0 * dt;
      this.state.lateralOffset = clamp(this.state.lateralOffset, -halfWidth * 0.98, halfWidth * 0.98);
    }

    const deltaLateral = this.state.lateralOffset - prevOffset;

    // 3. Jump and Landing Physics with Compression
    if (this.state.isAirborne) {
      this.state.jumpVelocity -= CONFIG.player.gravity * dt;
      this.state.jumpHeight += this.state.jumpVelocity * dt;

      if (this.state.jumpHeight <= 0) {
        this.state.jumpHeight = 0;
        this.state.jumpVelocity = 0;
        this.state.isAirborne = false;
        this.state.surfaceContact = true;
        this.landingCompression = 0.22; // Small physical compression when landing
        onLand?.();
      }
    } else {
      this.state.surfaceContact = true;
    }

    // 4. Edge boundary check (Generous margin so player never falls off unexpectedly)
    const fallTolerance = 1.35;
    if (Math.abs(this.state.lateralOffset) > halfWidth + fallTolerance) {
      this.startFalling(pathSample, currentSpeed);
      onFall?.();
      return;
    }

    // 5. Contact surface calculation:
    // Path ribbon has raised curb profile at edges (> 72% half width, raising up to 0.35m)
    let curbLift = 0;
    const curbStart = halfWidth * 0.72;
    if (Math.abs(this.state.lateralOffset) > curbStart) {
      const curbFactor = clamp((Math.abs(this.state.lateralOffset) - curbStart) / (halfWidth * 0.28), 0, 1);
      curbLift = curbFactor * curbFactor * 0.35;
    }

    const right = pathSample.right;
    const up = pathSample.normal;

    // Position ball center exactly radius + curbLift + jumpHeight above surface
    this._ballPos.copy(pathSample.position)
      .addScaledVector(right, this.state.lateralOffset)
      .addScaledVector(up, radius + this.state.jumpHeight + curbLift);

    this.group.position.copy(this._ballPos);
    this.state.worldPos.copy(this._ballPos);

    // Calculate actual 3D movement velocity
    this.state.worldVelocity.copy(pathSample.tangent).multiplyScalar(currentSpeed)
      .addScaledVector(right, this.state.lateralVelocity)
      .addScaledVector(up, this.state.jumpVelocity);

    // 6. Mathematical Right-Handed Orthonormal Basis for Path Orientation
    // Local +X = right
    // Local +Y = up (normal)
    // Local +Z = backward (cross(right, up) = -tangent, det = +1.0)
    this._backward.crossVectors(right, up).normalize();
    this._rotMat.makeBasis(right, up, this._backward);
    this._pathQuat.setFromRotationMatrix(this._rotMat);
    this.group.quaternion.copy(this._pathQuat);

    // 7. PHYSICALLY CORRECT ROLLING ORIENTATION (Quaternion-based)
    // Roll Rotation = Distance Travelled / Ball Radius
    // Combined forward, lateral, and path displacement
    const actualGroundDist = Math.sqrt(deltaForward * deltaForward + deltaLateral * deltaLateral);

    if (actualGroundDist > 1e-6) {
      const rollAngle = actualGroundDist / radius;

      // In local coordinates:
      // deltaForward rolls around local +X axis
      // deltaLateral rolls around local +Z axis
      // Combined roll axis = (deltaForward, 0, deltaLateral).normalize()
      this._localRollAxis.set(deltaForward, 0, deltaLateral).normalize();
      this._deltaQuat.setFromAxisAngle(this._localRollAxis, rollAngle);

      // Premultiply so rotation accumulates around the local rolling frame
      this.rollingQuat.premultiply(this._deltaQuat);
      this.rollingQuat.normalize();
    }

    this.visualSphere.quaternion.copy(this.rollingQuat);

    // 8. Visual Weight & Physical Cues:
    // A. Subtle centrifugal tilt/lean during lateral steering
    const targetLean = -clamp(this.state.lateralVelocity / 15.0, -0.22, 0.22);
    this.leanAngle = damp(this.leanAngle, targetLean, 12.0, dt);
    this.squashGroup.rotation.z = this.leanAngle;

    // B. Subtle landing compression spring & high-speed stretch
    this.landingCompression = damp(this.landingCompression, 0, 16.0, dt);
    const speedFactor = clamp((currentSpeed - 15) / 30.0, 0, 0.035);
    const comp = this.landingCompression;
    const sy = (1.0 - comp) * (1.0 - speedFactor * 0.5);
    const sx = (1.0 + comp * 0.5) * (1.0 - speedFactor * 0.5);
    const sz = (1.0 + comp * 0.5) * (1.0 + speedFactor);
    this.squashGroup.scale.set(sx, sy, sz);

    // 9. Drop Shadow on Paper Surface
    this.shadowMesh.position.set(0, -(radius + this.state.jumpHeight) + 0.015, 0);
    const airFactor = clamp(1.0 - this.state.jumpHeight / 3.8, 0.15, 1.0);
    this.shadowMesh.scale.set(airFactor, airFactor, airFactor);
    (this.shadowMesh.material as THREE.MeshBasicMaterial).opacity = 0.38 * airFactor;
  }

  private startFalling(sample: PathSample, currentSpeed: number): void {
    this.state.isFalling = true;
    this.state.surfaceContact = false;
    const forward = sample.tangent.clone().multiplyScalar(currentSpeed);
    const right = sample.right.clone().multiplyScalar(this.state.lateralVelocity);
    const up = sample.normal.clone().multiplyScalar(this.state.jumpVelocity);

    this.state.worldVelocity.copy(forward).add(right).add(up);
    this._localRollAxis.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
  }

  public getRadius(): number {
    return CONFIG.player.radius;
  }

  public getPosition(): THREE.Vector3 {
    return this.state.worldPos;
  }
}

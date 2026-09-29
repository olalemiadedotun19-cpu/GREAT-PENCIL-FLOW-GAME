import * as THREE from 'three';
import { CONFIG } from './config';
import { FlowPath } from './FlowPath';
import { randomChoice, randomRange } from './utils';

export type ObstacleCategory =
  | 'FLOOR'
  | 'OVERHEAD'
  | 'SIDE_CLOSING'
  | 'MOVING'
  | 'VERTICAL'
  | 'RISK_SPLIT';

export type ObstacleType =
  // FLOOR (16)
  | 'PENCIL_SHARPENER'
  | 'ERASER_BLOCK'
  | 'KNEADED_PUTTY'
  | 'SET_SQUARE_45'
  | 'GRAPHITE_SPIKES'
  | 'THUMBTACK_PIN'
  | 'CRUMPLED_PAPER'
  | 'STAPLE_STRIP'
  | 'WOODEN_RULER'
  | 'XACTO_KNIFE'
  | 'CORRECTION_TAPE'
  | 'PAPERCLIP_BARRIER'
  | 'BINDER_CLIP'
  | 'PAPER_CHASM_GAP'
  | 'CRACKED_FISSURE'
  | 'ROLLING_PENCIL_SHAVING'
  | 'GRAPHITE_BOULDER'
  // OVERHEAD (7)
  | 'OVERHEAD_CRANE_BEAM'
  | 'SUSPENDED_STEEL_BEAM'
  | 'HANGING_DRAFTING_SIGN'
  | 'GIANT_PENCIL_SUSPENSION'
  | 'LOW_CEILING_ARCH'
  | 'FALLING_PLUMB_BOB'
  | 'HANGING_ERASER'
  // SIDE CLOSING / VICE (4)
  | 'SLIDING_ERASER_VICE'
  | 'ROAD_NARROWING_BRACKET'
  | 'EXPANDING_INK_SPLAT'
  | 'SIDE_ERASER_SWEEP'
  // MOVING / PENDULUM (4)
  | 'PENDULUM_RULER'
  | 'SLIDING_SHARPENER'
  | 'ROTATING_COMPASS_ARM'
  | 'BOUNCING_PAPER_BOULDER'
  // VERTICAL (3)
  | 'RISING_GRAPHITE_PILLARS'
  | 'DESCENDING_STAMP_BLOCK'
  | 'RISING_PAPER_FOLD'
  // RISK REWARD (2)
  | 'RISK_REWARD_DIVIDE'
  | 'ELEVATED_RAMP_JUMP';

export interface ObstacleInstance {
  id: number;
  type: ObstacleType;
  category: ObstacleCategory;
  distance: number;
  lateralOffset: number; // Base offset
  currentLateralOffset: number; // Evaluated real-time lateral position
  currentHeightOffset: number; // Evaluated real-time height
  width: number;
  height: number;
  depth: number;
  jumpable: boolean;
  requiresJump?: boolean; // Must be jumped over (chasm gap, fissure)
  overheadClearanceBottom?: number; // Player jump must be BELOW this to pass under!
  overheadClearanceTop?: number;
  meshGroup: THREE.Group;
  active: boolean;
  drawn: boolean;
  drawAnimProgress: number;
  motionType: 'STATIC' | 'PENDULUM' | 'SLIDE_X' | 'VICE_CLOSE' | 'RISE_Y' | 'ROTATE_Z' | 'BOUNCE_Y' | 'DROP_ON_APPROACH';
  motionSpeed: number;
  motionAmplitude: number;
  motionPhase: number;
  flasherMesh?: THREE.Mesh;
  closeCallChecked?: boolean;
  triggeredFall?: boolean;
  fallProgress?: number;
  // Sub-parts for vice closing obstacles
  viceLeftPart?: THREE.Object3D;
  viceRightPart?: THREE.Object3D;
}

export const LANES = {
  LEFT: -3.6,
  CENTER: 0.0,
  RIGHT: 3.6,
};

export class ObstacleSystem {
  public group: THREE.Group;
  private flowPath: FlowPath;
  private obstacles: ObstacleInstance[] = [];
  private nextId = 0;
  private lastSpawnDist = 45;
  private animTimer = 0;

  // Callbacks
  public onObstacleDrawn?: (pos: THREE.Vector3, type: ObstacleType, category: ObstacleCategory) => void;
  public onCategoryDiscovered?: (categoryKey: string) => void;

  // Scratch vectors for fast per-frame transform
  private _backward = new THREE.Vector3();
  private _basisMat = new THREE.Matrix4();
  private _obsPos = new THREE.Vector3();

  // Materials library
  private metalSteelMat: THREE.MeshStandardMaterial;
  private pinkRubberMat: THREE.MeshStandardMaterial;
  private blueEraserMat: THREE.MeshStandardMaterial;
  private kneadedPuttyMat: THREE.MeshStandardMaterial;
  private brassMat: THREE.MeshStandardMaterial;
  private amberAcrylicMat: THREE.MeshStandardMaterial;
  private cyanAcrylicMat: THREE.MeshStandardMaterial;
  private woodRulerMat: THREE.MeshStandardMaterial;
  private graphiteMat: THREE.MeshStandardMaterial;
  private inkGlossMat: THREE.MeshStandardMaterial;
  private pushpinRedMat: THREE.MeshStandardMaterial;
  private paperCrumpleMat: THREE.MeshStandardMaterial;
  private neonYellowMat: THREE.MeshStandardMaterial;
  private plasticWhiteMat: THREE.MeshStandardMaterial;
  private rubberRedMat: THREE.MeshStandardMaterial;
  private dangerOrangeMat: THREE.MeshStandardMaterial;
  private lineDarkMat: THREE.LineBasicMaterial;
  private dangerBeaconMat: THREE.MeshBasicMaterial;

  constructor(flowPath: FlowPath) {
    this.flowPath = flowPath;
    this.group = new THREE.Group();

    this.metalSteelMat = new THREE.MeshStandardMaterial({ color: 0x8e8a83, roughness: 0.35, metalness: 0.85 });
    this.pinkRubberMat = new THREE.MeshStandardMaterial({ color: 0xe07272, roughness: 0.75, metalness: 0.05 });
    this.blueEraserMat = new THREE.MeshStandardMaterial({ color: 0x4895ef, roughness: 0.7, metalness: 0.05 });
    this.kneadedPuttyMat = new THREE.MeshStandardMaterial({ color: 0x4f4943, roughness: 0.95, metalness: 0.0 });
    this.brassMat = new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.3, metalness: 0.9 });
    this.amberAcrylicMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.75, roughness: 0.2, metalness: 0.1 });
    this.cyanAcrylicMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.75, roughness: 0.2, metalness: 0.1 });
    this.woodRulerMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.8, metalness: 0.0 });
    this.graphiteMat = new THREE.MeshStandardMaterial({ color: 0x1f1d1b, roughness: 0.4, metalness: 0.7 });
    this.inkGlossMat = new THREE.MeshStandardMaterial({ color: 0x0a0908, roughness: 0.15, metalness: 0.3 });
    this.pushpinRedMat = new THREE.MeshStandardMaterial({ color: 0xd90429, roughness: 0.4, metalness: 0.2 });
    this.paperCrumpleMat = new THREE.MeshStandardMaterial({ color: 0xede8de, roughness: 0.9, metalness: 0.0, flatShading: true });
    this.neonYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xa16207, emissiveIntensity: 0.4, roughness: 0.3, metalness: 0.1 });
    this.plasticWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.4, metalness: 0.1 });
    this.rubberRedMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.7, metalness: 0.1 });
    this.dangerOrangeMat = new THREE.MeshStandardMaterial({ color: 0xe65100, roughness: 0.4, metalness: 0.2 });
    this.lineDarkMat = new THREE.LineBasicMaterial({ color: 0x221f1d, linewidth: 1.5 });
    this.dangerBeaconMat = new THREE.MeshBasicMaterial({ color: 0xff1e42 });
  }

  public reset(): void {
    for (const obs of this.obstacles) {
      this.group.remove(obs.meshGroup);
    }
    this.obstacles = [];
    this.lastSpawnDist = 45;
    this.animTimer = 0;
  }

  public getActiveObstacles(): ObstacleInstance[] {
    return this.obstacles;
  }

  public update(playerDist: number, pencilDrawDist: number, dt: number, stageName = 'SKETCHBOOK'): void {
    this.animTimer += dt;

    // Spawn ahead along path
    const maxSpawnAhead = Math.max(playerDist + 85, pencilDrawDist + 30);
    const spawnInterval = Math.max(22, 36 - (playerDist / 700) * 10);

    while (this.lastSpawnDist + spawnInterval < maxSpawnAhead) {
      this.lastSpawnDist += spawnInterval;
      this.spawnObstaclePatternAt(this.lastSpawnDist, playerDist, stageName);
    }

    // Process drawn state, sketch animation, and dynamic motions
    for (const obs of this.obstacles) {
      if (!obs.active) continue;

      // PENCIL DRAWS OBSTACLES: Only visible once pencil reaches obstacle distance
      if (!obs.drawn) {
        if (pencilDrawDist >= obs.distance) {
          obs.drawn = true;
          obs.meshGroup.visible = true;
          obs.drawAnimProgress = 0.01;
          const sample = this.flowPath.getSampleAtDistance(obs.distance);
          if (sample && this.onObstacleDrawn) {
            const drawPos = sample.position.clone().addScaledVector(sample.right, obs.lateralOffset);
            this.onObstacleDrawn(drawPos, obs.type, obs.category);
          }
          // Notify category discovery
          if (this.onCategoryDiscovered) {
            switch (obs.category) {
              case 'OVERHEAD': this.onCategoryDiscovered('obs_overhead'); break;
              case 'SIDE_CLOSING': this.onCategoryDiscovered('obs_side_moving'); break;
              case 'MOVING': this.onCategoryDiscovered('obs_pendulum'); break;
              case 'VERTICAL': this.onCategoryDiscovered('obs_vertical'); break;
              case 'RISK_SPLIT': this.onCategoryDiscovered('obs_risk_route'); break;
            }
          }
        } else {
          obs.meshGroup.visible = false;
          continue;
        }
      }

      // Smooth sketch pop scale
      if (obs.drawAnimProgress < 1.0) {
        obs.drawAnimProgress = Math.min(1.0, obs.drawAnimProgress + dt * 4.5);
        const t = obs.drawAnimProgress;
        const scale = t < 0.7 ? (t / 0.7) * 1.15 : 1.15 - ((t - 0.7) / 0.3) * 0.15;
        obs.meshGroup.scale.set(scale, scale, scale);
      }

      // EVALUATE REAL-TIME DYNAMIC MOTION
      this.updateObstacleMotion(obs, dt, playerDist);

      // Flasher beacon
      if (obs.flasherMesh) {
        const flash = (Math.sin(this.animTimer * 12.0 + obs.id) + 1.0) * 0.5;
        obs.flasherMesh.visible = flash > 0.4;
      }

      // Transform relative to flowing 3D path sample
      const sample = this.flowPath.getSampleAtDistance(obs.distance);
      if (sample) {
        this._obsPos.copy(sample.position)
          .addScaledVector(sample.right, obs.currentLateralOffset)
          .addScaledVector(sample.normal, obs.currentHeightOffset);

        obs.meshGroup.position.copy(this._obsPos);

        this._backward.crossVectors(sample.right, sample.normal).normalize();
        this._basisMat.makeBasis(sample.right, sample.normal, this._backward);
        obs.meshGroup.quaternion.setFromRotationMatrix(this._basisMat);
      }
    }

    // Prune distant passed obstacles
    const pruneDist = playerDist - 35;
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      if (obs.distance < pruneDist) {
        this.group.remove(obs.meshGroup);
        this.obstacles.splice(i, 1);
      }
    }
  }

  private updateObstacleMotion(obs: ObstacleInstance, dt: number, playerDist: number): void {
    const t = this.animTimer * obs.motionSpeed + obs.motionPhase;

    switch (obs.motionType) {
      case 'BOUNCE_Y': {
        const bounce = Math.abs(Math.sin(t));
        obs.currentHeightOffset = 0.5 + bounce * obs.motionAmplitude;
        break;
      }
      case 'DROP_ON_APPROACH': {
        if (playerDist > obs.distance - 26) {
          obs.triggeredFall = true;
        }
        if (obs.triggeredFall) {
          obs.fallProgress = Math.min(1.0, (obs.fallProgress || 0) + dt * 3.8);
          // Drops down from suspended height towards the road
          obs.currentHeightOffset = THREE.MathUtils.lerp(0.0, -2.5, obs.fallProgress);
        } else {
          obs.currentHeightOffset = 0;
        }
        break;
      }
      case 'PENDULUM': {
        // Swings back and forth smoothly across the track width
        obs.currentLateralOffset = obs.lateralOffset + Math.sin(t) * obs.motionAmplitude;
        obs.meshGroup.rotation.z = Math.sin(t) * 0.55;
        break;
      }
      case 'SLIDE_X': {
        // Continuous linear glide across lanes with smooth turnaround
        obs.currentLateralOffset = obs.lateralOffset + Math.sin(t) * obs.motionAmplitude;
        break;
      }
      case 'VICE_CLOSE': {
        // Two side blocks sliding in and out periodically, leaving a predictable timed corridor
        const closeFactor = (Math.sin(t) + 1.0) * 0.5; // 0 (open) to 1 (closed)
        if (obs.viceLeftPart && obs.viceRightPart) {
          const shift = closeFactor * obs.motionAmplitude;
          obs.viceLeftPart.position.x = -shift;
          obs.viceRightPart.position.x = shift;
        }
        break;
      }
      case 'RISE_Y': {
        // Hexagonal pillars rise from below road surface periodically
        const rise = THREE.MathUtils.clamp(Math.sin(t) * 1.5, 0.0, 1.0);
        obs.currentHeightOffset = obs.height * (0.5 * rise) - (1.0 - rise) * obs.height;
        break;
      }
      case 'ROTATE_Z': {
        obs.meshGroup.rotation.z += dt * obs.motionSpeed;
        break;
      }
      case 'STATIC':
      default: {
        obs.currentLateralOffset = obs.lateralOffset;
        break;
      }
    }
  }

  /**
   * Procedural stage-aware obstacle pattern generation
   */
  private spawnObstaclePatternAt(dist: number, playerDist: number, stageName: string): void {
    // Select obstacle category based on current stage
    let allowedCategories: ObstacleCategory[] = ['FLOOR'];

    if (stageName === 'CITY' || playerDist >= 500) {
      allowedCategories = ['FLOOR', 'OVERHEAD', 'MOVING', 'SIDE_CLOSING'];
    }
    if (stageName === 'ROOFTOPS' || playerDist >= 1500) {
      allowedCategories = ['FLOOR', 'OVERHEAD', 'MOVING', 'SIDE_CLOSING', 'RISK_SPLIT'];
    }
    if (stageName === 'MOUNTAINS' || playerDist >= 3000) {
      allowedCategories = ['FLOOR', 'OVERHEAD', 'MOVING', 'SIDE_CLOSING', 'VERTICAL', 'RISK_SPLIT'];
    }
    if (stageName === 'INK_WORLD' || stageName === 'BLUEPRINT' || playerDist >= 5000) {
      allowedCategories = ['OVERHEAD', 'MOVING', 'SIDE_CLOSING', 'VERTICAL', 'RISK_SPLIT'];
    }

    const chosenCategory = randomChoice(allowedCategories);

    switch (chosenCategory) {
      case 'OVERHEAD':
        this.spawnOverheadObstacle(dist);
        break;
      case 'SIDE_CLOSING':
        this.spawnSideClosingObstacle(dist);
        break;
      case 'MOVING':
        this.spawnMovingObstacle(dist);
        break;
      case 'VERTICAL':
        this.spawnVerticalObstacle(dist);
        break;
      case 'RISK_SPLIT':
        this.spawnRiskSplitObstacle(dist);
        break;
      case 'FLOOR':
      default:
        this.spawnFloorObstacle(dist, playerDist);
        break;
    }
  }

  // 1. FLOOR OBSTACLES
  private spawnFloorObstacle(dist: number, playerDist: number): void {
    const floorTypes: ObstacleType[] = [
      'PENCIL_SHARPENER', 'ERASER_BLOCK', 'KNEADED_PUTTY', 'SET_SQUARE_45',
      'GRAPHITE_SPIKES', 'THUMBTACK_PIN', 'CRUMPLED_PAPER', 'STAPLE_STRIP',
      'WOODEN_RULER', 'XACTO_KNIFE', 'CORRECTION_TAPE', 'PAPERCLIP_BARRIER', 'BINDER_CLIP',
      'PAPER_CHASM_GAP', 'CRACKED_FISSURE', 'ROLLING_PENCIL_SHAVING', 'GRAPHITE_BOULDER',
    ];

    // For chasm gap, ensure it spans the road and requires a leap
    if (playerDist > 300 && Math.random() < 0.18) {
      this.buildFloorInstance('PAPER_CHASM_GAP', dist, 0.0);
      return;
    }

    const count = playerDist > 600 && Math.random() > 0.5 ? 2 : 1;
    const availableLanes = [LANES.LEFT, LANES.CENTER, LANES.RIGHT];

    for (let c = 0; c < count; c++) {
      if (availableLanes.length === 0) break;
      const idx = Math.floor(Math.random() * availableLanes.length);
      const lane = availableLanes.splice(idx, 1)[0];
      const type = randomChoice(floorTypes.filter((t) => t !== 'PAPER_CHASM_GAP'));
      this.buildFloorInstance(type, dist + c * 3.5, lane);
    }
  }

  // 2. OVERHEAD OBSTACLES
  private spawnOverheadObstacle(dist: number): void {
    const types: ObstacleType[] = [
      'OVERHEAD_CRANE_BEAM',
      'SUSPENDED_STEEL_BEAM',
      'HANGING_DRAFTING_SIGN',
      'GIANT_PENCIL_SUSPENSION',
      'LOW_CEILING_ARCH',
      'FALLING_PLUMB_BOB',
      'HANGING_ERASER',
    ];
    const type = randomChoice(types);
    const lane = randomChoice([LANES.LEFT, LANES.CENTER, LANES.RIGHT]);
    this.buildOverheadInstance(type, dist, lane);
  }

  // 3. SIDE CLOSING OBSTACLES
  private spawnSideClosingObstacle(dist: number): void {
    const types: ObstacleType[] = [
      'SLIDING_ERASER_VICE',
      'ROAD_NARROWING_BRACKET',
      'EXPANDING_INK_SPLAT',
      'SIDE_ERASER_SWEEP',
    ];
    const type = randomChoice(types);
    this.buildSideClosingInstance(type, dist);
  }

  // 4. MOVING OBSTACLES
  private spawnMovingObstacle(dist: number): void {
    const types: ObstacleType[] = [
      'PENDULUM_RULER',
      'SLIDING_SHARPENER',
      'ROTATING_COMPASS_ARM',
      'BOUNCING_PAPER_BOULDER',
    ];
    const type = randomChoice(types);
    this.buildMovingInstance(type, dist);
  }

  // 5. VERTICAL OBSTACLES
  private spawnVerticalObstacle(dist: number): void {
    const types: ObstacleType[] = [
      'RISING_GRAPHITE_PILLARS',
      'DESCENDING_STAMP_BLOCK',
      'RISING_PAPER_FOLD',
    ];
    const type = randomChoice(types);
    const lane = randomChoice([LANES.LEFT, LANES.CENTER, LANES.RIGHT]);
    this.buildVerticalInstance(type, dist, lane);
  }

  // 6. RISK / REWARD SPLIT
  private spawnRiskSplitObstacle(dist: number): void {
    if (Math.random() > 0.5) {
      this.buildElevatedRampInstance(dist);
    } else {
      this.buildRiskSplitInstance(dist);
    }
  }

  /* ------------------- INSTANCE BUILDERS ------------------- */

  private buildFloorInstance(type: ObstacleType, distance: number, lane: number): void {
    const meshGroup = new THREE.Group();
    let width = 2.4;
    let height = 1.4;
    let depth = 1.8;
    let jumpable = true;
    let requiresJump = false;
    let motionType: ObstacleInstance['motionType'] = 'STATIC';
    let motionSpeed = 0;
    let motionAmplitude = 0;

    switch (type) {
      case 'PAPER_CHASM_GAP': {
        // A void tear across the whole road ribbon! Must jump!
        width = 11.5; height = 0.6; depth = 4.2;
        jumpable = true;
        requiresJump = true;
        
        // Deep void chasm
        const voidGeo = new THREE.PlaneGeometry(width, depth);
        voidGeo.rotateX(-Math.PI / 2);
        const voidMat = new THREE.MeshBasicMaterial({ color: 0x0f0e0d, side: THREE.DoubleSide });
        const voidMesh = new THREE.Mesh(voidGeo, voidMat);
        voidMesh.position.y = 0.04;
        meshGroup.add(voidMesh);

        // Jagged torn paper edges on approach and exit
        const frontLip = new THREE.Mesh(new THREE.BoxGeometry(width, 0.3, 0.45), this.paperCrumpleMat);
        frontLip.position.set(0, 0.15, -depth * 0.48);
        const backLip = new THREE.Mesh(new THREE.BoxGeometry(width, 0.3, 0.45), this.paperCrumpleMat);
        backLip.position.set(0, 0.15, depth * 0.48);
        meshGroup.add(frontLip, backLip);

        // Caution diagonal hatching boards across both lips
        const cautionFront = new THREE.Mesh(new THREE.BoxGeometry(width * 0.96, 0.08, 0.6), this.neonYellowMat);
        cautionFront.position.set(0, 0.06, -depth * 0.65);
        meshGroup.add(cautionFront);

        // Warning Hazard Pylons on both outer curbs
        for (const sign of [-1, 1]) {
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 8), this.woodRulerMat);
          pole.position.set(sign * (width * 0.46), 1.1, 0);
          const flag = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.4, 0.05), this.dangerOrangeMat);
          flag.position.set(sign * (width * 0.46 - 0.25), 1.9, 0);
          const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), this.dangerBeaconMat);
          beacon.position.set(sign * (width * 0.46), 2.25, 0);
          meshGroup.add(pole, flag, beacon);
        }
        break;
      }
      case 'ROLLING_PENCIL_SHAVING': {
        width = 2.2; height = 2.0; depth = 2.2;
        jumpable = true;
        motionType = 'SLIDE_X';
        motionAmplitude = 3.2;
        motionSpeed = 2.2;
        // Curled shaving ribbon model
        const torusGeo = new THREE.TorusGeometry(0.85, 0.25, 8, 16, Math.PI * 1.5);
        const mesh = new THREE.Mesh(torusGeo, this.woodRulerMat);
        mesh.rotation.x = Math.PI / 2;
        meshGroup.add(mesh, this.createOutlines(torusGeo));
        break;
      }
      case 'GRAPHITE_BOULDER': {
        width = 2.5; height = 1.8; depth = 2.2;
        jumpable = true;
        const geo = new THREE.DodecahedronGeometry(1.1, 0);
        const mesh = new THREE.Mesh(geo, this.graphiteMat);
        mesh.position.y = 0.9;
        meshGroup.add(mesh, this.createOutlines(geo));
        break;
      }
      case 'CRACKED_FISSURE': {
        // High-contrast, clearly visible paper crevasse in a specific lane!
        width = 3.8; height = 0.5; depth = 3.0;
        jumpable = true;
        requiresJump = true;

        // 1. Sunken deep dark graphite void crevasse
        const fissureGeo = new THREE.BoxGeometry(width, 0.35, depth);
        const fissureMesh = new THREE.Mesh(fissureGeo, this.inkGlossMat);
        fissureMesh.position.y = 0.02;
        meshGroup.add(fissureMesh);

        // 2. Bold jagged ripped paper borders around the fissure perimeter
        const lipMat = this.paperCrumpleMat;
        const leftLip = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, depth * 1.05), lipMat);
        leftLip.position.set(-width * 0.5, 0.12, 0);
        const rightLip = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, depth * 1.05), lipMat);
        rightLip.position.set(width * 0.5, 0.12, 0);
        const approachLip = new THREE.Mesh(new THREE.BoxGeometry(width, 0.25, 0.4), lipMat);
        approachLip.position.set(0, 0.12, -depth * 0.5);
        meshGroup.add(leftLip, rightLip, approachLip);

        // 3. High-visibility danger warning hatch strip on the road approach
        const cautionGeo = new THREE.PlaneGeometry(width * 1.1, 0.75);
        cautionGeo.rotateX(-Math.PI / 2);
        const cautionMesh = new THREE.Mesh(cautionGeo, this.neonYellowMat);
        cautionMesh.position.set(0, 0.06, -depth * 0.72);
        meshGroup.add(cautionMesh);

        // 4. Two bright upright drafting hazard flags on the left and right rim
        for (const sign of [-1, 1]) {
          const pinPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.6, 6), this.metalSteelMat);
          pinPole.position.set(sign * (width * 0.52), 0.8, -depth * 0.35);
          const flag = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.04), this.pushpinRedMat);
          flag.position.set(sign * (width * 0.52), 1.35, -depth * 0.35);
          meshGroup.add(pinPole, flag);
        }

        // 5. Pulsing hazard beacon
        const beaconGeo = new THREE.SphereGeometry(0.22, 8, 8);
        const beaconMesh = new THREE.Mesh(beaconGeo, this.dangerBeaconMat);
        beaconMesh.position.set(0, 1.8, 0);
        meshGroup.add(beaconMesh);
        break;
      }
      case 'PENCIL_SHARPENER': {
        width = 2.2; height = 1.3; depth = 2.4;
        const bodyGeo = new THREE.BoxGeometry(width, height, depth);
        const body = new THREE.Mesh(bodyGeo, this.metalSteelMat);
        body.position.y = height * 0.5;
        meshGroup.add(body, this.createOutlines(bodyGeo));
        break;
      }
      case 'ERASER_BLOCK': {
        width = 2.6; height = 1.5; depth = 2.0;
        const geo = new THREE.BoxGeometry(width, height, depth);
        const mesh = new THREE.Mesh(geo, this.pinkRubberMat);
        mesh.position.y = height * 0.5;
        meshGroup.add(mesh, this.createOutlines(geo));
        break;
      }
      case 'GRAPHITE_SPIKES': {
        width = 2.4; height = 1.2; depth = 2.4;
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            const coneGeo = new THREE.ConeGeometry(0.24, height, 6);
            const spike = new THREE.Mesh(coneGeo, this.graphiteMat);
            spike.position.set(i * 0.75, height * 0.5, j * 0.75);
            meshGroup.add(spike);
          }
        }
        break;
      }
      case 'WOODEN_RULER': {
        width = 3.2; height = 0.8; depth = 1.0;
        const geo = new THREE.BoxGeometry(width, height, depth);
        const mesh = new THREE.Mesh(geo, this.woodRulerMat);
        mesh.position.y = height * 0.5;
        meshGroup.add(mesh, this.createOutlines(geo));
        break;
      }
      case 'THUMBTACK_PIN': {
        width = 1.8; height = 1.6; depth = 1.8;
        const capGeo = new THREE.CylinderGeometry(0.7, 0.45, 0.8, 12);
        const cap = new THREE.Mesh(capGeo, this.pushpinRedMat);
        cap.position.y = 1.2;
        const pinGeo = new THREE.CylinderGeometry(0.06, 0.02, 1.0, 6);
        const pin = new THREE.Mesh(pinGeo, this.metalSteelMat);
        pin.position.y = 0.5;
        meshGroup.add(cap, pin);
        break;
      }
      case 'STAPLE_STRIP': {
        width = 3.6; height = 0.7; depth = 0.8;
        const geo = new THREE.BoxGeometry(width, height, depth);
        const mesh = new THREE.Mesh(geo, this.metalSteelMat);
        mesh.position.y = height * 0.5;
        meshGroup.add(mesh, this.createOutlines(geo));
        break;
      }
      case 'XACTO_KNIFE': {
        width = 3.0; height = 1.1; depth = 1.4;
        const bladeGeo = new THREE.ConeGeometry(0.6, 2.2, 4);
        bladeGeo.rotateZ(Math.PI / 3);
        const blade = new THREE.Mesh(bladeGeo, this.metalSteelMat);
        blade.position.y = 0.6;
        meshGroup.add(blade);
        break;
      }
      default: {
        width = 2.4; height = 1.4; depth = 1.8;
        const geo = new THREE.BoxGeometry(width, height, depth);
        const mesh = new THREE.Mesh(geo, this.pinkRubberMat);
        mesh.position.y = height * 0.5;
        meshGroup.add(mesh, this.createOutlines(geo));
        break;
      }
    }

    meshGroup.visible = false;
    this.group.add(meshGroup);

    this.obstacles.push({
      id: this.nextId++,
      type,
      category: 'FLOOR',
      distance,
      lateralOffset: lane,
      currentLateralOffset: lane,
      currentHeightOffset: height * 0.5,
      width,
      height,
      depth,
      jumpable,
      requiresJump,
      meshGroup,
      active: true,
      drawn: false,
      drawAnimProgress: 0,
      motionType,
      motionSpeed,
      motionAmplitude,
      motionPhase: Math.random() * Math.PI,
    });
  }

  private buildOverheadInstance(type: ObstacleType, distance: number, lane: number): void {
    const meshGroup = new THREE.Group();
    let width = 5.0;
    let height = 1.6;
    let depth = 2.0;
    let overheadClearanceBottom = 1.8; // Player can safely roll underneath!
    let motionType: ObstacleInstance['motionType'] = 'STATIC';
    let motionSpeed = 0;
    let motionAmplitude = 0;

    switch (type) {
      case 'OVERHEAD_CRANE_BEAM': {
        width = 7.5; height = 1.4; depth = 1.8;
        const beamGeo = new THREE.BoxGeometry(width, 0.8, 1.2);
        const beam = new THREE.Mesh(beamGeo, this.dangerOrangeMat);
        beam.position.y = 2.8;
        const legGeo = new THREE.BoxGeometry(0.6, 3.5, 0.6);
        const leg = new THREE.Mesh(legGeo, this.metalSteelMat);
        leg.position.set(-width * 0.45, 1.5, 0);
        meshGroup.add(beam, leg, this.createOutlines(beamGeo));
        break;
      }
      case 'SUSPENDED_STEEL_BEAM': {
        width = 8.0; height = 1.0; depth = 1.2;
        const beamGeo = new THREE.BoxGeometry(width, 0.9, 1.0);
        const beam = new THREE.Mesh(beamGeo, this.metalSteelMat);
        beam.position.y = 2.6;
        meshGroup.add(beam, this.createOutlines(beamGeo));
        break;
      }
      case 'HANGING_DRAFTING_SIGN': {
        width = 4.0; height = 1.8; depth = 0.4;
        const signGeo = new THREE.BoxGeometry(width, height, depth);
        const sign = new THREE.Mesh(signGeo, this.woodRulerMat);
        sign.position.y = 2.9;
        const c1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), this.metalSteelMat);
        c1.position.set(-1.2, 4.2, 0);
        const c2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), this.metalSteelMat);
        c2.position.set(1.2, 4.2, 0);
        meshGroup.add(sign, c1, c2, this.createOutlines(signGeo));
        break;
      }
      case 'LOW_CEILING_ARCH': {
        width = 8.2; height = 2.2; depth = 5.0;
        overheadClearanceBottom = 1.65; // Roll under safely, jump hits ceiling!
        const archGeo = new THREE.BoxGeometry(width, 0.8, depth);
        const archRoof = new THREE.Mesh(archGeo, this.kneadedPuttyMat);
        archRoof.position.y = 2.2;
        const legL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.4, depth), this.kneadedPuttyMat);
        legL.position.set(-3.7, 1.2, 0);
        const legR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.4, depth), this.kneadedPuttyMat);
        legR.position.set(3.7, 1.2, 0);
        meshGroup.add(archRoof, legL, legR, this.createOutlines(archGeo));
        break;
      }
      case 'GIANT_PENCIL_SUSPENSION': {
        width = 8.5; height = 1.2; depth = 1.2;
        const penGeo = new THREE.CylinderGeometry(0.55, 0.55, width, 6);
        penGeo.rotateZ(Math.PI / 2);
        const pen = new THREE.Mesh(penGeo, this.neonYellowMat);
        pen.position.y = 2.7;
        meshGroup.add(pen);
        break;
      }
      case 'FALLING_PLUMB_BOB': {
        width = 2.2; height = 3.0; depth = 2.2;
        overheadClearanceBottom = 1.5;
        motionType = 'DROP_ON_APPROACH';
        motionSpeed = 6.0;
        const weightGeo = new THREE.ConeGeometry(0.65, 1.6, 8);
        weightGeo.rotateX(Math.PI);
        const weight = new THREE.Mesh(weightGeo, this.brassMat);
        weight.position.y = 4.2;
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3.5, 4), this.metalSteelMat);
        cord.position.y = 5.8;
        meshGroup.add(weight, cord);
        break;
      }
      default: {
        width = 6.0; height = 1.2; depth = 1.5;
        const beamGeo = new THREE.BoxGeometry(width, height, depth);
        const beam = new THREE.Mesh(beamGeo, this.amberAcrylicMat);
        beam.position.y = 2.6;
        meshGroup.add(beam);
        break;
      }
    }

    meshGroup.visible = false;
    this.group.add(meshGroup);

    this.obstacles.push({
      id: this.nextId++,
      type,
      category: 'OVERHEAD',
      distance,
      lateralOffset: 0.0,
      currentLateralOffset: 0.0,
      currentHeightOffset: 0.0,
      width,
      height: 4.2,
      depth,
      jumpable: false, // JUMPING INTO THIS IS FATAL! Must roll underneath!
      overheadClearanceBottom,
      meshGroup,
      active: true,
      drawn: false,
      drawAnimProgress: 0,
      motionType,
      motionSpeed,
      motionAmplitude: 2.2,
      motionPhase: 0,
    });
  }

  private buildSideClosingInstance(type: ObstacleType, distance: number): void {
    const meshGroup = new THREE.Group();
    const width = 8.5;
    const height = 2.0;
    const depth = 2.4;

    if (type === 'SIDE_ERASER_SWEEP') {
      // Large eraser sweeping inward from right lane
      const blockGeo = new THREE.BoxGeometry(4.8, height, depth);
      const sweepMesh = new THREE.Mesh(blockGeo, this.pinkRubberMat);
      sweepMesh.position.set(2.8, height * 0.5, 0);
      meshGroup.add(sweepMesh, this.createOutlines(blockGeo));

      meshGroup.visible = false;
      this.group.add(meshGroup);

      this.obstacles.push({
        id: this.nextId++,
        type,
        category: 'SIDE_CLOSING',
        distance,
        lateralOffset: 1.5,
        currentLateralOffset: 1.5,
        currentHeightOffset: height * 0.5,
        width: 4.8,
        height,
        depth,
        jumpable: true,
        meshGroup,
        active: true,
        drawn: false,
        drawAnimProgress: 0,
        motionType: 'SLIDE_X',
        motionSpeed: 2.0,
        motionAmplitude: 1.8,
        motionPhase: 0,
      });
      return;
    }

    // Left and right vice blocks
    const blockGeo = new THREE.BoxGeometry(3.6, height, depth);
    const leftBlock = new THREE.Mesh(blockGeo, this.pinkRubberMat);
    leftBlock.position.set(-3.6, height * 0.5, 0);
    const rightBlock = new THREE.Mesh(blockGeo, this.blueEraserMat);
    rightBlock.position.set(3.6, height * 0.5, 0);

    meshGroup.add(leftBlock, rightBlock);
    meshGroup.add(this.createOutlines(blockGeo));

    meshGroup.visible = false;
    this.group.add(meshGroup);

    this.obstacles.push({
      id: this.nextId++,
      type,
      category: 'SIDE_CLOSING',
      distance,
      lateralOffset: 0.0,
      currentLateralOffset: 0.0,
      currentHeightOffset: height * 0.5,
      width,
      height,
      depth,
      jumpable: true,
      meshGroup,
      active: true,
      drawn: false,
      drawAnimProgress: 0,
      motionType: 'VICE_CLOSE',
      motionSpeed: 2.2,
      motionAmplitude: 1.6, // Leaves a 2.2m safe center channel
      motionPhase: Math.random() * Math.PI,
      viceLeftPart: leftBlock,
      viceRightPart: rightBlock,
    });
  }

  private buildMovingInstance(type: ObstacleType, distance: number): void {
    const meshGroup = new THREE.Group();
    let width = 2.6;
    let height = 1.6;
    const depth = 2.0;
    let motionType: ObstacleInstance['motionType'] = 'SLIDE_X';
    let motionAmplitude = 3.2;
    let motionSpeed = 2.4;

    switch (type) {
      case 'PENDULUM_RULER': {
        width = 1.6; height = 4.2;
        motionType = 'PENDULUM';
        motionAmplitude = 3.6;
        motionSpeed = 2.8;
        const armGeo = new THREE.BoxGeometry(0.8, 3.6, 0.4);
        const arm = new THREE.Mesh(armGeo, this.woodRulerMat);
        arm.position.y = 1.8;
        const pivot = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), this.brassMat);
        pivot.position.y = 3.8;
        meshGroup.add(arm, pivot, this.createOutlines(armGeo));
        break;
      }
      case 'SLIDING_SHARPENER': {
        width = 2.2; height = 1.4;
        motionType = 'SLIDE_X';
        motionAmplitude = 3.4;
        motionSpeed = 2.0;
        const bodyGeo = new THREE.BoxGeometry(width, height, depth);
        const body = new THREE.Mesh(bodyGeo, this.metalSteelMat);
        meshGroup.add(body, this.createOutlines(bodyGeo));
        break;
      }
      case 'ROTATING_COMPASS_ARM': {
        width = 3.0; height = 1.2;
        motionType = 'ROTATE_Z';
        motionSpeed = 2.2;
        const legGeo = new THREE.CylinderGeometry(0.12, 0.05, 3.2, 8);
        const leg = new THREE.Mesh(legGeo, this.brassMat);
        meshGroup.add(leg);
        break;
      }
      case 'BOUNCING_PAPER_BOULDER': {
        width = 2.2; height = 2.0;
        motionType = 'BOUNCE_Y';
        motionAmplitude = 2.6;
        motionSpeed = 3.2;
        const geo = new THREE.IcosahedronGeometry(1.0, 1);
        meshGroup.add(new THREE.Mesh(geo, this.paperCrumpleMat));
        break;
      }
      default: {
        const geo = new THREE.IcosahedronGeometry(1.2, 1);
        meshGroup.add(new THREE.Mesh(geo, this.paperCrumpleMat));
        break;
      }
    }

    meshGroup.visible = false;
    this.group.add(meshGroup);

    this.obstacles.push({
      id: this.nextId++,
      type,
      category: 'MOVING',
      distance,
      lateralOffset: 0.0,
      currentLateralOffset: 0.0,
      currentHeightOffset: height * 0.5,
      width,
      height,
      depth,
      jumpable: true,
      meshGroup,
      active: true,
      drawn: false,
      drawAnimProgress: 0,
      motionType,
      motionSpeed,
      motionAmplitude,
      motionPhase: Math.random() * Math.PI * 2,
    });
  }

  private buildVerticalInstance(type: ObstacleType, distance: number, lane: number): void {
    const meshGroup = new THREE.Group();
    const width = 2.4;
    const height = 2.4;
    const depth = 2.4;

    if (type === 'RISING_PAPER_FOLD') {
      const coneGeo = new THREE.ConeGeometry(1.2, height, 4);
      const mesh = new THREE.Mesh(coneGeo, this.paperCrumpleMat);
      meshGroup.add(mesh, this.createOutlines(coneGeo));
    } else {
      for (let c = 0; c < 3; c++) {
        const geo = new THREE.CylinderGeometry(0.45, 0.45, height, 6);
        const pillar = new THREE.Mesh(geo, this.graphiteMat);
        pillar.position.set((c - 1) * 0.7, 0, 0);
        meshGroup.add(pillar);
      }
    }

    meshGroup.visible = false;
    this.group.add(meshGroup);

    this.obstacles.push({
      id: this.nextId++,
      type,
      category: 'VERTICAL',
      distance,
      lateralOffset: lane,
      currentLateralOffset: lane,
      currentHeightOffset: height * 0.5,
      width,
      height,
      depth,
      jumpable: true,
      meshGroup,
      active: true,
      drawn: false,
      drawAnimProgress: 0,
      motionType: 'RISE_Y',
      motionSpeed: 2.5,
      motionAmplitude: height,
      motionPhase: Math.random() * Math.PI,
    });
  }

  private buildRiskSplitInstance(distance: number): void {
    const meshGroup = new THREE.Group();
    const dividerGeo = new THREE.BoxGeometry(1.2, 1.8, 6.0);
    const divider = new THREE.Mesh(dividerGeo, this.metalSteelMat);
    meshGroup.add(divider, this.createOutlines(dividerGeo));

    const signGeo = new THREE.BoxGeometry(2.4, 1.0, 0.2);
    const sign = new THREE.Mesh(signGeo, this.amberAcrylicMat);
    sign.position.set(0, 2.2, -2.0);
    meshGroup.add(sign);

    meshGroup.visible = false;
    this.group.add(meshGroup);

    this.obstacles.push({
      id: this.nextId++,
      type: 'RISK_REWARD_DIVIDE',
      category: 'RISK_SPLIT',
      distance,
      lateralOffset: 0.0,
      currentLateralOffset: 0.0,
      currentHeightOffset: 1.0,
      width: 1.4,
      height: 2.2,
      depth: 6.0,
      jumpable: false,
      meshGroup,
      active: true,
      drawn: false,
      drawAnimProgress: 0,
      motionType: 'STATIC',
      motionSpeed: 0,
      motionAmplitude: 0,
      motionPhase: 0,
    });
  }

  private buildElevatedRampInstance(distance: number): void {
    const meshGroup = new THREE.Group();
    const rampGeo = new THREE.BoxGeometry(3.2, 0.6, 4.0);
    rampGeo.rotateX(-0.15); // gentle incline ramp
    const ramp = new THREE.Mesh(rampGeo, this.woodRulerMat);
    ramp.position.y = 0.4;
    meshGroup.add(ramp, this.createOutlines(rampGeo));

    meshGroup.visible = false;
    this.group.add(meshGroup);

    this.obstacles.push({
      id: this.nextId++,
      type: 'ELEVATED_RAMP_JUMP',
      category: 'RISK_SPLIT',
      distance,
      lateralOffset: 0.0,
      currentLateralOffset: 0.0,
      currentHeightOffset: 0.3,
      width: 3.2,
      height: 0.8,
      depth: 4.0,
      jumpable: true,
      meshGroup,
      active: true,
      drawn: false,
      drawAnimProgress: 0,
      motionType: 'STATIC',
      motionSpeed: 0,
      motionAmplitude: 0,
      motionPhase: 0,
    });
  }

  private createOutlines(geo: THREE.BufferGeometry): THREE.LineSegments {
    const edges = new THREE.EdgesGeometry(geo);
    return new THREE.LineSegments(edges, this.lineDarkMat);
  }
}

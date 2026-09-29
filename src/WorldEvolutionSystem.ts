import * as THREE from 'three';
import { FlowPath } from './FlowPath';
import { SaveSystem } from './SaveSystem';
import { DISCOVERY_REGISTRY } from './DiscoverySystem';

export type StageId =
  | 'SKETCHBOOK'
  | 'CITY'
  | 'ROOFTOPS'
  | 'MOUNTAINS'
  | 'INK_WORLD'
  | 'BLUEPRINT';

export interface StageInfo {
  id: StageId;
  name: string;
  chapter: string;
  subtitle: string;
  startDist: number;
  endDist: number;
  fogColor: number;
  paperColor: number;
  roadColor: number;
  lineColor: number;
  fogNear: number;
  fogFar: number;
  windIntensity: number;
  inkHazard: boolean;
  eraserHazard: boolean;
  discoveryId: string;
}

export const STAGES: StageInfo[] = [
  {
    id: 'SKETCHBOOK',
    name: 'THE SKETCHBOOK',
    chapter: 'CHAPTER I',
    subtitle: 'Warm Vellum, Graphite Strokes & Gentle Curvature',
    startDist: 0,
    endDist: 500,
    fogColor: 0xf5f0e6,
    paperColor: 0xf2ece1,
    roadColor: 0xfcfaf4,
    lineColor: 0x1f1d1b,
    fogNear: 70,
    fogFar: 320,
    windIntensity: 0.0,
    inkHazard: false,
    eraserHazard: false,
    discoveryId: 'world_sketchbook',
  },
  {
    id: 'CITY',
    name: 'THE HAND-DRAWN CITY',
    chapter: 'CHAPTER II',
    subtitle: 'Cross-Hatched Facades, Avenues & Drafting Scaffolds',
    startDist: 500,
    endDist: 1500,
    fogColor: 0xeae5dc,
    paperColor: 0xe4ded2,
    roadColor: 0xf5f2eb,
    lineColor: 0x221f1c,
    fogNear: 60,
    fogFar: 280,
    windIntensity: 0.0,
    inkHazard: false,
    eraserHazard: false,
    discoveryId: 'world_city',
  },
  {
    id: 'ROOFTOPS',
    name: 'THE ROOFTOPS',
    chapter: 'CHAPTER III',
    subtitle: 'High Skybridges, Crane Jibs & Crosswind Chasms',
    startDist: 1500,
    endDist: 3000,
    fogColor: 0xe0ddd3,
    paperColor: 0xdcd6cb,
    roadColor: 0xf0ece2,
    lineColor: 0x1a1816,
    fogNear: 55,
    fogFar: 260,
    windIntensity: 4.8, // Active crosswinds!
    inkHazard: false,
    eraserHazard: false,
    discoveryId: 'world_rooftops',
  },
  {
    id: 'MOUNTAINS',
    name: 'ALPINE PEAKS & CANYONS',
    chapter: 'CHAPTER IV',
    subtitle: 'Roller-Coaster Chasms, Hatched Cliffs & Rocky Gaps',
    startDist: 3000,
    endDist: 5000,
    fogColor: 0xd6dedf,
    paperColor: 0xcfd9dc,
    roadColor: 0xedf3f5,
    lineColor: 0x1e272e,
    fogNear: 50,
    fogFar: 270,
    windIntensity: 6.8, // Powerful mountain gales!
    inkHazard: false,
    eraserHazard: true,
    discoveryId: 'world_mountains',
  },
  {
    id: 'INK_WORLD',
    name: 'THE SURREAL INK WORLD',
    chapter: 'CHAPTER V',
    subtitle: 'Floating Origami Planes, Ink Rivers & Impossible Curves',
    startDist: 5000,
    endDist: 7500,
    fogColor: 0x1c1a18,
    paperColor: 0x141210,
    roadColor: 0x2a2622,
    lineColor: 0xf4eee6,
    fogNear: 38,
    fogFar: 220,
    windIntensity: 2.2,
    inkHazard: true,
    eraserHazard: true,
    discoveryId: 'world_ink',
  },
  {
    id: 'BLUEPRINT',
    name: 'THE BLUEPRINT MATRIX',
    chapter: 'CHAPTER VI',
    subtitle: 'Cybernetic Technical Grid & Architectural Precision',
    startDist: 7500,
    endDist: 999999,
    fogColor: 0x052a4a,
    paperColor: 0x031d33,
    roadColor: 0x074e82,
    lineColor: 0x00f0ff,
    fogNear: 45,
    fogFar: 250,
    windIntensity: 3.2,
    inkHazard: true,
    eraserHazard: false,
    discoveryId: 'world_blueprint',
  },
];

export interface SetPieceEvent {
  id: string;
  name: string;
  desc: string;
  triggerDist: number;
  duration: number;
  discoveryId: string;
}

export const SET_PIECE_EVENTS: SetPieceEvent[] = [
  {
    id: 'GIANT_ERASER_SWEEP',
    name: 'GIANT ERASER SWEEP',
    desc: 'A colossal draftsman eraser sweeps the sky, revealing the emerging city!',
    triggerDist: 480,
    duration: 12.0,
    discoveryId: 'event_giant_eraser',
  },
  {
    id: 'ROOFTOP_ASCENT',
    name: 'THE ROOFTOP SKYBRIDGE ASCENT',
    desc: 'The road climbs steeply onto towering skyscraper roofs!',
    triggerDist: 1475,
    duration: 12.0,
    discoveryId: 'event_skybridge',
  },
  {
    id: 'CANYON_PLUNGE',
    name: 'THE GREAT CANYON PLUNGE',
    desc: 'A giant ruler falls as the urban floor collapses into mountain chasms!',
    triggerDist: 2970,
    duration: 14.0,
    discoveryId: 'event_canyon_plunge',
  },
  {
    id: 'INK_SINGULARITY',
    name: 'THE INK SINGULARITY SURGE',
    desc: 'A giant inkwell floods reality into floating surreal geometry!',
    triggerDist: 4970,
    duration: 16.0,
    discoveryId: 'event_ink_singularity',
  },
];

export class WorldEvolutionSystem {
  public group: THREE.Group;
  private flowPath: FlowPath;
  private saveSystem: SaveSystem;

  private currentStageIndex = 0;
  private transitionProgress = 0;
  private activeWindForce = 0;
  private windTimer = 0;

  // Active Set-Piece Event
  private activeEvent: SetPieceEvent | null = null;
  private eventProgress = 0;
  private triggeredEvents: Set<string> = new Set();

  // 3D Set-Piece Visual Meshes
  private setPieceGroup: THREE.Group;
  private giantEraserMesh: THREE.Mesh;
  private giantRulerMesh: THREE.Mesh;
  private giantInkVortexMesh: THREE.Mesh;

  // Callbacks
  public onStageChanged?: (stage: StageInfo, isNewDiscovery: boolean) => void;
  public onSetPieceTriggered?: (event: SetPieceEvent, isNewDiscovery: boolean) => void;
  public onDiscoveryUnlocked?: (discoveryId: string, name: string, desc: string, xp: number) => void;

  constructor(flowPath: FlowPath, saveSystem: SaveSystem) {
    this.flowPath = flowPath;
    this.saveSystem = saveSystem;
    this.group = new THREE.Group();

    this.setPieceGroup = new THREE.Group();
    this.group.add(this.setPieceGroup);

    // 1. Giant Eraser Mesh for Set-Piece 1
    const eraserGeo = new THREE.BoxGeometry(60, 22, 14);
    const eraserMat = new THREE.MeshStandardMaterial({
      color: 0xe07272,
      roughness: 0.6,
      metalness: 0.05,
    });
    this.giantEraserMesh = new THREE.Mesh(eraserGeo, eraserMat);
    this.giantEraserMesh.visible = false;
    this.setPieceGroup.add(this.giantEraserMesh);

    // 2. Giant Ruler Mesh for Set-Piece 3
    const rulerGeo = new THREE.BoxGeometry(12, 140, 2.5);
    const rulerMat = new THREE.MeshStandardMaterial({
      color: 0xd4a373,
      roughness: 0.7,
      metalness: 0.0,
    });
    this.giantRulerMesh = new THREE.Mesh(rulerGeo, rulerMat);
    this.giantRulerMesh.visible = false;
    this.setPieceGroup.add(this.giantRulerMesh);

    // 3. Giant Ink Vortex for Set-Piece 4
    const vortexGeo = new THREE.TorusGeometry(45, 12, 12, 32);
    const vortexMat = new THREE.MeshStandardMaterial({
      color: 0x080706,
      roughness: 0.2,
      metalness: 0.5,
    });
    this.giantInkVortexMesh = new THREE.Mesh(vortexGeo, vortexMat);
    this.giantInkVortexMesh.visible = false;
    this.setPieceGroup.add(this.giantInkVortexMesh);
  }

  public reset(): void {
    this.currentStageIndex = 0;
    this.transitionProgress = 0;
    this.activeWindForce = 0;
    this.windTimer = 0;
    this.activeEvent = null;
    this.eventProgress = 0;
    this.triggeredEvents.clear();

    this.giantEraserMesh.visible = false;
    this.giantRulerMesh.visible = false;
    this.giantInkVortexMesh.visible = false;
  }

  public getCurrentStage(): StageInfo {
    return STAGES[this.currentStageIndex];
  }

  public getNextStage(): StageInfo | null {
    if (this.currentStageIndex < STAGES.length - 1) {
      return STAGES[this.currentStageIndex + 1];
    }
    return null;
  }

  public getTransitionProgress(): number {
    return this.transitionProgress;
  }

  public getActiveWindForce(): number {
    return this.activeWindForce;
  }

  public update(playerDist: number, dt: number): void {
    this.windTimer += dt;

    // 1. Determine active stage based on distance
    let stageIdx = 0;
    for (let i = 0; i < STAGES.length; i++) {
      if (playerDist >= STAGES[i].startDist) {
        stageIdx = i;
      }
    }

    if (stageIdx !== this.currentStageIndex) {
      this.currentStageIndex = stageIdx;
      const stage = STAGES[stageIdx];
      const isNew = this.saveSystem.recordDiscovery(
        stage.discoveryId,
        DISCOVERY_REGISTRY[stage.discoveryId]?.xpReward || 100,
        DISCOVERY_REGISTRY[stage.discoveryId]?.leadsReward || 2
      );

      this.onStageChanged?.(stage, isNew);
      if (isNew) {
        const item = DISCOVERY_REGISTRY[stage.discoveryId];
        this.onDiscoveryUnlocked?.(stage.discoveryId, item.name, item.desc, item.xpReward);
      }
    }

    // 2. Smooth transition progress towards the next stage (within 90 meters of border)
    const current = STAGES[this.currentStageIndex];
    const distToNext = current.endDist - playerDist;
    if (distToNext < 90 && this.currentStageIndex < STAGES.length - 1) {
      this.transitionProgress = THREE.MathUtils.clamp(1.0 - distToNext / 90, 0, 1);
    } else {
      this.transitionProgress = 0;
    }

    // 3. Environmental Hazards: Wind Dynamics
    if (current.windIntensity > 0) {
      // Sinusoidal wind gust with natural turbulent shifts
      const gust = Math.sin(this.windTimer * 0.75) * 0.7 + Math.sin(this.windTimer * 1.8) * 0.3;
      this.activeWindForce = gust * current.windIntensity;

      // Register crosswind discovery if active
      if (Math.abs(this.activeWindForce) > 3.0) {
        const isNew = this.saveSystem.recordDiscovery('env_crosswind', 120, 2);
        if (isNew) {
          const item = DISCOVERY_REGISTRY['env_crosswind'];
          this.onDiscoveryUnlocked?.(item.id, item.name, item.desc, item.xpReward);
        }
      }
    } else {
      this.activeWindForce = 0;
    }

    // Register ink discovery if in ink world
    if (current.inkHazard && playerDist > 5050) {
      const isNew = this.saveSystem.recordDiscovery('env_ink_slick', 150, 3);
      if (isNew) {
        const item = DISCOVERY_REGISTRY['env_ink_slick'];
        this.onDiscoveryUnlocked?.(item.id, item.name, item.desc, item.xpReward);
      }
    }

    // 4. Check & Animate Giant Set-Piece Events
    this.checkSetPieces(playerDist, dt);
  }

  private checkSetPieces(playerDist: number, dt: number): void {
    // Check triggers
    for (const evt of SET_PIECE_EVENTS) {
      if (!this.triggeredEvents.has(evt.id) && playerDist >= evt.triggerDist && playerDist < evt.triggerDist + 60) {
        this.triggeredEvents.add(evt.id);
        this.activeEvent = evt;
        this.eventProgress = 0;

        const isNew = this.saveSystem.recordDiscovery(
          evt.discoveryId,
          DISCOVERY_REGISTRY[evt.discoveryId]?.xpReward || 300,
          DISCOVERY_REGISTRY[evt.discoveryId]?.leadsReward || 5
        );

        this.onSetPieceTriggered?.(evt, isNew);
        if (isNew) {
          const item = DISCOVERY_REGISTRY[evt.discoveryId];
          this.onDiscoveryUnlocked?.(item.id, item.name, item.desc, item.xpReward);
        }
      }
    }

    // Animate active set-piece event
    if (this.activeEvent) {
      this.eventProgress += dt / this.activeEvent.duration;
      const t = this.eventProgress;

      const playerSample = this.flowPath.getSampleAtDistance(playerDist);
      const aheadSample = this.flowPath.getSampleAtDistance(playerDist + 55);

      if (this.activeEvent.id === 'GIANT_ERASER_SWEEP' && aheadSample) {
        this.giantEraserMesh.visible = t < 1.0;
        // Sweeps across the horizon from left to right rubbing away pencil haze
        const sweepX = THREE.MathUtils.lerp(-90, 90, t);
        const sweepY = Math.sin(t * Math.PI) * 12 + 18;
        this.giantEraserMesh.position.copy(aheadSample.position)
          .addScaledVector(aheadSample.right, sweepX)
          .add(new THREE.Vector3(0, sweepY, 0));
        this.giantEraserMesh.rotation.set(0.2, t * 1.5, Math.sin(t * Math.PI * 4) * 0.15);
      } else if (this.activeEvent.id === 'CANYON_PLUNGE' && aheadSample) {
        this.giantRulerMesh.visible = t < 1.0;
        // Massive ruler falling through the scene like a skyscraper collapse
        const fallY = THREE.MathUtils.lerp(120, -30, t);
        this.giantRulerMesh.position.copy(aheadSample.position)
          .addScaledVector(aheadSample.right, 35)
          .add(new THREE.Vector3(0, fallY, 0));
        this.giantRulerMesh.rotation.set(0.1, 0.4, t * 2.5);
      } else if (this.activeEvent.id === 'INK_SINGULARITY' && aheadSample) {
        this.giantInkVortexMesh.visible = t < 1.0;
        // Swirling dark vortex ahead
        this.giantInkVortexMesh.position.copy(aheadSample.position).add(new THREE.Vector3(0, 30, 0));
        this.giantInkVortexMesh.rotation.z += dt * 1.8;
        const s = Math.sin(t * Math.PI) * 1.2 + 0.2;
        this.giantInkVortexMesh.scale.set(s, s, s);
      }

      if (t >= 1.0) {
        this.activeEvent = null;
        this.giantEraserMesh.visible = false;
        this.giantRulerMesh.visible = false;
        this.giantInkVortexMesh.visible = false;
      }
    }
  }

  /**
   * Returns current interpolated world colors for scene, fog, and road
   */
  public getBlendedVisuals(): {
    fogColor: THREE.Color;
    paperColor: THREE.Color;
    roadColor: THREE.Color;
    lineColor: THREE.Color;
    fogNear: number;
    fogFar: number;
  } {
    const cur = STAGES[this.currentStageIndex];
    const nxt = this.getNextStage();

    if (!nxt || this.transitionProgress <= 0) {
      return {
        fogColor: new THREE.Color(cur.fogColor),
        paperColor: new THREE.Color(cur.paperColor),
        roadColor: new THREE.Color(cur.roadColor),
        lineColor: new THREE.Color(cur.lineColor),
        fogNear: cur.fogNear,
        fogFar: cur.fogFar,
      };
    }

    const t = this.transitionProgress;
    return {
      fogColor: new THREE.Color(cur.fogColor).lerp(new THREE.Color(nxt.fogColor), t),
      paperColor: new THREE.Color(cur.paperColor).lerp(new THREE.Color(nxt.paperColor), t),
      roadColor: new THREE.Color(cur.roadColor).lerp(new THREE.Color(nxt.roadColor), t),
      lineColor: new THREE.Color(cur.lineColor).lerp(new THREE.Color(nxt.lineColor), t),
      fogNear: THREE.MathUtils.lerp(cur.fogNear, nxt.fogNear, t),
      fogFar: THREE.MathUtils.lerp(cur.fogFar, nxt.fogFar, t),
    };
  }
}

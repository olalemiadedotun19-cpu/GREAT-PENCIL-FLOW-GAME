import * as THREE from 'three';
import { CONFIG } from './config';
import { FlowPath } from './FlowPath';
import { PathSample, randomRange, randomChoice } from './utils';
import { PencilStyleDefinition, PENCIL_STYLES } from './PencilStyleSystem';
import { DrawingQueue } from './DrawingQueue';

export type DistrictType =
  | 'CIVIC'
  | 'DOWNTOWN'
  | 'ROOFTOPS'
  | 'INDUSTRIAL'
  | 'ALPINE'
  | 'MODERN_BLUEPRINT';

interface CityBuilding {
  distance: number;
  group: THREE.Group;
}

interface ViaductPier {
  distance: number;
  group: THREE.Group;
}

interface StreetDetail {
  distance: number;
  group: THREE.Group;
}

interface CityLandmark {
  distance: number;
  type: string;
  group: THREE.Group;
}

export class CitySystem {
  public group: THREE.Group;
  private flowPath: FlowPath;

  // Active instances
  private buildings: CityBuilding[] = [];
  private viaductPiers: ViaductPier[] = [];
  private streetDetails: StreetDetail[] = [];
  private landmarks: CityLandmark[] = [];

  // Spawning trackers
  private lastCityDist = -40;
  private lastPierDist = -20;
  private lastStreetDist = -20;
  private spawnInterval = 22;
  private pierInterval = 28;
  private streetInterval = 18;
  private currentGroundY = -35.0;

  // Track spawned landmark distances so we never double spawn
  private spawnedLandmarks = new Set<string>();

  // Architectural Pencil Sketch Materials
  private facadeMat: THREE.MeshStandardMaterial;
  private crossHatchMat: THREE.MeshStandardMaterial;
  private farHatchMat: THREE.MeshStandardMaterial;
  private foundationMat: THREE.MeshStandardMaterial;
  private pierMat: THREE.MeshStandardMaterial;
  private goldAccentMat: THREE.MeshStandardMaterial;
  private treeTrunkMat: THREE.MeshStandardMaterial;
  private treeFoliageMat: THREE.MeshStandardMaterial;

  // Hierarchical Line Materials (Foreground bold, Mid standard, Far atmospheric)
  private heavyLineMat: THREE.LineBasicMaterial;
  private graphiteLineMat: THREE.LineBasicMaterial;
  private faintLineMat: THREE.LineBasicMaterial;
  private smokeLineMat: THREE.LineBasicMaterial;

  private hatchTexture: THREE.CanvasTexture;
  private groundMesh: THREE.Mesh;
  private terrainWireGroup: THREE.Group;
  private currentStyle: PencilStyleDefinition = PENCIL_STYLES['classic_hb'];
  private drawingQueue: DrawingQueue | null = null;

  constructor(flowPath: FlowPath, drawingQueue?: DrawingQueue) {
    this.flowPath = flowPath;
    if (drawingQueue) this.drawingQueue = drawingQueue;
    this.group = new THREE.Group();

    // 1. Procedural graphite cross-hatch canvas texture for authentic pencil shading
    this.hatchTexture = this.createHatchTexture();

    // Warm ivory paper facade
    this.facadeMat = new THREE.MeshStandardMaterial({
      color: 0xfbf8f1,
      roughness: 0.95,
      metalness: 0.0,
    });

    // Dark graphite cross-hatch material for shadow sides & roofs
    this.crossHatchMat = new THREE.MeshStandardMaterial({
      color: 0x3d3731,
      roughness: 0.85,
      metalness: 0.05,
      map: this.hatchTexture,
    });

    // Deep stone foundation plinth material
    this.foundationMat = new THREE.MeshStandardMaterial({
      color: 0x2e2925,
      roughness: 0.9,
      metalness: 0.05,
      map: this.hatchTexture,
    });

    // Distant softer sketch material
    this.farHatchMat = new THREE.MeshStandardMaterial({
      color: 0x6e655b,
      roughness: 0.9,
      metalness: 0.0,
      map: this.hatchTexture,
    });

    // Viaduct pier material (architectural graphite drafting structure)
    this.pierMat = new THREE.MeshStandardMaterial({
      color: 0x423c35,
      roughness: 0.85,
      metalness: 0.1,
      map: this.hatchTexture,
    });

    // Foliage & vegetation materials
    this.treeTrunkMat = new THREE.MeshStandardMaterial({
      color: 0x3a322c,
      roughness: 0.95,
      metalness: 0.0,
      map: this.hatchTexture,
    });

    this.treeFoliageMat = new THREE.MeshStandardMaterial({
      color: 0xe8e2d5,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: true,
    });

    // Metallic gold & brass accents (clocks, pinnacles, lanterns)
    this.goldAccentMat = new THREE.MeshStandardMaterial({
      color: 0xd4a034,
      roughness: 0.35,
      metalness: 0.7,
    });

    // Line hierarchy
    this.heavyLineMat = new THREE.LineBasicMaterial({
      color: 0x12100e, // bold dark foreground ink
      linewidth: 2.5,
    });

    this.graphiteLineMat = new THREE.LineBasicMaterial({
      color: CONFIG.visual.graphiteDark || 0x221f1d,
      linewidth: 1.5,
    });

    this.faintLineMat = new THREE.LineBasicMaterial({
      color: 0x8c8274,
      linewidth: 1,
      transparent: true,
      opacity: 0.5,
    });

    this.smokeLineMat = new THREE.LineBasicMaterial({
      color: 0x7a7164,
      linewidth: 1.2,
      transparent: true,
      opacity: 0.55,
    });

    // Universal continuous architectural drafting desk ground plane (Adaptive Elevation)
    const groundGeo = new THREE.PlaneGeometry(3600, 3600, 36, 36);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xf2ece1,
      roughness: 0.96,
      metalness: 0.0,
    });
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.position.set(0, -35.0, 0);
    this.groundMesh.receiveShadow = true;
    this.group.add(this.groundMesh);

    // Decorative topographic contour lines across drafting floor
    this.terrainWireGroup = new THREE.Group();
    this.group.add(this.terrainWireGroup);

    // Initialize immediate starting environment!
    this.reset();
  }

  public setDrawingQueue(queue: DrawingQueue): void {
    this.drawingQueue = queue;
  }

  public getDistrictAt(dist: number): DistrictType {
    if (dist < 650) return 'CIVIC';
    if (dist < 1600) return 'DOWNTOWN';
    if (dist < 2900) return 'ROOFTOPS';
    if (dist < 4200) return 'INDUSTRIAL';
    if (dist < 5500) return 'ALPINE';
    return 'MODERN_BLUEPRINT';
  }

  public applyPencilStyle(style: PencilStyleDefinition): void {
    if (!style) return;
    this.currentStyle = style;
    this.facadeMat.color.setHex(style.buildingFacadeColor);
    this.crossHatchMat.color.setHex(style.buildingRoofColor);
    this.foundationMat.color.setHex(style.foundationColor);
    this.pierMat.color.setHex(style.foundationColor);

    this.heavyLineMat.color.setHex(style.outlineColor);
    this.graphiteLineMat.color.setHex(style.outlineColor);
    this.faintLineMat.color.setHex(style.faintLineColor);

    this.treeFoliageMat.color.setHex(style.foliageColor);
    this.treeTrunkMat.color.setHex(style.trunkColor);
    this.goldAccentMat.color.setHex(style.streetAccentColor);

    // Procedural dynamic cross-hatch texture regeneration
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = style.hatchPrimaryColor;
      ctx.lineWidth = 1.2;
      for (let i = -128; i < 256; i += style.hatchSpacing) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 128, 128);
        ctx.stroke();
      }
      ctx.strokeStyle = style.hatchSecondaryColor;
      ctx.lineWidth = 0.9;
      for (let i = -128; i < 256; i += style.hatchSpacing * 1.6) {
        ctx.beginPath();
        ctx.moveTo(i, 128);
        ctx.lineTo(i + 128, 0);
        ctx.stroke();
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(2, 2);
      if (this.hatchTexture) this.hatchTexture.dispose();
      this.hatchTexture = texture;
      this.crossHatchMat.map = texture;
      this.crossHatchMat.needsUpdate = true;
      this.foundationMat.map = texture;
      this.foundationMat.needsUpdate = true;
    }

    if (this.groundMesh) {
      (this.groundMesh.material as THREE.MeshStandardMaterial).color.setHex(style.paperColor);
    }
  }

  public applyDynamicStageVisuals(visuals: { paperColor: THREE.Color; lineColor: THREE.Color }): void {
    if (this.currentStyle && this.currentStyle.id !== 'classic_hb') {
      return;
    }
    if (this.groundMesh) {
      (this.groundMesh.material as THREE.MeshStandardMaterial).color.copy(visuals.paperColor);
    }
  }

  public setWorldTheme(worldId: string): void {
    const groundMat = this.groundMesh.material as THREE.MeshStandardMaterial;

    switch (worldId) {
      case 'sketch_city':
        this.facadeMat.color.setHex(0xf8f9fa);
        this.crossHatchMat.color.setHex(0x343a40);
        this.foundationMat.color.setHex(0x212529);
        this.graphiteLineMat.color.setHex(0x212529);
        groundMat.color.setHex(0xe9ecef);
        break;
      case 'mountain_sketch':
        this.facadeMat.color.setHex(0xe2e8f0);
        this.crossHatchMat.color.setHex(0x334155);
        this.foundationMat.color.setHex(0x1e293b);
        this.graphiteLineMat.color.setHex(0x1e293b);
        groundMat.color.setHex(0xcbd5e1);
        break;
      case 'blueprint_grid':
        this.facadeMat.color.setHex(0x075985);
        this.crossHatchMat.color.setHex(0x0369a1);
        this.foundationMat.color.setHex(0x0c4a6e);
        this.graphiteLineMat.color.setHex(0x38bdf8);
        groundMat.color.setHex(0x082f49);
        break;
      default:
        this.facadeMat.color.setHex(0xfbf8f1);
        this.crossHatchMat.color.setHex(0x3d3731);
        this.foundationMat.color.setHex(0x2e2925);
        this.graphiteLineMat.color.setHex(CONFIG.visual.graphiteDark || 0x221f1d);
        groundMat.color.setHex(0xf2ece1);
        break;
    }
  }

  private createHatchTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 128, 128);

      ctx.strokeStyle = '#221f1d';
      ctx.lineWidth = 1.2;

      // Primary diagonal pencil hatch
      for (let i = -128; i < 256; i += 7) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 128, 128);
        ctx.stroke();
      }

      // Secondary cross-hatch for tone density
      ctx.strokeStyle = '#3e3832';
      ctx.lineWidth = 0.9;
      for (let i = -128; i < 256; i += 12) {
        ctx.beginPath();
        ctx.moveTo(i, 128);
        ctx.lineTo(i + 128, 0);
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    return texture;
  }

  public reset(): void {
    for (const b of this.buildings) {
      this.disposeBuilding(b);
    }
    this.buildings = [];

    for (const p of this.viaductPiers) {
      this.disposeViaductPier(p);
    }
    this.viaductPiers = [];

    for (const s of this.streetDetails) {
      this.disposeStreetDetail(s);
    }
    this.streetDetails = [];

    for (const l of this.landmarks) {
      this.disposeLandmark(l);
    }
    this.landmarks = [];

    this.spawnedLandmarks.clear();
    this.lastCityDist = -30;
    this.lastPierDist = -20;
    this.lastStreetDist = -20;
    this.currentGroundY = -35.0;

    // IMMEDIATE FIRST-10-SECONDS INITIALIZATION:
    // Pre-seed the opening vista from dist -25m to 160m so the first frame is fully articulated!
    this.seedStartingEnvironment();
  }

  private seedStartingEnvironment(): void {
    // 1. Grand Starting Triumphal Arch framing the road right in front of the player (dist = 8m)
    this.spawnLandmark(8, 'START_TRIUMPHAL_ARCH');

    // 2. Pedestrian Covered Skybridge at dist = 85m
    this.spawnLandmark(85, 'PEDESTRIAN_SKYBRIDGE');

    // 3. Towering Grand Clock Tower landmark visible down the boulevard (dist = 240m)
    this.spawnLandmark(240, 'GRAND_CLOCK_TOWER');

    // 4. Pre-populate initial street furniture (streetlamps, trees, stone bollards, benches)
    for (let d = -20; d <= 150; d += this.streetInterval) {
      this.spawnStreetDetail(d, 'CIVIC');
      this.lastStreetDist = d;
    }

    // 5. Pre-populate initial architectural townhouses & civic buildings flanking the road
    for (let d = -20; d <= 160; d += this.spawnInterval) {
      this.spawnCityCluster(d);
      this.lastCityDist = d;
    }
  }

  public update(playerDist: number, pencilDrawDist: number, dt = 0.016): void {
    const targetAhead = pencilDrawDist + 110;

    // 1. DYNAMIC ROAD CLEARANCE CORRIDOR:
    let minRoadY = 0;
    const playerSample = this.flowPath.getSampleAtDistance(playerDist);
    if (playerSample) {
      minRoadY = playerSample.position.y;
      const checkDistances = [playerDist - 40, playerDist + 25, playerDist + 55, playerDist + 85];
      for (const d of checkDistances) {
        if (d > 0) {
          const s = this.flowPath.getSampleAtDistance(d);
          if (s && s.position.y < minRoadY) {
            minRoadY = s.position.y;
          }
        }
      }
    }

    // Ground floor dynamically descends with downhill roads, maintaining guaranteed 34m+ clearance
    const targetGroundY = minRoadY - 34.0;
    this.currentGroundY = THREE.MathUtils.damp(this.currentGroundY, targetGroundY, 4.0, dt);

    if (this.groundMesh) {
      this.groundMesh.position.set(
        playerSample ? playerSample.position.x : 0,
        this.currentGroundY,
        playerSample ? playerSample.position.z : 0
      );
    }

    // 2. Check Authored Landmarks Ahead
    this.checkLandmarksAhead(targetAhead);

    // 3. Procedural Viaduct Trestles / Architectural Bridge Piers
    while (this.lastPierDist < targetAhead) {
      this.lastPierDist += this.pierInterval;
      if (this.lastPierDist > 15) {
        this.spawnViaductPier(this.lastPierDist, this.currentGroundY);
      }
    }

    // 4. Foreground Street Furniture & Streetscape Elements
    while (this.lastStreetDist < targetAhead) {
      this.lastStreetDist += this.streetInterval;
      const district = this.getDistrictAt(this.lastStreetDist);
      this.spawnStreetDetail(this.lastStreetDist, district);
    }

    // 5. Procedural City Buildings (Near, Mid, Far Skyline)
    while (this.lastCityDist < targetAhead) {
      this.lastCityDist += this.spawnInterval;
      this.spawnCityCluster(this.lastCityDist);
    }

    // 6. Prune distant passed elements to free GPU memory
    this.pruneBehind(playerDist);
  }

  private checkLandmarksAhead(targetAhead: number): void {
    const landmarkSchedule = [
      { dist: 8, type: 'START_TRIUMPHAL_ARCH' },
      { dist: 85, type: 'PEDESTRIAN_SKYBRIDGE' },
      { dist: 240, type: 'GRAND_CLOCK_TOWER' },
      { dist: 720, type: 'PEDESTRIAN_SKYBRIDGE' },
      { dist: 1050, type: 'TWIN_TOWERS_SKYBRIDGE' },
      { dist: 1450, type: 'GREAT_SUSPENSION_PYLON' },
      { dist: 2100, type: 'ROOFTOP_CRANE' },
      { dist: 3200, type: 'INDUSTRIAL_SILO_COMPLEX' },
      { dist: 4400, type: 'ALPINE_OBSERVATORY' },
    ];

    for (const lm of landmarkSchedule) {
      const key = `${lm.type}_${lm.dist}`;
      if (!this.spawnedLandmarks.has(key) && lm.dist <= targetAhead) {
        this.spawnLandmark(lm.dist, lm.type);
        this.spawnedLandmarks.add(key);
      }
    }
  }

  private pruneBehind(playerDist: number): void {
    const pruneDist = playerDist - 85;

    // Buildings
    for (let i = this.buildings.length - 1; i >= 0; i--) {
      const b = this.buildings[i];
      if (b.distance < pruneDist) {
        this.disposeBuilding(b);
        this.buildings.splice(i, 1);
      }
    }

    // Viaduct piers
    for (let i = this.viaductPiers.length - 1; i >= 0; i--) {
      const p = this.viaductPiers[i];
      if (p.distance < pruneDist) {
        this.disposeViaductPier(p);
        this.viaductPiers.splice(i, 1);
      }
    }

    // Street details
    for (let i = this.streetDetails.length - 1; i >= 0; i--) {
      const s = this.streetDetails[i];
      if (s.distance < pruneDist) {
        this.disposeStreetDetail(s);
        this.streetDetails.splice(i, 1);
      }
    }

    // Landmarks
    for (let i = this.landmarks.length - 1; i >= 0; i--) {
      const l = this.landmarks[i];
      if (l.distance < pruneDist) {
        this.disposeLandmark(l);
        this.landmarks.splice(i, 1);
      }
    }
  }

  // ==========================================
  // LANDMARK GENERATION & PLACEMENT
  // ==========================================
  private spawnLandmark(dist: number, type: string): void {
    const sample = this.flowPath.getSampleAtDistance(dist);
    if (!sample) return;

    let group: THREE.Group | null = null;

    switch (type) {
      case 'START_TRIUMPHAL_ARCH':
        group = this.buildStartingTriumphalArch(sample);
        break;
      case 'PEDESTRIAN_SKYBRIDGE':
        group = this.buildPedestrianSkybridge(sample);
        break;
      case 'GRAND_CLOCK_TOWER':
        group = this.buildGrandClockTower(sample);
        break;
      case 'TWIN_TOWERS_SKYBRIDGE':
        group = this.buildTwinTowersSkybridge(sample);
        break;
      case 'GREAT_SUSPENSION_PYLON':
        group = this.buildSuspensionPylon(sample);
        break;
      case 'ROOFTOP_CRANE':
        group = this.buildRooftopCrane(sample);
        break;
      case 'INDUSTRIAL_SILO_COMPLEX':
        group = this.buildIndustrialSiloComplex(sample);
        break;
      case 'ALPINE_OBSERVATORY':
        group = this.buildAlpineObservatory(sample);
        break;
    }

    if (group) {
      this.group.add(group);
      this.landmarks.push({
        distance: dist,
        type,
        group,
      });
      this.spawnedLandmarks.add(`${type}_${dist}`);
    }
  }

  /**
   * Monumental Classical Triumphal Gateway at the start of the journey
   */
  private buildStartingTriumphalArch(sample: PathSample): THREE.Group {
    const archGroup = new THREE.Group();
    const halfRoadW = sample.width * 0.5;
    const archW = sample.width + 7.0;
    const archH = 12.5;
    const pylonW = 3.2;
    const pylonD = 4.2;

    // Left and Right fluted architectural stone pylons
    const pylonGeo = new THREE.BoxGeometry(pylonW, archH, pylonD);
    const leftPylon = new THREE.Mesh(pylonGeo, this.facadeMat);
    leftPylon.position.set(-halfRoadW - pylonW * 0.5 - 0.5, archH * 0.5, 0);
    archGroup.add(leftPylon);
    archGroup.add(this.createOutlines(pylonGeo, leftPylon.position, undefined, this.heavyLineMat));

    const rightPylon = new THREE.Mesh(pylonGeo, this.facadeMat);
    rightPylon.position.set(halfRoadW + pylonW * 0.5 + 0.5, archH * 0.5, 0);
    archGroup.add(rightPylon);
    archGroup.add(this.createOutlines(pylonGeo, rightPylon.position, undefined, this.heavyLineMat));

    // Classical Entablature Arch Span across the road (clearance = 8.5m)
    const spanH = 3.6;
    const spanGeo = new THREE.BoxGeometry(archW + pylonW * 2.0, spanH, pylonD * 1.05);
    const spanMesh = new THREE.Mesh(spanGeo, this.facadeMat);
    spanMesh.position.set(0, archH + spanH * 0.5 - 0.2, 0);
    archGroup.add(spanMesh);
    archGroup.add(this.createOutlines(spanGeo, spanMesh.position, undefined, this.heavyLineMat));

    // Stepped Attic Storey / Triangular Pediment
    const atticH = 2.4;
    const atticGeo = new THREE.BoxGeometry(archW * 0.85, atticH, pylonD * 0.9);
    const atticMesh = new THREE.Mesh(atticGeo, this.crossHatchMat);
    atticMesh.position.set(0, archH + spanH + atticH * 0.5, 0);
    archGroup.add(atticMesh);
    archGroup.add(this.createOutlines(atticGeo, atticMesh.position, undefined, this.heavyLineMat));

    // Classical Corinthian fluted column bas-reliefs on pylons
    for (const side of [-1, 1]) {
      const colX = side * (halfRoadW + pylonW * 0.5 + 0.5);
      for (const cz of [-pylonD * 0.38, pylonD * 0.38]) {
        const colGeo = new THREE.CylinderGeometry(0.4, 0.45, archH * 0.95, 8);
        const colMesh = new THREE.Mesh(colGeo, this.facadeMat);
        colMesh.position.set(colX, archH * 0.48, cz);
        archGroup.add(colMesh);
      }
    }

    // Four gold-topped obelisk finials on attic
    for (const ox of [-archW * 0.35, -archW * 0.12, archW * 0.12, archW * 0.35]) {
      const obGeo = new THREE.ConeGeometry(0.45, 2.0, 4);
      const obMesh = new THREE.Mesh(obGeo, this.goldAccentMat);
      obMesh.position.set(ox, archH + spanH + atticH + 1.0, 0);
      archGroup.add(obMesh);
    }

    // Align with road coordinate frame
    const backward = new THREE.Vector3().crossVectors(sample.right, sample.normal).normalize();
    const basisMat = new THREE.Matrix4().makeBasis(sample.right, sample.normal, backward);
    archGroup.quaternion.setFromRotationMatrix(basisMat);
    archGroup.position.copy(sample.position);

    return archGroup;
  }

  /**
   * Covered Architectural Pedestrian Skybridge spanning gracefully over the road
   */
  private buildPedestrianSkybridge(sample: PathSample): THREE.Group {
    const bridgeGroup = new THREE.Group();
    const halfRoadW = sample.width * 0.5;
    const spanLength = sample.width + 12.0;
    const clearance = 8.5; // generous height above road bed
    const bridgeH = 3.8;
    const bridgeD = 3.2;

    // Main bridge body box
    const bodyGeo = new THREE.BoxGeometry(spanLength, bridgeH, bridgeD);
    const bodyMesh = new THREE.Mesh(bodyGeo, this.facadeMat);
    bodyMesh.position.set(0, clearance + bridgeH * 0.5, 0);
    bridgeGroup.add(bodyMesh);
    bridgeGroup.add(this.createOutlines(bodyGeo, bodyMesh.position, undefined, this.heavyLineMat));

    // Pitched canopy roof with pencil cross-hatching
    const roofH = 1.6;
    const roofGeo = new THREE.ConeGeometry(spanLength * 0.52, roofH, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roofMesh = new THREE.Mesh(roofGeo, this.crossHatchMat);
    roofMesh.position.set(0, clearance + bridgeH + roofH * 0.5, 0);
    roofMesh.scale.set(1.0, 1.0, bridgeD / spanLength);
    bridgeGroup.add(roofMesh);
    bridgeGroup.add(this.createOutlines(roofGeo, roofMesh.position, roofMesh.scale, this.heavyLineMat));

    // Flanking support towers on either side of the road
    const towerH = clearance + bridgeH + 12.0;
    const towerW = 4.5;
    const towerGeo = new THREE.BoxGeometry(towerW, towerH, towerW);

    for (const side of [-1, 1]) {
      const towerMesh = new THREE.Mesh(towerGeo, this.facadeMat);
      towerMesh.position.set(side * (halfRoadW + towerW * 0.5 + 2.5), towerH * 0.5 - 2.0, 0);
      bridgeGroup.add(towerMesh);
      bridgeGroup.add(this.createOutlines(towerGeo, towerMesh.position, undefined, this.graphiteLineMat));

      // Tower conical roof
      const tRoofGeo = new THREE.ConeGeometry(towerW * 0.7, 4.5, 4);
      tRoofGeo.rotateY(Math.PI / 4);
      const tRoofMesh = new THREE.Mesh(tRoofGeo, this.crossHatchMat);
      tRoofMesh.position.set(towerMesh.position.x, towerH - 2.0 + 2.25, 0);
      bridgeGroup.add(tRoofMesh);
    }

    // Window bays along the bridge span
    const bayCount = 6;
    const bayW = (spanLength - 4.0) / bayCount;
    for (let b = 0; b < bayCount; b++) {
      const bx = -spanLength * 0.5 + 2.0 + (b + 0.5) * bayW;
      const winGeo = new THREE.BoxGeometry(bayW * 0.65, bridgeH * 0.55, bridgeD + 0.08);
      const winMesh = new THREE.Mesh(winGeo, this.crossHatchMat);
      winMesh.position.set(bx, clearance + bridgeH * 0.52, 0);
      bridgeGroup.add(winMesh);
    }

    // Align with road coordinate frame
    const backward = new THREE.Vector3().crossVectors(sample.right, sample.normal).normalize();
    const basisMat = new THREE.Matrix4().makeBasis(sample.right, sample.normal, backward);
    bridgeGroup.quaternion.setFromRotationMatrix(basisMat);
    bridgeGroup.position.copy(sample.position);

    return bridgeGroup;
  }

  /**
   * Towering Grand Clock Tower landmark (75m tall) with 4 illuminated clock dials
   */
  private buildGrandClockTower(sample: PathSample): THREE.Group {
    const towerGroup = new THREE.Group();
    const towerSide = -1; // placed on left side of boulevard
    const towerLateral = towerSide * (sample.width * 0.5 + 32.0);
    const towerW = 14.0;
    const towerD = 14.0;
    const shaftH = 50.0;

    // Main shaft
    const shaftGeo = new THREE.BoxGeometry(towerW, shaftH, towerD);
    const shaftMesh = new THREE.Mesh(shaftGeo, this.facadeMat);
    shaftMesh.position.y = shaftH * 0.5;
    towerGroup.add(shaftMesh);
    towerGroup.add(this.createOutlines(shaftGeo, shaftMesh.position, undefined, this.graphiteLineMat));

    // Projecting Clock Chamber
    const clockH = 12.0;
    const clockW = towerW * 1.12;
    const clockGeo = new THREE.BoxGeometry(clockW, clockH, clockW);
    const clockMesh = new THREE.Mesh(clockGeo, this.facadeMat);
    clockMesh.position.y = shaftH + clockH * 0.5;
    towerGroup.add(clockMesh);
    towerGroup.add(this.createOutlines(clockGeo, clockMesh.position, undefined, this.heavyLineMat));

    // 4 Grand Clock Dials with gold rims and dark graphite faces
    const dialRadius = 3.6;
    const dialRingGeo = new THREE.RingGeometry(dialRadius - 0.4, dialRadius, 24);
    const dialFaceGeo = new THREE.CircleGeometry(dialRadius - 0.4, 24);

    const clockFaces = [
      { pos: new THREE.Vector3(0, shaftH + clockH * 0.5, clockW * 0.5 + 0.05), rotY: 0 },
      { pos: new THREE.Vector3(0, shaftH + clockH * 0.5, -clockW * 0.5 - 0.05), rotY: Math.PI },
      { pos: new THREE.Vector3(clockW * 0.5 + 0.05, shaftH + clockH * 0.5, 0), rotY: Math.PI * 0.5 },
      { pos: new THREE.Vector3(-clockW * 0.5 - 0.05, shaftH + clockH * 0.5, 0), rotY: -Math.PI * 0.5 },
    ];

    for (const cf of clockFaces) {
      const faceMesh = new THREE.Mesh(dialFaceGeo, this.crossHatchMat);
      faceMesh.position.copy(cf.pos);
      faceMesh.rotation.y = cf.rotY;
      towerGroup.add(faceMesh);

      const ringMesh = new THREE.Mesh(dialRingGeo, this.goldAccentMat);
      ringMesh.position.copy(cf.pos);
      ringMesh.rotation.y = cf.rotY;
      towerGroup.add(ringMesh);
    }

    // Belfry Arched Chamber
    const belfryH = 9.0;
    const belfryGeo = new THREE.CylinderGeometry(towerW * 0.42, towerW * 0.46, belfryH, 8);
    const belfryMesh = new THREE.Mesh(belfryGeo, this.crossHatchMat);
    belfryMesh.position.y = shaftH + clockH + belfryH * 0.5;
    towerGroup.add(belfryMesh);
    towerGroup.add(this.createOutlines(belfryGeo, belfryMesh.position, undefined, this.graphiteLineMat));

    // Sharp Octagonal Spire
    const spireH = 22.0;
    const spireGeo = new THREE.ConeGeometry(towerW * 0.42, spireH, 8);
    const spireMesh = new THREE.Mesh(spireGeo, this.crossHatchMat);
    spireMesh.position.y = shaftH + clockH + belfryH + spireH * 0.5;
    towerGroup.add(spireMesh);
    towerGroup.add(this.createOutlines(spireGeo, spireMesh.position, undefined, this.heavyLineMat));

    // Gold Pinnacle Finial
    const finGeo = new THREE.SphereGeometry(1.2, 8, 8);
    const finMesh = new THREE.Mesh(finGeo, this.goldAccentMat);
    finMesh.position.y = shaftH + clockH + belfryH + spireH;
    towerGroup.add(finMesh);

    // Deep Plinth foundation
    const plinthH = 75.0;
    const plinthGeo = new THREE.BoxGeometry(towerW * 1.15, plinthH, towerD * 1.15);
    const plinth = new THREE.Mesh(plinthGeo, this.foundationMat);
    plinth.position.y = -plinthH * 0.5;
    towerGroup.add(plinth);

    // Position relative to road
    const worldPos = sample.position.clone().addScaledVector(sample.right, towerLateral);
    worldPos.y = sample.position.y - 12.0; // embedded in ground
    towerGroup.position.copy(worldPos);

    return towerGroup;
  }

  /**
   * Downtown Twin Skyscrapers connected by a glass skybridge 42m high
   */
  private buildTwinTowersSkybridge(sample: PathSample): THREE.Group {
    const group = new THREE.Group();
    const halfRoadW = sample.width * 0.5;
    const towerW = 16.0;
    const towerD = 16.0;
    const towerH = 88.0;

    for (const side of [-1, 1]) {
      const tX = side * (halfRoadW + towerW * 0.5 + 18.0);
      const tGeo = new THREE.BoxGeometry(towerW, towerH, towerD);
      const tMesh = new THREE.Mesh(tGeo, this.facadeMat);
      tMesh.position.set(tX, towerH * 0.5, 0);
      group.add(tMesh);
      group.add(this.createOutlines(tGeo, tMesh.position, undefined, this.graphiteLineMat));

      // Crown setback
      const crownH = 14.0;
      const crownGeo = new THREE.ConeGeometry(towerW * 0.55, crownH, 4);
      crownGeo.rotateY(Math.PI / 4);
      const crownMesh = new THREE.Mesh(crownGeo, this.crossHatchMat);
      crownMesh.position.set(tX, towerH + crownH * 0.5, 0);
      group.add(crownMesh);

      // Antenna needle
      const antGeo = new THREE.CylinderGeometry(0.15, 0.4, 18.0, 6);
      const antMesh = new THREE.Mesh(antGeo, this.goldAccentMat);
      antMesh.position.set(tX, towerH + crownH + 9.0, 0);
      group.add(antMesh);
    }

    // High Connecting Skybridge spanning across both towers over the road!
    const bridgeSpan = (halfRoadW + 18.0 + towerW * 0.5) * 2.0;
    const bridgeY = 46.0;
    const bridgeGeo = new THREE.BoxGeometry(bridgeSpan, 5.5, 4.2);
    const bridgeMesh = new THREE.Mesh(bridgeGeo, this.crossHatchMat);
    bridgeMesh.position.set(0, bridgeY, 0);
    group.add(bridgeMesh);
    group.add(this.createOutlines(bridgeGeo, bridgeMesh.position, undefined, this.heavyLineMat));

    // Align with road
    const backward = new THREE.Vector3().crossVectors(sample.right, sample.normal).normalize();
    const basisMat = new THREE.Matrix4().makeBasis(sample.right, sample.normal, backward);
    group.quaternion.setFromRotationMatrix(basisMat);
    group.position.copy(sample.position);

    return group;
  }

  /**
   * Monumental Suspension Bridge Cable-Stayed A-Frame Pylon (65m tall)
   */
  private buildSuspensionPylon(sample: PathSample): THREE.Group {
    const group = new THREE.Group();
    const halfRoadW = sample.width * 0.5;
    const pylonW = sample.width + 14.0;
    const pylonH = 68.0;

    // Tower legs angled inward as A-frame
    for (const side of [-1, 1]) {
      const legGeo = new THREE.BoxGeometry(2.8, pylonH, 3.2);
      const legMesh = new THREE.Mesh(legGeo, this.facadeMat);
      legMesh.position.set(side * (halfRoadW + 3.5), pylonH * 0.5, 0);
      legMesh.rotation.z = -side * 0.08;
      group.add(legMesh);
      group.add(this.createOutlines(legGeo, legMesh.position, undefined, this.heavyLineMat));
    }

    // Cross-strut portals
    for (const y of [22.0, 45.0, 62.0]) {
      const strutGeo = new THREE.BoxGeometry(pylonW * 0.8, 2.2, 2.8);
      const strutMesh = new THREE.Mesh(strutGeo, this.crossHatchMat);
      strutMesh.position.set(0, y, 0);
      group.add(strutMesh);
      group.add(this.createOutlines(strutGeo, strutMesh.position, undefined, this.graphiteLineMat));
    }

    // Radiating suspension stay cables (pencil linework)
    const cablePts: THREE.Vector3[] = [];
    const cableTops = [54.0, 58.0, 62.0];
    const cableSpreads = [16.0, 32.0, 48.0];

    for (const topY of cableTops) {
      for (const sp of cableSpreads) {
        for (const side of [-1, 1]) {
          cablePts.push(new THREE.Vector3(side * 2.0, topY, 0));
          cablePts.push(new THREE.Vector3(side * (halfRoadW + 1.2), 0, sp));

          cablePts.push(new THREE.Vector3(side * 2.0, topY, 0));
          cablePts.push(new THREE.Vector3(side * (halfRoadW + 1.2), 0, -sp));
        }
      }
    }

    const cableGeo = new THREE.BufferGeometry().setFromPoints(cablePts);
    const cableLines = new THREE.LineSegments(cableGeo, this.heavyLineMat);
    group.add(cableLines);

    // Align with road
    const backward = new THREE.Vector3().crossVectors(sample.right, sample.normal).normalize();
    const basisMat = new THREE.Matrix4().makeBasis(sample.right, sample.normal, backward);
    group.quaternion.setFromRotationMatrix(basisMat);
    group.position.copy(sample.position);

    return group;
  }

  /**
   * Rooftop Construction Tower Crane Landmark with yellow accents and hanging hook
   */
  private buildRooftopCrane(sample: PathSample): THREE.Group {
    const group = new THREE.Group();
    const side = 1;
    const baseW = 20.0;
    const baseH = 55.0;

    // Base building
    const bGeo = new THREE.BoxGeometry(baseW, baseH, baseW);
    const bMesh = new THREE.Mesh(bGeo, this.facadeMat);
    bMesh.position.y = baseH * 0.5;
    group.add(bMesh);
    group.add(this.createOutlines(bGeo, bMesh.position, undefined, this.graphiteLineMat));

    // Vertical crane lattice mast
    const mastH = 26.0;
    const mastGeo = new THREE.BoxGeometry(2.0, mastH, 2.0);
    const mastMesh = new THREE.Mesh(mastGeo, this.goldAccentMat);
    mastMesh.position.set(0, baseH + mastH * 0.5, 0);
    group.add(mastMesh);
    group.add(this.createOutlines(mastGeo, mastMesh.position, undefined, this.heavyLineMat));

    // Horizontal jib extending out over the street!
    const jibL = 34.0;
    const jibGeo = new THREE.BoxGeometry(jibL, 1.8, 1.8);
    const jibMesh = new THREE.Mesh(jibGeo, this.goldAccentMat);
    jibMesh.position.set(-jibL * 0.35, baseH + mastH - 1.0, 0);
    group.add(jibMesh);
    group.add(this.createOutlines(jibGeo, jibMesh.position, undefined, this.heavyLineMat));

    // Counterweight block
    const cwGeo = new THREE.BoxGeometry(4.0, 3.0, 2.5);
    const cwMesh = new THREE.Mesh(cwGeo, this.crossHatchMat);
    cwMesh.position.set(jibL * 0.3, baseH + mastH - 1.0, 0);
    group.add(cwMesh);

    // Hanging crane hoist cable
    const cablePts = [
      new THREE.Vector3(-jibL * 0.65, baseH + mastH - 1.0, 0),
      new THREE.Vector3(-jibL * 0.65, baseH + mastH - 14.0, 0),
    ];
    const cableGeo = new THREE.BufferGeometry().setFromPoints(cablePts);
    group.add(new THREE.Line(cableGeo, this.heavyLineMat));

    // Position on side of road
    const worldPos = sample.position.clone().addScaledVector(sample.right, side * (sample.width * 0.5 + 40.0));
    worldPos.y = sample.position.y - 15.0;
    group.position.copy(worldPos);

    return group;
  }

  /**
   * Industrial Silo Complex with overhead pipe gantry
   */
  private buildIndustrialSiloComplex(sample: PathSample): THREE.Group {
    const group = new THREE.Group();
    const siloRadius = 5.5;
    const siloHeight = 32.0;

    // 4 cylindrical industrial storage silos
    const siloOffsets = [
      { x: -7.0, z: -7.0 },
      { x: 7.0, z: -7.0 },
      { x: -7.0, z: 7.0 },
      { x: 7.0, z: 7.0 },
    ];

    for (const so of siloOffsets) {
      const sGeo = new THREE.CylinderGeometry(siloRadius, siloRadius, siloHeight, 16);
      const sMesh = new THREE.Mesh(sGeo, this.facadeMat);
      sMesh.position.set(so.x, siloHeight * 0.5, so.z);
      group.add(sMesh);
      group.add(this.createOutlines(sGeo, sMesh.position, undefined, this.graphiteLineMat));

      // Dome cap
      const domeGeo = new THREE.SphereGeometry(siloRadius, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const dome = new THREE.Mesh(domeGeo, this.crossHatchMat);
      dome.position.set(so.x, siloHeight, so.z);
      group.add(dome);
    }

    // Elevated catwalk linking silos
    const catwalkGeo = new THREE.BoxGeometry(22.0, 1.2, 22.0);
    const catwalk = new THREE.Mesh(catwalkGeo, this.crossHatchMat);
    catwalk.position.set(0, siloHeight + 0.6, 0);
    group.add(catwalk);

    const worldPos = sample.position.clone().addScaledVector(sample.right, -(sample.width * 0.5 + 38.0));
    worldPos.y = sample.position.y - 10.0;
    group.position.copy(worldPos);

    return group;
  }

  /**
   * Mountaintop Astronomical Observatory with dome
   */
  private buildAlpineObservatory(sample: PathSample): THREE.Group {
    const group = new THREE.Group();
    const peakH = 45.0;
    const baseW = 32.0;

    // Mountain rock base
    const rockGeo = new THREE.ConeGeometry(baseW, peakH, 5);
    const rock = new THREE.Mesh(rockGeo, this.crossHatchMat);
    rock.position.y = peakH * 0.5;
    group.add(rock);
    group.add(this.createOutlines(rockGeo, rock.position, undefined, this.graphiteLineMat));

    // Cylindrical observatory rotunda
    const rotH = 8.0;
    const rotGeo = new THREE.CylinderGeometry(6.0, 6.0, rotH, 16);
    const rot = new THREE.Mesh(rotGeo, this.facadeMat);
    rot.position.y = peakH + rotH * 0.5;
    group.add(rot);

    // Revolving hemisphere dome
    const domeGeo = new THREE.SphereGeometry(6.0, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const dome = new THREE.Mesh(domeGeo, this.facadeMat);
    dome.position.y = peakH + rotH;
    group.add(dome);
    group.add(this.createOutlines(domeGeo, dome.position, undefined, this.heavyLineMat));

    const worldPos = sample.position.clone().addScaledVector(sample.right, sample.width * 0.5 + 46.0);
    worldPos.y = sample.position.y - 20.0;
    group.position.copy(worldPos);

    return group;
  }

  // ==========================================
  // FOREGROUND STREET ELEMENTS SYSTEM
  // ==========================================
  private spawnStreetDetail(dist: number, district: DistrictType): void {
    const sample = this.flowPath.getSampleAtDistance(dist);
    if (!sample) return;

    const group = new THREE.Group();
    // Alternate sides to balance visual composition along the road
    const side = (Math.floor(dist / this.streetInterval) % 2 === 0) ? -1 : 1;
    const lateralDist = side * (sample.width * 0.5 + 2.2);

    let elementGroup: THREE.Group;

    switch (district) {
      case 'CIVIC': {
        const pick = Math.random();
        if (pick < 0.5) {
          elementGroup = this.buildStreetLamp();
        } else if (pick < 0.85) {
          elementGroup = this.buildStreetTree();
        } else {
          elementGroup = this.buildStreetBench();
        }
        break;
      }
      case 'DOWNTOWN': {
        const pick = Math.random();
        if (pick < 0.45) {
          elementGroup = this.buildModernHighwayLight();
        } else if (pick < 0.8) {
          elementGroup = this.buildRoadBarrier();
        } else {
          elementGroup = this.buildDirectionalSign();
        }
        break;
      }
      case 'ROOFTOPS': {
        elementGroup = this.buildRoadBarrier();
        break;
      }
      case 'INDUSTRIAL': {
        elementGroup = Math.random() > 0.5 ? this.buildIndustrialUtilityPylon() : this.buildRoadBarrier();
        break;
      }
      case 'ALPINE': {
        elementGroup = this.buildAlpinePineSmall();
        break;
      }
      default: {
        elementGroup = this.buildRoadBarrier();
        break;
      }
    }

    // Attach to road sample coordinates
    elementGroup.position.set(lateralDist, 0, 0);
    group.add(elementGroup);

    // Align with road orientation
    const backward = new THREE.Vector3().crossVectors(sample.right, sample.normal).normalize();
    const basisMat = new THREE.Matrix4().makeBasis(sample.right, sample.normal, backward);
    group.quaternion.setFromRotationMatrix(basisMat);
    group.position.copy(sample.position);

    this.group.add(group);
    this.streetDetails.push({
      distance: dist,
      group,
    });
  }

  /**
   * Classical Ornate Victorian Lamp Post
   */
  private buildStreetLamp(): THREE.Group {
    const g = new THREE.Group();
    const poleH = 4.8;

    // Fluted post
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.22, poleH, 6);
    const pole = new THREE.Mesh(poleGeo, this.foundationMat);
    pole.position.y = poleH * 0.5;
    g.add(pole);

    // Ornate curved arm extending toward road
    const armGeo = new THREE.BoxGeometry(0.85, 0.1, 0.1);
    const arm = new THREE.Mesh(armGeo, this.foundationMat);
    arm.position.set(-0.35, poleH - 0.2, 0);
    g.add(arm);

    // Lantern box with gold-accented bulb
    const lGeo = new THREE.BoxGeometry(0.5, 0.7, 0.5);
    const lantern = new THREE.Mesh(lGeo, this.goldAccentMat);
    lantern.position.set(-0.7, poleH - 0.5, 0);
    g.add(lantern);
    g.add(this.createOutlines(lGeo, lantern.position, undefined, this.heavyLineMat));

    return g;
  }

  /**
   * Modern Highway Overhead LED Light Post
   */
  private buildModernHighwayLight(): THREE.Group {
    const g = new THREE.Group();
    const poleH = 6.2;

    const poleGeo = new THREE.CylinderGeometry(0.14, 0.18, poleH, 6);
    const pole = new THREE.Mesh(poleGeo, this.crossHatchMat);
    pole.position.y = poleH * 0.5;
    g.add(pole);

    const headGeo = new THREE.BoxGeometry(1.2, 0.2, 0.4);
    const head = new THREE.Mesh(headGeo, this.facadeMat);
    head.position.set(-0.5, poleH, 0);
    head.rotation.z = 0.15;
    g.add(head);

    return g;
  }

  /**
   * Sketched Deciduous Street Tree with volumetric pencil cross-hatched canopy
   */
  private buildStreetTree(): THREE.Group {
    const g = new THREE.Group();
    const trunkH = 3.6;

    // Gnarled graphite trunk
    const trunkGeo = new THREE.CylinderGeometry(0.28, 0.45, trunkH, 6);
    const trunk = new THREE.Mesh(trunkGeo, this.treeTrunkMat);
    trunk.position.y = trunkH * 0.5;
    g.add(trunk);

    // 3 overlapping volumetric foliage spheres with cross-hatching
    const puffs = [
      { x: 0, y: trunkH + 1.2, z: 0, r: 1.8 },
      { x: -0.6, y: trunkH + 1.8, z: 0.4, r: 1.4 },
      { x: 0.7, y: trunkH + 1.5, z: -0.3, r: 1.5 },
    ];

    for (const p of puffs) {
      const fGeo = new THREE.IcosahedronGeometry(p.r, 1);
      const fMesh = new THREE.Mesh(fGeo, this.treeFoliageMat);
      fMesh.position.set(p.x, p.y, p.z);
      fMesh.scale.set(1.1, 0.85, 1.0);
      g.add(fMesh);
      g.add(this.createOutlines(fGeo, fMesh.position, fMesh.scale, this.graphiteLineMat));
    }

    return g;
  }

  /**
   * Small Alpine Pine Tree
   */
  private buildAlpinePineSmall(): THREE.Group {
    const g = new THREE.Group();
    const h = 5.5;

    const tGeo = new THREE.CylinderGeometry(0.2, 0.35, 1.6, 5);
    const tMesh = new THREE.Mesh(tGeo, this.treeTrunkMat);
    tMesh.position.y = 0.8;
    g.add(tMesh);

    for (let i = 0; i < 3; i++) {
      const tierR = (1.8 - i * 0.45);
      const tierH = 2.0;
      const cGeo = new THREE.ConeGeometry(tierR, tierH, 5);
      const cMesh = new THREE.Mesh(cGeo, this.treeFoliageMat);
      cMesh.position.y = 1.4 + i * 1.3;
      g.add(cMesh);
      g.add(this.createOutlines(cGeo, cMesh.position, undefined, this.graphiteLineMat));
    }

    return g;
  }

  /**
   * Concrete roadside barrier with pencil warning stripes
   */
  private buildRoadBarrier(): THREE.Group {
    const g = new THREE.Group();
    const bGeo = new THREE.BoxGeometry(0.6, 0.95, 3.8);
    const bMesh = new THREE.Mesh(bGeo, this.foundationMat);
    bMesh.position.y = 0.48;
    g.add(bMesh);
    g.add(this.createOutlines(bGeo, bMesh.position, undefined, this.heavyLineMat));

    // Reflector pill
    const refGeo = new THREE.BoxGeometry(0.65, 0.2, 0.4);
    const ref = new THREE.Mesh(refGeo, this.goldAccentMat);
    ref.position.set(0, 0.5, 0);
    g.add(ref);

    return g;
  }

  /**
   * Hand-drawn Park Bench
   */
  private buildStreetBench(): THREE.Group {
    const g = new THREE.Group();
    const bGeo = new THREE.BoxGeometry(0.8, 0.6, 2.2);
    const bMesh = new THREE.Mesh(bGeo, this.facadeMat);
    bMesh.position.y = 0.3;
    g.add(bMesh);
    g.add(this.createOutlines(bGeo, bMesh.position, undefined, this.heavyLineMat));

    return g;
  }

  /**
   * Directional Boulevard / Highway Signpost
   */
  private buildDirectionalSign(): THREE.Group {
    const g = new THREE.Group();
    const poleH = 4.2;

    const pGeo = new THREE.CylinderGeometry(0.1, 0.1, poleH, 6);
    const pole = new THREE.Mesh(pGeo, this.foundationMat);
    pole.position.y = poleH * 0.5;
    g.add(pole);

    const signGeo = new THREE.BoxGeometry(0.1, 1.2, 2.4);
    const sign = new THREE.Mesh(signGeo, this.facadeMat);
    sign.position.set(0, poleH - 0.6, 0);
    g.add(sign);
    g.add(this.createOutlines(signGeo, sign.position, undefined, this.heavyLineMat));

    return g;
  }

  /**
   * Industrial Utility Pylon with transformer
   */
  private buildIndustrialUtilityPylon(): THREE.Group {
    const g = new THREE.Group();
    const h = 7.0;

    const pGeo = new THREE.CylinderGeometry(0.2, 0.28, h, 6);
    const pole = new THREE.Mesh(pGeo, this.foundationMat);
    pole.position.y = h * 0.5;
    g.add(pole);

    // Cross-arm
    const armGeo = new THREE.BoxGeometry(0.15, 0.25, 2.4);
    const arm = new THREE.Mesh(armGeo, this.crossHatchMat);
    arm.position.set(0, h - 0.4, 0);
    g.add(arm);

    // Transformer cylinder
    const transGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.4, 8);
    const trans = new THREE.Mesh(transGeo, this.crossHatchMat);
    trans.position.set(0.4, h - 1.8, 0);
    g.add(trans);

    return g;
  }

  // ==========================================
  // CITY CLUSTERS: NEAR, MID, FAR SKYLINE
  // ==========================================
  private spawnCityCluster(dist: number): void {
    const sample = this.flowPath.getSampleAtDistance(dist);
    if (!sample) return;

    const district = this.getDistrictAt(dist);
    const sides = [-1, 1];

    for (const side of sides) {
      // 2 depth layers: Inner (Midground) and Outer (Distant Skyline Backdrop)
      for (let layer = 0; layer < 2; layer++) {
        let baseLateral: number;
        let isClose: boolean;
        let bWidth: number;
        let bDepth: number;
        let bHeight: number;

        if (layer === 0) {
          // LAYER 0: Street-front & Midground district architecture
          baseLateral = side * randomRange(30, 52);
          isClose = Math.abs(baseLateral) < 45;
          bWidth = randomRange(12, 20);
          bDepth = randomRange(12, 20);

          if (isClose) {
            bHeight = randomRange(16, 28);
          } else {
            bHeight = randomRange(28, 48);
          }
        } else {
          // LAYER 1: Distant majestic skyline towers & monuments
          baseLateral = side * randomRange(68, 115);
          isClose = false;
          bWidth = randomRange(18, 30);
          bDepth = randomRange(18, 30);
          bHeight = randomRange(55, 105);
        }

        const bRadius = Math.max(bWidth, bDepth) * 0.72;
        const buildingType = this.selectBuildingType(dist, district, layer);

        // Snap candidate to global Manhattan grid to form structured streets and alleys
        const rawX = sample.position.x + sample.right.x * baseLateral;
        const rawZ = sample.position.z + sample.right.z * baseLateral;
        const gridStep = 24.0;
        const candX = Math.round(rawX / gridStep) * gridStep;
        const candZ = Math.round(rawZ / gridStep) * gridStep;

        // Ground placement: buildings sit below track level so roller-coaster flies above
        let candY = sample.position.y - randomRange(12, 26);
        if (isClose) {
          // Absolute guarantee: building roof is at least 3.5m below track level!
          candY = Math.min(candY, sample.position.y - bHeight - 3.5);
        }

        // Road clearance check
        const clearance = this.checkRoadClearance(candX, candZ, bRadius, dist);
        if (!clearance.safe) {
          if (clearance.pushVector) {
            const pushX = Math.round((candX + clearance.pushVector.x * (clearance.neededPush + 8)) / gridStep) * gridStep;
            const pushZ = Math.round((candZ + clearance.pushVector.y * (clearance.neededPush + 8)) / gridStep) * gridStep;
            const recheck = this.checkRoadClearance(pushX, pushZ, bRadius, dist);
            if (recheck.safe) {
              this.placeBuilding(pushX, candY, pushZ, dist, buildingType, bWidth, bDepth, bHeight, layer > 0);
            }
          }
          continue;
        }

        this.placeBuilding(candX, candY, candZ, dist, buildingType, bWidth, bDepth, bHeight, layer > 0);
      }
    }
  }

  private checkRoadClearance(
    bx: number,
    bz: number,
    bRadius: number,
    centerDist: number
  ): { safe: boolean; pushVector?: THREE.Vector2; neededPush: number } {
    const minCheckDist = Math.max(0, centerDist - 75);
    const maxCheckDist = centerDist + 75;
    const step = 4.0;

    let minFoundDist = 99999;
    let closestSamplePos: THREE.Vector3 | null = null;
    let roadWidthAtClosest = 8.0;

    for (let d = minCheckDist; d <= maxCheckDist; d += step) {
      const s = this.flowPath.getSampleAtDistance(d);
      if (!s) continue;

      const dx = bx - s.position.x;
      const dz = bz - s.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < minFoundDist) {
        minFoundDist = dist;
        closestSamplePos = s.position;
        roadWidthAtClosest = s.width;
      }
    }

    const minSafeBuffer = bRadius + roadWidthAtClosest * 0.5 + 18.0;

    if (minFoundDist < minSafeBuffer && closestSamplePos) {
      const pushX = bx - closestSamplePos.x;
      const pushZ = bz - closestSamplePos.z;
      const pushLen = Math.sqrt(pushX * pushX + pushZ * pushZ) || 1.0;
      return {
        safe: false,
        pushVector: new THREE.Vector2(pushX / pushLen, pushZ / pushLen),
        neededPush: minSafeBuffer - minFoundDist,
      };
    }

    return { safe: true, neededPush: 0 };
  }

  /**
   * Architectural Building Selector driven by Coherent City Districts
   */
  private selectBuildingType(dist: number, district: DistrictType, layer: number): string {
    switch (district) {
      case 'CIVIC':
        if (layer === 0) {
          return randomChoice(['BROWNSTONE_BLOCK', 'CIVIC_COLONNADE', 'NARROW_APARTMENT']);
        }
        return randomChoice(['GOTHIC_SPIRE', 'CIVIC_COLONNADE', 'CHRYSLER_TOWER', 'BROWNSTONE_BLOCK']);

      case 'DOWNTOWN':
        if (layer === 0) {
          return randomChoice(['CHRYSLER_TOWER', 'CANTILEVER_MODERN', 'GRID_SKYSCRAPER', 'NARROW_APARTMENT']);
        }
        return randomChoice(['CHRYSLER_TOWER', 'GOTHIC_SPIRE', 'GRID_SKYSCRAPER', 'TWIN_TOWER', 'RADIO_TOWER']);

      case 'ROOFTOPS':
        if (layer === 0) {
          return randomChoice(['WATER_TOWER_ROOF', 'ROOFTOP_HVAC_TOWER', 'NARROW_APARTMENT']);
        }
        return randomChoice(['CHRYSLER_TOWER', 'RADIO_TOWER', 'ROOFTOP_HVAC_TOWER', 'GRID_SKYSCRAPER']);

      case 'INDUSTRIAL':
        if (layer === 0) {
          return randomChoice(['SAWTOOTH_FACTORY', 'WATER_TOWER_ROOF', 'BROWNSTONE_BLOCK']);
        }
        return randomChoice(['SAWTOOTH_FACTORY', 'RADIO_TOWER', 'GRID_SKYSCRAPER']);

      case 'ALPINE':
        return randomChoice(['HATCHED_MOUNTAIN_PEAK', 'CANYON_CLIFF_WALL', 'ROCKY_SPIRE']);

      case 'MODERN_BLUEPRINT':
      default:
        return randomChoice(['CANTILEVER_MODERN', 'ORIGAMI_MONOLITH', 'CHRYSLER_TOWER']);
    }
  }

  private placeBuilding(
    x: number,
    y: number,
    z: number,
    dist: number,
    type: string,
    w: number,
    d: number,
    h: number,
    isDistant: boolean
  ): void {
    const bGroup = this.buildPencilBuilding(type, w, d, h, isDistant);
    bGroup.position.set(x, y, z);
    bGroup.rotation.y = Math.random() > 0.5 ? 0 : Math.PI * 0.5;

    this.group.add(bGroup);
    this.buildings.push({
      distance: dist,
      group: bGroup,
    });
  }

  // ==========================================
  // PROCEDURAL ARCHITECTURAL BUILDING GRAMMAR
  // ==========================================
  private buildPencilBuilding(
    type: string,
    width: number,
    depth: number,
    height: number,
    isDistant: boolean
  ): THREE.Group {
    const b = new THREE.Group();
    const roofMat = isDistant ? this.farHatchMat : this.crossHatchMat;
    const wallMat = this.facadeMat;
    const outlineMat = isDistant ? this.faintLineMat : this.graphiteLineMat;

    // Solid architectural foundation base extending deep downwards (75m) into ground
    const plinthH = 75.0;
    const plinthGeo = new THREE.BoxGeometry(width * 1.05, plinthH, depth * 1.05);
    const plinthMesh = new THREE.Mesh(plinthGeo, this.foundationMat);
    plinthMesh.position.y = -plinthH * 0.5;
    b.add(plinthMesh);
    b.add(this.createOutlines(plinthGeo, plinthMesh.position, undefined, outlineMat));

    switch (type) {
      case 'CIVIC_COLONNADE': {
        // Classical civic portico (museum/library) with columns, steps, and triangular pediment
        const stepsH = 3.0;
        const stepsGeo = new THREE.BoxGeometry(width * 1.1, stepsH, depth * 1.1);
        const steps = new THREE.Mesh(stepsGeo, this.foundationMat);
        steps.position.y = stepsH * 0.5;
        b.add(steps);

        const bodyH = height * 0.65;
        const bodyGeo = new THREE.BoxGeometry(width, bodyH, depth);
        const body = new THREE.Mesh(bodyGeo, wallMat);
        body.position.y = stepsH + bodyH * 0.5;
        b.add(body);
        b.add(this.createOutlines(bodyGeo, body.position, undefined, outlineMat));

        // Front colonnade portico
        const colCount = 4;
        const colH = bodyH * 0.85;
        const colR = 0.55;
        for (let c = 0; c < colCount; c++) {
          const cx = -width * 0.4 + (c / (colCount - 1)) * (width * 0.8);
          const colGeo = new THREE.CylinderGeometry(colR * 0.85, colR, colH, 8);
          const colMesh = new THREE.Mesh(colGeo, wallMat);
          colMesh.position.set(cx, stepsH + colH * 0.5, depth * 0.55);
          b.add(colMesh);
        }

        // Triangular Classical Pediment
        const pedH = height * 0.28;
        const pedGeo = new THREE.ConeGeometry(width * 0.72, pedH, 3);
        pedGeo.rotateZ(Math.PI);
        const pedMesh = new THREE.Mesh(pedGeo, roofMat);
        pedMesh.position.set(0, stepsH + bodyH + pedH * 0.45, depth * 0.35);
        pedMesh.scale.set(1.0, 1.0, depth * 0.4 / width);
        b.add(pedMesh);
        b.add(this.createOutlines(pedGeo, pedMesh.position, pedMesh.scale, outlineMat));
        break;
      }

      case 'BROWNSTONE_BLOCK': {
        // Classic metropolitan brownstone rowhouse with mansard roof, front stoop stairs, and chimneys
        const baseH = height * 0.7;
        const geo = new THREE.BoxGeometry(width, baseH, depth);
        const mesh = new THREE.Mesh(geo, wallMat);
        mesh.position.y = baseH * 0.5;
        b.add(mesh);
        b.add(this.createOutlines(geo, mesh.position, undefined, outlineMat));

        // Mansard dormer roof
        const roofH = height * 0.28;
        const roofGeo = new THREE.ConeGeometry(width * 0.75, roofH, 4);
        roofGeo.rotateY(Math.PI / 4);
        const roofMesh = new THREE.Mesh(roofGeo, roofMat);
        roofMesh.position.y = baseH + roofH * 0.5;
        roofMesh.scale.set(1.0, 1.0, depth / width);
        b.add(roofMesh);
        b.add(this.createOutlines(roofGeo, roofMesh.position, roofMesh.scale, outlineMat));

        // Dual chimneys
        for (const cx of [-width * 0.3, width * 0.3]) {
          const chimGeo = new THREE.BoxGeometry(1.4, 4.2, 1.4);
          const chim = new THREE.Mesh(chimGeo, wallMat);
          chim.position.set(cx, baseH + roofH * 0.65, 0);
          b.add(chim);
          b.add(this.createOutlines(chimGeo, chim.position, undefined, outlineMat));
        }

        // Fire escapes and window grids
        this.addFireEscapes(b, width, baseH, depth);
        this.addWindowArray(b, width, baseH, depth, 0);
        break;
      }

      case 'CHRYSLER_TOWER': {
        // Grand Art Deco skyscraper with setback terraces and radiating crown arches
        const tier1H = height * 0.5;
        const geo1 = new THREE.BoxGeometry(width, tier1H, depth);
        const mesh1 = new THREE.Mesh(geo1, wallMat);
        mesh1.position.y = tier1H * 0.5;
        b.add(mesh1);
        b.add(this.createOutlines(geo1, mesh1.position, undefined, outlineMat));

        const tier2W = width * 0.72;
        const tier2D = depth * 0.72;
        const tier2H = height * 0.3;
        const geo2 = new THREE.BoxGeometry(tier2W, tier2H, tier2D);
        const mesh2 = new THREE.Mesh(geo2, wallMat);
        mesh2.position.y = tier1H + tier2H * 0.5;
        b.add(mesh2);
        b.add(this.createOutlines(geo2, mesh2.position, undefined, outlineMat));

        const crownH = height * 0.18;
        const crownGeo = new THREE.ConeGeometry(tier2W * 0.45, crownH, 8);
        const crownMesh = new THREE.Mesh(crownGeo, roofMat);
        crownMesh.position.y = tier1H + tier2H + crownH * 0.5;
        b.add(crownMesh);
        b.add(this.createOutlines(crownGeo, crownMesh.position, undefined, outlineMat));

        const spireH = height * 0.28;
        const spireGeo = new THREE.CylinderGeometry(0.12, 0.4, spireH, 6);
        const spireMesh = new THREE.Mesh(spireGeo, this.goldAccentMat);
        spireMesh.position.y = tier1H + tier2H + crownH + spireH * 0.5;
        b.add(spireMesh);

        this.addWindowArray(b, width, tier1H, depth, 0);
        this.addWindowArray(b, tier2W, tier2H, tier2D, tier1H);
        break;
      }

      case 'GOTHIC_SPIRE': {
        // Dramatic Gothic Cathedral & Belfry Tower
        const baseH = height * 0.65;
        const baseGeo = new THREE.BoxGeometry(width * 0.8, baseH, depth * 0.8);
        const baseMesh = new THREE.Mesh(baseGeo, wallMat);
        baseMesh.position.y = baseH * 0.5;
        b.add(baseMesh);
        b.add(this.createOutlines(baseGeo, baseMesh.position, undefined, outlineMat));

        const belfryH = height * 0.22;
        const belfryGeo = new THREE.CylinderGeometry(width * 0.35, width * 0.38, belfryH, 8);
        const belfryMesh = new THREE.Mesh(belfryGeo, roofMat);
        belfryMesh.position.y = baseH + belfryH * 0.5;
        b.add(belfryMesh);
        b.add(this.createOutlines(belfryGeo, belfryMesh.position, undefined, outlineMat));

        const steepleH = height * 0.45;
        const steepleGeo = new THREE.ConeGeometry(width * 0.35, steepleH, 8);
        const steepleMesh = new THREE.Mesh(steepleGeo, roofMat);
        steepleMesh.position.y = baseH + belfryH + steepleH * 0.5;
        b.add(steepleMesh);
        b.add(this.createOutlines(steepleGeo, steepleMesh.position, undefined, outlineMat));

        // Corner turrets
        const pinH = belfryH * 0.7;
        for (const ox of [-1, 1]) {
          for (const oz of [-1, 1]) {
            const pinGeo = new THREE.ConeGeometry(0.6, pinH, 4);
            const pinMesh = new THREE.Mesh(pinGeo, roofMat);
            pinMesh.position.set(ox * width * 0.36, baseH + pinH * 0.5, oz * depth * 0.36);
            b.add(pinMesh);
          }
        }

        // Circular Gothic Rose Window
        const clockGeo = new THREE.RingGeometry(1.6, 2.0, 16);
        const clockMesh = new THREE.Mesh(clockGeo, this.crossHatchMat);
        clockMesh.position.set(0, baseH - 4, depth * 0.4 + 0.05);
        b.add(clockMesh);
        break;
      }

      case 'NARROW_APARTMENT': {
        // Slender 8-story urban apartment tower with fire escapes and water barrel
        const geo = new THREE.BoxGeometry(width * 0.75, height, depth * 0.75);
        const mesh = new THREE.Mesh(geo, wallMat);
        mesh.position.y = height * 0.5;
        b.add(mesh);
        b.add(this.createOutlines(geo, mesh.position, undefined, outlineMat));

        // Rooftop cedar water barrel on stilts
        const barrelR = width * 0.22;
        const barrelH = 3.6;
        const barrelGeo = new THREE.CylinderGeometry(barrelR, barrelR, barrelH, 8);
        const barrel = new THREE.Mesh(barrelGeo, this.crossHatchMat);
        barrel.position.set(0, height + 4.0, 0);
        b.add(barrel);

        const capGeo = new THREE.ConeGeometry(barrelR * 1.15, 1.8, 8);
        const cap = new THREE.Mesh(capGeo, roofMat);
        cap.position.set(0, height + 4.0 + barrelH * 0.5 + 0.9, 0);
        b.add(cap);

        this.addFireEscapes(b, width * 0.75, height, depth * 0.75);
        this.addWindowArray(b, width * 0.75, height, depth * 0.75, 0);
        break;
      }

      case 'CANTILEVER_MODERN': {
        // Avant-garde modern office tower with offset cantilevered upper volume
        const lowerH = height * 0.5;
        const lowerW = width * 0.75;
        const lowerD = depth * 0.75;
        const lowerGeo = new THREE.BoxGeometry(lowerW, lowerH, lowerD);
        const lowerMesh = new THREE.Mesh(lowerGeo, wallMat);
        lowerMesh.position.y = lowerH * 0.5;
        b.add(lowerMesh);
        b.add(this.createOutlines(lowerGeo, lowerMesh.position, undefined, outlineMat));

        // Cantilevered upper block shifted forward
        const upperH = height * 0.5;
        const upperGeo = new THREE.BoxGeometry(width * 1.15, upperH, depth * 1.15);
        const upperMesh = new THREE.Mesh(upperGeo, wallMat);
        upperMesh.position.set(width * 0.15, lowerH + upperH * 0.5, depth * 0.15);
        b.add(upperMesh);
        b.add(this.createOutlines(upperGeo, upperMesh.position, undefined, this.heavyLineMat));

        this.addWindowArray(b, lowerW, lowerH, lowerD, 0);
        break;
      }

      case 'TWIN_TOWER': {
        // Dual vertical towers connected by cross-struts
        const shaftW = width * 0.42;
        const shaftD = depth * 0.42;
        for (const side of [-1, 1]) {
          const sX = side * (width * 0.28);
          const sGeo = new THREE.BoxGeometry(shaftW, height, shaftD);
          const sMesh = new THREE.Mesh(sGeo, wallMat);
          sMesh.position.set(sX, height * 0.5, 0);
          b.add(sMesh);
          b.add(this.createOutlines(sGeo, sMesh.position, undefined, outlineMat));
        }

        // Mid-height connecting bridge
        const bGeo = new THREE.BoxGeometry(width * 0.65, 4.0, shaftD * 0.85);
        const bMesh = new THREE.Mesh(bGeo, this.crossHatchMat);
        bMesh.position.set(0, height * 0.6, 0);
        b.add(bMesh);
        b.add(this.createOutlines(bGeo, bMesh.position, undefined, outlineMat));
        break;
      }

      case 'SAWTOOTH_FACTORY': {
        // Industrial warehouse with sawtooth bays and brick smokestack
        const baseH = height * 0.45;
        const geo = new THREE.BoxGeometry(width, baseH, depth);
        const mesh = new THREE.Mesh(geo, wallMat);
        mesh.position.y = baseH * 0.5;
        b.add(mesh);
        b.add(this.createOutlines(geo, mesh.position, undefined, outlineMat));

        const bays = 3;
        const bayW = width / bays;
        for (let i = 0; i < bays; i++) {
          const toothGeo = new THREE.ConeGeometry(bayW * 0.6, 5, 3);
          toothGeo.rotateZ(Math.PI / 2);
          const tooth = new THREE.Mesh(toothGeo, roofMat);
          tooth.position.set(-width * 0.5 + i * bayW + bayW * 0.5, baseH + 2.5, 0);
          tooth.scale.set(1, 1, depth / (bayW * 0.6));
          b.add(tooth);
        }

        const stackH = height * 0.8;
        const stackGeo = new THREE.CylinderGeometry(1.4, 2.2, stackH, 10);
        const stack = new THREE.Mesh(stackGeo, wallMat);
        stack.position.set(width * 0.4, stackH * 0.5, depth * 0.3);
        b.add(stack);
        b.add(this.createOutlines(stackGeo, stack.position, undefined, outlineMat));

        // Curled pencil smoke spiral
        const smokePts: THREE.Vector3[] = [];
        const smokeLoops = 24;
        for (let s = 0; s < smokeLoops; s++) {
          const t = s / smokeLoops;
          const rad = 0.5 + t * 4.0;
          const theta = t * Math.PI * 6;
          smokePts.push(
            new THREE.Vector3(
              width * 0.4 + Math.cos(theta) * rad,
              stackH + t * 18.0,
              depth * 0.3 + Math.sin(theta) * rad
            )
          );
        }
        const smokeGeo = new THREE.BufferGeometry().setFromPoints(smokePts);
        const smokeLine = new THREE.Line(smokeGeo, this.smokeLineMat);
        b.add(smokeLine);
        break;
      }

      case 'WATER_TOWER_ROOF': {
        const baseH = height * 0.75;
        const geo = new THREE.BoxGeometry(width, baseH, depth);
        const mesh = new THREE.Mesh(geo, wallMat);
        mesh.position.y = baseH * 0.5;
        b.add(mesh);
        b.add(this.createOutlines(geo, mesh.position, undefined, outlineMat));

        const tankLegH = 6.0;
        const tankD = width * 0.45;
        const tankMesh = new THREE.Mesh(new THREE.CylinderGeometry(tankD, tankD, 5.0, 10), this.crossHatchMat);
        tankMesh.position.y = baseH + tankLegH + 2.5;
        const tankCap = new THREE.Mesh(new THREE.ConeGeometry(tankD * 1.1, 2.2, 10), roofMat);
        tankCap.position.y = baseH + tankLegH + 6.0;
        b.add(tankMesh, tankCap);
        break;
      }

      case 'ROOFTOP_HVAC_TOWER': {
        const baseH = height * 0.85;
        const geo = new THREE.BoxGeometry(width, baseH, depth);
        const mesh = new THREE.Mesh(geo, wallMat);
        mesh.position.y = baseH * 0.5;
        b.add(mesh);
        b.add(this.createOutlines(geo, mesh.position, undefined, outlineMat));

        for (let i = -1; i <= 1; i += 2) {
          const unitGeo = new THREE.BoxGeometry(width * 0.28, 2.4, depth * 0.28);
          const unit = new THREE.Mesh(unitGeo, roofMat);
          unit.position.set(i * width * 0.25, baseH + 1.2, 0);
          b.add(unit, this.createOutlines(unitGeo, unit.position, undefined, outlineMat));
        }
        break;
      }

      case 'RADIO_TOWER': {
        const towerH = height * 1.15;
        const towerW = width * 0.45;
        const baseH = towerH * 0.7;
        const pyrGeo = new THREE.ConeGeometry(towerW, baseH, 4);
        pyrGeo.rotateY(Math.PI / 4);
        const pyrWire = new THREE.LineSegments(
          new THREE.WireframeGeometry(pyrGeo),
          outlineMat
        );
        pyrWire.position.y = baseH * 0.5;
        b.add(pyrWire);

        const mastH = towerH * 0.45;
        const mastGeo = new THREE.CylinderGeometry(0.15, 0.4, mastH, 4);
        const mastMesh = new THREE.Mesh(mastGeo, this.crossHatchMat);
        mastMesh.position.y = baseH + mastH * 0.5;
        b.add(mastMesh);

        const lightGeo = new THREE.SphereGeometry(0.8, 8, 8);
        const lightMesh = new THREE.Mesh(lightGeo, this.goldAccentMat);
        lightMesh.position.y = towerH;
        b.add(lightMesh);
        break;
      }

      case 'HATCHED_MOUNTAIN_PEAK': {
        const peakH = height * 1.6;
        const peakGeo = new THREE.ConeGeometry(width * 1.4, peakH, 5);
        const peakMesh = new THREE.Mesh(peakGeo, this.crossHatchMat);
        peakMesh.position.y = peakH * 0.5;
        b.add(peakMesh, this.createOutlines(peakGeo, peakMesh.position, undefined, outlineMat));
        break;
      }

      case 'CANYON_CLIFF_WALL': {
        const cliffH = height * 1.4;
        const cliffGeo = new THREE.BoxGeometry(width * 1.5, cliffH, depth * 1.2);
        const cliff = new THREE.Mesh(cliffGeo, this.crossHatchMat);
        cliff.position.y = cliffH * 0.5;
        b.add(cliff, this.createOutlines(cliffGeo, cliff.position, undefined, outlineMat));
        break;
      }

      case 'ROCKY_SPIRE': {
        const spireH = height * 1.3;
        const sGeo = new THREE.ConeGeometry(width * 0.5, spireH, 6);
        const sMesh = new THREE.Mesh(sGeo, this.foundationMat);
        sMesh.position.y = spireH * 0.5;
        b.add(sMesh, this.createOutlines(sGeo, sMesh.position, undefined, outlineMat));
        break;
      }

      default: {
        // Modern International Grid Skyscraper
        const geo = new THREE.BoxGeometry(width, height, depth);
        const mesh = new THREE.Mesh(geo, wallMat);
        mesh.position.y = height * 0.5;
        b.add(mesh);
        b.add(this.createOutlines(geo, mesh.position, undefined, outlineMat));

        const pentH = height * 0.15;
        const pentGeo = new THREE.BoxGeometry(width * 0.5, pentH, depth * 0.5);
        const pentMesh = new THREE.Mesh(pentGeo, roofMat);
        pentMesh.position.y = height + pentH * 0.5;
        b.add(pentMesh);
        b.add(this.createOutlines(pentGeo, pentMesh.position, undefined, outlineMat));

        this.addWindowArray(b, width, height, depth, 0);
        break;
      }
    }

    // Architectural drafting construction guideline shooting skyward
    const guideH = height + randomRange(15, 35);
    const guidePts = [
      new THREE.Vector3(width * 0.5, height, depth * 0.5),
      new THREE.Vector3(width * 0.5, guideH, depth * 0.5),
    ];
    const guideGeo = new THREE.BufferGeometry().setFromPoints(guidePts);
    b.add(new THREE.Line(guideGeo, this.faintLineMat));

    b.traverse((child) => {
      child.frustumCulled = false;
    });

    return b;
  }

  // ==========================================
  // VIADUCT PIERS & ELEVATED INFRASTRUCTURE
  // ==========================================
  private spawnViaductPier(dist: number, groundY: number): void {
    const sample = this.flowPath.getSampleAtDistance(dist);
    if (!sample) return;

    const pierGroup = new THREE.Group();
    const roadY = sample.position.y - 0.25;
    const pierHeight = Math.max(12.0, roadY - groundY);
    const halfRoadW = sample.width * 0.42;

    // Left and Right columns
    const colRadius = 0.55;
    const colGeo = new THREE.CylinderGeometry(colRadius * 0.8, colRadius, pierHeight, 6);
    const leftCol = new THREE.Mesh(colGeo, this.pierMat);
    leftCol.position.set(-halfRoadW, -pierHeight * 0.5, 0);
    pierGroup.add(leftCol);

    const rightCol = new THREE.Mesh(colGeo, this.pierMat);
    rightCol.position.set(halfRoadW, -pierHeight * 0.5, 0);
    pierGroup.add(rightCol);

    // Architectural girder
    const girderW = sample.width * 1.05;
    const girderGeo = new THREE.BoxGeometry(girderW, 0.75, 1.4);
    const girder = new THREE.Mesh(girderGeo, this.pierMat);
    girder.position.set(0, -0.4, 0);
    pierGroup.add(girder);

    // Mid-span cross-truss for tall piers
    if (pierHeight > 24.0) {
      const braceGeo = new THREE.BoxGeometry(girderW * 0.9, 0.6, 1.0);
      const brace = new THREE.Mesh(braceGeo, this.pierMat);
      brace.position.set(0, -pierHeight * 0.45, 0);
      pierGroup.add(brace);
    }

    const backward = new THREE.Vector3().crossVectors(sample.right, sample.normal).normalize();
    const basisMat = new THREE.Matrix4().makeBasis(sample.right, sample.normal, backward);
    pierGroup.quaternion.setFromRotationMatrix(basisMat);
    pierGroup.position.copy(sample.position);

    this.group.add(pierGroup);
    this.viaductPiers.push({
      distance: dist,
      group: pierGroup,
    });
  }

  // ==========================================
  // DISPOSAL & CLEANUP HELPERS
  // ==========================================
  private disposeViaductPier(p: ViaductPier): void {
    this.group.remove(p.group);
    p.group.traverse((child) => {
      if ((child as THREE.Mesh).geometry) {
        (child as THREE.Mesh).geometry.dispose();
      }
    });
  }

  private disposeBuilding(b: CityBuilding): void {
    this.group.remove(b.group);
    b.group.traverse((child) => {
      if ((child as THREE.Mesh).geometry) {
        (child as THREE.Mesh).geometry.dispose();
      }
    });
  }

  private disposeStreetDetail(s: StreetDetail): void {
    this.group.remove(s.group);
    s.group.traverse((child) => {
      if ((child as THREE.Mesh).geometry) {
        (child as THREE.Mesh).geometry.dispose();
      }
    });
  }

  private disposeLandmark(l: CityLandmark): void {
    this.group.remove(l.group);
    l.group.traverse((child) => {
      if ((child as THREE.Mesh).geometry) {
        (child as THREE.Mesh).geometry.dispose();
      }
    });
  }

  private createOutlines(
    geo: THREE.BufferGeometry,
    pos: THREE.Vector3,
    scale?: THREE.Vector3,
    lineMat: THREE.LineBasicMaterial = this.graphiteLineMat
  ): THREE.LineSegments {
    const edges = new THREE.EdgesGeometry(geo);
    const wire = new THREE.LineSegments(edges, lineMat);
    wire.position.copy(pos);
    if (scale) wire.scale.copy(scale);
    wire.frustumCulled = false;
    return wire;
  }

  private addWindowArray(
    parent: THREE.Group,
    w: number,
    h: number,
    d: number,
    baseY: number
  ): void {
    const floors = Math.floor(h / 4.2);
    const bays = Math.floor(w / 3.2);
    if (floors < 2 || bays < 1) return;

    const linePts: THREE.Vector3[] = [];
    const halfW = w * 0.5;
    const halfD = d * 0.5 + 0.04;

    for (let f = 1; f < floors; f++) {
      const y = baseY + f * 4.2;
      linePts.push(new THREE.Vector3(-halfW * 0.88, y, halfD));
      linePts.push(new THREE.Vector3(halfW * 0.88, y, halfD));
    }

    for (let b = 1; b < bays; b++) {
      const x = -halfW + (b / bays) * w;
      for (let f = 0; f < floors; f++) {
        const y0 = baseY + f * 4.2 + 0.8;
        const y1 = y0 + 2.2;
        linePts.push(new THREE.Vector3(x, y0, halfD));
        linePts.push(new THREE.Vector3(x, y1, halfD));
      }
    }

    if (linePts.length > 0) {
      const gridGeo = new THREE.BufferGeometry().setFromPoints(linePts);
      const gridLines = new THREE.LineSegments(gridGeo, this.faintLineMat);
      gridLines.frustumCulled = false;
      parent.add(gridLines);
    }
  }

  private addFireEscapes(parent: THREE.Group, w: number, h: number, d: number): void {
    const floors = Math.floor(h / 5.0);
    if (floors < 2) return;

    const linePts: THREE.Vector3[] = [];
    const halfD = d * 0.5 + 0.5;
    const escapeW = w * 0.35;
    const ox = (Math.random() > 0.5 ? 1 : -1) * (w * 0.2);

    for (let f = 1; f < floors; f++) {
      const y = f * 5.0;
      linePts.push(new THREE.Vector3(ox - escapeW * 0.5, y, halfD));
      linePts.push(new THREE.Vector3(ox + escapeW * 0.5, y, halfD));

      linePts.push(new THREE.Vector3(ox - escapeW * 0.5, y + 1.2, halfD));
      linePts.push(new THREE.Vector3(ox + escapeW * 0.5, y + 1.2, halfD));

      if (f < floors - 1) {
        linePts.push(new THREE.Vector3(ox + (f % 2 === 0 ? 1 : -1) * escapeW * 0.4, y, halfD));
        linePts.push(new THREE.Vector3(ox - (f % 2 === 0 ? 1 : -1) * escapeW * 0.4, y + 5.0, halfD));
      }
    }

    const geo = new THREE.BufferGeometry().setFromPoints(linePts);
    const lines = new THREE.LineSegments(geo, this.heavyLineMat);
    lines.frustumCulled = false;
    parent.add(lines);
  }
}

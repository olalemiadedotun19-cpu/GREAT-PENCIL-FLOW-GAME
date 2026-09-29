import * as THREE from 'three';
import { CONFIG } from './config';
import { FlowPath } from './FlowPath';
import { PathSample, randomRange, randomChoice } from './utils';

interface CityBuilding {
  distance: number;
  group: THREE.Group;
}

export class CitySystem {
  public group: THREE.Group;
  private flowPath: FlowPath;
  private buildings: CityBuilding[] = [];
  private lastCityDist = -40;
  private spawnInterval = 24;

  // Shared reusable materials & textures
  private facadeMat: THREE.MeshStandardMaterial;
  private crossHatchMat: THREE.MeshStandardMaterial;
  private farHatchMat: THREE.MeshStandardMaterial;
  private foundationMat: THREE.MeshStandardMaterial;
  private graphiteLineMat: THREE.LineBasicMaterial;
  private faintLineMat: THREE.LineBasicMaterial;
  private goldAccentMat: THREE.MeshStandardMaterial;
  private smokeLineMat: THREE.LineBasicMaterial;
  private hatchTexture: THREE.CanvasTexture;
  private groundMesh: THREE.Mesh;

  constructor(flowPath: FlowPath) {
    this.flowPath = flowPath;
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

    this.graphiteLineMat = new THREE.LineBasicMaterial({
      color: CONFIG.visual.graphiteDark,
      linewidth: 1.5,
    });

    this.faintLineMat = new THREE.LineBasicMaterial({
      color: 0xa89e90,
      linewidth: 1,
      transparent: true,
      opacity: 0.45,
    });

    this.smokeLineMat = new THREE.LineBasicMaterial({
      color: 0x8a8174,
      linewidth: 1,
      transparent: true,
      opacity: 0.5,
    });

    this.goldAccentMat = new THREE.MeshStandardMaterial({
      color: 0xd4a034,
      roughness: 0.35,
      metalness: 0.7,
    });

    // Universal continuous architectural drafting desk ground plane
    const groundGeo = new THREE.PlaneGeometry(3000, 3000);
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
  }

  public applyDynamicStageVisuals(visuals: { paperColor: THREE.Color; lineColor: THREE.Color }): void {
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
      case 'notebook_lined':
        this.facadeMat.color.setHex(0xffffff);
        this.crossHatchMat.color.setHex(0x93c5fd);
        this.foundationMat.color.setHex(0xbfdbfe);
        this.graphiteLineMat.color.setHex(0x3b82f6);
        groundMat.color.setHex(0xf8fafc);
        break;
      case 'the_void':
        this.facadeMat.color.setHex(0x18181b);
        this.crossHatchMat.color.setHex(0x27272a);
        this.foundationMat.color.setHex(0x09090b);
        this.graphiteLineMat.color.setHex(0xf4f4f5);
        groundMat.color.setHex(0x09090b);
        break;
      case 'paper':
      default:
        this.facadeMat.color.setHex(0xfbf8f1);
        this.crossHatchMat.color.setHex(0x3d3731);
        this.foundationMat.color.setHex(0x2e2925);
        this.graphiteLineMat.color.setHex(0x24201c);
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
      // Paper background
      ctx.fillStyle = '#f8f4eb';
      ctx.fillRect(0, 0, 128, 128);

      // Diagonal 45-degree graphite strokes
      ctx.strokeStyle = '#2d2823';
      ctx.lineWidth = 1.6;
      const step = 8;
      for (let x = -128; x < 256; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 128, 128);
        ctx.stroke();
      }

      // Secondary cross strokes on darker areas
      ctx.strokeStyle = '#484037';
      ctx.lineWidth = 1.0;
      for (let x = 0; x < 256; x += step * 2) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x - 128, 128);
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
    this.lastCityDist = -40;
  }

  public update(playerDist: number, pencilDrawDist: number): void {
    const targetAhead = pencilDrawDist + 90;

    while (this.lastCityDist < targetAhead) {
      this.lastCityDist += this.spawnInterval;
      this.spawnCityCluster(this.lastCityDist);
    }

    // Prune distant buildings far behind player and release GPU memory
    const pruneDist = playerDist - 95;
    for (let i = this.buildings.length - 1; i >= 0; i--) {
      const b = this.buildings[i];
      if (b.distance < pruneDist) {
        this.disposeBuilding(b);
        this.buildings.splice(i, 1);
      }
    }
  }

  private disposeBuilding(b: CityBuilding): void {
    this.group.remove(b.group);
    b.group.traverse((child) => {
      if ((child as THREE.Mesh).geometry) {
        (child as THREE.Mesh).geometry.dispose();
      }
    });
  }

  /**
   * Spawns buildings on both sides with STRICT road clearance collision detection
   */
  private spawnCityCluster(dist: number): void {
    const sample = this.flowPath.getSampleAtDistance(dist);
    if (!sample) return;

    const sides = [-1, 1];
    for (const side of sides) {
      // 1 to 2 buildings at varied depth layers
      const count = Math.random() > 0.4 ? 2 : 1;
      for (let c = 0; c < count; c++) {
        // Base distance from road: minimum 32 units, reaching up to 130 units for backdrop spires
        const baseLateral = side * (randomRange(34, 65) + c * 38);
        const buildingType = this.selectBuildingType(dist, c);
        const bWidth = randomRange(10, 18);
        const bDepth = randomRange(10, 18);
        const bHeight = randomRange(26, 75);
        const bRadius = Math.max(bWidth, bDepth) * 0.72;

        // Candidate world position snapped to the immovable global Manhattan grid
        const rawX = sample.position.x + sample.right.x * baseLateral;
        const rawZ = sample.position.z + sample.right.z * baseLateral;
        const gridStep = 24.0;
        const candX = Math.round(rawX / gridStep) * gridStep;
        const candZ = Math.round(rawZ / gridStep) * gridStep;

        // Ground placement: buildings sit below track level so roller-coaster flies gracefully above & between
        const candY = Math.min(sample.position.y - 10, sample.position.y - randomRange(8, 22));

        // BULLETPROOF CLEARANCE CHECK:
        // Ensure this building never collides with ANY road segment in its vicinity
        const clearance = this.checkRoadClearance(candX, candZ, bRadius, dist);
        if (!clearance.safe) {
          // If too close to a curved road section, push building further out along grid
          if (clearance.pushVector) {
            const pushX = Math.round((candX + clearance.pushVector.x * (clearance.neededPush + 8)) / gridStep) * gridStep;
            const pushZ = Math.round((candZ + clearance.pushVector.y * (clearance.neededPush + 8)) / gridStep) * gridStep;
            // Re-verify pushed position
            const recheck = this.checkRoadClearance(pushX, pushZ, bRadius, dist);
            if (recheck.safe) {
              this.placeBuilding(pushX, candY, pushZ, dist, buildingType, bWidth, bDepth, bHeight, c > 0);
            }
          }
          continue;
        }

        this.placeBuilding(candX, candY, candZ, dist, buildingType, bWidth, bDepth, bHeight, c > 0);
      }
    }
  }

  /**
   * Verifies that candidate (bx, bz) does not penetrate or get too close to any road sample within +/- 75m
   */
  private checkRoadClearance(
    bx: number,
    bz: number,
    bRadius: number,
    centerDist: number
  ): { safe: boolean; pushVector?: THREE.Vector2; neededPush: number } {
    const minCheckDist = Math.max(0, centerDist - 75);
    const maxCheckDist = centerDist + 75;
    const step = 4.0; // sample road every 4m

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

    // Required safe buffer: building radius + half road width + 18 units margin
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

  private selectBuildingType(dist: number, layerIndex: number): string {
    // 1. Stage 1: The Sketchbook (0-500m) - minimal background, simple hand-drawn desk scenery
    if (dist < 500) {
      return randomChoice(['DOODLE_PINE_TREE', 'SKETCH_CUBE', 'DRAFTING_TRIANGLE', 'WOODEN_DESK_RULER']);
    }

    // 2. Stage 2: The Hand-Drawn City (500-1500m) - dense architectural city
    if (dist < 1500) {
      if (dist < 800) {
        return randomChoice(['BROWNSTONE_BLOCK', 'SAWTOOTH_FACTORY', 'GRID_SKYSCRAPER', 'DOODLE_PINE_TREE']);
      }
      if (layerIndex > 0) {
        return randomChoice(['CHRYSLER_TOWER', 'GOTHIC_SPIRE', 'GRID_SKYSCRAPER', 'RADIO_TOWER']);
      }
      return randomChoice([
        'CHRYSLER_TOWER',
        'GOTHIC_SPIRE',
        'GRID_SKYSCRAPER',
        'BROWNSTONE_BLOCK',
        'SAWTOOTH_FACTORY',
        'RADIO_TOWER',
      ]);
    }

    // 3. Stage 3: The Rooftops (1500-3000m) - path rises high above the skyline
    if (dist < 3000) {
      return randomChoice(['WATER_TOWER_ROOF', 'ROOFTOP_HVAC_TOWER', 'CHRYSLER_TOWER', 'RADIO_TOWER', 'GRID_SKYSCRAPER']);
    }

    // 4. Stage 4: Mountains & Canyons (3000-5000m) - city disappears into hatched mountains
    if (dist < 5000) {
      return randomChoice(['HATCHED_MOUNTAIN_PEAK', 'CANYON_CLIFF_WALL', 'ROCKY_SPIRE']);
    }

    // 5. Stage 5: Surreal Ink World (5000m+) - floating paper geometry & colossal drawing tools
    return randomChoice(['FLOATING_ORIGAMI_PLANE', 'GIANT_FLOATING_PENCIL', 'GIANT_ERASER_MONOLITH']);
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
    // Align strictly with fixed global world axes (North-South or East-West)
    bGroup.rotation.y = Math.random() > 0.5 ? 0 : Math.PI * 0.5;

    this.group.add(bGroup);
    this.buildings.push({
      distance: dist,
      group: bGroup,
    });
  }

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

    // Solid architectural foundation base extending deep downwards (75m) into the ground:
    // This physically prevents ANY building from appearing floating in mid-air!
    const plinthH = 75.0;
    const plinthGeo = new THREE.BoxGeometry(width * 1.05, plinthH, depth * 1.05);
    const plinthMesh = new THREE.Mesh(plinthGeo, this.foundationMat);
    plinthMesh.position.y = -plinthH * 0.5;
    b.add(plinthMesh);
    b.add(this.createOutlines(plinthGeo, plinthMesh.position));

    switch (type) {
      case 'CHRYSLER_TOWER': {
        // Grand Art Deco skyscraper with setback terraces and stepped radiating sunburst crown
        const tier1H = height * 0.5;
        const geo1 = new THREE.BoxGeometry(width, tier1H, depth);
        const mesh1 = new THREE.Mesh(geo1, wallMat);
        mesh1.position.y = tier1H * 0.5;
        b.add(mesh1);
        b.add(this.createOutlines(geo1, mesh1.position));

        // Tier 2 setback
        const tier2W = width * 0.72;
        const tier2D = depth * 0.72;
        const tier2H = height * 0.3;
        const geo2 = new THREE.BoxGeometry(tier2W, tier2H, tier2D);
        const mesh2 = new THREE.Mesh(geo2, wallMat);
        mesh2.position.y = tier1H + tier2H * 0.5;
        b.add(mesh2);
        b.add(this.createOutlines(geo2, mesh2.position));

        // Radiating sunburst crown arches
        const crownH = height * 0.18;
        const crownGeo = new THREE.ConeGeometry(tier2W * 0.45, crownH, 8);
        const crownMesh = new THREE.Mesh(crownGeo, roofMat);
        crownMesh.position.y = tier1H + tier2H + crownH * 0.5;
        b.add(crownMesh);
        b.add(this.createOutlines(crownGeo, crownMesh.position));

        // Chrome radio needle spire
        const spireH = height * 0.28;
        const spireGeo = new THREE.CylinderGeometry(0.12, 0.4, spireH, 6);
        const spireMesh = new THREE.Mesh(spireGeo, this.goldAccentMat);
        spireMesh.position.y = tier1H + tier2H + crownH + spireH * 0.5;
        b.add(spireMesh);

        // Windows & vertical Art Deco piers
        this.addWindowArray(b, width, tier1H, depth, 0);
        this.addWindowArray(b, tier2W, tier2H, tier2D, tier1H);
        break;
      }

      case 'GOTHIC_SPIRE': {
        // Dramatic Gothic Cathedral & Clock Tower
        const baseH = height * 0.65;
        const baseGeo = new THREE.BoxGeometry(width * 0.8, baseH, depth * 0.8);
        const baseMesh = new THREE.Mesh(baseGeo, wallMat);
        baseMesh.position.y = baseH * 0.5;
        b.add(baseMesh);
        b.add(this.createOutlines(baseGeo, baseMesh.position));

        // Octagonal Belfry
        const belfryH = height * 0.22;
        const belfryGeo = new THREE.CylinderGeometry(width * 0.35, width * 0.38, belfryH, 8);
        const belfryMesh = new THREE.Mesh(belfryGeo, roofMat);
        belfryMesh.position.y = baseH + belfryH * 0.5;
        b.add(belfryMesh);
        b.add(this.createOutlines(belfryGeo, belfryMesh.position));

        // Sharp octagonal steeple spire
        const steepleH = height * 0.45;
        const steepleGeo = new THREE.ConeGeometry(width * 0.35, steepleH, 8);
        const steepleMesh = new THREE.Mesh(steepleGeo, roofMat);
        steepleMesh.position.y = baseH + belfryH + steepleH * 0.5;
        b.add(steepleMesh);
        b.add(this.createOutlines(steepleGeo, steepleMesh.position));

        // 4 corner corner pinnacles / turrets
        const pinH = belfryH * 0.7;
        const offsets = [-1, 1];
        for (const ox of offsets) {
          for (const oz of offsets) {
            const pinGeo = new THREE.ConeGeometry(0.6, pinH, 4);
            const pinMesh = new THREE.Mesh(pinGeo, roofMat);
            pinMesh.position.set(ox * width * 0.36, baseH + pinH * 0.5, oz * depth * 0.36);
            b.add(pinMesh);
          }
        }

        // Circular Gothic Rose Window / Clock Face
        const clockGeo = new THREE.RingGeometry(1.6, 2.0, 16);
        const clockMesh = new THREE.Mesh(clockGeo, this.crossHatchMat);
        clockMesh.position.set(0, baseH - 4, depth * 0.4 + 0.05);
        b.add(clockMesh);

        // Gothic arched lancet window marks
        this.addGothicLancets(b, width * 0.8, baseH, depth * 0.8);
        break;
      }

      case 'BROWNSTONE_BLOCK': {
        // Classic metropolitan brownstone rowhouse with mansard roof and exterior fire escape stairs
        const baseH = height * 0.7;
        const geo = new THREE.BoxGeometry(width, baseH, depth);
        const mesh = new THREE.Mesh(geo, wallMat);
        mesh.position.y = baseH * 0.5;
        b.add(mesh);
        b.add(this.createOutlines(geo, mesh.position));

        // Mansard dormer roof
        const roofH = height * 0.28;
        const roofGeo = new THREE.ConeGeometry(width * 0.75, roofH, 4);
        roofGeo.rotateY(Math.PI / 4);
        const roofMesh = new THREE.Mesh(roofGeo, roofMat);
        roofMesh.position.y = baseH + roofH * 0.5;
        roofMesh.scale.set(1.0, 1.0, depth / width);
        b.add(roofMesh);
        b.add(this.createOutlines(roofGeo, roofMesh.position, roofMesh.scale));

        // Sketched chimneys
        const chim1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4, 1.2), wallMat);
        chim1.position.set(width * 0.3, baseH + roofH * 0.65, 0);
        b.add(chim1);
        b.add(this.createOutlines(chim1.geometry, chim1.position));

        const chim2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4, 1.2), wallMat);
        chim2.position.set(-width * 0.3, baseH + roofH * 0.65, 0);
        b.add(chim2);
        b.add(this.createOutlines(chim2.geometry, chim2.position));

        // Wireframe Fire Escape Balconies & Zig-Zag Stairs on front
        this.addFireEscapes(b, width, baseH, depth);
        this.addWindowArray(b, width, baseH, depth, 0);
        break;
      }

      case 'SAWTOOTH_FACTORY': {
        // Industrial sketch warehouse with sawtooth skylight bays and tall smokestack emitting pencil smoke
        const baseH = height * 0.45;
        const geo = new THREE.BoxGeometry(width, baseH, depth);
        const mesh = new THREE.Mesh(geo, wallMat);
        mesh.position.y = baseH * 0.5;
        b.add(mesh);
        b.add(this.createOutlines(geo, mesh.position));

        // 3 Sawtooth roof wedges
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

        // Tall round tapering brick smokestack
        const stackH = height * 0.8;
        const stackGeo = new THREE.CylinderGeometry(1.4, 2.2, stackH, 10);
        const stack = new THREE.Mesh(stackGeo, wallMat);
        stack.position.set(width * 0.4, stackH * 0.5, depth * 0.3);
        b.add(stack);
        b.add(this.createOutlines(stackGeo, stack.position));

        // Curled pencil smoke spiral rising from smokestack
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

      case 'RADIO_TOWER': {
        // Delicate pencil-drawn communications transmission lattice tower
        const towerH = height * 1.15;
        const towerW = width * 0.45;

        // Base pyramid truss
        const baseH = towerH * 0.7;
        const pyrGeo = new THREE.ConeGeometry(towerW, baseH, 4);
        pyrGeo.rotateY(Math.PI / 4);
        const pyrWire = new THREE.LineSegments(
          new THREE.WireframeGeometry(pyrGeo),
          this.graphiteLineMat
        );
        pyrWire.position.y = baseH * 0.5;
        b.add(pyrWire);

        // Mast needle
        const mastH = towerH * 0.45;
        const mastGeo = new THREE.CylinderGeometry(0.15, 0.4, mastH, 4);
        const mastMesh = new THREE.Mesh(mastGeo, this.crossHatchMat);
        mastMesh.position.y = baseH + mastH * 0.5;
        b.add(mastMesh);

        // Warning light sphere at pinnacle
        const lightGeo = new THREE.SphereGeometry(0.8, 8, 8);
        const lightMesh = new THREE.Mesh(lightGeo, this.goldAccentMat);
        lightMesh.position.y = towerH;
        b.add(lightMesh);

        // Guy-wire stay cables
        const guyPts: THREE.Vector3[] = [];
        const guyAngles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
        for (const a of guyAngles) {
          guyPts.push(new THREE.Vector3(0, towerH * 0.7, 0));
          guyPts.push(new THREE.Vector3(Math.cos(a) * towerW * 2.2, 0, Math.sin(a) * towerW * 2.2));
        }
        const guyGeo = new THREE.BufferGeometry().setFromPoints(guyPts);
        const guyLines = new THREE.LineSegments(guyGeo, this.faintLineMat);
        b.add(guyLines);
        break;
      }

      case 'DOODLE_PINE_TREE': {
        // Simple sketched pine tree
        const trunkH = height * 0.3;
        const trunkGeo = new THREE.CylinderGeometry(0.5, 0.7, trunkH, 6);
        const trunk = new THREE.Mesh(trunkGeo, this.crossHatchMat);
        trunk.position.y = trunkH * 0.5;
        b.add(trunk);

        // 3 tiers of conical foliage
        const tiers = 3;
        for (let i = 0; i < tiers; i++) {
          const tierH = height * 0.35;
          const tierR = (width * 0.45) * (1.0 - i * 0.22);
          const fGeo = new THREE.ConeGeometry(tierR, tierH, 6);
          const fMesh = new THREE.Mesh(fGeo, wallMat);
          fMesh.position.y = trunkH + i * (tierH * 0.55);
          b.add(fMesh, this.createOutlines(fGeo, fMesh.position));
        }
        break;
      }

      case 'SKETCH_CUBE': {
        const geo = new THREE.BoxGeometry(width * 0.8, height * 0.6, depth * 0.8);
        const mesh = new THREE.Mesh(geo, wallMat);
        mesh.position.y = height * 0.3;
        b.add(mesh, this.createOutlines(geo, mesh.position));
        break;
      }

      case 'DRAFTING_TRIANGLE': {
        const triGeo = new THREE.ConeGeometry(width * 0.8, 1.2, 3);
        triGeo.rotateX(Math.PI / 2);
        const triMesh = new THREE.Mesh(triGeo, this.farHatchMat);
        triMesh.position.y = 1.0;
        b.add(triMesh, this.createOutlines(triGeo, triMesh.position));
        break;
      }

      case 'WOODEN_DESK_RULER': {
        const rGeo = new THREE.BoxGeometry(width * 2.5, 0.8, 2.5);
        const rMesh = new THREE.Mesh(rGeo, this.crossHatchMat);
        rMesh.position.y = 0.5;
        b.add(rMesh, this.createOutlines(rGeo, rMesh.position));
        break;
      }

      case 'WATER_TOWER_ROOF': {
        const baseH = height * 0.75;
        const geo = new THREE.BoxGeometry(width, baseH, depth);
        const mesh = new THREE.Mesh(geo, wallMat);
        mesh.position.y = baseH * 0.5;
        b.add(mesh, this.createOutlines(geo, mesh.position));

        // Water tank legs
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
        b.add(mesh, this.createOutlines(geo, mesh.position));

        // HVAC Units on roof
        for (let i = -1; i <= 1; i += 2) {
          const unitGeo = new THREE.BoxGeometry(width * 0.28, 2.4, depth * 0.28);
          const unit = new THREE.Mesh(unitGeo, roofMat);
          unit.position.set(i * width * 0.25, baseH + 1.2, 0);
          b.add(unit, this.createOutlines(unitGeo, unit.position));
        }
        break;
      }

      case 'HATCHED_MOUNTAIN_PEAK': {
        // Dramatic craggy paper mountain peak
        const peakH = height * 1.6;
        const peakGeo = new THREE.ConeGeometry(width * 1.4, peakH, 5);
        const peakMesh = new THREE.Mesh(peakGeo, this.crossHatchMat);
        peakMesh.position.y = peakH * 0.5;
        b.add(peakMesh, this.createOutlines(peakGeo, peakMesh.position));

        // Secondary shoulder crag
        const shGeo = new THREE.ConeGeometry(width * 0.9, peakH * 0.65, 4);
        const shMesh = new THREE.Mesh(shGeo, wallMat);
        shMesh.position.set(width * 0.45, peakH * 0.32, width * 0.3);
        b.add(shMesh, this.createOutlines(shGeo, shMesh.position));
        break;
      }

      case 'CANYON_CLIFF_WALL': {
        // Towering vertical cliff wall
        const cliffH = height * 1.4;
        const cliffGeo = new THREE.BoxGeometry(width * 1.5, cliffH, depth * 1.2);
        const cliff = new THREE.Mesh(cliffGeo, this.crossHatchMat);
        cliff.position.y = cliffH * 0.5;
        b.add(cliff, this.createOutlines(cliffGeo, cliff.position));

        // Horizontal rock strata lines
        const strataPts: THREE.Vector3[] = [];
        for (let y = 10; y < cliffH; y += 12) {
          strataPts.push(new THREE.Vector3(-width * 0.75, y, depth * 0.61));
          strataPts.push(new THREE.Vector3(width * 0.75, y, depth * 0.61));
        }
        const strataGeo = new THREE.BufferGeometry().setFromPoints(strataPts);
        b.add(new THREE.LineSegments(strataGeo, this.graphiteLineMat));
        break;
      }

      case 'ROCKY_SPIRE': {
        const spireH = height * 1.3;
        const sGeo = new THREE.ConeGeometry(width * 0.5, spireH, 6);
        const sMesh = new THREE.Mesh(sGeo, this.foundationMat);
        sMesh.position.y = spireH * 0.5;
        b.add(sMesh, this.createOutlines(sGeo, sMesh.position));
        break;
      }

      case 'FLOATING_ORIGAMI_PLANE': {
        // Floating surreal origami sheet
        const sheetGeo = new THREE.PlaneGeometry(width * 1.2, depth * 1.2);
        sheetGeo.rotateX(-Math.PI / 3);
        const sheet = new THREE.Mesh(sheetGeo, wallMat);
        sheet.position.y = height * 0.8;
        b.add(sheet, this.createOutlines(sheetGeo, sheet.position));
        break;
      }

      case 'GIANT_FLOATING_PENCIL': {
        // Colossal upright hexagonal pencil
        const penH = height * 1.5;
        const penGeo = new THREE.CylinderGeometry(width * 0.35, width * 0.35, penH * 0.8, 6);
        const pen = new THREE.Mesh(penGeo, this.goldAccentMat);
        pen.position.y = penH * 0.4;

        const tipGeo = new THREE.ConeGeometry(width * 0.35, penH * 0.2, 6);
        const tip = new THREE.Mesh(tipGeo, this.crossHatchMat);
        tip.position.y = penH * 0.8 + penH * 0.1;

        b.add(pen, tip);
        break;
      }

      case 'GIANT_ERASER_MONOLITH': {
        const eH = height * 1.2;
        const eGeo = new THREE.BoxGeometry(width * 1.2, eH, depth * 1.0);
        const eMesh = new THREE.Mesh(eGeo, wallMat);
        eMesh.position.y = eH * 0.5;
        b.add(eMesh, this.createOutlines(eGeo, eMesh.position));
        break;
      }

      default: {
        // Modern International Grid Skyscraper
        const geo = new THREE.BoxGeometry(width, height, depth);
        const mesh = new THREE.Mesh(geo, wallMat);
        mesh.position.y = height * 0.5;
        b.add(mesh);
        b.add(this.createOutlines(geo, mesh.position));

        // Rooftop mechanical penthouse
        const pentH = height * 0.15;
        const pentGeo = new THREE.BoxGeometry(width * 0.5, pentH, depth * 0.5);
        const pentMesh = new THREE.Mesh(pentGeo, roofMat);
        pentMesh.position.y = height + pentH * 0.5;
        b.add(pentMesh);
        b.add(this.createOutlines(pentGeo, pentMesh.position));

        this.addWindowArray(b, width, height, depth, 0);
        break;
      }
    }

    // Architectural drafting construction guidelines shooting into the clouds
    const guideH = height + randomRange(15, 35);
    const guidePts = [
      new THREE.Vector3(width * 0.5, height, depth * 0.5),
      new THREE.Vector3(width * 0.5, guideH, depth * 0.5),
    ];
    const guideGeo = new THREE.BufferGeometry().setFromPoints(guidePts);
    const guideLine = new THREE.Line(guideGeo, this.faintLineMat);
    b.add(guideLine);

    b.traverse((child) => {
      child.frustumCulled = false;
    });

    return b;
  }

  private createOutlines(
    geo: THREE.BufferGeometry,
    pos: THREE.Vector3,
    scale?: THREE.Vector3
  ): THREE.LineSegments {
    const edges = new THREE.EdgesGeometry(geo);
    const wire = new THREE.LineSegments(edges, this.graphiteLineMat);
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

    // Horizontal floor dividing cornices
    for (let f = 1; f < floors; f++) {
      const y = baseY + f * 4.2;
      linePts.push(new THREE.Vector3(-halfW * 0.88, y, halfD));
      linePts.push(new THREE.Vector3(halfW * 0.88, y, halfD));
    }

    // Vertical window mullions
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

  private addGothicLancets(parent: THREE.Group, w: number, h: number, d: number): void {
    const linePts: THREE.Vector3[] = [];
    const halfW = w * 0.5;
    const halfD = d * 0.5 + 0.04;
    const tiers = 3;

    for (let t = 0; t < tiers; t++) {
      const yBase = 4 + t * (h / tiers);
      const lancetW = w * 0.18;
      const lancetH = (h / tiers) * 0.65;

      const xOffsets = [-halfW * 0.5, 0, halfW * 0.5];
      for (const ox of xOffsets) {
        // Pointed arch window outline
        linePts.push(new THREE.Vector3(ox - lancetW * 0.5, yBase, halfD));
        linePts.push(new THREE.Vector3(ox - lancetW * 0.5, yBase + lancetH * 0.7, halfD));

        linePts.push(new THREE.Vector3(ox + lancetW * 0.5, yBase, halfD));
        linePts.push(new THREE.Vector3(ox + lancetW * 0.5, yBase + lancetH * 0.7, halfD));

        linePts.push(new THREE.Vector3(ox - lancetW * 0.5, yBase + lancetH * 0.7, halfD));
        linePts.push(new THREE.Vector3(ox, yBase + lancetH, halfD));

        linePts.push(new THREE.Vector3(ox, yBase + lancetH, halfD));
        linePts.push(new THREE.Vector3(ox + lancetW * 0.5, yBase + lancetH * 0.7, halfD));
      }
    }

    const geo = new THREE.BufferGeometry().setFromPoints(linePts);
    const lines = new THREE.LineSegments(geo, this.graphiteLineMat);
    lines.frustumCulled = false;
    parent.add(lines);
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
      // Balcony platform box
      linePts.push(new THREE.Vector3(ox - escapeW * 0.5, y, halfD));
      linePts.push(new THREE.Vector3(ox + escapeW * 0.5, y, halfD));

      linePts.push(new THREE.Vector3(ox - escapeW * 0.5, y + 1.2, halfD));
      linePts.push(new THREE.Vector3(ox + escapeW * 0.5, y + 1.2, halfD));

      // Diagonal ladder to next floor
      if (f < floors - 1) {
        linePts.push(new THREE.Vector3(ox + (f % 2 === 0 ? 1 : -1) * escapeW * 0.4, y, halfD));
        linePts.push(new THREE.Vector3(ox - (f % 2 === 0 ? 1 : -1) * escapeW * 0.4, y + 5.0, halfD));
      }
    }

    const geo = new THREE.BufferGeometry().setFromPoints(linePts);
    const lines = new THREE.LineSegments(geo, this.graphiteLineMat);
    lines.frustumCulled = false;
    parent.add(lines);
  }
}

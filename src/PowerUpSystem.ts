import * as THREE from 'three';
import { CONFIG } from './config';
import { FlowPath } from './FlowPath';
import { PathSample, randomChoice } from './utils';

export interface PowerUpInstance {
  id: number;
  distance: number;
  lateralOffset: number;
  meshGroup: THREE.Group;
  active: boolean;
  baseY: number;
  ringMesh1: THREE.Object3D;
  ringMesh2: THREE.Object3D;
  crystalMesh: THREE.Object3D;
  beaconBeam: THREE.Mesh;
}

export class PowerUpSystem {
  public group: THREE.Group;
  private flowPath: FlowPath;
  private powerUps: PowerUpInstance[] = [];
  private nextId = 0;
  private lastSpawnDist = 30;
  private animTimer = 0;

  // Luminous Glowing Materials (Unmistakable, highly visible neon cyan & sunburst gold)
  private crystalMat: THREE.MeshStandardMaterial;
  private goldCapMat: THREE.MeshStandardMaterial;
  private cyanNeonMat: THREE.LineBasicMaterial;
  private goldNeonMat: THREE.LineBasicMaterial;
  private beamMat: THREE.MeshBasicMaterial;
  private auraRingMat: THREE.MeshBasicMaterial;

  constructor(flowPath: FlowPath) {
    this.flowPath = flowPath;
    this.group = new THREE.Group();

    // Vibrant glowing cyan crystal core
    this.crystalMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00a8cc,
      emissiveIntensity: 0.65,
      roughness: 0.2,
      metalness: 0.3,
    });

    // Gleaming gold brass caps
    this.goldCapMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xd4a017,
      emissiveIntensity: 0.45,
      roughness: 0.25,
      metalness: 0.85,
    });

    // Bright neon orbit rings
    this.cyanNeonMat = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      linewidth: 3,
    });

    this.goldNeonMat = new THREE.LineBasicMaterial({
      color: 0xffe066,
      linewidth: 3,
    });

    // Vertical translucent light pillar beam
    this.beamMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // Pulsing ground beacon ripple on road
    this.auraRingMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }

  public reset(): void {
    for (const pu of this.powerUps) {
      this.group.remove(pu.meshGroup);
    }
    this.powerUps = [];
    this.lastSpawnDist = 30;
    this.animTimer = 0;
  }

  public update(playerDist: number, pencilDrawDist: number, dt: number): void {
    this.animTimer += dt;

    // 1. Spawn power-ups ahead
    const maxSpawnAhead = pencilDrawDist - 8;
    const interval = CONFIG.powerUp.spawnInterval;

    while (this.lastSpawnDist + interval < maxSpawnAhead) {
      this.lastSpawnDist += interval;
      this.spawnPowerUpAt(this.lastSpawnDist);
    }

    // 2. Animate floating, counter-rotating rings and beacon pulsing
    for (const pu of this.powerUps) {
      if (!pu.active) continue;

      const sample = this.flowPath.getSampleAtDistance(pu.distance);
      if (sample) {
        // Floating hover motion strictly along world vertical Y
        const hoverY = Math.sin(this.animTimer * 4.0 + pu.id) * 0.25 + 0.95;
        const pos = sample.position
          .clone()
          .add(sample.right.clone().multiplyScalar(pu.lateralOffset));
        pos.y += hoverY;

        pu.meshGroup.position.copy(pos);
        // Ensure entire power-up group and vertical light pillar stand strictly vertical regardless of map turns
        pu.meshGroup.rotation.set(0, 0, 0);
        pu.beaconBeam.rotation.set(0, 0, 0);

        // Spin crystal
        pu.crystalMesh.rotation.y = this.animTimer * 3.5;
        pu.crystalMesh.rotation.x = Math.sin(this.animTimer * 2.0) * 0.2;

        // Counter-rotating neon gyro rings
        pu.ringMesh1.rotation.y = this.animTimer * 4.5;
        pu.ringMesh1.rotation.x = this.animTimer * 2.5;

        pu.ringMesh2.rotation.z = -this.animTimer * 4.0;
        pu.ringMesh2.rotation.y = -this.animTimer * 2.0;

        // Pulsing light pillar
        const pulse = Math.sin(this.animTimer * 6.0 + pu.id) * 0.15 + 0.85;
        pu.beaconBeam.scale.set(pulse, 1.0, pulse);
      }
    }

    // 3. Remove power-ups well behind player
    const pruneDist = playerDist - 30;
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      if (pu.distance < pruneDist) {
        this.group.remove(pu.meshGroup);
        this.powerUps.splice(i, 1);
      }
    }
  }

  private spawnPowerUpAt(dist: number): void {
    const sample = this.flowPath.getSampleAtDistance(dist);
    if (!sample) return;

    const pathW = sample.width;
    const halfW = pathW * 0.5;

    // Place at left, center, or right lane
    const laneChoice = randomChoice([-0.5, 0, 0.5]);
    const lateralOffset = laneChoice * (halfW - 2.0);

    const puGroup = new THREE.Group();

    // 1. Vertical Translucent Light Pillar Beam (Pillar stands strictly vertical into the sky)
    const beamGeo = new THREE.CylinderGeometry(0.7, 1.0, 16.0, 16, 1, true);
    beamGeo.translate(0, 8.0, 0);
    const beaconBeam = new THREE.Mesh(beamGeo, this.beamMat);
    puGroup.add(beaconBeam);

    // 2. Pulsing Ground Beacon Rings on the road surface
    const rippleGeo = new THREE.RingGeometry(0.7, 1.15, 20);
    rippleGeo.rotateX(-Math.PI / 2);
    rippleGeo.translate(0, -0.75, 0);
    const rippleMesh = new THREE.Mesh(rippleGeo, this.auraRingMat);
    puGroup.add(rippleMesh);

    // 3. Floating Cyan Crystal Core (Faceted Diamond Gem)
    const crystalGeo = new THREE.OctahedronGeometry(0.55, 1);
    const crystalMesh = new THREE.Mesh(crystalGeo, this.crystalMat);
    crystalMesh.castShadow = true;
    puGroup.add(crystalMesh);

    // Top and Bottom Gold Refill Caps (Pencil lead clutch container tips)
    const capTopGeo = new THREE.ConeGeometry(0.25, 0.45, 8);
    capTopGeo.translate(0, 0.65, 0);
    const capTop = new THREE.Mesh(capTopGeo, this.goldCapMat);
    crystalMesh.add(capTop);

    const capBtmGeo = new THREE.ConeGeometry(0.25, 0.45, 8);
    capBtmGeo.rotateX(Math.PI);
    capBtmGeo.translate(0, -0.65, 0);
    const capBtm = new THREE.Mesh(capBtmGeo, this.goldCapMat);
    crystalMesh.add(capBtm);

    // 4. Counter-Rotating Gyroscopic Neon Rings
    // Ring 1 (Cyan)
    const ring1Pts: THREE.Vector3[] = [];
    const segs = 24;
    const rad1 = 0.95;
    for (let s = 0; s <= segs; s++) {
      const th = (s / segs) * Math.PI * 2;
      ring1Pts.push(new THREE.Vector3(Math.cos(th) * rad1, 0, Math.sin(th) * rad1));
    }
    const ring1Geo = new THREE.BufferGeometry().setFromPoints(ring1Pts);
    const ringMesh1 = new THREE.Line(ring1Geo, this.cyanNeonMat);
    ringMesh1.rotation.x = Math.PI / 4;
    puGroup.add(ringMesh1);

    // Ring 2 (Sunburst Gold)
    const ring2Pts: THREE.Vector3[] = [];
    const rad2 = 0.78;
    for (let s = 0; s <= segs; s++) {
      const th = (s / segs) * Math.PI * 2;
      ring2Pts.push(new THREE.Vector3(Math.cos(th) * rad2, 0, Math.sin(th) * rad2));
    }
    const ring2Geo = new THREE.BufferGeometry().setFromPoints(ring2Pts);
    const ringMesh2 = new THREE.Line(ring2Geo, this.goldNeonMat);
    ringMesh2.rotation.z = Math.PI / 3;
    puGroup.add(ringMesh2);

    // 5. Floating 3D Lightning Icon Badge hovering directly above
    const boltPts = [
      new THREE.Vector3(0, 0.65, 0),
      new THREE.Vector3(-0.25, 0.15, 0),
      new THREE.Vector3(0.05, 0.15, 0),
      new THREE.Vector3(-0.15, -0.45, 0),
      new THREE.Vector3(0.3, -0.05, 0),
      new THREE.Vector3(0.05, -0.05, 0),
      new THREE.Vector3(0.25, 0.65, 0),
    ];
    const boltGeo = new THREE.BufferGeometry().setFromPoints(boltPts);
    const boltLine = new THREE.Line(boltGeo, this.goldNeonMat);
    boltLine.position.y = 1.15;
    puGroup.add(boltLine);

    puGroup.traverse((child) => {
      child.frustumCulled = false;
    });

    const pu: PowerUpInstance = {
      id: this.nextId++,
      distance: dist,
      lateralOffset,
      meshGroup: puGroup,
      active: true,
      baseY: 0.85,
      ringMesh1,
      ringMesh2,
      crystalMesh,
      beaconBeam,
    };

    this.group.add(puGroup);
    this.powerUps.push(pu);
  }

  public checkCollection(
    playerDist: number,
    lateralOffset: number,
    jumpHeight: number
  ): PowerUpInstance | null {
    for (let i = 0; i < this.powerUps.length; i++) {
      const pu = this.powerUps[i];
      if (!pu.active) continue;

      const dDist = Math.abs(playerDist - pu.distance);
      const dLat = Math.abs(lateralOffset - pu.lateralOffset);

      // Generous collection radius
      if (dDist < 1.6 && dLat < 1.5 && jumpHeight < 2.5) {
        pu.active = false;
        this.group.remove(pu.meshGroup);
        this.powerUps.splice(i, 1);
        return pu;
      }
    }
    return null;
  }
}

import * as THREE from 'three';
import { FlowPath } from './FlowPath';
import { PathSample, randomChoice, randomRange } from './utils';
import {
  PowerUpDefinition,
  POWER_UP_CATALOGUE,
  getPowerUpDefinition,
} from './PowerUpCatalogue';
import { PencilStyleDefinition } from './PencilStyleSystem';

export interface PowerUpInstance {
  id: number;
  definition: PowerUpDefinition;
  distance: number;
  lateralOffset: number;
  meshGroup: THREE.Group;
  active: boolean;
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
  private lastSpawnDist = 45;
  private animTimer = 0;

  // Intelligent Power-Up Director state
  private recentSpawns: string[] = [];
  private speedBoostCooldown = 0; // Prevent speed boost spam
  private spawnIntervalBase = 62; // Balanced interval between power-up events
  private activeUnlockedPool: string[] = [];

  // Geometries for multi-tier visual identities
  private octaGeo: THREE.OctahedronGeometry;
  private dodecaGeo: THREE.DodecahedronGeometry;
  private icosaGeo: THREE.IcosahedronGeometry;
  private ringGeo: THREE.TorusGeometry;
  private beamGeo: THREE.CylinderGeometry;

  // Shared base materials
  private beamMat: THREE.MeshBasicMaterial;

  constructor(flowPath: FlowPath) {
    this.flowPath = flowPath;
    this.group = new THREE.Group();

    // Geometries
    this.octaGeo = new THREE.OctahedronGeometry(0.55, 0);
    this.dodecaGeo = new THREE.DodecahedronGeometry(0.52, 0);
    this.icosaGeo = new THREE.IcosahedronGeometry(0.56, 0);
    this.ringGeo = new THREE.TorusGeometry(0.85, 0.035, 8, 28);

    this.beamGeo = new THREE.CylinderGeometry(0.65, 0.95, 14.0, 16, 1, true);
    this.beamGeo.translate(0, 7.0, 0);

    this.beamMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // Default unlocked pool
    this.activeUnlockedPool = Object.keys(POWER_UP_CATALOGUE).filter(
      (k) => POWER_UP_CATALOGUE[k].unlockedByDefault
    );
  }

  public setUnlockedPool(unlockedIds: string[]): void {
    const valid = unlockedIds.filter((id) => POWER_UP_CATALOGUE[id]);
    this.activeUnlockedPool = valid.length > 0 ? valid : ['speed_boost', 'sketch_shield', 'score_mult', 'graphite_magnet'];
  }

  public applyPencilStyle(style: PencilStyleDefinition): void {
    if (this.beamMat) {
      this.beamMat.color.setHex(style.accentColor);
    }
  }

  public reset(): void {
    for (const pu of this.powerUps) {
      this.group.remove(pu.meshGroup);
    }
    this.powerUps = [];
    this.lastSpawnDist = 45;
    this.animTimer = 0;
    this.recentSpawns = [];
    this.speedBoostCooldown = 0;
  }

  public update(playerDist: number, pencilDrawDist: number, dt: number): void {
    this.animTimer += dt;
    if (this.speedBoostCooldown > 0) this.speedBoostCooldown -= dt;

    // 1. Spawning Director ahead of player
    const maxSpawnAhead = pencilDrawDist - 12;
    // Dynamic interval based on distance: slightly closer as run advances
    const dynamicInterval = Math.max(50, this.spawnIntervalBase - Math.min(15, playerDist / 200));

    while (this.lastSpawnDist + dynamicInterval < maxSpawnAhead) {
      this.lastSpawnDist += dynamicInterval;
      this.spawnDirectorPowerUp(this.lastSpawnDist, playerDist);
    }

    // 2. Animate hovering crystals, counter-rotating gyro rings, and vertical light beams
    for (const pu of this.powerUps) {
      if (!pu.active) continue;

      const sample = this.flowPath.getSampleAtDistance(pu.distance);
      if (sample) {
        const hoverY = Math.sin(this.animTimer * 3.5 + pu.id) * 0.22 + 0.95;
        const pos = sample.position
          .clone()
          .add(sample.right.clone().multiplyScalar(pu.lateralOffset));
        pos.y += hoverY;

        pu.meshGroup.position.copy(pos);
        pu.meshGroup.rotation.set(0, 0, 0);

        // Spin crystal
        pu.crystalMesh.rotation.y = this.animTimer * 2.8;
        pu.crystalMesh.rotation.x = Math.sin(this.animTimer * 1.8) * 0.2;

        // Counter-rotating rings
        pu.ringMesh1.rotation.y = this.animTimer * 3.6;
        pu.ringMesh1.rotation.x = this.animTimer * 2.2;
        pu.ringMesh2.rotation.z = -this.animTimer * 3.2;
        pu.ringMesh2.rotation.y = -this.animTimer * 1.8;

        // Pulsing beam
        const pulse = Math.sin(this.animTimer * 5.0 + pu.id) * 0.15 + 0.85;
        pu.beaconBeam.scale.set(pulse, 1.0, pulse);
      }
    }

    // 3. Prune power-ups passed by player
    const pruneDist = playerDist - 30;
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      if (pu.distance < pruneDist) {
        this.group.remove(pu.meshGroup);
        this.powerUps.splice(i, 1);
      }
    }
  }

  /**
   * Intelligent Director: chooses power-ups with variety, rarity weighting, and cooldowns
   */
  private spawnDirectorPowerUp(dist: number, playerDist: number): void {
    const sample = this.flowPath.getSampleAtDistance(dist);
    if (!sample) return;

    // Pick rarity
    const roll = Math.random();
    let targetRarity = 'COMMON';
    if (roll < 0.06 && playerDist > 150) targetRarity = 'LEGENDARY';
    else if (roll < 0.22 && playerDist > 80) targetRarity = 'EPIC';
    else if (roll < 0.58) targetRarity = 'RARE';
    else targetRarity = 'COMMON';

    // Candidate pool: unlocked abilities matching rarity (or fallback to any unlocked)
    let candidates = this.activeUnlockedPool.filter((id) => {
      const def = POWER_UP_CATALOGUE[id];
      return def && def.rarity === targetRarity;
    });

    if (candidates.length === 0) {
      candidates = this.activeUnlockedPool;
    }

    // Filter out recent spawns to guarantee diversity
    let filtered = candidates.filter((id) => !this.recentSpawns.includes(id));
    if (filtered.length === 0) filtered = candidates;

    // Throttle speed boost so it is no longer the sole repetitive power-up
    if (this.speedBoostCooldown > 0) {
      filtered = filtered.filter((id) => id !== 'speed_boost');
      if (filtered.length === 0) filtered = candidates.filter((id) => id !== 'speed_boost');
    }

    const chosenId = randomChoice(filtered) || 'sketch_shield';
    const def = getPowerUpDefinition(chosenId);

    // Track spawn
    this.recentSpawns.push(chosenId);
    if (this.recentSpawns.length > 5) this.recentSpawns.shift();
    if (chosenId === 'speed_boost') this.speedBoostCooldown = 25.0; // 25s cooldown before speed boost can appear again!

    // Position across 3 lanes
    const halfW = sample.width * 0.5;
    const laneChoice = randomChoice([-0.5, 0, 0.5]);
    const lateralOffset = laneChoice * (halfW - 2.0);

    const puGroup = new THREE.Group();

    // 1. Vertical Light Pillar
    const beamMatInstance = this.beamMat.clone();
    beamMatInstance.color.set(def.colorHex);
    const beaconBeam = new THREE.Mesh(this.beamGeo, beamMatInstance);
    puGroup.add(beaconBeam);

    // 2. Crystal Core Geometry based on rarity
    let coreGeo: THREE.BufferGeometry = this.octaGeo;
    if (def.rarity === 'LEGENDARY' || def.rarity === 'EPIC') {
      coreGeo = this.icosaGeo;
    } else if (def.rarity === 'RARE') {
      coreGeo = this.dodecaGeo;
    }

    const crystalMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(def.colorHex),
      emissive: new THREE.Color(def.emissiveHex),
      emissiveIntensity: 0.65,
      roughness: 0.25,
      metalness: 0.45,
    });
    const crystalMesh = new THREE.Mesh(coreGeo, crystalMat);
    crystalMesh.castShadow = true;
    puGroup.add(crystalMesh);

    // 3. Counter-rotating holographic Gyro Orbit Rings
    const ringMat1 = new THREE.LineBasicMaterial({
      color: new THREE.Color(def.colorHex),
      linewidth: 2,
    });
    const ringMesh1 = new THREE.LineSegments(new THREE.EdgesGeometry(this.ringGeo), ringMat1);
    puGroup.add(ringMesh1);

    const ringMat2 = new THREE.LineBasicMaterial({
      color: new THREE.Color(def.emissiveHex),
      linewidth: 2,
    });
    const ringMesh2 = new THREE.LineSegments(new THREE.EdgesGeometry(this.ringGeo), ringMat2);
    ringMesh2.scale.set(0.8, 0.8, 0.8);
    puGroup.add(ringMesh2);

    // 4. Ground Contact Ripple Ring
    const groundRingGeo = new THREE.RingGeometry(0.8, 0.95, 24);
    groundRingGeo.rotateX(-Math.PI / 2);
    const groundRingMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(def.colorHex),
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const groundRing = new THREE.Mesh(groundRingGeo, groundRingMat);
    groundRing.position.y = 0.04;
    puGroup.add(groundRing);

    puGroup.position.set(sample.position.x, sample.position.y + 0.9, sample.position.z);
    this.group.add(puGroup);

    this.powerUps.push({
      id: this.nextId++,
      definition: def,
      distance: dist,
      lateralOffset,
      meshGroup: puGroup,
      active: true,
      ringMesh1,
      ringMesh2,
      crystalMesh,
      beaconBeam,
    });
  }

  public checkCollection(
    playerDist: number,
    playerLateral: number,
    jumpHeight = 0
  ): PowerUpInstance | null {
    for (const pu of this.powerUps) {
      if (!pu.active) continue;

      const distDelta = Math.abs(pu.distance - playerDist);
      const lateralDelta = Math.abs(pu.lateralOffset - playerLateral);

      if (distDelta < 2.5 && lateralDelta < 1.7 && jumpHeight < 3.0) {
        pu.active = false;
        this.group.remove(pu.meshGroup);
        return pu;
      }
    }
    return null;
  }

  public checkCollisions(
    playerDist: number,
    playerLateral: number,
    radius: number
  ): PowerUpDefinition | null {
    for (const pu of this.powerUps) {
      if (!pu.active) continue;

      const distDelta = Math.abs(pu.distance - playerDist);
      const lateralDelta = Math.abs(pu.lateralOffset - playerLateral);

      if (distDelta < 2.2 && lateralDelta < radius + 1.25) {
        pu.active = false;
        this.group.remove(pu.meshGroup);
        return pu.definition;
      }
    }
    return null;
  }
}

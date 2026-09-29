import * as THREE from 'three';
import { FlowPath } from './FlowPath';
import { LANES } from './ObstacleSystem';
import { randomChoice, randomRange } from './utils';

export interface GraphitePiece {
  id: number;
  distance: number;
  lateralOffset: number;
  height: number;
  mesh: THREE.Mesh;
  active: boolean;
  collected: boolean;
  baseY: number;
}

export class CollectibleSystem {
  public group: THREE.Group;
  private flowPath: FlowPath;
  private items: GraphitePiece[] = [];
  private nextId = 0;
  private lastSpawnDist = 20;
  private animTimer = 0;

  // Graphite shard geometry and materials
  private shardGeo: THREE.OctahedronGeometry;
  private graphiteMat: THREE.MeshStandardMaterial;
  private haloMat: THREE.MeshBasicMaterial;

  constructor(flowPath: FlowPath) {
    this.flowPath = flowPath;
    this.group = new THREE.Group();

    // Sharp, faceted diamond/octahedron crystal shard (size ~0.45m)
    this.shardGeo = new THREE.OctahedronGeometry(0.38, 0);

    // Deep graphite with metallic specular highlights and dark outline
    this.graphiteMat = new THREE.MeshStandardMaterial({
      color: 0x2b2723,
      emissive: 0x443e39,
      emissiveIntensity: 0.35,
      roughness: 0.3,
      metalness: 0.85,
    });

    this.haloMat = new THREE.MeshBasicMaterial({
      color: 0x6e655c,
      transparent: true,
      opacity: 0.3,
      wireframe: true,
    });
  }

  public reset(): void {
    for (const item of this.items) {
      this.group.remove(item.mesh);
    }
    this.items = [];
    this.lastSpawnDist = 20;
    this.animTimer = 0;
  }

  public update(playerDist: number, pencilDrawDist: number, dt: number): void {
    this.animTimer += dt;

    // Spawn ahead up to pencil draw distance
    const maxSpawnAhead = Math.min(pencilDrawDist + 15, playerDist + 75);
    const spawnInterval = 18.0;

    while (this.lastSpawnDist + spawnInterval < maxSpawnAhead) {
      this.lastSpawnDist += spawnInterval;
      this.spawnPatternAt(this.lastSpawnDist);
    }

    // Animate & position shards
    for (const item of this.items) {
      if (!item.active || item.collected) continue;

      // Visibility: Only visible once the pencil has sketched up to this point!
      item.mesh.visible = pencilDrawDist >= item.distance - 2.0;
      if (!item.mesh.visible) continue;

      // Spin & bob
      item.mesh.rotation.y += dt * 3.5;
      item.mesh.rotation.x = Math.sin(this.animTimer * 4.0 + item.id) * 0.25;

      const sample = this.flowPath.getSampleAtDistance(item.distance);
      if (sample) {
        const bob = Math.sin(this.animTimer * 5.0 + item.id * 0.7) * 0.12;
        const totalHeight = item.baseY + bob;

        item.mesh.position.copy(sample.position)
          .addScaledVector(sample.right, item.lateralOffset)
          .addScaledVector(sample.normal, totalHeight);

        item.mesh.quaternion.setFromAxisAngle(sample.normal, this.animTimer * 2.0 + item.id);
      }
    }

    // Prune past items
    const pruneDist = playerDist - 30;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      if (item.distance < pruneDist) {
        this.group.remove(item.mesh);
        this.items.splice(i, 1);
      }
    }
  }

  private spawnPatternAt(centerDist: number): void {
    const patterns = ['LINE', 'ARC', 'ZIGZAG', 'RISKY', 'JUMP_TRAIL'];
    const pat = randomChoice(patterns);

    switch (pat) {
      case 'LINE': {
        const lane = randomChoice([LANES.LEFT, LANES.CENTER, LANES.RIGHT]);
        for (let i = 0; i < 4; i++) {
          this.createPiece(centerDist + i * 3.2, lane, 0.6);
        }
        break;
      }
      case 'ARC': {
        // Sweeps across from one lane to another
        const startLane = randomChoice([LANES.LEFT, LANES.RIGHT]);
        const endLane = -startLane;
        for (let i = 0; i < 5; i++) {
          const t = i / 4;
          const lane = THREE.MathUtils.lerp(startLane, endLane, t);
          this.createPiece(centerDist + i * 2.8, lane, 0.65);
        }
        break;
      }
      case 'ZIGZAG': {
        const lanes = [LANES.LEFT, LANES.CENTER, LANES.RIGHT, LANES.CENTER];
        lanes.forEach((lane, i) => {
          this.createPiece(centerDist + i * 3.0, lane, 0.6);
        });
        break;
      }
      case 'RISKY': {
        // Along the edge of the track (risk/reward near margins)
        const edgeSide = randomChoice([-1, 1]);
        const edgeOffset = edgeSide * 4.6;
        for (let i = 0; i < 3; i++) {
          this.createPiece(centerDist + i * 3.5, edgeOffset, 0.6);
        }
        break;
      }
      case 'JUMP_TRAIL': {
        // High in the air to reward jumping
        const lane = randomChoice([LANES.LEFT, LANES.CENTER, LANES.RIGHT]);
        for (let i = 0; i < 4; i++) {
          const t = i / 3;
          const h = 0.8 + Math.sin(t * Math.PI) * 1.8; // Arc up to 2.6m high
          this.createPiece(centerDist + i * 2.8, lane, h);
        }
        break;
      }
    }
  }

  private createPiece(distance: number, lateralOffset: number, height: number): void {
    const mesh = new THREE.Mesh(this.shardGeo, this.graphiteMat);
    mesh.castShadow = true;
    mesh.visible = false; // Initially hidden until pencil reaches distance!

    // Wireframe outline for hand-drawn sketch feel
    const wire = new THREE.Mesh(this.shardGeo, this.haloMat);
    wire.scale.set(1.15, 1.15, 1.15);
    mesh.add(wire);

    this.group.add(mesh);

    this.items.push({
      id: this.nextId++,
      distance,
      lateralOffset,
      height,
      mesh,
      active: true,
      collected: false,
      baseY: height,
    });
  }

  public checkCollection(
    playerDist: number,
    playerOffset: number,
    playerJump: number
  ): GraphitePiece | null {
    const reachDepth = 1.35;
    const reachWidth = 1.2;
    const reachHeight = 1.4;

    for (const item of this.items) {
      if (!item.active || item.collected || !item.mesh.visible) continue;

      const dDist = Math.abs(playerDist - item.distance);
      if (dDist > reachDepth) continue;

      const dOffset = Math.abs(playerOffset - item.lateralOffset);
      if (dOffset > reachWidth) continue;

      const dHeight = Math.abs(playerJump - (item.baseY - 0.6));
      if (dHeight > reachHeight) continue;

      // Collected!
      item.collected = true;
      item.active = false;
      this.group.remove(item.mesh);
      return item;
    }

    return null;
  }
}

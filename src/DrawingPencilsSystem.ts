import * as THREE from 'three';
import { Pencil } from './Pencil';
import { EnvironmentalPencil } from './EnvironmentalPencil';
import { DrawingQueue, DrawableTask } from './DrawingQueue';
import { FlowPath } from './FlowPath';
import { PencilStyleDefinition } from './PencilStyleSystem';

export class DrawingPencilsSystem {
  public group: THREE.Group;
  public primaryPencil: Pencil;
  public leftPencil: EnvironmentalPencil;
  public rightPencil: EnvironmentalPencil;
  public drawingQueue: DrawingQueue;

  private flowPath: FlowPath;

  // Particle emission hook to connect to Effects system
  public onEmitParticles?: (pos: THREE.Vector3, isShaving: boolean) => void;

  constructor(flowPath: FlowPath, primaryPencil: Pencil) {
    this.flowPath = flowPath;
    this.primaryPencil = primaryPencil;
    this.group = new THREE.Group();

    this.drawingQueue = new DrawingQueue();
    this.leftPencil = new EnvironmentalPencil('LEFT');
    this.rightPencil = new EnvironmentalPencil('RIGHT');

    this.group.add(this.leftPencil.group);
    this.group.add(this.rightPencil.group);

    // Wire particle emissions
    this.leftPencil.onEmitParticles = (pos, isShaving) => {
      if (this.onEmitParticles) this.onEmitParticles(pos, isShaving);
    };
    this.rightPencil.onEmitParticles = (pos, isShaving) => {
      if (this.onEmitParticles) this.onEmitParticles(pos, isShaving);
    };
  }

  public applyPencilStyle(style: PencilStyleDefinition): void {
    this.primaryPencil.applyPencilStyle(style);
    this.leftPencil.applyPencilStyle(style);
    this.rightPencil.applyPencilStyle(style);
  }

  public reset(): void {
    this.drawingQueue.clear();
  }

  public update(playerDist: number, pencilDrawDist: number, dt: number): void {
    // 1. Lead positions for environmental pencils:
    // Left and right pencils travel ahead of player (playerDist + 8m to 35m)
    // searching for and sketching roadside geometry
    const leftSearchDist = playerDist + 16.0;
    const rightSearchDist = playerDist + 22.0;

    // 2. Assign tasks from queue if idle
    if (!this.leftPencil.getActiveTask()) {
      const task = this.drawingQueue.getNextTask('LEFT', leftSearchDist, 38);
      if (task) this.leftPencil.assignTask(task);
    }

    if (!this.rightPencil.getActiveTask()) {
      const task = this.drawingQueue.getNextTask('RIGHT', rightSearchDist, 38);
      if (task) this.rightPencil.assignTask(task);
    }

    // 3. Update left environmental pencil
    const leftSample = this.flowPath.getSampleAtDistance(leftSearchDist);
    this.leftPencil.update(dt, leftSample, leftSearchDist, (completedTask) => {
      this.drawingQueue.completeTask(completedTask);
    });

    // 4. Update right environmental pencil
    const rightSample = this.flowPath.getSampleAtDistance(rightSearchDist);
    this.rightPencil.update(dt, rightSample, rightSearchDist, (completedTask) => {
      this.drawingQueue.completeTask(completedTask);
    });

    // 5. Prune tasks that are well behind the player
    this.drawingQueue.prunePassed(playerDist - 40);
  }
}

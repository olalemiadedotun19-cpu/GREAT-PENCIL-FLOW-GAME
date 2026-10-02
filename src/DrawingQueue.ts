import * as THREE from 'three';

export type DrawingState = 'UNDRAWN' | 'SKETCHING' | 'PARTIALLY_DRAWN' | 'COMPLETED';

export interface DrawableTask {
  id: string;
  side: 'LEFT' | 'RIGHT' | 'PRIMARY';
  type:
    | 'TREE'
    | 'STREETLIGHT'
    | 'BUILDING'
    | 'VIADUCT_PIER'
    | 'BRIDGE_ARCH'
    | 'BARRIER'
    | 'SIGN'
    | 'LANDMARK';
  distance: number;
  worldPos: THREE.Vector3;
  /**
   * 3D stroke path that the pencil tip physically traverses from start to finish
   */
  strokePoints: THREE.Vector3[];
  progress: number; // 0.0 to 1.0
  state: DrawingState;
  /**
   * Called continuously as the pencil moves along the stroke to reveal geometry
   */
  onProgressUpdate: (progress: number, currentTipPos: THREE.Vector3) => void;
  onComplete: () => void;
}

export class DrawingQueue {
  private leftQueue: DrawableTask[] = [];
  private rightQueue: DrawableTask[] = [];
  private activeLeftTask: DrawableTask | null = null;
  private activeRightTask: DrawableTask | null = null;

  public addTask(task: DrawableTask): void {
    if (task.side === 'LEFT') {
      this.leftQueue.push(task);
      this.leftQueue.sort((a, b) => a.distance - b.distance);
    } else if (task.side === 'RIGHT') {
      this.rightQueue.push(task);
      this.rightQueue.sort((a, b) => a.distance - b.distance);
    }
  }

  public getNextTask(side: 'LEFT' | 'RIGHT', currentDistance: number, maxLookahead = 40): DrawableTask | null {
    const queue = side === 'LEFT' ? this.leftQueue : this.rightQueue;
    const active = side === 'LEFT' ? this.activeLeftTask : this.activeRightTask;

    if (active && active.state === 'SKETCHING') {
      return active;
    }

    // Find closest task within lookahead range
    for (let i = 0; i < queue.length; i++) {
      const task = queue[i];
      if (task.state === 'UNDRAWN' && task.distance >= currentDistance - 5 && task.distance <= currentDistance + maxLookahead) {
        if (side === 'LEFT') this.activeLeftTask = task;
        else this.activeRightTask = task;
        task.state = 'SKETCHING';
        return task;
      }
    }

    return null;
  }

  public completeTask(task: DrawableTask): void {
    task.state = 'COMPLETED';
    task.progress = 1.0;
    task.onComplete();

    if (task.side === 'LEFT') {
      if (this.activeLeftTask === task) this.activeLeftTask = null;
      const idx = this.leftQueue.indexOf(task);
      if (idx !== -1) this.leftQueue.splice(idx, 1);
    } else if (task.side === 'RIGHT') {
      if (this.activeRightTask === task) this.activeRightTask = null;
      const idx = this.rightQueue.indexOf(task);
      if (idx !== -1) this.rightQueue.splice(idx, 1);
    }
  }

  public prunePassed(minDistance: number): void {
    const filterFn = (task: DrawableTask) => {
      if (task.distance < minDistance) {
        if (task.state !== 'COMPLETED') {
          // If player zoomed past before it was finished, complete it cleanly
          task.progress = 1.0;
          task.state = 'COMPLETED';
          task.onComplete();
        }
        return false;
      }
      return true;
    };

    this.leftQueue = this.leftQueue.filter(filterFn);
    this.rightQueue = this.rightQueue.filter(filterFn);

    if (this.activeLeftTask && this.activeLeftTask.distance < minDistance) {
      this.activeLeftTask = null;
    }
    if (this.activeRightTask && this.activeRightTask.distance < minDistance) {
      this.activeRightTask = null;
    }
  }

  public clear(): void {
    this.leftQueue = [];
    this.rightQueue = [];
    this.activeLeftTask = null;
    this.activeRightTask = null;
  }
}

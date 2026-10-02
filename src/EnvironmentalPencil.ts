import * as THREE from 'three';
import { PathSample } from './utils';
import { PencilStyleDefinition } from './PencilStyleSystem';
import { DrawableTask } from './DrawingQueue';

export class EnvironmentalPencil {
  public group: THREE.Group;
  public side: 'LEFT' | 'RIGHT';

  private tipMesh: THREE.Mesh;
  private woodConeMesh: THREE.Mesh;
  private bodyMesh: THREE.Mesh;
  private ferruleMesh: THREE.Mesh;
  private eraserMesh: THREE.Mesh;
  private brandMesh: THREE.Mesh;
  private leadStrokeLine: THREE.Line;
  private strokePositions: Float32Array;

  // Animation & Positioning
  private animTimer = 0;
  private currentTipWorld = new THREE.Vector3();
  private targetTipWorld = new THREE.Vector3();
  private activeTask: DrawableTask | null = null;
  private taskProgress = 0;
  private drawingSpeed = 2.4; // Progression speed along stroke points
  private shoulderOffset = 0; // Distance to the side of the road

  // Scratch vectors
  private _pencilAxis = new THREE.Vector3();
  private _defaultY = new THREE.Vector3(0, 1, 0);
  private _quat = new THREE.Quaternion();
  private _strokeDelta = new THREE.Vector3();

  // Particle emission callback
  public onEmitParticles?: (pos: THREE.Vector3, isShaving: boolean) => void;

  constructor(side: 'LEFT' | 'RIGHT') {
    this.side = side;
    this.group = new THREE.Group();

    // Scale pencil: nimble, agile environmental artist instrument
    const radius = 0.22;
    const leadH = 0.32;
    const woodH = 0.65;
    const bodyH = 2.1;
    const ferruleH = 0.38;
    const eraserH = 0.42;

    // 1. Glossy Graphite Lead Tip
    const leadGeo = new THREE.ConeGeometry(0.08, leadH, 10);
    leadGeo.translate(0, leadH * 0.5, 0);
    const leadMat = new THREE.MeshStandardMaterial({
      color: 0x181615,
      roughness: 0.3,
      metalness: 0.8,
    });
    this.tipMesh = new THREE.Mesh(leadGeo, leadMat);
    this.tipMesh.castShadow = true;
    this.group.add(this.tipMesh);

    // 2. Carved Cedar Wood Cone
    const woodGeo = new THREE.CylinderGeometry(radius, 0.08, woodH, 10);
    woodGeo.translate(0, leadH + woodH * 0.5, 0);
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0xead9b6,
      roughness: 0.85,
      metalness: 0.0,
    });
    this.woodConeMesh = new THREE.Mesh(woodGeo, woodMat);
    this.woodConeMesh.castShadow = true;
    this.group.add(this.woodConeMesh);

    // Scalloped lacquer trim ring
    const scallopGeo = new THREE.RingGeometry(radius * 0.98, radius * 1.02, 10);
    scallopGeo.rotateX(-Math.PI / 2);
    scallopGeo.translate(0, leadH + woodH, 0);
    const scallopMat = new THREE.MeshBasicMaterial({ color: 0x3d352e });
    this.group.add(new THREE.Mesh(scallopGeo, scallopMat));

    // 3. Hexagonal Pencil Body
    const bodyGeo = new THREE.CylinderGeometry(radius, radius, bodyH, 6);
    bodyGeo.translate(0, leadH + woodH + bodyH * 0.5, 0);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: side === 'LEFT' ? 0xebb13a : 0xdf9828,
      roughness: 0.45,
      metalness: 0.08,
    });
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.bodyMesh.castShadow = true;
    this.group.add(this.bodyMesh);

    // Hexagonal facet wireframe edges
    const bodyEdges = new THREE.EdgesGeometry(bodyGeo);
    const bodyWireframe = new THREE.LineSegments(
      bodyEdges,
      new THREE.LineBasicMaterial({ color: 0x221f1d, linewidth: 1.2 })
    );
    this.group.add(bodyWireframe);

    // Brand foil stamp
    const brandGeo = new THREE.PlaneGeometry(0.2, 1.1);
    brandGeo.translate(0, leadH + woodH + bodyH * 0.5, radius + 0.005);
    const brandMat = new THREE.MeshStandardMaterial({
      color: 0x3b332a,
      roughness: 0.5,
      metalness: 0.7,
    });
    this.brandMesh = new THREE.Mesh(brandGeo, brandMat);
    this.group.add(this.brandMesh);

    // 4. Aluminum Ferrule Ring
    const ferruleGeo = new THREE.CylinderGeometry(radius * 1.03, radius * 1.03, ferruleH, 12);
    ferruleGeo.translate(0, leadH + woodH + bodyH + ferruleH * 0.5, 0);
    const ferruleMat = new THREE.MeshStandardMaterial({
      color: 0xd0cfcb,
      roughness: 0.3,
      metalness: 0.85,
    });
    this.ferruleMesh = new THREE.Mesh(ferruleGeo, ferruleMat);
    this.group.add(this.ferruleMesh);

    // Debossed black stripe on ferrule
    const stripeGeo = new THREE.CylinderGeometry(radius * 1.035, radius * 1.035, 0.08, 12);
    stripeGeo.translate(0, leadH + woodH + bodyH + ferruleH * 0.5, 0);
    this.group.add(new THREE.Mesh(stripeGeo, new THREE.MeshBasicMaterial({ color: 0x221f1d })));

    // 5. Pink Eraser
    const eraserGeo = new THREE.CylinderGeometry(radius * 0.95, radius * 0.95, eraserH, 12);
    eraserGeo.translate(0, leadH + woodH + bodyH + ferruleH + eraserH * 0.5, 0);
    const eraserMat = new THREE.MeshStandardMaterial({
      color: 0xdf6b6c,
      roughness: 0.95,
      metalness: 0.0,
    });
    this.eraserMesh = new THREE.Mesh(eraserGeo, eraserMat);
    this.group.add(this.eraserMesh);

    // 6. Streaming graphite line from tip
    this.strokePositions = new Float32Array(6 * 3);
    const strokeGeo = new THREE.BufferGeometry();
    strokeGeo.setAttribute('position', new THREE.BufferAttribute(this.strokePositions, 3));
    const strokeMat = new THREE.LineBasicMaterial({ color: 0x221f1d, linewidth: 2 });
    this.leadStrokeLine = new THREE.Line(strokeGeo, strokeMat);
    this.leadStrokeLine.frustumCulled = false;
    this.group.add(this.leadStrokeLine);

    // 7. Ground pencil contact shadow
    const shadowGeo = new THREE.CircleGeometry(0.35, 12);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x3d352e,
      transparent: true,
      opacity: 0.35,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.y = 0.02;
    this.group.add(shadowMesh);

    this.group.traverse((c) => {
      c.frustumCulled = false;
    });

    this.shoulderOffset = side === 'LEFT' ? -3.8 : 3.8;
  }

  public applyPencilStyle(style: PencilStyleDefinition): void {
    const bodyMat = this.bodyMesh.material as THREE.MeshStandardMaterial;
    const woodMat = this.woodConeMesh.material as THREE.MeshStandardMaterial;
    const ferruleMat = this.ferruleMesh.material as THREE.MeshStandardMaterial;
    const tipMat = this.tipMesh.material as THREE.MeshStandardMaterial;
    const strokeMat = this.leadStrokeLine.material as THREE.LineBasicMaterial;

    tipMat.color.setHex(style.primaryColor);
    strokeMat.color.setHex(style.primaryColor);

    switch (style.strokeType) {
      case 'TECHNICAL_BLUEPRINT':
        bodyMat.color.setHex(0x0284c7);
        woodMat.color.setHex(0xe2ddd5);
        ferruleMat.color.setHex(0xd0cfcb);
        break;
      case 'HEAVY_CHARCOAL':
        bodyMat.color.setHex(0x2e2b28);
        woodMat.color.setHex(0xc4b5a0);
        ferruleMat.color.setHex(0x6b635b);
        break;
      case 'GLOWING_NEON':
        bodyMat.color.setHex(0x06b6d4);
        woodMat.color.setHex(0x1e293b);
        ferruleMat.color.setHex(0xec4899);
        break;
      case 'EDITORIAL_CRIMSON':
        bodyMat.color.setHex(0xdc2626);
        woodMat.color.setHex(0xead9b6);
        ferruleMat.color.setHex(0xd4af37);
        break;
      case 'PAINTERLY_WATERCOLOR':
        bodyMat.color.setHex(0x4f46e5);
        woodMat.color.setHex(0xf3e8ff);
        ferruleMat.color.setHex(0xd946ef);
        break;
      case 'PRECISION_MECHANICAL':
        bodyMat.color.setHex(0xadb5bd);
        woodMat.color.setHex(0xd0cfcb);
        ferruleMat.color.setHex(0xe2e8f0);
        break;
      case 'GILDED_GOLD':
        bodyMat.color.setHex(0xd97706);
        woodMat.color.setHex(0xfbbf24);
        ferruleMat.color.setHex(0xfef3c7);
        break;
      case 'STEALTH_MONOCHROME':
        bodyMat.color.setHex(0x1c1917);
        woodMat.color.setHex(0x8a7e72);
        ferruleMat.color.setHex(0x383533);
        break;
      default:
        bodyMat.color.setHex(this.side === 'LEFT' ? 0xebb13a : 0xdf9828);
        woodMat.color.setHex(0xead9b6);
        ferruleMat.color.setHex(0xd0cfcb);
        break;
    }
  }

  public assignTask(task: DrawableTask): void {
    this.activeTask = task;
    this.taskProgress = 0;
  }

  public getActiveTask(): DrawableTask | null {
    return this.activeTask;
  }

  public update(
    dt: number,
    baseSample: PathSample | null,
    targetDistance: number,
    onCompleteTask?: (task: DrawableTask) => void
  ): void {
    this.animTimer += dt * 3.5;

    // Physical drawing contact micro-vibration
    const vibX = (Math.random() - 0.5) * 0.025;
    const vibY = (Math.random() - 0.5) * 0.02;
    const vibZ = (Math.random() - 0.5) * 0.025;

    if (this.activeTask && this.activeTask.strokePoints.length > 0) {
      // 1. ACTIVE DRAWING MODE: pencil tip physically travels along object's stroke points!
      const pts = this.activeTask.strokePoints;
      this.taskProgress += dt * this.drawingSpeed;
      const t = Math.min(1.0, this.taskProgress);

      let targetPos: THREE.Vector3;
      if (pts.length === 1) {
        targetPos = pts[0].clone();
      } else {
        const segCount = pts.length - 1;
        const totalProgress = t * segCount;
        const segIdx = Math.min(segCount - 1, Math.floor(totalProgress));
        const segT = totalProgress - segIdx;
        targetPos = pts[segIdx].clone().lerp(pts[segIdx + 1], segT);
      }

      this.targetTipWorld.copy(targetPos).add(new THREE.Vector3(vibX, vibY, vibZ));
      this.currentTipWorld.lerp(this.targetTipWorld, 0.45);

      // Notify the object to grow its geometry directly behind the tip
      this.activeTask.progress = t;
      this.activeTask.onProgressUpdate(t, this.currentTipWorld);

      // Emit graphite sketch particles at contact point
      if (Math.random() < 0.35 && this.onEmitParticles) {
        this.onEmitParticles(this.currentTipWorld, Math.random() < 0.15);
      }

      // Orient pencil along stroke vector with natural hand tilt
      if (pts.length > 1) {
        const segIdx = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1)));
        this._strokeDelta.subVectors(pts[segIdx + 1], pts[segIdx]).normalize();
      } else {
        this._strokeDelta.set(0, 1, 0);
      }

      this._pencilAxis.copy(this._strokeDelta)
        .multiplyScalar(-0.6)
        .add(new THREE.Vector3(this.side === 'LEFT' ? -0.35 : 0.35, 0.85, -0.2))
        .normalize();

      if (t >= 1.0) {
        if (onCompleteTask) onCompleteTask(this.activeTask);
        this.activeTask = null;
      }
    } else if (baseSample) {
      // 2. IDLE SHOULDER PATROL: pencil glides along the road margin, leaving artist guide ticks
      const halfW = baseSample.width * 0.5;
      const marginLateral = this.side === 'LEFT' ? -(halfW + 2.2) : (halfW + 2.2);

      // Subtle artist stroke wave on margin
      const wave = Math.sin(this.animTimer * 1.8) * 0.6;
      const shoulderPos = baseSample.position
        .clone()
        .addScaledVector(baseSample.right, marginLateral + wave + vibX)
        .addScaledVector(baseSample.normal, 0.05 + vibY);

      this.currentTipWorld.lerp(shoulderPos, 0.3);

      // Tilt slightly outward and backward
      this._pencilAxis.copy(baseSample.normal)
        .multiplyScalar(0.85)
        .addScaledVector(baseSample.tangent, -0.38)
        .addScaledVector(baseSample.right, this.side === 'LEFT' ? -0.35 : 0.35)
        .normalize();

      // Occasionally emit faint margin graphite speck
      if (Math.random() < 0.12 && this.onEmitParticles) {
        this.onEmitParticles(this.currentTipWorld, false);
      }
    }

    this.group.position.copy(this.currentTipWorld);
    this._quat.setFromUnitVectors(this._defaultY, this._pencilAxis);
    this.group.quaternion.copy(this._quat);

    // Update trailing lead stroke streaming behind tip
    for (let i = 0; i < 6; i++) {
      const frac = i / 5;
      const i3 = i * 3;
      this.strokePositions[i3] = (this.side === 'LEFT' ? 0.08 : -0.08) * frac;
      this.strokePositions[i3 + 1] = 0.02;
      this.strokePositions[i3 + 2] = frac * 1.4;
    }
    this.leadStrokeLine.geometry.attributes.position.needsUpdate = true;
  }

  public getTipPosition(): THREE.Vector3 {
    return this.currentTipWorld.clone();
  }
}

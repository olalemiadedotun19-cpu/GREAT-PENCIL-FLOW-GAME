import * as THREE from 'three';
import { CONFIG } from './config';
import { PathSample } from './utils';

export class Pencil {
  public group: THREE.Group;
  private tipMesh: THREE.Mesh;
  private woodConeMesh: THREE.Mesh;
  private bodyMesh: THREE.Mesh;
  private ferruleMesh: THREE.Mesh;
  private eraserMesh: THREE.Mesh;
  private brandMesh: THREE.Mesh;
  private leadStrokeLine: THREE.Line;
  private strokePositions: Float32Array;

  private animTimer = 0;
  private currentTipWorld = new THREE.Vector3();

  // Scratch vectors for fast per-frame update
  private _pencilAxis = new THREE.Vector3();
  private _defaultY = new THREE.Vector3(0, 1, 0);
  private _tipPos = new THREE.Vector3();
  private _quat = new THREE.Quaternion();

  constructor() {
    this.group = new THREE.Group();

    // Scale pencil to be a prominent, iconic visual element
    // Radius: 0.55, Total Length: ~6.2 units
    const radius = 0.52;

    // 1. Glossy Graphite Lead Tip
    const leadH = 0.65;
    const leadGeo = new THREE.ConeGeometry(0.18, leadH, 12);
    leadGeo.translate(0, leadH * 0.5, 0);
    const leadMat = new THREE.MeshStandardMaterial({
      color: 0x181615,
      roughness: 0.3,
      metalness: 0.8,
    });
    this.tipMesh = new THREE.Mesh(leadGeo, leadMat);
    this.tipMesh.castShadow = true;
    this.group.add(this.tipMesh);

    // 2. Carved Cedar Wood Sharpening Cone
    const woodH = 1.35;
    const woodGeo = new THREE.CylinderGeometry(radius, 0.18, woodH, 12);
    woodGeo.translate(0, leadH + woodH * 0.5, 0);
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0xead9b6, // warm cedar wood
      roughness: 0.85,
      metalness: 0.0,
    });
    this.woodConeMesh = new THREE.Mesh(woodGeo, woodMat);
    this.woodConeMesh.castShadow = true;
    this.group.add(this.woodConeMesh);

    // Scalloped sharpening line where lacquer meets wood
    const scallopGeo = new THREE.RingGeometry(radius * 0.99, radius * 1.02, 12);
    scallopGeo.rotateX(-Math.PI / 2);
    scallopGeo.translate(0, leadH + woodH, 0);
    const scallopMat = new THREE.MeshBasicMaterial({ color: 0x3d352e });
    const scallopMesh = new THREE.Mesh(scallopGeo, scallopMat);
    this.group.add(scallopMesh);

    // 3. Hexagonal Yellow Pencil Body
    const bodyH = 4.2;
    const bodyGeo = new THREE.CylinderGeometry(radius, radius, bodyH, 6);
    bodyGeo.translate(0, leadH + woodH + bodyH * 0.5, 0);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xebb13a, // rich warm golden-yellow pencil
      roughness: 0.45,
      metalness: 0.08,
    });
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.bodyMesh.castShadow = true;
    this.group.add(this.bodyMesh);

    // Hexagonal facet wireframe edges
    const bodyEdges = new THREE.EdgesGeometry(bodyGeo);
    const bodyLineMat = new THREE.LineBasicMaterial({
      color: CONFIG.visual.graphiteDark,
      linewidth: 1.5,
    });
    const bodyWireframe = new THREE.LineSegments(bodyEdges, bodyLineMat);
    this.group.add(bodyWireframe);

    // Golden foil brand mark plane on one facet
    const brandGeo = new THREE.PlaneGeometry(0.45, 2.2);
    brandGeo.translate(0, leadH + woodH + bodyH * 0.5, radius + 0.01);
    const brandMat = new THREE.MeshStandardMaterial({
      color: 0x3b332a,
      roughness: 0.5,
      metalness: 0.7,
    });
    this.brandMesh = new THREE.Mesh(brandGeo, brandMat);
    this.group.add(this.brandMesh);

    // 4. Aluminum Ferrule Ring
    const ferruleH = 0.75;
    const ferruleGeo = new THREE.CylinderGeometry(radius * 1.04, radius * 1.04, ferruleH, 14);
    ferruleGeo.translate(0, leadH + woodH + bodyH + ferruleH * 0.5, 0);
    const ferruleMat = new THREE.MeshStandardMaterial({
      color: 0xd0cfcb, // brushed silver metal
      roughness: 0.3,
      metalness: 0.85,
    });
    this.ferruleMesh = new THREE.Mesh(ferruleGeo, ferruleMat);
    this.ferruleMesh.castShadow = true;
    this.group.add(this.ferruleMesh);

    // Debossed black stripe on ferrule
    const stripeGeo = new THREE.CylinderGeometry(radius * 1.045, radius * 1.045, 0.15, 14);
    stripeGeo.translate(0, leadH + woodH + bodyH + ferruleH * 0.5, 0);
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0x221f1d });
    this.group.add(new THREE.Mesh(stripeGeo, stripeMat));

    // 5. Pink Eraser
    const eraserH = 0.85;
    const eraserGeo = new THREE.CylinderGeometry(radius * 0.96, radius * 0.96, eraserH, 14);
    eraserGeo.translate(0, leadH + woodH + bodyH + ferruleH + eraserH * 0.5, 0);
    const eraserMat = new THREE.MeshStandardMaterial({
      color: 0xdf6b6c, // classic pink eraser
      roughness: 0.95,
      metalness: 0.0,
    });
    this.eraserMesh = new THREE.Mesh(eraserGeo, eraserMat);
    this.eraserMesh.castShadow = true;
    this.group.add(this.eraserMesh);

    // 6. Dynamic graphite drawing stroke line streaming from the pencil tip
    this.strokePositions = new Float32Array(8 * 3);
    const strokeGeo = new THREE.BufferGeometry();
    strokeGeo.setAttribute('position', new THREE.BufferAttribute(this.strokePositions, 3));
    const strokeMat = new THREE.LineBasicMaterial({
      color: 0x1f1d1b,
      linewidth: 3,
    });
    this.leadStrokeLine = new THREE.Line(strokeGeo, strokeMat);
    this.leadStrokeLine.frustumCulled = false;
    this.group.add(this.leadStrokeLine);

    // 7. Ground pencil shadow
    const shadowGeo = new THREE.CircleGeometry(0.7, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x3d352e,
      transparent: true,
      opacity: 0.4,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.y = 0.02;
    this.group.add(shadowMesh);

    this.group.traverse((child) => {
      child.frustumCulled = false;
    });
  }

  public setSkin(skinId: string): void {
    const bodyMat = this.bodyMesh.material as THREE.MeshStandardMaterial;
    const woodMat = this.woodConeMesh.material as THREE.MeshStandardMaterial;
    const ferruleMat = this.ferruleMesh.material as THREE.MeshStandardMaterial;
    const tipMat = this.tipMesh.material as THREE.MeshStandardMaterial;

    switch (skinId) {
      case '2b_dark':
        bodyMat.color.setHex(0x1f1f1f);
        bodyMat.roughness = 0.55;
        bodyMat.metalness = 0.1;
        woodMat.color.setHex(0x8a7e72);
        tipMat.color.setHex(0x111111);
        ferruleMat.color.setHex(0x383533);
        break;
      case '4b_soft':
        bodyMat.color.setHex(0x4a443e);
        bodyMat.roughness = 0.65;
        bodyMat.metalness = 0.05;
        woodMat.color.setHex(0xc4b5a0);
        tipMat.color.setHex(0x0a0a0a);
        ferruleMat.color.setHex(0x6b635b);
        break;
      case 'mechanical_05':
        bodyMat.color.setHex(0xadb5bd);
        bodyMat.roughness = 0.25;
        bodyMat.metalness = 0.85;
        woodMat.color.setHex(0xd0cfcb);
        tipMat.color.setHex(0x1c1917);
        ferruleMat.color.setHex(0xe2e8f0);
        break;
      case 'blueprint_stylus':
        bodyMat.color.setHex(0x0284c7);
        bodyMat.roughness = 0.35;
        bodyMat.metalness = 0.2;
        woodMat.color.setHex(0xe2ddd5);
        tipMat.color.setHex(0x0369a1);
        ferruleMat.color.setHex(0xd0cfcb);
        break;
      case 'crimson_red':
        bodyMat.color.setHex(0xdc2626);
        bodyMat.roughness = 0.35;
        bodyMat.metalness = 0.1;
        woodMat.color.setHex(0xead9b6);
        tipMat.color.setHex(0x991b1b);
        ferruleMat.color.setHex(0xd4af37);
        break;
      case 'golden_quill':
        bodyMat.color.setHex(0xd97706);
        bodyMat.roughness = 0.2;
        bodyMat.metalness = 0.95;
        woodMat.color.setHex(0xfbbf24);
        tipMat.color.setHex(0x78350f);
        ferruleMat.color.setHex(0xfef3c7);
        break;
      case 'classic_hb':
      default:
        bodyMat.color.setHex(0xebb13a);
        bodyMat.roughness = 0.45;
        bodyMat.metalness = 0.08;
        woodMat.color.setHex(0xead9b6);
        tipMat.color.setHex(0x181615);
        ferruleMat.color.setHex(0xd0cfcb);
        break;
    }
  }

  public triggerSketchPulse(): void {
    // Excited wiggle when finishing an obstacle sketch
    this.animTimer += 1.2;
  }

  public celebratePickup(): void {
    // Flourish flick when grabbing a rare lead or boost
    this.animTimer += 2.0;
  }

  /**
   * Positions and sweeps the pencil across the road width as it physically draws the path
   */
  public update(sample: PathSample, dt: number, speed = 12, isBoosted = false): void {
    const sweepSpeed = (isBoosted ? 5.0 : 3.2) * (speed / 14);
    this.animTimer += dt * sweepSpeed;

    // Artist hand sketching stroke: sweeps smoothly back and forth across the track width
    const sweepRange = sample.width * 0.32;
    const sweepX = Math.sin(this.animTimer * 2.2) * sweepRange;

    // High speed / boost shake and micro vibration
    const shakeMult = speed > 26 ? (speed - 26) * 0.0035 : 0.001;
    const vibY = (Math.random() - 0.5) * (0.025 + shakeMult);
    const vibX = (Math.random() - 0.5) * (0.035 + shakeMult * 1.5);

    // Tip position right on the path surface
    this._tipPos.copy(sample.position)
      .addScaledVector(sample.right, sweepX + vibX)
      .addScaledVector(sample.normal, 0.05 + vibY);

    this.group.position.copy(this._tipPos);
    this.currentTipWorld.copy(this._tipPos);

    // Orientation: tilted backward against the tangent and slightly rightward (natural hand grip)
    const forward = sample.tangent;
    const up = sample.normal;
    const right = sample.right;

    // During boost, pencil leans slightly more aggressive into drawing
    const forwardTilt = isBoosted ? -0.55 : -0.42;

    this._pencilAxis.copy(up)
      .multiplyScalar(0.85)
      .addScaledVector(forward, forwardTilt)
      .addScaledVector(right, 0.22)
      .normalize();

    this._quat.setFromUnitVectors(this._defaultY, this._pencilAxis);
    this.group.quaternion.copy(this._quat);

    // Draw active graphite lead streak streaming behind the tip
    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      const streakBack = t * (isBoosted ? 4.2 : 2.8);
      const streakX = -sweepX * (1 - t * 0.5);
      const i3 = i * 3;
      this.strokePositions[i3] = -streakX * 0.3;
      this.strokePositions[i3 + 1] = 0.02;
      this.strokePositions[i3 + 2] = streakBack;
    }
    this.leadStrokeLine.geometry.attributes.position.needsUpdate = true;
  }

  public getTipPosition(): THREE.Vector3 {
    return this.currentTipWorld.clone();
  }
}

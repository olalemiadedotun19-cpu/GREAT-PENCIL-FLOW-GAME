import * as THREE from 'three';
import { ShopItem } from './ShopCatalogue';
import { getPencilStyle, PencilStyleDefinition } from './PencilStyleSystem';

export class ShopPreview {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private animFrameId: number | null = null;
  private isVisible = false;
  private currentMode: 'BALL' | 'PENCIL' | 'WORLD' | 'TRAIL' = 'BALL';

  // Ball Preview Meshes
  private ballMesh: THREE.Mesh;
  private equatorMesh: THREE.Mesh;

  // Pencil Preview Meshes
  private pencilGroup: THREE.Group;
  private pencilBody: THREE.Mesh;
  private pencilCone: THREE.Mesh;
  private pencilTip: THREE.Mesh;
  private pencilFerrule: THREE.Mesh;
  private pencilEraser: THREE.Mesh;

  // Live Miniature World Preview Group
  private worldPreviewGroup: THREE.Group;
  private miniRoadMesh: THREE.Mesh;
  private miniRoadLineLeft: THREE.Line;
  private miniRoadLineRight: THREE.Line;
  private miniRoadCenterLine: THREE.Line;
  private miniBuildingMesh: THREE.Mesh;
  private miniBuildingWire: THREE.LineSegments;
  private miniBackdropMesh: THREE.Mesh;
  private pedestal: THREE.Mesh;

  constructor(container: HTMLElement) {
    this.container = container;

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth || 320, container.clientHeight || 160);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      38,
      (container.clientWidth || 320) / (container.clientHeight || 160),
      0.1,
      50
    );
    this.camera.position.set(0, 0.9, 4.2);
    this.camera.lookAt(0, 0, 0);

    // Lights
    const amb = new THREE.AmbientLight(0xfffbf2, 1.2);
    const dir = new THREE.DirectionalLight(0xffffff, 1.4);
    dir.position.set(3, 5, 4);
    this.scene.add(amb, dir);

    // Studio pedestal
    const pedestalGeo = new THREE.CylinderGeometry(1.6, 1.7, 0.12, 32);
    const pedestalMat = new THREE.MeshStandardMaterial({ color: 0xede6da, roughness: 0.9 });
    this.pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    this.pedestal.position.y = -0.75;
    this.scene.add(this.pedestal);

    // 1. Ball Preview Mesh
    const ballGeo = new THREE.SphereGeometry(0.65, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({ color: 0xf7f5f0, roughness: 0.5, metalness: 0.1 });
    this.ballMesh = new THREE.Mesh(ballGeo, ballMat);
    this.ballMesh.position.y = 0.05;

    const eqGeo = new THREE.TorusGeometry(0.66, 0.02, 8, 32);
    const eqMat = new THREE.MeshBasicMaterial({ color: 0x221f1d });
    this.equatorMesh = new THREE.Mesh(eqGeo, eqMat);
    this.equatorMesh.rotation.x = Math.PI / 2;
    this.ballMesh.add(this.equatorMesh);
    this.scene.add(this.ballMesh);

    // 2. Pencil Preview Mesh
    this.pencilGroup = new THREE.Group();
    this.pencilGroup.position.set(0, 0.1, 0.2);
    this.pencilGroup.rotation.z = -0.38;
    this.pencilGroup.rotation.x = 0.32;

    const bodyGeo = new THREE.CylinderGeometry(0.14, 0.14, 1.8, 6);
    this.pencilBody = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: 0xebb13a, roughness: 0.4 }));
    this.pencilGroup.add(this.pencilBody);

    const coneGeo = new THREE.ConeGeometry(0.14, 0.45, 6);
    this.pencilCone = new THREE.Mesh(coneGeo, new THREE.MeshStandardMaterial({ color: 0xead9b6, roughness: 0.8 }));
    this.pencilCone.position.y = -1.12;
    this.pencilCone.rotation.x = Math.PI;
    this.pencilGroup.add(this.pencilCone);

    const tipGeo = new THREE.ConeGeometry(0.045, 0.15, 6);
    this.pencilTip = new THREE.Mesh(tipGeo, new THREE.MeshStandardMaterial({ color: 0x1f1d1b, roughness: 0.3, metalness: 0.8 }));
    this.pencilTip.position.y = -1.38;
    this.pencilTip.rotation.x = Math.PI;
    this.pencilGroup.add(this.pencilTip);

    const ferruleGeo = new THREE.CylinderGeometry(0.145, 0.145, 0.25, 16);
    this.pencilFerrule = new THREE.Mesh(ferruleGeo, new THREE.MeshStandardMaterial({ color: 0xd0cfcb, metalness: 0.9, roughness: 0.2 }));
    this.pencilFerrule.position.y = 1.02;
    this.pencilGroup.add(this.pencilFerrule);

    const eraserGeo = new THREE.CylinderGeometry(0.138, 0.138, 0.3, 16);
    this.pencilEraser = new THREE.Mesh(eraserGeo, new THREE.MeshStandardMaterial({ color: 0xe07272, roughness: 0.7 }));
    this.pencilEraser.position.y = 1.25;
    this.pencilGroup.add(this.pencilEraser);

    this.scene.add(this.pencilGroup);
    this.pencilGroup.visible = false;

    // 3. Live Miniature World Preview (Curved road ribbon & city skyline block)
    this.worldPreviewGroup = new THREE.Group();
    this.worldPreviewGroup.position.set(0, -0.65, -0.6);

    // Arched road ribbon
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-1.8, 0.1, -1.2),
      new THREE.Vector3(0.0, 0.35, -0.4),
      new THREE.Vector3(1.8, 0.05, 0.5)
    );
    const roadPoints = curve.getPoints(24);
    const roadWidth = 0.9;
    const roadGeo = new THREE.BufferGeometry();
    const rPositions: number[] = [];
    const rUvs: number[] = [];
    const rIndices: number[] = [];

    for (let i = 0; i < roadPoints.length; i++) {
      const p = roadPoints[i];
      const t = curve.getTangent(i / (roadPoints.length - 1));
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(t, up).normalize();

      rPositions.push(p.x - right.x * roadWidth * 0.5, p.y, p.z - right.z * roadWidth * 0.5);
      rPositions.push(p.x + right.x * roadWidth * 0.5, p.y, p.z + right.z * roadWidth * 0.5);

      rUvs.push(0, i / (roadPoints.length - 1));
      rUvs.push(1, i / (roadPoints.length - 1));

      if (i < roadPoints.length - 1) {
        const row0 = i * 2;
        const row1 = (i + 1) * 2;
        rIndices.push(row0, row1, row0 + 1);
        rIndices.push(row0 + 1, row1, row1 + 1);
      }
    }

    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(rPositions, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(rUvs, 2));
    roadGeo.setIndex(rIndices);
    roadGeo.computeVertexNormals();

    const miniRoadMat = new THREE.MeshStandardMaterial({
      color: 0xfcfaf4,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    this.miniRoadMesh = new THREE.Mesh(roadGeo, miniRoadMat);
    this.worldPreviewGroup.add(this.miniRoadMesh);

    // Edge lines
    const leftLinePts: THREE.Vector3[] = [];
    const rightLinePts: THREE.Vector3[] = [];
    const centerLinePts: THREE.Vector3[] = [];
    for (let i = 0; i < roadPoints.length; i++) {
      const p = roadPoints[i];
      const t = curve.getTangent(i / (roadPoints.length - 1));
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(t, up).normalize();

      leftLinePts.push(new THREE.Vector3(p.x - right.x * roadWidth * 0.5, p.y + 0.02, p.z - right.z * roadWidth * 0.5));
      rightLinePts.push(new THREE.Vector3(p.x + right.x * roadWidth * 0.5, p.y + 0.02, p.z + right.z * roadWidth * 0.5));
      centerLinePts.push(new THREE.Vector3(p.x, p.y + 0.02, p.z));
    }

    const leftLineGeo = new THREE.BufferGeometry().setFromPoints(leftLinePts);
    const rightLineGeo = new THREE.BufferGeometry().setFromPoints(rightLinePts);
    const centerLineGeo = new THREE.BufferGeometry().setFromPoints(centerLinePts);

    const edgeLineMat = new THREE.LineBasicMaterial({ color: 0x1f1d1b, linewidth: 2 });
    const centerLineMat = new THREE.LineBasicMaterial({ color: 0x8a8074, linewidth: 1 });

    this.miniRoadLineLeft = new THREE.Line(leftLineGeo, edgeLineMat);
    this.miniRoadLineRight = new THREE.Line(rightLineGeo, edgeLineMat);
    this.miniRoadCenterLine = new THREE.Line(centerLineGeo, centerLineMat);

    this.worldPreviewGroup.add(this.miniRoadLineLeft, this.miniRoadLineRight, this.miniRoadCenterLine);

    // Miniature architectural building silhouette
    const buildGeo = new THREE.BoxGeometry(0.8, 1.4, 0.7);
    const buildMat = new THREE.MeshStandardMaterial({ color: 0x3d3731, roughness: 0.85 });
    this.miniBuildingMesh = new THREE.Mesh(buildGeo, buildMat);
    this.miniBuildingMesh.position.set(-1.1, 0.7, -0.6);
    this.miniBuildingMesh.rotation.y = 0.25;

    const buildEdges = new THREE.EdgesGeometry(buildGeo);
    this.miniBuildingWire = new THREE.LineSegments(buildEdges, new THREE.LineBasicMaterial({ color: 0x221f1d, linewidth: 1.5 }));
    this.miniBuildingMesh.add(this.miniBuildingWire);
    this.worldPreviewGroup.add(this.miniBuildingMesh);

    // Miniature backdrop silhouette
    const backGeo = new THREE.ConeGeometry(0.6, 1.6, 4);
    backGeo.rotateY(Math.PI / 4);
    const backMat = new THREE.MeshBasicMaterial({ color: 0xd6cfc4, transparent: true, opacity: 0.65 });
    this.miniBackdropMesh = new THREE.Mesh(backGeo, backMat);
    this.miniBackdropMesh.position.set(1.1, 0.8, -1.0);
    this.worldPreviewGroup.add(this.miniBackdropMesh);

    this.scene.add(this.worldPreviewGroup);
    this.worldPreviewGroup.visible = false;

    window.addEventListener('resize', this.onResize.bind(this));
  }

  public show(): void {
    this.isVisible = true;
    this.onResize();
    this.startLoop();
  }

  public hide(): void {
    this.isVisible = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public previewItem(item: ShopItem): void {
    this.currentMode = item.category;

    // Update overlay text in UI
    const artistElem = document.getElementById('preview-artist-title');
    const nameElem = document.getElementById('preview-item-name');
    const subElem = document.getElementById('preview-style-subtitle');
    const badgeElem = document.getElementById('preview-style-badge');

    if (nameElem) nameElem.textContent = item.name;

    if (item.category === 'PENCIL') {
      this.ballMesh.visible = false;
      this.pencilGroup.visible = true;
      this.worldPreviewGroup.visible = true;

      const style = getPencilStyle(item.id);

      if (artistElem) artistElem.textContent = style.artistTitle;
      if (subElem) subElem.textContent = style.subtitle;
      if (badgeElem) {
        badgeElem.textContent = 'WORLD STYLE';
        badgeElem.style.backgroundColor = style.uiTheme.badgeBgHex;
        badgeElem.style.color = style.uiTheme.badgeTextHex;
        badgeElem.style.borderColor = style.uiTheme.borderHex;
      }

      this.applyPencilPreview(style);
    } else if (item.category === 'BALL') {
      this.ballMesh.visible = true;
      this.pencilGroup.visible = false;
      this.worldPreviewGroup.visible = false;

      if (artistElem) artistElem.textContent = 'PLAYER BALL';
      if (subElem) subElem.textContent = item.desc;
      if (badgeElem) {
        badgeElem.textContent = 'COSMETIC';
        badgeElem.style.backgroundColor = '#fef3c7';
        badgeElem.style.color = '#92400e';
        badgeElem.style.borderColor = '#d97706';
      }

      this.applyBallSkin(item.id);
    } else {
      // WORLD or TRAIL
      this.ballMesh.visible = false;
      this.pencilGroup.visible = false;
      this.worldPreviewGroup.visible = true;

      if (artistElem) artistElem.textContent = item.category === 'WORLD' ? 'WORLD THEME' : 'BALL TRAIL';
      if (subElem) subElem.textContent = item.desc;
      if (badgeElem) {
        badgeElem.textContent = item.category;
      }
    }
  }

  private applyPencilPreview(style: PencilStyleDefinition): void {
    // 1. Update 3D Pencil Mesh
    const bMat = this.pencilBody.material as THREE.MeshStandardMaterial;
    const wMat = this.pencilCone.material as THREE.MeshStandardMaterial;
    const tMat = this.pencilTip.material as THREE.MeshStandardMaterial;
    const fMat = this.pencilFerrule.material as THREE.MeshStandardMaterial;

    bMat.color.setHex(style.primaryColor);
    tMat.color.setHex(style.primaryColor);
    fMat.color.setHex(style.accentColor);

    if (style.id === 'blueprint_stylus') {
      bMat.color.setHex(0x0284c7);
      wMat.color.setHex(0x075985);
      tMat.color.setHex(0x38bdf8);
      fMat.color.setHex(0x7dd3fc);
    } else if (style.id === 'crimson_red') {
      bMat.color.setHex(0xdc2626);
      wMat.color.setHex(0xead9b6);
      tMat.color.setHex(0x991b1b);
      fMat.color.setHex(0xd4af37);
    } else if (style.id === '4b_soft') {
      bMat.color.setHex(0x282522);
      wMat.color.setHex(0x948e85);
      tMat.color.setHex(0x141211);
      fMat.color.setHex(0x44403c);
    } else if (style.id === 'neon_sketch') {
      bMat.color.setHex(0x06b6d4);
      wMat.color.setHex(0x1e293b);
      tMat.color.setHex(0x06b6d4);
      fMat.color.setHex(0xec4899);
    } else if (style.id === 'watercolor_brush') {
      bMat.color.setHex(0x4f46e5);
      wMat.color.setHex(0xf3e8ff);
      tMat.color.setHex(0x4f46e5);
      fMat.color.setHex(0xd946ef);
    } else if (style.id === 'golden_quill') {
      bMat.color.setHex(0xd97706);
      wMat.color.setHex(0xfbbf24);
      tMat.color.setHex(0x78350f);
      fMat.color.setHex(0xfef3c7);
    }

    // 2. Update Live World Preview Road & Architecture
    (this.miniRoadMesh.material as THREE.MeshStandardMaterial).color.setHex(style.roadBedColor);
    (this.miniRoadLineLeft.material as THREE.LineBasicMaterial).color.setHex(style.roadLineColor);
    (this.miniRoadLineRight.material as THREE.LineBasicMaterial).color.setHex(style.roadLineColor);
    (this.miniRoadCenterLine.material as THREE.LineBasicMaterial).color.setHex(style.roadCenterColor);

    (this.miniBuildingMesh.material as THREE.MeshStandardMaterial).color.setHex(style.buildingRoofColor);
    (this.miniBuildingWire.material as THREE.LineBasicMaterial).color.setHex(style.outlineColor);
    (this.miniBackdropMesh.material as THREE.MeshBasicMaterial).color.setHex(style.buildingFacadeColor);
    (this.pedestal.material as THREE.MeshStandardMaterial).color.setHex(style.paperColor);
  }

  private applyBallSkin(skinId: string): void {
    const mat = this.ballMesh.material as THREE.MeshStandardMaterial;
    const eqMat = this.equatorMesh.material as THREE.MeshBasicMaterial;

    switch (skinId) {
      case 'marble':
        mat.color.setHex(0xe2ddd5);
        eqMat.color.setHex(0x524d47);
        break;
      case 'graphite_core':
        mat.color.setHex(0x1a1918);
        eqMat.color.setHex(0x57534e);
        break;
      case 'eraser_pink':
        mat.color.setHex(0xe07272);
        eqMat.color.setHex(0x4895ef);
        break;
      case 'ink_splat':
        mat.color.setHex(0x0f0e0d);
        eqMat.color.setHex(0x383533);
        break;
      case 'blueprint':
        mat.color.setHex(0x0284c7);
        eqMat.color.setHex(0xffffff);
        break;
      case 'gold_leaf':
        mat.color.setHex(0xdfab34);
        eqMat.color.setHex(0x78350f);
        break;
      case 'neon_sketch':
        mat.color.setHex(0x06d6a0);
        eqMat.color.setHex(0x118ab2);
        break;
      case 'classic':
      default:
        mat.color.setHex(0xf7f5f0);
        eqMat.color.setHex(0x221f1d);
        break;
    }
  }

  private startLoop(): void {
    if (this.animFrameId !== null) return;

    const render = () => {
      if (!this.isVisible) return;
      this.animFrameId = requestAnimationFrame(render);

      const time = performance.now() * 0.001;

      if (this.currentMode === 'BALL') {
        this.ballMesh.rotation.y += 0.015;
        this.ballMesh.rotation.x = Math.sin(time) * 0.12;
      } else if (this.currentMode === 'PENCIL') {
        this.pencilGroup.rotation.y = Math.sin(time * 1.4) * 0.25;
        this.pencilGroup.position.y = 0.1 + Math.sin(time * 2.0) * 0.04;

        // Subtle gentle drift on world preview
        this.worldPreviewGroup.rotation.y = Math.sin(time * 0.8) * 0.1;
      }

      this.renderer.render(this.scene, this.camera);
    };

    render();
  }

  private onResize(): void {
    if (!this.container) return;
    const w = this.container.clientWidth || 320;
    const h = this.container.clientHeight || 160;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}

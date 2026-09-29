import * as THREE from 'three';
import { ShopItem } from './ShopCatalogue';

export class ShopPreview {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private ballMesh: THREE.Mesh;
  private equatorMesh: THREE.Mesh;
  private pencilGroup: THREE.Group;
  private animFrameId: number | null = null;
  private isVisible = false;
  private currentMode: 'BALL' | 'PENCIL' = 'BALL';

  // Pencil meshes for preview
  private pencilBody: THREE.Mesh;
  private pencilCone: THREE.Mesh;
  private pencilTip: THREE.Mesh;
  private pencilFerrule: THREE.Mesh;
  private pencilEraser: THREE.Mesh;

  constructor(container: HTMLElement) {
    this.container = container;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth || 280, container.clientHeight || 160);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, (container.clientWidth || 280) / (container.clientHeight || 160), 0.1, 50);
    this.camera.position.set(0, 0.8, 3.8);
    this.camera.lookAt(0, 0, 0);

    // Lights
    const amb = new THREE.AmbientLight(0xfffbf2, 1.2);
    const dir = new THREE.DirectionalLight(0xffffff, 1.4);
    dir.position.set(3, 5, 4);
    this.scene.add(amb, dir);

    // Studio pedestal
    const pedestalGeo = new THREE.CylinderGeometry(1.4, 1.5, 0.1, 32);
    const pedestalMat = new THREE.MeshStandardMaterial({ color: 0xede6da, roughness: 0.9 });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = -0.7;
    this.scene.add(pedestal);

    // Ball Preview Mesh
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

    // Pencil Preview Mesh
    this.pencilGroup = new THREE.Group();
    this.pencilGroup.position.set(0, 0, 0);
    this.pencilGroup.rotation.z = -0.4;
    this.pencilGroup.rotation.x = 0.3;

    // Hexagonal body
    const bodyGeo = new THREE.CylinderGeometry(0.14, 0.14, 1.8, 6);
    this.pencilBody = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: 0xebb13a, roughness: 0.4 }));
    this.pencilGroup.add(this.pencilBody);

    // Wood cone
    const coneGeo = new THREE.ConeGeometry(0.14, 0.45, 6);
    this.pencilCone = new THREE.Mesh(coneGeo, new THREE.MeshStandardMaterial({ color: 0xead9b6, roughness: 0.8 }));
    this.pencilCone.position.y = -1.12;
    this.pencilCone.rotation.x = Math.PI;
    this.pencilGroup.add(this.pencilCone);

    // Graphite tip
    const tipGeo = new THREE.ConeGeometry(0.045, 0.15, 6);
    this.pencilTip = new THREE.Mesh(tipGeo, new THREE.MeshStandardMaterial({ color: 0x1f1d1b, roughness: 0.3, metalness: 0.8 }));
    this.pencilTip.position.y = -1.38;
    this.pencilTip.rotation.x = Math.PI;
    this.pencilGroup.add(this.pencilTip);

    // Aluminum Ferrule
    const ferruleGeo = new THREE.CylinderGeometry(0.145, 0.145, 0.25, 16);
    this.pencilFerrule = new THREE.Mesh(ferruleGeo, new THREE.MeshStandardMaterial({ color: 0xd0cfcb, metalness: 0.9, roughness: 0.2 }));
    this.pencilFerrule.position.y = 1.02;
    this.pencilGroup.add(this.pencilFerrule);

    // Pink Eraser
    const eraserGeo = new THREE.CylinderGeometry(0.138, 0.138, 0.3, 16);
    this.pencilEraser = new THREE.Mesh(eraserGeo, new THREE.MeshStandardMaterial({ color: 0xe07272, roughness: 0.7 }));
    this.pencilEraser.position.y = 1.25;
    this.pencilGroup.add(this.pencilEraser);

    this.scene.add(this.pencilGroup);
    this.pencilGroup.visible = false;

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
    if (item.category === 'PENCIL') {
      this.currentMode = 'PENCIL';
      this.ballMesh.visible = false;
      this.pencilGroup.visible = true;
      this.updatePencilSkin(item.id);
    } else {
      this.currentMode = 'BALL';
      this.ballMesh.visible = true;
      this.pencilGroup.visible = false;
      this.updateBallSkin(item.id);
    }
  }

  private updateBallSkin(skinId: string): void {
    const mat = this.ballMesh.material as THREE.MeshStandardMaterial;
    const eqMat = this.equatorMesh.material as THREE.MeshBasicMaterial;

    switch (skinId) {
      case 'marble':
        mat.color.setHex(0xe2ddd5);
        mat.roughness = 0.25;
        mat.metalness = 0.1;
        eqMat.color.setHex(0x524d47);
        break;
      case 'graphite_core':
        mat.color.setHex(0x1a1918);
        mat.roughness = 0.3;
        mat.metalness = 0.9;
        eqMat.color.setHex(0x78716c);
        break;
      case 'eraser_pink':
        mat.color.setHex(0xe07272);
        mat.roughness = 0.75;
        mat.metalness = 0.02;
        eqMat.color.setHex(0x4895ef);
        break;
      case 'ink_splat':
        mat.color.setHex(0x0f0e0d);
        mat.roughness = 0.12;
        mat.metalness = 0.4;
        eqMat.color.setHex(0x383533);
        break;
      case 'blueprint':
        mat.color.setHex(0x0284c7);
        mat.roughness = 0.35;
        mat.metalness = 0.2;
        eqMat.color.setHex(0xffffff);
        break;
      case 'gold_leaf':
        mat.color.setHex(0xdfab34);
        mat.roughness = 0.2;
        mat.metalness = 0.95;
        eqMat.color.setHex(0x78350f);
        break;
      case 'neon_sketch':
        mat.color.setHex(0x06d6a0);
        mat.roughness = 0.3;
        mat.metalness = 0.1;
        eqMat.color.setHex(0x118ab2);
        break;
      case 'classic':
      default:
        mat.color.setHex(0xf7f5f0);
        mat.roughness = 0.55;
        mat.metalness = 0.05;
        eqMat.color.setHex(0x221f1d);
        break;
    }
  }

  private updatePencilSkin(skinId: string): void {
    const bMat = this.pencilBody.material as THREE.MeshStandardMaterial;
    const wMat = this.pencilCone.material as THREE.MeshStandardMaterial;
    const tMat = this.pencilTip.material as THREE.MeshStandardMaterial;

    switch (skinId) {
      case '2b_dark':
        bMat.color.setHex(0x1f1f1f);
        wMat.color.setHex(0x8a7e72);
        tMat.color.setHex(0x111111);
        break;
      case '4b_soft':
        bMat.color.setHex(0x4a443e);
        wMat.color.setHex(0xc4b5a0);
        tMat.color.setHex(0x0a0a0a);
        break;
      case 'mechanical_05':
        bMat.color.setHex(0xadb5bd);
        bMat.metalness = 0.85;
        bMat.roughness = 0.25;
        wMat.color.setHex(0xd0cfcb);
        tMat.color.setHex(0x1c1917);
        break;
      case 'blueprint_stylus':
        bMat.color.setHex(0x0284c7);
        wMat.color.setHex(0xe2ddd5);
        tMat.color.setHex(0x0369a1);
        break;
      case 'crimson_red':
        bMat.color.setHex(0xdc2626);
        wMat.color.setHex(0xead9b6);
        tMat.color.setHex(0x991b1b);
        break;
      case 'golden_quill':
        bMat.color.setHex(0xd97706);
        bMat.metalness = 0.95;
        wMat.color.setHex(0xfbbf24);
        tMat.color.setHex(0x78350f);
        break;
      case 'classic_hb':
      default:
        bMat.color.setHex(0xebb13a);
        bMat.metalness = 0.08;
        wMat.color.setHex(0xead9b6);
        tMat.color.setHex(0x181615);
        break;
    }
  }

  private startLoop(): void {
    if (this.animFrameId !== null) return;

    const render = () => {
      if (!this.isVisible) return;
      this.animFrameId = requestAnimationFrame(render);

      // Smooth studio rotation
      if (this.currentMode === 'BALL') {
        this.ballMesh.rotation.y += 0.015;
        this.ballMesh.rotation.x = Math.sin(performance.now() * 0.001) * 0.15;
      } else {
        this.pencilGroup.rotation.y += 0.018;
      }

      this.renderer.render(this.scene, this.camera);
    };

    render();
  }

  private onResize(): void {
    if (!this.container) return;
    const w = this.container.clientWidth || 280;
    const h = this.container.clientHeight || 160;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}

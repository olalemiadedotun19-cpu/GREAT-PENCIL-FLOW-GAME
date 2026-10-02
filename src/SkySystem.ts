import * as THREE from 'three';
import { CONFIG } from './config';
import { StageInfo } from './WorldEvolutionSystem';
import { PencilStyleDefinition, PENCIL_STYLES } from './PencilStyleSystem';

export class SkySystem {
  public group: THREE.Group;

  // Cloud layers
  private cloudGroup: THREE.Group;
  private clouds: { mesh: THREE.Group; speed: number; basePos: THREE.Vector3 }[] = [];

  // Radiant graphite sun & architectural compass rays
  private sunGroup: THREE.Group;
  private sunDisc!: THREE.Mesh;
  private sunRays!: THREE.LineSegments;
  private sunGlow!: THREE.Mesh;

  // Distant horizon silhouettes (mountain ridges & far-off city spires)
  private horizonGroup: THREE.Group;
  private horizonMeshes: THREE.Mesh[] = [];

  // Drifting atmospheric paper/graphite airborne dust
  private dustGeo: THREE.BufferGeometry;
  private dustPoints: THREE.Points;
  private dustPositions: Float32Array;
  private dustVelocities: Float32Array;
  private dustCount = 180;

  // Materials for stage adaptation
  private cloudMat: THREE.MeshStandardMaterial;
  private cloudHatchMat: THREE.MeshStandardMaterial;
  private cloudLineMat: THREE.LineBasicMaterial;
  private horizonMat: THREE.MeshBasicMaterial;
  private horizonLineMat: THREE.LineBasicMaterial;
  private sunMat: THREE.MeshBasicMaterial;
  private sunRayMat: THREE.LineBasicMaterial;
  private dustMat: THREE.PointsMaterial;
  private currentStyle: PencilStyleDefinition = PENCIL_STYLES['classic_hb'];

  constructor() {
    this.group = new THREE.Group();

    // 1. Materials with authentic pencil sketch styling
    this.cloudMat = new THREE.MeshStandardMaterial({
      color: 0xfffcf7,
      roughness: 0.96,
      metalness: 0.0,
      flatShading: true,
    });

    this.cloudHatchMat = new THREE.MeshStandardMaterial({
      color: 0x5a524a,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true,
    });

    this.cloudLineMat = new THREE.LineBasicMaterial({
      color: CONFIG.visual.graphiteDark || 0x221f1d,
      linewidth: 1.5,
      transparent: true,
      opacity: 0.7,
    });

    this.horizonMat = new THREE.MeshBasicMaterial({
      color: 0xded8ce,
      transparent: true,
      opacity: 0.85,
    });

    this.horizonLineMat = new THREE.LineBasicMaterial({
      color: 0x48423c,
      linewidth: 1,
      transparent: true,
      opacity: 0.6,
    });

    this.sunMat = new THREE.MeshBasicMaterial({
      color: 0xfff3d6,
    });

    this.sunRayMat = new THREE.LineBasicMaterial({
      color: 0x6e6458,
      linewidth: 1.2,
      transparent: true,
      opacity: 0.65,
    });

    // 2. Build Hand-Drawn Clouds
    this.cloudGroup = new THREE.Group();
    this.group.add(this.cloudGroup);
    this.buildCloudLayers();

    // 3. Build Radiant Sun
    this.sunGroup = new THREE.Group();
    this.group.add(this.sunGroup);
    this.buildRadiantSun();

    // 4. Build Distant Horizon Silhouettes
    this.horizonGroup = new THREE.Group();
    this.group.add(this.horizonGroup);
    this.buildHorizonSilhouettes();

    // 5. Build Airborne Atmospheric Paper/Graphite Dust
    this.dustGeo = new THREE.BufferGeometry();
    this.dustPositions = new Float32Array(this.dustCount * 3);
    this.dustVelocities = new Float32Array(this.dustCount * 3);

    for (let i = 0; i < this.dustCount; i++) {
      this.dustPositions[i * 3 + 0] = (Math.random() - 0.5) * 160;
      this.dustPositions[i * 3 + 1] = Math.random() * 45 + 2;
      this.dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 160;

      this.dustVelocities[i * 3 + 0] = (Math.random() - 0.5) * 1.2;
      this.dustVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.6;
      this.dustVelocities[i * 3 + 2] = (Math.random() - 0.5) * 1.2;
    }

    this.dustGeo.setAttribute('position', new THREE.BufferAttribute(this.dustPositions, 3));

    const dustCanvas = document.createElement('canvas');
    dustCanvas.width = 32;
    dustCanvas.height = 32;
    const ctx = dustCanvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(60, 52, 45, 0.7)');
      grad.addColorStop(0.5, 'rgba(90, 80, 70, 0.4)');
      grad.addColorStop(1, 'rgba(90, 80, 70, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 32);
    }
    const dustTex = new THREE.CanvasTexture(dustCanvas);

    this.dustMat = new THREE.PointsMaterial({
      size: 1.8,
      map: dustTex,
      transparent: true,
      opacity: 0.45,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    this.dustPoints = new THREE.Points(this.dustGeo, this.dustMat);
    this.group.add(this.dustPoints);
  }

  private buildCloudLayers(): void {
    const cloudConfigs = [
      { x: -160, y: 75, z: -280, scale: 24, speed: 0.4 },
      { x: 140, y: 88, z: -320, scale: 28, speed: 0.35 },
      { x: -70, y: 95, z: -380, scale: 32, speed: 0.28 },
      { x: 90, y: 70, z: -250, scale: 20, speed: 0.45 },
      { x: -220, y: 82, z: -340, scale: 26, speed: 0.32 },
      { x: 210, y: 92, z: -360, scale: 30, speed: 0.3 },
      { x: -110, y: 65, z: -210, scale: 18, speed: 0.5 },
      { x: 40, y: 105, z: -420, scale: 35, speed: 0.22 },
    ];

    for (const cfg of cloudConfigs) {
      const cloud = this.createPencilCloudMesh(cfg.scale);
      cloud.position.set(cfg.x, cfg.y, cfg.z);
      this.cloudGroup.add(cloud);
      this.clouds.push({
        mesh: cloud,
        speed: cfg.speed,
        basePos: new THREE.Vector3(cfg.x, cfg.y, cfg.z),
      });
    }
  }

  private createPencilCloudMesh(scale: number): THREE.Group {
    const group = new THREE.Group();

    // Composite overlapping cloud puffs (3-4 spheres of varied sizes)
    const puffCount = 3 + Math.floor(Math.random() * 2);
    const puffOffsets = [
      { x: 0, y: 0, z: 0, r: scale * 0.45 },
      { x: -scale * 0.35, y: -scale * 0.08, z: 0, r: scale * 0.35 },
      { x: scale * 0.38, y: -scale * 0.06, z: 0, r: scale * 0.38 },
      { x: scale * 0.15, y: scale * 0.18, z: 0, r: scale * 0.32 },
    ];

    for (let i = 0; i < puffCount; i++) {
      const p = puffOffsets[i];
      const geo = new THREE.IcosahedronGeometry(p.r, 1);
      const mesh = new THREE.Mesh(geo, this.cloudMat);
      mesh.position.set(p.x, p.y, p.z);
      mesh.scale.set(1.1, 0.75, 0.85); // Flattened cumulus puff
      group.add(mesh);

      // Graphite outline
      const edges = new THREE.EdgesGeometry(geo);
      const outline = new THREE.LineSegments(edges, this.cloudLineMat);
      mesh.add(outline);
    }

    // Shadowed base plinth with cross-hatching underneath
    const baseW = scale * 0.95;
    const baseH = scale * 0.18;
    const baseGeo = new THREE.BoxGeometry(baseW, baseH, scale * 0.4);
    const baseMesh = new THREE.Mesh(baseGeo, this.cloudHatchMat);
    baseMesh.position.set(0, -scale * 0.22, 0);
    group.add(baseMesh);

    return group;
  }

  private buildRadiantSun(): void {
    // Stylized celestial compass sun with hand-drawn rays
    const sunRadius = 14.0;
    const discGeo = new THREE.CircleGeometry(sunRadius, 24);
    this.sunDisc = new THREE.Mesh(discGeo, this.sunMat);
    this.sunDisc.position.set(180, 140, -420);
    this.sunGroup.add(this.sunDisc);

    // Outline circle
    const ringGeo = new THREE.RingGeometry(sunRadius - 0.4, sunRadius + 0.3, 32);
    const ringMesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x423a32, side: THREE.DoubleSide }));
    this.sunDisc.add(ringMesh);

    // Concentric halo ring
    const haloGeo = new THREE.RingGeometry(sunRadius * 1.5, sunRadius * 1.55, 32);
    const haloMesh = new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({ color: 0x8a7e72, side: THREE.DoubleSide, transparent: true, opacity: 0.4 }));
    this.sunDisc.add(haloMesh);

    // Radiating architectural compass lines
    const rayPositions: number[] = [];
    const rayCount = 16;
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2;
      const innerR = sunRadius * 1.65;
      const outerR = sunRadius * (2.2 + (i % 2 === 0 ? 0.8 : 0.2));

      rayPositions.push(
        Math.cos(angle) * innerR,
        Math.sin(angle) * innerR,
        0,
        Math.cos(angle) * outerR,
        Math.sin(angle) * outerR,
        0
      );
    }

    const rayGeo = new THREE.BufferGeometry();
    rayGeo.setAttribute('position', new THREE.Float32BufferAttribute(rayPositions, 3));
    this.sunRays = new THREE.LineSegments(rayGeo, this.sunRayMat);
    this.sunDisc.add(this.sunRays);

    // Warm atmospheric soft backlight
    const glowGeo = new THREE.PlaneGeometry(sunRadius * 6, sunRadius * 6);
    this.sunGlow = new THREE.Mesh(
      glowGeo,
      new THREE.MeshBasicMaterial({
        color: 0xfffaed,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.sunGlow.position.z = -1;
    this.sunDisc.add(this.sunGlow);
  }

  private buildHorizonSilhouettes(): void {
    // 3 layered distant panoramic paper silhouette strips spanning 360 degrees around the horizon
    const layers = [
      { radius: 540, height: 48, count: 32, y: -8, color: 0xc2bab0, opacity: 0.38, style: 'MOUNTAINS_AND_SPIRES' },
      { radius: 440, height: 42, count: 36, y: -16, color: 0xd4cdc2, opacity: 0.52, style: 'SKYSCRAPER_SKYLINE' },
      { radius: 340, height: 32, count: 40, y: -24, color: 0xe6dfd5, opacity: 0.68, style: 'DISTRICT_SILHOUETTES' },
    ];

    for (const l of layers) {
      const group = new THREE.Group();
      for (let i = 0; i < l.count; i++) {
        const angle = (i / l.count) * Math.PI * 2;
        const x = Math.sin(angle) * l.radius;
        const z = Math.cos(angle) * l.radius;

        const w = (l.radius * Math.PI * 2) / l.count * 1.08;
        const h = l.height * (0.68 + Math.sin(i * 1.9 + l.radius * 0.01) * 0.36);
        const silhouetteGroup = new THREE.Group();

        const silMat = new THREE.MeshBasicMaterial({
          color: l.color,
          transparent: true,
          opacity: l.opacity,
        });

        if (l.style === 'SKYSCRAPER_SKYLINE') {
          // Tiered Art Deco skyscraper silhouette with spire or twin-tower notch
          const tier1H = h * 0.65;
          const geo1 = new THREE.BoxGeometry(w * 0.8, tier1H, 8);
          const m1 = new THREE.Mesh(geo1, silMat);
          m1.position.y = tier1H * 0.5;
          silhouetteGroup.add(m1);

          if (i % 3 === 0) {
            // Stepped crown + needle
            const tier2H = h * 0.28;
            const geo2 = new THREE.BoxGeometry(w * 0.5, tier2H, 8);
            const m2 = new THREE.Mesh(geo2, silMat);
            m2.position.y = tier1H + tier2H * 0.5;
            silhouetteGroup.add(m2);

            const needleGeo = new THREE.ConeGeometry(0.8, h * 0.3, 4);
            const needle = new THREE.Mesh(needleGeo, silMat);
            needle.position.y = tier1H + tier2H + h * 0.15;
            silhouetteGroup.add(needle);
          } else if (i % 3 === 1) {
            // Twin tower silhouette
            const twH = h * 0.45;
            const twW = w * 0.3;
            for (const ts of [-w * 0.22, w * 0.22]) {
              const twGeo = new THREE.BoxGeometry(twW, twH, 8);
              const tw = new THREE.Mesh(twGeo, silMat);
              tw.position.set(ts, tier1H + twH * 0.5, 0);
              silhouetteGroup.add(tw);
            }
          }
        } else if (l.style === 'MOUNTAINS_AND_SPIRES') {
          // Alternating craggy mountain peak and cathedral needle spire
          if (i % 2 === 0) {
            const peakGeo = new THREE.ConeGeometry(w * 0.65, h, 4);
            const peak = new THREE.Mesh(peakGeo, silMat);
            peak.position.y = h * 0.5;
            silhouetteGroup.add(peak);
          } else {
            const towerGeo = new THREE.BoxGeometry(w * 0.45, h * 0.7, 8);
            const tower = new THREE.Mesh(towerGeo, silMat);
            tower.position.y = h * 0.35;
            silhouetteGroup.add(tower);

            const spireGeo = new THREE.ConeGeometry(w * 0.3, h * 0.5, 4);
            const spire = new THREE.Mesh(spireGeo, silMat);
            spire.position.y = h * 0.7 + h * 0.25;
            silhouetteGroup.add(spire);
          }
        } else {
          // Mid-height stepped district buildings & roof water tanks
          const baseH = h * 0.75;
          const baseGeo = new THREE.BoxGeometry(w * 0.85, baseH, 10);
          const base = new THREE.Mesh(baseGeo, silMat);
          base.position.y = baseH * 0.5;
          silhouetteGroup.add(base);

          if (i % 2 === 0) {
            const tankGeo = new THREE.CylinderGeometry(w * 0.18, w * 0.18, 3.5, 8);
            const tank = new THREE.Mesh(tankGeo, silMat);
            tank.position.set(w * 0.2, baseH + 2.0, 0);
            silhouetteGroup.add(tank);
          }
        }

        silhouetteGroup.position.set(x, l.y, z);
        silhouetteGroup.lookAt(0, l.y, 0);

        // Add subtle graphite edge lines across silhouette meshes
        silhouetteGroup.traverse((child) => {
          if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).geometry) {
            const edges = new THREE.EdgesGeometry((child as THREE.Mesh).geometry);
            const edgeLine = new THREE.LineSegments(edges, this.horizonLineMat);
            child.add(edgeLine);
            this.horizonMeshes.push(child as THREE.Mesh);
          }
        });

        group.add(silhouetteGroup);
      }
      this.horizonGroup.add(group);
    }
  }

  public update(cameraPos: THREE.Vector3, dt: number): void {
    // 1. Center sky components around the camera so the player never escapes or outruns the sky
    this.cloudGroup.position.x = cameraPos.x * 0.65;
    this.cloudGroup.position.z = cameraPos.z * 0.65;
    this.cloudGroup.position.y = cameraPos.y * 0.5;

    this.horizonGroup.position.x = cameraPos.x;
    this.horizonGroup.position.z = cameraPos.z;
    this.horizonGroup.position.y = cameraPos.y * 0.3; // Horizon moves slowly with height for parallax

    this.sunGroup.position.x = cameraPos.x;
    this.sunGroup.position.z = cameraPos.z;
    this.sunGroup.position.y = cameraPos.y * 0.4;
    this.sunDisc.lookAt(cameraPos);

    // 2. Slow subtle cloud drift
    for (const c of this.clouds) {
      c.mesh.position.x += dt * c.speed * 1.5;
      if (c.mesh.position.x > 320) {
        c.mesh.position.x = -320;
      }
    }

    // 3. Gentle rotation of celestial sun rays
    if (this.sunRays) {
      this.sunRays.rotation.z += dt * 0.04;
    }

    // 4. Update airborne paper/graphite dust
    const pos = this.dustPositions;
    const vel = this.dustVelocities;
    const pX = cameraPos.x;
    const pY = cameraPos.y;
    const pZ = cameraPos.z;

    for (let i = 0; i < this.dustCount; i++) {
      const idx = i * 3;
      pos[idx + 0] += vel[idx + 0] * dt * 4.0;
      pos[idx + 1] += vel[idx + 1] * dt * 3.0;
      pos[idx + 2] += vel[idx + 2] * dt * 4.0;

      // Wrap around camera box (140m cube)
      if (pos[idx + 0] < pX - 70) pos[idx + 0] += 140;
      else if (pos[idx + 0] > pX + 70) pos[idx + 0] -= 140;

      if (pos[idx + 1] < pY - 20) pos[idx + 1] += 50;
      else if (pos[idx + 1] > pY + 30) pos[idx + 1] -= 50;

      if (pos[idx + 2] < pZ - 70) pos[idx + 2] += 140;
      else if (pos[idx + 2] > pZ + 70) pos[idx + 2] -= 140;
    }
    this.dustGeo.attributes.position.needsUpdate = true;
  }

  public applyPencilStyle(style: PencilStyleDefinition): void {
    if (!style || !style.skyTheme) return;
    this.currentStyle = style;
    this.cloudMat.color.setHex(style.skyTheme.cloudColor);
    this.cloudHatchMat.color.setHex(style.skyTheme.cloudHatchColor);
    this.cloudLineMat.color.setHex(style.outlineColor);

    this.horizonLineMat.color.setHex(style.faintLineColor);
    this.horizonMat.color.setHex(style.skyTheme.horizonColor);
    this.sunRayMat.color.setHex(style.skyTheme.sunRayColor);
    this.sunMat.color.setHex(style.skyTheme.sunDiscColor);
    this.dustMat.color.setHex(style.skyTheme.dustColor);

    for (const m of this.horizonMeshes) {
      (m.material as THREE.MeshBasicMaterial).color.setHex(style.skyTheme.horizonColor);
    }
  }

  public applyStageTheme(stage: StageInfo): void {
    // If a custom pencil style is active, preserve the pencil's artistic sky direction!
    if (this.currentStyle && this.currentStyle.id !== 'classic_hb') {
      return;
    }

    // Adapt clouds, sun, and silhouettes to current world chapter
    switch (stage.id) {
      case 'SKETCHBOOK':
        this.cloudMat.color.setHex(0xfffcf7);
        this.cloudHatchMat.color.setHex(0x5a524a);
        this.sunMat.color.setHex(0xfff3d6);
        this.horizonMat.color.setHex(0xded8ce);
        break;
      case 'CITY':
        this.cloudMat.color.setHex(0xf5f3ee);
        this.cloudHatchMat.color.setHex(0x403b35);
        this.sunMat.color.setHex(0xfde68a);
        this.horizonMat.color.setHex(0xc8c2b7);
        break;
      case 'ROOFTOPS':
        this.cloudMat.color.setHex(0xf8fafc);
        this.cloudHatchMat.color.setHex(0x334155);
        this.sunMat.color.setHex(0xfbbf24);
        this.horizonMat.color.setHex(0x94a3b8);
        break;
      case 'MOUNTAINS':
        this.cloudMat.color.setHex(0xf1f5f9);
        this.cloudHatchMat.color.setHex(0x1e293b);
        this.sunMat.color.setHex(0xffffff);
        this.horizonMat.color.setHex(0x64748b);
        break;
      case 'INK_WORLD':
        this.cloudMat.color.setHex(0x27272a);
        this.cloudHatchMat.color.setHex(0x09090b);
        this.sunMat.color.setHex(0xef4444);
        this.horizonMat.color.setHex(0x18181b);
        break;
      case 'BLUEPRINT':
        this.cloudMat.color.setHex(0x075985);
        this.cloudHatchMat.color.setHex(0x0284c7);
        this.sunMat.color.setHex(0x38bdf8);
        this.horizonMat.color.setHex(0x0c4a6e);
        break;
    }
  }

  public reset(): void {
    for (const c of this.clouds) {
      c.mesh.position.copy(c.basePos);
    }
  }
}

import * as THREE from 'three';
import { CONFIG } from './config';
import { randomRange } from './utils';
import { PencilStyleDefinition, PENCIL_STYLES } from './PencilStyleSystem';

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Vector3;
  rotVel: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
  isShaving: boolean;
}

export class Effects {
  public group: THREE.Group;
  private currentStyle: PencilStyleDefinition = PENCIL_STYLES['classic_hb'];

  // Particle System
  private particleGeo: THREE.BufferGeometry;
  private particlePositions: Float32Array;
  private particleSizes: Float32Array;
  private particleColors: Float32Array;
  private particleMesh: THREE.Points;
  private particles: Particle[] = [];
  private maxParticles = 600;

  // Ball sketch trail line on paper
  private trailGeo: THREE.BufferGeometry;
  private trailLine: THREE.Line;
  private trailMat: THREE.LineBasicMaterial;
  private trailPositions: Float32Array;
  private maxTrailPoints = 60;
  private trailHistory: THREE.Vector3[] = [];
  private trailTimer = 0;
  private currentTrailSkin = 'graphite_dust';

  // Background sketch decorations
  private backgroundDecorations: THREE.Group;
  private doodleMat!: THREE.LineBasicMaterial;

  constructor() {
    this.group = new THREE.Group();

    // 1. Particle System Setup
    this.particlePositions = new Float32Array(this.maxParticles * 3);
    this.particleSizes = new Float32Array(this.maxParticles);
    this.particleColors = new Float32Array(this.maxParticles * 3);

    this.particleGeo = new THREE.BufferGeometry();
    this.particleGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.particlePositions, 3)
    );
    this.particleGeo.setAttribute('size', new THREE.BufferAttribute(this.particleSizes, 1));
    this.particleGeo.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));

    // Custom round/soft graphite flake particle canvas texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Soft radial graphite puff with sketchy rough contour
      const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 28);
      grad.addColorStop(0, 'rgba(34, 31, 29, 1)');
      grad.addColorStop(0.65, 'rgba(45, 41, 38, 0.85)');
      grad.addColorStop(1, 'rgba(45, 41, 38, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(32, 32, 30, 0, Math.PI * 2);
      ctx.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);

    const particleMat = new THREE.PointsMaterial({
      size: 0.35,
      map: texture,
      transparent: true,
      opacity: 0.85,
      vertexColors: true,
      depthWrite: false,
    });

    this.particleMesh = new THREE.Points(this.particleGeo, particleMat);
    this.particleMesh.frustumCulled = false;
    this.group.add(this.particleMesh);

    // 2. Graphite Rolling Skid Trail Line
    this.trailPositions = new Float32Array(this.maxTrailPoints * 3);
    this.trailGeo = new THREE.BufferGeometry();
    this.trailGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.trailPositions, 3)
    );
    this.trailGeo.setDrawRange(0, 0);

    this.trailMat = new THREE.LineBasicMaterial({
      color: 0x3d352e,
      linewidth: 2,
      transparent: true,
      opacity: 0.45,
    });
    this.trailLine = new THREE.Line(this.trailGeo, this.trailMat);
    this.trailLine.frustumCulled = false;
    this.group.add(this.trailLine);

    // 3. Background Paper Sketch Markings
    this.backgroundDecorations = new THREE.Group();
    this.group.add(this.backgroundDecorations);
    this.createBackgroundSketches();
  }

  private createBackgroundSketches(): void {
    this.doodleMat = new THREE.LineBasicMaterial({
      color: this.currentStyle ? this.currentStyle.faintLineColor : 0xcdc5b6,
      transparent: true,
      opacity: 0.4,
      linewidth: 1,
    });

    // Compass arcs and geometric math sketches in the vast margins
    for (let i = 0; i < 30; i++) {
      const g = new THREE.Group();
      const radius = randomRange(5, 18);
      const circleGeo = new THREE.BufferGeometry();
      const circlePts: THREE.Vector3[] = [];
      const segs = 28;
      for (let s = 0; s <= segs; s++) {
        const theta = (s / segs) * Math.PI * 2;
        circlePts.push(
          new THREE.Vector3(
            Math.cos(theta) * radius + (Math.random() - 0.5) * 0.25,
            0,
            Math.sin(theta) * radius + (Math.random() - 0.5) * 0.25
          )
        );
      }
      circleGeo.setFromPoints(circlePts);
      const circleLine = new THREE.Line(circleGeo, this.doodleMat);
      circleLine.frustumCulled = false;
      g.add(circleLine);

      g.position.set(
        randomRange(-240, 240),
        randomRange(-70, -20),
        randomRange(-400, 200)
      );
      g.rotation.set(randomRange(-0.2, 0.2), randomRange(0, Math.PI), randomRange(-0.2, 0.2));
      this.backgroundDecorations.add(g);
    }
  }

  public reset(): void {
    this.particles = [];
    this.trailHistory = [];
    this.trailGeo.setDrawRange(0, 0);
    this.updateBuffers();
  }

  public setTrailSkin(skinId: string): void {
    this.currentTrailSkin = skinId;
    switch (skinId) {
      case 'ink_splash':
        this.trailMat.color.setHex(0x11100f);
        this.trailMat.opacity = 0.65;
        break;
      case 'paper_shavings':
        this.trailMat.color.setHex(0xb58a5f);
        this.trailMat.opacity = 0.4;
        break;
      case 'gold_shimmer':
        this.trailMat.color.setHex(0xf59e0b);
        this.trailMat.opacity = 0.55;
        break;
      case 'blueprint_lines':
        this.trailMat.color.setHex(0x00f0ff);
        this.trailMat.opacity = 0.75;
        break;
      case 'graphite_dust':
      default:
        this.trailMat.color.setHex(this.currentStyle ? this.currentStyle.ballTrailColor : 0x3d352e);
        this.trailMat.opacity = this.currentStyle ? this.currentStyle.ballTrailOpacity : 0.45;
        break;
    }
  }

  public applyPencilStyle(style: PencilStyleDefinition): void {
    if (!style) return;
    this.currentStyle = style;
    if (this.currentTrailSkin === 'graphite_dust') {
      this.trailMat.color.setHex(style.ballTrailColor);
      this.trailMat.opacity = style.ballTrailOpacity;
    }
    if (this.doodleMat) {
      this.doodleMat.color.setHex(style.faintLineColor);
    }
  }

  /**
   * Spawns graphite dust and curled pencil shavings behind the rolling ball
   */
  public emitBallTrail(
    contactPos: THREE.Vector3,
    tangent: THREE.Vector3,
    right: THREE.Vector3,
    speed: number,
    isAirborne: boolean,
    isBoosted = false
  ): void {
    if (isAirborne) return;

    // 1. Record trail point for roll line
    this.trailTimer += 1;
    const trailInterval = isBoosted ? 1 : 2;
    if (this.trailTimer % trailInterval === 0) {
      this.trailHistory.unshift(contactPos.clone().add(new THREE.Vector3(0, 0.02, 0)));
      if (this.trailHistory.length > this.maxTrailPoints) {
        this.trailHistory.pop();
      }
      this.updateTrailBuffer();
    }

    if (this.particles.length >= this.maxParticles) return;

    // 2. Custom Trail Particles (Tailored to active equipped skin!)
    const dustCount = isBoosted ? (Math.random() > 0.3 ? 5 : 4) : Math.random() > 0.4 ? 2 : 1;
    for (let i = 0; i < dustCount; i++) {
      const spreadX = (Math.random() - 0.5) * (isBoosted ? 0.8 : 0.4);
      const spreadZ = (Math.random() - 0.5) * 0.3;
      const pPos = contactPos
        .clone()
        .add(right.clone().multiplyScalar(spreadX))
        .add(new THREE.Vector3(0, 0.05, 0));

      const pSize = isBoosted ? randomRange(0.4, 0.75) : randomRange(0.2, 0.38);

      let pColor: THREE.Color;
      if (isBoosted && Math.random() > 0.65) {
        pColor = new THREE.Color(CONFIG.visual.leadGold);
      } else {
        switch (this.currentTrailSkin) {
          case 'ink_splash':
            pColor = new THREE.Color(Math.random() > 0.4 ? 0x0f0e0d : 0x2b2723);
            break;
          case 'gold_shimmer':
            pColor = new THREE.Color(Math.random() > 0.3 ? 0xf59e0b : 0xd97706);
            break;
          case 'blueprint_lines':
            pColor = new THREE.Color(Math.random() > 0.3 ? 0x00f0ff : 0x38bdf8);
            break;
          case 'paper_shavings':
            pColor = new THREE.Color(Math.random() > 0.5 ? 0xead9b6 : 0xd4a373);
            break;
          case 'graphite_dust':
          default:
            if (this.currentStyle && this.currentStyle.dustColors.length > 0) {
              const hex = this.currentStyle.dustColors[Math.floor(Math.random() * this.currentStyle.dustColors.length)];
              pColor = new THREE.Color(hex);
            } else {
              pColor = Math.random() > 0.5
                ? new THREE.Color(CONFIG.visual.graphiteDark)
                : new THREE.Color(CONFIG.visual.graphiteMedium);
            }
            break;
        }
      }

      this.particles.push({
        pos: pPos,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * (isBoosted ? 2.5 : 0.8),
          Math.random() * (isBoosted ? 2.2 : 0.8) + 0.2,
          (Math.random() - 0.5) * (isBoosted ? 2.5 : 0.8)
        ).add(tangent.clone().multiplyScalar(-speed * (isBoosted ? 0.4 : 0.25))),
        rot: new THREE.Vector3(),
        rotVel: new THREE.Vector3(),
        life: 0,
        maxLife: isBoosted ? randomRange(0.5, 0.85) : randomRange(0.35, 0.65),
        size: pSize,
        color: pColor,
        isShaving: false,
      });
    }

    // 3. Pencil Shavings (curled wood shavings with lacquer rim)
    const shavingChance = isBoosted ? 0.35 : 0.65;
    if (Math.random() > shavingChance) {
      const shavingPos = contactPos
        .clone()
        .add(right.clone().multiplyScalar((Math.random() - 0.5) * (isBoosted ? 0.9 : 0.5)))
        .add(new THREE.Vector3(0, 0.1, 0));

      const isWood = Math.random() > 0.3;
      const col = isWood
        ? new THREE.Color(this.currentStyle ? this.currentStyle.shavingColor : (isBoosted ? 0xf0b830 : 0xe5a93c))
        : new THREE.Color(this.currentStyle ? this.currentStyle.accentColor : 0xebd9b5);

      this.particles.push({
        pos: shavingPos,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * (isBoosted ? 4.5 : 2.2),
          Math.random() * (isBoosted ? 3.5 : 2.0) + 0.8,
          (Math.random() - 0.5) * (isBoosted ? 4.5 : 2.2)
        ).add(tangent.clone().multiplyScalar(-speed * (isBoosted ? 0.45 : 0.3))),
        rot: new THREE.Vector3(Math.random() * Math.PI, Math.random() * Math.PI, 0),
        rotVel: new THREE.Vector3(randomRange(-12, 12), randomRange(-12, 12), randomRange(-12, 12)),
        life: 0,
        maxLife: isBoosted ? randomRange(0.65, 1.1) : randomRange(0.5, 0.9),
        size: isBoosted ? randomRange(0.4, 0.65) : randomRange(0.25, 0.45),
        color: col,
        isShaving: true,
      });
    }
  }

  /**
   * Spawns celebration sparkles when a pencil lead power-up is collected
   */
  public emitPowerUpCollect(pos: THREE.Vector3): void {
    const count = 35;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = (i / count) * Math.PI * 2;
      const speed = randomRange(3.5, 8.5);
      const isGold = Math.random() > 0.3;

      this.particles.push({
        pos: pos.clone(),
        vel: new THREE.Vector3(
          Math.cos(angle) * speed,
          randomRange(1.5, 6.0),
          Math.sin(angle) * speed
        ),
        rot: new THREE.Vector3(),
        rotVel: new THREE.Vector3(randomRange(-15, 15), randomRange(-15, 15), randomRange(-15, 15)),
        life: 0,
        maxLife: randomRange(0.6, 1.2),
        size: randomRange(0.25, 0.45),
        color: new THREE.Color(isGold ? (this.currentStyle ? this.currentStyle.sparksColor : CONFIG.visual.leadGold) : (this.currentStyle ? this.currentStyle.primaryColor : CONFIG.visual.graphiteDark)),
        isShaving: true,
      });
    }
  }

  /**
   * Spawns graphite shimmer when an in-run graphite shard is collected
   */
  public emitGraphiteCollect(pos: THREE.Vector3): void {
    const count = 12;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = (i / count) * Math.PI * 2;
      const speed = randomRange(1.8, 4.2);
      this.particles.push({
        pos: pos.clone(),
        vel: new THREE.Vector3(
          Math.cos(angle) * speed,
          randomRange(1.0, 3.5),
          Math.sin(angle) * speed
        ),
        rot: new THREE.Vector3(),
        rotVel: new THREE.Vector3(randomRange(-10, 10), randomRange(-10, 10), randomRange(-10, 10)),
        life: 0,
        maxLife: randomRange(0.4, 0.75),
        size: randomRange(0.18, 0.32),
        color: new THREE.Color(this.currentStyle ? this.currentStyle.collectibleColor : 0x221f1d),
        isShaving: false,
      });
    }
  }

  /**
   * Spawns sketch puff burst when the pencil draws an obstacle onto the road
   */
  public emitObstacleSketchBurst(pos: THREE.Vector3): void {
    const count = 18;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = (i / count) * Math.PI * 2;
      const speed = randomRange(1.5, 4.0);
      this.particles.push({
        pos: pos.clone(),
        vel: new THREE.Vector3(
          Math.cos(angle) * speed,
          randomRange(0.8, 3.2),
          Math.sin(angle) * speed
        ),
        rot: new THREE.Vector3(),
        rotVel: new THREE.Vector3(),
        life: 0,
        maxLife: randomRange(0.35, 0.65),
        size: randomRange(0.2, 0.38),
        color: new THREE.Color(this.currentStyle ? this.currentStyle.primaryColor : 0x3d3833),
        isShaving: false,
      });
    }
  }

  /**
   * Spawns graphite specks when pencil draws ahead
   */
  public emitPencilGraphite(pos: THREE.Vector3, tangent: THREE.Vector3): void {
    if (this.particles.length >= this.maxParticles) return;

    for (let i = 0; i < 2; i++) {
      this.particles.push({
        pos: pos.clone().add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.15,
            Math.random() * 0.1,
            (Math.random() - 0.5) * 0.15
          )
        ),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 1.6,
          Math.random() * 2.2 + 0.5,
          (Math.random() - 0.5) * 1.6
        ).add(tangent.clone().multiplyScalar(-1.2)),
        rot: new THREE.Vector3(),
        rotVel: new THREE.Vector3(),
        life: 0,
        maxLife: randomRange(0.3, 0.6),
        size: randomRange(0.12, 0.22),
        color: new THREE.Color(this.currentStyle ? this.currentStyle.primaryColor : CONFIG.visual.graphiteDark),
        isShaving: false,
      });
    }
  }

  public emitGraphiteDustSparks(pos: THREE.Vector3, isShaving = false): void {
    if (this.particles.length >= this.maxParticles) return;
    const count = isShaving ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const pColor = isShaving
        ? new THREE.Color(this.currentStyle ? this.currentStyle.shavingColor : 0xead9b6)
        : new THREE.Color(this.currentStyle ? this.currentStyle.primaryColor : 0x221f1d);
      this.particles.push({
        pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.1, Math.random() * 0.08, (Math.random() - 0.5) * 0.1)),
        vel: new THREE.Vector3((Math.random() - 0.5) * 0.8, Math.random() * 0.8 + 0.2, (Math.random() - 0.5) * 0.8),
        rot: new THREE.Vector3(),
        rotVel: new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, 0),
        life: 0,
        maxLife: randomRange(0.2, 0.5),
        size: isShaving ? randomRange(0.2, 0.35) : randomRange(0.08, 0.16),
        color: pColor,
        isShaving,
      });
    }
  }

  /**
   * Spawns dust puff when ball lands on paper
   */
  public emitLandingPuff(pos: THREE.Vector3): void {
    const count = 16;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = (i / count) * Math.PI * 2;
      const speed = randomRange(2.0, 4.5);
      this.particles.push({
        pos: pos.clone(),
        vel: new THREE.Vector3(
          Math.cos(angle) * speed,
          randomRange(0.8, 2.5),
          Math.sin(angle) * speed
        ),
        rot: new THREE.Vector3(),
        rotVel: new THREE.Vector3(),
        life: 0,
        maxLife: randomRange(0.4, 0.75),
        size: randomRange(0.2, 0.4),
        color: new THREE.Color(this.currentStyle ? this.currentStyle.puffColor : CONFIG.visual.graphiteDark),
        isShaving: Math.random() > 0.6,
      });
    }
  }

  /**
   * Spawns collision graphite shatter
   */
  public emitCollisionShatter(pos: THREE.Vector3): void {
    const count = 45;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      this.particles.push({
        pos: pos.clone(),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 12,
          Math.random() * 9 + 2,
          (Math.random() - 0.5) * 12
        ),
        rot: new THREE.Vector3(),
        rotVel: new THREE.Vector3(randomRange(-10, 10), randomRange(-10, 10), randomRange(-10, 10)),
        life: 0,
        maxLife: randomRange(0.7, 1.4),
        size: randomRange(0.22, 0.5),
        color: new THREE.Color(
          Math.random() > 0.6
            ? (this.currentStyle ? this.currentStyle.primaryColor : CONFIG.visual.graphiteDark)
            : Math.random() > 0.5
            ? (this.currentStyle ? this.currentStyle.accentColor : CONFIG.visual.pencilBodyColor)
            : (this.currentStyle ? this.currentStyle.secondaryColor : CONFIG.visual.eraserColor)
        ),
        isShaving: true,
      });
    }
  }

  /**
   * Spawns stage-specific atmospheric hazard particles (wind dust, ink droplets, eraser storms)
   */
  public emitEnvironmentalHazards(
    pos: THREE.Vector3,
    stageId: string,
    windForce: number,
    dt: number
  ): void {
    if (this.particles.length >= this.maxParticles - 10) return;

    // 1. Crosswind graphite specks
    if (Math.abs(windForce) > 1.0 && Math.random() < 0.45) {
      this.particles.push({
        pos: new THREE.Vector3(
          pos.x + randomRange(-18, 18) - Math.sign(windForce) * 15,
          pos.y + randomRange(1, 8),
          pos.z + randomRange(-15, 25)
        ),
        vel: new THREE.Vector3(
          windForce * randomRange(4.0, 7.5),
          randomRange(-0.5, 0.5),
          randomRange(-2, 2)
        ),
        rot: new THREE.Vector3(),
        rotVel: new THREE.Vector3(),
        life: 0,
        maxLife: randomRange(0.6, 1.1),
        size: randomRange(0.15, 0.32),
        color: new THREE.Color(CONFIG.visual.graphiteDark),
        isShaving: false,
      });
    }

    // 2. Ink Rain droplets in Ink World
    if (stageId === 'INK_WORLD' && Math.random() < 0.4) {
      this.particles.push({
        pos: new THREE.Vector3(
          pos.x + randomRange(-12, 12),
          pos.y + randomRange(12, 22),
          pos.z + randomRange(-10, 30)
        ),
        vel: new THREE.Vector3(
          randomRange(-0.5, 0.5),
          randomRange(-16, -24), // falling drops
          randomRange(-1, 1)
        ),
        rot: new THREE.Vector3(),
        rotVel: new THREE.Vector3(),
        life: 0,
        maxLife: randomRange(0.5, 0.9),
        size: randomRange(0.2, 0.4),
        color: new THREE.Color(0x0a0908),
        isShaving: false,
      });
    }

    // 3. Eraser Dust Flakes during mountain/storm
    if (stageId === 'MOUNTAINS' && Math.random() < 0.25) {
      this.particles.push({
        pos: new THREE.Vector3(
          pos.x + randomRange(-16, 16),
          pos.y + randomRange(2, 10),
          pos.z + randomRange(-10, 25)
        ),
        vel: new THREE.Vector3(
          randomRange(-3, 3),
          randomRange(-1, 1.5),
          randomRange(-3, 3)
        ),
        rot: new THREE.Vector3(),
        rotVel: new THREE.Vector3(),
        life: 0,
        maxLife: randomRange(0.8, 1.5),
        size: randomRange(0.2, 0.35),
        color: new THREE.Color(0xe07272),
        isShaving: true,
      });
    }
  }

  public update(dt: number, playerPos: THREE.Vector3): void {
    // Keep background decorations roughly centered around player
    this.backgroundDecorations.position.z = playerPos.z;

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      // Air resistance and gravity
      p.vel.y -= (p.isShaving ? 6.5 : 10.0) * dt;
      p.vel.x *= 0.96;
      p.vel.z *= 0.96;
      p.pos.addScaledVector(p.vel, dt);
    }

    this.updateBuffers();
  }

  private updateTrailBuffer(): void {
    const count = this.trailHistory.length;
    for (let i = 0; i < count; i++) {
      const pt = this.trailHistory[i];
      this.trailPositions[i * 3] = pt.x;
      this.trailPositions[i * 3 + 1] = pt.y;
      this.trailPositions[i * 3 + 2] = pt.z;
    }
    const posAttr = this.trailGeo.attributes.position as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    this.trailGeo.setDrawRange(0, count);
  }

  private updateBuffers(): void {
    const count = this.particles.length;

    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      const i3 = i * 3;

      this.particlePositions[i3] = p.pos.x;
      this.particlePositions[i3 + 1] = p.pos.y;
      this.particlePositions[i3 + 2] = p.pos.z;

      const progress = p.life / p.maxLife;
      this.particleSizes[i] = p.size * (1 - progress * 0.8);

      this.particleColors[i3] = p.color.r;
      this.particleColors[i3 + 1] = p.color.g;
      this.particleColors[i3 + 2] = p.color.b;
    }

    const posAttr = this.particleGeo.attributes.position as THREE.BufferAttribute;
    const sizeAttr = this.particleGeo.attributes.size as THREE.BufferAttribute;
    const colAttr = this.particleGeo.attributes.color as THREE.BufferAttribute;

    posAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    this.particleGeo.setDrawRange(0, count);
  }
}

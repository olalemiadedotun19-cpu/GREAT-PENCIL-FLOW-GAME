import * as THREE from 'three';
import { CONFIG } from './config';
import { GameState } from './GameState';
import { FlowPath } from './FlowPath';
import { PathGenerator } from './PathGenerator';
import { DrawingSystem } from './DrawingSystem';
import { Pencil } from './Pencil';
import { PlayerBall } from './PlayerBall';
import { ObstacleSystem } from './ObstacleSystem';
import { CollisionSystem } from './CollisionSystem';
import { InputController } from './InputController';
import { CameraController } from './CameraController';
import { Effects } from './Effects';
import { CitySystem } from './CitySystem';
import { PowerUpSystem } from './PowerUpSystem';
import { CollectibleSystem } from './CollectibleSystem';
import { AudioManager } from './AudioManager';
import { SaveSystem } from './SaveSystem';
import { WorldEvolutionSystem } from './WorldEvolutionSystem';
import { UI } from './UI';

export class Game {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private dirLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;

  // Systems
  private saveSystem: SaveSystem;
  private gameState: GameState;
  private audioManager: AudioManager;
  private flowPath: FlowPath;
  private pathGenerator: PathGenerator;
  private drawingSystem: DrawingSystem;
  private pencil: Pencil;
  private playerBall: PlayerBall;
  private obstacleSystem: ObstacleSystem;
  private powerUpSystem: PowerUpSystem;
  private collectibleSystem: CollectibleSystem;
  private collisionSystem: CollisionSystem;
  private cameraController: CameraController;
  private effects: Effects;
  private citySystem: CitySystem;
  private worldEvolutionSystem: WorldEvolutionSystem;
  private inputController: InputController;
  private ui: UI;

  // In-run session trackers
  private runGraphite = 0;
  private runLeads = 0;
  private runDodges = 0;
  private runJumps = 0;
  private runCloseCalls = 0;
  private runPerfectLandings = 0;
  private comboMultiplier = 1;
  private comboTimer = 0;
  private maxRunCombo = 1;
  private isDailyChallenge = false;
  private airborneOverObstacle = false;

  // Animation timing
  private lastTime = 0;
  private isRunning = false;
  private pencilDrawDistance = 60;
  private fallTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // 1. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(CONFIG.visual.paperColor, 1);

    // 2. Scene & Fog
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(CONFIG.visual.paperColor, 70, 320);

    // 3. Lighting (Desk lamp on sketchbook)
    this.ambientLight = new THREE.AmbientLight(0xfffbf2, 0.85);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xfff5e6, 0.95);
    this.dirLight.position.set(30, 60, 40);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 200;
    const d = 35;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.001;
    this.scene.add(this.dirLight);

    // 4. Core Systems
    this.saveSystem = new SaveSystem();
    this.gameState = new GameState();
    this.audioManager = new AudioManager(this.saveSystem.getData().settings.soundEnabled);

    this.flowPath = new FlowPath();
    this.pathGenerator = new PathGenerator(this.flowPath);

    this.drawingSystem = new DrawingSystem(this.flowPath);
    this.scene.add(this.drawingSystem.group);

    this.pencil = new Pencil();
    this.scene.add(this.pencil.group);

    this.playerBall = new PlayerBall();
    this.scene.add(this.playerBall.group);

    this.obstacleSystem = new ObstacleSystem(this.flowPath);
    this.scene.add(this.obstacleSystem.group);

    // Obstacle Sketching Feedback
    this.obstacleSystem.onObstacleDrawn = (pos) => {
      this.effects.emitObstacleSketchBurst(pos);
      this.audioManager.playObstacleSketched();
      this.pencil.triggerSketchPulse();
    };

    this.powerUpSystem = new PowerUpSystem(this.flowPath);
    this.scene.add(this.powerUpSystem.group);

    this.collectibleSystem = new CollectibleSystem(this.flowPath);
    this.scene.add(this.collectibleSystem.group);

    this.collisionSystem = new CollisionSystem();
    this.cameraController = new CameraController();

    this.effects = new Effects();
    this.scene.add(this.effects.group);

    this.citySystem = new CitySystem(this.flowPath);
    this.scene.add(this.citySystem.group);

    // World Evolution & Progressive Chapter System
    this.worldEvolutionSystem = new WorldEvolutionSystem(this.flowPath, this.saveSystem);
    this.scene.add(this.worldEvolutionSystem.group);

    this.worldEvolutionSystem.onStageChanged = (stage) => {
      this.ui.showToast(`${stage.chapter}: ${stage.name}`);
      this.audioManager.playPerfectLanding();
    };

    this.worldEvolutionSystem.onSetPieceTriggered = (event) => {
      this.ui.showToast(`EVENT: ${event.name}!`);
      if (this.saveSystem.getData().settings.cameraShake) {
        this.cameraController.addTrauma(0.5);
      }
      this.audioManager.playPowerUp();
    };

    this.worldEvolutionSystem.onDiscoveryUnlocked = (_id, name, _desc, xp) => {
      this.ui.showToast(`DISCOVERED: ${name} (+${xp} XP)`);
      this.saveSystem.addXP(xp);
    };

    // Apply saved cosmetics & settings
    this.applyEquippedCosmetics();

    // 5. Input
    this.inputController = new InputController(this.canvas, {
      onDragDelta: (deltaLateral) => {
        if (this.gameState.getMode() === 'PLAYING') {
          this.playerBall.shiftTargetLateral(deltaLateral);
        }
      },
      onJump: () => this.triggerJump(),
      onPauseToggle: () => {
        const mode = this.gameState.getMode();
        if (mode === 'PLAYING') {
          this.pause();
        } else if (mode === 'PAUSED') {
          this.resume();
        }
      },
    });

    this.applySettings();

    // 6. UI
    this.ui = new UI(
      {
        onPlay: (isDaily) => this.startNewRun(isDaily),
        onPause: () => this.pause(),
        onResume: () => this.resume(),
        onRestart: () => this.startNewRun(this.isDailyChallenge),
        onMenu: () => this.goToMenu(),
        onJump: () => this.triggerJump(),
        onToggleSound: () => {
          const s = this.saveSystem.getData().settings;
          s.soundEnabled = !s.soundEnabled;
          this.saveSystem.save();
          this.audioManager.setEnabled(s.soundEnabled);
          this.ui.updateSoundDisplay(s.soundEnabled);
        },
        onEquipCosmetic: (cat, id) => {
          if (cat === 'BALL') this.playerBall.setSkin(id);
          else if (cat === 'PENCIL') this.pencil.setSkin(id);
          else if (cat === 'TRAIL') this.effects.setTrailSkin(id);
          else if (cat === 'WORLD') this.applyWorldTheme(id);
        },
        onSettingsChange: () => this.applySettings(),
      },
      this.saveSystem
    );

    // Subscribe UI to GameState events
    this.gameState.subscribe({
      onStateChange: (state) => this.ui.updateState(state, this.gameState),
      onScoreUpdate: (score, dist, spd) => this.ui.updateScore(score, dist, spd),
      onSoundChange: (enabled) => this.ui.updateSoundDisplay(enabled),
    });

    // Initial setup
    this.ui.updateSoundDisplay(this.saveSystem.getData().settings.soundEnabled);
    this.ui.updateState('MENU', this.gameState);

    // Setup initial track preview
    this.resetWorld();

    window.addEventListener('resize', this.onResize.bind(this));
    this.onResize();

    // Start render loop
    this.isRunning = true;
    requestAnimationFrame(this.animate.bind(this));
  }

  public triggerJump(): void {
    if (this.gameState.getMode() === 'PLAYING') {
      if (this.playerBall.jump()) {
        this.runJumps++;
        this.audioManager.playJump();
        const pDist = this.playerBall.state.distance;
        const nearby = this.obstacleSystem.getActiveObstacles().some(
          (o) => o.jumpable && Math.abs(o.distance - pDist) < 4.5
        );
        if (nearby) this.airborneOverObstacle = true;
      }
    }
  }

  private applyEquippedCosmetics(): void {
    const data = this.saveSystem.getData();
    this.playerBall.setSkin(data.equippedBall);
    this.pencil.setSkin(data.equippedPencil);
    this.effects.setTrailSkin(data.equippedTrail);
    this.applyWorldTheme(data.equippedWorld);
  }

  public applyWorldTheme(worldId: string): void {
    this.drawingSystem.setWorldTheme(worldId);
    this.citySystem.setWorldTheme(worldId);

    let clearColor = CONFIG.visual.paperColor;
    let fogNear = 70;
    let fogFar = 320;

    switch (worldId) {
      case 'sketch_city':
        clearColor = 0xe9ecef;
        break;
      case 'mountain_sketch':
        clearColor = 0xd8dee9;
        break;
      case 'blueprint_grid':
        clearColor = 0x082f49;
        fogNear = 60;
        fogFar = 280;
        break;
      case 'notebook_lined':
        clearColor = 0xf8fafc;
        break;
      case 'the_void':
        clearColor = 0x09090b;
        fogNear = 45;
        fogFar = 220;
        break;
      case 'paper':
      default:
        clearColor = 0xf4efe6;
        break;
    }

    this.renderer.setClearColor(clearColor, 1);
    this.scene.fog = new THREE.Fog(clearColor, fogNear, fogFar);
  }

  private applySettings(): void {
    const s = this.saveSystem.getData().settings;
    this.inputController.sensitivityMultiplier = s.sensitivity;
    this.audioManager.setEnabled(s.soundEnabled);

    // Visual quality
    if (s.graphicsQuality === 'LOW') {
      this.renderer.shadowMap.enabled = false;
      this.renderer.setPixelRatio(1);
    } else {
      this.renderer.shadowMap.enabled = true;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
  }

  private resetWorld(): void {
    this.flowPath.clear();
    this.pathGenerator.reset();
    this.playerBall.reset();
    this.obstacleSystem.reset();
    this.collectibleSystem.reset();
    this.citySystem.reset();
    this.powerUpSystem.reset();
    this.effects.reset();
    this.worldEvolutionSystem.reset();
    this.fallTimer = 0;
    this.airborneOverObstacle = false;

    // Reset in-run counters
    this.runGraphite = 0;
    this.runLeads = 0;
    this.runDodges = 0;
    this.runJumps = 0;
    this.runCloseCalls = 0;
    this.runPerfectLandings = 0;
    this.comboMultiplier = 1;
    this.comboTimer = 0;
    this.maxRunCombo = 1;

    // Pre-draw starting path runway for pencil
    this.pencilDrawDistance = CONFIG.pencil.leadDistance;
    this.drawingSystem.update(this.pencilDrawDistance, 0);

    const initialSample = this.flowPath.getSampleAtDistance(0);
    this.cameraController.reset(initialSample);

    if (initialSample) {
      this.pencil.update(initialSample, 0.016);
      this.playerBall.update(0.016, 0, initialSample);
    }
  }

  public startNewRun(isDaily = false): void {
    this.isDailyChallenge = isDaily;
    this.resetWorld();
    this.applyEquippedCosmetics();

    const startSpeed = isDaily
      ? CONFIG.player.startSpeed * this.saveSystem.getDailyChallengeModifier().speedMult
      : CONFIG.player.startSpeed;

    this.gameState.resetRun(startSpeed);
    this.gameState.setMode('PLAYING');

    this.ui.updateRunGraphite(0);
    this.ui.updateCombo(1);

    const steerHint = document.getElementById('steer-hint');
    if (steerHint) {
      steerHint.style.opacity = '1';
      steerHint.style.transition = 'opacity 0.6s ease';
    }

    this.audioManager.playClick();
    this.audioManager.startRollingSound();
    this.audioManager.startDrawingSound();
  }

  public pause(): void {
    if (this.gameState.getMode() !== 'PLAYING') return;
    this.gameState.setMode('PAUSED');
    this.audioManager.stopContinuousSounds();
  }

  public resume(): void {
    if (this.gameState.getMode() === 'PAUSED') {
      this.gameState.setMode('PLAYING');
      this.audioManager.startRollingSound();
      this.audioManager.startDrawingSound();
    } else if (this.gameState.getMode() === 'PLAYING') {
      this.pause();
    }
  }

  public goToMenu(): void {
    this.gameState.setMode('MENU');
    this.audioManager.stopContinuousSounds();
    this.resetWorld();
    this.ui.updateProfileDisplay();
  }

  private animate(time: number): void {
    if (!this.isRunning) return;
    requestAnimationFrame(this.animate.bind(this));

    const dt = Math.min((time - this.lastTime) * 0.001, 0.05);
    this.lastTime = time;

    const mode = this.gameState.getMode();

    if (mode === 'PLAYING') {
      this.updatePlaying(dt);
    } else if (mode === 'MENU') {
      this.updateMenuPreview(dt);
    } else if (mode === 'GAME_OVER') {
      this.updateGameOver(dt);
    }

    // Render Scene
    this.renderer.render(this.scene, this.cameraController.camera);
  }

  private updatePlaying(dt: number): void {
    // 1. Process continuous keyboard controls
    this.inputController.update(dt);

    // 2. Combo decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboMultiplier = 1;
        this.ui.updateCombo(1);
      }
    }

    // 3. Dynamic speed based on distance and boost status
    const playerDist = this.playerBall.state.distance;
    const speedMult = this.isDailyChallenge ? this.saveSystem.getDailyChallengeModifier().speedMult : 1.0;
    let targetSpeed = Math.min(
      CONFIG.player.maxSpeed * speedMult,
      (CONFIG.player.startSpeed + (playerDist / 100) * CONFIG.player.accelerationRate) * speedMult
    );
    if (this.playerBall.state.isBoosted) {
      targetSpeed *= CONFIG.powerUp.boostSpeedMultiplier;
    }

    // Auto-fade steer hint once player starts rolling cleanly
    if (playerDist > 25) {
      const steerHint = document.getElementById('steer-hint');
      if (steerHint && steerHint.style.opacity !== '0') {
        steerHint.style.opacity = '0';
      }
    }

    // 4. Update procedural path generation ahead
    this.pathGenerator.update(playerDist);

    // 5. Update pencil progressive drawing: leads comfortably ahead so all hazards are visible
    const targetDrawDist = playerDist + CONFIG.pencil.leadDistance;
    this.pencilDrawDistance += Math.max(targetSpeed * 1.1, (targetDrawDist - this.pencilDrawDistance) * 8.0) * dt;
    this.pencilDrawDistance = Math.max(
      playerDist + 45.0,
      Math.min(playerDist + CONFIG.pencil.leadDistance + 12.0, this.pencilDrawDistance)
    );

    const pencilSample = this.flowPath.getSampleAtDistance(this.pencilDrawDistance);
    if (pencilSample) {
      this.pencil.update(pencilSample, dt, targetSpeed, this.playerBall.state.isBoosted);
      this.effects.emitPencilGraphite(pencilSample.position, pencilSample.tangent);
    }

    // 6. Update visual track mesh up to pencil
    this.drawingSystem.update(this.pencilDrawDistance, playerDist);

    // 7. Update World Evolution, blended atmospheric visuals & set-piece events
    this.worldEvolutionSystem.update(playerDist, dt);
    const visuals = this.worldEvolutionSystem.getBlendedVisuals();
    this.renderer.setClearColor(visuals.paperColor, 1);
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(visuals.fogColor);
      this.scene.fog.near = visuals.fogNear;
      this.scene.fog.far = visuals.fogFar;
    }
    this.drawingSystem.applyDynamicStageVisuals(visuals);
    this.citySystem.applyDynamicStageVisuals(visuals);

    // 8. Update stage-aware environment scenery around the track
    this.citySystem.update(playerDist, this.pencilDrawDistance);

    // 9. Update in-run collectible graphite shards
    this.collectibleSystem.update(playerDist, this.pencilDrawDistance, dt);

    // 10. Update collectible pencil lead power-ups
    this.powerUpSystem.update(playerDist, this.pencilDrawDistance, dt);

    // 11. Environmental Crosswinds pushing the ball
    const windForce = this.worldEvolutionSystem.getActiveWindForce();
    if (Math.abs(windForce) > 0.05 && !this.playerBall.state.isFalling) {
      this.playerBall.shiftTargetLateral(windForce * dt * 0.7);
    }

    // 12. Update player ball
    const ballSample = this.flowPath.getSampleAtDistance(playerDist);

    this.playerBall.update(
      dt,
      targetSpeed,
      ballSample,
      () => {
        // Landed callback
        this.audioManager.playLand();
        this.effects.emitLandingPuff(this.playerBall.getPosition());

        // Perfect landing check!
        if (this.airborneOverObstacle) {
          this.airborneOverObstacle = false;
          this.runPerfectLandings++;
          this.comboTimer = 4.0;
          this.comboMultiplier = Math.min(10, this.comboMultiplier + 1);
          if (this.comboMultiplier > this.maxRunCombo) this.maxRunCombo = this.comboMultiplier;
          this.ui.updateCombo(this.comboMultiplier);
          this.audioManager.playPerfectLanding();
          this.ui.showToast('PERFECT LANDING! +100 XP');
          this.saveSystem.addXP(100);
          this.gameState.score += 100 * this.comboMultiplier;
        }
      },
      () => {
        // Started falling off path
        this.audioManager.playFall();
      }
    );

    // Check Graphite shard collection
    if (!this.playerBall.state.isFalling) {
      const collectedGraphite = this.collectibleSystem.checkCollection(
        playerDist,
        this.playerBall.state.lateralOffset,
        this.playerBall.state.jumpHeight
      );
      if (collectedGraphite) {
        this.runGraphite++;
        this.comboTimer = 3.8;
        this.comboMultiplier = Math.min(10, this.comboMultiplier + 1);
        if (this.comboMultiplier > this.maxRunCombo) this.maxRunCombo = this.comboMultiplier;
        this.ui.updateCombo(this.comboMultiplier);
        this.audioManager.playGraphitePickup();
        this.effects.emitGraphiteCollect(collectedGraphite.mesh.position);
        this.ui.updateRunGraphite(this.runGraphite);
        this.gameState.score += 25 * this.comboMultiplier;
        this.saveSystem.addXP(15 * this.comboMultiplier);
      }
    }

    // Check Power-up Lead Boost collection
    if (!this.playerBall.state.isFalling) {
      const collected = this.powerUpSystem.checkCollection(
        playerDist,
        this.playerBall.state.lateralOffset,
        this.playerBall.state.jumpHeight
      );
      if (collected) {
        this.runLeads++;
        this.playerBall.activateBoost(CONFIG.powerUp.boostDuration);
        this.pencil.celebratePickup();
        this.audioManager.playPowerUp();
        this.effects.emitPowerUpCollect(collected.meshGroup.position);
        this.gameState.score += 150 * this.comboMultiplier;
        this.comboTimer = 5.0;
        this.comboMultiplier = Math.min(10, this.comboMultiplier + 1);
        if (this.comboMultiplier > this.maxRunCombo) this.maxRunCombo = this.comboMultiplier;
        this.ui.updateCombo(this.comboMultiplier);
        this.ui.showToast('2B LEAD BOOST! +150');
      }
    }

    // Emit ball trail
    if (ballSample && !this.playerBall.state.isFalling) {
      const contactPos = ballSample.position
        .clone()
        .add(ballSample.right.clone().multiplyScalar(this.playerBall.state.lateralOffset));
      this.effects.emitBallTrail(
        contactPos,
        ballSample.tangent,
        ballSample.right,
        targetSpeed,
        this.playerBall.state.isAirborne,
        this.playerBall.state.isBoosted
      );
    }

    // Audio modulation
    this.audioManager.updateRollingPitch(targetSpeed, this.playerBall.state.isAirborne);

    // 13. Update active obstacles with current stage awareness
    const currentStage = this.worldEvolutionSystem.getCurrentStage();
    this.ui.updateStage(currentStage.chapter, currentStage.name);
    this.obstacleSystem.update(playerDist, this.pencilDrawDistance, dt, currentStage.id);

    // 14. Collision detection
    const colResult = this.collisionSystem.checkCollisions(this.playerBall, this.obstacleSystem);

    if (colResult.rampLaunch && !this.playerBall.state.isAirborne) {
      this.triggerJump();
      this.playerBall.state.jumpVelocity = CONFIG.player.jumpForce * 1.35;
      this.ui.showToast('RAMP LAUNCH! +100');
      this.gameState.score += 100 * this.comboMultiplier;
    }

    if (colResult.closeCall) {
      this.runCloseCalls++;
      this.comboTimer = 3.8;
      this.comboMultiplier = Math.min(10, this.comboMultiplier + 1);
      if (this.comboMultiplier > this.maxRunCombo) this.maxRunCombo = this.comboMultiplier;
      this.ui.updateCombo(this.comboMultiplier);
      this.audioManager.playCloseCall();
      this.ui.showToast('CLOSE CALL! +50 XP');
      this.saveSystem.addXP(50);
      this.gameState.score += 50 * this.comboMultiplier;
    }

    if (colResult.hit) {
      if (this.saveSystem.getData().settings.cameraShake) {
        this.cameraController.addTrauma(1.0);
      }
      this.audioManager.playCrash();
      this.effects.emitCollisionShatter(this.playerBall.getPosition());
      this.handleGameOver(colResult.reason || 'Crashed into stationery hazard');
      return;
    }

    // Check falling
    if (this.playerBall.state.isFalling) {
      this.fallTimer += dt;
      if (this.playerBall.state.isDead || this.fallTimer > 0.85) {
        if (this.saveSystem.getData().settings.cameraShake) {
          this.cameraController.addTrauma(0.75);
        }
        this.effects.emitCollisionShatter(this.playerBall.getPosition());
        this.handleGameOver('Fell off the road margins');
        return;
      }
    }

    // 13. Update Camera
    this.cameraController.update(this.playerBall, ballSample, dt, this.flowPath);

    // 14. Directional Light
    const ballPos = this.playerBall.getPosition();
    this.dirLight.position.set(ballPos.x + 25, ballPos.y + 45, ballPos.z + 30);
    this.dirLight.target.position.copy(ballPos);
    this.dirLight.target.updateMatrixWorld();

    // 15. Particle Effects & Stage Atmosphere Hazards
    this.effects.update(dt, ballPos);
    this.effects.emitEnvironmentalHazards(ballPos, currentStage.id, windForce, dt);

    // 16. Game State & HUD
    this.gameState.updateProgress(targetSpeed * dt, targetSpeed);

    // 17. Boost HUD display
    this.ui.updateBoost(
      this.playerBall.state.isBoosted,
      this.playerBall.state.boostTimer,
      CONFIG.powerUp.boostDuration
    );
  }

  private handleGameOver(reason: string): void {
    this.gameState.triggerGameOver(reason);
    this.audioManager.stopContinuousSounds();

    // Rewards calculation
    const earnedGraphite = this.runGraphite;
    const earnedLeads = this.runLeads;
    const earnedXP = Math.floor(this.gameState.distance * 1.5) + this.runCloseCalls * 50 + this.runPerfectLandings * 100;

    this.saveSystem.addCurrency(earnedGraphite, earnedLeads);
    this.saveSystem.addXP(earnedXP);

    const recordResult = this.saveSystem.recordRun(
      this.gameState.distance,
      this.gameState.score,
      this.gameState.speed,
      earnedGraphite,
      earnedLeads,
      this.runDodges,
      this.runJumps,
      this.runCloseCalls,
      this.runPerfectLandings,
      this.maxRunCombo
    );

    // Daily streak check
    if (this.isDailyChallenge) {
      const today = new Date().toISOString().split('T')[0];
      const data = this.saveSystem.getData();
      if (data.lastDailyDate !== today) {
        data.dailyStreak += 1;
        data.lastDailyDate = today;
      }
      if (this.gameState.distance > data.dailyHighScore) {
        data.dailyHighScore = this.gameState.distance;
      }
      this.saveSystem.save();
    }

    this.ui.showGameOver(
      this.gameState.score,
      this.gameState.distance,
      this.saveSystem.getData().stats.bestDistance,
      recordResult.isNewBestDist,
      reason,
      earnedGraphite,
      earnedLeads,
      earnedXP
    );
  }

  private updateMenuPreview(dt: number): void {
    const t = performance.now() * 0.0006;
    const initialSample = this.flowPath.getSampleAtDistance(0);
    if (initialSample) {
      this.cameraController.camera.position.set(
        Math.sin(t) * 2.5,
        5.2 + Math.cos(t * 0.8) * 0.4,
        8.0 + Math.sin(t * 0.5) * 1.0
      );
      this.cameraController.camera.lookAt(0, 1.2, -14);
    }
  }

  private updateGameOver(dt: number): void {
    if (!this.playerBall.state.isDead) {
      this.playerBall.update(dt, 0, null);
    }
    this.cameraController.update(this.playerBall, null, dt);
    this.effects.update(dt, this.playerBall.getPosition());
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.cameraController.onResize(w, h);
  }
}

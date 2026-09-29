import { PlayerBall } from './PlayerBall';
import { ObstacleSystem, ObstacleInstance } from './ObstacleSystem';

export interface CollisionResult {
  hit: boolean;
  obstacle?: ObstacleInstance;
  reason?: string;
  closeCall?: boolean;
}

export class CollisionSystem {
  constructor() {}

  public checkCollisions(playerBall: PlayerBall, obstacleSystem: ObstacleSystem): CollisionResult {
    const ballState = playerBall.state;

    if (ballState.isFalling || ballState.isDead) {
      return { hit: false };
    }

    const ballRadius = playerBall.getRadius();
    const ballDist = ballState.distance;
    const ballOffset = ballState.lateralOffset;
    const ballJump = ballState.jumpHeight;

    const obstacles = obstacleSystem.getActiveObstacles();
    let detectedCloseCall = false;

    for (const obs of obstacles) {
      if (!obs.active || !obs.drawn) continue;

      const longitudinalDist = Math.abs(ballDist - obs.distance);
      const hitDepth = obs.depth * 0.5 + ballRadius * 0.75;

      // Longitudinal reach
      if (longitudinalDist > hitDepth) continue;

      // 0. CHASM GAPS & FISSURES (Must jump or steer around!)
      if (obs.type === 'PAPER_CHASM_GAP') {
        // Spans entire ribbon width — jumping clears the chasm!
        if (ballJump < 0.25) {
          return {
            hit: true,
            obstacle: obs,
            reason: 'Plunged into an open paper tear chasm',
            closeCall: false,
          };
        }
        // Jumped cleanly across the chasm!
        continue;
      }

      if (obs.type === 'CRACKED_FISSURE') {
        // Localized paper tear in a lane:
        // 1. Can safely steer around it if in another lane!
        const lateralDist = Math.abs(ballOffset - obs.currentLateralOffset);
        const hitWidth = obs.width * 0.5 + ballRadius * 0.65;

        // Razor close call dodge
        if (!obs.closeCallChecked && lateralDist > hitWidth && lateralDist <= hitWidth + 0.85) {
          obs.closeCallChecked = true;
          detectedCloseCall = true;
        }

        if (lateralDist <= hitWidth) {
          // Inside fissure lane — player can vault over with a jump!
          if (ballJump < 0.22) {
            return {
              hit: true,
              obstacle: obs,
              reason: 'Caught in a cracked paper fissure',
              closeCall: false,
            };
          }
        }
        // Steered around or jumped cleanly!
        continue;
      }

      // 1. OVERHEAD OBSTACLE CATEGORY
      if (obs.category === 'OVERHEAD') {
        const lateralDist = Math.abs(ballOffset - obs.currentLateralOffset);
        const hitWidth = obs.width * 0.5 + ballRadius * 0.7;

        if (lateralDist <= hitWidth) {
          if (obs.type === 'FALLING_PLUMB_BOB') {
            // If weight dropped down onto the ball
            if ((obs.fallProgress || 0) > 0.55 && ballJump < 2.0) {
              return {
                hit: true,
                obstacle: obs,
                reason: 'Crushed by falling brass plumb bob',
                closeCall: false,
              };
            }
          }

          const clearance = obs.overheadClearanceBottom || 1.8;
          // Safe to roll underneath! Danger if player jumped high into the beam!
          if (ballJump >= clearance) {
            return {
              hit: true,
              obstacle: obs,
              reason: this.getCrashReason(obs),
              closeCall: false,
            };
          }
        }
        continue;
      }

      // 2. SIDE CLOSING / VICE CATEGORY
      if (obs.category === 'SIDE_CLOSING') {
        // Safe channel is between [-obs.motionAmplitude, obs.motionAmplitude]
        const safeHalfWidth = obs.motionAmplitude || 1.8;
        if (Math.abs(ballOffset) > safeHalfWidth - ballRadius * 0.6) {
          if (ballJump < obs.height * 0.85) {
            return {
              hit: true,
              obstacle: obs,
              reason: 'Crushed by closing drafting vice walls',
              closeCall: false,
            };
          }
        } else if (!obs.closeCallChecked && Math.abs(ballOffset) > safeHalfWidth - ballRadius * 1.4) {
          obs.closeCallChecked = true;
          detectedCloseCall = true;
        }
        continue;
      }

      // 3. VERTICAL CATEGORY (Rising Pillars / Descending Stamps)
      if (obs.category === 'VERTICAL') {
        // If pillar has risen above ground level
        if (obs.currentHeightOffset > 0.4) {
          const lateralDist = Math.abs(ballOffset - obs.currentLateralOffset);
          const hitWidth = obs.width * 0.5 + ballRadius * 0.75;

          if (lateralDist <= hitWidth && ballJump < obs.currentHeightOffset + 0.3) {
            return {
              hit: true,
              obstacle: obs,
              reason: this.getCrashReason(obs),
              closeCall: false,
            };
          }
        }
        continue;
      }

      // 4. MOVING & FLOOR CATEGORIES
      const lateralDist = Math.abs(ballOffset - obs.currentLateralOffset);
      const hitWidth = obs.width * 0.5 + ballRadius * 0.75;

      // Close call detection (razor margin dodge)
      if (
        !obs.closeCallChecked &&
        lateralDist > hitWidth &&
        lateralDist <= hitWidth + 0.95 &&
        longitudinalDist < hitDepth * 0.65
      ) {
        obs.closeCallChecked = true;
        detectedCloseCall = true;
      }

      if (lateralDist > hitWidth) continue;

      // Jump vaulting check
      if (obs.jumpable) {
        if (ballJump >= obs.height * 0.78) {
          // Vaulted cleanly over!
          continue;
        }
      } else {
        // Non-jumpable
        if (ballJump >= obs.height * 1.1) {
          continue;
        }
      }

      // Collision confirmed
      return {
        hit: true,
        obstacle: obs,
        reason: this.getCrashReason(obs),
        closeCall: false,
      };
    }

    return { hit: false, closeCall: detectedCloseCall };
  }

  private getCrashReason(obs: ObstacleInstance): string {
    switch (obs.type) {
      // Overhead
      case 'OVERHEAD_CRANE_BEAM': return 'Jumped into overhead construction crane arm';
      case 'SUSPENDED_STEEL_BEAM': return 'Jumped into suspended steel girder';
      case 'HANGING_DRAFTING_SIGN': return 'Struck swinging overhead drafting sign';
      case 'GIANT_PENCIL_SUSPENSION': return 'Clipped suspended giant pencil bridge';
      case 'LOW_CEILING_ARCH': return 'Collided with low drafting ceiling arch';
      case 'FALLING_PLUMB_BOB': return 'Crushed by falling brass plumb bob';
      case 'HANGING_ERASER': return 'Struck suspended heavy eraser block';

      // Side closing
      case 'SLIDING_ERASER_VICE': return 'Crushed by sliding eraser vice jaws';
      case 'ROAD_NARROWING_BRACKET': return 'Smashed into road-constricting steel bracket';
      case 'EXPANDING_INK_SPLAT': return 'Swallowed by expanding ink blob';
      case 'SIDE_ERASER_SWEEP': return 'Swept off the road by giant eraser barrier';

      // Moving
      case 'PENDULUM_RULER': return 'Struck by swinging pendulum wooden ruler';
      case 'SLIDING_SHARPENER': return 'Hit by sliding pencil sharpener barrier';
      case 'ROTATING_COMPASS_ARM': return 'Clipped by rotating drafting compass needle';
      case 'BOUNCING_PAPER_BOULDER': return 'Crushed by bouncing paper boulder';

      // Vertical
      case 'RISING_GRAPHITE_PILLARS': return 'Impaled on rising graphite monolith';
      case 'DESCENDING_STAMP_BLOCK': return 'Crushed under descending wooden stamp block';
      case 'RISING_PAPER_FOLD': return 'Collided with rising folded origami spire';

      // Floor
      case 'PAPER_CHASM_GAP': return 'Plunged into an open paper chasm';
      case 'CRACKED_FISSURE': return 'Caught in a cracked paper fissure';
      case 'ROLLING_PENCIL_SHAVING': return 'Struck by rolling giant pencil shaving';
      case 'GRAPHITE_BOULDER': return 'Smashed into solid graphite boulder';
      case 'PENCIL_SHARPENER': return 'Crashed into metal pencil sharpener';
      case 'ERASER_BLOCK': return 'Smashed into heavy rubber eraser';
      case 'KNEADED_PUTTY': return 'Stuck in kneaded drafting putty';
      case 'SET_SQUARE_45': return 'Smashed into 45° drafting triangle';
      case 'GRAPHITE_SPIKES': return 'Impaled on sharpened graphite lead spikes';
      case 'THUMBTACK_PIN': return 'Punctured by sharp brass pushpin';
      case 'CRUMPLED_PAPER': return 'Crashed into crumpled paper boulder';
      case 'STAPLE_STRIP': return 'Tripped over sharp metal staple strip';
      case 'WOODEN_RULER': return 'Tripped over wooden drafting ruler';
      case 'XACTO_KNIFE': return 'Sliced by angled craft utility blade';
      case 'CORRECTION_TAPE': return 'Collided with whiteout tape dispenser';
      case 'PAPERCLIP_BARRIER': return 'Snagged on steel paperclip fence';
      case 'BINDER_CLIP': return 'Smashed into heavy spring binder clip';
      case 'RISK_REWARD_DIVIDE': return 'Collided with lane divider hurdle';
      case 'ELEVATED_RAMP_JUMP': return 'Clipped the edge of an elevated launch ramp';

      default: return 'Crashed into stationery hazard';
    }
  }
}

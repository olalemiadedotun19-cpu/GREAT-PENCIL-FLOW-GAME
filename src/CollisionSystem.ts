import { PlayerBall } from './PlayerBall';
import { ObstacleSystem, ObstacleInstance } from './ObstacleSystem';

export interface CollisionResult {
  hit: boolean;
  obstacle?: ObstacleInstance;
  reason?: string;
  closeCall?: boolean;
  rampLaunch?: boolean;
}

export class CollisionSystem {
  constructor() {}

  public checkCollisions(playerBall: PlayerBall, obstacleSystem: ObstacleSystem): CollisionResult {
    const ballState = playerBall.state;

    if (ballState.isFalling || ballState.isDead) {
      return { hit: false };
    }

    const ballRadius = playerBall.getRadius(); // 0.6
    const ballDist = ballState.distance;
    const ballOffset = ballState.lateralOffset;
    const ballJump = ballState.jumpHeight;

    // Contact padding: in high-speed runner games, the physical core is 70-80% of visual mesh.
    // Glancing grazing near-misses must NOT trigger fatal collisions.
    const contactRadius = ballRadius * 0.45; // ~0.27m

    const obstacles = obstacleSystem.getActiveObstacles();
    let detectedCloseCall = false;

    for (const obs of obstacles) {
      if (!obs.active || !obs.drawn) continue;

      const longitudinalDist = Math.abs(ballDist - obs.distance);
      
      // Tight, physically accurate longitudinal reach (no invisible wall ahead/behind)
      const hitDepth = (obs.depth * 0.38) + contactRadius;

      if (longitudinalDist > hitDepth) continue;

      // 0. ELEVATED RAMP JUMP (Launches ball into a high jump instead of crashing!)
      if (obs.type === 'ELEVATED_RAMP_JUMP') {
        const lateralDist = Math.abs(ballOffset - obs.currentLateralOffset);
        if (lateralDist <= (obs.width * 0.45) + contactRadius) {
          return { hit: false, rampLaunch: true };
        }
        continue;
      }

      // 1. CHASM GAPS & FISSURES (Jumping clears!)
      if (obs.type === 'PAPER_CHASM_GAP') {
        // Physical void gap extent
        const gapHalfReach = (obs.depth * 0.32) + contactRadius;
        if (longitudinalDist <= gapHalfReach) {
          // If airborne with even modest jump height, player cleanly clears the gap!
          if (ballJump < 0.15) {
            return {
              hit: true,
              obstacle: obs,
              reason: 'Plunged into an open paper tear chasm',
              closeCall: false,
            };
          }
        }
        continue;
      }

      if (obs.type === 'CRACKED_FISSURE') {
        const lateralDist = Math.abs(ballOffset - obs.currentLateralOffset);
        const fissureHitWidth = (obs.width * 0.38) + contactRadius;

        // Close call bonus if weaving right past the edge
        if (!obs.closeCallChecked && lateralDist > fissureHitWidth && lateralDist <= fissureHitWidth + 0.65) {
          obs.closeCallChecked = true;
          detectedCloseCall = true;
        }

        if (lateralDist <= fissureHitWidth) {
          // Inside fissure lane — jumping vaults right over it!
          if (ballJump < 0.15) {
            return {
              hit: true,
              obstacle: obs,
              reason: 'Caught in a cracked paper fissure',
              closeCall: false,
            };
          }
        }
        continue;
      }

      // 2. OVERHEAD OBSTACLE CATEGORY (Low Ceiling Arch, Cranes, Girders)
      if (obs.category === 'OVERHEAD') {
        const lateralDist = Math.abs(ballOffset - obs.currentLateralOffset);
        const hitWidth = (obs.width * 0.42) + contactRadius;

        if (lateralDist <= hitWidth) {
          if (obs.type === 'FALLING_PLUMB_BOB') {
            // Only fatal if plumb bob weight has actually dropped onto the road
            if ((obs.fallProgress || 0) > 0.82 && ballJump < 1.4) {
              return {
                hit: true,
                obstacle: obs,
                reason: 'Crushed by falling brass plumb bob',
                closeCall: false,
              };
            }
          }

          // Overhead clearance: the bottom of the beam
          const clearance = obs.overheadClearanceBottom || 2.0;
          const ballTop = ballJump + ballRadius * 2; // Total elevation of top of ball

          // Rolling under is 100% safe! Only fatal if player jumped UP into the beam!
          if (ballTop >= clearance + 0.1) {
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

      // 3. SIDE CLOSING / VICE CATEGORY (Eraser vice jaws)
      if (obs.category === 'SIDE_CLOSING') {
        if (obs.type === 'SIDE_ERASER_SWEEP') {
          const sweepHitWidth = (obs.width * 0.40) + contactRadius;
          const lateralDist = Math.abs(ballOffset - obs.currentLateralOffset);
          if (lateralDist <= sweepHitWidth) {
            if (ballJump < obs.height * 0.65) {
              return {
                hit: true,
                obstacle: obs,
                reason: 'Swept off the road by giant eraser barrier',
                closeCall: false,
              };
            }
          } else if (!obs.closeCallChecked && lateralDist <= sweepHitWidth + 0.6) {
            obs.closeCallChecked = true;
            detectedCloseCall = true;
          }
        } else {
          // Sliding vice jaws with moving parts
          // Calculate physical inner boundaries based on animated positions
          const leftInnerEdge = obs.viceLeftPart ? obs.viceLeftPart.position.x + 1.7 : -1.8;
          const rightInnerEdge = obs.viceRightPart ? obs.viceRightPart.position.x - 1.7 : 1.8;

          const ballLeft = ballOffset - contactRadius;
          const ballRight = ballOffset + contactRadius;

          // Vaulting over vice blocks
          if (ballJump >= obs.height * 0.70) {
            continue;
          }

          // Check if ball struck either moving wall
          if (ballLeft < leftInnerEdge || ballRight > rightInnerEdge) {
            return {
              hit: true,
              obstacle: obs,
              reason: 'Crushed by closing drafting vice walls',
              closeCall: false,
            };
          } else if (!obs.closeCallChecked && (ballLeft < leftInnerEdge + 0.35 || ballRight > rightInnerEdge - 0.35)) {
            obs.closeCallChecked = true;
            detectedCloseCall = true;
          }
        }
        continue;
      }

      // 4. VERTICAL CATEGORY (Rising Graphite Pillars / Folded Paper)
      if (obs.category === 'VERTICAL') {
        // If pillar is recessed below the floor surface, completely safe
        if (obs.currentHeightOffset > 0.3) {
          const lateralDist = Math.abs(ballOffset - obs.currentLateralOffset);
          const hitWidth = (obs.width * 0.40) + contactRadius;

          if (lateralDist <= hitWidth) {
            // If ball jumped higher than the rising pillar top, sails right over
            if (ballJump < obs.currentHeightOffset * 0.75) {
              return {
                hit: true,
                obstacle: obs,
                reason: this.getCrashReason(obs),
                closeCall: false,
              };
            }
          } else if (!obs.closeCallChecked && lateralDist <= hitWidth + 0.65) {
            obs.closeCallChecked = true;
            detectedCloseCall = true;
          }
        }
        continue;
      }

      // 5. BOUNCING HAZARDS (Bouncing Paper Boulder)
      if (obs.motionType === 'BOUNCE_Y' || obs.type === 'BOUNCING_PAPER_BOULDER') {
        const lateralDist = Math.abs(ballOffset - obs.currentLateralOffset);
        const hitWidth = (obs.width * 0.38) + contactRadius;

        if (lateralDist <= hitWidth) {
          const boulderCenterY = obs.currentHeightOffset;
          const boulderBottom = boulderCenterY - (obs.height * 0.38);
          const boulderTop = boulderCenterY + (obs.height * 0.38);
          const ballTop = ballJump + ballRadius * 2;
          const ballBottom = ballJump;

          // Check vertical separation:
          // 1. Can roll SAFELY UNDER the boulder when it bounces high!
          // 2. Can jump SAFELY OVER the boulder!
          const rollsUnder = ballTop < boulderBottom - 0.1;
          const jumpsOver = ballBottom > boulderTop + 0.1;

          if (!rollsUnder && !jumpsOver) {
            return {
              hit: true,
              obstacle: obs,
              reason: 'Crushed by bouncing paper boulder',
              closeCall: false,
            };
          }
        } else if (!obs.closeCallChecked && lateralDist <= hitWidth + 0.65) {
          obs.closeCallChecked = true;
          detectedCloseCall = true;
        }
        continue;
      }

      // 6. STANDARD FLOOR & MOVING OBSTACLES (Sharpener, Eraser, Putty, Rulers, Spikes, etc.)
      const lateralDist = Math.abs(ballOffset - obs.currentLateralOffset);
      const hitWidth = (obs.width * 0.38) + contactRadius;

      // Close call detection (razor margin dodge rewarded with combo points)
      if (
        !obs.closeCallChecked &&
        lateralDist > hitWidth &&
        lateralDist <= hitWidth + 0.65 &&
        longitudinalDist < hitDepth * 0.7
      ) {
        obs.closeCallChecked = true;
        detectedCloseCall = true;
      }

      // Ball is outside lateral bounds — cleanly avoided!
      if (lateralDist > hitWidth) continue;

      // Jump vaulting:
      // Jumpable obstacles can be vaulted if ball elevation clears ~65% of obstacle height
      if (obs.jumpable) {
        if (ballJump >= obs.height * 0.65) {
          continue; // Vaulted cleanly over!
        }
      } else {
        if (ballJump >= obs.height * 0.95) {
          continue;
        }
      }

      // Direct physical collision confirmed
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

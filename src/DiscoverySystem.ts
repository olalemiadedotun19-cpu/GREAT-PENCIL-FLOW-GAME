/**
 * Discovery & Field Journal System for Pencil Flow
 * Tracks player encounters: Stages, Obstacle Families, Environmental Hazards, and Giant Set-Pieces.
 */

export interface DiscoveryItem {
  id: string;
  category: 'STAGE' | 'OBSTACLE' | 'HAZARD' | 'EVENT';
  name: string;
  desc: string;
  xpReward: number;
  leadsReward: number;
  iconSvg?: string;
}

export const DISCOVERY_REGISTRY: Record<string, DiscoveryItem> = {
  // STAGES
  world_sketchbook: {
    id: 'world_sketchbook',
    category: 'STAGE',
    name: 'Stage 1: The Sketchbook',
    desc: 'The pure, warm parchment where every drawing begins.',
    xpReward: 50,
    leadsReward: 1,
  },
  world_city: {
    id: 'world_city',
    category: 'STAGE',
    name: 'Stage 2: The Hand-Drawn City',
    desc: 'A dense urban maze of sketched rowhouses, apartments, and streetlights.',
    xpReward: 150,
    leadsReward: 3,
  },
  world_rooftops: {
    id: 'world_rooftops',
    category: 'STAGE',
    name: 'Stage 3: The Rooftops & Bridges',
    desc: 'High-altitude skybridges, crane arms, and dizzying drops across the skyline.',
    xpReward: 300,
    leadsReward: 5,
  },
  world_mountains: {
    id: 'world_mountains',
    category: 'STAGE',
    name: 'Stage 4: Alpine Peaks & Canyons',
    desc: 'Deep geological paper fissures, hatched rock faces, and soaring roller-coaster drops.',
    xpReward: 600,
    leadsReward: 10,
  },
  world_ink: {
    id: 'world_ink',
    category: 'STAGE',
    name: 'Stage 5: The Surreal Ink World',
    desc: 'Floating paper planes, impossible geometry, and abyssal rivers of dark Indian ink.',
    xpReward: 1200,
    leadsReward: 20,
  },
  world_blueprint: {
    id: 'world_blueprint',
    category: 'STAGE',
    name: 'Stage 6: The Blueprint Matrix',
    desc: 'Infinite cyan drafting matrix with glowing technical dimension guides.',
    xpReward: 2000,
    leadsReward: 30,
  },

  // OBSTACLE FAMILIES
  obs_overhead: {
    id: 'obs_overhead',
    category: 'OBSTACLE',
    name: 'Overhead Hazards',
    desc: 'Suspended construction beams, hanging signs, and crane jibs. Roll low or choose a side!',
    xpReward: 100,
    leadsReward: 2,
  },
  obs_side_moving: {
    id: 'obs_side_moving',
    category: 'OBSTACLE',
    name: 'Side Vice Barriers',
    desc: 'Heavy sliding eraser blocks that constrict the road, leaving a timed opening.',
    xpReward: 120,
    leadsReward: 2,
  },
  obs_pendulum: {
    id: 'obs_pendulum',
    category: 'OBSTACLE',
    name: 'Pendulum & Rotating Hazards',
    desc: 'Swinging wooden rulers and rotating compass needles slicing across the lanes.',
    xpReward: 150,
    leadsReward: 3,
  },
  obs_vertical: {
    id: 'obs_vertical',
    category: 'OBSTACLE',
    name: 'Vertical Rising Formations',
    desc: 'Graphite pillars and hydraulic drafting stamps that emerge directly from the road.',
    xpReward: 150,
    leadsReward: 3,
  },
  obs_chasm_gap: {
    id: 'obs_chasm_gap',
    category: 'OBSTACLE',
    name: 'Paper Chasms & Collapsed Gaps',
    desc: 'Broken road gaps requiring precision jumps to bridge the divide.',
    xpReward: 180,
    leadsReward: 4,
  },
  obs_risk_route: {
    id: 'obs_risk_route',
    category: 'OBSTACLE',
    name: 'Risk / Reward Lane Split',
    desc: 'A narrow, dangerous lane lined with rare graphite crystals alongside a safe detour.',
    xpReward: 200,
    leadsReward: 5,
  },

  // HAZARDS
  env_crosswind: {
    id: 'env_crosswind',
    category: 'HAZARD',
    name: 'Drafting Desk Crosswinds',
    desc: 'Strong gusts pushing the rolling ball sideways toward the track margins.',
    xpReward: 120,
    leadsReward: 2,
  },
  env_ink_slick: {
    id: 'env_ink_slick',
    category: 'HAZARD',
    name: 'Indian Ink Slicks',
    desc: 'Dark wet pools on the track reducing lateral grip and steering response.',
    xpReward: 150,
    leadsReward: 3,
  },
  env_eraser_storm: {
    id: 'env_eraser_storm',
    category: 'HAZARD',
    name: 'Eraser Dust Tempest',
    desc: 'A flurry of vulcanized rubber flakes temporarily erasing visible road markers.',
    xpReward: 200,
    leadsReward: 4,
  },

  // SET-PIECE EVENTS
  event_giant_eraser: {
    id: 'event_giant_eraser',
    category: 'EVENT',
    name: 'The Giant Eraser Sweep',
    desc: 'A colossal draftsman eraser wipes the horizon clean, revealing the emerging city!',
    xpReward: 250,
    leadsReward: 5,
  },
  event_skybridge: {
    id: 'event_skybridge',
    category: 'EVENT',
    name: 'The Rooftop Skybridge Ascent',
    desc: 'A furious flurry of pencil lead sketches a soaring elevated skyway above the spires.',
    xpReward: 400,
    leadsReward: 8,
  },
  event_canyon_plunge: {
    id: 'event_canyon_plunge',
    category: 'EVENT',
    name: 'The Great Canyon Plunge',
    desc: 'The urban floor breaks away into an endless mountain canyon drop!',
    xpReward: 600,
    leadsReward: 12,
  },
  event_ink_singularity: {
    id: 'event_ink_singularity',
    category: 'EVENT',
    name: 'The Ink Singularity Surge',
    desc: 'A giant overturned inkwell floods reality into surreal floating parchment geometry!',
    xpReward: 1000,
    leadsReward: 20,
  },
};

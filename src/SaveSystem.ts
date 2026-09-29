/**
 * SaveSystem & Player Profile Progression for Pencil Flow 2.0
 * Fully offline, versioned, migration-safe localStorage persistence.
 */

export interface PlayerStats {
  totalDistance: number;
  totalRuns: number;
  bestDistance: number;
  bestScore: number;
  bestSpeed: number;
  bestCombo: number;
  graphiteCollected: number;
  leadsCollected: number;
  obstaclesDodged: number;
  jumps: number;
  closeCalls: number;
  perfectLandings: number;
}

export interface GameSettings {
  sensitivity: number; // 0.5 to 2.0 (default 1.0)
  autoSteerAssist: boolean;
  soundEnabled: boolean;
  graphicsQuality: 'LOW' | 'MEDIUM' | 'HIGH';
  reducedMotion: boolean;
  cameraShake: boolean;
}

export interface Mission {
  id: string;
  title: string;
  desc: string;
  category: 'DISTANCE' | 'COLLECTION' | 'DODGE' | 'COMBO' | 'JUMP';
  target: number;
  progress: number;
  rewardType: 'GRAPHITE' | 'LEAD' | 'XP';
  rewardAmount: number;
  completed: boolean;
  claimed: boolean;
  isDaily: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  target: number;
  progress: number;
  rewardLeads: number;
  rewardXP: number;
  unlocked: boolean;
}

export interface LeaderboardEntry {
  name: string;
  distance: number;
  score: number;
  date: string;
}

export interface PlayerData {
  version: number;
  level: number;
  xp: number;
  graphite: number;
  leads: number;
  title: string;
  
  // Customization
  equippedBall: string;
  equippedPencil: string;
  equippedTrail: string;
  equippedWorld: string;
  unlockedBalls: string[];
  unlockedPencils: string[];
  unlockedTrails: string[];
  unlockedWorlds: string[];

  // Daily Challenge
  dailyStreak: number;
  lastDailyDate: string;
  dailyHighScore: number;

  stats: PlayerStats;
  settings: GameSettings;
  missions: Mission[];
  achievements: Achievement[];
  leaderboard: LeaderboardEntry[];
  discoveries: string[];
}

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_roll', title: 'First Stroke', desc: 'Travel your first 250 meters', target: 250, progress: 0, rewardLeads: 2, rewardXP: 100, unlocked: false },
  { id: 'dist_1k', title: 'Kilometer Run', desc: 'Travel 1,000 meters in a single run', target: 1000, progress: 0, rewardLeads: 5, rewardXP: 300, unlocked: false },
  { id: 'dist_2k5', title: 'Draftsman', desc: 'Reach 2,500 meters in a single run', target: 2500, progress: 0, rewardLeads: 10, rewardXP: 800, unlocked: false },
  { id: 'dist_5k', title: 'Master of Flow', desc: 'Reach 5,000 meters in a single run', target: 5000, progress: 0, rewardLeads: 25, rewardXP: 2500, unlocked: false },
  { id: 'total_10k', title: 'Sketchbook Filler', desc: 'Accumulate 10,000 total meters across all runs', target: 10000, progress: 0, rewardLeads: 8, rewardXP: 600, unlocked: false },
  { id: 'total_50k', title: 'Marathoner', desc: 'Accumulate 50,000 total meters across all runs', target: 50000, progress: 0, rewardLeads: 20, rewardXP: 2000, unlocked: false },
  { id: 'speed_20', title: 'Swift Pen', desc: 'Reach a rolling speed of 20 u/s', target: 20, progress: 0, rewardLeads: 3, rewardXP: 150, unlocked: false },
  { id: 'speed_28', title: 'Sonic Graphite', desc: 'Reach a rolling speed of 28 u/s', target: 28, progress: 0, rewardLeads: 8, rewardXP: 500, unlocked: false },
  { id: 'speed_34', title: 'Terminal Velocity', desc: 'Reach the maximum rolling speed of 34 u/s', target: 34, progress: 0, rewardLeads: 15, rewardXP: 1200, unlocked: false },
  { id: 'graphite_100', title: 'Graphite Shaver', desc: 'Collect 100 Graphite Shards', target: 100, progress: 0, rewardLeads: 3, rewardXP: 150, unlocked: false },
  { id: 'graphite_500', title: 'Lead Miner', desc: 'Collect 500 Graphite Shards', target: 500, progress: 0, rewardLeads: 10, rewardXP: 750, unlocked: false },
  { id: 'graphite_2500', title: 'Graphite Baron', desc: 'Collect 2,500 Graphite Shards', target: 2500, progress: 0, rewardLeads: 25, rewardXP: 2500, unlocked: false },
  { id: 'leads_10', title: 'Charged Up', desc: 'Collect 10 2B Lead Power-ups', target: 10, progress: 0, rewardLeads: 5, rewardXP: 300, unlocked: false },
  { id: 'leads_50', title: 'Supercharged', desc: 'Collect 50 2B Lead Power-ups', target: 50, progress: 0, rewardLeads: 15, rewardXP: 1200, unlocked: false },
  { id: 'dodge_25', title: 'Nimble Roller', desc: 'Dodge 25 track hazards', target: 25, progress: 0, rewardLeads: 3, rewardXP: 200, unlocked: false },
  { id: 'dodge_100', title: 'Obstacle Acrobat', desc: 'Dodge 100 track hazards', target: 100, progress: 0, rewardLeads: 10, rewardXP: 700, unlocked: false },
  { id: 'dodge_500', title: 'Untouchable', desc: 'Dodge 500 track hazards', target: 500, progress: 0, rewardLeads: 25, rewardXP: 2000, unlocked: false },
  { id: 'close_call_5', title: 'Shaving It Close', desc: 'Perform 5 Close Calls (narrow misses)', target: 5, progress: 0, rewardLeads: 4, rewardXP: 250, unlocked: false },
  { id: 'close_call_25', title: 'Daredevil', desc: 'Perform 25 Close Calls', target: 25, progress: 0, rewardLeads: 12, rewardXP: 900, unlocked: false },
  { id: 'perfect_land_5', title: 'Soft Touch', desc: 'Execute 5 Perfect Landings over hurdles', target: 5, progress: 0, rewardLeads: 4, rewardXP: 250, unlocked: false },
  { id: 'perfect_land_20', title: 'Acrobatic Glide', desc: 'Execute 20 Perfect Landings', target: 20, progress: 0, rewardLeads: 10, rewardXP: 800, unlocked: false },
  { id: 'combo_5', title: 'Flow State', desc: 'Reach a Combo Multiplier of x5', target: 5, progress: 0, rewardLeads: 5, rewardXP: 300, unlocked: false },
  { id: 'combo_10', title: 'Unbroken Rhythm', desc: 'Reach a Combo Multiplier of x10', target: 10, progress: 0, rewardLeads: 15, rewardXP: 1000, unlocked: false },
  { id: 'jumps_50', title: 'Airborne Artist', desc: 'Perform 50 jumps', target: 50, progress: 0, rewardLeads: 5, rewardXP: 300, unlocked: false },
  { id: 'jumps_200', title: 'Gravity Defier', desc: 'Perform 200 jumps', target: 200, progress: 0, rewardLeads: 12, rewardXP: 900, unlocked: false },
  { id: 'daily_3', title: 'Dedicated', desc: 'Maintain a 3-Day Daily Challenge streak', target: 3, progress: 0, rewardLeads: 10, rewardXP: 750, unlocked: false },
  { id: 'daily_7', title: 'Week Warrior', desc: 'Maintain a 7-Day Daily Challenge streak', target: 7, progress: 0, rewardLeads: 25, rewardXP: 2000, unlocked: false },
  { id: 'collect_skin', title: 'Fashionista', desc: 'Unlock 3 custom ball skins in the shop', target: 3, progress: 0, rewardLeads: 10, rewardXP: 500, unlocked: false },
  { id: 'collect_pencil', title: 'Pencil Collector', desc: 'Unlock 3 pencil styles', target: 3, progress: 0, rewardLeads: 10, rewardXP: 500, unlocked: false },
  { id: 'level_10', title: 'Master of Arts', desc: 'Reach Player Level 10', target: 10, progress: 0, rewardLeads: 20, rewardXP: 1500, unlocked: false },
];

export const SAVE_KEY = 'pencil_flow_save_v2';

export class SaveSystem {
  private data: PlayerData;

  constructor() {
    this.data = this.load();
    this.refreshDailyMissions();
  }

  public getData(): PlayerData {
    return this.data;
  }

  private getDefaultData(): PlayerData {
    return {
      version: 2,
      level: 1,
      xp: 0,
      graphite: 150, // Starting bonus
      leads: 5,
      title: 'PENCIL RUNNER',
      equippedBall: 'classic',
      equippedPencil: 'classic_hb',
      equippedTrail: 'graphite_dust',
      equippedWorld: 'paper',
      unlockedBalls: ['classic'],
      unlockedPencils: ['classic_hb'],
      unlockedTrails: ['graphite_dust'],
      unlockedWorlds: ['paper', 'sketch_city'],
      dailyStreak: 0,
      lastDailyDate: '',
      dailyHighScore: 0,
      stats: {
        totalDistance: 0,
        totalRuns: 0,
        bestDistance: 0,
        bestScore: 0,
        bestSpeed: 12,
        bestCombo: 1,
        graphiteCollected: 0,
        leadsCollected: 0,
        obstaclesDodged: 0,
        jumps: 0,
        closeCalls: 0,
        perfectLandings: 0,
      },
      settings: {
        sensitivity: 1.0,
        autoSteerAssist: false,
        soundEnabled: true,
        graphicsQuality: 'HIGH',
        reducedMotion: false,
        cameraShake: true,
      },
      missions: [],
      achievements: JSON.parse(JSON.stringify(INITIAL_ACHIEVEMENTS)),
      leaderboard: [
        { name: 'Leonardo', distance: 3450, score: 4140, date: '2026-09-24' },
        { name: 'Picasso', distance: 2820, score: 3384, date: '2026-09-25' },
        { name: 'DaVinci', distance: 1980, score: 2376, date: '2026-09-26' },
      ],
      discoveries: ['world_sketchbook'],
    };
  }

  private load(): PlayerData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Merge with default to guarantee no missing fields
        const merged = { ...this.getDefaultData(), ...parsed };
        merged.stats = { ...this.getDefaultData().stats, ...(parsed.stats || {}) };
        merged.settings = { ...this.getDefaultData().settings, ...(parsed.settings || {}) };
        if (!Array.isArray(merged.discoveries)) {
          merged.discoveries = ['world_sketchbook'];
        }
        // Merge achievements to preserve new ones
        if (!merged.achievements || merged.achievements.length < INITIAL_ACHIEVEMENTS.length) {
          const map = new Map(merged.achievements?.map((a: Achievement) => [a.id, a]) || []);
          merged.achievements = INITIAL_ACHIEVEMENTS.map((def) => {
            const existing = map.get(def.id);
            return existing ? { ...def, ...existing } : { ...def };
          });
        }
        return merged;
      }
    } catch {
      // In-memory fallback
    }
    return this.getDefaultData();
  }

  public hasDiscovery(id: string): boolean {
    return this.data.discoveries.includes(id);
  }

  public recordDiscovery(id: string, xpReward = 50, leadsReward = 1): boolean {
    if (!this.data.discoveries.includes(id)) {
      this.data.discoveries.push(id);
      this.addXP(xpReward);
      if (leadsReward > 0) {
        this.addCurrency(0, leadsReward);
      }
      this.save();
      return true;
    }
    return false;
  }

  public getDiscoveries(): string[] {
    return this.data.discoveries;
  }

  public save(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      // Storage restricted
    }
  }

  public addXP(amount: number): { leveledUp: boolean; newLevel: number } {
    this.data.xp += amount;
    const reqXP = this.getXPForNextLevel(this.data.level);
    let leveledUp = false;
    while (this.data.xp >= reqXP) {
      this.data.xp -= reqXP;
      this.data.level += 1;
      this.data.leads += 3; // Level up reward!
      this.data.graphite += 75;
      leveledUp = true;
    }
    this.save();
    return { leveledUp, newLevel: this.data.level };
  }

  public getXPForNextLevel(level: number): number {
    return Math.floor(400 * Math.pow(1.22, level - 1));
  }

  public addCurrency(graphite: number, leads = 0): void {
    this.data.graphite += graphite;
    this.data.leads += leads;
    this.data.stats.graphiteCollected += graphite;
    this.data.stats.leadsCollected += leads;
    this.save();
  }

  public spendCurrency(graphite: number, leads = 0): boolean {
    if (this.data.graphite >= graphite && this.data.leads >= leads) {
      this.data.graphite -= graphite;
      this.data.leads -= leads;
      this.save();
      return true;
    }
    return false;
  }

  public recordRun(
    dist: number,
    score: number,
    speed: number,
    graphite: number,
    leads: number,
    dodges: number,
    jumps: number,
    closeCalls: number,
    perfectLandings: number,
    maxCombo: number
  ): { isNewBestDist: boolean; isNewBestScore: boolean } {
    const s = this.data.stats;
    s.totalRuns += 1;
    s.totalDistance += dist;
    s.graphiteCollected += graphite;
    s.leadsCollected += leads;
    s.obstaclesDodged += dodges;
    s.jumps += jumps;
    s.closeCalls += closeCalls;
    s.perfectLandings += perfectLandings;
    if (speed > s.bestSpeed) s.bestSpeed = speed;
    if (maxCombo > s.bestCombo) s.bestCombo = maxCombo;

    let isNewBestDist = false;
    let isNewBestScore = false;
    if (dist > s.bestDistance) {
      s.bestDistance = dist;
      isNewBestDist = true;
    }
    if (score > s.bestScore) {
      s.bestScore = score;
      isNewBestScore = true;
      // Add to local leaderboard
      this.data.leaderboard.push({
        name: 'You',
        distance: Math.floor(dist),
        score,
        date: new Date().toISOString().split('T')[0],
      });
      this.data.leaderboard.sort((a, b) => b.score - a.score);
      if (this.data.leaderboard.length > 8) {
        this.data.leaderboard = this.data.leaderboard.slice(0, 8);
      }
    }

    // Update achievements
    this.updateAchievementProgress('dist_1k', dist);
    this.updateAchievementProgress('dist_2k5', dist);
    this.updateAchievementProgress('dist_5k', dist);
    this.updateAchievementProgress('total_10k', s.totalDistance);
    this.updateAchievementProgress('total_50k', s.totalDistance);
    this.updateAchievementProgress('speed_20', s.bestSpeed);
    this.updateAchievementProgress('speed_28', s.bestSpeed);
    this.updateAchievementProgress('speed_34', s.bestSpeed);
    this.updateAchievementProgress('graphite_100', s.graphiteCollected);
    this.updateAchievementProgress('graphite_500', s.graphiteCollected);
    this.updateAchievementProgress('graphite_2500', s.graphiteCollected);
    this.updateAchievementProgress('leads_10', s.leadsCollected);
    this.updateAchievementProgress('leads_50', s.leadsCollected);
    this.updateAchievementProgress('dodge_25', s.obstaclesDodged);
    this.updateAchievementProgress('dodge_100', s.obstaclesDodged);
    this.updateAchievementProgress('dodge_500', s.obstaclesDodged);
    this.updateAchievementProgress('close_call_5', s.closeCalls);
    this.updateAchievementProgress('close_call_25', s.closeCalls);
    this.updateAchievementProgress('perfect_land_5', s.perfectLandings);
    this.updateAchievementProgress('perfect_land_20', s.perfectLandings);
    this.updateAchievementProgress('combo_5', s.bestCombo);
    this.updateAchievementProgress('combo_10', s.bestCombo);
    this.updateAchievementProgress('jumps_50', s.jumps);
    this.updateAchievementProgress('jumps_200', s.jumps);
    this.updateAchievementProgress('level_10', this.data.level);

    // Update missions
    this.updateMissionProgress('DISTANCE', dist);
    this.updateMissionProgress('COLLECTION', graphite);
    this.updateMissionProgress('DODGE', dodges);
    this.updateMissionProgress('JUMP', jumps);
    this.updateMissionProgress('COMBO', maxCombo);

    this.save();
    return { isNewBestDist, isNewBestScore };
  }

  public updateAchievementProgress(id: string, currentVal: number): Achievement | null {
    const a = this.data.achievements.find((item) => item.id === id);
    if (!a || a.unlocked) return null;
    a.progress = Math.max(a.progress, currentVal);
    if (a.progress >= a.target) {
      a.unlocked = true;
      this.data.leads += a.rewardLeads;
      this.addXP(a.rewardXP);
      this.save();
      return a;
    }
    return null;
  }

  public updateMissionProgress(category: Mission['category'], amount: number): void {
    for (const m of this.data.missions) {
      if (m.category === category && !m.completed) {
        m.progress = Math.min(m.target, m.progress + amount);
        if (m.progress >= m.target) {
          m.completed = true;
        }
      }
    }
    this.save();
  }

  public claimMissionReward(missionId: string): Mission | null {
    const m = this.data.missions.find((item) => item.id === missionId);
    if (m && m.completed && !m.claimed) {
      m.claimed = true;
      if (m.rewardType === 'GRAPHITE') this.addCurrency(m.rewardAmount, 0);
      else if (m.rewardType === 'LEAD') this.addCurrency(0, m.rewardAmount);
      else if (m.rewardType === 'XP') this.addXP(m.rewardAmount);
      this.save();
      return m;
    }
    return null;
  }

  public refreshDailyMissions(): void {
    const today = new Date().toISOString().split('T')[0];
    const hasTodayDaily = this.data.missions.some((m) => m.isDaily && m.id.startsWith(today));
    if (!hasTodayDaily) {
      // Remove old daily missions
      this.data.missions = this.data.missions.filter((m) => !m.isDaily);
      // Generate 3 fresh deterministic daily missions based on today
      this.data.missions.push(
        {
          id: `${today}_dist`,
          title: 'Daily Glide',
          desc: 'Travel 1,500m in today\'s runs',
          category: 'DISTANCE',
          target: 1500,
          progress: 0,
          rewardType: 'GRAPHITE',
          rewardAmount: 180,
          completed: false,
          claimed: false,
          isDaily: true,
        },
        {
          id: `${today}_graphite`,
          title: 'Graphite Sweep',
          desc: 'Collect 60 Graphite Shards today',
          category: 'COLLECTION',
          target: 60,
          progress: 0,
          rewardType: 'XP',
          rewardAmount: 350,
          completed: false,
          claimed: false,
          isDaily: true,
        },
        {
          id: `${today}_dodge`,
          title: 'Pencil Acrobat',
          desc: 'Dodge 20 obstacles today',
          category: 'DODGE',
          target: 20,
          progress: 0,
          rewardType: 'LEAD',
          rewardAmount: 3,
          completed: false,
          claimed: false,
          isDaily: true,
        }
      );
      this.save();
    }
  }

  public getDailyChallengeModifier(): { name: string; desc: string; speedMult: number; gravityMult: number } {
    const today = new Date().toISOString().split('T')[0];
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
      hash = (hash << 5) - hash + today.charCodeAt(i);
      hash |= 0;
    }
    const modifiers = [
      { name: 'SUPER SPEEDWAY', desc: '1.25x speed with wide sweeping curves', speedMult: 1.25, gravityMult: 1.0 },
      { name: 'LOW GRAVITY FLOW', desc: 'Leap soaring heights over dense obstacle fields', speedMult: 1.05, gravityMult: 0.65 },
      { name: 'GRAPHITE FEVER', desc: 'Double graphite shards & high frequency leads', speedMult: 1.1, gravityMult: 1.0 },
      { name: 'PRECISION RUN', desc: 'Denser obstacle placements and fast reaction bends', speedMult: 1.15, gravityMult: 1.0 },
      { name: 'HAZARD GAUNTLET', desc: 'Stationery hurdles everywhere, sharp reflexes required', speedMult: 1.2, gravityMult: 1.1 },
    ];
    return modifiers[Math.abs(hash) % modifiers.length];
  }
}

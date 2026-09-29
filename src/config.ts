export interface GameConfig {
  player: {
    startSpeed: number;
    maxSpeed: number;
    accelerationRate: number; // units/s added per 100 meters
    radius: number;
    lateralSpeed: number;
    lateralDamping: number;
    jumpForce: number;
    gravity: number;
  };
  path: {
    defaultWidth: number;
    minWidth: number;
    maxWidth: number;
    chunkLength: number;
    lookAheadChunks: number;
    removeBehindDistance: number;
    sampleStep: number;
  };
  pencil: {
    leadDistance: number; // world units ahead of the ball
    tiltAngle: number;
  };
  camera: {
    distanceBehind: number;
    heightAbove: number;
    lookAheadDistance: number;
    smoothFactor: number;
  };
  powerUp: {
    boostDuration: number;
    boostSpeedMultiplier: number;
    spawnInterval: number;
  };
  visual: {
    paperColor: number;
    graphiteDark: number;
    graphiteMedium: number;
    graphiteLight: number;
    pathBgColor: number;
    eraserColor: number;
    pencilBodyColor: number;
    leadGold: number;
  };
  debug: boolean;
}

export const CONFIG: GameConfig = {
  player: {
    startSpeed: 12.0,
    maxSpeed: 34.0,
    accelerationRate: 1.5,
    radius: 0.6,
    lateralSpeed: 24.0,
    lateralDamping: 26.0,
    jumpForce: 13.5,
    gravity: 30.0,
  },
  path: {
    defaultWidth: 12.0, // Generously wide so ball doesn't easily fall off!
    minWidth: 9.5,
    maxWidth: 15.0,
    chunkLength: 40.0,
    lookAheadChunks: 8,
    removeBehindDistance: 80.0,
    sampleStep: 0.5,
  },
  pencil: {
    leadDistance: 65.0, // Generously ahead so road curves and obstacles are drawn and telegraphed early
    tiltAngle: 0.35,
  },
  camera: {
    distanceBehind: 8.0,
    heightAbove: 4.8,
    lookAheadDistance: 20.0,
    smoothFactor: 0.12,
  },
  powerUp: {
    boostDuration: 5.0,
    boostSpeedMultiplier: 1.45,
    spawnInterval: 28.0,
  },
  visual: {
    paperColor: 0xf4efe6,
    graphiteDark: 0x221f1d,
    graphiteMedium: 0x5a534c,
    graphiteLight: 0x93897e,
    pathBgColor: 0xfcfaf3,
    eraserColor: 0xe07272,
    pencilBodyColor: 0xe5a93c,
    leadGold: 0xdfab34,
  },
  debug: false,
};

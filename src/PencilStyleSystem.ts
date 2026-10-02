import * as THREE from 'three';

export type PencilStrokeType =
  | 'CLASSIC_GRAPHITE'
  | 'TECHNICAL_BLUEPRINT'
  | 'HEAVY_CHARCOAL'
  | 'GLOWING_NEON'
  | 'EDITORIAL_CRIMSON'
  | 'PAINTERLY_WATERCOLOR'
  | 'PRECISION_MECHANICAL'
  | 'GILDED_GOLD'
  | 'STEALTH_MONOCHROME';

export interface PencilStyleDefinition {
  id: string;
  name: string;
  artistTitle: string;
  subtitle: string;
  description: string;
  strokeType: PencilStrokeType;

  // Palette & Atmosphere
  primaryColor: number;
  secondaryColor: number;
  accentColor: number;
  paperColor: number;
  fogColor: number;
  fogNear: number;
  fogFar: number;
  ambientColor: number;
  ambientIntensity: number;
  dirLightColor: number;
  dirLightIntensity: number;

  // Road Surface & Linework
  roadBedColor: number;
  roadRoughness: number;
  roadMetalness: number;
  roadLineWidth: number;
  roadLineColor: number;
  roadCreaseColor: number;
  roadCenterColor: number;
  roadCurvatureJitter: number;
  roadCurbLift: number;
  roadInnerWidthRatio: number;
  roadEdgeStyle:
    | 'SKETCH_DOUBLE'
    | 'BLUEPRINT_RULER'
    | 'CHARCOAL_SMUDGE'
    | 'NEON_GLOW_RAIL'
    | 'CRIMSON_SLASH'
    | 'WATERCOLOR_BLEED'
    | 'PRECISION_METRIC'
    | 'GOLD_FILIGREE'
    | 'STEALTH_CONTOUR';
  roadCenterDashed: boolean;

  // Architectural Environment Styling
  buildingFacadeColor: number;
  buildingRoofColor: number;
  foundationColor: number;
  outlineColor: number;
  outlineWidth: number;
  faintLineColor: number;
  foliageColor: number;
  trunkColor: number;
  streetAccentColor: number;

  // Procedural Cross-Hatching Parameters
  hatchPrimaryColor: string;
  hatchSecondaryColor: string;
  hatchSpacing: number;

  // Obstacle Visual Language
  obstacleStyle: string;
  obstacleTheme: {
    metalColor: number;
    bodyColor: number;
    accentColor: number;
    outlineColor: number;
    emissiveColor: number;
    emissiveIntensity: number;
    shadingRoughness: number;
  };

  // Collectibles & Powerups
  collectibleColor: number;
  collectibleEmissive: number;
  collectibleHaloColor: number;

  // Rolling Ball & Motion Effects
  ballTrailColor: number;
  ballTrailWidth: number;
  ballTrailOpacity: number;
  dustColors: number[];
  puffColor: number;
  boostEffectColor: number;
  sparksColor: number;
  shavingColor: number;

  // Sky & Celestial Themes
  skyTheme: {
    cloudColor: number;
    cloudHatchColor: number;
    sunDiscColor: number;
    sunRayColor: number;
    sunGlowColor: number;
    horizonColor: number;
    dustColor: number;
  };

  // UI Theming
  uiTheme: {
    accentHex: string;
    borderHex: string;
    badgeBgHex: string;
    badgeTextHex: string;
    glowHex: string;
  };

  // Canvas texture generator for the road bed
  drawRoadTexture: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
}

export const PENCIL_STYLES: Record<string, PencilStyleDefinition> = {
  // 1. CLASSIC HB: Traditional warm vellum & rough 2B graphite sketching
  classic_hb: {
    id: 'classic_hb',
    name: 'Classic HB No. 2',
    artistTitle: 'The Classic Draftsman',
    subtitle: 'Warm Vellum, Graphite Strokes & Natural Paper Tooth',
    description: 'The iconic yellow cedar pencil. Yields authentic architectural pencil strokes, warm paper, and graphite cross-hatching.',
    strokeType: 'CLASSIC_GRAPHITE',

    primaryColor: 0x221f1d,
    secondaryColor: 0x48423c,
    accentColor: 0xd97706,
    paperColor: 0xf5f0e6,
    fogColor: 0xf2ece1,
    fogNear: 70,
    fogFar: 330,
    ambientColor: 0xfffbf2,
    ambientIntensity: 0.95,
    dirLightColor: 0xfff6e8,
    dirLightIntensity: 1.0,

    roadBedColor: 0xfcfaf4,
    roadRoughness: 0.92,
    roadMetalness: 0.0,
    roadLineWidth: 2.5,
    roadLineColor: 0x1f1d1b,
    roadCreaseColor: 0x5a524a,
    roadCenterColor: 0x8a8074,
    roadCurvatureJitter: 0.045,
    roadCurbLift: 0.35,
    roadInnerWidthRatio: 0.72,
    roadEdgeStyle: 'SKETCH_DOUBLE',
    roadCenterDashed: true,

    buildingFacadeColor: 0xfbf8f1,
    buildingRoofColor: 0x3d3731,
    foundationColor: 0x2e2925,
    outlineColor: 0x221f1d,
    outlineWidth: 1.6,
    faintLineColor: 0x8c8274,
    foliageColor: 0xe8e2d5,
    trunkColor: 0x3a322c,
    streetAccentColor: 0xd4a034,

    hatchPrimaryColor: '#221f1d',
    hatchSecondaryColor: '#453d36',
    hatchSpacing: 7,

    obstacleStyle: 'CLASSIC_DESK',
    obstacleTheme: {
      metalColor: 0x8e8a83,
      bodyColor: 0xead9b6,
      accentColor: 0xd4a034,
      outlineColor: 0x221f1d,
      emissiveColor: 0x000000,
      emissiveIntensity: 0.0,
      shadingRoughness: 0.7,
    },

    collectibleColor: 0x2b2723,
    collectibleEmissive: 0x443e39,
    collectibleHaloColor: 0xd97706,

    ballTrailColor: 0x2b2723,
    ballTrailWidth: 2.0,
    ballTrailOpacity: 0.7,
    dustColors: [0x221f1d, 0x5a534c, 0x8a8074],
    puffColor: 0x3d3833,
    boostEffectColor: 0xd97706,
    sparksColor: 0xd97706,
    shavingColor: 0xd4a373,

    skyTheme: {
      cloudColor: 0xfffcf7,
      cloudHatchColor: 0x5a524a,
      sunDiscColor: 0xfff3d6,
      sunRayColor: 0x48423c,
      sunGlowColor: 0xfef08a,
      horizonColor: 0xded8ce,
      dustColor: 0x3d3833,
    },

    uiTheme: {
      accentHex: '#d97706',
      borderHex: '#2b2723',
      badgeBgHex: '#fef3c7',
      badgeTextHex: '#92400e',
      glowHex: 'rgba(217, 119, 6, 0.25)',
    },

    drawRoadTexture: (ctx, w, h) => {
      ctx.fillStyle = '#fcfaf4';
      ctx.fillRect(0, 0, w, h);

      // Fine architectural drafting grid lines
      ctx.strokeStyle = '#e5decfa0';
      ctx.lineWidth = 1;
      const step = 32;
      for (let x = 0; x <= w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Hand-drawn pencil tire tracks
      ctx.fillStyle = '#f2ebe0';
      ctx.fillRect(40, 0, 44, h);
      ctx.fillRect(172, 0, 44, h);

      // Sketchy center forward ticks
      ctx.strokeStyle = '#c4bbae';
      ctx.lineWidth = 2.5;
      for (let y = 30; y < h; y += 80) {
        ctx.beginPath();
        ctx.moveTo(116, y);
        ctx.lineTo(128, y + 16);
        ctx.lineTo(140, y);
        ctx.stroke();
      }
    },
  },

  // 2. BLUEPRINT: Deep Prussian blue technical engineering world
  blueprint_stylus: {
    id: 'blueprint_stylus',
    name: 'Architect Blueprint',
    artistTitle: 'The Master Engineer',
    subtitle: 'Cyan Technical Grid, Isometric Drafting & Measurement Rules',
    description: 'Precision technical drafting stylus. The world transforms into an engineering blueprint with white-on-cyan coordinate grids.',
    strokeType: 'TECHNICAL_BLUEPRINT',

    primaryColor: 0x0284c7,
    secondaryColor: 0x0369a1,
    accentColor: 0x38bdf8,
    paperColor: 0x092848,
    fogColor: 0x08243e,
    fogNear: 60,
    fogFar: 300,
    ambientColor: 0x1e3a5f,
    ambientIntensity: 1.15,
    dirLightColor: 0x38bdf8,
    dirLightIntensity: 1.25,

    roadBedColor: 0x0d3862,
    roadRoughness: 0.75,
    roadMetalness: 0.1,
    roadLineWidth: 2.0,
    roadLineColor: 0x38bdf8,
    roadCreaseColor: 0x0ea5e9,
    roadCenterColor: 0x7dd3fc,
    roadCurvatureJitter: 0.012,
    roadCurbLift: 0.18,
    roadInnerWidthRatio: 0.82,
    roadEdgeStyle: 'BLUEPRINT_RULER',
    roadCenterDashed: true,

    buildingFacadeColor: 0x0f406e,
    buildingRoofColor: 0x072442,
    foundationColor: 0x051b32,
    outlineColor: 0x38bdf8,
    outlineWidth: 1.8,
    faintLineColor: 0x0284c7,
    foliageColor: 0x0c4a6e,
    trunkColor: 0x07223b,
    streetAccentColor: 0x7dd3fc,

    hatchPrimaryColor: '#38bdf8',
    hatchSecondaryColor: '#0284c7',
    hatchSpacing: 9,

    obstacleStyle: 'BLUEPRINT_CAD',
    obstacleTheme: {
      metalColor: 0x0284c7,
      bodyColor: 0x075985,
      accentColor: 0x38bdf8,
      outlineColor: 0x7dd3fc,
      emissiveColor: 0x0284c7,
      emissiveIntensity: 0.45,
      shadingRoughness: 0.3,
    },

    collectibleColor: 0x0284c7,
    collectibleEmissive: 0x38bdf8,
    collectibleHaloColor: 0x7dd3fc,

    ballTrailColor: 0x38bdf8,
    ballTrailWidth: 2.5,
    ballTrailOpacity: 0.85,
    dustColors: [0x38bdf8, 0x7dd3fc, 0x0284c7],
    puffColor: 0x0284c7,
    boostEffectColor: 0x38bdf8,
    sparksColor: 0x38bdf8,
    shavingColor: 0x0284c7,

    skyTheme: {
      cloudColor: 0x075985,
      cloudHatchColor: 0x0284c7,
      sunDiscColor: 0x38bdf8,
      sunRayColor: 0x7dd3fc,
      sunGlowColor: 0x0ea5e9,
      horizonColor: 0x0c4a6e,
      dustColor: 0x38bdf8,
    },

    uiTheme: {
      accentHex: '#38bdf8',
      borderHex: '#0284c7',
      badgeBgHex: '#082f49',
      badgeTextHex: '#38bdf8',
      glowHex: 'rgba(56, 189, 248, 0.45)',
    },

    drawRoadTexture: (ctx, w, h) => {
      ctx.fillStyle = '#0d3862';
      ctx.fillRect(0, 0, w, h);

      // Technical white and cyan grid lines
      ctx.strokeStyle = '#38bdf840';
      ctx.lineWidth = 1;
      const step = 24;
      for (let x = 0; x <= w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Measurement ticks along margins
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 1.5;
      for (let y = 0; y < h; y += 16) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(12, y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(w, y);
        ctx.lineTo(w - 12, y);
        ctx.stroke();
      }

      // Technical center dimension line
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(w * 0.5, 0);
      ctx.lineTo(w * 0.5, h);
      ctx.stroke();
      ctx.setLineDash([]);
    },
  },

  // 3. EDITORIAL CRIMSON: Aggressive redline editing & fiery energetic sketch
  crimson_red: {
    id: 'crimson_red',
    name: 'Editorial Crimson',
    artistTitle: 'The Editorial Redliner',
    subtitle: 'Vigorous Carmine Strokes, Proofreader Marks & Ruby Haze',
    description: 'The red pen of editorial authority. High-contrast energetic carmine strokes create an intense, urgent, razor-focused world.',
    strokeType: 'EDITORIAL_CRIMSON',

    primaryColor: 0xdc2626,
    secondaryColor: 0x991b1b,
    accentColor: 0xf87171,
    paperColor: 0xf8ede8,
    fogColor: 0xf3ded5,
    fogNear: 65,
    fogFar: 310,
    ambientColor: 0xfff1ec,
    ambientIntensity: 0.95,
    dirLightColor: 0xffe4db,
    dirLightIntensity: 1.05,

    roadBedColor: 0xfdf5f2,
    roadRoughness: 0.88,
    roadMetalness: 0.0,
    roadLineWidth: 2.8,
    roadLineColor: 0xb91c1c,
    roadCreaseColor: 0xef4444,
    roadCenterColor: 0xdc2626,
    roadCurvatureJitter: 0.055,
    roadCurbLift: 0.42,
    roadInnerWidthRatio: 0.70,
    roadEdgeStyle: 'CRIMSON_SLASH',
    roadCenterDashed: true,

    buildingFacadeColor: 0xfaf0eb,
    buildingRoofColor: 0x7f1d1d,
    foundationColor: 0x450a0a,
    outlineColor: 0xb91c1c,
    outlineWidth: 2.0,
    faintLineColor: 0xe08484,
    foliageColor: 0xebcfc7,
    trunkColor: 0x450a0a,
    streetAccentColor: 0xdc2626,

    hatchPrimaryColor: '#b91c1c',
    hatchSecondaryColor: '#7f1d1d',
    hatchSpacing: 6,

    obstacleStyle: 'CRIMSON_HAZARD',
    obstacleTheme: {
      metalColor: 0x991b1b,
      bodyColor: 0xdc2626,
      accentColor: 0xf87171,
      outlineColor: 0x7f1d1d,
      emissiveColor: 0xdc2626,
      emissiveIntensity: 0.4,
      shadingRoughness: 0.4,
    },

    collectibleColor: 0xdc2626,
    collectibleEmissive: 0xf87171,
    collectibleHaloColor: 0xef4444,

    ballTrailColor: 0xdc2626,
    ballTrailWidth: 2.6,
    ballTrailOpacity: 0.8,
    dustColors: [0xdc2626, 0x991b1b, 0xf87171],
    puffColor: 0x7f1d1d,
    boostEffectColor: 0xef4444,
    sparksColor: 0xef4444,
    shavingColor: 0x991b1b,

    skyTheme: {
      cloudColor: 0xfee2e2,
      cloudHatchColor: 0x991b1b,
      sunDiscColor: 0xdc2626,
      sunRayColor: 0xef4444,
      sunGlowColor: 0xfca5a5,
      horizonColor: 0xf87171,
      dustColor: 0xdc2626,
    },

    uiTheme: {
      accentHex: '#dc2626',
      borderHex: '#991b1b',
      badgeBgHex: '#fee2e2',
      badgeTextHex: '#991b1b',
      glowHex: 'rgba(220, 38, 38, 0.4)',
    },

    drawRoadTexture: (ctx, w, h) => {
      ctx.fillStyle = '#fdf5f2';
      ctx.fillRect(0, 0, w, h);

      // Redlining margin rules
      ctx.strokeStyle = '#fca5a560';
      ctx.lineWidth = 1;
      for (let x = 20; x < w; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // Energetic diagonal red sketch strokes
      ctx.strokeStyle = '#ef444450';
      ctx.lineWidth = 1.8;
      for (let y = -50; y < h + 50; y += 40) {
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(w - 30, y + 25);
        ctx.stroke();
      }

      // Red strike-through warning lines
      ctx.strokeStyle = '#b91c1c';
      ctx.lineWidth = 3;
      for (let y = 40; y < h; y += 90) {
        ctx.beginPath();
        ctx.moveTo(110, y);
        ctx.lineTo(146, y + 10);
        ctx.stroke();
      }
    },
  },

  // 4. CHARCOAL: Dark, velvety, expressive raw fine-art charcoal
  '4b_soft': {
    id: '4b_soft',
    name: 'Artist 4B Charcoal',
    artistTitle: 'The Charcoal Expressionist',
    subtitle: 'Thick Velvety Blacks, Smudged Shadows & Moody Ash Paper',
    description: 'Soft artist charcoal on heavy grain rag paper. Bold, expressive strokes with heavy smudged shadows and dramatic silhouette contrast.',
    strokeType: 'HEAVY_CHARCOAL',

    primaryColor: 0x141211,
    secondaryColor: 0x2e2b28,
    accentColor: 0x736c64,
    paperColor: 0xe8e4dc,
    fogColor: 0xdcd7ce,
    fogNear: 55,
    fogFar: 290,
    ambientColor: 0xf0ece5,
    ambientIntensity: 0.88,
    dirLightColor: 0xf5f2eb,
    dirLightIntensity: 0.95,

    roadBedColor: 0xf0ebe3,
    roadRoughness: 0.96,
    roadMetalness: 0.0,
    roadLineWidth: 3.8,
    roadLineColor: 0x141211,
    roadCreaseColor: 0x3d3935,
    roadCenterColor: 0x59534d,
    roadCurvatureJitter: 0.07,
    roadCurbLift: 0.52,
    roadInnerWidthRatio: 0.65,
    roadEdgeStyle: 'CHARCOAL_SMUDGE',
    roadCenterDashed: true,

    buildingFacadeColor: 0xede9e1,
    buildingRoofColor: 0x1f1d1b,
    foundationColor: 0x141211,
    outlineColor: 0x141211,
    outlineWidth: 2.8,
    faintLineColor: 0x6e675f,
    foliageColor: 0xd4cebf,
    trunkColor: 0x221f1d,
    streetAccentColor: 0x3d3833,

    hatchPrimaryColor: '#141211',
    hatchSecondaryColor: '#282522',
    hatchSpacing: 5,

    obstacleStyle: 'CHARCOAL_RAW',
    obstacleTheme: {
      metalColor: 0x2e2b28,
      bodyColor: 0x141211,
      accentColor: 0x736c64,
      outlineColor: 0x0a0908,
      emissiveColor: 0x000000,
      emissiveIntensity: 0.0,
      shadingRoughness: 0.95,
    },

    collectibleColor: 0x141211,
    collectibleEmissive: 0x2e2b28,
    collectibleHaloColor: 0x736c64,

    ballTrailColor: 0x141211,
    ballTrailWidth: 3.5,
    ballTrailOpacity: 0.85,
    dustColors: [0x141211, 0x2e2b28, 0x47433f],
    puffColor: 0x141211,
    boostEffectColor: 0x47433f,
    sparksColor: 0x736c64,
    shavingColor: 0x2e2b28,

    skyTheme: {
      cloudColor: 0xd4cebf,
      cloudHatchColor: 0x2e2b28,
      sunDiscColor: 0x141211,
      sunRayColor: 0x47433f,
      sunGlowColor: 0xa8a29e,
      horizonColor: 0x78716c,
      dustColor: 0x141211,
    },

    uiTheme: {
      accentHex: '#1f1d1b',
      borderHex: '#141211',
      badgeBgHex: '#e5e1d8',
      badgeTextHex: '#141211',
      glowHex: 'rgba(20, 18, 17, 0.4)',
    },

    drawRoadTexture: (ctx, w, h) => {
      ctx.fillStyle = '#f0ebe3';
      ctx.fillRect(0, 0, w, h);

      // Charcoal smudge texture
      ctx.fillStyle = '#ded7cc';
      ctx.fillRect(25, 0, 55, h);
      ctx.fillRect(176, 0, 55, h);

      // Heavy smudged grain
      ctx.fillStyle = '#221f1d12';
      for (let i = 0; i < 600; i++) {
        const rx = Math.random() * w;
        const ry = Math.random() * h;
        const s = 1.5 + Math.random() * 3.5;
        ctx.fillRect(rx, ry, s, s);
      }

      // Rough charcoal center dash
      ctx.strokeStyle = '#141211';
      ctx.lineWidth = 4.0;
      ctx.setLineDash([16, 20]);
      ctx.beginPath();
      ctx.moveTo(w * 0.5, 0);
      ctx.lineTo(w * 0.5, h);
      ctx.stroke();
      ctx.setLineDash([]);
    },
  },

  // 5. STEALTH 2B: High-contrast matte draftsman monochrome
  '2b_dark': {
    id: '2b_dark',
    name: 'Stealth 2B',
    artistTitle: 'The Matte Draftsman',
    subtitle: 'Deep Graphite Contrast, Sharp Contours & Matte Monochrome',
    description: 'Bold matte black draftsman pencil. Dense, crisp graphite lines with clean silver-grey contrast.',
    strokeType: 'STEALTH_MONOCHROME',

    primaryColor: 0x1c1917,
    secondaryColor: 0x44403c,
    accentColor: 0x78716c,
    paperColor: 0xeeeae4,
    fogColor: 0xe4ded7,
    fogNear: 65,
    fogFar: 320,
    ambientColor: 0xf5f3ef,
    ambientIntensity: 0.92,
    dirLightColor: 0xffffff,
    dirLightIntensity: 1.0,

    roadBedColor: 0xf7f5f1,
    roadRoughness: 0.9,
    roadMetalness: 0.05,
    roadLineWidth: 2.8,
    roadLineColor: 0x1c1917,
    roadCreaseColor: 0x44403c,
    roadCenterColor: 0x78716c,
    roadCurvatureJitter: 0.035,
    roadCurbLift: 0.36,
    roadInnerWidthRatio: 0.72,
    roadEdgeStyle: 'STEALTH_CONTOUR',
    roadCenterDashed: true,

    buildingFacadeColor: 0xf5f3ee,
    buildingRoofColor: 0x292524,
    foundationColor: 0x1c1917,
    outlineColor: 0x1c1917,
    outlineWidth: 2.0,
    faintLineColor: 0x78716c,
    foliageColor: 0xd6d1c9,
    trunkColor: 0x292524,
    streetAccentColor: 0x57534e,

    hatchPrimaryColor: '#1c1917',
    hatchSecondaryColor: '#44403c',
    hatchSpacing: 6,

    obstacleStyle: 'STEALTH_MONOCHROME',
    obstacleTheme: {
      metalColor: 0x44403c,
      bodyColor: 0x292524,
      accentColor: 0x78716c,
      outlineColor: 0x1c1917,
      emissiveColor: 0x000000,
      emissiveIntensity: 0.0,
      shadingRoughness: 0.65,
    },

    collectibleColor: 0x1c1917,
    collectibleEmissive: 0x44403c,
    collectibleHaloColor: 0x78716c,

    ballTrailColor: 0x1c1917,
    ballTrailWidth: 2.4,
    ballTrailOpacity: 0.75,
    dustColors: [0x1c1917, 0x44403c, 0x78716c],
    puffColor: 0x292524,
    boostEffectColor: 0x57534e,
    sparksColor: 0x78716c,
    shavingColor: 0x44403c,

    skyTheme: {
      cloudColor: 0xe7e5e4,
      cloudHatchColor: 0x44403c,
      sunDiscColor: 0x292524,
      sunRayColor: 0x78716c,
      sunGlowColor: 0xd6d3d1,
      horizonColor: 0x78716c,
      dustColor: 0x1c1917,
    },

    uiTheme: {
      accentHex: '#292524',
      borderHex: '#1c1917',
      badgeBgHex: '#e7e5e4',
      badgeTextHex: '#1c1917',
      glowHex: 'rgba(28, 25, 23, 0.35)',
    },

    drawRoadTexture: (ctx, w, h) => {
      ctx.fillStyle = '#f7f5f1';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#d6d3cd';
      ctx.lineWidth = 1;
      const step = 32;
      for (let x = 0; x <= w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([12, 14]);
      ctx.beginPath();
      ctx.moveTo(w * 0.5, 0);
      ctx.lineTo(w * 0.5, h);
      ctx.stroke();
      ctx.setLineDash([]);
    },
  },

  // 6. PRECISION 0.5MM: Razor-sharp silver technical drafting
  mechanical_05: {
    id: 'mechanical_05',
    name: 'Precision 0.5mm',
    artistTitle: 'The Precision Architect',
    subtitle: 'Ultra-Sharp 0.5mm Drafting, Metric Callouts & Pure White Vellum',
    description: 'High-grade stainless steel mechanical pencil. Ultra-fine mathematical micro-hatching and surgical line accuracy.',
    strokeType: 'PRECISION_MECHANICAL',

    primaryColor: 0x334155,
    secondaryColor: 0x64748b,
    accentColor: 0x0ea5e9,
    paperColor: 0xfafaf9,
    fogColor: 0xf1f1ee,
    fogNear: 75,
    fogFar: 350,
    ambientColor: 0xffffff,
    ambientIntensity: 1.05,
    dirLightColor: 0xf8fafc,
    dirLightIntensity: 1.1,

    roadBedColor: 0xffffff,
    roadRoughness: 0.65,
    roadMetalness: 0.15,
    roadLineWidth: 1.5,
    roadLineColor: 0x1e293b,
    roadCreaseColor: 0x475569,
    roadCenterColor: 0x64748b,
    roadCurvatureJitter: 0.008,
    roadCurbLift: 0.12,
    roadInnerWidthRatio: 0.84,
    roadEdgeStyle: 'PRECISION_METRIC',
    roadCenterDashed: true,

    buildingFacadeColor: 0xfdfdfd,
    buildingRoofColor: 0x334155,
    foundationColor: 0x1e293b,
    outlineColor: 0x1e293b,
    outlineWidth: 1.2,
    faintLineColor: 0x94a3b8,
    foliageColor: 0xe2e8f0,
    trunkColor: 0x475569,
    streetAccentColor: 0x0ea5e9,

    hatchPrimaryColor: '#334155',
    hatchSecondaryColor: '#64748b',
    hatchSpacing: 5,

    obstacleStyle: 'PRECISION_STEEL',
    obstacleTheme: {
      metalColor: 0x64748b,
      bodyColor: 0x334155,
      accentColor: 0x0ea5e9,
      outlineColor: 0x1e293b,
      emissiveColor: 0x0ea5e9,
      emissiveIntensity: 0.2,
      shadingRoughness: 0.25,
    },

    collectibleColor: 0x334155,
    collectibleEmissive: 0x0ea5e9,
    collectibleHaloColor: 0x94a3b8,

    ballTrailColor: 0x334155,
    ballTrailWidth: 1.6,
    ballTrailOpacity: 0.8,
    dustColors: [0x475569, 0x94a3b8, 0xcbd5e1],
    puffColor: 0x64748b,
    boostEffectColor: 0x0ea5e9,
    sparksColor: 0x0ea5e9,
    shavingColor: 0x94a3b8,

    skyTheme: {
      cloudColor: 0xf8fafc,
      cloudHatchColor: 0x64748b,
      sunDiscColor: 0x334155,
      sunRayColor: 0x94a3b8,
      sunGlowColor: 0x38bdf8,
      horizonColor: 0x64748b,
      dustColor: 0x475569,
    },

    uiTheme: {
      accentHex: '#0ea5e9',
      borderHex: '#334155',
      badgeBgHex: '#e0f2fe',
      badgeTextHex: '#0369a1',
      glowHex: 'rgba(14, 165, 233, 0.35)',
    },

    drawRoadTexture: (ctx, w, h) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);

      // Ultra-fine 0.5mm micro grid
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.8;
      for (let x = 0; x <= w; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += 16) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Millimeter station ticks
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.0;
      for (let y = 0; y < h; y += 8) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(6, y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(w, y);
        ctx.lineTo(w - 6, y);
        ctx.stroke();
      }

      // Razor-thin center line
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(w * 0.5, 0);
      ctx.lineTo(w * 0.5, h);
      ctx.stroke();
      ctx.setLineDash([]);
    },
  },

  // 7. ROYAL GOLD QUILL: Gilded luxury drafting & Florentine gold leaf
  golden_quill: {
    id: 'golden_quill',
    name: 'Royal Gold Quill',
    artistTitle: 'The Gilded Illuminator',
    subtitle: '24K Beaten Gold Leaf, Imperial Brass & Ornate Florentine Warmth',
    description: 'Solid brass luxury drafting instrument. Road and city details gleam with gilded gold leaf, metallic luster, and warm amber parchment.',
    strokeType: 'GILDED_GOLD',

    primaryColor: 0xd97706,
    secondaryColor: 0xb45309,
    accentColor: 0xfbbf24,
    paperColor: 0xfaf4e6,
    fogColor: 0xf5eccf,
    fogNear: 70,
    fogFar: 330,
    ambientColor: 0xfffaed,
    ambientIntensity: 1.1,
    dirLightColor: 0xfef08a,
    dirLightIntensity: 1.2,

    roadBedColor: 0xfffcf5,
    roadRoughness: 0.55,
    roadMetalness: 0.35,
    roadLineWidth: 2.6,
    roadLineColor: 0xb45309,
    roadCreaseColor: 0xd97706,
    roadCenterColor: 0xf59e0b,
    roadCurvatureJitter: 0.03,
    roadCurbLift: 0.44,
    roadInnerWidthRatio: 0.68,
    roadEdgeStyle: 'GOLD_FILIGREE',
    roadCenterDashed: true,

    buildingFacadeColor: 0xfefdf9,
    buildingRoofColor: 0x78350f,
    foundationColor: 0x451a03,
    outlineColor: 0xb45309,
    outlineWidth: 1.8,
    faintLineColor: 0xd97706,
    foliageColor: 0xfde68a,
    trunkColor: 0x78350f,
    streetAccentColor: 0xfbbf24,

    hatchPrimaryColor: '#b45309',
    hatchSecondaryColor: '#78350f',
    hatchSpacing: 7,

    obstacleStyle: 'ROYAL_BRASS',
    obstacleTheme: {
      metalColor: 0xb45309,
      bodyColor: 0x78350f,
      accentColor: 0xfbbf24,
      outlineColor: 0x451a03,
      emissiveColor: 0xfbbf24,
      emissiveIntensity: 0.35,
      shadingRoughness: 0.2,
    },

    collectibleColor: 0xf59e0b,
    collectibleEmissive: 0xfbbf24,
    collectibleHaloColor: 0xfde68a,

    ballTrailColor: 0xf59e0b,
    ballTrailWidth: 2.8,
    ballTrailOpacity: 0.85,
    dustColors: [0xf59e0b, 0xfbbf24, 0xd97706],
    puffColor: 0xb45309,
    boostEffectColor: 0xfbbf24,
    sparksColor: 0xfbbf24,
    shavingColor: 0xd97706,

    skyTheme: {
      cloudColor: 0xfef3c7,
      cloudHatchColor: 0xb45309,
      sunDiscColor: 0xf59e0b,
      sunRayColor: 0xfbbf24,
      sunGlowColor: 0xfde68a,
      horizonColor: 0xd97706,
      dustColor: 0xf59e0b,
    },

    uiTheme: {
      accentHex: '#d97706',
      borderHex: '#b45309',
      badgeBgHex: '#fef3c7',
      badgeTextHex: '#92400e',
      glowHex: 'rgba(245, 158, 11, 0.45)',
    },

    drawRoadTexture: (ctx, w, h) => {
      ctx.fillStyle = '#fffcf5';
      ctx.fillRect(0, 0, w, h);

      // Gold filigree border rules
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 1.2;
      for (let x = 0; x <= w; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // Metallic gold tire lanes
      ctx.fillStyle = '#fef3c780';
      ctx.fillRect(38, 0, 48, h);
      ctx.fillRect(170, 0, 48, h);

      // Gilded chevron marks
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2.8;
      for (let y = 30; y < h; y += 75) {
        ctx.beginPath();
        ctx.moveTo(116, y);
        ctx.lineTo(128, y + 16);
        ctx.lineTo(140, y);
        ctx.stroke();
      }
    },
  },

  // 8. NEON CYBER STYLUS: Glowing cyberpunk vector drafting on midnight slate
  neon_sketch: {
    id: 'neon_sketch',
    name: 'Neon Cyber Stylus',
    artistTitle: 'The Cybernetic Vector Draftsman',
    subtitle: 'Luminous Neon Lines, Midnight Slate & Radiant Pulse Rails',
    description: 'Futuristic vector stylus on dark obsidian slate. Generates luminous cyan and violet vector edge strokes with glowing circuit outlines.',
    strokeType: 'GLOWING_NEON',

    primaryColor: 0x06b6d4,
    secondaryColor: 0x3b82f6,
    accentColor: 0xec4899,
    paperColor: 0x0b0f19,
    fogColor: 0x090c14,
    fogNear: 50,
    fogFar: 280,
    ambientColor: 0x1e293b,
    ambientIntensity: 1.2,
    dirLightColor: 0x38bdf8,
    dirLightIntensity: 1.35,

    roadBedColor: 0x111827,
    roadRoughness: 0.5,
    roadMetalness: 0.3,
    roadLineWidth: 2.8,
    roadLineColor: 0x06b6d4,
    roadCreaseColor: 0x3b82f6,
    roadCenterColor: 0xec4899,
    roadCurvatureJitter: 0.012,
    roadCurbLift: 0.28,
    roadInnerWidthRatio: 0.78,
    roadEdgeStyle: 'NEON_GLOW_RAIL',
    roadCenterDashed: true,

    buildingFacadeColor: 0x131d2e,
    buildingRoofColor: 0x0f172a,
    foundationColor: 0x030712,
    outlineColor: 0x06b6d4,
    outlineWidth: 2.2,
    faintLineColor: 0x3b82f6,
    foliageColor: 0x1e3a5f,
    trunkColor: 0x0f172a,
    streetAccentColor: 0xec4899,

    hatchPrimaryColor: '#06b6d4',
    hatchSecondaryColor: '#ec4899',
    hatchSpacing: 10,

    obstacleStyle: 'CYBER_NEON',
    obstacleTheme: {
      metalColor: 0x1e293b,
      bodyColor: 0x0f172a,
      accentColor: 0xec4899,
      outlineColor: 0x06b6d4,
      emissiveColor: 0x06b6d4,
      emissiveIntensity: 0.9,
      shadingRoughness: 0.2,
    },

    collectibleColor: 0x06b6d4,
    collectibleEmissive: 0xec4899,
    collectibleHaloColor: 0x38bdf8,

    ballTrailColor: 0x06b6d4,
    ballTrailWidth: 3.0,
    ballTrailOpacity: 0.9,
    dustColors: [0x06b6d4, 0xec4899, 0x3b82f6],
    puffColor: 0x06b6d4,
    boostEffectColor: 0xec4899,
    sparksColor: 0xec4899,
    shavingColor: 0x06b6d4,

    skyTheme: {
      cloudColor: 0x1e293b,
      cloudHatchColor: 0x06b6d4,
      sunDiscColor: 0xec4899,
      sunRayColor: 0x06b6d4,
      sunGlowColor: 0x38bdf8,
      horizonColor: 0x3b82f6,
      dustColor: 0x06b6d4,
    },

    uiTheme: {
      accentHex: '#06b6d4',
      borderHex: '#3b82f6',
      badgeBgHex: '#0f172a',
      badgeTextHex: '#06b6d4',
      glowHex: 'rgba(6, 182, 212, 0.65)',
    },

    drawRoadTexture: (ctx, w, h) => {
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, w, h);

      // Glowing circuit lines
      ctx.strokeStyle = '#06b6d440';
      ctx.lineWidth = 1.2;
      for (let x = 0; x <= w; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Neon edge glow strips
      ctx.fillStyle = '#06b6d418';
      ctx.fillRect(0, 0, 20, h);
      ctx.fillRect(w - 20, 0, 20, h);

      // Radiant magenta center laser line
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([12, 12]);
      ctx.beginPath();
      ctx.moveTo(w * 0.5, 0);
      ctx.lineTo(w * 0.5, h);
      ctx.stroke();
      ctx.setLineDash([]);
    },
  },

  // 9. ARTIST WATERCOLOR: Dreamy soft washes & bleeding organic edges
  watercolor_brush: {
    id: 'watercolor_brush',
    name: 'Artist Watercolor',
    artistTitle: 'The Impressionist Colorist',
    subtitle: 'Cold-Press Cotton Paper, Soft Pigment Washes & Bleeding Edges',
    description: 'Artist watercolor brush on heavy cotton paper. Wet-edge pigment washes, soft color pooling, and organic undulating borders.',
    strokeType: 'PAINTERLY_WATERCOLOR',

    primaryColor: 0x4f46e5,
    secondaryColor: 0x0891b2,
    accentColor: 0xd946ef,
    paperColor: 0xfaf7f2,
    fogColor: 0xf1ecf8,
    fogNear: 60,
    fogFar: 300,
    ambientColor: 0xfcf9ff,
    ambientIntensity: 1.0,
    dirLightColor: 0xfff5f8,
    dirLightIntensity: 1.05,

    roadBedColor: 0xfdfbf7,
    roadRoughness: 0.95,
    roadMetalness: 0.0,
    roadLineWidth: 2.4,
    roadLineColor: 0x433830,
    roadCreaseColor: 0x6366f1,
    roadCenterColor: 0xd946ef,
    roadCurvatureJitter: 0.05,
    roadCurbLift: 0.32,
    roadInnerWidthRatio: 0.74,
    roadEdgeStyle: 'WATERCOLOR_BLEED',
    roadCenterDashed: false,

    buildingFacadeColor: 0xfaf5ee,
    buildingRoofColor: 0x312e81,
    foundationColor: 0x1e1b4b,
    outlineColor: 0x3730a3,
    outlineWidth: 1.8,
    faintLineColor: 0x818cf8,
    foliageColor: 0xccfbf1,
    trunkColor: 0x433830,
    streetAccentColor: 0xd946ef,

    hatchPrimaryColor: '#4f46e5',
    hatchSecondaryColor: '#0891b2',
    hatchSpacing: 8,

    obstacleStyle: 'WATERCOLOR_PIGMENT',
    obstacleTheme: {
      metalColor: 0x4f46e5,
      bodyColor: 0x818cf8,
      accentColor: 0xd946ef,
      outlineColor: 0x312e81,
      emissiveColor: 0x818cf8,
      emissiveIntensity: 0.25,
      shadingRoughness: 0.8,
    },

    collectibleColor: 0x4f46e5,
    collectibleEmissive: 0xd946ef,
    collectibleHaloColor: 0x818cf8,

    ballTrailColor: 0x6366f1,
    ballTrailWidth: 3.2,
    ballTrailOpacity: 0.7,
    dustColors: [0x6366f1, 0xec4899, 0x14b8a6],
    puffColor: 0x4f46e5,
    boostEffectColor: 0xd946ef,
    sparksColor: 0xd946ef,
    shavingColor: 0x818cf8,

    skyTheme: {
      cloudColor: 0xfdf4ff,
      cloudHatchColor: 0x818cf8,
      sunDiscColor: 0xd946ef,
      sunRayColor: 0x4f46e5,
      sunGlowColor: 0xf0abfc,
      horizonColor: 0xa5b4fc,
      dustColor: 0x818cf8,
    },

    uiTheme: {
      accentHex: '#4f46e5',
      borderHex: '#312e81',
      badgeBgHex: '#e0e7ff',
      badgeTextHex: '#3730a3',
      glowHex: 'rgba(79, 70, 229, 0.4)',
    },

    drawRoadTexture: (ctx, w, h) => {
      ctx.fillStyle = '#fdfbf7';
      ctx.fillRect(0, 0, w, h);

      // Watercolor wash pools
      ctx.fillStyle = '#e0e7ff50';
      ctx.fillRect(30, 0, 60, h);
      ctx.fillStyle = '#fce7f350';
      ctx.fillRect(166, 0, 60, h);

      // Soft bleeding pigment edges
      ctx.fillStyle = '#4f46e510';
      for (let i = 0; i < 400; i++) {
        const rx = Math.random() * w;
        const ry = Math.random() * h;
        const r = 3.0 + Math.random() * 8.0;
        ctx.beginPath();
        ctx.arc(rx, ry, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Soft purple-ink center line
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 2.0;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(w * 0.5, 0);
      ctx.lineTo(w * 0.5, h);
      ctx.stroke();
      ctx.setLineDash([]);
    },
  },
};

export function getPencilStyle(id?: string | null): PencilStyleDefinition {
  if (!id || typeof id !== 'string') {
    return PENCIL_STYLES['classic_hb'];
  }
  if (PENCIL_STYLES[id]) {
    return PENCIL_STYLES[id];
  }
  // Fallbacks
  if (id.includes('blueprint')) return PENCIL_STYLES['blueprint_stylus'];
  if (id.includes('crimson')) return PENCIL_STYLES['crimson_red'];
  if (id.includes('charcoal') || id === '4b_soft') return PENCIL_STYLES['4b_soft'];
  if (id.includes('2b')) return PENCIL_STYLES['2b_dark'];
  if (id.includes('mechanical')) return PENCIL_STYLES['mechanical_05'];
  if (id.includes('gold') || id === 'golden_quill') return PENCIL_STYLES['golden_quill'];
  if (id.includes('neon')) return PENCIL_STYLES['neon_sketch'];
  if (id.includes('water')) return PENCIL_STYLES['watercolor_brush'];

  return PENCIL_STYLES['classic_hb'];
}

export function getAllPencilStyles(): PencilStyleDefinition[] {
  return Object.values(PENCIL_STYLES);
}

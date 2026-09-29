import * as THREE from 'three';

export interface WorldDefinition {
  id: string;
  name: string;
  paperColor: number;
  fogColor: number;
  fogNear: number;
  fogFar: number;
  ambientColor: number;
  ambientIntensity: number;
  dirLightColor: number;
  dirLightIntensity: number;
  roadBedColor: number;
  roadLineColor: number;
  groundColor: number;
  buildingFacadeColor: number;
  buildingRoofColor: number;
  skylineColor: number;
  gridLineColor: number;
  particleColors: number[];
}

export const WORLD_DEFINITIONS: Record<string, WorldDefinition> = {
  paper: {
    id: 'paper',
    name: 'Parchment Studio',
    paperColor: 0xf4efe6,
    fogColor: 0xf4efe6,
    fogNear: 80,
    fogFar: 340,
    ambientColor: 0xfffbf2,
    ambientIntensity: 0.88,
    dirLightColor: 0xfff5e6,
    dirLightIntensity: 0.95,
    roadBedColor: 0xfcfaf4,
    roadLineColor: 0x1f1d1b,
    groundColor: 0xede6da,
    buildingFacadeColor: 0xfaf6ed,
    buildingRoofColor: 0x3d3731,
    skylineColor: 0x6e655b,
    gridLineColor: 0xded6c7,
    particleColors: [0x221f1d, 0x5a534c, 0x8a8074],
  },
  sketch_city: {
    id: 'sketch_city',
    name: 'Skyscraper District',
    paperColor: 0xeae6df,
    fogColor: 0xeae6df,
    fogNear: 90,
    fogFar: 360,
    ambientColor: 0xf8f9fa,
    ambientIntensity: 0.85,
    dirLightColor: 0xfffcf7,
    dirLightIntensity: 1.0,
    roadBedColor: 0xf7f5f0,
    roadLineColor: 0x181615,
    groundColor: 0xe2ded6,
    buildingFacadeColor: 0xf2eee6,
    buildingRoofColor: 0x2e2925,
    skylineColor: 0x5c544c,
    gridLineColor: 0xd8d3c9,
    particleColors: [0x181615, 0x48423c, 0x786f66],
  },
  mountain_sketch: {
    id: 'mountain_sketch',
    name: 'Alpine Peaks',
    paperColor: 0xdde3ea,
    fogColor: 0xdde3ea,
    fogNear: 70,
    fogFar: 300,
    ambientColor: 0xe8eff6,
    ambientIntensity: 0.8,
    dirLightColor: 0xffffff,
    dirLightIntensity: 0.95,
    roadBedColor: 0xf0f4f8,
    roadLineColor: 0x1e293b,
    groundColor: 0xcdd6e2,
    buildingFacadeColor: 0xe2e8f0,
    buildingRoofColor: 0x334155,
    skylineColor: 0x475569,
    gridLineColor: 0xc2cdda,
    particleColors: [0x1e293b, 0x475569, 0x94a3b8],
  },
  blueprint_grid: {
    id: 'blueprint_grid',
    name: 'Blueprint Matrix',
    paperColor: 0x092642,
    fogColor: 0x092642,
    fogNear: 85,
    fogFar: 350,
    ambientColor: 0x0e3a63,
    ambientIntensity: 0.9,
    dirLightColor: 0x38bdf8,
    dirLightIntensity: 1.1,
    roadBedColor: 0x0d3860,
    roadLineColor: 0x38bdf8,
    groundColor: 0x061c32,
    buildingFacadeColor: 0x0f406e,
    buildingRoofColor: 0x072442,
    skylineColor: 0x0284c7,
    gridLineColor: 0x155e96,
    particleColors: [0x38bdf8, 0x7dd3fc, 0xffffff],
  },
  notebook_lined: {
    id: 'notebook_lined',
    name: 'College Ruled',
    paperColor: 0xfcfbf9,
    fogColor: 0xfcfbf9,
    fogNear: 90,
    fogFar: 340,
    ambientColor: 0xffffff,
    ambientIntensity: 0.9,
    dirLightColor: 0xfffaf0,
    dirLightIntensity: 0.95,
    roadBedColor: 0xffffff,
    roadLineColor: 0x1e3a8a, // crisp ink blue
    groundColor: 0xf5f3ee,
    buildingFacadeColor: 0xfcfbf9,
    buildingRoofColor: 0xdc2626, // red margin accents
    skylineColor: 0x94a3b8,
    gridLineColor: 0xbfdbfe, // faint blue lines
    particleColors: [0x1e3a8a, 0xdc2626, 0x64748b],
  },
  the_void: {
    id: 'the_void',
    name: 'Blackboard Void',
    paperColor: 0x141414,
    fogColor: 0x141414,
    fogNear: 75,
    fogFar: 310,
    ambientColor: 0x262626,
    ambientIntensity: 0.75,
    dirLightColor: 0xffffff,
    dirLightIntensity: 1.1,
    roadBedColor: 0x1c1c1c,
    roadLineColor: 0xffffff, // chalk white
    groundColor: 0x0d0d0d,
    buildingFacadeColor: 0x222222,
    buildingRoofColor: 0x333333,
    skylineColor: 0x666666,
    gridLineColor: 0x333333,
    particleColors: [0xffffff, 0xfacc15, 0x94a3b8],
  },
};

export class WorldSystem {
  private currentWorldId = 'paper';
  private targetDef: WorldDefinition;
  private currentDef: WorldDefinition;

  constructor() {
    this.targetDef = { ...WORLD_DEFINITIONS.paper };
    this.currentDef = { ...WORLD_DEFINITIONS.paper };
  }

  public getCurrentWorld(): WorldDefinition {
    return this.currentDef;
  }

  public setWorld(worldId: string): WorldDefinition {
    const def = WORLD_DEFINITIONS[worldId] || WORLD_DEFINITIONS.paper;
    this.currentWorldId = def.id;
    this.targetDef = { ...def };
    this.currentDef = { ...def };
    return this.currentDef;
  }

  public applyToScene(
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    ambientLight: THREE.AmbientLight,
    dirLight: THREE.DirectionalLight
  ): void {
    const def = this.currentDef;

    // Background & Fog
    renderer.setClearColor(def.paperColor, 1);
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.setHex(def.fogColor);
      scene.fog.near = def.fogNear;
      scene.fog.far = def.fogFar;
    }

    // Lights
    ambientLight.color.setHex(def.ambientColor);
    ambientLight.intensity = def.ambientIntensity;

    dirLight.color.setHex(def.dirLightColor);
    dirLight.intensity = def.dirLightIntensity;
  }
}

import * as THREE from 'three';
import { CONFIG } from './config';
import { FlowPath } from './FlowPath';
import { PathSample, sketchJitter } from './utils';

// 4 vertices across the width per sample:
// 0: Left raised curb rim (+lift, -halfW)
// 1: Left road bed (0 lift, -halfW * 0.75)
// 2: Right road bed (0 lift, +halfW * 0.75)
// 3: Right raised curb rim (+lift, +halfW)
const MAX_SAMPLES = 2500;
const VERTS_PER_SAMPLE = 4;
const MAX_VERTS = MAX_SAMPLES * VERTS_PER_SAMPLE;
const QUADS_PER_SEGMENT = 3;
const MAX_INDICES = (MAX_SAMPLES - 1) * QUADS_PER_SEGMENT * 6;

export class DrawingSystem {
  public group: THREE.Group;
  private flowPath: FlowPath;

  // Path ribbon mesh (sculpted curved channel with raised curbs)
  private ribbonGeo: THREE.BufferGeometry;
  private ribbonMesh: THREE.Mesh;
  private ribbonMat: THREE.MeshStandardMaterial;
  private ribbonPositions: Float32Array;
  private ribbonNormals: Float32Array;
  private ribbonUvs: Float32Array;

  // Materials
  private lineMat: THREE.LineBasicMaterial;
  private creaseMat: THREE.LineBasicMaterial;
  private centerMat: THREE.LineBasicMaterial;

  // Outer left graphite edge stroke on curb
  private leftEdgeGeo: THREE.BufferGeometry;
  private leftEdgeLine: THREE.Line;
  private leftPositions: Float32Array;

  // Outer right graphite edge stroke on curb
  private rightEdgeGeo: THREE.BufferGeometry;
  private rightEdgeLine: THREE.Line;
  private rightPositions: Float32Array;

  // Center dashed graphite guideline
  private centerLineGeo: THREE.BufferGeometry;
  private centerLine: THREE.Line;
  private centerPositions: Float32Array;

  // Inner curb crease lines
  private leftCreaseGeo: THREE.BufferGeometry;
  private leftCreaseLine: THREE.Line;
  private leftCreasePositions: Float32Array;

  private rightCreaseGeo: THREE.BufferGeometry;
  private rightCreaseLine: THREE.Line;
  private rightCreasePositions: Float32Array;

  // Cached jitter offsets for samples so they don't strobe
  private jitterTable: Float32Array;

  // Scratch vectors for tip interpolation
  private _tipPos = new THREE.Vector3();
  private _tipNorm = new THREE.Vector3();
  private _tipRight = new THREE.Vector3();

  constructor(flowPath: FlowPath) {
    this.flowPath = flowPath;
    this.group = new THREE.Group();

    // 1. Create Precomputed Jitter Table
    this.jitterTable = new Float32Array(MAX_SAMPLES * 4);
    for (let i = 0; i < this.jitterTable.length; i++) {
      this.jitterTable[i] = sketchJitter(0.04);
    }

    // 2. Procedural Architectural Drafting Grid Road Texture
    const roadTexture = this.createRoadTexture();

    // 3. Ribbon Mesh (3 Quads per step: Left Curb, Center Road Bed, Right Curb)
    this.ribbonPositions = new Float32Array(MAX_VERTS * 3);
    this.ribbonNormals = new Float32Array(MAX_VERTS * 3);
    this.ribbonUvs = new Float32Array(MAX_VERTS * 2);
    const indices = new Uint32Array(MAX_INDICES);

    let idx = 0;
    for (let i = 0; i < MAX_SAMPLES - 1; i++) {
      const row0 = i * 4;
      const row1 = (i + 1) * 4;

      // Quad 0: row0[0..1] to row1[0..1] (Left Curb slope)
      indices[idx++] = row0 + 0;
      indices[idx++] = row1 + 0;
      indices[idx++] = row0 + 1;

      indices[idx++] = row0 + 1;
      indices[idx++] = row1 + 0;
      indices[idx++] = row1 + 1;

      // Quad 1: row0[1..2] to row1[1..2] (Center Flat Road Bed)
      indices[idx++] = row0 + 1;
      indices[idx++] = row1 + 1;
      indices[idx++] = row0 + 2;

      indices[idx++] = row0 + 2;
      indices[idx++] = row1 + 1;
      indices[idx++] = row1 + 2;

      // Quad 2: row0[2..3] to row1[2..3] (Right Curb slope)
      indices[idx++] = row0 + 2;
      indices[idx++] = row1 + 2;
      indices[idx++] = row0 + 3;

      indices[idx++] = row0 + 3;
      indices[idx++] = row1 + 2;
      indices[idx++] = row1 + 3;
    }

    this.ribbonGeo = new THREE.BufferGeometry();
    this.ribbonGeo.setAttribute('position', new THREE.BufferAttribute(this.ribbonPositions, 3));
    this.ribbonGeo.setAttribute('normal', new THREE.BufferAttribute(this.ribbonNormals, 3));
    this.ribbonGeo.setAttribute('uv', new THREE.BufferAttribute(this.ribbonUvs, 2));
    this.ribbonGeo.setIndex(new THREE.BufferAttribute(indices, 1));
    this.ribbonGeo.setDrawRange(0, 0);

    this.ribbonMat = new THREE.MeshStandardMaterial({
      color: 0xfcfaf4,
      map: roadTexture,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide,
    });
    this.ribbonMesh = new THREE.Mesh(this.ribbonGeo, this.ribbonMat);
    this.ribbonMesh.receiveShadow = true;
    this.ribbonMesh.frustumCulled = false;
    this.group.add(this.ribbonMesh);

    // 4. Graphite Edge Stroke Lines
    this.lineMat = new THREE.LineBasicMaterial({
      color: 0x1f1d1b, // deep dark graphite
      linewidth: 2.5,
    });
    this.creaseMat = new THREE.LineBasicMaterial({
      color: 0x5a524a,
      linewidth: 1,
      transparent: true,
      opacity: 0.6,
    });
    this.centerMat = new THREE.LineBasicMaterial({
      color: 0x8a8074,
      linewidth: 1.5,
      transparent: true,
      opacity: 0.8,
    });

    // Left outer curb line
    this.leftPositions = new Float32Array(MAX_SAMPLES * 3);
    this.leftEdgeGeo = new THREE.BufferGeometry();
    this.leftEdgeGeo.setAttribute('position', new THREE.BufferAttribute(this.leftPositions, 3));
    this.leftEdgeGeo.setDrawRange(0, 0);
    this.leftEdgeLine = new THREE.Line(this.leftEdgeGeo, this.lineMat);
    this.leftEdgeLine.frustumCulled = false;
    this.group.add(this.leftEdgeLine);

    // Right outer curb line
    this.rightPositions = new Float32Array(MAX_SAMPLES * 3);
    this.rightEdgeGeo = new THREE.BufferGeometry();
    this.rightEdgeGeo.setAttribute('position', new THREE.BufferAttribute(this.rightPositions, 3));
    this.rightEdgeGeo.setDrawRange(0, 0);
    this.rightEdgeLine = new THREE.Line(this.rightEdgeGeo, this.lineMat);
    this.rightEdgeLine.frustumCulled = false;
    this.group.add(this.rightEdgeLine);

    // Left inner crease
    this.leftCreasePositions = new Float32Array(MAX_SAMPLES * 3);
    this.leftCreaseGeo = new THREE.BufferGeometry();
    this.leftCreaseGeo.setAttribute('position', new THREE.BufferAttribute(this.leftCreasePositions, 3));
    this.leftCreaseGeo.setDrawRange(0, 0);
    this.leftCreaseLine = new THREE.Line(this.leftCreaseGeo, this.creaseMat);
    this.leftCreaseLine.frustumCulled = false;
    this.group.add(this.leftCreaseLine);

    // Right inner crease
    this.rightCreasePositions = new Float32Array(MAX_SAMPLES * 3);
    this.rightCreaseGeo = new THREE.BufferGeometry();
    this.rightCreaseGeo.setAttribute('position', new THREE.BufferAttribute(this.rightCreasePositions, 3));
    this.rightCreaseGeo.setDrawRange(0, 0);
    this.rightCreaseLine = new THREE.Line(this.rightCreaseGeo, this.creaseMat);
    this.rightCreaseLine.frustumCulled = false;
    this.group.add(this.rightCreaseLine);

    // Center guideline
    this.centerPositions = new Float32Array(MAX_SAMPLES * 3);
    this.centerLineGeo = new THREE.BufferGeometry();
    this.centerLineGeo.setAttribute('position', new THREE.BufferAttribute(this.centerPositions, 3));
    this.centerLineGeo.setDrawRange(0, 0);
    this.centerLine = new THREE.Line(this.centerLineGeo, this.centerMat);
    this.centerLine.frustumCulled = false;
    this.group.add(this.centerLine);
  }

  public applyDynamicStageVisuals(visuals: { roadColor: THREE.Color; lineColor: THREE.Color }): void {
    this.ribbonMat.color.copy(visuals.roadColor);
    this.lineMat.color.copy(visuals.lineColor);
    this.creaseMat.color.copy(visuals.lineColor);
    this.centerMat.color.copy(visuals.lineColor);
  }

  public setWorldTheme(worldId: string): void {
    switch (worldId) {
      case 'sketch_city':
        this.ribbonMat.color.setHex(0xf5f3ee);
        this.lineMat.color.setHex(0x252321);
        this.creaseMat.color.setHex(0x605952);
        this.centerMat.color.setHex(0x948b81);
        break;
      case 'mountain_sketch':
        this.ribbonMat.color.setHex(0xedf2f7);
        this.lineMat.color.setHex(0x1e293b);
        this.creaseMat.color.setHex(0x475569);
        this.centerMat.color.setHex(0x64748b);
        break;
      case 'blueprint_grid':
        this.ribbonMat.color.setHex(0x0369a1);
        this.lineMat.color.setHex(0xffffff);
        this.creaseMat.color.setHex(0x38bdf8);
        this.centerMat.color.setHex(0xe0f2fe);
        break;
      case 'notebook_lined':
        this.ribbonMat.color.setHex(0xffffff);
        this.lineMat.color.setHex(0xef4444); // red margin line
        this.creaseMat.color.setHex(0x93c5fd); // blue ruled line
        this.centerMat.color.setHex(0x60a5fa);
        break;
      case 'the_void':
        this.ribbonMat.color.setHex(0x18181b);
        this.lineMat.color.setHex(0xf4f4f5); // white chalk lines
        this.creaseMat.color.setHex(0xa1a1aa);
        this.centerMat.color.setHex(0x71717a);
        break;
      case 'paper':
      default:
        this.ribbonMat.color.setHex(0xfcfaf4);
        this.lineMat.color.setHex(0x1f1d1b);
        this.creaseMat.color.setHex(0x5a524a);
        this.centerMat.color.setHex(0x8a8074);
        break;
    }
  }

  private createRoadTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Warm vellum paper base
      ctx.fillStyle = '#fcfaf4';
      ctx.fillRect(0, 0, 256, 256);

      // Fine architectural drafting grid lines
      ctx.strokeStyle = '#e5decfa0';
      ctx.lineWidth = 1;
      const gridStep = 32;
      for (let x = 0; x <= 256; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 256);
        ctx.stroke();
      }
      for (let y = 0; y <= 256; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y);
        ctx.stroke();
      }

      // Rolling tire track grooves along the lanes
      ctx.fillStyle = '#f3ede1';
      ctx.fillRect(40, 0, 45, 256);
      ctx.fillRect(171, 0, 45, 256);

      // Forward speed chevrons along the center
      ctx.strokeStyle = '#c9c0b1';
      ctx.lineWidth = 2.5;
      for (let y = 30; y < 256; y += 80) {
        ctx.beginPath();
        ctx.moveTo(116, y);
        ctx.lineTo(128, y + 16);
        ctx.lineTo(140, y);
        ctx.stroke();
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 4);
    return texture;
  }

  public update(pencilDrawingDistance: number, playerDistance: number): void {
    const allSamples = this.flowPath.getAllSamples();
    if (allSamples.length < 2) {
      this.clearDrawRange();
      return;
    }

    const minRenderDist = Math.max(0, playerDistance - 45);

    // Binary search start index
    let startIdx = 0;
    let low = 0;
    let high = allSamples.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (allSamples[mid].distance < minRenderDist) {
        startIdx = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    startIdx = Math.max(0, startIdx - 1);

    let sampleCount = 0;

    for (let i = startIdx; i < allSamples.length && sampleCount < MAX_SAMPLES; i++) {
      const s = allSamples[i];

      if (s.distance > pencilDrawingDistance) {
        if (i > 0 && sampleCount < MAX_SAMPLES) {
          const prev = allSamples[i - 1];
          const denom = s.distance - prev.distance;
          const t = denom > 0.0001 ? Math.max(0, Math.min(1, (pencilDrawingDistance - prev.distance) / denom)) : 0;
          this._tipPos.copy(prev.position).lerp(s.position, t);
          this._tipNorm.copy(prev.normal).lerp(s.normal, t).normalize();
          this._tipRight.copy(prev.right).lerp(s.right, t).normalize();

          this.writeSampleToBuffers(
            sampleCount,
            this._tipPos,
            this._tipNorm,
            this._tipRight,
            THREE.MathUtils.lerp(prev.width, s.width, t),
            pencilDrawingDistance,
            sampleCount
          );
          sampleCount++;
        }
        break;
      }

      this.writeSampleToBuffers(
        sampleCount,
        s.position,
        s.normal,
        s.right,
        s.width,
        s.distance,
        i
      );
      sampleCount++;
    }

    if (sampleCount < 2) {
      this.clearDrawRange();
      return;
    }

    // Mark attributes dirty
    (this.ribbonGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.ribbonGeo.attributes.normal as THREE.BufferAttribute).needsUpdate = true;
    (this.ribbonGeo.attributes.uv as THREE.BufferAttribute).needsUpdate = true;

    this.leftEdgeGeo.attributes.position.needsUpdate = true;
    this.rightEdgeGeo.attributes.position.needsUpdate = true;
    this.leftCreaseGeo.attributes.position.needsUpdate = true;
    this.rightCreaseGeo.attributes.position.needsUpdate = true;
    this.centerLineGeo.attributes.position.needsUpdate = true;

    const triangleCount = (sampleCount - 1) * QUADS_PER_SEGMENT * 6;
    this.ribbonGeo.setDrawRange(0, triangleCount);
    this.leftEdgeGeo.setDrawRange(0, sampleCount);
    this.rightEdgeGeo.setDrawRange(0, sampleCount);
    this.leftCreaseGeo.setDrawRange(0, sampleCount);
    this.rightCreaseGeo.setDrawRange(0, sampleCount);
    this.centerLineGeo.setDrawRange(0, sampleCount);
  }

  private clearDrawRange(): void {
    this.ribbonGeo.setDrawRange(0, 0);
    this.leftEdgeGeo.setDrawRange(0, 0);
    this.rightEdgeGeo.setDrawRange(0, 0);
    this.leftCreaseGeo.setDrawRange(0, 0);
    this.rightCreaseGeo.setDrawRange(0, 0);
    this.centerLineGeo.setDrawRange(0, 0);
  }

  private writeSampleToBuffers(
    idx: number,
    pos: THREE.Vector3,
    normal: THREE.Vector3,
    right: THREE.Vector3,
    width: number,
    dist: number,
    jitterSeed: number
  ): void {
    const halfW = width * 0.5;
    const innerW = halfW * 0.72; // inner bed width

    // Small stable jitter for sketch imperfections
    const jIndex = Math.abs(jitterSeed * 4) % this.jitterTable.length;
    const jLeft = this.jitterTable[jIndex];
    const jRight = this.jitterTable[jIndex + 1];

    // Banked raised curb lift: 0.35m raised curb height
    const curbLift = 0.35;

    // 4 Vertices across width:
    // v0: Outer Left Curb Rim (+curbLift, -halfW)
    const v0x = pos.x - right.x * (halfW + jLeft) + normal.x * curbLift;
    const v0y = pos.y - right.y * (halfW + jLeft) + normal.y * curbLift;
    const v0z = pos.z - right.z * (halfW + jLeft) + normal.z * curbLift;

    // v1: Inner Left Road Bed (0 lift, -innerW)
    const v1x = pos.x - right.x * innerW + normal.x * 0.01;
    const v1y = pos.y - right.y * innerW + normal.y * 0.01;
    const v1z = pos.z - right.z * innerW + normal.z * 0.01;

    // v2: Inner Right Road Bed (0 lift, +innerW)
    const v2x = pos.x + right.x * innerW + normal.x * 0.01;
    const v2y = pos.y + right.y * innerW + normal.y * 0.01;
    const v2z = pos.z + right.z * innerW + normal.z * 0.01;

    // v3: Outer Right Curb Rim (+curbLift, +halfW)
    const v3x = pos.x + right.x * (halfW + jRight) + normal.x * curbLift;
    const v3y = pos.y + right.y * (halfW + jRight) + normal.y * curbLift;
    const v3z = pos.z + right.z * (halfW + jRight) + normal.z * curbLift;

    // Center point
    const cx = pos.x + normal.x * 0.02;
    const cy = pos.y + normal.y * 0.02;
    const cz = pos.z + normal.z * 0.02;

    const baseV = idx * 4;

    // Positions for 4 vertices
    const p = this.ribbonPositions;
    p[baseV * 3 + 0] = v0x; p[baseV * 3 + 1] = v0y; p[baseV * 3 + 2] = v0z;
    p[(baseV + 1) * 3 + 0] = v1x; p[(baseV + 1) * 3 + 1] = v1y; p[(baseV + 1) * 3 + 2] = v1z;
    p[(baseV + 2) * 3 + 0] = v2x; p[(baseV + 2) * 3 + 1] = v2y; p[(baseV + 2) * 3 + 2] = v2z;
    p[(baseV + 3) * 3 + 0] = v3x; p[(baseV + 3) * 3 + 1] = v3y; p[(baseV + 3) * 3 + 2] = v3z;

    // Normals
    const n = this.ribbonNormals;
    for (let k = 0; k < 4; k++) {
      n[(baseV + k) * 3 + 0] = normal.x;
      n[(baseV + k) * 3 + 1] = normal.y;
      n[(baseV + k) * 3 + 2] = normal.z;
    }

    // UVs
    const u = this.ribbonUvs;
    const vCoord = dist * 0.12;
    u[baseV * 2 + 0] = 0.0; u[baseV * 2 + 1] = vCoord;
    u[(baseV + 1) * 2 + 0] = 0.25; u[(baseV + 1) * 2 + 1] = vCoord;
    u[(baseV + 2) * 2 + 0] = 0.75; u[(baseV + 2) * 2 + 1] = vCoord;
    u[(baseV + 3) * 2 + 0] = 1.0; u[(baseV + 3) * 2 + 1] = vCoord;

    // Stroke lines (curb lines & center)
    const lineLift = 0.03;
    const i3 = idx * 3;

    // Left outer curb stroke
    this.leftPositions[i3 + 0] = v0x + normal.x * lineLift;
    this.leftPositions[i3 + 1] = v0y + normal.y * lineLift;
    this.leftPositions[i3 + 2] = v0z + normal.z * lineLift;

    // Right outer curb stroke
    this.rightPositions[i3 + 0] = v3x + normal.x * lineLift;
    this.rightPositions[i3 + 1] = v3y + normal.y * lineLift;
    this.rightPositions[i3 + 2] = v3z + normal.z * lineLift;

    // Left crease
    this.leftCreasePositions[i3 + 0] = v1x + normal.x * lineLift;
    this.leftCreasePositions[i3 + 1] = v1y + normal.y * lineLift;
    this.leftCreasePositions[i3 + 2] = v1z + normal.z * lineLift;

    // Right crease
    this.rightCreasePositions[i3 + 0] = v2x + normal.x * lineLift;
    this.rightCreasePositions[i3 + 1] = v2y + normal.y * lineLift;
    this.rightCreasePositions[i3 + 2] = v2z + normal.z * lineLift;

    // Center guideline
    this.centerPositions[i3 + 0] = cx + normal.x * lineLift;
    this.centerPositions[i3 + 1] = cy + normal.y * lineLift;
    this.centerPositions[i3 + 2] = cz + normal.z * lineLift;
  }
}

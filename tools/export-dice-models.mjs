/* Export the Heaven's Dice die as editable 3D source files.
 *
 * Outputs:
 * - assets/models/dice.glb          single-file glTF 2.0 binary, web-ready
 * - assets/models/dice.gltf         human-readable glTF 2.0 with external .bin
 * - assets/models/dice.bin          binary buffer used by dice.gltf
 * - assets/models/dice.obj + .mtl   universal mesh for Blender/Maya/C4D/Unity import
 *
 * The die is generated procedurally, so future visual iterations only need to
 * change CONFIG below, then re-run: npm run export:dice
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'assets/models');

const CONFIG = {
  size: 1,
  half: 0.5,
  // p-norm exponent for the rounded cube: 2 = sphere, infinity = sharp cube.
  exponent: 5.4,
  faceSegments: 28,
  pipRadius: 0.072,
  pipOffset: 0.26,
  pipLift: 0.004,
  pipSegments: 20,
};

const PIP_MAP = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

// Canonical western die: opposite faces add to 7.
// Basis is chosen so each visible face reads upright in a Y-up viewer.
const FACES = [
  { key: 'front', value: 1, n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  { key: 'back', value: 6, n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
  { key: 'right', value: 3, n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
  { key: 'left', value: 4, n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  { key: 'top', value: 2, n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
  { key: 'bottom', value: 5, n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
];

const round = (value, digits = 6) => Number(value.toFixed(digits));

function projectToRoundedCube([x, y, z]) {
  const p = CONFIG.exponent;
  const denom = Math.pow(Math.abs(x) ** p + Math.abs(y) ** p + Math.abs(z) ** p, 1 / p);
  if (!denom) return [0, 0, 0];
  const scale = CONFIG.half / denom;
  return [x * scale, y * scale, z * scale];
}

function normalAtPoint([x, y, z]) {
  const p = CONFIG.exponent;
  const vector = [
    Math.sign(x) * Math.abs(x) ** (p - 1),
    Math.sign(y) * Math.abs(y) ** (p - 1),
    Math.sign(z) * Math.abs(z) ** (p - 1),
  ];
  const length = Math.hypot(...vector) || 1;
  return vector.map((component) => component / length);
}

function buildRoundedCube() {
  const positions = [];
  const normals = [];
  const indices = [];
  const segments = CONFIG.faceSegments;

  for (const face of FACES) {
    const baseIndex = positions.length / 3;
    for (let row = 0; row <= segments; row += 1) {
      const b = -CONFIG.half + (row / segments) * CONFIG.size;
      for (let col = 0; col <= segments; col += 1) {
        const a = -CONFIG.half + (col / segments) * CONFIG.size;
        const point = [
          face.n[0] * CONFIG.half + face.u[0] * a + face.v[0] * b,
          face.n[1] * CONFIG.half + face.u[1] * a + face.v[1] * b,
          face.n[2] * CONFIG.half + face.u[2] * a + face.v[2] * b,
        ];
        const projected = projectToRoundedCube(point);
        positions.push(...projected.map((value) => round(value)));
        normals.push(...normalAtPoint(projected).map((value) => round(value)));
      }
    }

    for (let row = 0; row < segments; row += 1) {
      for (let col = 0; col < segments; col += 1) {
        const a = baseIndex + row * (segments + 1) + col;
        const b = a + 1;
        const c = a + segments + 2;
        const d = a + segments + 1;
        indices.push(a, b, c, a, c, d);
      }
    }
  }

  return { positions, normals, indices };
}

function buildPips() {
  const positions = [];
  const normals = [];
  const indices = [];
  const segments = CONFIG.pipSegments;

  for (const face of FACES) {
    for (const cell of PIP_MAP[face.value] || []) {
      const col = (cell % 3) - 1;
      const row = Math.floor(cell / 3);
      const rowOffset = 1 - row;
      const lift = CONFIG.half + CONFIG.pipLift;
      const center = [
        face.n[0] * lift + face.u[0] * col * CONFIG.pipOffset + face.v[0] * rowOffset * CONFIG.pipOffset,
        face.n[1] * lift + face.u[1] * col * CONFIG.pipOffset + face.v[1] * rowOffset * CONFIG.pipOffset,
        face.n[2] * lift + face.u[2] * col * CONFIG.pipOffset + face.v[2] * rowOffset * CONFIG.pipOffset,
      ];
      const centerIndex = positions.length / 3;
      positions.push(...center.map((value) => round(value)));
      normals.push(...face.n.map((value) => round(value)));

      for (let step = 0; step < segments; step += 1) {
        const angle = (step / segments) * Math.PI * 2;
        const cos = Math.cos(angle) * CONFIG.pipRadius;
        const sin = Math.sin(angle) * CONFIG.pipRadius;
        const point = [
          center[0] + face.u[0] * cos + face.v[0] * sin,
          center[1] + face.u[1] * cos + face.v[1] * sin,
        ];
        positions.push(...point.map((value) => round(value)));
        normals.push(...face.n.map((value) => round(value)));
      }

      for (let step = 0; step < segments; step += 1) {
        indices.push(centerIndex, centerIndex + 1 + step, centerIndex + 1 + ((step + 1) % segments));
      }
    }
  }

  return { positions, normals, indices };
}

function computeMinMax(positions) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], positions[i + axis]);
      max[axis] = Math.max(max[axis], positions[i + axis]);
    }
  }
  return { min: min.map((value) => round(value)), max: max.map((value) => round(value)) };
}

function makeMeshData({ positions, normals, indices }) {
  const bounds = computeMinMax(positions);
  return {
    positionArray: Float32Array.from(positions),
    normalArray: Float32Array.from(normals),
    indexArray: Uint32Array.from(indices),
    min: bounds.min,
    max: bounds.max,
  };
}

const bodyData = makeMeshData(buildRoundedCube());
const pipData = makeMeshData(buildPips());

const bufferChunks = [];
const bufferViews = [];
const accessors = [];
let offset = 0;

function addBufferView(typedArray, target) {
  const bytes = Buffer.from(typedArray.buffer.slice(typedArray.byteOffset, typedArray.byteOffset + typedArray.byteLength));
  const padding = (4 - (offset % 4)) % 4;
  if (padding) {
    bufferChunks.push(Buffer.alloc(padding));
    offset += padding;
  }
  const view = { buffer: 0, byteOffset: offset, byteLength: bytes.length };
  if (target) view.target = target;
  bufferChunks.push(bytes);
  offset += bytes.length;
  bufferViews.push(view);
  return bufferViews.length - 1;
}

function addAccessor(bufferView, componentType, count, type, min, max) {
  const accessor = { bufferView, componentType, count, type };
  if (min && max) {
    accessor.min = min;
    accessor.max = max;
  }
  accessors.push(accessor);
  return accessors.length - 1;
}

function addPrimitive(mesh, materialIndex) {
  const positionView = addBufferView(mesh.positionArray, 34962);
  const normalView = addBufferView(mesh.normalArray, 34962);
  const indexView = addBufferView(mesh.indexArray, 34963);
  const positionAccessor = addAccessor(positionView, 5126, mesh.positionArray.length / 3, 'VEC3', mesh.min, mesh.max);
  const normalAccessor = addAccessor(normalView, 5126, mesh.normalArray.length / 3, 'VEC3');
  const indexAccessor = addAccessor(indexView, 5125, mesh.indexArray.length, 'SCALAR');
  return {
    attributes: { POSITION: positionAccessor, NORMAL: normalAccessor },
    indices: indexAccessor,
    material: materialIndex,
    mode: 4,
  };
}

const bodyPrimitive = addPrimitive(bodyData, 0);
const pipPrimitive = addPrimitive(pipData, 1);

const gltf = {
  asset: {
    version: '2.0',
    generator: "Heaven's Dice · dice model exporter",
  },
  scene: 0,
  scenes: [{ name: 'DiceScene', nodes: [0] }],
  nodes: [{
    name: 'Dice',
    mesh: 0,
    extras: {
      unit: 'cube is 1 x 1 x 1, centered at origin',
      upAxis: '+Y',
      frontFace: 1,
      faceValues: { front: 1, back: 6, right: 3, left: 4, top: 2, bottom: 5 },
    },
  }],
  meshes: [{
    name: 'DiceMesh',
    primitives: [bodyPrimitive, pipPrimitive],
  }],
  materials: [
    {
      name: 'BoneDie',
      pbrMetallicRoughness: {
        baseColorFactor: [0.951, 0.906, 0.792, 1],
        metallicFactor: 0,
        roughnessFactor: 0.52,
      },
      doubleSided: false,
    },
    {
      name: 'PipInk',
      pbrMetallicRoughness: {
        baseColorFactor: [0.094, 0.067, 0.047, 1],
        metallicFactor: 0,
        roughnessFactor: 0.38,
      },
      doubleSided: false,
    },
  ],
  accessors,
  bufferViews,
  buffers: [{ byteLength: 0 }],
};

const bin = Buffer.concat(bufferChunks);

function writeObjFile() {
  const groups = [
    { name: 'body', material: 'BoneDie', data: bodyData },
    { name: 'pips', material: 'PipInk', data: pipData },
  ];
  const lines = ['# Heaven\'s Dice die', 'mtllib dice.mtl'];
  for (const group of groups) {
    const { positionArray } = group.data;
    for (let i = 0; i < positionArray.length; i += 3) {
      lines.push(`v ${round(positionArray[i])} ${round(positionArray[i + 1])} ${round(positionArray[i + 2])}`);
    }
  }
  for (const group of groups) {
    const { normalArray } = group.data;
    for (let i = 0; i < normalArray.length; i += 3) {
      lines.push(`vn ${round(normalArray[i])} ${round(normalArray[i + 1])} ${round(normalArray[i + 2])}`);
    }
  }
  let vertexBase = 0;
  for (const group of groups) {
    lines.push(`g ${group.name}`, `usemtl ${group.material}`);
    const { indexArray } = group.data;
    for (let i = 0; i < indexArray.length; i += 3) {
      const a = indexArray[i] + vertexBase + 1;
      const b = indexArray[i + 1] + vertexBase + 1;
      const c = indexArray[i + 2] + vertexBase + 1;
      lines.push(`f ${a}//${a} ${b}//${b} ${c}//${c}`);
    }
    vertexBase += group.data.positionArray.length / 3;
  }
  return `${lines.join('\n')}\n`;
}

function writeMtlFile() {
  return `newmtl BoneDie
Kd 0.951 0.906 0.792
Ka 0.000 0.000 0.000
Ks 0.180 0.160 0.120
Ns 42
illum 2

newmtl PipInk
Kd 0.094 0.067 0.047
Ka 0.000 0.000 0.000
Ks 0.050 0.040 0.030
Ns 24
illum 2
`;
}

function padBuffer(buffer, filler) {
  const padding = (4 - (buffer.length % 4)) % 4;
  if (!padding) return buffer;
  return Buffer.concat([buffer, Buffer.alloc(padding, filler)]);
}

function buildGlb(json, binary) {
  const jsonChunkData = padBuffer(Buffer.from(JSON.stringify(json), 'utf8'), 0x20);
  const binChunkData = padBuffer(binary, 0x00);
  const header = Buffer.alloc(12);
  header.write('glTF', 0, 'ascii');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonChunkData.length + 8 + binChunkData.length, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonChunkData.length, 0);
  jsonHeader.write('JSON', 4, 'ascii');

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binChunkData.length, 0);
  binHeader.write('BIN\0', 4, 'ascii');

  return Buffer.concat([header, jsonHeader, jsonChunkData, binHeader, binChunkData]);
}

gltf.buffers = [{ byteLength: bin.length }];

await mkdir(OUT_DIR, { recursive: true });
await writeFile(resolve(OUT_DIR, 'dice.bin'), bin);
await writeFile(resolve(OUT_DIR, 'dice.gltf'), `${JSON.stringify({ ...gltf, buffers: [{ uri: 'dice.bin', byteLength: bin.length }] }, null, 2)}\n`);
await writeFile(resolve(OUT_DIR, 'dice.glb'), buildGlb(gltf, bin));
await writeFile(resolve(OUT_DIR, 'dice.obj'), writeObjFile());
await writeFile(resolve(OUT_DIR, 'dice.mtl'), writeMtlFile());

console.log('dice models written to assets/models');

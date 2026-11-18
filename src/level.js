import * as THREE from 'three';

// Gray-box level: one big room with a few pillars, crates and a divider wall.
// Returns the meshes to raycast against, axis-aligned colliders for the player,
// and the spots where stains should be painted.

const WALL_HEIGHT = 5;
const ROOM = 32; // room is ROOM x ROOM, centered on the origin

function gridTexture(base, line, repeat) {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  g.strokeStyle = line;
  g.lineWidth = 4;
  g.strokeRect(0, 0, size, size);
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(size / 2, 0); g.lineTo(size / 2, size);
  g.moveTo(0, size / 2); g.lineTo(size, size / 2);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat.x, repeat.y);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function buildLevel(scene) {
  const solids = [];   // meshes the spray can hit
  const colliders = []; // Box3s the player collides with

  // Floor
  const floorMat = new THREE.MeshStandardMaterial({
    map: gridTexture('#6b6f75', '#5a5e63', { x: ROOM / 2, y: ROOM / 2 }),
    roughness: 0.95,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM, ROOM), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  solids.push(floor);

  // Ceiling-less room so the sky light fills it. Add boxes (walls, pillars, crates).
  const addBox = (w, h, d, x, y, z, color = '#9a9ea4') => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const repeat = { x: Math.max(1, Math.max(w, d) / 2), y: Math.max(1, h / 2) };
    const mat = new THREE.MeshStandardMaterial({
      map: gridTexture(color, '#7d8187', repeat),
      roughness: 0.9,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    solids.push(mesh);
    colliders.push(new THREE.Box3().setFromObject(mesh));
    return mesh;
  };

  const half = ROOM / 2;
  const t = 1; // wall thickness
  addBox(ROOM + 2 * t, WALL_HEIGHT, t, 0, 0, -half - t / 2); // north
  addBox(ROOM + 2 * t, WALL_HEIGHT, t, 0, 0, half + t / 2);  // south
  addBox(t, WALL_HEIGHT, ROOM, -half - t / 2, 0, 0);         // west
  addBox(t, WALL_HEIGHT, ROOM, half + t / 2, 0, 0);          // east

  // Divider wall with gaps on both ends
  addBox(14, 3.5, 0.6, 0, 0, -4, '#8d9197');

  // Pillars
  addBox(1.6, WALL_HEIGHT, 1.6, -8, 0, 6);
  addBox(1.6, WALL_HEIGHT, 1.6, 8, 0, 6);

  // Crates
  addBox(2, 2, 2, -11, 0, -11, '#a39a8a');
  addBox(1.5, 1.5, 1.5, -9.2, 0, -11.5, '#a39a8a');
  addBox(3, 1.2, 2, 10, 0, 11, '#a39a8a');

  // Stain spots: center position, outward surface normal, size [w, h].
  // Each sits a hair off its surface to avoid z-fighting.
  const e = 0.02;
  const stainSpots = [
    { pos: [-6, 2.2, -half + e], normal: [0, 0, 1], size: [3.2, 2.4] },
    { pos: [7, 1.4, -half + e], normal: [0, 0, 1], size: [2.4, 2.0] },
    { pos: [half - e, 2.0, -6], normal: [-1, 0, 0], size: [3.0, 2.6] },
    { pos: [half - e, 1.6, 8], normal: [-1, 0, 0], size: [2.2, 1.8] },
    { pos: [-half + e, 2.4, 3], normal: [1, 0, 0], size: [3.6, 2.2] },
    { pos: [4, 1.6, half - e], normal: [0, 0, -1], size: [2.8, 2.2] },
    { pos: [-3, 1.7, -4 + 0.3 + e], normal: [0, 0, 1], size: [3.0, 2.0] },  // divider, south face
    { pos: [3, 1.6, -4 - 0.3 - e], normal: [0, 0, -1], size: [2.6, 2.2] },  // divider, north face
    { pos: [-8, 2.0, 6 + 0.8 + e], normal: [0, 0, 1], size: [1.4, 2.4] },   // pillar
    { pos: [0, e, 9], normal: [0, 1, 0], size: [4, 3] },                    // floor puddle
  ];

  return { solids, colliders, stainSpots, bounds: half };
}

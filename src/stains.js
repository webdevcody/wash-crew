import * as THREE from 'three';

// A Stain is a decal-like plane with a procedurally painted dirt canvas.
// Spraying erases dirt from the canvas; a coarse grid mirrors how much dirt is
// left so progress is cheap to compute (no per-frame getImageData).

const TEX = 256;   // canvas resolution
const GRID = 32;   // dirt-tracking grid resolution
const CELL = TEX / GRID;
const CLEAN_THRESHOLD = 0.06; // stain counts as clean when < 6% dirt remains

const PALETTES = [
  ['#3b2a1a', '#4a3520', '#2b1f14', '#5a4630'], // mud
  ['#2f3a1c', '#3e4a24', '#26301a', '#55603a'], // moss / algae
  ['#1c1c1c', '#2a2826', '#141414', '#3a3530'], // soot / grime
  ['#5a3a22', '#6b4426', '#4a2e1a', '#7a5636'], // rust
];

function rand(a, b) { return a + Math.random() * (b - a); }

function paintDirt(ctx) {
  const pal = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  ctx.clearRect(0, 0, TEX, TEX);

  // Big soft blobs, kept away from the edges so the stain looks organic.
  const blobs = 14 + Math.floor(Math.random() * 8);
  for (let i = 0; i < blobs; i++) {
    const x = rand(TEX * 0.3, TEX * 0.7);
    const y = rand(TEX * 0.3, TEX * 0.7);
    const r = rand(TEX * 0.08, TEX * 0.2);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    const col = pal[Math.floor(Math.random() * pal.length)];
    grad.addColorStop(0, col + 'ee');
    grad.addColorStop(0.6, col + 'aa');
    grad.addColorStop(1, col + '00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Speckles and drips for texture.
  for (let i = 0; i < 260; i++) {
    const x = rand(TEX * 0.15, TEX * 0.85);
    const y = rand(TEX * 0.15, TEX * 0.85);
    ctx.fillStyle = pal[Math.floor(Math.random() * pal.length)] + 'cc';
    ctx.beginPath();
    ctx.arc(x, y, rand(0.8, 3.5), 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 6; i++) {
    const x = rand(TEX * 0.3, TEX * 0.7);
    const y = rand(TEX * 0.4, TEX * 0.6);
    ctx.strokeStyle = pal[0] + 'bb';
    ctx.lineWidth = rand(2, 5);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + rand(-4, 4), y + rand(30, 80));
    ctx.stroke();
  }
}

export class Stain {
  constructor({ pos, normal, size }) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = TEX;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    paintDirt(this.ctx);

    // Build the dirt grid from the painted alpha.
    const data = this.ctx.getImageData(0, 0, TEX, TEX).data;
    this.grid = new Float32Array(GRID * GRID);
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        let sum = 0;
        for (let y = 0; y < CELL; y++) {
          for (let x = 0; x < CELL; x++) {
            const px = gx * CELL + x;
            const py = gy * CELL + y;
            sum += data[(py * TEX + px) * 4 + 3] / 255;
          }
        }
        this.grid[gy * GRID + gx] = sum / (CELL * CELL);
      }
    }
    this.initialDirt = this.grid.reduce((a, b) => a + b, 0);
    this.dirt = this.initialDirt;
    this.clean = false;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({
      map: this.texture,
      transparent: true,
      roughness: 1,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), mat);
    this.mesh.position.set(...pos);
    const n = new THREE.Vector3(...normal);
    this.mesh.lookAt(this.mesh.position.clone().add(n));
    this.mesh.receiveShadow = true;
    this.mesh.userData.stain = this;
    this.normal = n;
    // Texture pixels per world unit, so the brush has a consistent world size.
    this.pxPerUnit = TEX / ((size[0] + size[1]) / 2);
  }

  /** Fraction of the original dirt that has been removed, 0..1. */
  get progress() {
    return this.clean ? 1 : 1 - this.dirt / this.initialDirt;
  }

  /**
   * Erase dirt around a UV hit point.
   * @param {THREE.Vector2} uv  hit UV (0..1)
   * @param {number} strength   0..1 alpha removed at the brush center this call
   * @param {number} radius     brush radius in world units
   * @returns {boolean} true if this call finished the stain
   */
  scrub(uv, strength, radius) {
    if (this.clean) return false;
    const radiusPx = radius * this.pxPerUnit;
    const cx = uv.x * TEX;
    const cy = (1 - uv.y) * TEX;

    // Visual erase on the canvas.
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radiusPx);
    grad.addColorStop(0, `rgba(0,0,0,${strength})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.texture.needsUpdate = true;

    // Mirror the erase in the grid: destination-out multiplies alpha by (1 - a),
    // with a falling linearly from `strength` at the center to 0 at the radius.
    const minX = Math.max(0, Math.floor((cx - radiusPx) / CELL));
    const maxX = Math.min(GRID - 1, Math.floor((cx + radiusPx) / CELL));
    const minY = Math.max(0, Math.floor((cy - radiusPx) / CELL));
    const maxY = Math.min(GRID - 1, Math.floor((cy + radiusPx) / CELL));
    for (let gy = minY; gy <= maxY; gy++) {
      for (let gx = minX; gx <= maxX; gx++) {
        const dx = (gx + 0.5) * CELL - cx;
        const dy = (gy + 0.5) * CELL - cy;
        const d = Math.sqrt(dx * dx + dy * dy) / radiusPx;
        if (d >= 1) continue;
        const i = gy * GRID + gx;
        const before = this.grid[i];
        const after = before * (1 - strength * (1 - d));
        this.grid[i] = after;
        this.dirt -= before - after;
      }
    }

    if (this.dirt / this.initialDirt < CLEAN_THRESHOLD) {
      this.finish();
      return true;
    }
    return false;
  }

  /** Wipe whatever faint residue is left and fade the decal out. */
  finish() {
    this.clean = true;
    this.dirt = 0;
    this.fading = 1;
  }

  update(dt) {
    if (this.fading > 0) {
      this.fading = Math.max(0, this.fading - dt * 2);
      this.mesh.material.opacity = this.fading;
      if (this.fading === 0) this.mesh.visible = false;
    }
  }
}

import * as THREE from 'three';

const EYE_HEIGHT = 1.7;
const RADIUS = 0.35;
const WALK_SPEED = 5;
const SPRINT_SPEED = 8.5;
const JUMP_SPEED = 7;
const GRAVITY = 22;
const STEP = 0.3; // ledges lower than this don't block you

// First-person walker: WASD on the XZ plane relative to where the camera looks,
// gravity + jump, and circle-vs-box collision against the level's Box3 colliders.
export class Player {
  constructor(camera, colliders) {
    this.camera = camera;
    this.colliders = colliders;
    this.position = new THREE.Vector3(); // feet
    this.velocityY = 0;
    this.onGround = true;
    this.keys = {};
    this._fwd = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._move = new THREE.Vector3();
  }

  onKey(code, down) {
    this.keys[code] = down;
  }

  update(dt) {
    const k = this.keys;
    const forward = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    const strafe = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);

    this.camera.getWorldDirection(this._fwd);
    this._fwd.y = 0;
    this._fwd.normalize();
    this._right.crossVectors(this._fwd, this.camera.up).normalize();

    this._move.set(0, 0, 0)
      .addScaledVector(this._fwd, forward)
      .addScaledVector(this._right, strafe);
    if (this._move.lengthSq() > 0) {
      const speed = k.ShiftLeft || k.ShiftRight ? SPRINT_SPEED : WALK_SPEED;
      this._move.normalize().multiplyScalar(speed * dt);
    }

    // Move one axis at a time so you slide along walls.
    this.position.x += this._move.x;
    this.resolveCollisions();
    this.position.z += this._move.z;
    this.resolveCollisions();

    // Vertical
    if (k.Space && this.onGround) {
      this.velocityY = JUMP_SPEED;
      this.onGround = false;
    }
    this.velocityY -= GRAVITY * dt;
    this.position.y += this.velocityY * dt;

    const ground = this.groundHeight();
    if (this.position.y <= ground) {
      this.position.y = ground;
      this.velocityY = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    this.camera.position.set(this.position.x, this.position.y + EYE_HEIGHT, this.position.z);
  }

  overlapsXZ(box, pad = 0) {
    const p = this.position;
    const cx = Math.max(box.min.x, Math.min(p.x, box.max.x));
    const cz = Math.max(box.min.z, Math.min(p.z, box.max.z));
    const dx = p.x - cx;
    const dz = p.z - cz;
    return dx * dx + dz * dz < (RADIUS + pad) * (RADIUS + pad);
  }

  /** Highest surface under the player that they're at or above. */
  groundHeight() {
    let h = 0;
    for (const box of this.colliders) {
      if (box.max.y <= this.position.y + STEP && box.max.y > h && this.overlapsXZ(box, -0.05)) {
        h = box.max.y;
      }
    }
    return h;
  }

  resolveCollisions() {
    const p = this.position;
    for (const box of this.colliders) {
      // Ignore boxes we're standing on / stepping over, or that are above our head.
      if (box.max.y <= p.y + STEP) continue;
      if (box.min.y >= p.y + EYE_HEIGHT + 0.1) continue;

      const cx = Math.max(box.min.x, Math.min(p.x, box.max.x));
      const cz = Math.max(box.min.z, Math.min(p.z, box.max.z));
      let dx = p.x - cx;
      let dz = p.z - cz;
      const distSq = dx * dx + dz * dz;
      if (distSq >= RADIUS * RADIUS) continue;

      if (distSq > 1e-8) {
        const dist = Math.sqrt(distSq);
        const push = RADIUS - dist;
        p.x += (dx / dist) * push;
        p.z += (dz / dist) * push;
      } else {
        // Center is inside the box: push out along the shallowest axis.
        const left = p.x - box.min.x, right = box.max.x - p.x;
        const back = p.z - box.min.z, front = box.max.z - p.z;
        const m = Math.min(left, right, back, front);
        if (m === left) p.x = box.min.x - RADIUS;
        else if (m === right) p.x = box.max.x + RADIUS;
        else if (m === back) p.z = box.min.z - RADIUS;
        else p.z = box.max.z + RADIUS;
      }
    }
  }
}

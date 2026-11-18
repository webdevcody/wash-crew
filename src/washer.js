import * as THREE from 'three';

const MAX_DROPS = 900;
const EMIT_RATE = 450;   // jet droplets per second
const SPLASH_RATE = 220; // splash droplets per second
const JET_SPEED = 32;

// The held pressure washer (a simple blocky model parented to the camera) and the
// water particles it throws: a fast jet toward the aim point and a splash where it lands.
export class PressureWasher {
  constructor(scene, camera) {
    this.camera = camera;
    this.model = buildModel();
    this.basePos = new THREE.Vector3(0.2, -0.2, -0.32);
    this.model.scale.setScalar(0.55);
    this.model.position.copy(this.basePos);
    camera.add(this.model);
    this.nozzle = this.model.getObjectByName('nozzle');

    // Particle pool
    this.pos = new Float32Array(MAX_DROPS * 3).fill(-1000);
    this.vel = new Float32Array(MAX_DROPS * 3);
    this.life = new Float32Array(MAX_DROPS);
    this.gravity = new Float32Array(MAX_DROPS);
    this.next = 0;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: '#cfefff',
        map: dropTexture(),
        size: 0.09,
        alphaTest: 0.05,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    this.points.frustumCulled = false;
    scene.add(this.points);

    this.emitCarry = 0;
    this.splashCarry = 0;
    this.kick = 0;
    this.t = 0;
    this._nozzlePos = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._n = new THREE.Vector3();
  }

  spawn(x, y, z, vx, vy, vz, life, gravity) {
    const i = this.next;
    this.next = (this.next + 1) % MAX_DROPS;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.life[i] = life;
    this.gravity[i] = gravity;
  }

  /** Shoot jet droplets from the nozzle toward `target`. */
  emit(target, dt) {
    this.nozzle.getWorldPosition(this._nozzlePos);
    const np = this._nozzlePos;
    const dist = target.distanceTo(np);
    this.emitCarry += EMIT_RATE * dt;
    while (this.emitCarry >= 1) {
      this.emitCarry -= 1;
      const d = this._dir.copy(target).sub(np).normalize();
      d.x += (Math.random() - 0.5) * 0.03;
      d.y += (Math.random() - 0.5) * 0.03;
      d.z += (Math.random() - 0.5) * 0.03;
      d.normalize();
      const speed = JET_SPEED * (0.9 + Math.random() * 0.2);
      // Stagger the start along the first frame of travel so the stream looks continuous.
      const off = Math.random() * speed * dt;
      this.spawn(
        np.x + d.x * off, np.y + d.y * off, np.z + d.z * off,
        d.x * speed, d.y * speed, d.z * speed,
        Math.max(0.01, (dist - off) / speed), 0,
      );
    }
  }

  /** Spray mist bouncing off the surface that the jet hits. */
  splash(point, faceNormal, object, dt) {
    const n = this._n;
    if (faceNormal) n.copy(faceNormal).transformDirection(object.matrixWorld);
    else n.set(0, 1, 0);
    this.splashCarry += SPLASH_RATE * dt;
    while (this.splashCarry >= 1) {
      this.splashCarry -= 1;
      const s = 2 + Math.random() * 3;
      this.spawn(
        point.x + n.x * 0.05, point.y + n.y * 0.05, point.z + n.z * 0.05,
        n.x * s + (Math.random() - 0.5) * 4,
        n.y * s + (Math.random() - 0.5) * 4 + 1,
        n.z * s + (Math.random() - 0.5) * 4,
        0.2 + Math.random() * 0.25, 12,
      );
    }
  }

  update(dt, firing) {
    // Particles
    for (let i = 0; i < MAX_DROPS; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.pos[i * 3 + 1] = -1000;
        continue;
      }
      this.vel[i * 3 + 1] -= this.gravity[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
    }
    this.points.geometry.attributes.position.needsUpdate = true;

    // Held-model sway and recoil buzz while spraying
    this.t += dt;
    this.kick += ((firing ? 1 : 0) - this.kick) * Math.min(1, dt * 15);
    const buzz = firing ? (Math.random() - 0.5) * 0.006 : 0;
    this.model.position.set(
      this.basePos.x + buzz,
      this.basePos.y + Math.sin(this.t * 2) * 0.004 + buzz,
      this.basePos.z + this.kick * 0.03,
    );
    this.model.rotation.x = this.kick * 0.04;
  }
}

function dropTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

function buildModel() {
  const g = new THREE.Group();
  const yellow = new THREE.MeshStandardMaterial({ color: '#f2c230', roughness: 0.5 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2a2d33', roughness: 0.6 });
  const metal = new THREE.MeshStandardMaterial({ color: '#b8bec6', metalness: 0.8, roughness: 0.3 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.28), yellow);
  g.add(body);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.07), dark);
  grip.position.set(0, -0.11, 0.07);
  grip.rotation.x = -0.25;
  g.add(grip);

  const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.02), dark);
  trigger.position.set(0, -0.08, 0.0);
  g.add(trigger);

  const wand = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.6, 10), metal);
  wand.rotation.x = Math.PI / 2;
  wand.position.set(0, 0.02, -0.44);
  g.add(wand);

  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.06, 10), dark);
  tip.rotation.x = Math.PI / 2;
  tip.position.set(0, 0.02, -0.76);
  g.add(tip);

  const nozzle = new THREE.Object3D();
  nozzle.name = 'nozzle';
  nozzle.position.set(0, 0.02, -0.8);
  g.add(nozzle);

  // Hose stub out the back
  const hose = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 8, 16, Math.PI), dark);
  hose.position.set(0, -0.04, 0.16);
  hose.rotation.y = Math.PI / 2;
  g.add(hose);

  g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  return g;
}

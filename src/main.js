import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { buildLevel } from './level.js';
import { Stain } from './stains.js';
import { Player } from './player.js';
import { PressureWasher } from './washer.js';
import { SprayAudio } from './audio.js';

// ---------- Renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#9fc4de');
scene.fog = new THREE.Fog('#9fc4de', 30, 70);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 200);
scene.add(camera); // camera is in the scene so the held washer renders

scene.add(new THREE.HemisphereLight('#dfefff', '#4a4a50', 1.4));
const sun = new THREE.DirectionalLight('#fff4e0', 2.2);
sun.position.set(12, 25, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 60 });
scene.add(sun);

// ---------- Level + stains ----------
const level = buildLevel(scene);
const stains = level.stainSpots.map((spot) => {
  const s = new Stain(spot);
  scene.add(s.mesh);
  return s;
});

// ---------- Player, washer, audio ----------
const controls = new PointerLockControls(camera, document.body);
const player = new Player(camera, level.colliders);
player.position.set(0, 0, 12);
camera.lookAt(0, 1.7, 0);

const washer = new PressureWasher(scene, camera);
const audio = new SprayAudio();

// ---------- UI ----------
const ui = {
  overlay: document.getElementById('overlay'),
  hud: document.getElementById('hud'),
  win: document.getElementById('win'),
  winTime: document.getElementById('win-time'),
  stainsLeft: document.getElementById('stains-left'),
  progressFill: document.getElementById('progress-fill'),
  timer: document.getElementById('timer'),
};

const state = {
  playing: false,
  firing: false,
  won: false,
  elapsed: 0,
};

document.getElementById('play').addEventListener('click', () => {
  audio.init();
  controls.lock();
});
document.getElementById('again').addEventListener('click', () => window.location.reload());

controls.addEventListener('lock', () => {
  state.playing = true;
  ui.overlay.classList.add('hidden');
  ui.hud.classList.remove('hidden');
});
controls.addEventListener('unlock', () => {
  state.playing = false;
  state.firing = false;
  if (!state.won) ui.overlay.classList.remove('hidden');
});

document.addEventListener('mousedown', (e) => { if (e.button === 0 && state.playing) state.firing = true; });
document.addEventListener('mouseup', (e) => { if (e.button === 0) state.firing = false; });
document.addEventListener('keydown', (e) => player.onKey(e.code, true));
document.addEventListener('keyup', (e) => player.onKey(e.code, false));

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Spraying ----------
const RANGE = 9;           // max effective distance of the jet
const RAYS_PER_FRAME = 4;  // a few jittered rays give the jet some width
const SPREAD = 0.02;       // radians of jitter
const raycaster = new THREE.Raycaster();
raycaster.far = RANGE;
const stainMeshes = stains.map((s) => s.mesh);
const hitTargets = [...level.solids, ...stainMeshes];
const aimDir = new THREE.Vector3();
const tmpDir = new THREE.Vector3();
const aimPoint = new THREE.Vector3();

function spray(dt) {
  camera.getWorldDirection(aimDir);
  let anyHit = null;

  for (let i = 0; i < RAYS_PER_FRAME; i++) {
    tmpDir.copy(aimDir);
    if (i > 0) {
      tmpDir.x += (Math.random() - 0.5) * SPREAD * 2;
      tmpDir.y += (Math.random() - 0.5) * SPREAD * 2;
      tmpDir.z += (Math.random() - 0.5) * SPREAD * 2;
      tmpDir.normalize();
    }
    raycaster.set(camera.position, tmpDir);
    const hits = raycaster.intersectObjects(hitTargets, false);
    // Skip already-cleaned (invisible) stains so the jet passes through them.
    const hit = hits.find((h) => h.object.visible);
    if (!hit) continue;
    if (i === 0) anyHit = hit;

    const stain = hit.object.userData.stain;
    if (stain && hit.uv) {
      const falloff = 1 - hit.distance / RANGE;           // weaker further away
      const strength = Math.min(0.9, 8 * dt * falloff);
      const radius = 0.22 + hit.distance * 0.04;           // jet widens with distance
      if (stain.scrub(hit.uv, strength, radius)) audio.ding();
    }
  }

  if (anyHit) {
    aimPoint.copy(anyHit.point);
    washer.splash(anyHit.point, anyHit.face ? anyHit.face.normal : null, anyHit.object, dt);
  } else {
    aimPoint.copy(camera.position).addScaledVector(aimDir, RANGE);
  }
  washer.emit(aimPoint, dt);
}

// ---------- HUD + win ----------
function updateHud() {
  const left = stains.filter((s) => !s.clean).length;
  const overall = stains.reduce((a, s) => a + s.progress, 0) / stains.length;
  ui.stainsLeft.textContent = `Stains left: ${left} / ${stains.length}`;
  ui.progressFill.style.width = `${(overall * 100).toFixed(1)}%`;
  ui.timer.textContent = `${state.elapsed.toFixed(1)}s`;

  if (left === 0 && !state.won) {
    state.won = true;
    state.firing = false;
    ui.winTime.textContent = `Time: ${state.elapsed.toFixed(1)}s`;
    ui.win.classList.remove('hidden');
    ui.hud.classList.add('hidden');
    audio.win();
    controls.unlock();
  }
}

// ---------- Main loop ----------
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);

  if (state.playing && !state.won) {
    state.elapsed += dt;
    player.update(dt);
    if (state.firing) spray(dt);
  }
  washer.update(dt, state.firing && state.playing);
  audio.setSpraying(state.firing && state.playing);
  for (const s of stains) s.update(dt);
  updateHud();

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();

// Handy for poking at the game from the console (and for automated tests).
window.__washCrew = { state, stains, player, camera, controls };

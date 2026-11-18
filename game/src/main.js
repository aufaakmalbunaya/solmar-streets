// Solmar Streets: boot and the one loop. The world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), the camera follows Jax or his car,
// and the HUD paints what is there. Screens: title, playing, paused, busted,
// wasted and story (the story is done, free roam continues).
//
// ?seed=N fixes the city layout. ?shot=start|drive|chase|mission (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import * as THREE from 'three';
import { DAY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { buildCity } from './city.js';
import { createPlayer } from './player.js';
import { createVehicles } from './vehicles.js';
import { createPedestrians } from './pedestrians.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createCombat } from './combat.js';
import { createShops } from './shops.js';
import { createHud } from './hud.js';
import { clearSave, loadSave, writeSave } from './save.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
// ?tod=H stages a time of day (0-24) for screenshots, e.g. ?shot=chase&tod=18.5
// for a dusk chase. The day/night cycle runs off it from there.
const todParam = Number.parseFloat(params.get('tod') ?? '');

// The shared game object every system reads and writes.
const G = {
  seed,
  rng: createRandom(seed),
  time: 0,
  cash: 100,
  wanted: 0,
  hasPistol: false,
  ammo: 0,
  screen: 'title',
  cameraYaw: Math.PI, // start looking south, down the road toward the café
  cameraPitch: 0.32,
  cameraDist: 10,
  cameraMode: 'orbit', // orbit | chase (C toggles while playing)
  chasePos: null, // smoothed chase-camera position, reset on toggle/load
  lastShotAt: -100,
  lastMouseAt: -100,
  hasSave: false,
  shotMode: shot !== null,
  dayOffsetSec: Number.isFinite(todParam)
    ? ((((todParam - DAY.startHour) % 24) + 24) % 24) / 24 * DAY.lengthSec
    : 0,
};
window.__game = G;

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
G.scene = scene;
G.camera = camera;
G.renderer = renderer;

G.input = createInput(canvas);
G.audio = createAudio();
G.city = buildCity(G);
G.player = createPlayer(G);
G.vehicles = createVehicles(G);
G.peds = createPedestrians(G);
G.police = createPolice(G);
G.missions = createMissions(G);
G.combat = createCombat(G);
G.shops = createShops(G);
G.hud = createHud(G);
G.saveGame = () => writeSave(G);

G.setScreen = (next) => {
  G.screen = next;
  G.hud.showScreen(next);
  // No sound in a screenshot scene: there is no user gesture yet, and the
  // browser would only log an autoplay warning for it.
  if (next === 'playing' && !G.shotMode) G.audio.ensure();
  if (next === 'busted' || next === 'wasted') G.audio.busted();
  if (document.pointerLockElement === canvas) document.exitPointerLock();
};

function applySave(save) {
  G.police.clear();
  G.combat.clearEnemies();
  if (G.player.car) {
    G.player.car.driver = null;
    G.player.car = null;
  }
  if (save) {
    G.cash = save.cash ?? 100;
    G.hasPistol = !!save.hasPistol;
    G.ammo = save.ammo ?? 0;
    G.player.reset(save.pos?.[0] ?? 10, save.pos?.[1] ?? 30, save.heading ?? 0);
    G.player.health = save.health ?? 100;
    // Save v3 stores the NOS tank; older saves leave it full.
    if (Number.isFinite(save.nos)) G.player.nos = Math.max(0, Math.min(100, save.nos));
    G.missions.reset(save.missionIndex ?? 0);
    if (save.weapons) {
      G.combat.restoreWeapons(save.weapons);
    } else {
      // A save from before weapons existed: keep its pistol ammo.
      G.combat.weapons.pistol.ammo = G.ammo;
      G.combat.syncAmmo();
    }
  } else {
    G.cash = 100;
    G.hasPistol = false;
    G.ammo = 0;
    G.combat.resetWeapons();
    G.player.reset(10, 30, 0);
    G.missions.reset(0);
  }
  // Save v3 restores the heat and the camera mode; older saves start clean.
  G.wanted = save ? Math.max(0, Math.min(5, save.wanted ?? 0)) : 0;
  G.cameraMode = save?.cameraMode === 'chase' ? 'chase' : 'orbit';
  G.chasePos = null;
  G.cameraYaw = Math.PI;
  G.cameraDist = 10;
}

function startNewGame() {
  clearSave();
  applySave(null);
  G.hasSave = false;
  G.setScreen('playing');
  G.hud.toast('Welcome back to Solmar, Jax. Mama Rosa is waiting at the café.');
}

function continueGame() {
  const save = loadSave();
  applySave(save);
  G.setScreen('playing');
  G.hud.toast('Welcome back, Jax.');
}

function tryAgain() {
  applySave(loadSave());
  G.setScreen('playing');
}

// Title and overlay buttons.
document.getElementById('btn-start').addEventListener('click', startNewGame);
document.getElementById('btn-continue').addEventListener('click', continueGame);
document.getElementById('btn-resume').addEventListener('click', () => G.setScreen('playing'));
document.getElementById('btn-restart').addEventListener('click', tryAgain);
document.getElementById('btn-wasted-restart').addEventListener('click', tryAgain);
document.getElementById('btn-story').addEventListener('click', () => G.setScreen('playing'));
document.getElementById('btn-mute').addEventListener('click', () => {
  G.audio.ensure();
  G.audio.setMuted(!G.audio.muted);
  G.hud.toast(G.audio.muted ? 'Sound off — press M to turn it back on.' : 'Sound on.');
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
window.addEventListener('beforeunload', () => { if (G.screen === 'playing') G.saveGame(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.screen === 'playing') G.saveGame();
});

// Click (not drag) while armed and on foot fires the pistol.
let mouseDownAt = null;
canvas.addEventListener('mousedown', (event) => {
  G.audio.ensure();
  mouseDownAt = { x: event.clientX, y: event.clientY, at: performance.now() };
});
window.addEventListener('mouseup', (event) => {
  if (!mouseDownAt) return;
  const moved = Math.hypot(event.clientX - mouseDownAt.x, event.clientY - mouseDownAt.y);
  const quick = performance.now() - mouseDownAt.at < 350;
  mouseDownAt = null;
  if (moved < 6 && quick && G.screen === 'playing' && G.player.onFoot) G.combat.shoot();
});

// Keys that act once per press.
function handleKeys() {
  const input = G.input;
  if (input.wasPressed('KeyP')) {
    if (G.screen === 'playing') G.setScreen('paused');
    else if (G.screen === 'paused') G.setScreen('playing');
  }
  if (input.wasPressed('KeyM')) {
    G.audio.ensure();
    G.audio.setMuted(!G.audio.muted);
    G.hud.toast(G.audio.muted ? 'Sound off.' : 'Sound on.');
  }
  if (G.screen !== 'playing') return;
  if (input.wasPressed('KeyC')) {
    G.cameraMode = G.cameraMode === 'chase' ? 'orbit' : 'chase';
    G.chasePos = null;
    G.hud.toast(G.cameraMode === 'chase'
      ? 'Chase camera — following behind the car.'
      : 'Orbit camera — drag the mouse to look around.');
    G.saveGame();
  }
  // Shop keys: only while on foot at a shop front; shops.buy refuses a
  // purchase the player cannot afford or has not unlocked.
  if (input.wasPressed('Digit4')) G.shops.buy('pistol');
  if (input.wasPressed('Digit5')) G.shops.buy('smg');
  if (input.wasPressed('Digit6')) G.shops.buy('shotgun');
  if (input.wasPressed('Digit7')) G.shops.buy('heal');
  if (input.wasPressed('Digit8')) G.shops.buy('nos');
  if (input.wasPressed('KeyH')) G.shops.useSafehouse();
  if (input.wasPressed('KeyE')) {
    if (G.player.onFoot) {
      const car = G.vehicles.nearestCar(G.player.pos, 4.5);
      if (car) {
        // Stealing in front of a witness or the police draws the heat.
        let seen = false;
        if (car.kind === 'traffic') seen = true;
        if (car.ownerNearby) {
          const witness = G.peds.nearest(G.player.pos, 15);
          if (witness) seen = true;
        }
        for (const cop of G.police.cars) {
          if (Math.hypot(cop.pos.x - G.player.pos.x, cop.pos.z - G.player.pos.z) < 30) seen = true;
        }
        if (seen) G.police.addWanted(1, 'Car stolen in plain sight');
        G.player.enterCar(car);
        G.missions.onEnterCar(car);
        G.audio.pickup();
      }
    } else {
      G.player.exitCar();
    }
  }
  if (input.wasPressed('KeyF') && G.player.onFoot) G.combat.punch();
  if (input.wasPressed('KeyR')) G.combat.reload();
  if (input.wasPressed('KeyQ')) {
    G.audio.ensure();
    const station = G.audio.nextStation();
    G.hud.toast(`Radio: ${station.name} — ${station.tag}`);
  }
  if (input.wasPressed('Digit1')) G.combat.selectWeapon('pistol');
  if (input.wasPressed('Digit2')) G.combat.selectWeapon('smg');
  if (input.wasPressed('Digit3')) G.combat.selectWeapon('shotgun');
}

// One fixed step of the whole world.
G.step = (dt) => {
  G.time += dt;
  handleKeys();
  // Edge-triggered keys fire once per physical press. A slow frame runs
  // several steps but `pressed` is only cleared once per frame, so without
  // this one E press could enter and leave a car several times in a frame
  // (and one P press could pause and instantly unpause).
  G.input.pressed.clear();
  G.player.update(dt);
  G.vehicles.update(dt);
  G.peds.update(dt);
  G.police.update(dt);
  G.missions.update(dt);
  G.combat.update(dt);
  G.city.update(dt, G.time);
  updateCamera(dt);
};

// Third-person camera: orbits Jax or his car, swings behind the car while driving.
// Chase mode (C): the camera sits behind the car and follows it, looking ahead.
function updateCamera(dt) {
  const input = G.input;
  if (input.mouseDX !== 0 || input.mouseDY !== 0) G.lastMouseAt = G.time;
  const chase = G.cameraMode === 'chase' && !!G.player.car;
  if (!chase) {
    G.cameraYaw -= input.mouseDX * 0.0032;
    G.cameraPitch += input.mouseDY * 0.0022;
    G.cameraPitch = Math.max(0.08, Math.min(0.85, G.cameraPitch));
  }
  G.cameraDist = Math.max(5, Math.min(16, G.cameraDist + input.wheel * 0.01));
  input.mouseDX = 0;
  input.mouseDY = 0;
  input.wheel = 0;

  // Chase mode runs before the title orbit: while a screenshot scene stages,
  // the screen is still 'title' but the car is already driving, and the
  // chase camera must follow it through the whole scene, not just the last
  // frame. At the real title screen Jax is never in a car, so this never
  // fires there.
  if (chase) {
    const car = G.player.car;
    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    const wantPos = new THREE.Vector3(car.pos.x - fx * 11, 4.2, car.pos.z - fz * 11);
    if (!G.chasePos) G.chasePos = camera.position.clone();
    G.chasePos.lerp(wantPos, Math.min(1, dt * 5));
    camera.position.copy(G.chasePos);
    camera.lookAt(car.pos.x + fx * 10, 1.6, car.pos.z + fz * 10);
    return;
  }

  if (G.screen === 'title') {
    const yaw = G.time * 0.045;
    camera.position.set(Math.sin(yaw) * 95, 46, Math.cos(yaw) * 95);
    camera.lookAt(0, 10, 30);
    return;
  }
  const target = G.player.car ? G.player.car.pos : G.player.pos;
  // While driving and the mouse has been still, swing behind the car.
  if (G.player.car && Math.abs(G.player.car.speed) > 3 && G.time - G.lastMouseAt > 2) {
    const want = G.player.car.heading + Math.PI;
    let diff = want - G.cameraYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    G.cameraYaw += diff * Math.min(1, dt * 1.4);
  }
  const dist = G.cameraDist;
  const cx = target.x + Math.sin(G.cameraYaw) * Math.cos(G.cameraPitch) * dist;
  const cz = target.z + Math.cos(G.cameraYaw) * Math.cos(G.cameraPitch) * dist;
  const cy = 1.6 + Math.sin(G.cameraPitch) * dist;
  camera.position.set(cx, cy, cz);
  const lookX = target.x - Math.sin(G.cameraYaw) * 3;
  const lookZ = target.z - Math.cos(G.cameraYaw) * 3;
  camera.lookAt(lookX, 1.6, lookZ);
}

// Load any save for the Continue button, then show the title.
const existingSave = loadSave();
G.hasSave = !!existingSave;
if (existingSave) {
  G.cash = existingSave.cash ?? 100;
  G.hasPistol = !!existingSave.hasPistol;
  G.ammo = existingSave.ammo ?? 0;
}
G.missions.reset(existingSave?.missionIndex ?? 0);
G.hud.showScreen('title');

let autosaveTimer = 0;
let last = performance.now();
let accumulator = 0;

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(MAX_FRAME, (now - last) / 1000);
  last = now;
  if (G.shotMode) {
    renderer.render(scene, camera);
    return;
  }
  if (G.screen === 'playing') {
    accumulator += dt;
    let steps = 0;
    while (accumulator >= STEP && steps < 5) {
      G.step(STEP);
      accumulator -= STEP;
      steps += 1;
    }
    if (steps === 5) accumulator = 0;
    autosaveTimer += dt;
    if (autosaveTimer > 30) {
      autosaveTimer = 0;
      G.saveGame();
    }
  } else if (G.screen === 'title') {
    // The city stays alive behind the title: traffic and pedestrians move.
    G.time += dt;
    G.vehicles.updateTraffic(dt);
    G.peds.update(dt);
    G.city.update(dt, G.time);
    updateCamera(dt);
  }
  G.hud.update(dt);
  renderer.render(scene, camera);
  G.input.endFrame();
}

if (shot) {
  const screen = stageShot(shot, G);
  G.setScreen(screen);
  G.hud.update(0);
  updateCamera(0.016);
  renderer.render(scene, camera);
  renderer.render(scene, camera);
  window.__shotReady = true;
} else {
  requestAnimationFrame(frame);
}

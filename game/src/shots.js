// The screenshot scenes behind ?shot=start|drive|chase|mission. Each one plays the
// real rules forward from a fresh seeded world for a fixed number of steps, with a
// simple autopilot driving the car along the road grid, so the frame is what a
// short game really looks like and the same seed always gives the same frame.
import { STEP } from './config.js';

const SAMPLE = STEP;

// Waypoints around two city blocks, all on real intersections so the car never
// has to cut through a block to make a turn.
const DRIVE_LOOP = [
  { x: -78, z: 26 },
  { x: 78, z: 26 },
  { x: 78, z: 78 },
  { x: -78, z: 78 },
];

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/** Steer the player's car toward the next waypoint; returns true when it arrives.
 *  `cap` limits the speed (the chase scene keeps it slow so the pursuit cars
 *  catch up and pull alongside). The driver brakes hard into sharp turns, or
 *  the turn radius at full speed would carry the car through a building. */
function driveToward(G, waypoint, cap) {
  const car = G.player.car;
  if (!car) return true;
  const dx = waypoint.x - car.pos.x;
  const dz = waypoint.z - car.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 10) return true;
  const desired = Math.atan2(dx, dz);
  const diff = wrapAngle(desired - car.heading);
  // Brake (never reverse) into sharp turns, and hold the speed cap in a chase.
  let forward = 1;
  let brake = false;
  if (Math.abs(diff) > 0.6) { forward = 0; brake = true; }
  else if (cap && car.speed > cap + 2) { forward = 0; brake = true; }
  else if (cap && car.speed > cap) forward = 0;
  G.input.script = {
    forward,
    strafe: 0,
    steer: clamp(diff * 1.6, -1, 1),
    sprint: false,
    brake,
  };
  return false;
}

function runSteps(G, seconds) {
  const steps = Math.round(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) G.step(SAMPLE);
}

function putPlayerInCar(G, x, z, heading) {
  const car = G.vehicles.makeCar({ x, z, heading, kind: 'parked', color: 0xc23b2e, name: 'Coupe' });
  G.player.car = car;
  car.driver = 'player';
  G.player.onFoot = false;
  G.player.group.visible = false;
  G.player.pos.copy(car.pos);
  G.cameraYaw = heading + Math.PI;
  G.cameraPitch = 0.32;
  G.cameraDist = 10;
  return car;
}

function driveScene(G, seconds, wanted) {
  putPlayerInCar(G, -78, 26, Math.PI / 2);
  if (wanted > 0) {
    G.wanted = wanted;
    G.police.lastCrimeAt = G.time;
    // One pursuit car comes head-on down the same road, so the chase is in
    // frame, not only behind the camera.
    const blocker = G.vehicles.makeCar({
      x: 40, z: 26, heading: -Math.PI / 2, kind: 'police', isPolice: true, name: 'Interceptor',
    });
    blocker.driver = 'police';
    blocker.speed = 12;
    G.police.cars.push(blocker);
  }
  const speedCap = wanted > 0 ? 16 : 0;
  let waypoint = 0;
  const steps = Math.round(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    if (driveToward(G, DRIVE_LOOP[waypoint], speedCap)) waypoint = (waypoint + 1) % DRIVE_LOOP.length;
    G.step(SAMPLE);
  }
  G.input.script = null;
  return 'playing';
}

/**
 * Set the world to the named scene and return the screen to show over it.
 * start: the title screen over the city at golden hour.
 * action: the pier finale (job 12) at golden hour with four wanted stars —
 *   helicopter, pursuit cars, roadblock, officers — the hero frame.
 * drive: Jax driving his coupe through traffic.
 * chase: four wanted stars, pursuit cars, a roadblock and the helicopter,
 *   seen through the chase camera.
 * shop: Jax on foot at Big Iron Guns, the shop hint showing.
 * mission: the docks shootout (job 11), objective live with its marker.
 */
export function stageShot(name, G) {
  G.player.reset(0, 20, Math.PI);
  G.missions.reset(0);
  if (name === 'drive') {
    runSteps(G, 1);
    return driveScene(G, 5, 0);
  }
  if (name === 'action') {
    // The hero frame (1-start.jpg): the pier finale (job 12) at golden hour,
    // with four wanted stars on top of it — helicopter, pursuit cars, a
    // roadblock and officers — so the first screenshot is a mission in
    // progress, not a menu. Jax faces the pier, back to the camera, so the
    // helicopter tracks ahead of him, over the pier, inside the frame.
    G.hasPistol = true;
    G.ammo = 12;
    G.cash = 4800;
    G.missions.reset(11);
    G.combat.weapon = 'smg';
    G.combat.syncAmmo();
    G.missions.start();
    G.player.reset(0, 158, 0);
    // Face the pier: camera looks from the player toward the marker.
    const tx = G.missions.marker.position.x;
    const tz = G.missions.marker.position.z;
    G.cameraYaw = Math.atan2(-(tx - G.player.pos.x), -(tz - G.player.pos.z));
    G.cameraPitch = 0.3;
    G.cameraDist = 9;
    // Four stars on top of the shootout: the helicopter, pursuit cars and
    // officers all close in during the staged seconds. Three seconds puts a
    // pursuit car alongside Jax with its light bar in frame; at 2.5 s the
    // cars were still out of frame and a palm crowded the minimap.
    G.police.addWanted(4, 'Voss called the whole PD — end this tonight');
    runSteps(G, 3);
    return 'playing';
  }
  if (name === 'chase') {
    runSteps(G, 1);
    // Four stars: pursuit cars, a roadblock ahead and the helicopter overhead,
    // all seen through the chase camera. Jax is mid-story here, pistol in hand.
    G.hasPistol = true;
    G.ammo = 12;
    G.cash = 1200;
    G.combat.weapons.pistol.ammo = 12;
    G.combat.syncAmmo();
    G.cameraMode = 'chase';
    G.chasePos = null;
    return driveScene(G, 6, 4);
  }
  if (name === 'shop') {
    // Jax on foot at Big Iron Guns on the west beach, the shop hint showing.
    G.hasPistol = true;
    G.ammo = 12;
    G.cash = 1200;
    G.combat.weapons.pistol.ammo = 12;
    G.combat.syncAmmo();
    G.missions.reset(8);
    G.player.reset(-52, 150, Math.PI);
    G.cameraYaw = Math.PI;
    G.cameraPitch = 0.3;
    G.cameraDist = 9;
    runSteps(G, 2);
    // The unlock toast from the mission reset is stale here; the shop itself
    // is the message of this frame.
    G.hud.toast('Big Iron Guns — stock up before the next job.');
    return 'playing';
  }
  if (name === 'mission') {
    G.hasPistol = true;
    G.ammo = 12;
    G.cash = 2800;
    G.missions.reset(10);
    // Job 11, Harbor Revenge: the docks shootout, SMG in hand. A different
    // fight from the pier finale — containers and dock workers behind the
    // Lobos, morning light instead of golden hour.
    G.combat.weapon = 'smg';
    G.combat.syncAmmo();
    G.missions.start();
    G.player.reset(-94, 128, -2.45);
    // Face the docks: camera looks from the player toward the marker.
    const tx = G.missions.marker.position.x;
    const tz = G.missions.marker.position.z;
    G.cameraYaw = Math.atan2(-(tx - G.player.pos.x), -(tz - G.player.pos.z));
    G.cameraPitch = 0.3;
    G.cameraDist = 9;
    runSteps(G, 3);
    // Same reason as the shop scene: the unlock toast is stale here.
    G.hud.toast('Harbor Revenge — five Lobos hold the docks. Clear them out.');
    return 'playing';
  }
  // start (and any unknown name): the title screen, city alive behind it.
  runSteps(G, 5);
  return 'title';
}

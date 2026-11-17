// Pedestrians: box-built walkers strolling the sidewalks, who run when a gunshot
// goes off or a car comes too close, and who fall over when a car actually hits
// them (which the police notice).
import * as THREE from 'three';
import { CITY } from './config.js';
import { buildCharacter } from './player.js';
import { pick, range } from './random.js';

const SHIRTS = [0xc23b2e, 0x2e6fb8, 0xe8c33c, 0x3f8f4f, 0x8a6fc0, 0xd8d8d8, 0xe8703a, 0x4fa8a0, 0xb8502e];

export function createPedestrians(G) {
  const rng = G.rng;
  const peds = {
    list: [],
  };

  function spawnPed(x, z) {
    const built = buildCharacter(pick(rng, SHIRTS));
    const group = built.group;
    group.scale.setScalar(0.96);
    G.scene.add(group);
    const ped = {
      group,
      parts: built,
      pos: new THREE.Vector3(x, 0, z),
      heading: range(rng, 0, Math.PI * 2),
      speed: range(rng, 1.1, 1.9),
      walkPhase: range(rng, 0, 6),
      state: 'walk', // walk | flee | down
      stateTimer: 0,
      // Sidewalk line: walk along x = road +- 9, or z = road +- 9.
      axis: rng() < 0.5 ? 'x' : 'z',
      line: pick(rng, CITY.roads) + (rng() < 0.5 ? -9 : 9),
      dir: rng() < 0.5 ? -1 : 1,
    };
    group.position.copy(ped.pos);
    peds.list.push(ped);
    return ped;
  }

  // Seed the sidewalks all over the city.
  for (let i = 0; i < 26; i += 1) {
    const road = pick(rng, CITY.roads);
    const along = range(rng, -130, 130);
    const side = rng() < 0.5 ? -9 : 9;
    if (rng() < 0.5) spawnPed(road + side, along);
    else spawnPed(along, road + side);
  }

  peds.nearest = (pos, maxDist) => {
    let best = null;
    let bestDist = maxDist;
    for (const ped of peds.list) {
      if (ped.state === 'down') continue;
      const d = Math.hypot(ped.pos.x - pos.x, ped.pos.z - pos.z);
      if (d < bestDist) { bestDist = d; best = ped; }
    }
    return best;
  };

  peds.fleeFrom = (x, z, radius) => {
    for (const ped of peds.list) {
      if (ped.state === 'down') continue;
      const d = Math.hypot(ped.pos.x - x, ped.pos.z - z);
      if (d < radius) {
        ped.state = 'flee';
        ped.stateTimer = 3;
        ped.fleeX = x;
        ped.fleeZ = z;
      }
    }
  };

  peds.update = (dt) => {
    for (const ped of peds.list) {
      if (ped.state === 'down') {
        ped.stateTimer -= dt;
        ped.group.rotation.x = Math.max(0, ped.group.rotation.x - dt * 0.6);
        if (ped.stateTimer <= 0) {
          ped.state = 'flee';
          ped.stateTimer = 4;
          ped.fleeX = G.player.pos.x;
          ped.fleeZ = G.player.pos.z;
          ped.group.rotation.x = 0;
        }
        continue;
      }
      // A speeding car nearby, or a recent gunshot: run away from it.
      const playerCar = G.player.car;
      let threat = null;
      if (playerCar && Math.abs(playerCar.speed) > 5) {
        const d = Math.hypot(ped.pos.x - playerCar.pos.x, ped.pos.z - playerCar.pos.z);
        if (d < 5) threat = { x: playerCar.pos.x, z: playerCar.pos.z };
      }
      if (G.time - G.lastShotAt < 1.5) {
        const d = Math.hypot(ped.pos.x - G.player.pos.x, ped.pos.z - G.player.pos.z);
        if (d < 32) threat = { x: G.player.pos.x, z: G.player.pos.z };
      }
      if (threat && ped.state !== 'flee') {
        ped.state = 'flee';
        ped.stateTimer = 3;
        ped.fleeX = threat.x;
        ped.fleeZ = threat.z;
      }
      if (ped.state === 'flee') {
        ped.stateTimer -= dt;
        const dx = ped.pos.x - ped.fleeX;
        const dz = ped.pos.z - ped.fleeZ;
        const len = Math.hypot(dx, dz) || 1;
        const speed = 5.2;
        ped.pos.x += (dx / len) * speed * dt;
        ped.pos.z += (dz / len) * speed * dt;
        ped.heading = Math.atan2(dx / len, dz / len);
        ped.walkPhase += dt * 9;
        if (ped.stateTimer <= 0) {
          ped.state = 'walk';
          // Pick up a new sidewalk line where the run ended.
          ped.axis = rng() < 0.5 ? 'x' : 'z';
          const road = pick(rng, CITY.roads);
          ped.line = road + (rng() < 0.5 ? -9 : 9);
          ped.dir = rng() < 0.5 ? -1 : 1;
        }
      } else {
        // Stroll the sidewalk, drifting back onto it after a fright; at the
        // edge of the city, turn around.
        const speed = ped.speed;
        if (ped.axis === 'x') {
          ped.pos.x += ped.dir * speed * dt;
          ped.pos.z += (ped.line - ped.pos.z) * Math.min(1, dt * 2);
          ped.heading = ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
          if (Math.abs(ped.pos.x) > 138) ped.dir *= -1;
        } else {
          ped.pos.z += ped.dir * speed * dt;
          ped.pos.x += (ped.line - ped.pos.x) * Math.min(1, dt * 2);
          ped.heading = ped.dir > 0 ? 0 : Math.PI;
          if (Math.abs(ped.pos.z) > 138) ped.dir *= -1;
        }
        ped.walkPhase += dt * speed * 2.2;
        // At an intersection, sometimes turn onto the crossing sidewalk.
        if (Math.abs(ped.pos.x % 52) < 1.5 && Math.abs(ped.pos.z % 52) < 1.5 && rng() < 0.002) {
          ped.axis = ped.axis === 'x' ? 'z' : 'x';
          ped.line = ped.axis === 'x' ? ped.pos.z : ped.pos.x;
        }
      }
      // Hit by the player's car: knocked down, and the police take note.
      if (playerCar && Math.abs(playerCar.speed) > 3) {
        const d = Math.hypot(ped.pos.x - playerCar.pos.x, ped.pos.z - playerCar.pos.z);
        if (d < 2.2 && ped.state !== 'down') {
          ped.state = 'down';
          ped.stateTimer = 4;
          ped.group.rotation.x = Math.PI / 2;
          G.police.addWanted(1, 'Hit a pedestrian');
          G.audio.crash();
        }
      }
      const swing = Math.sin(ped.walkPhase) * 0.5;
      ped.parts.legL.rotation.x = swing;
      ped.parts.legR.rotation.x = -swing;
      ped.parts.armL.rotation.x = -swing * 0.7;
      ped.parts.armR.rotation.x = swing * 0.7;
      ped.group.position.copy(ped.pos);
      ped.group.rotation.y = ped.heading;
    }
  };

  return peds;
}

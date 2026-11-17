// The wanted system: 0-5 stars. Crimes raise it, the Solmar PD answers with
// pursuit cars (and, from 2 stars, officers on foot), and hiding out of sight
// cools it back down. Get caught on foot and it is over; lose them in a car and
// the heat fades.
import * as THREE from 'three';
import { CAR, CITY, WANTED } from './config.js';
import { buildCharacter } from './player.js';
import { nearestRoadPoint, resolveCircle } from './city.js';
import { range } from './random.js';

export function createPolice(G) {
  const rng = G.rng;
  const police = {
    cars: [],
    officers: [],
    lastCrimeAt: -100,
    decayTimer: 0,
    arrestTimer: 0,
  };

  police.addWanted = (stars, reason) => {
    if (G.wanted >= WANTED.max) return;
    G.wanted = Math.min(WANTED.max, G.wanted + stars);
    police.lastCrimeAt = G.time;
    if (reason) G.hud.toast(`Wanted level ${G.wanted} — ${reason}`);
  };

  function spawnCar() {
    const point = nearestRoadPoint(G.player.pos.x, G.player.pos.z);
    // Spawn a block or two away, on a road, facing the player.
    const angle = range(rng, 0, Math.PI * 2);
    const x = Math.max(-130, Math.min(130, G.player.pos.x + Math.cos(angle) * 70));
    const z = Math.max(-130, Math.min(130, G.player.pos.z + Math.sin(angle) * 70));
    const snapped = nearestRoadPoint(x, z);
    const car = G.vehicles.makeCar({
      x: snapped.x, z: snapped.z, heading: 0, kind: 'police', isPolice: true, name: 'Interceptor',
    });
    car.driver = 'police';
    car.speed = 10;
    police.cars.push(car);
    return car;
  }

  function spawnOfficer() {
    const angle = range(rng, 0, Math.PI * 2);
    const x = G.player.pos.x + Math.cos(angle) * 22;
    const z = G.player.pos.z + Math.sin(angle) * 22;
    const built = buildCharacter(0x1c2a4a);
    const group = built.group;
    G.scene.add(group);
    const officer = {
      group,
      parts: built,
      pos: new THREE.Vector3(x, 0, z),
      heading: 0,
      walkPhase: 0,
      giveUpTimer: 0,
    };
    group.position.copy(officer.pos);
    police.officers.push(officer);
    return officer;
  }

  police.clear = () => {
    for (const car of police.cars) {
      G.scene.remove(car.group);
      const i = G.vehicles.cars.indexOf(car);
      if (i >= 0) G.vehicles.cars.splice(i, 1);
    }
    for (const officer of police.officers) G.scene.remove(officer.group);
    police.cars = [];
    police.officers = [];
    G.wanted = 0;
  };

  police.update = (dt) => {
    // Keep the pursuit sized to the wanted level.
    const wantCars = G.wanted === 0 ? 0 : Math.min(G.wanted, 3) + (G.wanted >= 5 ? 1 : 0);
    while (police.cars.length < wantCars) spawnCar();
    while (police.cars.length > wantCars) {
      const car = police.cars.pop();
      G.scene.remove(car.group);
      const i = G.vehicles.cars.indexOf(car);
      if (i >= 0) G.vehicles.cars.splice(i, 1);
    }
    const wantOfficers = G.player.onFoot && G.wanted >= 2 ? Math.min(G.wanted - 1, 3) : 0;
    while (police.officers.length < wantOfficers) spawnOfficer();
    while (police.officers.length > wantOfficers) {
      const officer = police.officers.pop();
      G.scene.remove(officer.group);
    }

    // Pursuit cars: steer toward the player and ram.
    const target = G.player.car ? G.player.car.pos : G.player.pos;
    for (const car of police.cars) {
      const dx = target.x - car.pos.x;
      const dz = target.z - car.pos.z;
      const dist = Math.hypot(dx, dz);
      const desired = Math.atan2(dx, dz);
      let diff = desired - car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const topSpeed = 24 + G.wanted * 1.6;
      car.speed += (Math.min(topSpeed, 8 + dist * 0.35) - car.speed) * Math.min(1, dt * 1.2);
      car.heading += Math.max(-1, Math.min(1, diff * 2.2)) * dt * 2.4 * Math.min(1, car.speed / 10);
      car.pos.x += Math.sin(car.heading) * car.speed * dt;
      car.pos.z += Math.cos(car.heading) * car.speed * dt;
      car.group.position.copy(car.pos);
      car.group.rotation.y = car.heading;
      // Ram the player's car: shove it and bleed its speed.
      const playerCar = G.player.car;
      if (playerCar && dist < 4.6) {
        const push = 9 * dt;
        playerCar.pos.x += (playerCar.pos.x - car.pos.x) / (dist || 1) * push;
        playerCar.pos.z += (playerCar.pos.z - car.pos.z) / (dist || 1) * push;
        playerCar.speed *= 1 - 0.5 * dt;
        if (Math.abs(car.speed) > 8 && rng() < dt * 2) G.audio.crash();
      }
      // Flash the light bar, red then blue.
      if (car.lightBar) {
        const phase = Math.floor(G.time * 4) % 2 === 0;
        car.lightBar.children[0].material.emissive.setHex(phase ? 0xff0000 : 0x220000);
        car.lightBar.children[1].material.emissive.setHex(phase ? 0x000022 : 0x0000ff);
      }
    }

    // Officers on foot: run the player down, then hold him for the arrest.
    let nearestOfficer = Infinity;
    for (const officer of police.officers) {
      const dx = G.player.pos.x - officer.pos.x;
      const dz = G.player.pos.z - officer.pos.z;
      const dist = Math.hypot(dx, dz);
      nearestOfficer = Math.min(nearestOfficer, dist);
      if (G.player.onFoot) {
        officer.giveUpTimer = 0;
        const speed = 6.4;
        officer.pos.x += (dx / (dist || 1)) * speed * dt;
        officer.pos.z += (dz / (dist || 1)) * speed * dt;
        officer.heading = Math.atan2(dx, dz);
        officer.walkPhase += dt * 8;
        // Officers run around buildings, never through them.
        resolveCircle(officer.pos, 0.6, G.city.colliders);
      } else {
        officer.giveUpTimer += dt;
        if (officer.giveUpTimer > 6) {
          G.scene.remove(officer.group);
          police.officers.splice(police.officers.indexOf(officer), 1);
          continue;
        }
      }
      const swing = Math.sin(officer.walkPhase) * 0.6;
      officer.parts.legL.rotation.x = swing;
      officer.parts.legR.rotation.x = -swing;
      officer.group.position.copy(officer.pos);
      officer.group.rotation.y = officer.heading;
    }
    if (nearestOfficer < 1.7 && G.player.onFoot && G.wanted > 0) {
      police.arrestTimer += dt;
      G.hud.toast('The police are grabbing you…');
      if (police.arrestTimer > 1.5) {
        police.arrestTimer = 0;
        G.audio.busted();
        G.setScreen('busted');
      }
    } else {
      police.arrestTimer = 0;
    }

    // Heat: no crime for a while and no police close by, and it cools down.
    let nearestPolice = Infinity;
    for (const car of police.cars) {
      nearestPolice = Math.min(nearestPolice, Math.hypot(car.pos.x - target.x, car.pos.z - target.z));
    }
    for (const officer of police.officers) {
      nearestPolice = Math.min(nearestPolice, Math.hypot(officer.pos.x - target.x, officer.pos.z - target.z));
    }
    if (G.wanted > 0 && G.time - police.lastCrimeAt > WANTED.decayDelay && nearestPolice > WANTED.hideDistance) {
      police.decayTimer += dt;
      if (police.decayTimer > WANTED.decayEvery) {
        police.decayTimer = 0;
        G.wanted -= 1;
        G.hud.toast(G.wanted === 0 ? 'You lost them. The heat is off.' : `Wanted level ${G.wanted}`);
      }
    } else {
      police.decayTimer = 0;
    }

    // Siren while any pursuit car is near.
    G.audio.siren(nearestPolice < 70 && G.wanted > 0);
  };

  return police;
}

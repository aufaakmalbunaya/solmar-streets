// The wanted system: 0-5 stars. Crimes raise it, and the Solmar PD answers
// in escalating tiers: pursuit cars from 1 star, officers on foot from 2,
// roadblocks across the road ahead from 3, and a police helicopter with a
// searchlight from 4. At 5 stars the pursuit is at its biggest and the
// roadblocks double. Get caught on foot and it is over; lose them in a car
// and the heat fades — but while the helicopter is up, the police can spot
// Jax from much further away, so hiding takes longer.
import * as THREE from 'three';
import { CAR, CITY, HELI, ROADBLOCK, WANTED } from './config.js';
import { buildCharacter } from './player.js';
import { nearestRoadPoint, resolveCircle } from './city.js';
import { range } from './random.js';

export function createPolice(G) {
  const rng = G.rng;
  const police = {
    cars: [],
    officers: [],
    roadblocks: [],
    heli: null,
    lastCrimeAt: -100,
    decayTimer: 0,
    arrestTimer: 0,
    blockTimer: 0,
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

  // A roadblock: two police cars parked across the road ahead of Jax, lights
  // flashing, so the chase has something to crash through or swerve around.
  // The cars are real cars (they collide), but they never pursue.
  function placeRoadblock(block) {
    const target = G.player.car ? G.player.car.pos : G.player.pos;
    const heading = G.player.car ? G.player.car.heading : G.player.heading;
    const aheadX = target.x + Math.sin(heading) * ROADBLOCK.aheadDist;
    const aheadZ = target.z + Math.cos(heading) * ROADBLOCK.aheadDist;
    const point = nearestRoadPoint(
      Math.max(-130, Math.min(130, aheadX)),
      Math.max(-130, Math.min(130, aheadZ)),
    );
    // Cars face along the road and sit side by side across it.
    const alongX = point.axis === 'x' ? 1 : 0;
    const alongZ = point.axis === 'x' ? 0 : 1;
    const faceHeading = point.axis === 'x' ? Math.PI / 2 : 0;
    const spots = [
      { x: point.x - alongZ * 3.1, z: point.z - alongX * 3.1 },
      { x: point.x + alongZ * 3.1, z: point.z + alongX * 3.1 },
    ];
    block.cars.forEach((car, i) => {
      car.pos.set(spots[i].x, 0, spots[i].z);
      car.heading = faceHeading + (i === 0 ? 0 : Math.PI);
      car.speed = 0;
      car.group.position.copy(car.pos);
      car.group.rotation.y = car.heading;
    });
    block.pos.set(point.x, 0, point.z);
  }

  function spawnRoadblock() {
    const cars = [];
    for (let i = 0; i < 2; i += 1) {
      const car = G.vehicles.makeCar({
        x: 0, z: 0, heading: 0, kind: 'police', isPolice: true, name: 'Roadblock',
      });
      car.driver = 'police';
      cars.push(car);
    }
    const block = { cars, pos: new THREE.Vector3(0, 0, 0) };
    placeRoadblock(block);
    police.roadblocks.push(block);
    G.hud.toast('Roadblock ahead — the PD sealed the road!');
    return block;
  }

  function removeRoadblock(block) {
    for (const car of block.cars) {
      G.scene.remove(car.group);
      const i = G.vehicles.cars.indexOf(car);
      if (i >= 0) G.vehicles.cars.splice(i, 1);
    }
    police.roadblocks.splice(police.roadblocks.indexOf(block), 1);
  }

  // The police helicopter: a box-built heli that circles above Jax with a
  // searchlight cone on the ground. It never lands and never shoots; its
  // job is to keep eyes on him so the heat cools much slower.
  function spawnHeli() {
    const group = new THREE.Group();
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x2e4a72 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 4.2), darkMat);
    body.position.y = 0;
    group.add(body);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.9, 1.2),
      new THREE.MeshLambertMaterial({ color: 0x9fd8e8, emissive: 0x224455 }));
    glass.position.set(0, 0.2, 1.6);
    group.add(glass);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 3.4), darkMat);
    tail.position.set(0, 0.3, -3.4);
    group.add(tail);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.4, 0.9), darkMat);
    fin.position.set(0, 0.9, -4.8);
    group.add(fin);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x222222 }));
    rotor.position.y = 1.0;
    group.add(rotor);
    const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 0.3),
      new THREE.MeshLambertMaterial({ color: 0x222222 }));
    tailRotor.position.set(0.35, 0.9, -4.8);
    group.add(tailRotor);
    // Searchlight: a pale cone from the belly to the ground.
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(4.5, HELI.height, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfff2b0, transparent: true, opacity: 0.13,
        side: THREE.DoubleSide, depthWrite: false,
      }),
    );
    beam.position.y = -HELI.height / 2;
    group.add(beam);
    const spot = new THREE.Mesh(new THREE.CircleGeometry(4.5, 20),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, depthWrite: false }));
    spot.rotation.x = -Math.PI / 2;
    spot.position.y = -HELI.height + 0.3;
    group.add(spot);
    G.scene.add(group);
    police.heli = { group, rotor, tailRotor, beam, spot, angle: 1.2, bobPhase: 0 };
    G.hud.toast('Police helicopter overhead — stay out of the spotlight!');
    return police.heli;
  }

  function removeHeli() {
    if (!police.heli) return;
    G.scene.remove(police.heli.group);
    police.heli = null;
  }

  police.clear = () => {
    for (const car of police.cars) {
      G.scene.remove(car.group);
      const i = G.vehicles.cars.indexOf(car);
      if (i >= 0) G.vehicles.cars.splice(i, 1);
    }
    for (const officer of police.officers) G.scene.remove(officer.group);
    for (const block of [...police.roadblocks]) removeRoadblock(block);
    removeHeli();
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
    // Roadblocks from 3 stars, two of them at 5.
    const wantBlocks = G.wanted >= ROADBLOCK.minWanted ? (G.wanted >= 5 ? 2 : 1) : 0;
    while (police.roadblocks.length < wantBlocks) spawnRoadblock();
    while (police.roadblocks.length > wantBlocks) removeRoadblock(police.roadblocks[police.roadblocks.length - 1]);
    // A block Jax drove past (or far from) moves ahead again.
    police.blockTimer += dt;
    if (police.blockTimer > ROADBLOCK.repositionEverySec) {
      police.blockTimer = 0;
      const target = G.player.car ? G.player.car.pos : G.player.pos;
      for (const block of police.roadblocks) {
        const d = Math.hypot(block.pos.x - target.x, block.pos.z - target.z);
        if (d < 22 || d > 110) placeRoadblock(block);
      }
    }
    // Helicopter from 4 stars.
    if (G.wanted >= HELI.minWanted) {
      if (!police.heli) spawnHeli();
    } else {
      removeHeli();
    }
    if (police.heli) {
      const heli = police.heli;
      const target = G.player.car ? G.player.car.pos : G.player.pos;
      // Track from ahead of Jax, low over the road, with a slow side-to-side
      // sweep — high overhead it would never be seen in the chase.
      const heading = G.player.car ? G.player.car.heading : G.player.heading;
      heli.angle += dt * 0.5;
      heli.bobPhase += dt * 1.4;
      const ahead = HELI.aheadDist;
      const sweep = Math.sin(heli.angle) * 9;
      const fx = Math.sin(heading);
      const fz = Math.cos(heading);
      heli.group.position.set(
        target.x + fx * ahead - fz * sweep,
        HELI.height + Math.sin(heli.bobPhase) * 1.2,
        target.z + fz * ahead + fx * sweep,
      );
      heli.group.rotation.y = Math.atan2(
        target.x - heli.group.position.x, target.z - heli.group.position.z,
      );
      heli.rotor.rotation.y += dt * 28;
      heli.tailRotor.rotation.z += dt * 34;
      // The spotlight stays on the ground under the heli, not on Jax.
      heli.spot.position.set(0, -heli.group.position.y + 0.3, 0);
      heli.beam.material.opacity = G.city.clock.label === 'Night' ? 0.2 : 0.1;
      heli.spot.material.opacity = G.city.clock.label === 'Night' ? 0.24 : 0.12;
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
    // Roadblock cars sit still, but their light bars flash too.
    for (const block of police.roadblocks) {
      for (const car of block.cars) {
        if (!car.lightBar) continue;
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
    // The helicopter watches from the sky, so hiding takes a longer distance.
    let nearestPolice = Infinity;
    for (const car of police.cars) {
      nearestPolice = Math.min(nearestPolice, Math.hypot(car.pos.x - target.x, car.pos.z - target.z));
    }
    for (const officer of police.officers) {
      nearestPolice = Math.min(nearestPolice, Math.hypot(officer.pos.x - target.x, officer.pos.z - target.z));
    }
    const hideDistance = police.heli ? HELI.hideDistance : WANTED.hideDistance;
    if (G.wanted > 0 && G.time - police.lastCrimeAt > WANTED.decayDelay && nearestPolice > hideDistance) {
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

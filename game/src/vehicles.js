// Cars: a box-built car factory, arcade driving physics for the player, and the
// traffic AI that loops the road grid. Police cars are built here too, but their
// steering lives in police.js.
import * as THREE from 'three';
import { CAR, CITY, NOS } from './config.js';
import { resolveCircle } from './city.js';
import { pick, range } from './random.js';

const CAR_COLORS = [0xc23b2e, 0x2e6fb8, 0xe8c33c, 0x3f8f4f, 0x8a6fc0, 0xd8d8d8, 0x2a2d33, 0xe8703a, 0x4fa8a0];
const TRAFFIC_NAMES = ['Coupe', 'Sedan', 'Hatch', 'Pickup', 'Van'];

function buildCarMesh(color, isPolice) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: isPolice ? 0xf2f2f2 : color });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x1c222c });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.72, 4.4), bodyMat);
  body.position.y = 0.62;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.1), darkMat);
  cabin.position.set(0, 1.22, -0.25);
  group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x16181c });
  for (const [x, z] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.38, z);
    group.add(wheel);
  }
  const headMat = new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0x555533 });
  for (const x of [-0.65, 0.65]) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), headMat);
    light.position.set(x, 0.7, 2.21);
    group.add(light);
  }
  const tailMat = new THREE.MeshLambertMaterial({ color: 0xc22a2a, emissive: 0x440000 });
  for (const x of [-0.65, 0.65]) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), tailMat);
    light.position.set(x, 0.7, -2.21);
    group.add(light);
  }
  let lightBar = null;
  if (isPolice) {
    lightBar = new THREE.Group();
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xff2a2a, emissive: 0xaa0000 }));
    red.position.x = -0.35;
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x2a6bff, emissive: 0x0000aa }));
    blue.position.x = 0.35;
    lightBar.add(red, blue);
    lightBar.position.set(0, 1.62, -0.25);
    group.add(lightBar);
    // Black doors, the classic look.
    const doorMat = new THREE.MeshLambertMaterial({ color: 0x1c222c });
    for (const x of [-1.01, 1.01]) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 1.6), doorMat);
      door.position.set(x, 0.66, 0.1);
      group.add(door);
    }
  }
  return { group, lightBar };
}

export function createVehicles(G) {
  const rng = G.rng;
  const vehicles = {
    cars: [],
    traffic: [],
  };

  function makeCar(opts) {
    const color = opts.color ?? pick(rng, CAR_COLORS);
    const built = buildCarMesh(color, opts.isPolice ?? false);
    const car = {
      group: built.group,
      lightBar: built.lightBar,
      pos: new THREE.Vector3(opts.x, 0, opts.z),
      heading: opts.heading ?? 0,
      speed: 0,
      steer: 0,
      color,
      kind: opts.kind ?? 'parked',
      name: opts.name ?? pick(rng, TRAFFIC_NAMES),
      driver: opts.driver ?? null,
      ownerNearby: opts.ownerNearby ?? false,
      // Traffic AI state.
      axis: opts.axis ?? 'z',
      dir: opts.dir ?? 1,
      lane: opts.lane ?? 1,
      cruise: range(rng, 8, 13),
      targetSpeed: 0,
      lastTurnKey: '',
      stoppedTimer: 0,
    };
    built.group.position.copy(car.pos);
    built.group.rotation.y = car.heading;
    G.scene.add(built.group);
    vehicles.cars.push(car);
    return car;
  }

  // Parked cars on the city's parking spots.
  const spots = [...G.city.parkingSpots];
  for (let i = spots.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [spots[i], spots[j]] = [spots[j], spots[i]];
  }
  for (let i = 0; i < 14 && i < spots.length; i += 1) {
    const spot = spots[i];
    makeCar({ x: spot.x, z: spot.z, heading: spot.heading, kind: 'parked', ownerNearby: i % 3 === 0 });
  }

  // The mission coupe: a bright yellow car waiting to be stolen (mission 2).
  vehicles.missionCar = makeCar({
    x: 52, z: 66, heading: Math.PI / 2, kind: 'mission', color: 0xe8c33c, name: 'Coupe',
  });

  // Traffic: cars already rolling on the roads.
  for (let i = 0; i < 11; i += 1) {
    const road = pick(rng, CITY.roads);
    const axis = rng() < 0.5 ? 'x' : 'z';
    const along = range(rng, -130, 130);
    const lane = rng() < 0.5 ? -1 : 1;
    const car = makeCar({
      x: axis === 'x' ? along : road + lane * 3.2,
      z: axis === 'x' ? road + lane * 3.2 : along,
      heading: axis === 'x' ? (lane > 0 ? Math.PI / 2 : -Math.PI / 2) : (lane > 0 ? 0 : Math.PI),
      kind: 'traffic',
      driver: 'traffic',
      axis,
      dir: 1,
      lane,
    });
    // Heading follows axis + lane so the car faces its direction of travel.
    car.heading = axis === 'x' ? (lane > 0 ? Math.PI / 2 : -Math.PI / 2) : (lane > 0 ? 0 : Math.PI);
    car.targetSpeed = car.cruise;
    vehicles.traffic.push(car);
  }

  vehicles.makeCar = makeCar;

  vehicles.nearestCar = (pos, maxDist) => {
    let best = null;
    let bestDist = maxDist;
    for (const car of vehicles.cars) {
      if (car.driver === 'player') continue;
      const d = Math.hypot(car.pos.x - pos.x, car.pos.z - pos.z);
      if (d < bestDist) { bestDist = d; best = car; }
    }
    return best;
  };

  function forwardOf(car) {
    return { x: Math.sin(car.heading), z: Math.cos(car.heading) };
  }

  function carAhead(car, maxDist) {
    const f = forwardOf(car);
    let nearest = Infinity;
    for (const other of vehicles.cars) {
      if (other === car) continue;
      const dx = other.pos.x - car.pos.x;
      const dz = other.pos.z - car.pos.z;
      const along = dx * f.x + dz * f.z;
      if (along < 0 || along > maxDist) continue;
      const side = Math.abs(dx * f.z - dz * f.x);
      if (side < 3.4 && along < nearest) nearest = along;
    }
    return nearest;
  }

  // Player driving physics: arcade accel, steering that bites with speed, drag.
  // Hold Shift while driving for the NOS boost: much harder accel and a higher
  // top speed while the tank lasts, with a flame at the exhaust.
  vehicles.updatePlayerCar = (dt) => {
    const car = G.player.car;
    if (!car) return;
    const move = G.input.move();
    const handbrake = G.input.isDown('Space') || !!move.brake;
    const boosting = !!move.sprint && G.player.nos > 0;
    if (boosting) {
      G.player.nos = Math.max(0, G.player.nos - NOS.drainPerSec * dt);
    } else {
      G.player.nos = Math.min(NOS.max, G.player.nos + NOS.refillPerSec * dt);
    }
    const topSpeed = boosting ? NOS.maxSpeed : CAR.maxSpeed;
    if (move.forward > 0) car.speed += CAR.accel * (boosting ? NOS.accelMult : 1) * dt;
    else if (move.forward < 0) {
      car.speed += car.speed > 0.5 ? -CAR.brake * dt : -CAR.reverseAccel * dt;
    }
    if (handbrake) car.speed -= Math.sign(car.speed) * CAR.brake * 0.8 * dt;
    car.speed -= car.speed * CAR.drag * 0.35 * dt;
    car.speed = Math.max(-CAR.maxReverse, Math.min(topSpeed, car.speed));
    if (!car.nosFlame) {
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 1.1, 8),
        new THREE.MeshBasicMaterial({ color: 0x66aaff, transparent: true, opacity: 0.9 }),
      );
      flame.rotation.x = -Math.PI / 2;
      flame.position.set(0, 0.55, -2.6);
      flame.visible = false;
      car.group.add(flame);
      car.nosFlame = flame;
    }
    car.nosFlame.visible = boosting && Math.abs(car.speed) > 4;
    if (car.nosFlame.visible) {
      const flicker = 0.8 + Math.random() * 0.4;
      car.nosFlame.scale.set(flicker, flicker, 0.8 + Math.random() * 0.6);
    }
    if (Math.abs(car.speed) < 0.05 && move.forward === 0) car.speed = 0;
    const steerTarget = CAR.steerMax * move.steer;
    car.steer += (steerTarget - car.steer) * Math.min(1, CAR.steerSpeed * dt * 2);
    const speedFactor = Math.max(-1, Math.min(1, car.speed / 12));
    car.heading += car.steer * speedFactor * dt * 1.9;
    const f = forwardOf(car);
    car.pos.x += f.x * car.speed * dt;
    car.pos.z += f.z * car.speed * dt;
    car.group.position.copy(car.pos);
    car.group.rotation.y = car.heading;
    G.audio.engine(Math.abs(car.speed) / CAR.maxSpeed, true);
  };

  vehicles.updateTraffic = (dt) => {
    for (const car of vehicles.traffic) {
      if (car.driver !== 'traffic') continue;
      // Stop for whatever is ahead, then roll again.
      const ahead = carAhead(car, 11);
      car.targetSpeed = ahead < 11 ? 0 : car.cruise;
      car.speed += (car.targetSpeed - car.speed) * Math.min(1, dt * 1.6);
      const f = forwardOf(car);
      car.pos.x += f.x * car.speed * dt;
      car.pos.z += f.z * car.speed * dt;
      // At an intersection, sometimes turn onto the crossing road.
      const along = car.axis === 'x' ? car.pos.x : car.pos.z;
      const cross = car.axis === 'x' ? car.pos.z : car.pos.x;
      let nearestCross = null;
      let nearestDist = Infinity;
      for (const c of CITY.roads) {
        const d = Math.abs(cross - c);
        if (d < nearestDist) { nearestDist = d; nearestCross = c; }
      }
      const turnKey = `${Math.round(along / 52)}:${nearestCross}`;
      if (nearestDist < 2.2 && car.lastTurnKey !== turnKey && Math.abs(car.speed) > 1) {
        car.lastTurnKey = turnKey;
        const atEdge = Math.abs(along) > 128;
        if (atEdge || rng() < 0.3) {
          const newLane = rng() < 0.5 ? -1 : 1;
          const newAxis = car.axis === 'x' ? 'z' : 'x';
          if (newAxis === 'x') {
            car.pos.z = nearestCross + newLane * 3.2;
            car.heading = newLane > 0 ? Math.PI / 2 : -Math.PI / 2;
          } else {
            car.pos.x = nearestCross + newLane * 3.2;
            car.heading = newLane > 0 ? 0 : Math.PI;
          }
          car.axis = newAxis;
          car.lane = newLane;
        }
      }
      // Turn around at the edge of the grid instead of driving into the sea.
      if (car.axis === 'x' && Math.abs(car.pos.x) > 136) {
        car.pos.x = Math.sign(car.pos.x) * 136;
        car.heading += Math.PI;
        car.lane *= -1;
        car.pos.z = nearestCross + car.lane * 3.2;
      }
      if (car.axis === 'z' && Math.abs(car.pos.z) > 136) {
        car.pos.z = Math.sign(car.pos.z) * 136;
        car.heading += Math.PI;
        car.lane *= -1;
        car.pos.x = nearestCross + car.lane * 3.2;
      }
      car.group.position.copy(car.pos);
      car.group.rotation.y = car.heading;
    }
  };

  // Simple circle push-apart between cars, plus a crash sound on hard hits.
  vehicles.resolveCarCollisions = () => {
    const cars = vehicles.cars;
    for (let i = 0; i < cars.length; i += 1) {
      for (let j = i + 1; j < cars.length; j += 1) {
        const a = cars[i];
        const b = cars[j];
        const dx = b.pos.x - a.pos.x;
        const dz = b.pos.z - a.pos.z;
        const dist = Math.hypot(dx, dz);
        const min = 4.1;
        if (dist >= min || dist < 0.001) continue;
        const push = (min - dist) / 2 / dist;
        const px = dx * push;
        const pz = dz * push;
        const relSpeed = Math.abs(a.speed - b.speed);
        a.pos.x -= px;
        a.pos.z -= pz;
        b.pos.x += px;
        b.pos.z += pz;
        if (relSpeed > 6) {
          G.audio.crash();
          if (a === G.player.car || b === G.player.car) G.hud.flashDamage();
          a.speed *= 0.6;
          b.speed *= 0.6;
        }
        a.group.position.copy(a.pos);
        b.group.position.copy(b.pos);
      }
    }
  };

  vehicles.update = (dt) => {
    vehicles.updatePlayerCar(dt);
    vehicles.updateTraffic(dt);
    // The player's car can be steered into buildings; push it back out and
    // bleed speed on the hit. Traffic stays on the roads by construction, but
    // a shove from another car can push one into a wall, so push those out too.
    const playerCar = G.player.car;
    if (playerCar && resolveCircle(playerCar.pos, CAR.radius, G.city.colliders)) {
      playerCar.speed *= 0.55;
      G.audio.crash();
      playerCar.group.position.copy(playerCar.pos);
    }
    for (const car of vehicles.traffic) {
      if (car.driver === 'traffic' && resolveCircle(car.pos, CAR.radius, G.city.colliders)) {
        car.group.position.copy(car.pos);
      }
    }
    vehicles.resolveCarCollisions();
  };

  return vehicles;
}

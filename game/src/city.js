// Solmar: a sun-soaked coastal city built procedurally from a seed. One big ground
// plane carries a painted canvas texture (roads, sidewalks, crosswalks, beach and
// ocean), and the buildings, palms, streetlights, pier and docks are simple meshes
// on top. The module also owns the building colliders the cars and the player use.
import * as THREE from 'three';
import { CITY, DAY, PALETTE } from './config.js';
import { int, pick, range } from './random.js';

const WORLD_MIN = -190;
const WORLD_SIZE = 380;

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return [canvas, canvas.getContext('2d')];
}

// World metres -> canvas pixels (canvas top is north, -z).
function px(x) { return ((x - WORLD_MIN) / WORLD_SIZE) * 1024; }
function py(z) { return ((z - WORLD_MIN) / WORLD_SIZE) * 1024; }
function pw(m) { return (m / WORLD_SIZE) * 1024; }

function paintGround(ctx) {
  // Base: dry grass.
  ctx.fillStyle = '#7fae62';
  ctx.fillRect(0, 0, 1024, 1024);
  // City blocks: pale sidewalks.
  for (const bx of CITY.blocks) {
    for (const bz of CITY.blocks) {
      ctx.fillStyle = '#b8b2a4';
      ctx.fillRect(px(bx - 26), py(bz - 26), pw(52), pw(52));
      // Inner lot: a little greener or a little greyer, per block.
      ctx.fillStyle = (bx + bz) % 104 === 0 ? '#8fae6a' : '#a9a294';
      ctx.fillRect(px(bx - 20), py(bz - 20), pw(40), pw(40));
    }
  }
  // Roads: dark asphalt bands, both directions.
  ctx.fillStyle = '#3a3d42';
  for (const c of CITY.roads) {
    ctx.fillRect(px(c - 6), py(WORLD_MIN), pw(12), 1024);
    ctx.fillRect(px(WORLD_MIN), py(c - 6), 1024, pw(12));
  }
  // Centre dashes, yellow; edge lines, white.
  ctx.fillStyle = '#e8c33c';
  for (const c of CITY.roads) {
    for (let z = WORLD_MIN + 4; z < 190; z += 8) {
      ctx.fillRect(px(c - 0.25), py(z), pw(0.5), pw(3.5));
    }
    for (let x = WORLD_MIN + 4; x < 190; x += 8) {
      ctx.fillRect(px(x), py(c - 0.25), pw(3.5), pw(0.5));
    }
  }
  // Crosswalks at every intersection.
  ctx.fillStyle = '#e8e6df';
  for (const cx of CITY.roads) {
    for (const cz of CITY.roads) {
      for (let i = -2; i <= 2; i += 1) {
        ctx.fillRect(px(cx + i * 2 - 0.7), py(cz - 6), pw(1.4), pw(2.4));
        ctx.fillRect(px(cx + i * 2 - 0.7), py(cz + 3.6), pw(1.4), pw(2.4));
        ctx.fillRect(px(cx - 6), py(cz + i * 2 - 0.7), pw(2.4), pw(1.4));
        ctx.fillRect(px(cx + 3.6), py(cz + i * 2 - 0.7), pw(2.4), pw(1.4));
      }
    }
  }
  // Beach: warm sand, then the ocean to the south edge.
  ctx.fillStyle = '#e8d5a4';
  ctx.fillRect(0, py(CITY.beachZ), 1024, py(CITY.sandZ) - py(CITY.beachZ));
  ctx.fillStyle = '#dcc78e';
  ctx.fillRect(0, py(CITY.sandZ - 6), 1024, pw(6));
  ctx.fillStyle = '#2e7fb8';
  ctx.fillRect(0, py(CITY.sandZ), 1024, 1024 - py(CITY.sandZ));
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let x = WORLD_MIN; x < 190; x += 14) {
    ctx.fillRect(px(x), py(CITY.sandZ + 1), pw(8), pw(0.8));
  }
}

// A building face: coloured wall with a grid of windows, some of them lit.
function makeFacade(rng, base, lit) {
  const [canvas, ctx] = makeCanvas(128, 256);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 256);
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(0, 0, 128, 10);
  const cols = 4;
  const rows = 8;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const x = 10 + c * 28;
      const y = 18 + r * 28;
      ctx.fillStyle = rng() < lit ? '#ffd98a' : '#2c3a4a';
      ctx.fillRect(x, y, 18, 16);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makePalm() {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6a45 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f8f4f });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 5.4, 6), trunkMat);
  trunk.position.y = 2.7;
  trunk.rotation.z = 0.08;
  group.add(trunk);
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.9, 0), leafMat);
  crown.position.set(0.4, 5.8, 0);
  crown.scale.set(1, 0.55, 1);
  group.add(crown);
  return group;
}

export function buildCity(G) {
  const rng = G.rng;
  const scene = G.scene;
  const city = {
    colliders: [],
    parkingSpots: [],
    clouds: [],
    waves: [],
    landmarks: {
      cafe: { x: 10, z: 78 },
      garage: { x: 104, z: -26 },
      docks: { x: -104, z: 130 },
      marina: { x: 52, z: 130 },
      pier: { x: 0, z: 210 },
      plaza: { x: 0, z: 0 },
    },
  };

  // Sky, light and fog.
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.fog, 220, 620);
  const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x8a7a5a, 0.95);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(PALETTE.sun, 1.6);
  sun.position.set(140, 190, 80);
  scene.add(sun);
  const sunBall = new THREE.Mesh(
    new THREE.SphereGeometry(9, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff6c9, fog: false }),
  );
  sunBall.position.set(300, 210, 180);
  scene.add(sunBall);
  // The moon: a pale ball that takes the sun's place after dark.
  const moonBall = new THREE.Mesh(
    new THREE.SphereGeometry(7, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xdfe8f2, fog: false }),
  );
  moonBall.position.set(-300, 210, -180);
  moonBall.visible = false;
  scene.add(moonBall);
  // Keep the lights and lamps the day/night cycle drives.
  city.hemi = hemi;
  city.sun = sun;
  city.sunBall = sunBall;
  city.moonBall = moonBall;
  // The clock the HUD reads: hour, minute and a day/dusk/night label.
  city.clock = { hour: DAY.startHour, minute: 0, label: 'Day' };

  // Ground.
  const [groundCanvas, groundCtx] = makeCanvas(1024, 1024);
  paintGround(groundCtx);
  const groundTex = new THREE.CanvasTexture(groundCanvas);
  groundTex.colorSpace = THREE.SRGBColorSpace;
  groundTex.anisotropy = 4;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE),
    new THREE.MeshLambertMaterial({ map: groundTex }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 0);
  scene.add(ground);

  // Ocean beyond the ground plane, a touch lower so the seam never z-fights.
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(1400, 420),
    new THREE.MeshLambertMaterial({ color: PALETTE.ocean }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, -0.12, CITY.sandZ + 210);
  scene.add(ocean);

  // Facade textures, shared by every building.
  const facades = [
    makeFacade(rng, '#e8dcc8', 0.35),
    makeFacade(rng, '#c8b49a', 0.3),
    makeFacade(rng, '#9fb4c4', 0.45),
    makeFacade(rng, '#d8a08a', 0.3),
  ];
  const roofMat = new THREE.MeshLambertMaterial({ color: PALETTE.buildingRoof });

  function addBuilding(x, z, w, d, h, facade) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const side = new THREE.MeshLambertMaterial({ map: facade });
    const mesh = new THREE.Mesh(geo, [side, side, roofMat, roofMat, side, side]);
    mesh.position.set(x, h / 2, z);
    scene.add(mesh);
    city.colliders.push({ x0: x - w / 2, z0: z - d / 2, x1: x + w / 2, z1: z + d / 2 });
    return mesh;
  }

  // The blocks: parks, parking lots, or one to three buildings each.
  for (const bx of CITY.blocks) {
    for (const bz of CITY.blocks) {
      if (bx === 0 && bz === 0) continue; // the plaza, built below
      if (bx === 0 && bz === 78) continue; // Rosa's cafe block
      if (bx === 104 && bz === -26) continue; // the garage block
      if (bx === -104 && bz === 130) continue; // the docks block
      if (bx === 52 && bz === 130) continue; // the marina block
      const roll = rng();
      const distCentre = Math.hypot(bx, bz);
      if (roll < 0.16) {
        // Park: a few palms and a bench-coloured slab.
        const palms = int(rng, 3, 6);
        for (let i = 0; i < palms; i += 1) {
          const palm = makePalm();
          palm.position.set(bx + range(rng, -18, 18), 0, bz + range(rng, -18, 18));
          scene.add(palm);
        }
        continue;
      }
      if (roll < 0.3) {
        // Parking lot: dark inner slab and marked car spots.
        const lot = new THREE.Mesh(
          new THREE.BoxGeometry(36, 0.1, 36),
          new THREE.MeshLambertMaterial({ color: 0x4a4d52 }),
        );
        lot.position.set(bx, 0.05, bz);
        scene.add(lot);
        for (let i = 0; i < 4; i += 1) {
          city.parkingSpots.push({
            x: bx - 12 + i * 8,
            z: bz - 10,
            heading: 0,
          });
        }
        continue;
      }
      const count = int(rng, 1, 3);
      const quadrants = [[-11, -11], [11, -11], [-11, 11], [11, 11]];
      for (let i = 0; i < count; i += 1) {
        const [qx, qz] = quadrants.splice(Math.floor(rng() * quadrants.length), 1)[0];
        const w = range(rng, 12, 17);
        const d = range(rng, 12, 17);
        const h = distCentre < 60 ? range(rng, 14, 42) : range(rng, 8, 22);
        addBuilding(bx + qx, bz + qz, w, d, h, pick(rng, facades));
      }
    }
  }

  // Central plaza: City Hall tower and a fountain.
  addBuilding(0, -8, 22, 18, 46, facades[2]);
  const fountain = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 5.5, 0.9, 16),
    new THREE.MeshLambertMaterial({ color: 0x9fb4c4 }),
  );
  fountain.position.set(0, 0.45, 10);
  scene.add(fountain);
  const fountainWater = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 4.2, 0.3, 16),
    new THREE.MeshLambertMaterial({ color: 0x4fa8d8 }),
  );
  fountainWater.position.set(0, 0.95, 10);
  scene.add(fountainWater);
  city.colliders.push({ x0: -5.5, z0: 4.5, x1: 5.5, z1: 15.5 });

  // Rosa's cafe: low orange-awning building on the south-west of its block.
  addBuilding(10, 78, 16, 12, 9, facades[0]);
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(17, 0.5, 4),
    new THREE.MeshLambertMaterial({ color: 0xe8703a }),
  );
  awning.position.set(10, 4.4, 78 - 8);
  scene.add(awning);

  // The garage: a wide low hall on the east side, open dark front.
  const garage = new THREE.Mesh(
    new THREE.BoxGeometry(30, 8, 20),
    new THREE.MeshLambertMaterial({ color: 0x6a7078 }),
  );
  garage.position.set(104, 4, -26);
  scene.add(garage);
  const garageDoor = new THREE.Mesh(
    new THREE.BoxGeometry(24, 6, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x22242a }),
  );
  garageDoor.position.set(104, 3, -26 - 10.1);
  scene.add(garageDoor);
  city.colliders.push({ x0: 89, z0: -36, x1: 119, z1: -16 });

  // The docks: stacked shipping containers near the south-west beach.
  const containerColors = [0xb8502e, 0x2e6fb8, 0x4f8f3f, 0xc8a03c];
  const containerSpots = [[-112, 124], [-100, 124], [-112, 134], [-100, 136], [-106, 124]];
  containerSpots.forEach(([x, z], i) => {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(10, 3, 3.4),
      new THREE.MeshLambertMaterial({ color: containerColors[i % containerColors.length] }),
    );
    box.position.set(x, 1.5 + (i === 4 ? 3 : 0), z);
    box.rotation.y = i % 2 === 0 ? 0 : 0.06;
    scene.add(box);
    city.colliders.push({ x0: x - 5, z0: z - 1.7, x1: x + 5, z1: z + 1.7 });
  });

  // The marina: a boathouse and three boats pulled up on the sand.
  addBuilding(52, 138, 14, 10, 7, facades[1]);
  const boatMat = new THREE.MeshLambertMaterial({ color: 0xf2f0e8 });
  [[40, 152], [58, 156], [72, 150]].forEach(([x, z], i) => {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 8), boatMat);
    hull.position.set(x, 0.6, z);
    hull.rotation.y = (i - 1) * 0.25;
    scene.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5, 5),
      new THREE.MeshLambertMaterial({ color: 0x5a4a35 }));
    mast.position.set(x, 3, z);
    scene.add(mast);
  });

  // The pier: wooden planks running out into the ocean, with posts.
  const plankMat = new THREE.MeshLambertMaterial({ color: 0x8a6a45 });
  for (let z = CITY.sandZ; z <= 250; z += 2.2) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 2), plankMat);
    plank.position.set(0, 0.8, z);
    scene.add(plank);
  }
  for (let z = CITY.sandZ + 4; z <= 250; z += 12) {
    for (const x of [-3.6, 3.6]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3.4, 6), plankMat);
      post.position.set(x, 0.4, z);
      scene.add(post);
    }
  }
  const pierEnd = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 10), plankMat);
  pierEnd.position.set(0, 0.8, 254);
  scene.add(pierEnd);

  // Palms along the beach and streetlights at the intersections.
  for (let x = -150; x <= 150; x += 18) {
    const palm = makePalm();
    palm.position.set(x + range(rng, -3, 3), 0, CITY.beachZ + 4 + range(rng, 0, 4));
    palm.rotation.y = rng() * Math.PI;
    scene.add(palm);
  }
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3d42 });
  const lampMat = new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0x554411 });
  city.lampMat = lampMat;
  for (const cx of CITY.roads) {
    for (const cz of CITY.roads) {
      if (rng() < 0.4) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6.5, 6), poleMat);
      pole.position.set(cx + 7.5, 3.25, cz + 7.5);
      scene.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), lampMat);
      lamp.position.set(cx + 7.5, 6.6, cz + 7.5);
      scene.add(lamp);
    }
  }

  // Clouds: flattened white blobs drifting slowly.
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
  city.cloudMat = cloudMat;
  for (let i = 0; i < 9; i += 1) {
    const cloud = new THREE.Group();
    const puffs = int(rng, 2, 4);
    for (let j = 0; j < puffs; j += 1) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(range(rng, 4, 8), 8, 8), cloudMat);
      puff.position.set(j * 6 - puffs * 3, range(rng, -1, 1), range(rng, -3, 3));
      puff.scale.y = 0.45;
      cloud.add(puff);
    }
    cloud.position.set(range(rng, -220, 220), range(rng, 70, 110), range(rng, -220, 160));
    scene.add(cloud);
    city.clouds.push(cloud);
  }

  // Wave lines that slide along the shore.
  const waveMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
  for (let i = 0; i < 5; i += 1) {
    const wave = new THREE.Mesh(new THREE.BoxGeometry(range(rng, 20, 44), 0.06, 0.7), waveMat);
    wave.position.set(range(rng, -160, 160), 0.05, CITY.sandZ + 2 + i * 2.4);
    scene.add(wave);
    city.waves.push(wave);
  }

  // Extra parked-car spots along the roads.
  for (const c of CITY.roads) {
    for (const other of [-104, 0, 104]) {
      city.parkingSpots.push({ x: c + 4.6, z: other, heading: Math.PI / 2 });
      city.parkingSpots.push({ x: other, z: c + 4.6, heading: 0 });
    }
  }

  // Sky colours the cycle blends between: day blue, dusk orange, night blue.
  const skyDay = new THREE.Color(PALETTE.sky);
  const skyNight = new THREE.Color(0x0b1626);
  const skyDusk = new THREE.Color(0xff9a5c);
  const skyNow = new THREE.Color(PALETTE.sky);
  const lampDay = new THREE.Color(0x554411);
  const lampNight = new THREE.Color(0xffe9a0);
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  city.update = (dt, time) => {
    // The day/night cycle: the clock runs on game time plus any ?tod= offset
    // the URL staged. One full day takes DAY.lengthSec real seconds.
    const t = time + (G.dayOffsetSec || 0);
    const hour = (DAY.startHour + (t / DAY.lengthSec) * 24) % 24;
    // Sun elevation: 0 at sunrise (06:00) and sunset (18:00), 1 at noon,
    // negative at night.
    const elev = Math.sin(Math.PI * (hour - DAY.sunrise) / (DAY.sunset - DAY.sunrise));
    const dayFactor = clamp01(0.15 + elev * 1.2);
    const duskFactor = clamp01(1 - Math.abs(elev) * 2.5);
    // Sky: night blue up through day blue, then toward orange at dusk.
    skyNow.copy(skyNight).lerp(skyDay, dayFactor).lerp(skyDusk, duskFactor * 0.55);
    scene.background.copy(skyNow);
    scene.fog.color.copy(skyNow);
    city.hemi.intensity = 0.35 + 0.6 * dayFactor;
    city.sun.intensity = 0.12 + 1.5 * dayFactor;
    // The sun arcs across the sky; the moon takes the opposite side at night.
    const az = ((hour - DAY.sunrise) / 24) * Math.PI * 2;
    city.sun.position.set(Math.cos(az) * 240, 40 + Math.max(0, elev) * 220, Math.sin(az) * 160);
    city.sunBall.visible = elev > -0.05;
    city.sunBall.position.set(Math.cos(az) * 380, Math.max(25, elev * 320), Math.sin(az) * 300);
    city.sunBall.material.color.setHex(duskFactor > 0.5 ? 0xff8a4a : 0xfff6c9);
    city.moonBall.visible = elev < 0.05;
    city.moonBall.position.set(-Math.cos(az) * 380, Math.max(60, -elev * 320 + 40), -Math.sin(az) * 300);
    // Street lamps glow after dark; clouds fade with the light.
    city.lampMat.emissive.copy(lampDay).lerp(lampNight, 1 - dayFactor);
    city.cloudMat.opacity = 0.25 + 0.65 * dayFactor;
    city.clock.hour = Math.floor(hour);
    city.clock.minute = Math.floor((hour - Math.floor(hour)) * 60);
    city.clock.label = elev > 0.3 ? 'Day'
      : elev > -0.12 ? (hour < 12 ? 'Dawn' : 'Dusk') : 'Night';

    for (const cloud of city.clouds) {
      cloud.position.x += dt * 1.2;
      if (cloud.position.x > 260) cloud.position.x = -260;
    }
    city.waves.forEach((wave, i) => {
      wave.position.z = CITY.sandZ + 2 + i * 2.4 + Math.sin(time * 0.7 + i * 1.3) * 1.2;
    });
  };

  return city;
}

// Push a circle (x, z, radius) out of every building collider. Returns true when
// anything was hit. `pos` is a THREE.Vector3, mutated in place.
export function resolveCircle(pos, radius, colliders) {
  let hit = false;
  for (const c of colliders) {
    const closestX = Math.max(c.x0, Math.min(pos.x, c.x1));
    const closestZ = Math.max(c.z0, Math.min(pos.z, c.z1));
    const dx = pos.x - closestX;
    const dz = pos.z - closestZ;
    const distSq = dx * dx + dz * dz;
    if (distSq >= radius * radius) continue;
    hit = true;
    if (distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const push = (radius - dist) / dist;
      pos.x += dx * push;
      pos.z += dz * push;
    } else {
      // Centre is inside the box: push out along the shallowest side.
      const left = pos.x - c.x0;
      const right = c.x1 - pos.x;
      const top = pos.z - c.z0;
      const bottom = c.z1 - pos.z;
      const min = Math.min(left, right, top, bottom);
      if (min === left) pos.x = c.x0 - radius;
      else if (min === right) pos.x = c.x1 + radius;
      else if (min === top) pos.z = c.z0 - radius;
      else pos.z = c.z1 + radius;
    }
  }
  return hit;
}

// The nearest point on the road network to (x, z), for traffic spawns.
export function nearestRoadPoint(x, z) {
  let best = null;
  let bestDist = Infinity;
  for (const c of CITY.roads) {
    const dx = Math.abs(x - c);
    if (dx < bestDist) { bestDist = dx; best = { x: c, z, axis: 'z', lane: Math.sign(x - c) || 1 }; }
    const dz = Math.abs(z - c);
    if (dz < bestDist) { bestDist = dz; best = { x, z: c, axis: 'x', lane: Math.sign(z - c) || 1 }; }
  }
  return best;
}

export function clampToCity(pos) {
  pos.x = Math.max(CITY.west, Math.min(CITY.east, pos.x));
  pos.z = Math.max(CITY.north, Math.min(CITY.oceanZ - 30, pos.z));
}

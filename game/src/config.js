// Every tuning number and layout constant for Solmar Streets, in one place.
// The city is a road grid: six roads run each way, 52 m apart, with square blocks
// between them. South of the city (high +z) is a beach and the ocean.
export const STEP = 1 / 60;

// The day/night cycle: one full 24-hour day passes in 10 real minutes, and
// the game opens at 09:00. Sunrise 06:00, sunset 18:00.
export const DAY = {
  lengthSec: 600,
  startHour: 9,
  sunrise: 6,
  sunset: 18,
};

export const CITY = {
  pitch: 52,
  roadW: 12,
  block: 40,
  roads: [-130, -78, -26, 26, 78, 130],
  // Block centres sit halfway between neighbouring road centrelines.
  blocks: [-104, -52, 0, 52, 104],
  half: 142,
  beachZ: 148,
  sandZ: 184,
  oceanZ: 520,
  west: -170,
  east: 170,
  north: -170,
};

export const PLAYER = {
  walkSpeed: 6,
  sprintSpeed: 10.5,
  radius: 0.6,
  maxHealth: 100,
  punchRange: 2.2,
  punchDamage: 25,
};

export const CAR = {
  accel: 16,
  brake: 32,
  reverseAccel: 10,
  maxSpeed: 36,
  maxReverse: 11,
  steerMax: 0.62,
  steerSpeed: 2.6,
  drag: 0.55,
  radius: 2.1,
};

export const PISTOL = {
  magazine: 12,
  damage: 34,
  fireInterval: 0.22,
  range: 90,
};

// The weapon rack: the pistol is earned after job 1, the SMG after job 3,
// the shotgun after job 6. Keys 1/2/3 switch between the unlocked ones.
// damage is per hit (the shotgun fires 5 pellets), spread is the pellet
// cone in radians, magSize the reload size.
export const WEAPONS = {
  pistol: { name: 'Pistol', magazine: 12, damage: 1, fireInterval: 0.22, range: 90, pellets: 1, spread: 0 },
  smg: { name: 'SMG', magazine: 30, damage: 1, fireInterval: 0.09, range: 70, pellets: 1, spread: 0.02 },
  shotgun: { name: 'Shotgun', magazine: 6, damage: 1, fireInterval: 0.85, range: 26, pellets: 5, spread: 0.09 },
};

// NOS boost for cars: hold Shift while driving. It drains fast, refills
// slowly, and only works while there is some in the tank.
export const NOS = {
  max: 100,
  drainPerSec: 38,
  refillPerSec: 9,
  accelMult: 1.9,
  maxSpeed: 52,
};

// Police escalation: roadblocks from 3 stars, the helicopter from 4. While
// the helicopter is up, the police can see Jax from much further away, so
// hiding to cool the heat down takes longer.
export const HELI = {
  minWanted: 4,
  // The helicopter tracks Jax from ahead, low over the road, so it is
  // visible in the chase and its searchlight stays on the street. The chase
  // camera looks slightly down, so the heli must fly low (10 m) to stay in
  // frame; the road ahead of Jax is clear of buildings.
  height: 10,
  aheadDist: 34,
  hideDistance: 90,
};

export const ROADBLOCK = {
  minWanted: 3,
  aheadDist: 55,
  repositionEverySec: 8,
};

export const WANTED = {
  max: 5,
  decayDelay: 20,
  decayEvery: 6,
  // How far away the police give up and the heat starts to cool.
  hideDistance: 48,
};

export const SAVE_KEY = 'solmar-streets.save.v1';

// The beachfront shops and safehouse (round 4). Each shop is a real building
// on the sand with a sign; walk up to it and the HUD shows what it sells and
// which key buys it. Prices are in dollars; the safehouse is free.
export const SHOP_RADIUS = 9;
export const SHOP_PRICES = {
  pistolAmmo: 40, // one full pistol magazine (12 rounds)
  smgAmmo: 80, // one full SMG magazine (30 rounds)
  shotgunAmmo: 60, // one full shotgun tube (6 shells)
  heal: 50, // heal to full health
  nosRefill: 30, // refill the NOS tank instantly
};

// x/z are the building centres on the sand (z 165: clear of the palms at
// z 152-156 and the boats at x 40-72). `front` is where Jax stands to shop.
export const SHOPS = {
  gun: {
    key: 'gun',
    name: "Big Iron Guns",
    sign: 'BIG IRON GUNS',
    x: -52, z: 165, front: { x: -52, z: 156 },
    color: 0x8a2f2a, awning: 0x2a2a2a,
  },
  clinic: {
    key: 'clinic',
    name: "Doc Sal's",
    sign: "DOC SAL'S",
    x: 104, z: 165, front: { x: 104, z: 156 },
    color: 0xe8e4d8, awning: 0x2e7f8a,
  },
  safehouse: {
    key: 'safehouse',
    name: "Rosa's Safehouse",
    sign: 'SAFEHOUSE',
    x: -104, z: 165, front: { x: -104, z: 156 },
    color: 0x3a7d5c, awning: 0xe8703a,
  },
};

export const PALETTE = {
  sky: 0x8fc7e8,
  fog: 0xa8c8dd,
  sun: 0xfff2d0,
  grass: 0x7fae62,
  sidewalk: 0xb8b2a4,
  asphalt: 0x3a3d42,
  sand: 0xe8d5a4,
  ocean: 0x2e7fb8,
  buildingRoof: 0x5a5f6a,
  text: '#f2f0e8',
  muted: '#c9c4b4',
  accent: '#ffb347',
  policeRed: 0xff2a2a,
  policeBlue: 0x2a6bff,
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

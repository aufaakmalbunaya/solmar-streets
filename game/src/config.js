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

export const WANTED = {
  max: 5,
  decayDelay: 20,
  decayEvery: 6,
  // How far away the police give up and the heat starts to cool.
  hideDistance: 48,
};

export const SAVE_KEY = 'solmar-streets.save.v1';

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

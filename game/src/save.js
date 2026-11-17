// Save and load through localStorage: cash, story progress, the pistol, and
// where Jax was standing. Nothing else leaves the browser.
import { SAVE_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw);
    if (!save || typeof save !== 'object') return null;
    return save;
  } catch {
    return null;
  }
}

export function writeSave(G) {
  try {
    const save = {
      version: 1,
      cash: G.cash,
      missionIndex: G.missions.index,
      hasPistol: G.hasPistol,
      ammo: G.ammo,
      health: Math.round(G.player.health),
      pos: [Math.round(G.player.pos.x * 10) / 10, Math.round(G.player.pos.z * 10) / 10],
      heading: G.player.heading,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage may be unavailable; the game still runs.
  }
}

// The HUD: health bar, wanted stars, cash, mission objective, speedometer and a
// live 2D minimap, plus toasts, dialogue lines and the damage flash. All DOM,
// drawn over the WebGL canvas.
import { CITY } from './config.js';

export function createHud(G) {
  const $ = (id) => document.getElementById(id);
  const hud = {
    el: $('hud'),
    healthFill: $('health-fill'),
    healthText: $('health-text'),
    stars: $('stars'),
    clock: $('clock'),
    cash: $('cash'),
    objectiveTitle: $('objective-title'),
    objectiveText: $('objective-text'),
    speed: $('speed'),
    crosshair: $('crosshair'),
    toastEl: $('toast'),
    dialogueEl: $('dialogue'),
    hint: $('hint'),
    damage: $('damage'),
    minimap: $('minimap'),
    minimapCtx: $('minimap').getContext('2d'),
    toastTimer: 0,
    dialogueLines: [],
    dialogueTimer: 0,
  };

  hud.toast = (message) => {
    hud.toastEl.textContent = message;
    hud.toastEl.classList.add('show');
    hud.toastTimer = 3.2;
  };

  hud.dialogue = (lines) => {
    hud.dialogueLines = [...lines];
    hud.dialogueTimer = 0;
  };

  hud.flashDamage = () => {
    hud.damage.classList.add('show');
    setTimeout(() => hud.damage.classList.remove('show'), 220);
  };

  hud.showScreen = (screen) => {
    for (const id of ['title', 'pause', 'busted', 'wasted', 'story']) {
      const overlay = $(`screen-${id}`);
      if (overlay) overlay.classList.toggle('show', screen === id);
    }
    hud.el.classList.toggle('hidden', screen === 'title' || screen === 'story');
    if (screen === 'title') {
      const continueButton = $('btn-continue');
      if (continueButton) continueButton.style.display = G.hasSave ? '' : 'none';
    }
  };

  function drawMinimap() {
    const ctx = hud.minimapCtx;
    const size = 200;
    const scale = size / 380;
    const toX = (x) => (x + 190) * scale;
    const toY = (z) => (z + 190) * scale;
    // Ocean, sand, land.
    ctx.fillStyle = '#2e7fb8';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#e8d5a4';
    ctx.fillRect(0, toY(CITY.beachZ), size, toY(CITY.sandZ) - toY(CITY.beachZ));
    ctx.fillStyle = '#7fae62';
    ctx.fillRect(0, 0, size, toY(CITY.beachZ));
    // Roads.
    ctx.fillStyle = '#3a3d42';
    for (const c of CITY.roads) {
      ctx.fillRect(toX(c - 6), 0, 12 * scale, toY(CITY.beachZ));
      ctx.fillRect(0, toY(c - 6), toX(190), 12 * scale);
    }
    // Mission marker: a pulsing yellow diamond.
    if (G.missions.marker.visible) {
      const mx = toX(G.missions.marker.position.x);
      const my = toY(G.missions.marker.position.z);
      const r = 5 + Math.sin(G.time * 4) * 2;
      ctx.fillStyle = '#ffc93c';
      ctx.beginPath();
      ctx.moveTo(mx, my - r);
      ctx.lineTo(mx + r, my);
      ctx.lineTo(mx, my + r);
      ctx.lineTo(mx - r, my);
      ctx.closePath();
      ctx.fill();
    }
    // Traffic, white dots.
    ctx.fillStyle = '#ffffff';
    for (const car of G.vehicles.traffic) {
      ctx.fillRect(toX(car.pos.x) - 1, toY(car.pos.z) - 1, 2, 2);
    }
    // Police, red/blue blips.
    for (const car of G.police.cars) {
      ctx.fillStyle = Math.floor(G.time * 4) % 2 === 0 ? '#ff2a2a' : '#2a6bff';
      ctx.beginPath();
      ctx.arc(toX(car.pos.x), toY(car.pos.z), 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const enemy of G.combat.enemies) {
      if (enemy.dead) continue;
      ctx.fillStyle = '#ff4a3a';
      ctx.fillRect(toX(enemy.pos.x) - 2, toY(enemy.pos.z) - 2, 4, 4);
    }
    // The player: a white arrow pointing where he (or his car) faces.
    const pos = G.player.car ? G.player.car.pos : G.player.pos;
    const heading = G.player.car ? G.player.car.heading : G.player.heading;
    const px = toX(pos.x);
    const py = toY(pos.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(heading);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 2);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  hud.update = (dt) => {
    if (hud.toastTimer > 0) {
      hud.toastTimer -= dt;
      if (hud.toastTimer <= 0) hud.toastEl.classList.remove('show');
    }
    if (hud.dialogueLines.length > 0) {
      hud.dialogueTimer -= dt;
      if (hud.dialogueTimer <= 0) {
        const line = hud.dialogueLines.shift();
        hud.dialogueEl.textContent = line;
        hud.dialogueEl.classList.add('show');
        hud.dialogueTimer = 3.6;
      }
    } else if (hud.dialogueTimer <= 0) {
      hud.dialogueEl.classList.remove('show');
    }
    const health = Math.max(0, Math.round(G.player.health));
    hud.healthFill.style.width = `${health}%`;
    hud.healthText.textContent = `${health}`;
    hud.stars.textContent = '★'.repeat(G.wanted) + '☆'.repeat(5 - G.wanted);
    hud.stars.classList.toggle('hot', G.wanted > 0);
    // The clock: sun by day, half sun at dawn and dusk, moon at night.
    const clock = G.city.clock;
    const mark = clock.label === 'Night' ? '☾' : clock.label === 'Day' ? '☀' : '◐';
    hud.clock.textContent = `${mark} ${String(clock.hour).padStart(2, '0')}:${String(clock.minute).padStart(2, '0')} ${clock.label}`;
    hud.cash.textContent = `$${G.cash.toLocaleString('en-US')}`;
    const objective = G.missions.currentObjective();
    hud.objectiveTitle.textContent = objective.title;
    hud.objectiveText.textContent = objective.text;
    const speed = G.player.car ? Math.abs(G.player.car.speed) * 3.6 : Math.abs(G.player.speed) * 3.6;
    hud.speed.textContent = `${Math.round(speed)} km/h`;
    hud.crosshair.classList.toggle('show', G.hasPistol && G.screen === 'playing');
    hud.hint.textContent = G.player.car
      ? 'W/S drive · A/D steer · Space handbrake · E leave car · P pause · M mute'
      : 'WASD move · Shift sprint · E enter car · F punch · Click shoot · P pause · M mute';
    if (G.screen === 'playing') drawMinimap();
  };

  return hud;
}

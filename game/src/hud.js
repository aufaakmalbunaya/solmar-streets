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
    weapon: $('weapon'),
    clock: $('clock'),
    cash: $('cash'),
    objectiveTitle: $('objective-title'),
    objectiveText: $('objective-text'),
    speed: $('speed'),
    radio: $('radio'),
    nosBar: $('nos-bar'),
    nosFill: $('nos-fill'),
    nosLabel: $('nos-label'),
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
    // Roadblocks: red squares. Helicopter: a yellow ring.
    ctx.fillStyle = '#ff2a2a';
    for (const block of G.police.roadblocks) {
      ctx.fillRect(toX(block.pos.x) - 3, toY(block.pos.z) - 3, 6, 6);
    }
    if (G.police.heli) {
      const hx = toX(G.police.heli.group.position.x);
      const hy = toY(G.police.heli.group.position.z);
      ctx.strokeStyle = '#ffd23c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hx, hy, 5, 0, Math.PI * 2);
      ctx.stroke();
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
    if (!G.hasPistol) {
      hud.weapon.textContent = 'No weapon yet';
    } else {
      const def = G.combat.currentWeapon();
      const state = G.combat.weapons[G.combat.weapon];
      const labelOf = { pistol: 'Pistol', smg: 'SMG', shotgun: 'Shotgun' };
      const keyOf = { pistol: '1', smg: '2', shotgun: '3' };
      const unlocked = ['pistol', 'smg', 'shotgun']
        .filter((name) => G.combat.weapons[name].unlocked)
        .map((name) => `${keyOf[name]} ${labelOf[name]}`)
        .join(' · ');
      hud.weapon.textContent = `${def.name} · ${state.ammo}/${def.magazine} — ${unlocked}`;
    }
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
    // The radio and the NOS gauge only show while driving.
    const driving = !!G.player.car;
    hud.radio.style.display = driving ? '' : 'none';
    if (driving) hud.radio.textContent = `♪ ${G.audio.stationName()} — ${G.audio.stationTag()}`;
    hud.nosBar.style.display = driving ? '' : 'none';
    hud.nosLabel.style.display = driving ? '' : 'none';
    if (driving) hud.nosFill.style.width = `${Math.round(G.player.nos)}%`;
    hud.crosshair.classList.toggle('show', G.hasPistol && G.screen === 'playing');
    hud.hint.textContent = G.player.car
      ? 'W/S drive · A/D steer · Shift NOS · Space handbrake · E leave car · Q radio · P pause · M mute'
      : 'WASD move · Shift sprint · E enter car · F punch · Click shoot · 1/2/3 weapons · R reload · P pause · M mute';
    if (G.screen === 'playing') drawMinimap();
  };

  return hud;
}

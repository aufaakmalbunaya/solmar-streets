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
    rank: $('rank'),
    jobsFill: $('jobs-fill'),
    response: $('response'),
    responseTitle: $('response-title'),
    responseList: $('response-list'),
    objectiveTitle: $('objective-title'),
    objectiveText: $('objective-text'),
    objectiveNext: $('objective-next'),
    objectiveReward: $('objective-reward'),
    loadout: [$('slot-0'), $('slot-1'), $('slot-2'), $('slot-3')],
    location: $('location'),
    carName: $('car-name'),
    dialogueFace: $('dialogue-face'),
    dialogueName: $('dialogue-name'),
    dialogueText: $('dialogue-text'),
    pauseStats: $('pause-stats'),
    speed: $('speed'),
    radio: $('radio'),
    nosBar: $('nos-bar'),
    nosFill: $('nos-fill'),
    nosLabel: $('nos-label'),
    crosshair: $('crosshair'),
    toastEl: $('toast'),
    dialogueEl: $('dialogue'),
    hint: $('hint'),
    shopHint: $('shop-hint'),
    camMode: $('cam-mode'),
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

  // Split a "Name: ..." line into its speaker and its words; the portrait
  // tile shows the speaker's initials.
  function splitSpeaker(line) {
    const at = line.indexOf(': ');
    if (at < 0) return { name: 'MAMA ROSA', text: line };
    return { name: line.slice(0, at).toUpperCase(), text: line.slice(at + 2) };
  }

  function initials(name) {
    return name.split(/[^A-Z]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('') || 'J';
  }

  hud.flashDamage = () => {
    hud.damage.classList.add('show');
    setTimeout(() => hud.damage.classList.remove('show'), 220);
  };

  // The rank is story progress made readable: jobs done out of twelve.
  function rankFor(jobsDone) {
    if (jobsDone >= 12) return 'KING OF SOLMAR';
    if (jobsDone >= 9) return 'SHOT CALLER';
    if (jobsDone >= 6) return 'ENFORCER';
    if (jobsDone >= 3) return 'HUSTLER';
    if (jobsDone >= 1) return 'WHEELMAN';
    return 'ROOKIE';
  }

  // Where Jax is standing, from the city's own landmarks: the pier past the
  // beach, the docks west, the marina east, uptown north, downtown the grid.
  function zoneFor(x, z) {
    if (z >= 190) return 'Solmar Pier';
    if (z >= 148) return 'The Beach';
    if (x <= -78 && z >= 104) return 'The Docks';
    if (x >= 26 && z >= 104) return 'The Marina';
    if (z <= -78) return 'Uptown';
    return 'Downtown';
  }

  function fillPauseStats() {
    if (!hud.pauseStats) return;
    const jobsDone = Math.min(12, G.missions.index);
    const weapons = ['pistol', 'smg', 'shotgun']
      .filter((name) => G.combat.weapons[name].unlocked)
      .map((name) => name[0].toUpperCase() + name.slice(1))
      .join(', ') || 'Fists';
    hud.pauseStats.innerHTML = `Jobs done <b>${jobsDone} / 12</b> · Rank <b>${rankFor(jobsDone)}</b><br>`
      + `Cash <b>$${G.cash.toLocaleString('en-US')}</b> · Weapons <b>${weapons}</b><br>`
      + `Wanted <b>${'★'.repeat(G.wanted)}${'☆'.repeat(5 - G.wanted)}</b> · Health <b>${Math.max(0, Math.round(G.player.health))}</b>`;
  }

  hud.showScreen = (screen) => {
    // The game sets 'paused'; the overlay's id is 'pause'.
    const shown = screen === 'paused' ? 'pause' : screen;
    for (const id of ['title', 'pause', 'busted', 'wasted', 'story']) {
      const overlay = $(`screen-${id}`);
      if (overlay) overlay.classList.toggle('show', shown === id);
    }
    hud.el.classList.toggle('hidden', screen === 'title' || screen === 'story');
    if (screen === 'paused') fillPauseStats();
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
    // City blocks: pale sidewalks with a greener or greyer inner lot, the
    // same tones the ground texture paints, so the map reads as a city
    // instead of an empty grid.
    for (const bx of CITY.blocks) {
      for (const bz of CITY.blocks) {
        ctx.fillStyle = '#b8b2a4';
        ctx.fillRect(toX(bx - 26), toY(bz - 26), 52 * scale, 52 * scale);
        ctx.fillStyle = (bx + bz) % 104 === 0 ? '#8fae6a' : '#a9a294';
        ctx.fillRect(toX(bx - 20), toY(bz - 20), 40 * scale, 40 * scale);
      }
    }
    // The pier: a stub of boards reaching into the ocean at x 0.
    ctx.fillStyle = '#8a6a45';
    ctx.fillRect(toX(-3), toY(CITY.sandZ), 6 * scale, toY(210) - toY(CITY.sandZ));
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
    // Shops and the safehouse: green square (guns), white cross (clinic),
    // blue square (safehouse).
    for (const shop of G.shops.list) {
      const sx = toX(shop.front.x);
      const sy = toY(shop.front.z);
      if (shop.key === 'gun') {
        ctx.fillStyle = '#7ddb8a';
        ctx.fillRect(sx - 3, sy - 3, 6, 6);
      } else if (shop.key === 'clinic') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx - 1, sy - 4, 2, 8);
        ctx.fillRect(sx - 4, sy - 1, 8, 2);
      } else {
        ctx.fillStyle = '#4fa8ff';
        ctx.fillRect(sx - 3, sy - 3, 6, 6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx - 1, sy - 1, 2, 2);
      }
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
        const said = splitSpeaker(line);
        hud.dialogueFace.textContent = initials(said.name);
        hud.dialogueName.textContent = said.name;
        hud.dialogueText.textContent = said.text;
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
    // Rank and story progress: jobs done out of twelve.
    const jobsDone = Math.min(12, G.missions.index);
    hud.rank.textContent = `${rankFor(jobsDone)} · Jobs ${jobsDone}/12`;
    hud.jobsFill.style.width = `${(jobsDone / 12) * 100}%`;
    // The mission panel: job number, objective, the next job and the reward.
    const objective = G.missions.currentObjective();
    const def = G.missions.defs[G.missions.index] ?? null;
    const nextDef = G.missions.defs[G.missions.index + 1] ?? null;
    hud.objectiveTitle.textContent = def
      ? `JOB ${def.id}/12 · ${def.name.toUpperCase()}`
      : objective.title;
    hud.objectiveText.textContent = objective.text;
    hud.objectiveNext.textContent = nextDef ? `NEXT: Job ${nextDef.id} — ${nextDef.name}` : '';
    hud.objectiveNext.style.display = nextDef ? '' : 'none';
    hud.objectiveReward.textContent = def ? `REWARD $${def.reward.toLocaleString('en-US')}` : '';
    hud.objectiveReward.style.display = def ? '' : 'none';
    // The weapon rack: four slots, the one in hand lit, the locked dimmed.
    const slotDefs = [
      { name: 'pistol', key: '1' },
      { name: 'smg', key: '2' },
      { name: 'shotgun', key: '3' },
    ];
    hud.loadout[0].classList.toggle('active', G.combat.weapon === 'fists' || !G.hasPistol);
    hud.loadout[0].classList.remove('locked');
    slotDefs.forEach((slot, i) => {
      const el = hud.loadout[i + 1];
      const state = G.combat.weapons[slot.name];
      // The pistol slot is locked until job 1 hands the pistol over, even
      // though the rack always lists it.
      const locked = !state.unlocked || (slot.name === 'pistol' && !G.hasPistol);
      const ammoEl = el.querySelector('.ammo');
      ammoEl.textContent = locked ? '—' : `${state.ammo}`;
      el.classList.toggle('locked', locked);
      el.classList.toggle('active', !locked && G.combat.weapon === slot.name);
    });
    // The police answer: named units, what each is doing, how far away.
    const units = G.police.unitsForHud();
    hud.response.classList.toggle('show', units.length > 0);
    if (units.length > 0) {
      hud.responseTitle.textContent = `SOLMAR PD RESPONSE · ${units.length} UNIT${units.length === 1 ? '' : 'S'}`;
      hud.responseList.innerHTML = units.map((u) => `<div class="response-row"><span class="callsign">${u.callsign}</span><span class="role">${u.role}</span><span class="dist">${u.dist} m</span></div>`).join('');
    }
    // Where Jax is, and what he is driving.
    const pos = G.player.car ? G.player.car.pos : G.player.pos;
    hud.location.textContent = zoneFor(pos.x, pos.z);
    const speed = G.player.car ? Math.abs(G.player.car.speed) * 3.6 : Math.abs(G.player.speed) * 3.6;
    hud.speed.textContent = `${Math.round(speed)} km/h`;
    hud.carName.textContent = G.player.car ? (G.player.car.name ?? 'Car').toUpperCase() : '';
    hud.carName.style.display = G.player.car ? '' : 'none';
    // The radio and the NOS gauge only show while driving.
    const driving = !!G.player.car;
    hud.radio.style.display = driving ? '' : 'none';
    if (driving) hud.radio.textContent = `♪ ${G.audio.stationName()} — ${G.audio.stationTag()}`;
    hud.nosBar.style.display = driving ? '' : 'none';
    hud.nosLabel.style.display = driving ? '' : 'none';
    if (driving) hud.nosFill.style.width = `${Math.round(G.player.nos)}%`;
    hud.crosshair.classList.toggle('show', G.hasPistol && G.screen === 'playing');
    // Camera mode while driving, and the shop hint while standing at a shop.
    hud.camMode.style.display = driving ? '' : 'none';
    if (driving) hud.camMode.textContent = `CAM ${G.cameraMode === 'chase' ? 'Chase' : 'Orbit'} (C)`;
    const nearShop = G.player.onFoot ? G.shops.nearest(G.player.pos) : null;
    hud.shopHint.textContent = nearShop ? G.shops.hintFor(nearShop) : '';
    hud.shopHint.style.display = nearShop ? '' : 'none';
    hud.hint.textContent = G.player.car
      ? 'W/S drive · A/D steer · Shift NOS · Space handbrake · E leave car · Q radio · C chase cam · P pause · M mute'
      : 'WASD move · Shift sprint · E enter car · F punch · Click shoot · 1/2/3 weapons · R reload · P pause · M mute';
    // The map paints whenever the HUD is up, including over the pause
    // screen: it used to paint only while playing, so the pause shot
    // showed an empty blue disc.
    drawMinimap();
  };

  return hud;
}

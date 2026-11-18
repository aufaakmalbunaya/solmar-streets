// Combat: the weapon rack, punching, and the armed enemies the later
// missions send at Jax. Shooting is hitscan from the camera through the
// crosshair; enemies answer with slow, inaccurate fire.
//
// Weapons: the pistol is earned after the first job, the SMG after job 3,
// the shotgun after job 6. Keys 1/2/3 switch between the unlocked ones, R
// reloads the one in hand. The shotgun fires five pellets in a spread; the
// SMG fires fast with a small spread; the pistol is the steady middle.
import * as THREE from 'three';
import { WEAPONS } from './config.js';
import { buildCharacter } from './player.js';
import { resolveCircle } from './city.js';
import { pick, range } from './random.js';

const ENEMY_SHIRTS = [0x5a1f1f, 0x3a2a1a, 0x222222];

export function createCombat(G) {
  const rng = G.rng;
  const combat = {
    enemies: [],
    tracers: [],
    fireCooldown: 0,
    reloadTimer: 0,
    weapon: 'pistol',
    weapons: {
      pistol: { unlocked: true, ammo: 0 },
      smg: { unlocked: false, ammo: 0 },
      shotgun: { unlocked: false, ammo: 0 },
    },
  };

  // A fresh game starts with no weapons at all; the pistol comes with job 1.
  combat.resetWeapons = () => {
    combat.weapon = 'pistol';
    combat.weapons.pistol = { unlocked: true, ammo: 0 };
    combat.weapons.smg = { unlocked: false, ammo: 0 };
    combat.weapons.shotgun = { unlocked: false, ammo: 0 };
    combat.reloadTimer = 0;
    combat.syncAmmo();
  };

  // Story progress unlocks weapons: finishing job 3 earns the SMG, job 6
  // the shotgun. missionIndex is the next job to play, so it also counts
  // the jobs already done when a save is loaded.
  combat.unlockForProgress = (missionIndex) => {
    if (missionIndex >= 3 && !combat.weapons.smg.unlocked) {
      combat.weapons.smg.unlocked = true;
      combat.weapons.smg.ammo = WEAPONS.smg.magazine;
      G.hud.toast('New weapon: SMG — press 2 to switch');
    }
    if (missionIndex >= 6 && !combat.weapons.shotgun.unlocked) {
      combat.weapons.shotgun.unlocked = true;
      combat.weapons.shotgun.ammo = WEAPONS.shotgun.magazine;
      G.hud.toast('New weapon: Shotgun — press 3 to switch');
    }
  };

  combat.restoreWeapons = (saved) => {
    if (!saved || typeof saved !== 'object') return;
    for (const name of ['pistol', 'smg', 'shotgun']) {
      const s = saved[name];
      if (!s) continue;
      combat.weapons[name].unlocked = !!s.unlocked;
      combat.weapons[name].ammo = Math.max(0, Math.floor(s.ammo ?? 0));
    }
    if (saved.weapon && combat.weapons[saved.weapon]?.unlocked) combat.weapon = saved.weapon;
    combat.syncAmmo();
  };

  combat.saveWeapons = () => ({
    weapon: combat.weapon,
    pistol: { ...combat.weapons.pistol },
    smg: { ...combat.weapons.smg },
    shotgun: { ...combat.weapons.shotgun },
  });

  // G.ammo always mirrors the weapon in hand, so the HUD and the save keep
  // working the way they did when the pistol was the only weapon.
  combat.syncAmmo = () => {
    G.ammo = combat.weapons[combat.weapon].ammo;
  };

  combat.currentWeapon = () => WEAPONS[combat.weapon];

  combat.selectWeapon = (name) => {
    const state = combat.weapons[name];
    if (!state || !state.unlocked) {
      if (name === 'smg') G.hud.toast('SMG locked — finish job 3 first.');
      if (name === 'shotgun') G.hud.toast('Shotgun locked — finish job 6 first.');
      return;
    }
    if (combat.weapon === name) return;
    combat.weapon = name;
    combat.reloadTimer = 0;
    combat.syncAmmo();
    G.hud.toast(`${WEAPONS[name].name} ready — ${state.ammo} in the mag`);
    G.audio.pickup();
  };

  function makeTracer(from, to, color) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
    G.scene.add(line);
    combat.tracers.push({ line, life: 0.08 });
  }

  combat.spawnEnemies = (center, count, boss) => {
    for (let i = 0; i < count; i += 1) {
      const isBoss = boss && i === count - 1;
      const built = buildCharacter(pick(rng, ENEMY_SHIRTS));
      const group = built.group;
      if (isBoss) group.scale.setScalar(1.18);
      // A gun in the right hand.
      const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.5),
        new THREE.MeshLambertMaterial({ color: 0x1c1c1c }));
      gun.position.set(0.42, 1.25, 0.3);
      group.add(gun);
      const x = center.x + range(rng, -12, 12);
      const z = center.z + range(rng, -12, 12);
      group.position.set(x, 0, z);
      G.scene.add(group);
      combat.enemies.push({
        group,
        parts: built,
        pos: new THREE.Vector3(x, 0, z),
        heading: range(rng, 0, Math.PI * 2),
        health: isBoss ? 10 : 3,
        maxHealth: isBoss ? 10 : 3,
        shootTimer: range(rng, 1, 2.2),
        walkPhase: range(rng, 0, 6),
        dead: false,
        deadTimer: 0,
        boss: isBoss,
      });
    }
  };

  combat.clearEnemies = () => {
    for (const enemy of combat.enemies) G.scene.remove(enemy.group);
    combat.enemies = [];
  };

  function muzzlePoint() {
    const forward = new THREE.Vector3();
    G.camera.getWorldDirection(forward);
    const right = new THREE.Vector3().crossVectors(forward, G.camera.up).normalize();
    return G.camera.position.clone()
      .addScaledVector(forward, 0.7)
      .addScaledVector(right, 0.3)
      .add(new THREE.Vector3(0, -0.25, 0));
  }

  // One pellet: the nearest living enemy near the given aim direction.
  function firePellet(forward, muzzle, def) {
    let best = null;
    let bestDist = def.range;
    let bestAngle = 0.09 + def.spread * 2;
    for (const enemy of combat.enemies) {
      if (enemy.dead) continue;
      const to = new THREE.Vector3(enemy.pos.x, 1.3, enemy.pos.z).sub(G.camera.position);
      const dist = to.length();
      if (dist > def.range) continue;
      const angle = forward.angleTo(to.normalize());
      if (angle < bestAngle && dist < bestDist) {
        best = enemy;
        bestDist = dist;
        bestAngle = angle;
      }
    }
    if (best) {
      const hitPoint = new THREE.Vector3(best.pos.x, 1.3, best.pos.z);
      makeTracer(muzzle, hitPoint, 0xffe08a);
      best.health -= 1;
      best.group.position.x += (rng() - 0.5) * 0.3;
      if (best.health <= 0) {
        best.dead = true;
        best.deadTimer = 5;
        best.group.rotation.x = Math.PI / 2;
        G.cash += 20;
        G.hud.toast(best.boss ? 'Boss down — +$20' : 'Lobo down — +$20');
        G.missions.onKill();
      }
      return true;
    }
    const end = muzzle.clone().addScaledVector(forward, def.range);
    makeTracer(muzzle, end, 0xffe08a);
    return false;
  }

  combat.shoot = () => {
    if (!G.hasPistol) {
      G.hud.toast('No pistol yet — finish Mama Rosa’s first job.');
      return;
    }
    if (combat.fireCooldown > 0 || combat.reloadTimer > 0) return;
    const def = WEAPONS[combat.weapon];
    const state = combat.weapons[combat.weapon];
    if (state.ammo <= 0) {
      G.hud.toast('Out of ammo — press R to reload.');
      return;
    }
    combat.fireCooldown = def.fireInterval;
    state.ammo -= 1;
    combat.syncAmmo();
    if (combat.weapon === 'smg') G.audio.smgShot();
    else if (combat.weapon === 'shotgun') G.audio.shotgunBlast();
    else G.audio.gunshot();
    G.lastShotAt = G.time;
    const baseForward = new THREE.Vector3();
    G.camera.getWorldDirection(baseForward);
    const muzzle = muzzlePoint();
    // The shotgun fires a spread of pellets; the rest fire one shot.
    for (let p = 0; p < def.pellets; p += 1) {
      const forward = baseForward.clone();
      if (def.spread > 0) {
        const right = new THREE.Vector3().crossVectors(forward, G.camera.up).normalize();
        const up = new THREE.Vector3().crossVectors(right, forward).normalize();
        forward
          .addScaledVector(right, (rng() - 0.5) * 2 * def.spread)
          .addScaledVector(up, (rng() - 0.5) * 2 * def.spread)
          .normalize();
      }
      firePellet(forward, muzzle, def);
    }
    // Firing where the police can see it draws the heat.
    let policeNear = false;
    for (const car of G.police.cars) {
      if (Math.hypot(car.pos.x - G.player.pos.x, car.pos.z - G.player.pos.z) < 45) policeNear = true;
    }
    if (policeNear) G.police.addWanted(1, 'Shots fired in public');
    G.peds.fleeFrom(G.player.pos.x, G.player.pos.z, 32);
  };

  combat.punch = () => {
    if (G.player.punchCooldown > 0) return;
    G.player.punchCooldown = 0.45;
    G.player.punchTimer = 0.3;
    G.audio.punch();
    const origin = G.player.car ? G.player.car.pos : G.player.pos;
    // Enemies first, then anyone else standing too close.
    for (const enemy of combat.enemies) {
      if (enemy.dead) continue;
      const d = Math.hypot(enemy.pos.x - origin.x, enemy.pos.z - origin.z);
      if (d < 2.4) {
        enemy.health -= 1;
        if (enemy.health <= 0) {
          enemy.dead = true;
          enemy.deadTimer = 5;
          enemy.group.rotation.x = Math.PI / 2;
          G.cash += 20;
          G.missions.onKill();
        }
        return;
      }
    }
    const ped = G.peds.nearest(origin, 2.4);
    if (ped) {
      ped.state = 'flee';
      ped.stateTimer = 4;
      ped.fleeX = origin.x;
      ped.fleeZ = origin.z;
      G.police.addWanted(1, 'Assault in public');
    }
  };

  combat.reload = () => {
    const def = WEAPONS[combat.weapon];
    const state = combat.weapons[combat.weapon];
    if (!G.hasPistol || state.ammo >= def.magazine || combat.reloadTimer > 0) return;
    combat.reloadTimer = 0.6;
    G.hud.toast('Reloading…');
  };

  combat.update = (dt) => {
    combat.fireCooldown = Math.max(0, combat.fireCooldown - dt);
    if (combat.reloadTimer > 0) {
      combat.reloadTimer -= dt;
      if (combat.reloadTimer <= 0) {
        const def = WEAPONS[combat.weapon];
        combat.weapons[combat.weapon].ammo = def.magazine;
        combat.syncAmmo();
        G.audio.pickup();
      }
    }
    for (const tracer of combat.tracers) {
      tracer.life -= dt;
      tracer.line.material.opacity = Math.max(0, tracer.life / 0.08) * 0.9;
    }
    combat.tracers = combat.tracers.filter((tracer) => {
      if (tracer.life <= 0) {
        G.scene.remove(tracer.line);
        tracer.line.geometry.dispose();
        tracer.line.material.dispose();
        return false;
      }
      return true;
    });
    // Enemies close in and shoot back, badly.
    for (const enemy of combat.enemies) {
      if (enemy.dead) {
        enemy.deadTimer -= dt;
        if (enemy.deadTimer <= 0) {
          G.scene.remove(enemy.group);
          combat.enemies.splice(combat.enemies.indexOf(enemy), 1);
        }
        continue;
      }
      const targetPos = G.player.car ? G.player.car.pos : G.player.pos;
      const dx = targetPos.x - enemy.pos.x;
      const dz = targetPos.z - enemy.pos.z;
      const dist = Math.hypot(dx, dz);
      enemy.heading = Math.atan2(dx, dz);
      if (dist > 14) {
        const speed = enemy.boss ? 4.4 : 3.4;
        enemy.pos.x += (dx / dist) * speed * dt;
        enemy.pos.z += (dz / dist) * speed * dt;
        enemy.walkPhase += dt * 7;
      } else if (dist > 6) {
        enemy.pos.x += (dx / dist) * 1.2 * dt;
        enemy.pos.z += (dz / dist) * 1.2 * dt;
        enemy.walkPhase += dt * 4;
      }
      // Enemies walk around buildings, never through them.
      resolveCircle(enemy.pos, 0.6, G.city.colliders);
      const swing = Math.sin(enemy.walkPhase) * 0.5;
      enemy.parts.legL.rotation.x = swing;
      enemy.parts.legR.rotation.x = -swing;
      enemy.group.position.copy(enemy.pos);
      enemy.group.rotation.y = enemy.heading;
      enemy.shootTimer -= dt;
      if (enemy.shootTimer <= 0 && dist < 48 && G.player.health > 0) {
        enemy.shootTimer = range(rng, 1.4, 2.6);
        G.audio.enemyShot();
        const from = new THREE.Vector3(enemy.pos.x, 1.3, enemy.pos.z);
        const to = new THREE.Vector3(targetPos.x, 1.2, targetPos.z);
        makeTracer(from, to, 0xff6a5a);
        const hitChance = enemy.boss ? 0.42 : 0.26;
        if (rng() < hitChance) G.player.takeDamage(Math.round(range(rng, 7, 12)));
      }
    }
  };

  return combat;
}

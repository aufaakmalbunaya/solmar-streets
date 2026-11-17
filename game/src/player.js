// Jax Moreno on foot: a simple box-built character, WASD movement relative to the
// camera, Shift to sprint, F to punch, E to get in and out of cars. While driving,
// the character mesh hides and the car takes over.
import * as THREE from 'three';
import { PLAYER } from './config.js';
import { clampToCity, resolveCircle } from './city.js';

function buildCharacter(shirtColor, skinColor = 0xc98d64) {
  const group = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: shirtColor });
  const skin = new THREE.MeshLambertMaterial({ color: skinColor });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2e3440 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.34), shirt);
  torso.position.y = 1.15;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), skin);
  head.position.y = 1.72;
  group.add(head);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.38),
    new THREE.MeshLambertMaterial({ color: 0x1c1410 }));
  hair.position.y = 1.94;
  group.add(hair);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.78, 0.26), pants);
  legL.position.set(-0.16, 0.39, 0);
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.16;
  group.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.2), shirt);
  armL.position.set(-0.42, 1.18, 0);
  group.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.42;
  group.add(armR);
  return { group, legL, legR, armL, armR };
}

export function createPlayer(G) {
  const built = buildCharacter(0x3a7d5c);
  const group = built.group;
  G.scene.add(group);
  const player = {
    group,
    parts: built,
    pos: new THREE.Vector3(10, 0, 30),
    heading: 0,
    speed: 0,
    onFoot: true,
    car: null,
    health: PLAYER.maxHealth,
    lastDamageAt: -100,
    walkPhase: 0,
    punchTimer: 0,
    punchCooldown: 0,
  };

  player.reset = (x, z, heading) => {
    player.pos.set(x, 0, z);
    player.heading = heading;
    player.onFoot = true;
    player.car = null;
    player.health = PLAYER.maxHealth;
    group.visible = true;
  };

  player.enterCar = (car) => {
    player.car = car;
    player.onFoot = false;
    car.driver = 'player';
    group.visible = false;
    G.audio.ensure();
  };

  player.exitCar = () => {
    const car = player.car;
    if (!car) return;
    car.driver = null;
    player.car = null;
    player.onFoot = true;
    // Step out to the left of the car.
    const sideX = Math.cos(car.heading);
    const sideZ = -Math.sin(car.heading);
    player.pos.set(car.pos.x + sideX * 2.4, 0, car.pos.z + sideZ * 2.4);
    player.heading = car.heading;
    group.visible = true;
    G.audio.ensure();
  };

  player.takeDamage = (amount) => {
    if (player.health <= 0) return;
    player.health = Math.max(0, player.health - amount);
    player.lastDamageAt = G.time;
    G.hud.flashDamage();
    if (player.health <= 0) G.setScreen('wasted');
  };

  player.update = (dt) => {
    if (!player.onFoot) {
      group.position.copy(player.pos);
      return;
    }
    const move = G.input.move();
    const camYaw = G.cameraYaw;
    // WASD moves relative to where the camera looks.
    const forwardX = -Math.sin(camYaw);
    const forwardZ = -Math.cos(camYaw);
    const rightX = Math.cos(camYaw);
    const rightZ = -Math.sin(camYaw);
    let mx = forwardX * move.forward + rightX * move.strafe;
    let mz = forwardZ * move.forward + rightZ * move.strafe;
    const len = Math.hypot(mx, mz);
    const speed = move.sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    if (len > 0.01) {
      mx /= len;
      mz /= len;
      player.pos.x += mx * speed * dt;
      player.pos.z += mz * speed * dt;
      player.heading = Math.atan2(mx, mz);
      player.speed = speed;
      player.walkPhase += dt * speed * 1.6;
    } else {
      player.speed = 0;
      player.walkPhase *= 0.8;
    }
    resolveCircle(player.pos, PLAYER.radius, G.city.colliders);
    clampToCity(player.pos);
    // Slow health recovery when no one has hurt Jax for a while.
    if (G.time - player.lastDamageAt > 6 && player.health > 0 && player.health < PLAYER.maxHealth) {
      player.health = Math.min(PLAYER.maxHealth, player.health + 2.5 * dt);
    }
    player.punchTimer = Math.max(0, player.punchTimer - dt);
    player.punchCooldown = Math.max(0, player.punchCooldown - dt);
    // Pose: legs swing while walking, arms swing with the punch.
    const swing = Math.sin(player.walkPhase) * (player.speed > 0 ? 0.55 : 0);
    built.legL.rotation.x = swing;
    built.legR.rotation.x = -swing;
    built.armL.rotation.x = -swing * 0.7;
    built.armR.rotation.x = swing * 0.7;
    if (player.punchTimer > 0) built.armR.rotation.x = -1.6;
    group.position.copy(player.pos);
    group.rotation.y = player.heading;
  };

  return player;
}

export { buildCharacter };

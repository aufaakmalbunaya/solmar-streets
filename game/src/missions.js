// The story: twelve jobs for Mama Rosa, from a first errand to the final
// takedown of Detective Voss. Each mission is one objective with a glowing
// marker in the world, a line of dialogue, and a cash reward. Progress is
// saved, so the chain survives a reload. Jobs 8 and 10 are timed runs:
// reach the target before the backup arrives, or the job fails and must be
// tried again.
//
// NOTE: every target/start/deliver point sits on open ground OUTSIDE the
// buildings' colliders (the café and the garage are solid boxes). A point inside
// a collider can never be reached, and the mission would never complete.
import * as THREE from 'three';

const MISSION_DEFS = [
  {
    id: 1,
    name: 'First Errand',
    giver: 'Mama Rosa',
    start: { x: 10, z: 60 },
    target: { x: 10, z: 70 },
    type: 'goto',
    reward: 150,
    brief: [
      'Mama Rosa: "Jax. Five years, and you come back owing me."',
      'Mama Rosa: "One errand and we call it even. Come to the café."',
    ],
    objective: 'Meet Mama Rosa at Café Solmar',
    doneLine: 'Mama Rosa: "Good boy. Take this pistol — Solmar is not kind to the unarmed."',
  },
  {
    id: 2,
    name: 'Hot Wheels',
    giver: 'Mama Rosa',
    start: { x: 10, z: 70 },
    type: 'steal',
    deliver: { x: 104, z: -38 },
    reward: 300,
    brief: [
      'Mama Rosa: "The Lobos took my nephew\'s coupe. It is parked uptown, yellow."',
      'Mama Rosa: "Bring it to the garage on the east side. Quietly, if you can."',
    ],
    objective: 'Steal the yellow coupe and deliver it to the garage',
    doneLine: 'Mama Rosa: "Clean work. The garage pays, I pay you."',
  },
  {
    id: 3,
    name: 'Lobo Trouble',
    giver: 'Mama Rosa',
    start: { x: 10, z: 70 },
    target: { x: -104, z: 116 },
    type: 'kill',
    count: 3,
    reward: 500,
    brief: [
      'Mama Rosa: "The Lobos are shaking down the dock workers again."',
      'Mama Rosa: "Go to the docks. Make them leave Solmar alone."',
    ],
    objective: 'Take out the Lobos at the docks (0/3)',
    doneLine: 'Mama Rosa: "The docks are quiet tonight. You did well, Jax."',
  },
  {
    id: 4,
    name: 'The Getaway',
    giver: 'Mama Rosa',
    start: { x: 10, z: 70 },
    pickup: { x: 52, z: 130 },
    drop: { x: 10, z: 70 },
    type: 'deliver',
    reward: 800,
    brief: [
      'Mama Rosa: "A package waits at the marina. The police know about it too."',
      'Mama Rosa: "Grab it, lose the heat, bring it to me. Drive fast."',
    ],
    objective: 'Pick up the package at the marina',
    doneLine: 'Mama Rosa: "You outran them all. That is the Jax I remember."',
  },
  {
    id: 5,
    name: "Voss's Trap",
    giver: 'Mama Rosa',
    start: { x: 10, z: 70 },
    target: { x: 0, z: 172 },
    type: 'kill',
    count: 6,
    boss: true,
    reward: 1500,
    brief: [
      'Mama Rosa: "Detective Voss set a trap at the pier. The Lobos wait with her."',
      'Mama Rosa: "End this, Jax. Then Solmar is yours again."',
    ],
    objective: 'Defeat the Lobos on the pier (0/6)',
    doneLine: 'Mama Rosa: "It is done. Solmar is yours again, Jax."',
  },
  {
    id: 6,
    name: 'The Stash',
    giver: 'Mama Rosa',
    start: { x: 10, z: 70 },
    pickup: { x: -104, z: 116 },
    drop: { x: 10, z: 70 },
    type: 'deliver',
    reward: 1200,
    brief: [
      'Mama Rosa: "The Lobos hid my money in a container at the docks."',
      'Mama Rosa: "Take it back. The police will be watching — lose them first."',
    ],
    objective: 'Recover the stash at the docks',
    doneLine: 'Mama Rosa: "Every dollar back. You are earning your place, Jax."',
  },
  {
    id: 7,
    name: 'Harbor Heat',
    giver: 'Mama Rosa',
    start: { x: 10, z: 70 },
    target: { x: 52, z: 130 },
    type: 'kill',
    count: 4,
    reward: 1800,
    brief: [
      'Mama Rosa: "The Lobos moved into the marina. They think the boats hide them."',
      'Mama Rosa: "Clear them out, Jax. All four."',
    ],
    objective: 'Clear the Lobos from the marina (0/4)',
    doneLine: 'Mama Rosa: "The marina is ours again. The fishermen will sleep tonight."',
  },
  {
    id: 8,
    name: "The Voss File",
    giver: 'Mama Rosa',
    start: { x: 10, z: 70 },
    target: { x: 0, z: 172 },
    type: 'timed',
    timeLimit: 75,
    wanted: 3,
    reward: 2500,
    brief: [
      'Mama Rosa: "Voss keeps a file on me at the end of the pier."',
      'Mama Rosa: "Her backup is coming. Get there in 75 seconds — drive like the city is yours."',
    ],
    objective: 'Reach the pier before Voss’s backup arrives',
    doneLine: 'Mama Rosa: "The file is ash, Jax. Voss has nothing on us now."',
  },
  {
    id: 9,
    name: 'Payday Run',
    giver: 'Mama Rosa',
    start: { x: 10, z: 70 },
    pickup: { x: 104, z: -38 },
    drop: { x: 10, z: 70 },
    type: 'deliver',
    reward: 2200,
    brief: [
      'Mama Rosa: "The garage boys are holding my cut from the east side."',
      'Mama Rosa: "Pick it up at the garage. The police watch that street — lose them first."',
    ],
    objective: 'Collect the cut at the east garage',
    doneLine: 'Mama Rosa: "Counted and clean. You are not just muscle, Jax."',
  },
  {
    id: 10,
    name: 'The Long Cut',
    giver: 'Mama Rosa',
    start: { x: 10, z: 70 },
    target: { x: -104, z: 156 },
    type: 'timed',
    timeLimit: 90,
    wanted: 2,
    reward: 2500,
    brief: [
      'Mama Rosa: "Voss is closing the net. My safehouse on the west beach is the only clean bed tonight."',
      'Mama Rosa: "Ninety seconds, Jax. Do not stop for anyone."',
    ],
    objective: 'Reach Rosa’s safehouse on the west beach',
    doneLine: 'Mama Rosa: "Breathe, Jax. Behind this door, Voss does not exist."',
  },
  {
    id: 11,
    name: 'Harbor Revenge',
    giver: 'Mama Rosa',
    start: { x: 10, z: 70 },
    target: { x: -104, z: 116 },
    type: 'kill',
    count: 5,
    boss: true,
    reward: 2800,
    brief: [
      'Mama Rosa: "The Lobos came back to the docks with a new boss. They took the night shift hostage."',
      'Mama Rosa: "Five of them, Jax. Make the docks ours for good."',
    ],
    objective: 'Drive the Lobos out of the docks (0/5)',
    doneLine: 'Mama Rosa: "The dock workers are free. The Lobos will not come back."',
  },
  {
    id: 12,
    name: 'The Voss Takedown',
    giver: 'Mama Rosa',
    start: { x: 10, z: 70 },
    target: { x: 0, z: 172 },
    type: 'kill',
    count: 8,
    boss: true,
    reward: 4000,
    brief: [
      'Mama Rosa: "Voss brought her whole crew to the pier to end this tonight."',
      'Mama Rosa: "Eight of them, Jax. End it, and Solmar is ours for good."',
    ],
    objective: 'Defeat Voss’s crew on the pier (0/8)',
    doneLine: 'Mama Rosa: "It is over, Jax. Solmar is ours — all of it, for good."',
  },
];

export function createMissions(G) {
  const missions = {
    defs: MISSION_DEFS,
    index: 0,
    stage: 'idle', // idle | active | done
    killsLeft: 0,
    killsTotal: 0,
    hasPackage: false,
    timeLeft: 0,
    hotToastAt: -100,
    target: null,
  };

  // The marker: a glowing ring on the ground, a beam of light, a spinning diamond.
  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.2, 0.25, 24),
    new THREE.MeshLambertMaterial({ color: 0xffc93c, emissive: 0xaa7700, transparent: true, opacity: 0.85 }),
  );
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 34, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = 17;
  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.9),
    new THREE.MeshLambertMaterial({ color: 0xffc93c, emissive: 0xaa7700 }),
  );
  diamond.position.y = 6;
  const marker = new THREE.Group();
  marker.add(ring, beam, diamond);
  marker.visible = false;
  G.scene.add(marker);
  missions.marker = marker;

  function currentDef() {
    return MISSION_DEFS[missions.index] ?? null;
  }

  function setTarget(pos) {
    missions.target = pos;
    marker.position.set(pos.x, 0, pos.z);
    marker.visible = true;
  }

  missions.currentObjective = () => {
    const def = currentDef();
    if (!def) return { title: 'Free roam', text: 'The story is done. Solmar is yours — drive, explore, stay out of trouble.' };
    if (missions.stage === 'idle') {
      return { title: `Job ${def.id}: ${def.name}`, text: `Go to the marker to start — ${def.giver} is waiting.` };
    }
    if (def.type === 'kill') {
      const done = missions.killsTotal - missions.killsLeft;
      return { title: `Job ${def.id}: ${def.name}`, text: `Take out the Lobos (${done}/${missions.killsTotal})` };
    }
    if (def.type === 'steal' && missions.stage === 'deliver') {
      return { title: `Job ${def.id}: ${def.name}`, text: 'Deliver the coupe to the garage on the east side' };
    }
    if (def.type === 'deliver' && missions.hasPackage) {
      return { title: `Job ${def.id}: ${def.name}`, text: 'Lose the police, then bring the package to Mama Rosa' };
    }
    if (def.type === 'timed') {
      const left = Math.max(0, Math.ceil(missions.timeLeft));
      return { title: `Job ${def.id}: ${def.name}`, text: `Reach the pier before backup arrives — ${left}s left` };
    }
    return { title: `Job ${def.id}: ${def.name}`, text: def.objective };
  };

  missions.start = () => {
    const def = currentDef();
    if (!def) return;
    // A job already running cannot start twice: a second start would add
    // the wanted level again and spawn a second set of enemies.
    if (missions.stage === 'active') return;
    missions.stage = 'active';
    G.hud.dialogue(def.brief);
    if (def.type === 'goto') setTarget(def.target);
    if (def.type === 'steal') setTarget({ x: 52, z: 66 });
    if (def.type === 'kill') {
      setTarget(def.target);
      missions.killsTotal = def.count;
      missions.killsLeft = def.count;
      G.combat.spawnEnemies(def.target, def.count, !!def.boss);
    }
    if (def.type === 'deliver') setTarget(def.pickup);
    if (def.type === 'timed') {
      setTarget(def.target);
      missions.timeLeft = def.timeLimit;
      G.police.addWanted(def.wanted ?? 3, 'Voss called it in — the whole PD is looking for you');
    }
  };

  missions.complete = () => {
    const def = currentDef();
    if (!def) return;
    G.cash += def.reward;
    G.audio.missionDone();
    G.audio.cash();
    G.hud.toast(`Job done: ${def.name} — +$${def.reward}`);
    G.hud.dialogue([def.doneLine]);
    missions.index += 1;
    missions.stage = 'idle';
    missions.hasPackage = false;
    missions.killsLeft = 0;
    if (def.id === 1) {
      G.hasPistol = true;
      G.combat.weapons.pistol.ammo = 12;
      G.combat.syncAmmo();
      G.hud.toast('Pistol received — click to shoot, R to reload');
    }
    // Story progress unlocks weapons: the SMG after job 3, the shotgun after job 6.
    G.combat.unlockForProgress(missions.index);
    G.saveGame();
    if (missions.index >= MISSION_DEFS.length) {
      marker.visible = false;
      G.setScreen('story');
    } else {
      setTarget(currentDef().start);
    }
  };

  missions.onKill = () => {
    if (missions.stage !== 'active') return;
    const def = currentDef();
    if (!def || def.type !== 'kill') return;
    missions.killsLeft -= 1;
    if (missions.killsLeft <= 0) missions.complete();
  };

  missions.onEnterCar = (car) => {
    const def = currentDef();
    if (!def || missions.stage !== 'active' || def.type !== 'steal') return;
    if (car.kind === 'mission') {
      missions.stage = 'deliver';
      setTarget(def.deliver);
      G.hud.toast('The coupe is yours. Get it to the garage — quietly.');
    }
  };

  missions.reset = (index) => {
    missions.index = index;
    missions.stage = 'idle';
    missions.hasPackage = false;
    missions.killsLeft = 0;
    missions.timeLeft = 0;
    // A loaded save keeps the weapons its progress earned.
    G.combat.unlockForProgress(index);
    const def = currentDef();
    if (def) setTarget(def.start);
    else marker.visible = false;
  };

  missions.update = (dt) => {
    const def = currentDef();
    if (!def) return;
    diamond.rotation.y += dt * 2;
    const pulse = 1 + Math.sin(G.time * 3) * 0.08;
    ring.scale.set(pulse, 1, pulse);
    const playerPos = G.player.car ? G.player.car.pos : G.player.pos;
    const dist = Math.hypot(playerPos.x - marker.position.x, playerPos.z - marker.position.z);
    if (missions.stage === 'idle') {
      if (dist < 7) missions.start();
      return;
    }
    if (def.type === 'goto' && dist < 6) missions.complete();
    if (def.type === 'timed') {
      missions.timeLeft -= dt;
      if (missions.timeLeft <= 0) {
        // Too slow: the job fails and must be started again at the café.
        missions.stage = 'idle';
        missions.timeLeft = 0;
        setTarget(def.start);
        G.hud.toast('Too slow — Voss’s backup arrived. Try the run again.');
        G.audio.busted();
        return;
      }
      if (dist < 6) missions.complete();
    }
    if (def.type === 'steal' && missions.stage === 'deliver' && dist < 8) missions.complete();
    if (def.type === 'deliver') {
      if (!missions.hasPackage && dist < 6) {
        missions.hasPackage = true;
        setTarget(def.drop);
        G.police.addWanted(2, 'The package is hot — the police are coming');
        G.hud.toast('Package grabbed. Lose the heat, then deliver it.');
      } else if (missions.hasPackage && dist < 7) {
        // The brief says to lose the heat first: a hot delivery is refused.
        if (G.wanted === 0) {
          missions.complete();
        } else if (G.time - missions.hotToastAt > 4) {
          missions.hotToastAt = G.time;
          G.hud.toast('Too hot — lose the police first, then deliver.');
        }
      }
    }
  };

  return missions;
}

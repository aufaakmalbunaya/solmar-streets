// The story: five jobs for Mama Rosa, from a first errand to a final stand on the
// pier. Each mission is one objective with a glowing marker in the world, a line
// of dialogue, and a cash reward. Progress is saved, so the chain survives a
// reload.
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
];

export function createMissions(G) {
  const missions = {
    defs: MISSION_DEFS,
    index: 0,
    stage: 'idle', // idle | active | done
    killsLeft: 0,
    killsTotal: 0,
    hasPackage: false,
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
    return { title: `Job ${def.id}: ${def.name}`, text: def.objective };
  };

  missions.start = () => {
    const def = currentDef();
    if (!def) return;
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
      G.ammo = 12;
      G.hud.toast('Pistol received — click to shoot, R to reload');
    }
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

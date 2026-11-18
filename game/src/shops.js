// Shops and the safehouse: three beachfront buildings Jax can walk up to.
// Big Iron Guns sells ammo, Doc Sal's sells health and a NOS refill, and
// Rosa's Safehouse clears the wanted level and heals for free. Buying is by
// key while standing at the shop front (the HUD shows the keys); a purchase
// the player cannot afford, or has not unlocked, is refused with a toast.
// The safehouse is the one place the police cannot follow Jax.
import * as THREE from 'three';
import { SHOP_PRICES, SHOP_RADIUS, SHOPS, WEAPONS } from './config.js';

function makeSignTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1c222c';
  ctx.fillRect(0, 0, 512, 96);
  ctx.strokeStyle = '#ffb347';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 88);
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 52);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createShops(G) {
  const shops = { list: [] };

  for (const def of Object.values(SHOPS)) {
    const group = new THREE.Group();
    const wallMat = new THREE.MeshLambertMaterial({ color: def.color });
    const body = new THREE.Mesh(new THREE.BoxGeometry(12, 7, 10), wallMat);
    body.position.y = 3.5;
    group.add(body);
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(13, 0.5, 11),
      new THREE.MeshLambertMaterial({ color: 0x2a2d33 }),
    );
    roof.position.y = 7.25;
    group.add(roof);
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(12.5, 0.4, 3),
      new THREE.MeshLambertMaterial({ color: def.awning }),
    );
    awning.position.set(0, 4.6, -5.8);
    group.add(awning);
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 4.2, 0.3),
      new THREE.MeshLambertMaterial({ color: 0x22242a }),
    );
    door.position.set(0, 2.1, -5.1);
    group.add(door);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 2.1),
      new THREE.MeshBasicMaterial({ map: makeSignTexture(def.sign) }),
    );
    sign.position.set(0, 5.9, -5.15);
    sign.rotation.y = Math.PI;
    group.add(sign);
    // The safehouse gets a warm porch light so it reads as a refuge at night.
    if (def.key === 'safehouse') {
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 8, 8),
        new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0xaa8833 }),
      );
      lamp.position.set(2.2, 4.4, -5.4);
      group.add(lamp);
    }
    group.position.set(def.x, 0, def.z);
    G.scene.add(group);
    // Solid walls: Jax and cars walk and drive around the shop, not through it.
    G.city.colliders.push({
      x0: def.x - 6, z0: def.z - 5, x1: def.x + 6, z1: def.z + 5,
    });
    shops.list.push({ ...def, group });
  }

  // The closest shop whose front Jax is standing at, or null.
  shops.nearest = (pos) => {
    let best = null;
    let bestDist = SHOP_RADIUS;
    for (const shop of shops.list) {
      const d = Math.hypot(pos.x - shop.front.x, pos.z - shop.front.z);
      if (d < bestDist) { bestDist = d; best = shop; }
    }
    return best;
  };

  // What the HUD shows while Jax stands at a shop front.
  shops.hintFor = (shop) => {
    if (!shop) return '';
    if (shop.key === 'gun') {
      return `Big Iron Guns — 4 Pistol ammo $${SHOP_PRICES.pistolAmmo} · 5 SMG ammo $${SHOP_PRICES.smgAmmo} · 6 Shotgun shells $${SHOP_PRICES.shotgunAmmo}`;
    }
    if (shop.key === 'clinic') {
      return `Doc Sal's — 7 Heal to full $${SHOP_PRICES.heal} · 8 NOS refill $${SHOP_PRICES.nosRefill}`;
    }
    return "Rosa's Safehouse — press H to lay low: clears wanted, heals to full";
  };

  function takeCash(price, what) {
    if (G.cash < price) {
      G.hud.toast(`Not enough cash for ${what} — you have $${G.cash}.`);
      return false;
    }
    G.cash -= price;
    return true;
  }

  function buyAmmo(weapon, price) {
    const state = G.combat.weapons[weapon];
    if (!state.unlocked) {
      G.hud.toast(`${WEAPONS[weapon].name} locked — finish the job that earns it first.`);
      return false;
    }
    if (!takeCash(price, `${WEAPONS[weapon].name} ammo`)) return false;
    state.ammo = WEAPONS[weapon].magazine;
    G.combat.syncAmmo();
    G.audio.pickup();
    G.hud.toast(`${WEAPONS[weapon].name} ammo restocked — $${price}`);
    G.saveGame();
    return true;
  }

  shops.buy = (key) => {
    const shop = shops.nearest(G.player.pos);
    if (!shop || !G.player.onFoot) return false;
    if (shop.key === 'gun') {
      if (key === 'pistol') return buyAmmo('pistol', SHOP_PRICES.pistolAmmo);
      if (key === 'smg') return buyAmmo('smg', SHOP_PRICES.smgAmmo);
      if (key === 'shotgun') return buyAmmo('shotgun', SHOP_PRICES.shotgunAmmo);
      return false;
    }
    if (shop.key === 'clinic') {
      if (key === 'heal') {
        if (G.player.health >= 100) {
          G.hud.toast('Already at full health.');
          return false;
        }
        if (!takeCash(SHOP_PRICES.heal, 'a full heal')) return false;
        G.player.health = 100;
        G.audio.pickup();
        G.hud.toast(`Doc Sal patched you up — $${SHOP_PRICES.heal}`);
        G.saveGame();
        return true;
      }
      if (key === 'nos') {
        if (G.player.nos >= 100) {
          G.hud.toast('NOS tank is already full.');
          return false;
        }
        if (!takeCash(SHOP_PRICES.nosRefill, 'a NOS refill')) return false;
        G.player.nos = 100;
        G.audio.pickup();
        G.hud.toast(`NOS tank refilled — $${SHOP_PRICES.nosRefill}`);
        G.saveGame();
        return true;
      }
      return false;
    }
    return false;
  };

  // Lay low at the safehouse: the heat is gone, Jax is healed, the police
  // pack up and leave. Free — it is Rosa's place, and she owes him one.
  shops.useSafehouse = () => {
    const shop = shops.nearest(G.player.pos);
    if (!shop || shop.key !== 'safehouse' || !G.player.onFoot) return false;
    if (G.wanted === 0 && G.player.health >= 100) {
      G.hud.toast('Already clean and healthy — Solmar is yours tonight.');
      return false;
    }
    G.police.clear();
    G.player.health = 100;
    G.audio.pickup();
    G.hud.toast('Safehouse — the heat is off and you are patched up. Lay low, Jax.');
    G.saveGame();
    return true;
  };

  return shops;
}

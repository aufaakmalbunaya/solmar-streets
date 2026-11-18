// Keyboard and mouse state. Keys are tracked by e.code ('KeyW', 'ShiftLeft', ...).
// `pressed` holds keys that went down since the last frame (edge-triggered, for E, F,
// P, M, R). Mouse drag rotates the camera; the wheel zooms it. A scripted driver
// (the screenshot scenes) can override movement through `script`, which the game
// reads before the real keys.
export function createInput(canvas) {
  const input = {
    keys: new Set(),
    pressed: new Set(),
    mouseDX: 0,
    mouseDY: 0,
    wheel: 0,
    mouseDown: false,
    dragging: false,
    script: null, // { forward: -1|0|1, steer: -1..1, sprint: bool } or null
    locked: false,
  };

  const down = (event) => {
    if (event.repeat) return;
    input.keys.add(event.code);
    input.pressed.add(event.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  };
  const up = (event) => input.keys.delete(event.code);
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', () => input.keys.clear());

  canvas.addEventListener('mousedown', (event) => {
    input.mouseDown = true;
    input.dragging = true;
    // Pointer lock gives smooth mouse-look while playing; dragging still works
    // when the lock is refused (headless browsers, iframes). requestPointerLock
    // returns a promise in newer browsers: a refusal is an async rejection,
    // not a sync throw, so catch that too or it surfaces as an uncaught error.
    try {
      const lock = canvas.requestPointerLock();
      if (lock && typeof lock.catch === 'function') lock.catch(() => {});
    } catch {
      // No pointer lock here; drag-look is the fallback.
    }
    event.preventDefault();
  });
  window.addEventListener('mouseup', () => {
    input.mouseDown = false;
    input.dragging = false;
  });
  window.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement === canvas) {
      input.mouseDX += event.movementX;
      input.mouseDY += event.movementY;
    } else if (input.dragging) {
      input.mouseDX += event.movementX;
      input.mouseDY += event.movementY;
    }
  });
  canvas.addEventListener('wheel', (event) => {
    input.wheel += event.deltaY;
    event.preventDefault();
  }, { passive: false });
  document.addEventListener('pointerlockchange', () => {
    input.locked = document.pointerLockElement === canvas;
  });

  input.isDown = (code) => input.keys.has(code);
  input.wasPressed = (code) => input.pressed.has(code);

  // Movement intent, scripted driver first, then the real keys. Returns
  // { forward: -1..1, strafe: -1..1, steer: -1..1, sprint: bool }.
  input.move = () => {
    if (input.script) return input.script;
    const forward = (input.isDown('KeyW') || input.isDown('ArrowUp') ? 1 : 0)
      - (input.isDown('KeyS') || input.isDown('ArrowDown') ? 1 : 0);
    const strafe = (input.isDown('KeyD') || input.isDown('ArrowRight') ? 1 : 0)
      - (input.isDown('KeyA') || input.isDown('ArrowLeft') ? 1 : 0);
    return {
      forward,
      strafe,
      steer: strafe,
      sprint: input.isDown('ShiftLeft') || input.isDown('ShiftRight'),
      brake: input.isDown('Space'),
    };
  };

  // Call once per frame, after the game has read the state.
  input.endFrame = () => {
    input.pressed.clear();
    input.mouseDX = 0;
    input.mouseDY = 0;
    input.wheel = 0;
  };

  return input;
}

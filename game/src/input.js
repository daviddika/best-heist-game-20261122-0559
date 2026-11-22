// Keyboard and mouse input for the heist: WASD / arrows to move, Shift to sneak,
// E to use or crack, Q (or right-click) to toss a coin, F to hack a camera,
// P to pause, M to mute, Enter / Space / click to confirm on menus.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_USE = 4;
export const ACTION_COIN = 8;
export const ACTION_HACK = 16;
export const ACTION_MUTE = 32;

const MOVE_KEYS = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let click = null;
  let coinClick = false;

  function onKeyDown(event) {
    if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
    if (event.repeat) return;
    held.add(event.code);
    if (event.code === 'Enter' || event.code === 'Space') actions |= ACTION_CONFIRM;
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'KeyE') actions |= ACTION_USE;
    if (event.code === 'KeyQ') actions |= ACTION_COIN;
    if (event.code === 'KeyF') actions |= ACTION_HACK;
    if (event.code === 'KeyM') actions |= ACTION_MUTE;
  }

  function onKeyUp(event) {
    held.delete(event.code);
  }

  function onMouseDown(event) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);
    if (event.button === 2) {
      coinClick = true;
      return;
    }
    click = { x, y };
  }

  function onContextMenu(event) {
    event.preventDefault();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('contextmenu', onContextMenu);

  return {
    // Normalised movement direction from the keys currently held.
    direction() {
      let x = 0;
      let y = 0;
      for (const code of held) {
        const move = MOVE_KEYS[code];
        if (move) {
          x += move[0];
          y += move[1];
        }
      }
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      const length = Math.hypot(x, y);
      return { x: x / length, y: y / length };
    },
    sneaking() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      if (coinClick) {
        coinClick = false;
        return taken | ACTION_COIN;
      }
      return taken;
    },
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
  };
}

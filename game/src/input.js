// Skyhook Run — keyboard and mouse: arrows or WASD fly the plane,
// Shift and Ctrl work the throttle, the mouse steers when it moves,
// and the rest of the keys run the menus.

export function createInput(canvas) {
  const keys = new Set();
  const input = {
    keys,
    // Mouse steering: -1..1 off centre, 0 when the mouse is still.
    mouseX: 0,
    mouseY: 0,
    mouseActive: false,
    mouseDown: false,
    // Last mouse position in canvas pixels, for menu hover.
    mousePx: 0,
    mousePy: 0,
    // Click position for menu buttons, consumed by the game loop.
    click: null,
    // The last key pressed, consumed by the game loop.
    pressed: null,
  };

  window.addEventListener('keydown', (event) => {
    const code = event.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
      event.preventDefault();
    }
    if (!event.repeat) input.pressed = code;
    keys.add(code);
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    keys.clear();
    input.mouseActive = false;
  });

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    input.mouseX = Math.max(-1, Math.min(1, (event.clientX - cx) / (rect.width / 2)));
    input.mouseY = Math.max(-1, Math.min(1, (event.clientY - cy) / (rect.height / 2)));
    input.mousePx = event.clientX - rect.left;
    input.mousePy = event.clientY - rect.top;
    input.mouseActive = true;
  });
  canvas.addEventListener('mousedown', (event) => {
    input.mouseDown = true;
    const rect = canvas.getBoundingClientRect();
    input.click = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  });
  window.addEventListener('mouseup', () => {
    input.mouseDown = false;
  });
  return input;
}

/** The stick position this frame: keyboard wins, the mouse blends in. */
export function readStick(input) {
  let pitch = 0;
  let roll = 0;
  if (input.keys.has('ArrowUp') || input.keys.has('KeyW')) pitch += 1;
  if (input.keys.has('ArrowDown') || input.keys.has('KeyS')) pitch -= 1;
  if (input.keys.has('ArrowLeft') || input.keys.has('KeyA')) roll -= 1;
  if (input.keys.has('ArrowRight') || input.keys.has('KeyD')) roll += 1;
  if (input.mouseActive) {
    // Mouse up is nose up; mouse left banks left.
    const mp = -input.mouseY;
    const mr = input.mouseX;
    if (pitch === 0) pitch = mp * 0.85;
    else pitch = Math.max(-1, Math.min(1, pitch + mp * 0.4));
    if (roll === 0) roll = mr * 0.85;
    else roll = Math.max(-1, Math.min(1, roll + mr * 0.4));
  }
  let throttleDelta = 0;
  if (input.keys.has('ShiftLeft') || input.keys.has('ShiftRight') || input.keys.has('Equal')) {
    throttleDelta += 1;
  }
  if (input.keys.has('ControlLeft') || input.keys.has('ControlRight') || input.keys.has('Minus')) {
    throttleDelta -= 1;
  }
  return { pitch, roll, throttleDelta };
}

/** True once when the key was pressed since the last check. */
export function wasPressed(input, code) {
  if (input.pressed === code) {
    input.pressed = null;
    return true;
  }
  return false;
}

/** Take and clear the pending click, if any. */
export function takeClick(input) {
  const click = input.click;
  input.click = null;
  return click;
}

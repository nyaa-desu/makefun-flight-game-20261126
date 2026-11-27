// Keyboard and mouse: arrows or WASD to steer, Shift/Ctrl for throttle,
// F for flaps, C for the camera, M to mute, P to pause, R to restart,
// 1/2/3 to pick a mission. The mouse steers too — move it and the
// Kestrel follows. All state lives in one object the loop reads.

export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: 0.5, y: 0.5, active: false, inside: false };

  function code(e) {
    return e.code || e.key;
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code(e))) {
      e.preventDefault();
    }
    keys.add(code(e));
  });
  window.addEventListener('keyup', (e) => keys.delete(code(e)));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) / Math.max(1, rect.width);
    mouse.y = (e.clientY - rect.top) / Math.max(1, rect.height);
    mouse.active = true;
    mouse.inside = true;
  });
  canvas.addEventListener('pointerleave', () => {
    mouse.inside = false;
  });
  canvas.addEventListener('pointerdown', () => {
    mouse.active = true;
  });

  // A key pressed this frame: the loop clears the set after reading it.
  const pressed = new Set();
  window.addEventListener('keydown', (e) => pressed.add(code(e)));

  return {
    keys,
    mouse,
    pressed,
    clearPressed() {
      pressed.clear();
    },
    // Steering axes in [-1, 1]: positive pitch climbs, positive roll banks right.
    axes() {
      let pitch = 0;
      let roll = 0;
      if (keys.has('ArrowUp') || keys.has('KeyW')) pitch += 1;
      if (keys.has('ArrowDown') || keys.has('KeyS')) pitch -= 1;
      if (keys.has('ArrowLeft') || keys.has('KeyA')) roll -= 1;
      if (keys.has('ArrowRight') || keys.has('KeyD')) roll += 1;
      // The mouse steers when no arrow key is held: left/right banks,
      // up/down pitches, measured from the centre of the screen.
      if (pitch === 0 && roll === 0 && mouse.active && mouse.inside) {
        roll = (mouse.x - 0.5) * 2;
        pitch = (0.5 - mouse.y) * 2;
        roll = Math.max(-1, Math.min(1, roll));
        pitch = Math.max(-1, Math.min(1, pitch));
      }
      return {
        pitch,
        roll,
        throttleUp: keys.has('ShiftLeft') || keys.has('ShiftRight'),
        throttleDown: keys.has('ControlLeft') || keys.has('ControlRight'),
        flaps: keys.has('KeyF'),
      };
    },
    // One-shot keys: true once per physical press.
    wasPressed(...names) {
      return names.some((n) => pressed.has(n));
    },
  };
}

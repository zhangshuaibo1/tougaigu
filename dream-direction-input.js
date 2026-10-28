const DIRECTIONS = new Set(['left', 'right', 'up', 'down']);

// Pointer holds and semantic button activations share a direction set. A
// short activation lets Enter, Space and assistive technology use the same
// native buttons without leaving a direction latched after focus moves.
export function createDirectionInput({ available = () => true, onChange = () => {}, onUp = () => {}, setTimer = setTimeout, clearTimer = clearTimeout, pulseMs = 180 } = {}) {
  const pointers = new Map(), pulses = new Map();
  function stopPulse(direction) {
    const pulse = pulses.get(direction);
    if (pulse) clearTimer(pulse.timer);
    pulses.delete(direction);
  }
  function directions() { return new Set([...pointers.values(), ...pulses.keys()]); }
  return {
    directions,
    pressPointer(pointerId, direction) {
      if (!available() || !DIRECTIONS.has(direction)) return false;
      stopPulse(direction);
      pointers.set(pointerId, direction);
      if (direction === 'up') onUp();
      onChange();
      return true;
    },
    releasePointer(pointerId) {
      if (!pointers.delete(pointerId)) return false;
      onChange();
      return true;
    },
    activate(direction, event) {
      // A pointer's synthetic click follows pointerup. Replaying it here
      // would move the character once more after the player let go.
      if (!available() || !DIRECTIONS.has(direction) || event?.detail !== 0 || event.pointerType) return false;
      stopPulse(direction);
      const pulse = {};
      pulses.set(direction, pulse);
      pulse.timer = setTimer(() => {
        if (pulses.get(direction) !== pulse) return;
        pulses.delete(direction);
        onChange();
      }, pulseMs);
      if (direction === 'up') onUp();
      onChange();
      return true;
    },
    reset() {
      for (const direction of pulses.keys()) stopPulse(direction);
      pointers.clear();
      onChange();
    },
  };
}

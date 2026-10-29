// A held game control can outlive the result dialog that appears above it.
// Keep the pointer's original surface through pointerup, and reject only a
// modal click that we can associate with an older surface/opening. This is an
// interaction boundary, not an authorization system: unassociated legacy or
// semantic activations retain their existing behavior.

const isObject = value => value !== null && (typeof value === 'object' || typeof value === 'function');
const pointerId = event => {
  const id = event?.pointerId;
  // PointerEvent.pointerId is a signed Web IDL long. -1 denotes a non-pointer
  // activation; zero and the other negative values are not inherently invalid.
  return Number.isInteger(id) && id >= -2147483648 && id <= 2147483647 && id !== -1 ? id : null;
};
const pointerType = event => typeof event?.pointerType === 'string' ? event.pointerType : '';
const compatibleType = (record, event) => !record.pointerType || !pointerType(event) || record.pointerType === pointerType(event);

export function createModalInputGuard({ maxRecords = 32 } = {}) {
  const limit = Number.isInteger(maxRecords) && maxRecords > 0 ? Math.min(64, maxRecords) : 32;
  const origins = new Map();
  let openings = new WeakMap(), generation = 0;
  const openingOf = dialog => isObject(dialog) ? openings.get(dialog) || 0 : 0;

  function reserve() {
    while (origins.size >= limit) {
      // Prefer a completed/cancelled gesture. No active long press expires
      // just because it takes time to finish a chapter.
      const old = [...origins].find(([, record]) => record.phase !== 'active');
      origins.delete(old ? old[0] : origins.keys().next().value);
    }
  }

  function associateClick(event) {
    const id = pointerId(event);
    if (id !== null) {
      const record = origins.get(id);
      return record && compatibleType(record, event) ? record : null;
    }
    // An explicit but invalid/different ID never borrows another pointer.
    // Legacy MouseEvent clicks have no ID at all. Associate one only if there
    // is exactly one unconsumed pointerup, without guessing the latest touch.
    if (event?.pointerId !== undefined) return null;
    const pending = [...origins.values()].filter(record => record.phase === 'released');
    return pending.length === 1 && compatibleType(pending[0], event) ? pending[0] : null;
  }

  return {
    // Call synchronously just before each application showModal(). A dialog
    // managed elsewhere uses opening zero until explicitly registered, so a
    // fresh gesture within that dialog still works normally.
    open(dialog) {
      if (!isObject(dialog)) return false;
      if (generation === Number.MAX_SAFE_INTEGER) {
        // Avoid a theoretical generation alias, without any timer or TTL.
        origins.clear(); openings = new WeakMap(); generation = 0;
      }
      openings.set(dialog, ++generation);
      return generation;
    },

    pointerDown(event, dialog = null) {
      const id = pointerId(event);
      if (id === null) return false;
      // A new real down always replaces the previous use of this pointer ID,
      // including a cancelled or already consumed gesture.
      origins.delete(id);
      if (dialog !== null && !isObject(dialog)) return false;
      reserve();
      origins.set(id, { dialog, opening: openingOf(dialog), pointerType: pointerType(event), phase: 'active' });
      return true;
    },

    pointerUp(event) {
      const record = origins.get(pointerId(event));
      if (!record || !compatibleType(record, event) || record.phase !== 'active') return false;
      // Do not delete here: the browser's click is dispatched after pointerup
      // (and often after lostpointercapture). Its origin is still necessary.
      record.phase = 'released';
      return true;
    },

    pointerCancel(event) {
      const record = origins.get(pointerId(event));
      if (!record || !compatibleType(record, event)) return false;
      // Preserve bounded evidence if a delayed click still arrives. A fresh
      // pointerdown with this ID replaces this tombstone immediately.
      record.phase = 'cancelled';
      return true;
    },

    allowClick(event, dialog = null) {
      // Native keyboard and assistive-technology button activations do not
      // have a pointer origin. Never consume an unrelated held touch for them.
      if (event?.detail === 0 && !pointerType(event)) return true;
      const record = associateClick(event);
      if (!isObject(dialog)) {
        // Scope is new modal activation; ordinary page/game clicks keep their
        // existing handlers. Consume only this click's known ended gesture.
        if (record && record.phase !== 'active') record.phase = 'consumed';
        return true;
      }
      if (!record) return true;
      const allowed = !['cancelled', 'consumed'].includes(record.phase)
        && record.dialog === dialog && record.opening === openingOf(dialog);
      // Keep a bounded consumed tombstone so a second delivery of the same
      // old click cannot activate a dialog. A new down is always accepted.
      record.phase = 'consumed';
      return allowed;
    },

    reset() {
      // Blur/hidden may happen before the browser delivers pointerup. Clearing
      // all origins here would lose the evidence needed to reject that click.
      for (const record of origins.values()) record.phase = 'cancelled';
    },

    get size() { return origins.size; },
  };
}

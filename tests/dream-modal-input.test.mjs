import test from 'node:test';
import assert from 'node:assert/strict';
import { createModalInputGuard } from '../dist/dream-modal-input.js';

const pointer = (pointerId, pointerType = 'touch', detail = 1) => ({ pointerId, pointerType, detail });

test('the real game-to-result release keeps its origin and cannot click through the new modal', () => {
  const guard = createModalInputGuard(), result = {};
  guard.pointerDown(pointer(7), null);
  guard.open(result);
  assert.equal(guard.pointerUp(pointer(7)), true);
  // lostpointercapture is deliberately not a cancellation/reset operation.
  assert.equal(guard.allowClick(pointer(7), result), false);
  assert.equal(guard.allowClick(pointer(7), result), false, 'the old click cannot be delivered a second time');
  guard.pointerDown(pointer(7), result);
  guard.pointerUp(pointer(7));
  assert.equal(guard.allowClick(pointer(7), result), true, 'the next real tap must work');
});

test('a fresh result tap opens a new story while its remaining old delivery cannot advance the story', () => {
  const guard = createModalInputGuard(), result = {}, story = {};
  guard.open(result);
  guard.pointerDown(pointer(2), result); guard.pointerUp(pointer(2));
  assert.equal(guard.allowClick(pointer(2), result), true);
  guard.open(story);
  assert.equal(guard.allowClick(pointer(2), story), false);
  guard.pointerDown(pointer(3), story); guard.pointerUp(pointer(3));
  assert.equal(guard.allowClick(pointer(3), story), true);
});

test('reopening the identical dialog object changes its generation synchronously', () => {
  const guard = createModalInputGuard(), dialog = {};
  const first = guard.open(dialog);
  guard.pointerDown(pointer(4), dialog);
  const second = guard.open(dialog);
  assert.ok(second > first);
  guard.pointerUp(pointer(4));
  assert.equal(guard.allowClick(pointer(4), dialog), false);
  guard.pointerDown(pointer(4), dialog); guard.pointerUp(pointer(4));
  assert.equal(guard.allowClick(pointer(4), dialog), true);
});

test('concurrent pointers retain separate origins and a new tap is not swallowed by an old long press', () => {
  const guard = createModalInputGuard(), dialog = {};
  guard.pointerDown(pointer(11), null);
  guard.open(dialog);
  guard.pointerDown(pointer(12), dialog);
  guard.pointerUp(pointer(12));
  assert.equal(guard.allowClick(pointer(12), dialog), true);
  guard.pointerUp(pointer(11));
  assert.equal(guard.allowClick(pointer(11), dialog), false);
  guard.pointerDown(pointer(13), dialog); guard.pointerDown(pointer(14), dialog);
  guard.pointerUp(pointer(14)); guard.pointerUp(pointer(13));
  assert.equal(guard.allowClick(pointer(13), dialog), true);
  assert.equal(guard.allowClick(pointer(14), dialog), true, 'one click must not consume another touch');
});

test('cancel and blur retain bounded evidence but a fresh pointerdown immediately recovers', () => {
  for (const reset of ['cancel', 'blur']) {
    const guard = createModalInputGuard(), dialog = {};
    guard.open(dialog); guard.pointerDown(pointer(6), dialog);
    if (reset === 'cancel') guard.pointerCancel(pointer(6)); else guard.reset();
    assert.equal(guard.pointerUp(pointer(6)), false, 'late up must not reactivate the cancelled gesture');
    assert.equal(guard.allowClick(pointer(6), dialog), false);
    guard.pointerDown(pointer(6), dialog); guard.pointerUp(pointer(6));
    assert.equal(guard.allowClick(pointer(6), dialog), true);
  }
});

test('keyboard and assistive clicks never consume or block unrelated pointer gestures', () => {
  const guard = createModalInputGuard(), dialog = {};
  guard.pointerDown(pointer(1), null); guard.open(dialog); guard.pointerUp(pointer(1));
  for (const event of [{ detail: 0 }, { detail: 0, pointerType: '', pointerId: -1 },
    { detail: 0, pointerType: '', pointerId: 0 }]) {
    assert.equal(guard.allowClick(event, dialog), true);
  }
  assert.equal(guard.allowClick(pointer(1), dialog), false, 'semantic activation must not erase the old touch origin');
});

test('ordinary non-modal clicks and fresh dialogs managed by other modules preserve existing behavior', () => {
  const guard = createModalInputGuard(), externalDialog = {};
  guard.pointerDown(pointer(1), null); guard.pointerUp(pointer(1));
  assert.equal(guard.allowClick(pointer(1), null), true);
  assert.equal(guard.allowClick({ detail: 1 }, null), true);
  guard.pointerDown(pointer(2, 'mouse'), externalDialog); guard.pointerUp(pointer(2, 'mouse'));
  assert.equal(guard.allowClick(pointer(2, 'mouse'), externalDialog), true, 'unregistered dialog uses generation zero');
  guard.pointerDown(pointer(3), null); guard.pointerUp(pointer(3));
  assert.equal(guard.allowClick(pointer(3), externalDialog), false, 'known game gesture is still not an external-dialog tap');
});

test('legacy clicks associate only one unequivocal pending release and never borrow a different ID', () => {
  const guard = createModalInputGuard(), dialog = {};
  guard.pointerDown(pointer(20), null); guard.open(dialog); guard.pointerUp(pointer(20));
  assert.equal(guard.allowClick({ detail: 1, pointerId: 999, pointerType: 'touch' }, dialog), true);
  assert.equal(guard.allowClick({ detail: 1, pointerType: 'mouse' }, dialog), true, 'different pointer type must not borrow the touch');
  assert.equal(guard.allowClick({ detail: 1 }, dialog), false, 'one exact pending release can explain a legacy click');
  const many = createModalInputGuard(); many.open(dialog);
  many.pointerDown(pointer(30), null); many.pointerDown(pointer(31), dialog);
  many.pointerUp(pointer(30)); many.pointerUp(pointer(31));
  assert.equal(many.allowClick({ detail: 1 }, dialog), true, 'ambiguous legacy metadata preserves existing semantics');
  assert.equal(many.allowClick(pointer(30), dialog), false);
  assert.equal(many.allowClick(pointer(31), dialog), true);
});

test('malformed pointer IDs do not alias records, throw, or consume a real pending gesture', () => {
  const guard = createModalInputGuard(), dialog = {};
  guard.pointerDown(pointer(8), null); guard.open(dialog); guard.pointerUp(pointer(8));
  for (const id of [null, undefined, -1, NaN, Infinity, 1.5, '8', 2147483648, -2147483649]) {
    const event = pointer(id);
    assert.equal(guard.pointerDown(event, dialog), false);
    assert.equal(guard.pointerUp(event), false);
    assert.equal(guard.pointerCancel(event), false);
    // Missing ID is the intentionally supported unique-release legacy case;
    // all explicit malformed IDs remain unassociated and cannot borrow ID 8.
    if (id !== undefined) assert.equal(guard.allowClick(event, dialog), true);
  }
  assert.equal(guard.allowClick(pointer(8), dialog), false);
  for (const id of [0, -2, 2147483647, -2147483648]) {
    guard.pointerDown(pointer(id), dialog); guard.pointerUp(pointer(id));
    assert.equal(guard.allowClick(pointer(id), dialog), true, 'valid signed long ID must work');
  }
  assert.equal(guard.open(null), false); assert.equal(guard.open('dialog'), false);
});

test('record capacity is bounded, prefers old ended records and never relies on timeouts', () => {
  const guard = createModalInputGuard({ maxRecords: 2 }), dialog = {};
  guard.pointerDown(pointer(1), null);
  guard.pointerDown(pointer(2), null); guard.pointerUp(pointer(2));
  guard.open(dialog);
  guard.pointerDown(pointer(3), dialog);
  assert.equal(guard.size, 2);
  guard.pointerUp(pointer(1));
  assert.equal(guard.allowClick(pointer(1), dialog), false, 'an active long press survives eviction of an ended record');
  guard.pointerUp(pointer(3)); assert.equal(guard.allowClick(pointer(3), dialog), true);
  for (let id = 4; id < 1000; id++) {
    guard.pointerDown(pointer(id), dialog); guard.pointerUp(pointer(id));
    assert.equal(guard.allowClick(pointer(id), dialog), true);
    assert.ok(guard.size <= 2);
  }
  const clamped = createModalInputGuard({ maxRecords: 1000000 });
  for (let id = 1; id <= 100; id++) clamped.pointerDown(pointer(id), null);
  assert.equal(clamped.size, 64);
});

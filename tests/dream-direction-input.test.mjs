import test from 'node:test';
import assert from 'node:assert/strict';
import { createDirectionInput } from '../dist/dream-direction-input.js';
import { DreamGame } from '../dist/dream-engine.js';

const noop = () => {};
globalThis.window = { devicePixelRatio: 1, addEventListener: noop, removeEventListener: noop };
globalThis.document = { hidden: false, addEventListener: noop, removeEventListener: noop };
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = noop;

function clock() {
  let now = 0, next = 1;
  const pending = new Map(), all = new Map();
  return {
    pending, all,
    setTimer(fn, delay) { const id = next++; const task = { at: now + delay, fn }; pending.set(id, task); all.set(id, task); return id; },
    clearTimer(id) { pending.delete(id); },
    advance(ms) {
      const end = now + ms;
      while (true) {
        const due = [...pending].filter(([, task]) => task.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        pending.delete(due[0]); now = due[1].at; due[1].fn();
      }
      now = end;
    },
  };
}

function harness() {
  const time = clock();
  let game, pad, jumps = 0;
  function newGame(chapterIndex = 0) {
    const ctx = new Proxy({ createLinearGradient: () => ({ addColorStop: noop }), createRadialGradient: () => ({ addColorStop: noop }), measureText: () => ({ width: 10 }) }, { get: (obj, key) => key in obj ? obj[key] : noop });
    game = new DreamGame({ getContext: () => ctx, getBoundingClientRect: () => ({ width: 1100, height: 620 }) }, { onPause: () => pad.reset() });
    game.start({ chapterIndex, sound: false });
  }
  pad = createDirectionInput({
    available: () => game?.state === 'playing',
    onChange() {
      const directions = pad.directions();
      game?.setInput({ x: Number(directions.has('right')) - Number(directions.has('left')), y: Number(directions.has('down')) - Number(directions.has('up')) });
    },
    onUp() { if (game.form === 'body') { jumps++; game.jump(); } },
    setTimer: time.setTimer, clearTimer: time.clearTimer,
  });
  newGame();
  return {
    time, pad, get game() { return game; }, get jumps() { return jumps; },
    tick(frames = 1) { for (let i = 0; i < frames; i++) game.update(1 / 60); },
    changeChapter() { pad.reset(); game.destroy(); newGame(1); },
    close() { pad.reset(); game.destroy(); },
  };
}

test('a native keyboard or screen-reader click moves the actual body for one short activation', () => {
  const h = harness(), x = h.game.body.x;
  assert.equal(h.pad.activate('right', { detail: 0 }), true);
  h.tick(8); assert.ok(h.game.body.x > x + 5);
  h.time.advance(180); assert.deepEqual(h.game.input, { x: 0, y: 0 });
  assert.equal(h.pad.directions().size, 0); assert.equal(h.time.pending.size, 0);
  h.close();
});

test('pointer hold remains continuous and its following click never adds a second move or jump', () => {
  const h = harness();
  assert.equal(h.pad.pressPointer(7, 'right'), true);
  h.time.advance(1000); assert.equal(h.game.input.x, 1); assert.equal(h.time.pending.size, 0);
  h.tick(12); h.pad.releasePointer(7); assert.equal(h.game.input.x, 0);
  for (const event of [{ detail: 1, pointerType: 'touch' }, { detail: 1 }, { detail: 0, pointerType: 'mouse' }]) assert.equal(h.pad.activate('right', event), false);
  assert.equal(h.game.input.x, 0);
  h.pad.pressPointer(8, 'up'); h.pad.releasePointer(8);
  assert.equal(h.pad.activate('up', { detail: 1, pointerType: 'touch' }), false);
  assert.equal(h.jumps, 1); h.close();
});

test('semantic up activation jumps once and release does not buffer another jump', () => {
  const h = harness();
  h.pad.activate('up', { detail: 0 });
  h.tick(5); assert.ok(h.game.body.y < 560); assert.equal(h.jumps, 1);
  h.time.advance(500); h.tick(120);
  assert.equal(h.jumps, 1); assert.equal(h.game.body.grounded, true);
  assert.equal(h.game.jumpBuffer, 0); h.close();
});

test('multi-pointer release and an opposite semantic step preserve the other held direction', () => {
  const h = harness();
  h.pad.pressPointer(1, 'right'); h.pad.pressPointer(2, 'right');
  h.pad.releasePointer(1); assert.equal(h.game.input.x, 1);
  h.pad.activate('left', { detail: 0 }); assert.equal(h.game.input.x, 0);
  h.time.advance(180); assert.equal(h.game.input.x, 1);
  assert.equal(h.pad.releasePointer(1), false); assert.equal(h.game.input.x, 1);
  h.pad.releasePointer(2); assert.equal(h.game.input.x, 0); h.close();
});

test('repeated semantic activation extends the step and an old timer cannot cancel its replacement', () => {
  const h = harness();
  h.pad.activate('right', { detail: 0 }); const stale = [...h.time.all.values()][0].fn;
  h.time.advance(100); h.pad.activate('right', { detail: 0 });
  stale(); h.time.advance(80); assert.equal(h.game.input.x, 1);
  h.time.advance(100); assert.equal(h.game.input.x, 0); h.close();
});

test('pause and blur clear both input sources; resuming cannot replay a queued activation', () => {
  for (const reason of ['manual', 'blur', 'visibility']) {
    const h = harness();
    h.pad.pressPointer(1, 'right'); h.pad.activate('up', { detail: 0 });
    const stale = [...h.time.all.values()][0].fn;
    h.game.pause(reason); assert.deepEqual(h.game.input, { x: 0, y: 0 });
    assert.equal(h.pad.directions().size, 0); assert.equal(h.time.pending.size, 0);
    assert.equal(h.pad.activate('left', { detail: 0 }), false);
    assert.equal(h.pad.pressPointer(2, 'left'), false);
    h.game.resume(); stale(); h.time.advance(1000);
    assert.deepEqual(h.game.input, { x: 0, y: 0 }); h.close();
  }
});

test('chapter replacement cancels old steps and a late pointer release cannot affect fresh controls', () => {
  const h = harness();
  h.pad.pressPointer(1, 'right'); h.pad.activate('up', { detail: 0 });
  const stale = [...h.time.all.values()][0].fn;
  h.changeChapter(); assert.equal(h.game.chapterIndex, 1);
  assert.deepEqual(h.game.input, { x: 0, y: 0 });
  h.pad.pressPointer(2, 'left'); stale(); h.pad.releasePointer(1); h.time.advance(500);
  assert.deepEqual(h.game.input, { x: -1, y: 0 });
  h.pad.releasePointer(2); assert.deepEqual(h.game.input, { x: 0, y: 0 }); h.close();
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { DreamGame } from '../dist/dream-engine.js';
import { DreamGame as BaseGame } from '../dist/dream-engine-base.js';
import { transformCapPoint } from '../dist/dream-cap-art.js';
import { getTravelerMotion } from '../dist/dream-traveler-art.js';
import { createTravelerPerformance, advanceTravelerPerformance, getTravelerPerformanceView } from '../dist/dream-traveler-performance.js';

const noop = () => {};
globalThis.window = { devicePixelRatio: 1, addEventListener: noop, removeEventListener: noop };
globalThis.document = { hidden: false, addEventListener: noop, removeEventListener: noop };
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = noop;
const near = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-8, message || `${a} differs from ${b}`);
const pointNear = (a, b, message) => { near(a.x, b.x, message); near(a.y, b.y, message); };
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
function makeGame(Class = DreamGame, options = {}) {
  const completions = [], events = [];
  const context = new Proxy({
    createLinearGradient: () => ({ addColorStop: noop }), createRadialGradient: () => ({ addColorStop: noop }),
    measureText: text => ({ width: String(text).length * 10 }),
  }, { get: (object, key) => key in object ? object[key] : noop });
  const game = new Class({ getContext: () => context, getBoundingClientRect: () => ({ width: 320, height: 431 }) },
    { onPuzzle: noop, onComplete: result => completions.push(result), onCapEvent: event => events.push(event) });
  game.start({ chapterIndex: 2, sound: false, ...options });
  return { game, completions, events };
}
const tick = (game, frames = 1) => { for (let i = 0; i < frames; i++) game.update(1 / 60); };
const physical = g => ({ body: g.body, soul: g.soul, form: g.form, state: g.state, input: g.input,
  time: g.time, energy: g.energy, deaths: g.deaths, cap: g.cap, movers: g.movers, lamps: g.lanterns,
  memories: g.memories, particles: g.particles, checkpoint: g.checkpoint, featherCharges: g.featherCharges,
  firstTicket: g.firstTicket, greenhousePlant: g.greenhousePlant, capActivity: g.capActivity?.getSnapshot(), lostCase: g.lostCase?.getSnapshot() });

function checkRigAndSoles(game) {
  const actual = game.getCharacterPresentation(), original = BaseGame.prototype.getCharacterPresentation.call(game);
  assert.deepEqual(actual.rig, original.rig, 'Head, body, hinge and soul-opening matrices retain the original rig');
  const motion = getTravelerMotion(game.body, { time: game.visualTime, hop: actual.hop,
    reducedMotion: game.options.reducedMotion, performance: actual.performance });
  for (const leg of motion.legs.filter(leg => leg.planted)) {
    near(transformCapPoint(actual.rig.bodyMatrix, leg.foot).y, game.body.y, 'A planted sole must remain on the actual collision top');
  }
  if (actual.grip === 1) pointNear(actual.arms.left.world, actual.rig.gripWorld, 'The support hand remains on the real cap grip');
  if (actual.clasp === 1 || actual.catching === 1) {
    pointNear(actual.arms.right.world, original.arms.right.world, 'The clasp/catch takes priority over acting');
  }
  return actual;
}

test('an ordinary jump has distinct free-arm poses and a real .2s landing, without changing the head rig or soles', () => {
  const { game } = makeGame();
  try {
    const idle = game.getCharacterPresentation();
    assert.equal(game.getTravelerPerformanceView().phase, 'idle');
    assert.equal(game.jump(), true);
    tick(game, 6);
    const rise = checkRigAndSoles(game);
    assert.equal(rise.performance.phase, 'rise');
    assert.ok(idle.arms.right.wrist.y - rise.arms.right.wrist.y > 8, 'A rising hand has a readable silhouette change');
    while (game.body.vy < 180) tick(game);
    const fall = checkRigAndSoles(game);
    assert.equal(fall.performance.phase, 'fall');
    assert.ok(fall.arms.right.wrist.x - idle.arms.right.wrist.x > 7, 'Descent spreads the free arm toward the landing');
    while (!game.body.grounded) tick(game);
    const landed = checkRigAndSoles(game).performance;
    assert.equal(landed.phase, 'land');
    assert.equal(landed.landingAge, 0);
    assert.equal(landed.landingDuration, .2);
    tick(game, 6);
    assert.equal(game.body.land, 0, 'The existing physical animation field has already settled');
    const settling = checkRigAndSoles(game).performance;
    assert.equal(settling.phase, 'land');
    assert.ok(settling.landing > 0 && settling.landing < landed.landing);
    const frozen = game.getTravelerPerformanceView(), pose = game.getCharacterPresentation();
    game.pause(); tick(game, 60);
    assert.deepEqual(game.getTravelerPerformanceView(), frozen);
    assert.deepEqual(game.getCharacterPresentation(), pose);
    game.resume(); tick(game, 7);
    assert.equal(game.getTravelerPerformanceView().phase, 'idle');
    assert.equal(game.getTravelerPerformanceView().landingAge, null);
  } finally { game.destroy(); }
});

test('stage acting requires the real attachment and contact geometry; its view is pure and has no ornamental clock', () => {
  const stage = Object.freeze({ id: 'stage', kind: 'stage', x: 900, y: 465, w: 185, h: 20, dx: 2 });
  const body = Object.freeze({ x: 1000, y: 465, w: 30, h: 58, vx: 0, vy: 0, face: 1, grounded: true, platform: 'stage' });
  const state = Object.freeze(createTravelerPerformance());
  const context = Object.freeze({ mode: 'story', chapterIndex: 2, body, movers: Object.freeze([stage]), time: 8, runId: 1, deaths: 0 });
  const view = getTravelerPerformanceView(state, context), old = JSON.stringify(context);
  assert.equal(view.phase, 'ride'); assert.equal(view.platformId, 'stage'); assert.equal(view.ride, 1);
  assert.equal(view.platformVelocity, 120);
  assert.ok(Object.isFrozen(view) && Object.isFrozen(view.freeArms.left));
  assert.deepEqual(getTravelerPerformanceView(state, { ...context, time: 900 }), view, 'Platform acting follows the actual displacement, not time-based sway');
  for (const change of [{ grounded: false }, { y: 460 }, { x: 1200 }, { platform: null }]) {
    const invalid = getTravelerPerformanceView(state, { ...context, body: { ...body, ...change } });
    assert.equal(invalid.platformId, null); assert.equal(invalid.ride, 0);
  }
  const reduced = getTravelerPerformanceView(state, { ...context, reducedMotion: true });
  assert.equal(reduced.phase, 'ride'); assert.equal(reduced.platformId, 'stage');
  for (const field of ['rise', 'fall', 'landing', 'ride', 'balance']) assert.equal(reduced[field], 0);
  assert.deepEqual(reduced.freeArms, { left: { x: -16, y: -16 }, right: { x: 17, y: -16 } });
  assert.equal(JSON.stringify(context), old);
});

test('landing never comes from walking aboard, a missing support, soul form, a new run or recovery', () => {
  const body = { x: 105, y: 560, w: 30, h: 58, grounded: true, vy: 0 };
  const context = { mode: 'story', chapterIndex: 2, state: 'playing', form: 'body', body,
    level: { platforms: [{ x: 0, y: 560, w: 300, h: 80 }] }, movers: [], time: 1, runId: 1, deaths: 0 };
  const before = { body, grounded: false, vy: 500, form: 'body', runId: 1, deaths: 0 };
  for (const [earlier, now] of [
    [{ ...before, grounded: true }, context], [{ ...before, form: 'soul' }, context],
    [before, { ...context, form: 'soul' }], [before, { ...context, runId: 2 }],
    [before, { ...context, deaths: 1 }], [before, { ...context, body: { ...body } }],
    [before, { ...context, level: { platforms: [] } }], [before, { ...context, reducedMotion: true }],
  ]) {
    const state = createTravelerPerformance(); advanceTravelerPerformance(state, earlier, now, 1 / 60);
    assert.equal(getTravelerPerformanceView(state, now).landing, 0);
    assert.equal(state.landingAt, null);
  }
  const state = createTravelerPerformance(); advanceTravelerPerformance(state, before, context, 1 / 60);
  assert.equal(getTravelerPerformanceView(state, context).phase, 'land');
  assert.equal(getTravelerPerformanceView(state, { ...context, body: { ...body } }).landing, 0, 'An immediate respawn invalidates the old body before another update');
});

test('normal walking into the first pit rejects both counted respawn and feather-protected recovery', () => {
  for (const feather of [false, true]) {
    const { game } = makeGame();
    try {
      if (feather) assert.equal(game.useItem('feather_charm'), true);
      const originalBody = game.body;
      game.setInput({ x: 1, y: 0 });
      for (let i = 0; i < 600 && game.body === originalBody; i++) tick(game);
      assert.notStrictEqual(game.body, originalBody, 'The normal route actually falls and is recovered');
      assert.equal(game.deaths, feather ? 0 : 1);
      assert.equal(game.featherCharges, 0);
      assert.equal(game.body.x, 510); assert.equal(game.body.y, 560);
      assert.equal(game.getTravelerPerformanceView().phase, 'idle');
      assert.equal(game.getTravelerPerformanceView().landingAge, null);
      assert.equal(game.travelerPerformance.landingAt, null);
    } finally { game.destroy(); }
  }
});

test('real airborne E reversals retain the grip and catch, and soul landings/restarts/reduced motion do not replay a settle', () => {
  const { game } = makeGame();
  let gripped = 0, clasped = 0;
  try {
    game.jump(); tick(game, 6);
    for (let turn = 0; turn < 8; turn++) {
      const before = checkRigAndSoles(game); game.toggleSoul(); const after = checkRigAndSoles(game);
      for (const side of ['left', 'right']) pointNear(after.arms[side].world, before.arms[side].world, 'E must not snap a free or occupied hand at its input boundary');
      for (let frame = 0; frame < 12; frame++) {
        tick(game); const p = checkRigAndSoles(game);
        if (p.grip === 1) gripped++;
        if (p.clasp === 1 || p.catching === 1) clasped++;
      }
    }
    assert.ok(gripped > 0 && clasped > 0);
    game.restart(); game.jump(); tick(game, 6); game.toggleSoul();
    while (!game.body.grounded) tick(game);
    assert.equal(game.form, 'soul');
    assert.notEqual(game.getTravelerPerformanceView().phase, 'land');
    game.recall(); tick(game, 40); game.jump();
    while (!game.body.grounded) tick(game);
    assert.equal(game.getTravelerPerformanceView().phase, 'land');
    game.setReducedMotion(true);
    const still = game.getTravelerPerformanceView();
    game.visualTime += 17;
    assert.deepEqual(game.getTravelerPerformanceView(), still);
    assert.equal(still.landingAge, null); assert.equal(still.landing, 0);
    game.setReducedMotion(false); assert.equal(game.getTravelerPerformanceView().landing, 0);
    game.jump(); while (!game.body.grounded) tick(game);
    assert.equal(game.getTravelerPerformanceView().phase, 'land');
    game.restart(); assert.equal(game.getTravelerPerformanceView().phase, 'idle');
    for (const chapterIndex of [0, 1, 3]) {
      game.start({ chapterIndex, sound: false }); game.jump(); tick(game, 8);
      assert.equal(game.getTravelerPerformanceView(), null);
      assert.deepEqual(game.getCharacterPresentation(), BaseGame.prototype.getCharacterPresentation.call(game));
    }
  } finally { game.destroy(); }
});

test('normal controls complete the theatre with identical base physics, energy, events and settlement', t => {
  const current = makeGame(), baseline = makeGame(BaseGame), games = [current.game, baseline.game];
  const game = current.game;
  let compared = 0;
  const act = (method, ...args) => games.forEach(g => g[method](...args));
  const step = (count = 1) => {
    for (let frame = 0; frame < count; frame++) {
      games.forEach(g => g.update(1 / 60));
      assert.deepEqual(physical(game), physical(baseline.game), 'Presentation cannot alter the parallel production base simulation');
      compared++;
    }
  };
  function walk(target, max = 900) {
    for (let i = 0; i < max; i++) {
      if (game.state === 'complete') return;
      if (Math.abs(game.body.x - target) < 2 && Math.abs(game.body.vx) < 10 && game.body.grounded) { act('setInput', { x: 0, y: 0 }); step(10); return; }
      act('setInput', { x: clamp((target - game.body.x) / 35, -1, 1), y: 0 }); step();
    }
    assert.fail(`Walking did not reach ${target}: ${JSON.stringify(game.body)}`);
  }
  function wait(predicate, limit = 1600) {
    act('setInput', { x: 0, y: 0 });
    for (let i = 0; i < limit; i++) { if (predicate()) return; step(); }
    assert.fail('The real moving stage did not reach the required boarding window');
  }
  function solveLamp(index) {
    act('toggleSoul');
    const lamp = game.lanterns[index];
    for (let i = 0; i < 900; i++) {
      const dx = lamp.x - game.soul.x, dy = lamp.y - game.soul.y;
      if (Math.hypot(dx, dy) < 20 && Math.hypot(game.soul.vx, game.soul.vy) < 50) break;
      act('setInput', { x: clamp(dx / 75, -1, 1), y: clamp(dy / 75, -1, 1) }); step();
    }
    act('setInput', { x: 0, y: 0 }); step(8); act('pulse');
    assert.equal(game.pendingSeal, index); act('resolvePuzzle', true); act('recall'); step(70);
  }
  try {
    assert.strictEqual(game.frame, BaseGame.prototype.frame, 'There remains one original frame loop');
    walk(430); solveLamp(0); walk(510); act('jump'); walk(680);
    assert.equal(game.body.y, 465); checkRigAndSoles(game);
    wait(() => game.movers[0].dx < 0 && game.movers[0].x < 735);
    for (let i = 0; i < 360; i++) {
      const stage = game.movers[0];
      if (game.body.grounded && game.body.platform === stage.id && game.body.x - stage.x > 100) break;
      act('setInput', { x: clamp((stage.x + stage.w * .78 - game.body.x) / 35, -1, 1), y: 0 }); step();
    }
    act('setInput', { x: 0, y: 0 }); step(12);
    wait(() => game.movers[0].dx > 0 && game.movers[0].x >= 900);
    const relative = game.body.x - game.movers[0].x;
    assert.equal(game.getTravelerPerformanceView().phase, 'ride');
    assert.equal(game.getTravelerPerformanceView().platformId, 'stage');
    assert.equal(game.getTravelerPerformanceView().ride, 1); checkRigAndSoles(game);
    step(30); near(game.body.x - game.movers[0].x, relative, 'The acting does not slide feet across the deck');
    wait(() => game.movers[0].dx > 0 && game.movers[0].x >= 950 && game.movers[0].x < 1000);
    act('setInput', { x: 1, y: 0 });
    for (let i = 0; i < 150; i++) {
      if (game.body.platform === null && game.body.grounded && game.body.x > 1220 && game.body.y === 465) break;
      step();
    }
    act('setInput', { x: 0, y: 0 }); step(12);
    assert.equal(game.body.platform, null); assert.equal(game.body.y, 465);
    assert.ok(game.body.x > 1130 && game.body.x < 1355);
    walk(1530); solveLamp(1); walk(2115);
    assert.equal(game.state, 'complete'); assert.equal(game.deaths, 0);
    assert.equal(current.completions.length, 1);
    assert.deepEqual(current.completions, baseline.completions);
    assert.deepEqual(current.events, baseline.events);
    t.diagnostic(`${compared} normal-input updates compared through both real puzzles, the moving stage and the body exit; zero falls`);
  } finally { games.forEach(g => g.destroy()); }
});

// Local v30 research: actual controls exercise the integrated presentation
// subclass beside the unchanged simulation. This is not browser or release QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DreamGame } from '../dist/dream-engine.js';
import { DreamGame as BaseGame } from '../dist/dream-engine-base.js';
import { transformCapPoint } from '../dist/dream-cap-art.js';
import { getTravelerMotion } from '../dist/dream-traveler-art.js';
import { getGroundShadowView } from '../dist/dream-ground-shadow.js';
import { createTravelerPerformance, advanceTravelerPerformance,
  getTravelerPerformanceView, applyTravelerPerformance, isTravelerPerformanceScene } from '../dist/dream-traveler-performance.js';

// An optional, separately archived candidate supplies a third independent
// runtime. Ordinary npm tests still compare the integrated engine to BaseGame.
const CandidateGame = process.env.TOUGAIGU_V30_CANDIDATE_DIST
  ? (await import(pathToFileURL(resolve(process.env.TOUGAIGU_V30_CANDIDATE_DIST, 'dream-engine.js')).href)).DreamGame : null;
const baselineLabel = CandidateGame ? 'BaseGame and archived candidate' : 'BaseGame';

const noop = () => {};
globalThis.window = { devicePixelRatio: 1, addEventListener: noop, removeEventListener: noop };
globalThis.document = { hidden: false, addEventListener: noop, removeEventListener: noop };
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = noop;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const near = (a, b, message = `${a} differs from ${b}`) => assert.ok(Math.abs(a - b) < 1e-8, message);
const plainBody = Object.freeze({ x: 690, y: 430, w: 30, h: 58, grounded: true,
  vx: 0, vy: 0, face: 1, platform: 'book-a' });
const book = Object.freeze({ id: 'book-a', kind: 'book', axis: 'y', x: 615, y: 430,
  w: 155, h: 18, dx: 0, dy: -.9 });
const context = changes => ({ mode: 'story', chapterIndex: 3, state: 'playing', form: 'body',
  body: plainBody, movers: [book], time: 1, runId: 1, deaths: 0, ...changes });

test('scope includes six integer main chapters and excludes festivals and invalid scene contracts', () => {
  for (let chapterIndex = 0; chapterIndex < 6; chapterIndex++) {
    const c = context({ chapterIndex });
    assert.equal(isTravelerPerformanceScene(c), true);
    assert.ok(getTravelerPerformanceView(createTravelerPerformance(), c));
  }
  for (const c of [null, undefined, {}, ...[-1, 6, 1.5, '0', NaN, Infinity].map(chapterIndex => context({ chapterIndex })),
    ...['festival', 'survivor', '', null].map(mode => context({ mode, chapterIndex: 0 }))]) {
    assert.equal(isTravelerPerformanceScene(c), false);
    assert.equal(getTravelerPerformanceView(createTravelerPerformance(), c), null);
  }
  assert.equal(getTravelerPerformanceView(createTravelerPerformance(), context({ body: { ...plainBody, y: NaN } })), null);
});

test('book motion is actual support displacement: vertical lift is distinct from horizontal balance', () => {
  const state = Object.freeze(createTravelerPerformance());
  const rising = getTravelerPerformanceView(state, context());
  const down = getTravelerPerformanceView(state, context({ movers: [{ ...book, dy: .9 }] }));
  const turn = getTravelerPerformanceView(state, context({ movers: [{ ...book, dy: 0 }] }));
  assert.equal(rising.phase, 'ride'); assert.equal(rising.platformAxis, 'y');
  assert.equal(rising.platformKind, 'book'); assert.equal(rising.platformVerticalVelocity, -54);
  assert.equal(rising.platformVelocity, 0); assert.equal(rising.balance, 0);
  assert.equal(rising.verticalBalance, -.6); assert.equal(down.verticalBalance, .6);
  assert.equal(turn.verticalBalance, 0); assert.equal(turn.phase, 'ride');
  for (const side of ['left', 'right']) {
    assert.ok(rising.freeArms[side].y < turn.freeArms[side].y);
    assert.ok(down.freeArms[side].y > turn.freeArms[side].y);
    assert.equal(rising.freeArms[side].x, down.freeArms[side].x, 'vertical transport does not sway sideways');
  }
  assert.equal(rising.freeArms.left.y, rising.freeArms.right.y);
  assert.equal(rising.rise, 0); assert.equal(rising.fall, 0);
  assert.deepEqual(getTravelerPerformanceView(state, context({ time: 999, body: { ...plainBody, face: -1 } })), rising,
    'vertical support does not invent a decorative clock or reverse with facing');
  const horizontal = getTravelerPerformanceView(state, context({ body: { ...plainBody, platform: 'last-stage' },
    movers: [{ ...book, id: 'last-stage', axis: 'x', dx: 2, dy: 0 }] }));
  assert.equal(horizontal.platformVelocity, 120); assert.equal(horizontal.platformVerticalVelocity, 0);
  assert.equal(horizontal.verticalBalance, 0); assert.equal(horizontal.balance, 2 / 3);
  near(horizontal.freeArms.left.x, -23.333333333333332);
  near(horizontal.freeArms.left.y, -20.666666666666668);
  near(horizontal.freeArms.right.x, 22.666666666666668);
  near(horizontal.freeArms.right.y, -19.333333333333332);
  assert.ok(Object.isFrozen(rising) && Object.isFrozen(rising.freeArms) && Object.isFrozen(rising.freeArms.left));
});

test('a book-looking object, stale attachment, missing axis or unsafe geometry never grants a riding pose', () => {
  const state = createTravelerPerformance();
  for (const c of [
    context({ movers: [] }), context({ movers: { find() { throw Error('do not call foreign methods'); } } }),
    context({ movers: [null, { ...book, kind: 'scenery' }] }),
    context({ movers: [{ ...book, axis: undefined }] }), context({ movers: [{ ...book, axis: 'z' }] }),
    context({ movers: [{ ...book, id: '' }], body: { ...plainBody, platform: '' } }),
    context({ movers: [{ ...book, w: 0 }] }), context({ movers: [{ ...book, y: Infinity }] }),
    ...[{ platform: null }, { platform: 'book-b' }, { x: 800 }, { y: 425 }, { grounded: false }]
      .map(body => context({ body: { ...plainBody, ...body } })),
  ]) {
    const v = getTravelerPerformanceView(state, c);
    assert.equal(v.platformId, null); assert.equal(v.platformAxis, null); assert.equal(v.ride, 0);
    assert.equal(v.balance, 0); assert.equal(v.verticalBalance, 0);
  }
  const malformed = getTravelerPerformanceView(state, context({ movers: [{ ...book, dx: Infinity, dy: NaN }] }));
  assert.equal(malformed.platformVelocity, 0); assert.equal(malformed.platformVerticalVelocity, 0);
  for (const side of ['left', 'right']) assert.ok(Object.values(malformed.freeArms[side]).every(Number.isFinite));
  const walking = getTravelerPerformanceView(state, context({ body: { ...plainBody, vx: 240 } }));
  assert.equal(walking.ride, 0); assert.equal(walking.verticalBalance, 0);
});

test('grounded book reversals do not restart a landing, and invalid updates cannot advance the presentation', () => {
  const state = createTravelerPerformance(), before = { body: plainBody, grounded: true, vy: 0,
    form: 'body', runId: 1, deaths: 0 };
  for (const dy of [-.9, 0, .9, 0, -.9]) {
    advanceTravelerPerformance(state, before, context({ movers: [{ ...book, dy }] }), 1 / 60);
    assert.equal(state.landingAt, null); assert.equal(getTravelerPerformanceView(state, context()).phase, 'ride');
  }
  for (const dt of [0, -1, Infinity, NaN]) {
    const old = structuredClone(state);
    advanceTravelerPerformance(state, { ...before, grounded: false, vy: 400 }, context(), dt);
    assert.deepEqual(state, old);
  }
  const paused = structuredClone(state);
  advanceTravelerPerformance(state, { ...before, grounded: false, vy: 400 }, context({ state: 'paused' }), 1 / 60);
  assert.deepEqual(state, paused);
  const reduced = getTravelerPerformanceView(state, context({ reducedMotion: true }));
  assert.equal(reduced.platformId, 'book-a'); assert.equal(reduced.platformVerticalVelocity, -54);
  for (const name of ['rise', 'fall', 'landing', 'ride', 'balance', 'verticalBalance']) assert.equal(reduced[name], 0);
  assert.deepEqual(reduced.freeArms, { left: { x: -16, y: -16 }, right: { x: 17, y: -16 } });
});

function engine(Class = DreamGame) {
  const ctx = new Proxy({ createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }), measureText: value => ({ width: String(value).length * 8 }) },
  { get: (o, key) => key in o ? o[key] : noop });
  const events = [];
  const callbacks = Object.fromEntries(['onCapEvent', 'onComplete', 'onPuzzle', 'onTalk', 'onPause', 'onCapActivity', 'onLostCase']
    .map(type => [type, payload => events.push({ type, payload: structuredClone(payload) })]));
  const game = new Class({ getContext: () => ctx, getBoundingClientRect: () => ({ width: 320, height: 431 }) }, callbacks);
  return { game, events };
}
const physical = g => JSON.stringify({ body: g.body, soul: g.soul, form: g.form, state: g.state,
  mode: g.mode, chapterIndex: g.chapterIndex, runId: g.runId, completed: g.completed,
  input: g.input, time: g.time, visualTime: g.visualTime, energy: g.energy, deaths: g.deaths, cap: g.cap,
  movers: g.movers, lamps: g.lanterns, memories: g.memories, particles: g.particles,
  hazards: g.hazards, checkpoint: g.checkpoint, featherCharges: g.featherCharges,
  firstTicket: g.firstTicket, greenhousePlant: g.greenhousePlant, pads: g.pads,
  platforms: g.level?.platforms, barriers: g.level?.barriers, plateState: [...g.plateState || []],
  pendingSeal: g.pendingSeal, pendingTalk: g.pendingTalk, talked: [...g.talked || []], talkStages: [...g.talkStages || []],
  capActivity: g.capActivity?.getSnapshot(), lostCase: g.lostCase?.getSnapshot(), moonPlay: g.moonPlay?.getSnapshot() });

// All engines receive identical real input methods, including puzzle resolution.
// No body, platform, energy, progress or clock value is assigned by this harness.
function pair(chapterIndex) {
  const a = engine(), baselines = [engine(BaseGame), ...(CandidateGame ? [engine(CandidateGame)] : [])];
  const g = a.game, games = [g, ...baselines.map(b => b.game)], trace = [];
  games.forEach(game => game.start({ chapterIndex, sound: false }));
  let steps = 0;
  function observe() {
    const old = physical(g), view = g.getTravelerPerformanceView();
    const original = BaseGame.prototype.getCharacterPresentation.call(g);
    const posed = g.getCharacterPresentation(), applied = applyTravelerPerformance(original, view);
    assert.strictEqual(applied.rig, original.rig, 'the pure application retains the original rig object');
    assert.deepEqual(posed, applied, 'the integrated character consumes the real six-chapter performance view');
    assert.deepEqual(posed.rig, original.rig, 'the original head/body/cap rig remains authoritative');
    if (posed.grip === 1) {
      near(posed.arms.left.world.x, posed.rig.gripWorld.x); near(posed.arms.left.world.y, posed.rig.gripWorld.y);
    }
    if (posed.clasp === 1 || posed.catching === 1) {
      near(posed.arms.right.world.x, original.arms.right.world.x); near(posed.arms.right.world.y, original.arms.right.world.y);
    }
    const motion = getTravelerMotion(g.body, { time: g.visualTime, hop: posed.hop,
      reducedMotion: g.options.reducedMotion, performance: view });
    for (const leg of motion.legs.filter(leg => leg.planted)) near(transformCapPoint(posed.rig.bodyMatrix, leg.foot).y, g.body.y);
    assert.equal(physical(g), old, 'reading and applying the integrated presentation cannot mutate the engine');
    for (const b of baselines) {
      assert.equal(physical(g), physical(b.game), `same-input physical frame ${steps}`);
      assert.deepEqual(a.events, b.events);
      if (CandidateGame && b.game instanceof CandidateGame && chapterIndex === 2) {
        const previous = b.game.getTravelerPerformanceView();
        for (const key of Object.keys(previous)) assert.deepEqual(view[key], previous[key], `third-chapter ${key} stays exact`);
        assert.deepEqual(posed.arms, b.game.getCharacterPresentation().arms, 'the established theatre arms stay exact');
      }
    }
    trace.push({ time: g.time, vy: g.body.vy, y: g.body.y, form: g.form, deaths: g.deaths,
      phase: view.phase, landingAge: view.landingAge, platform: g.body.platform,
      verticalBalance: view.verticalBalance, balance: view.balance });
    return { view, posed, original };
  }
  function tick(n = 1, dt = 1 / 60) {
    for (let i = 0; i < n; i++) {
      games.forEach(game => game.update(dt));
      steps++; observe();
    }
  }
  function act(method, ...args) {
    const results = games.map(game => game[method](...args));
    for (let i = 1; i < games.length; i++) {
      assert.deepEqual(results[0], results[i]);
      assert.equal(physical(g), physical(games[i]));
    }
    return results[0];
  }
  function until(predicate, max = 1200) {
    for (let i = 0; i < max; i++) { if (predicate()) return; tick(); }
    assert.fail('Bounded actual-input route failed: ' + physical(g));
  }
  function walk(x, max = 1000) {
    for (let i = 0; i < max; i++) {
      if (Math.abs(g.body.x - x) < 2 && Math.abs(g.body.vx) < 10 && g.body.grounded) { act('setInput', { x: 0, y: 0 }); tick(6); return; }
      act('setInput', { x: clamp((x - g.body.x) / 35, -1, 1), y: 0 }); tick();
    }
    assert.fail('Bounded walking failed: ' + physical(g));
  }
  function solveLamp(index) {
    const target = g.lanterns[index];
    assert.equal(act('toggleSoul'), true);
    for (let i = 0; i < 900; i++) {
      const dx = target.x - g.soul.x, dy = target.y - g.soul.y;
      if (Math.hypot(dx, dy) < 15 && Math.hypot(g.soul.vx, g.soul.vy) < 50) break;
      act('setInput', { x: clamp(dx / 75, -1, 1), y: clamp(dy / 75, -1, 1) }); tick();
    }
    act('setInput', { x: 0, y: 0 }); tick(5);
    assert.equal(act('pulse'), true); assert.equal(g.pendingSeal, index);
    assert.equal(act('resolvePuzzle', true), true); assert.equal(g.lanterns[index].lit, true);
    assert.equal(act('recall'), true); tick(70);
  }
  return { g, trace, observe, tick, act, until, walk, solveLamp,
    get steps() { return steps; }, close() { games.forEach(game => game.destroy()); } };
}

function drawnShadow(game) {
  const shadows = [], clips = [], stack = [], paint = { globalAlpha: 1, fillStyle: null };
  const ctx = new Proxy({
    save() { stack.push({ ...paint }); },
    restore() { assert.ok(stack.length); Object.assign(paint, stack.pop()); },
    createLinearGradient: () => ({ addColorStop: noop }), createRadialGradient: () => ({ addColorStop: noop }),
    measureText: value => ({ width: String(value).length * 8 }),
    rect: (...args) => clips.push(args),
    ellipse: (...args) => { if (paint.fillStyle === '#071e2c') shadows.push({ args, opacity: paint.globalAlpha }); },
  }, { get: (o, key) => key in o ? o[key] : key in paint ? paint[key] : noop,
    set: (o, key, value) => { paint[key] = value; return true; } });
  const before = physical(game);
  game.drawCharacter(ctx, game.body, game.visualTime);
  assert.equal(physical(game), before); assert.equal(stack.length, 0);
  const expected = getGroundShadowView({ body: game.body, level: game.level, movers: game.movers,
    closedBarriers: game.level.barriers.filter(barrier => !game.barrierOpen(barrier)) });
  assert.ok(expected, 'this actual route sample has a real supporting surface');
  assert.deepEqual(shadows, [{ args: [expected.x, expected.y, expected.radiusX, expected.radiusY, 0, 0, Math.PI * 2], opacity: expected.opacity }]);
  assert.deepEqual(clips[0], [expected.clip.x, expected.clip.y, expected.clip.w, expected.clip.h]);
  return expected;
}

test('station and greenhouse draw their shadow on actual floor and one-way support, including airborne samples', t => {
  for (const [chapter, approach, shelfX] of [[0, 150, 270], [1, 210, 325]]) {
    const h = pair(chapter);
    try {
      const contact = drawnShadow(h.g); assert.equal(contact.distance, 0);
      h.act('jump'); h.tick(6);
      const air = drawnShadow(h.g);
      assert.ok(air.distance > 40); assert.equal(air.y, contact.y);
      assert.notEqual(air.y, h.g.body.y + 2, 'the shadow no longer follows the airborne feet');
      assert.ok(air.opacity < contact.opacity && air.radiusX < contact.radiusX);
      h.until(() => h.g.body.grounded); h.walk(approach); h.act('jump'); h.walk(shelfX);
      assert.equal(h.g.body.y, 465); assert.equal(h.g.body.platform, null);
      const shelf = drawnShadow(h.g);
      assert.equal(shelf.surface.source, 'platform'); assert.equal(shelf.surface.y, 465); assert.equal(shelf.distance, 0);
      assert.ok(h.trace.some(sample => sample.phase === 'land' && sample.y === 465));
      h.act('jump'); h.tick(5);
      const aboveShelf = drawnShadow(h.g);
      assert.equal(aboveShelf.surface.y, 465); assert.ok(aboveShelf.distance > 0);
      t.diagnostic(`chapter ${chapter + 1}: ${h.steps} unchanged ${baselineLabel} updates; real floor/shelf shadow and clip`);
    } finally { h.close(); }
  }
});

test('all six integrated lifecycles retain the bounded simulation step and ignore old-run landing state', () => {
  for (let chapter = 0; chapter < 6; chapter++) {
    const h = pair(chapter);
    try {
      const initial = physical(h.g), idle = h.observe();
      for (const dt of [0, -1, NaN, -Infinity]) { h.tick(1, dt); assert.equal(physical(h.g), initial); assert.deepEqual(h.observe(), idle); }
      h.tick(1, Infinity); assert.equal(h.g.time, .04);
      assert.equal(h.g.travelerPerformance.stepSeconds, .04);
      h.act('jump'); h.until(() => h.g.body.grounded);
      assert.equal(h.g.getTravelerPerformanceView().phase, 'land');
      const oldState = h.g.travelerPerformance;
      h.act('start', { chapterIndex: (chapter + 1) % 6, sound: false });
      assert.notStrictEqual(h.g.travelerPerformance, oldState);
      assert.equal(h.g.travelerPerformance.landingBody, null);
      assert.equal(h.g.getTravelerPerformanceView().phase, 'idle');
      h.act('destroy');
      assert.equal(h.g.travelerPerformance, null); assert.equal(h.g.getTravelerPerformanceView(), null);
      h.act('start', { chapterIndex: chapter, sound: false });
      assert.equal(h.g.getTravelerPerformanceView(), null); assert.equal(h.g.state, 'destroyed');
    } finally { h.close(); }
  }
});

test('HUD callbacks can switch the run or destroy during an update without advancing an old-body performance', () => {
  for (const action of ['start', 'destroy']) {
    const { game } = engine();
    game.start({ chapterIndex: 1, sound: false });
    const oldBody = game.body, oldState = game.travelerPerformance;
    let called = false;
    game.callbacks.onHud = () => {
      if (called || game.time < .1) return;
      called = true;
      if (action === 'start') game.start({ chapterIndex: 4, sound: false });
      else game.destroy();
    };
    try {
      game.jump();
      for (let i = 0; i < 30 && !called; i++) game.update(1 / 60);
      assert.equal(called, true);
      assert.equal(oldState.landingAt, null);
      if (action === 'start') {
        assert.equal(game.chapterIndex, 4); assert.notStrictEqual(game.body, oldBody);
        assert.notStrictEqual(game.travelerPerformance, oldState);
        assert.equal(game.travelerPerformance.landingBody, null);
        assert.equal(game.getTravelerPerformanceView().phase, 'idle');
      } else {
        assert.equal(game.state, 'destroyed'); assert.equal(game.getTravelerPerformanceView(), null);
        assert.equal(game.travelerPerformance, null);
      }
    } finally { game.destroy(); }
  }
});

test('actual ordinary jumps in all six chapters keep physics, occupied hands, soles and the original rig unchanged', t => {
  for (let chapter = 0; chapter < 6; chapter++) {
    const h = pair(chapter);
    try {
      assert.equal(h.act('jump'), true); h.tick(6);
      const rise = h.observe(); assert.equal(rise.view.phase, 'rise');
      assert.ok(rise.original.arms.right.wrist.y - rise.posed.arms.right.wrist.y > 8);
      h.until(() => h.g.body.vy > 80); assert.equal(h.observe().view.phase, 'fall');
      h.until(() => h.g.body.grounded); const landed = h.observe().view;
      assert.equal(landed.phase, 'land'); assert.equal(landed.landingAge, 0);
      h.act('pause'); const frozen = h.observe(); h.tick(25);
      assert.deepEqual(h.observe(), frozen); h.act('resume'); h.tick(13);
      assert.equal(h.observe().view.phase, 'idle');
      h.act('jump'); h.tick(7); h.act('toggleSoul');
      h.until(() => h.g.body.grounded); assert.equal(h.g.form, 'soul');
      assert.notEqual(h.observe().view.phase, 'land');
      h.act('recall'); h.tick(44); h.act('jump');
      h.until(() => h.g.body.grounded); assert.equal(h.observe().view.phase, 'land');
      h.act('setReducedMotion', true); assert.equal(h.observe().view.landing, 0);
      h.act('setReducedMotion', false); assert.equal(h.observe().view.landing, 0);
      h.act('restart'); assert.equal(h.observe().view.phase, 'idle');
      assert.equal(h.g.deaths, 0);
      t.diagnostic(`chapter ${chapter + 1}: ${h.steps} integrated same-input ${baselineLabel} comparisons; original controls, no coordinate injection`);
    } finally { h.close(); }
  }
});

test('both actual library books carry a zero-input rider through a whole vertical cycle with signed lift and no repeated landing', t => {
  const h = pair(3);
  try {
    for (const [id, x, low] of [['book-a', 691, 478], ['book-b', 1439, 473]]) {
      h.walk(x);
      const p = h.g.movers.find(p => p.id === id);
      h.until(() => p.y >= low && p.dy > 0);
      assert.equal(h.act('jump'), true);
      h.until(() => h.g.body.grounded && h.g.body.platform === id, 180);
      h.tick(13); // allow the one genuine boarding contact to settle
      const relative = h.g.body.x - p.x, walkPhase = h.g.body.walk;
      let up = 0, down = 0, maxDrift = 0;
      const frames = Math.ceil((Math.PI * 2 / p.speed + .15) * 60);
      for (let i = 0; i < frames; i++) {
        h.tick(); const v = h.observe().view;
        assert.equal(v.phase, 'ride'); assert.equal(v.landingAge, null);
        assert.equal(v.platformId, id); assert.equal(v.platformAxis, 'y');
        assert.equal(v.balance, 0); assert.equal(h.g.body.vx, 0); assert.equal(h.g.body.walk, walkPhase);
        assert.deepEqual(h.g.input, { x: 0, y: 0 }); near(h.g.body.y, p.y);
        near(v.platformVerticalVelocity, p.dy * 60);
        maxDrift = Math.max(maxDrift, Math.abs(h.g.body.x - p.x - relative));
        if (p.dy < 0) { assert.ok(v.verticalBalance < 0); up++; }
        if (p.dy > 0) { assert.ok(v.verticalBalance > 0); down++; }
      }
      assert.ok(up > 100 && down > 100); assert.ok(maxDrift < 1e-9);
      const frozen = h.observe(); h.act('pause'); h.tick(30); assert.deepEqual(h.observe(), frozen);
      h.act('resume'); h.act('setReducedMotion', true); h.tick(30);
      assert.equal(h.observe().view.verticalBalance, 0); assert.equal(h.observe().view.ride, 0);
      h.act('setReducedMotion', false);
      t.diagnostic(`${id}: ${frames} zero-input frames, actual dy both signs, contact exact, max relative drift ${maxDrift}`);
      if (id === 'book-a') h.solveLamp(0);
    }
    assert.equal(h.g.deaths, 0);
    t.diagnostic(`${h.steps} integrated same-input ${baselineLabel} comparisons through both actual books and first actual lamp puzzle`);
  } finally { h.close(); }
});

test('a real greenhouse mushroom launch stays airborne until the original root collision', t => {
  const h = pair(1);
  try {
    h.walk(730); h.act('setInput', { x: 1, y: 0 });
    h.until(() => h.g.pads[0].boing > 0 && h.g.body.vy < -800, 60);
    assert.equal(h.g.body.vy, -850); assert.equal(h.g.body.grounded, false);
    assert.equal(h.observe().view.phase, 'rise'); assert.equal(h.observe().view.landing, 0);
    h.walk(970);
    assert.equal(h.g.body.y, 385); assert.equal(h.g.body.platform, null); assert.equal(h.g.deaths, 0);
    assert.ok(h.trace.some(sample => sample.phase === 'land' && sample.y === 385));
    const root = drawnShadow(h.g);
    assert.equal(root.surface.kind, 'root'); assert.equal(root.surface.y, 385); assert.equal(root.distance, 0);
    t.diagnostic(`${h.steps} unchanged ${baselineLabel} updates; real -850 mushroom, y385 root contact and clipped shadow`);
  } finally { h.close(); }
});

test('actual final-chapter horizontal book and mushroom root landing use the same unchanged physics', t => {
  const h = pair(5);
  try {
    h.walk(430); assert.equal(h.g.plateState.get('letter'), true); h.solveLamp(0);
    h.walk(760); assert.equal(h.act('jump'), true); h.until(() => h.g.body.grounded && h.g.body.y === 465, 100);
    h.walk(845); const p = h.g.movers[0];
    h.until(() => p.x <= 850 && p.dx > 0); h.act('setInput', { x: 1, y: 0 });
    h.until(() => h.g.body.grounded && h.g.body.platform === 'last-stage', 100);
    h.act('setInput', { x: 0, y: 0 }); h.until(() => h.g.body.vx === 0, 30); h.tick(13);
    const relative = h.g.body.x - p.x, walkPhase = h.g.body.walk;
    let left = 0, right = 0, maxDrift = 0;
    const frames = Math.ceil((Math.PI * 2 / p.speed + .15) * 60);
    for (let i = 0; i < frames; i++) {
      h.tick(); const v = h.observe().view;
      assert.equal(v.phase, 'ride'); assert.equal(v.platformId, 'last-stage');
      assert.equal(v.platformAxis, 'x'); assert.equal(v.platformKind, 'book'); assert.equal(v.verticalBalance, 0);
      assert.equal(h.g.body.walk, walkPhase); near(h.g.body.y, p.y);
      near(v.platformVelocity, p.dx * 60); maxDrift = Math.max(maxDrift, Math.abs(h.g.body.x - p.x - relative));
      if (p.dx < 0) left++; if (p.dx > 0) right++;
    }
    assert.ok(left > 100 && right > 100); assert.ok(maxDrift < 1e-9);
    h.until(() => p.x >= 1120 && p.dx > 0); assert.equal(h.act('jump'), true); h.walk(1280);
    assert.equal(h.g.body.y, 465); assert.equal(h.g.body.platform, null);
    h.walk(1440); h.act('setInput', { x: 1, y: 0 }); h.until(() => h.g.pads[0].boing > 0 && h.g.body.vy < -800, 60);
    assert.equal(h.g.body.vy, -850); assert.equal(h.observe().view.phase, 'rise');
    assert.equal(h.observe().view.landing, 0, 'the same-step mushroom launch is not a fake grounded landing');
    h.walk(1680); assert.equal(h.g.body.y, 390); assert.equal(h.g.deaths, 0);
    assert.ok(h.trace.some(s => s.phase === 'land' && s.y === 390));
    t.diagnostic(`${frames} actual book-cycle frames; max relative drift ${maxDrift}; real -850 mushroom and y390 root; ${h.steps} unchanged ${baselineLabel} updates`);
  } finally { h.close(); }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { isTravelerFaceScene, getTravelerFaceView, hasSoulJoy, drawTravelerSkullFront } from '../dist/dream-traveler-face.js';
import { drawRefinedSoul } from '../dist/dream-soul-art.js';
import { DreamGame } from '../dist/dream-engine.js';
import { DreamGame as BaseGame } from '../dist/dream-engine-base.js';

const noop = () => {}, copy = value => JSON.parse(JSON.stringify(value));
const clamp = (v, low, high) => Math.max(low, Math.min(high, v));
globalThis.window = { devicePixelRatio: 1, addEventListener: noop, removeEventListener: noop };
globalThis.document = { hidden: false, addEventListener: noop, removeEventListener: noop };
globalThis.requestAnimationFrame = () => 1; globalThis.cancelAnimationFrame = noop;
const gameView = extra => ({ mode: 'story', chapterIndex: 0, energy: 100, maxEnergy: 100,
  form: 'body', cap: { phase: 'closed' }, emoteTime: 0, options: { reducedMotion: false },
  level: { theme: { light: '#e9bf78', spirit: '#a2ead9' } },
  body: { x: 105, y: 560, vx: 0, face: 1 }, ...extra });
const soulView = extra => ({ x: 230, y: 430, vx: 40, vy: 0,
  scale: 1, alpha: 1, pose: 'free', layer: 'world', ...extra });
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

function context() {
  let values = { globalAlpha: .6, fillStyle: '#123456', strokeStyle: '#345678',
    lineWidth: 3, lineCap: 'square', lineJoin: 'bevel' }, path = [];
  const calls = [], paints = [], stack = [];
  const record = (method, args = []) => {
    for (const arg of args) if (typeof arg === 'number') assert.ok(Number.isFinite(arg), method + ' finite coordinates');
    calls.push([method, ...copy(args)]);
  };
  const segment = (method, args) => { record(method, args); path.push([method, ...args]); };
  const paint = kind => {
    const item = { kind, path: copy(path), paint: copy(kind === 'stroke' ? values.strokeStyle : values.fillStyle),
      alpha: values.globalAlpha, width: values.lineWidth };
    paints.push(item); record(kind, [item]);
  };
  const gradient = (kind, args) => ({ kind, args, stops: [], addColorStop(at, shade) { this.stops.push([at, shade]); } });
  const api = { calls, paints, snapshot: () => copy(values), balanced: () => assert.equal(stack.length, 0),
    save() { stack.push({ ...values }); record('save'); },
    restore() { assert.ok(stack.length, 'paired Canvas restore'); values = stack.pop(); record('restore'); },
    beginPath() { path = []; record('beginPath'); },
    moveTo(...args) { segment('moveTo', args); }, lineTo(...args) { segment('lineTo', args); },
    bezierCurveTo(...args) { segment('bezierCurveTo', args); }, quadraticCurveTo(...args) { segment('quadraticCurveTo', args); },
    closePath() { segment('closePath', []); },
    ellipse(...args) { assert.ok(args[2] >= 0 && args[3] >= 0); segment('ellipse', args); },
    arc(...args) { assert.ok(args[2] >= 0); segment('arc', args); },
    roundRect(...args) { segment('roundRect', args); },
    clip() { record('clip', [path]); }, fill() { paint('fill'); }, stroke() { paint('stroke'); },
    fillRect(...args) { const old = path; path = [['rect', ...args]]; paint('fillRect'); path = old; },
    createLinearGradient(...args) { record('linearGradient', args); return gradient('linear', args); },
    createRadialGradient(...args) { record('radialGradient', args); return gradient('radial', args); },
    measureText: text => ({ width: text.length * 8 }),
  };
  return new Proxy(api, {
    get(target, key) { if (key in target) return target[key]; if (key in values) return values[key]; return (...args) => record(key, args); },
    set(target, key, value) { if (key in target) target[key] = value; else values[key] = value; return true; },
  });
}
function skullPaint(game, shown = soulView(), t = .4) {
  const c = context(), before = c.snapshot(), input = JSON.stringify([game, shown]);
  assert.equal(drawTravelerSkullFront(c, game, game.body, t, shown), true);
  c.balanced(); assert.deepEqual(c.snapshot(), before); assert.equal(JSON.stringify([game, shown]), input);
  assert.equal(c.calls.filter(([method]) => ['translate', 'rotate', 'scale', 'transform', 'setTransform'].includes(method)).length, 0,
    'the face painter uses the one head matrix it was given');
  return c;
}
function soulPaint(game, shown, t = .4) {
  const c = context(), before = c.snapshot(); assert.equal(drawRefinedSoul(c, game, shown, t), true);
  c.balanced(); assert.deepEqual(c.snapshot(), before); return c;
}

test('only the six integer story chapters receive the face refinement', () => {
  for (let chapterIndex = 0; chapterIndex < 6; chapterIndex++) {
    const g = gameView({ chapterIndex, emoteTime: 2 });
    assert.equal(isTravelerFaceScene(g), true); assert.equal(getTravelerFaceView(g).kind, 'joy');
    assert.equal(hasSoulJoy(g, soulView()), true);
  }
  const invalid = [null, undefined, {}, ...[-1, 6, .5, '0', NaN, Infinity].map(chapterIndex => gameView({ chapterIndex })),
    ...['festival', 'survivor', '', null].map(mode => gameView({ mode, emoteTime: 2 }))];
  for (const g of invalid) {
    assert.equal(isTravelerFaceScene(g), false); assert.equal(getTravelerFaceView(g), null);
    assert.equal(hasSoulJoy(g, soulView()), false);
    const c = context(); assert.equal(drawTravelerSkullFront(c, g, g?.body, 0, soulView()), false);
    assert.deepEqual(c.calls, [], 'out-of-scope painter does not even enter Canvas state');
  }
});

test('original energy thresholds remain distinct and fatigue/attention outrank an event smile', () => {
  for (const energy of [0, 19.999, 20, 24.999, 25, 100]) {
    const g = gameView({ energy, emoteTime: 2 });
    assert.equal(getTravelerFaceView(g).kind, energy < 20 ? 'tired' : 'joy');
    assert.equal(hasSoulJoy(g, soulView()), energy >= 25);
    for (const extra of [{ form: 'soul' }, { cap: { phase: 'returning' } }, { cap: { phase: 'opening' } }]) {
      assert.equal(getTravelerFaceView(gameView({ ...g, ...extra })).kind, energy < 20 ? 'tired' : 'attentive');
    }
  }
  for (const emoteTime of [0, -.01, NaN, undefined]) {
    assert.equal(getTravelerFaceView(gameView({ emoteTime })).kind, 'neutral');
    assert.equal(hasSoulJoy(gameView({ emoteTime }), soulView()), false);
  }
  assert.equal(getTravelerFaceView(gameView({ emoteTime: .000001 })).kind, 'joy', 'no new duration or shortened event cutoff');
  for (const pose of ['return', 'peek', undefined]) for (const layer of ['inside', 'world'])
    assert.equal(hasSoulJoy(gameView({ emoteTime: 2 }), soulView({ pose, layer })), false);
  assert.equal(hasSoulJoy(gameView({ emoteTime: 2 }), soulView({ layer: 'inside' })), false);
});

test('blink timing, given shown-soul gaze and reduced-motion clock keep their original contracts', () => {
  const g = gameView({ form: 'soul', body: { x: 100, y: 560, vx: -180, face: -1 },
    soul: { x: 4000, y: 90 }, getSoulPresentation() { throw new Error('recursive presentation read'); } });
  for (const [shownX, expected] of [[-1000, 3], [100, 0], [300, -2], [1000, -3]]) {
    const view = getTravelerFaceView(g, g.body, 0, soulView({ x: shownX }));
    assert.ok(Math.abs(view.lookX - expected) < 1e-12); assert.equal(view.lookY, -2.7);
  }
  for (const extra of [{}, { energy: 19 }, { cap: { phase: 'opening' } }, { emoteTime: 2 }]) {
    const viewGame = gameView(extra);
    for (let t = 0; t < 6; t += .03) {
      const blink = Math.sin(t * 1.27 + .4) > .985 ? .12
        : viewGame.energy < 20 ? .43 : viewGame.cap.phase === 'opening' ? 1.06 : viewGame.emoteTime > 0 ? .7 : 1;
      assert.equal(getTravelerFaceView(viewGame, viewGame.body, t).blink, blink);
    }
  }
  const reduced = gameView({ emoteTime: 2, options: { reducedMotion: true } });
  assert.deepEqual(getTravelerFaceView(reduced, reduced.body, 0), getTravelerFaceView(reduced, reduced.body, 999));
  assert.deepEqual(skullPaint(reduced, soulView(), 0).calls, skullPaint(reduced, soulView(), 999).calls);
  assert.deepEqual(soulPaint(reduced, soulView(), 0).calls, soulPaint(reduced, soulView(), 999).calls);
});

test('joy and fatigue change the eye/mouth silhouettes and retain finite pure balanced drawings', () => {
  const normal = skullPaint(freeze(gameView())), joyful = skullPaint(freeze(gameView({ emoteTime: 2 }))),
    tired = skullPaint(freeze(gameView({ energy: 19, emoteTime: 2 })));
  const sockets = c => c.paints.filter(p => p.paint === '#2d303d').map(p => p.path);
  assert.equal(sockets(joyful).length, 2); assert.equal(sockets(tired).length, 2);
  assert.notDeepEqual(sockets(joyful), sockets(normal)); assert.notDeepEqual(sockets(joyful), sockets(tired));
  assert.ok(joyful.paints.some(p => p.paint === '#75604e' && p.path.some(s => s[0] === 'bezierCurveTo')), 'a broad open smile');
  assert.ok(tired.paints.some(p => p.paint === '#796554' && p.path[0]?.[0] === 'ellipse'), 'fatigue retains a round O mouth');
  assert.deepEqual(joyful.calls, skullPaint(freeze(gameView({ emoteTime: 2 }))).calls);
  assert.ok(joyful.calls.length < 180, 'bounded drawing, no new renderer loop');
  assert.equal(drawTravelerSkullFront({}, gameView(), gameView().body, 0), false);
});

test('main-story soul joy leaves the original pearl, held-object anchors and protected expressions intact', () => {
  const valid = gameView({ emoteTime: 2 }), outside = gameView({ emoteTime: 2, mode: 'festival' });
  const free = soulView(), joyful = soulPaint(valid, free), original = soulPaint(outside, free);
  const silhouette = c => c.paints.filter(p => p.path[0]?.[0] === 'moveTo' && p.path[0][1] === -15 && p.path[0][2] === 4);
  assert.deepEqual(silhouette(joyful), silhouette(original), 'no replacement pearl silhouette or material');
  assert.notDeepEqual(joyful.calls, original.calls, 'healthy true event changes the free face');
  for (const extra of [{ emoteTime: 0 }, { energy: 24.999 }, { energy: 0 }]) {
    assert.deepEqual(soulPaint(gameView({ ...valid, ...extra }), free).calls,
      soulPaint(gameView({ ...outside, ...extra }), free).calls);
  }
  for (const pose of ['return', 'peek']) for (const layer of ['world', 'inside'])
    assert.deepEqual(soulPaint(valid, soulView({ pose, layer })).calls, soulPaint(outside, soulView({ pose, layer })).calls);
  for (const key of ['firstTicket', 'greenhousePlant']) {
    const held = soulPaint(gameView({ ...valid, [key]: { phase: 'held' } }), free);
    const heldOriginal = soulPaint(gameView({ ...outside, [key]: { phase: 'held' } }), free);
    // The held object is the exact final painter; use its common trailing draw
    // sequence, after the only changed eye/mouth paths.
    const lastSoulStar = calls => calls.findLastIndex(row => row[0] === 'fill'
      && row[1]?.paint === '#e9bf78bb');
    assert.deepEqual(held.calls.slice(lastSoulStar(held.calls) + 1), heldOriginal.calls.slice(lastSoulStar(heldOriginal.calls) + 1));
  }
});

test('non-story engine integration delegates to the exact original skull painter', () => {
  for (const extra of [{ mode: 'festival' }, { mode: 'survivor' }, { chapterIndex: -1 }, { chapterIndex: 6 }]) {
    const g = gameView({ ...extra, emoteTime: 2 }), shown = soulView(), actual = context(), expected = context();
    DreamGame.prototype.drawSkullFront.call(g, actual, g.body, .4, shown);
    BaseGame.prototype.drawSkullFront.call(g, expected, g.body, .4, shown);
    assert.deepEqual(actual.calls, expected.calls);
  }
});

test('real ticket pickup and actual cap closure use only the original remaining event time, beside BaseGame', () => {
  const make = Class => {
    const c = context(), canvas = { getContext: () => c, getBoundingClientRect: () => ({ width: 320, height: 431 }) };
    const g = new Class(canvas); g.start({ chapterIndex: 0, sound: false }); return g;
  };
  const games = [make(DreamGame), make(BaseGame)], [g, base] = games;
  const state = game => JSON.stringify({ body: game.body, soul: game.soul, energy: game.energy, time: game.time,
    visualTime: game.visualTime, emoteTime: game.emoteTime, cap: game.cap, form: game.form, state: game.state,
    memories: game.memories, lamps: game.lanterns, firstTicket: game.firstTicket, deaths: game.deaths });
  const equal = () => {
    assert.equal(state(g), state(base));
    assert.deepEqual(g.getCharacterPresentation().rig, base.getCharacterPresentation().rig);
  };
  const act = (method, ...args) => { const results = games.map(game => game[method](...args)); assert.deepEqual(results[0], results[1]); equal(); return results[0]; };
  const tick = (count = 1) => { for (let i = 0; i < count; i++) { games.forEach(game => game.update(1 / 60)); equal(); } };
  try {
    tick(12); assert.equal(act('toggleSoul'), true); tick(40);
    for (let i = 0; i < 300 && !g.memories[0].collected; i++) {
      const target = g.memories[0]; act('setInput', { x: clamp((target.x - g.soul.x) / 65, -1, 1), y: clamp((target.y - g.soul.y) / 65, -1, 1) }); tick();
    }
    assert.ok(g.memories[0].collected); assert.equal(g.emoteTime, 2.3); assert.equal(g.firstTicket.phase, 'held');
    const shown = g.getSoulPresentation(g.getCharacterPresentation());
    assert.equal(hasSoulJoy(g, shown), true); assert.equal(getTravelerFaceView(g, g.body, g.visualTime, shown).kind, 'attentive');
    act('setInput', { x: 0, y: 0 }); assert.equal(act('pause'), true);
    const paused = state(g); tick(20); assert.equal(state(g), paused); assert.equal(act('resume'), true);
    assert.equal(act('recall'), true); tick(10);
    assert.equal(getTravelerFaceView(g, g.body, g.visualTime, g.getSoulPresentation()).kind, 'attentive');
    for (let i = 0; i < 90 && g.cap.phase !== 'closed'; i++) tick();
    assert.equal(g.cap.phase, 'closed'); assert.ok(g.emoteTime > 0 && g.emoteTime < 2.3);
    assert.equal(getTravelerFaceView(g, g.body, g.visualTime).kind, 'joy');
    for (let i = 0; i < 180 && g.emoteTime > 0; i++) tick();
    assert.equal(g.emoteTime, 0); assert.equal(getTravelerFaceView(g, g.body, g.visualTime).kind, 'neutral');
    assert.equal(g.deaths, 0); assert.equal(g.firstTicket.phase, 'stowed');
  } finally { games.forEach(game => game.destroy()); }
});

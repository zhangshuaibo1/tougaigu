import test from 'node:test';
import assert from 'node:assert/strict';
import { drawRefinedSoul } from '../dist/dream-soul-art.js';
import { drawFirstTicket } from '../dist/dream-first-ticket-art.js';
import { drawGreenhouseSeed } from '../dist/dream-greenhouse-art.js';
import { DreamGame as BaseGame } from '../dist/dream-engine-base.js';

const TAU = Math.PI * 2, noop = () => {};
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const multiply = (a, b) => [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1],
  a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3], a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]];
const copy = value => JSON.parse(JSON.stringify(value));
function freeze(value) {
  if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value); }
  return value;
}
const gameView = (extra = {}) => ({ options: { reducedMotion: false },
  level: { theme: { spirit: '#a2ead9', light: '#e9bf78' } }, energy: 84, maxEnergy: 100,
  emoteTime: 0, firstTicket: { phase: 'missing' }, greenhousePlant: { phase: 'missing' },
  // Deliberately unrelated to the presented pose: the painter must use the cap
  // rig's presentation and must not recompute a world soul from these values.
  body: { x: 900, y: 560, face: -1 }, soul: { x: 1400, y: 350, vx: -340, vy: 120 }, ...extra });
const soulView = (extra = {}) => ({ x: 173.25, y: 247.5, vx: 90, vy: -30, scale: 1, alpha: 1, pose: 'free', layer: 'world', ...extra });

function context() {
  let matrix = [1.1, .08, -.12, .9, 31, 17], path = [];
  let values = { globalAlpha: .63, fillStyle: '#203040', strokeStyle: '#aabbcc',
    lineWidth: 3.7, lineCap: 'square', lineJoin: 'bevel' };
  const stack = [], calls = [], paints = [];
  const snapshot = () => ({ matrix: [...matrix], values: { ...values } });
  const record = (name, args = []) => {
    for (const value of args) if (typeof value === 'number') assert.ok(Number.isFinite(value), `${name}: finite Canvas coordinates`);
    calls.push([name, ...copy(args)]);
  };
  const segment = (name, args) => { record(name, args); path.push([name, ...args]); };
  const paint = kind => {
    const item = { kind, path: copy(path), matrix: [...matrix], alpha: values.globalAlpha,
      paint: copy(kind === 'stroke' ? values.strokeStyle : values.fillStyle) };
    if (kind === 'stroke') Object.assign(item, { width: values.lineWidth, cap: values.lineCap, join: values.lineJoin });
    paints.push(item); record(kind, [item]);
  };
  const makeGradient = (kind, args) => {
    record(kind, args); if (api.fail === kind) throw new Error('Canvas gradient unavailable');
    const result = { kind, args: [...args], matrix: [...matrix], stops: [],
      addColorStop(at, shade) { assert.ok(at >= 0 && at <= 1); this.stops.push([at, shade]); } };
    return result;
  };
  const api = { calls, paints, fail: null, snapshot, balanced: () => assert.equal(stack.length, 0),
    save() { stack.push(snapshot()); record('save'); },
    restore() { assert.ok(stack.length, 'no extra restore'); const state = stack.pop(); matrix = state.matrix; values = state.values; record('restore'); },
    translate(x, y) { record('translate', [x, y]); matrix = multiply(matrix, [1, 0, 0, 1, x, y]); },
    rotate(angle) { record('rotate', [angle]); matrix = multiply(matrix, [Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0]); },
    scale(x, y) { record('scale', [x, y]); matrix = multiply(matrix, [x, 0, 0, y, 0, 0]); },
    beginPath() { path = []; record('beginPath'); },
    moveTo(...args) { segment('moveTo', args); }, lineTo(...args) { segment('lineTo', args); },
    bezierCurveTo(...args) { segment('bezierCurveTo', args); }, quadraticCurveTo(...args) { segment('quadraticCurveTo', args); },
    closePath() { segment('closePath', []); },
    ellipse(...args) { assert.ok(args[2] >= 0 && args[3] >= 0); segment('ellipse', args); },
    arc(...args) { assert.ok(args[2] >= 0); segment('arc', args); },
    roundRect(...args) { assert.ok(args[2] > 0 && args[3] > 0); segment('roundRect', args); },
    fill() { paint('fill'); }, stroke() { assert.ok(values.lineWidth > 0); paint('stroke'); },
    fillRect(...args) { const prior = path; path = [['rect', ...args]]; record('fillRect', args); paint('fillRect'); path = prior; },
    createLinearGradient(...args) { return makeGradient('linearGradient', args); },
    createRadialGradient(...args) { assert.ok(args[2] >= 0 && args[5] >= 0); return makeGradient('radialGradient', args); },
  };
  return new Proxy(api, { get: (target, key) => key in target ? target[key] : values[key],
    set(target, key, value) { if (key in target) target[key] = value; else values[key] = value; return true; } });
}
function painted(game = gameView(), soul = soulView(), t = .47) {
  const c = context(), before = c.snapshot();
  assert.equal(drawRefinedSoul(c, game, soul, t), true); c.balanced();
  assert.deepEqual(c.snapshot(), before, 'transform, alpha and paints return to the caller'); return c;
}
const bodyPath = c => c.paints.find(p => p.kind === 'fill' && p.path[0]?.[0] === 'moveTo' && p.path[0][1] === -15 && p.path[0][2] === 4)?.path;
const eyeEllipses = c => c.paints.filter(p => p.kind === 'fill' && p.path[0]?.[0] === 'ellipse'
  && [-6, 7].includes(p.path[0][1]) && p.path[0][2] === -6);
const energyArcs = c => c.paints.filter(p => p.kind === 'stroke' && p.path.some(segment => segment[0] === 'arc'));

test('all real soul layers and poses are deterministic pure drawings with balanced caller state', () => {
  for (const pose of ['free', 'peek', 'return']) for (const layer of ['inside', 'world']) for (const scale of [.32, .61, 1]) {
    const game = freeze(gameView()), soul = freeze(soulView({ pose, layer, scale, alpha: .63 })), before = JSON.stringify([game, soul]);
    const a = painted(game, soul), b = painted(game, soul);
    assert.deepEqual(a.calls, b.calls); assert.equal(JSON.stringify([game, soul]), before);
    assert.ok(a.paints.length > 15 && a.calls.length < 500, 'a bounded small vector drawing');
    assert.ok(a.paints.every(p => Math.abs(p.alpha - .63 * .63) < 1e-12), 'presentation alpha multiplies the existing caller alpha');
  }
});

test('the cap presentation owns the exact position, scale and inside-layer anchor', () => {
  const t = .47;
  for (const layer of ['inside', 'world']) for (const reducedMotion of [false, true]) {
    const soul = soulView({ x: 217.125, y: 83.5, vx: -237, scale: .57, alpha: .41, layer, pose: 'peek' });
    const c = painted(gameView({ options: { reducedMotion } }), soul, t);
    const bob = reducedMotion || layer === 'inside' ? 0 : Math.sin(t * 3) * 2;
    assert.deepEqual(c.calls.find(call => call[0] === 'translate'), ['translate', soul.x, soul.y + bob * soul.scale]);
    assert.deepEqual(c.calls.find(call => call[0] === 'scale'), ['scale', soul.scale, soul.scale]);
    assert.deepEqual(c.calls.find(call => call[0] === 'rotate'), ['rotate', reducedMotion ? 0 : clamp(soul.vx / 340, -1, 1) * .14]);
    assert.deepEqual(c.paints[0].path, [['rect', soul.x - 60 * soul.scale, soul.y - 60 * soul.scale, 120 * soul.scale, 120 * soul.scale]]);
  }
  const a = painted(gameView()), b = painted(gameView({ body: { x: -800, y: -20 }, soul: { x: 9999, y: -9999 } }));
  assert.deepEqual(a.calls, b.calls, 'world physics coordinates do not override a peeking/returning presentation');
});

test('tail curvature reads actual presented velocity while reduced motion freezes every decorative clock', () => {
  const poses = [soulView(), soulView({ pose: 'peek', layer: 'inside', scale: .54 }), soulView({ pose: 'return', layer: 'inside' })];
  for (const energy of [12, 84]) for (const s of poses) for (const carry of [{}, { firstTicket: { phase: 'held' } }, { greenhousePlant: { phase: 'returning' } }]) {
    const game = gameView({ options: { reducedMotion: true }, energy, emoteTime: 1, ...carry });
    assert.deepEqual(painted(game, s, 0).calls, painted(game, s, 193.75).calls, 'reduced motion includes tail, blink, highlights and carried items');
  }
  const game = gameView({ options: { reducedMotion: true } });
  const still = bodyPath(painted(game, soulView({ vx: 0, vy: 0 })));
  assert.notDeepEqual(still, bodyPath(painted(game, soulView({ vx: 300, vy: 0 }))));
  assert.notDeepEqual(still, bodyPath(painted(game, soulView({ vx: 0, vy: -340 }))));
  assert.notDeepEqual(bodyPath(painted(game, soulView({ vx: -300 }))), bodyPath(painted(game, soulView({ vx: 300 }))));
  assert.deepEqual(bodyPath(painted(game, soulView({ vx: 400, vy: -340 }))), bodyPath(painted(game, soulView({ vx: 10000, vy: -10000 }))), 'extreme finite velocity cannot stretch the tail outside its small envelope');
  assert.notDeepEqual(painted(gameView(), soulView(), .1).calls, painted(gameView(), soulView(), .9).calls, 'normal idle movement still uses the supplied clock');
});

test('low energy, peek and relieved return are readable poses and the original energy arc stays anchored', () => {
  const normal = painted(gameView(), soulView(), 0), tired = painted(gameView({ energy: 16 }), soulView(), 0);
  assert.equal(eyeEllipses(normal).length, 2); assert.equal(eyeEllipses(tired).length, 2);
  assert.ok(eyeEllipses(tired).every(p => p.path[0][4] < eyeEllipses(normal)[0].path[0][4]));
  assert.equal(energyArcs(normal).length, 0);
  const arc = energyArcs(tired); assert.equal(arc.length, 1);
  assert.deepEqual(arc[0].path, [['arc', 173.25, 247.5, 30, -Math.PI / 2, -Math.PI / 2 + TAU * .16]]);
  for (const energy of [16, 84]) {
    const returning = painted(gameView({ energy }), soulView({ pose: 'return', layer: 'inside' }), 0);
    assert.equal(eyeEllipses(returning).length, 0, 'return has curved smiling eyes, including a tired return');
    assert.equal(energyArcs(returning).length, 0, 'no energy arc across the open cap on return');
  }
  assert.notDeepEqual(normal.paints, painted(gameView(), soulView({ pose: 'peek' }), 0).paints, 'the little surprised peek is distinct from free flight');
});

test('the original ticket and seed art keep their exact carried transforms and only draw when actually held', () => {
  const t = .47, soul = soulView({ scale: .72, alpha: .8, pose: 'return', layer: 'inside' });
  for (const [key, painter, scale] of [['firstTicket', drawFirstTicket, .55], ['greenhousePlant', drawGreenhouseSeed, .65]]) {
    for (const phase of ['held', 'returning']) {
      const actual = painted(gameView({ [key]: { phase } }), soul, t), expected = context();
      expected.globalAlpha *= soul.alpha;
      expected.translate(soul.x, soul.y); expected.rotate(clamp(soul.vx / 340, -1, 1) * .14); expected.scale(soul.scale, soul.scale);
      painter(expected, { x: 0, y: 13, scale, held: true }, t, false);
      assert.deepEqual(actual.paints.slice(-expected.paints.length), expected.paints, `${key} uses the existing item and hands, down to the drawn world transforms`);
    }
    const missing = painted(gameView(), soul, t);
    for (const phase of ['missing', 'stowed', 'planted']) assert.deepEqual(painted(gameView({ [key]: { phase } }), soul, t).paints, missing.paints);
  }
});

test('invalid presentations decline without drawing, invisible poses are handled, and optional data is finite', () => {
  for (const s of [null, {}, soulView({ x: NaN }), soulView({ y: Infinity }), soulView({ scale: NaN }), soulView({ scale: -1 }), soulView({ alpha: NaN }), soulView({ scale: 21 })]) {
    const c = context(), before = c.snapshot(); assert.equal(drawRefinedSoul(c, gameView(), s), false);
    assert.equal(c.calls.length, 0); assert.deepEqual(c.snapshot(), before);
  }
  assert.equal(drawRefinedSoul(null, gameView(), soulView()), false);
  assert.equal(drawRefinedSoul({}, gameView(), soulView()), false);
  assert.equal(drawRefinedSoul(context(), null, soulView()), false);
  for (const extra of [{ alpha: 0 }, { alpha: -1 }, { scale: 0 }]) assert.equal(painted(gameView(), soulView(extra)).paints.length, 0);
  const fallback = painted({ energy: NaN, maxEnergy: Infinity, options: {}, level: { theme: { spirit: 'invalid', light: 'red' } } }, soulView({ vx: NaN, vy: Infinity }), NaN);
  assert.ok(fallback.paints.length); assert.equal(energyArcs(fallback).length, 0);
  for (const kind of ['linearGradient', 'radialGradient']) {
    const c = context(), before = c.snapshot(); c.fail = kind;
    assert.equal(drawRefinedSoul(c, gameView(), soulView()), false); c.balanced(); assert.deepEqual(c.snapshot(), before);
  }
});

globalThis.window = { devicePixelRatio: 1, addEventListener: noop, removeEventListener: noop };
globalThis.document = { hidden: false, addEventListener: noop, removeEventListener: noop };
globalThis.requestAnimationFrame = () => 1; globalThis.cancelAnimationFrame = noop;
const tick = (game, frames) => { for (let i = 0; i < frames; i++) game.update(1 / 60); };
const physicalState = game => JSON.stringify({ body: game.body, soul: game.soul, form: game.form,
  cap: game.cap, energy: game.energy, firstTicket: game.firstTicket, greenhousePlant: game.greenhousePlant,
  memories: game.memories, lamps: game.lanterns, time: game.time, visualTime: game.visualTime });
function makeEngine() {
  const c = new Proxy({ globalAlpha: 1, createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }), measureText: text => ({ width: String(text).length * 10 }) },
  { get: (object, key) => key in object ? object[key] : noop });
  const game = new BaseGame({ getContext: () => c, getBoundingClientRect: () => ({ width: 1100, height: 640 }) });
  game.start({ chapterIndex: 0, sound: false }); return game;
}
test('normal engine opening, free flight and return presentations render without changing gameplay; pause freezes them', () => {
  const game = makeEngine(); assert.equal(game.toggleSoul(), true); tick(game, 23);
  let s = game.getSoulPresentation(); assert.equal(s.pose, 'peek'); assert.equal(s.layer, 'inside');
  assert.notEqual(s.y, game.soul.y, 'this is the real cap interpolation, not a manually posed soul');
  const verify = () => { const before = physicalState(game); const result = painted(game, game.getSoulPresentation(), game.visualTime); assert.equal(physicalState(game), before); return result; };
  verify(); tick(game, 22); assert.equal(game.getSoulPresentation().layer, 'world'); verify();
  game.setInput({ x: 1, y: -1 }); tick(game, 12); verify();
  assert.equal(game.recall(), true); tick(game, 10); s = game.getSoulPresentation();
  assert.equal(s.pose, 'return'); assert.equal(s.layer, 'inside'); assert.ok(s.scale < 1 && s.alpha > 0);
  game.pause(); const before = physicalState(game), a = verify(); tick(game, 90); const b = verify();
  assert.equal(physicalState(game), before); assert.deepEqual(a.calls, b.calls, 'paused return has identical geometry, face and light');
  game.resume(); tick(game, 45); assert.equal(game.getSoulPresentation(), null); game.destroy();
});

// Optional offline raster review, intentionally independent of CI dependencies.
// SOUL_ART_V22_OUTPUT=/tmp/tougaigu-v22-soul node --test tests/soul-art-v22.test.mjs
// Normal-size and zoomed pose rows are explicit art fixtures. The full scenes
// below use the production engine and ordinary input; neither is browser QA.
if (process.env.SOUL_ART_V22_OUTPUT) test('offline Canvas poses and real pickup/return review', async () => {
  const { createRequire } = await import('node:module');
  const { mkdir, writeFile } = await import('node:fs/promises');
  const { resolve } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { DreamGame } = await import('../dist/dream-engine.js');
  const require = createRequire(import.meta.url);
  const { createCanvas, loadImage } = require(require.resolve('@napi-rs/canvas', { paths: [process.cwd(), process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || ''] }));
  const folder = resolve(process.env.SOUL_ART_V22_OUTPUT); await mkdir(folder, { recursive: true });
  const frames = [], rasterChecks = [];
  const save = async (canvas, name) => { await writeFile(resolve(folder, name), await canvas.encode('png')); frames.push(name); };
  const pixels = canvas => Buffer.from(canvas.data());
  const words = (c, text, x, y, size = 12) => { c.fillStyle = '#dfe8cf'; c.font = `${size}px sans-serif`; c.textAlign = 'left'; c.fillText(text, x, y); };
  const poses = [
    ['quiet', {}, { vx: 0, vy: 0 }], ['fly right', {}, { vx: 300, vy: -60 }],
    ['fly left', {}, { vx: -300, vy: 80 }], ['peek', {}, { pose: 'peek', layer: 'inside', scale: .6, vx: 0 }],
    ['low energy', { energy: 16 }, { vx: 0, vy: 0 }], ['return smile', {}, { pose: 'return', layer: 'inside', vx: -140, vy: 0 }],
    ['held ticket', { firstTicket: { phase: 'held' } }, { vx: 0, vy: 0 }],
    ['held seed', { greenhousePlant: { phase: 'held' } }, { vx: 0, vy: 0 }],
  ];
  const sheet = createCanvas(1040, 590), c = sheet.getContext('2d');
  c.fillStyle = '#213746'; c.fillRect(0, 0, sheet.width, sheet.height);
  words(c, 'Offline art fixtures: original / refined / 320px play scale / 2.5x inspection', 13, 22, 14);
  for (const [row, label, y] of [[0, 'ORIGINAL 1x', 57], [1, 'REFINED 1x', 185], [2, 'REFINED phone scale', 307], [3, 'REFINED detail', 398]]) words(c, label, 12, y, 10);
  for (const [index, [name, gameExtra, soulExtra]] of poses.entries()) {
    const game = gameView(gameExtra), s = soulView({ x: 0, y: 0, ...soulExtra });
    words(c, name, index * 130 + 12, 40, 11);
    for (const [row, scale, y] of [[0, 1, 109], [1, 1, 237], [2, 431 / 640, 351], [3, 2.5, 496]]) {
      c.save(); c.translate(index * 130 + 65, y); c.scale(scale, scale);
      if (row === 0) BaseGame.prototype.drawSoul.call(game, c, s, .83); else assert.equal(drawRefinedSoul(c, game, s, .83), true);
      c.restore();
    }
    const actual = createCanvas(160, 160), a = actual.getContext('2d'); a.translate(80, 76);
    a.globalAlpha = .73; a.lineWidth = 2.9; a.setLineDash([3, 7]);
    const transform = a.getTransform(), dash = a.getLineDash(), alpha = a.globalAlpha, lineWidth = a.lineWidth, before = JSON.stringify([game, s]);
    assert.equal(drawRefinedSoul(a, game, s, .83), true);
    assert.deepEqual(a.getTransform(), transform); assert.deepEqual(a.getLineDash(), dash);
    assert.equal(a.globalAlpha, alpha); assert.equal(a.lineWidth, lineWidth); assert.equal(JSON.stringify([game, s]), before);
    rasterChecks.push(`${name}: real Canvas transform/alpha/dash/input retained`);
  }
  await save(sheet, 'soul-pose-comparison.png');

  for (const vx of [-400, 0, 400]) for (const vy of [-340, 0, 340]) {
    const canvas = createCanvas(160, 160), c = canvas.getContext('2d');
    drawRefinedSoul(c, gameView(), soulView({ x: 80, y: 80, vx, vy }), .83);
    const data = canvas.data();
    for (let y = 0; y < 160; y++) for (let x = 0; x < 160; x++) if (data[(y * 160 + x) * 4 + 3] > 180)
      assert.ok(x >= 50 && x <= 110 && y >= 42 && y <= 116, 'opaque body stays in the original small play-size envelope');
  }
  rasterChecks.push('9 extreme flight poses: opaque body remains within original play-size envelope');

  class ReviewGame extends DreamGame {
    drawSoul(ctx, s, t) { if (!drawRefinedSoul(ctx, this, s, t)) BaseGame.prototype.drawSoul.call(this, ctx, s, t); }
  }
  const routes = [];
  for (const [name, width, height] of [['desktop', 1100, 640], ['phone-390', 390, 595], ['phone-320', 320, 431]]) {
    const canvas = createCanvas(width, height), pending = []; canvas.getBoundingClientRect = () => ({ width, height });
    const imageLoader = src => { const p = loadImage(fileURLToPath(new URL(src, new URL('../dist/', import.meta.url)))); pending.push(p); return p; };
    const game = new ReviewGame(canvas, {}, { loadImage: imageLoader, loadTheatreImage: imageLoader });
    game.start({ chapterIndex: 0, sound: false });
    await game.paintedScenes.request({ mode: game.mode, chapterIndex: game.chapterIndex });
    await Promise.all(pending); assert.ok(game.getPaintedStationImage());
    const capture = async label => { const before = physicalState(game); game.render(); assert.equal(physicalState(game), before); await save(canvas, `${name}-${label}.png`); };
    assert.equal(game.toggleSoul(), true); tick(game, 23);
    assert.equal(game.getSoulPresentation().pose, 'peek'); await capture('peek');
    const ticket = game.memories[0];
    for (let frame = 0; frame < 240 && !ticket.collected; frame++) {
      game.setInput({ x: clamp((ticket.x - game.soul.x) / 60, -1, 1), y: clamp((ticket.y - game.soul.y) / 60, -1, 1) }); game.update(1 / 60);
    }
    game.setInput({ x: 0, y: 0 }); tick(game, 20); assert.equal(game.firstTicket.phase, 'held'); await capture('ticket-held');
    assert.equal(game.recall(), true); tick(game, 12); assert.equal(game.firstTicket.phase, 'returning'); await capture('ticket-returning');
    game.pause(); game.render(); const paused = pixels(canvas), state = physicalState(game); tick(game, 90); game.render();
    assert.deepEqual(pixels(canvas), paused); assert.equal(physicalState(game), state);
    game.resume(); tick(game, 40); assert.equal(game.firstTicket.phase, 'stowed');
    game.setReducedMotion(true); assert.equal(game.toggleSoul(), true); tick(game, 10); game.render();
    const still = pixels(canvas); game.visualTime += 137; game.render(); assert.deepEqual(pixels(canvas), still);
    routes.push({ width, height, realInput: true, collectedTicket: ticket.collected, returnedTicket: game.firstTicket.phase, deaths: game.deaths, pausedPixelsEqual: true, reducedMotionPixelsEqual: true });
    game.destroy();
  }
  // Check the mint silhouette against the theatre's warm brass and curtains,
  // using a normal walk and flight to its first authored lamp. This does not
  // solve a lamp, invent a reward or claim that the chapter was completed.
  {
    const width = 390, height = 595, canvas = createCanvas(width, height), pending = [];
    canvas.getBoundingClientRect = () => ({ width, height });
    const imageLoader = src => { const p = loadImage(fileURLToPath(new URL(src, new URL('../dist/', import.meta.url)))); pending.push(p); return p; };
    const game = new ReviewGame(canvas, {}, { loadImage: imageLoader, loadTheatreImage: imageLoader });
    game.start({ chapterIndex: 2, sound: false });
    await game.theatreScenes.request({ mode: game.mode, chapterIndex: game.chapterIndex }); await Promise.all(pending);
    assert.ok(game.getPaintedTheatreImage());
    for (let frame = 0; frame < 160 && game.body.x < 490; frame++) { game.setInput({ x: 1, y: 0 }); game.update(1 / 60); }
    game.setInput({ x: 0, y: 0 }); tick(game, 10); assert.equal(game.toggleSoul(), true);
    const lamp = game.lanterns[0];
    for (let frame = 0; frame < 180; frame++) {
      const dx = lamp.x - game.soul.x, dy = lamp.y + 35 - game.soul.y;
      game.setInput({ x: clamp(dx / 60, -1, 1), y: clamp(dy / 60, -1, 1) }); game.update(1 / 60);
      if (Math.hypot(dx, dy) < 8 && frame > 40) break;
    }
    game.setInput({ x: 0, y: 0 }); tick(game, 18);
    const before = physicalState(game); game.render(); assert.equal(physicalState(game), before);
    assert.equal(game.getSoulPresentation().pose, 'free'); assert.equal(game.deaths, 0); assert.equal(lamp.lit, false);
    await save(canvas, 'phone-390-theatre-free.png');
    rasterChecks.push('theatre: real walk/flight near first lamp; unlit state and zero deaths retained'); game.destroy();
  }
  await writeFile(resolve(folder, 'soul-review-report.json'), JSON.stringify({
    frames, rasterChecks, routes, poseSheetUsesExplicitFixtures: true, productionEngineWithLocalPainterOverride: true,
    browserQA: false, note: 'Offline Canvas only; webpage HUD and physical touch are not covered. Chinese Canvas fonts may be unavailable.',
  }, null, 2) + '\n');
  console.log(JSON.stringify({ folder, frames: frames.length, rasterChecks: rasterChecks.length, routes }));
});

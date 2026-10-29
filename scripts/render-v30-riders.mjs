// Offline production Canvas evidence from actual control-method routes.
// No coordinates, attachment, energy, progress, or clock are assigned. Direct
// chapter initialization is an explicit offline fixture, not browser unlocking.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DreamGame } from '../dist/dream-engine.js';
import { DreamGame as BaseGame } from '../dist/dream-engine-base.js';
import { transformCapPoint } from '../dist/dream-cap-art.js';
import { getTravelerMotion } from '../dist/dream-traveler-art.js';
import { getGroundShadowView } from '../dist/dream-ground-shadow.js';

const folder = resolve(process.argv[2] || '/tmp/tougaigu-v30-riders');
assert.ok(process.argv[3], 'Pass an independent unchanged baseline dist directory');
const baseline = resolve(process.argv[3]), baselineCommit = process.argv[4];
assert.match(baselineCommit || '', /^[a-f0-9]{40}$/, 'Pass the independently verified baseline commit');
const { DreamGame: PreviousGame } = await import(pathToFileURL(resolve(baseline, 'dream-engine.js')).href);
const require = createRequire(import.meta.url);
const { createCanvas, loadImage } = require(require.resolve('@napi-rs/canvas', {
  paths: [process.cwd(), process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || ''],
}));
const noop = () => {};
globalThis.window = { devicePixelRatio: 1, addEventListener: noop, removeEventListener: noop };
globalThis.document = { hidden: false, addEventListener: noop, removeEventListener: noop };
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = noop;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const near = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-8, message || `${a} differs from ${b}`);
const pixels = canvas => Buffer.from(canvas.data());
const physical = g => JSON.stringify({ body: g.body, soul: g.soul, form: g.form, state: g.state,
  input: g.input, time: g.time, visualTime: g.visualTime, runId: g.runId, energy: g.energy,
  deaths: g.deaths, cap: g.cap, movers: g.movers, lamps: g.lanterns, memories: g.memories,
  particles: g.particles, hazards: g.hazards, checkpoint: g.checkpoint, pads: g.pads,
  firstTicket: g.firstTicket, greenhousePlant: g.greenhousePlant, plateState: [...g.plateState],
  pendingSeal: g.pendingSeal, pendingTalk: g.pendingTalk, capActivity: g.capActivity?.getSnapshot(),
  lostCase: g.lostCase?.getSnapshot(), moonPlay: g.moonPlay?.getSnapshot() });
const resources = Object.fromEntries(['loadImage', 'loadTheatreImage', 'loadLibraryImage',
  'loadCoastImage', 'loadPostImage'].map(key => [key, src => loadImage(fileURLToPath(src))]));
const sourceNames = ['dream-engine-base.js', 'dream-levels.js', 'dream-engine.js',
  'dream-traveler-performance.js', 'dream-traveler-art.js', 'dream-cap-art.js',
  'dream-station-art.js', 'dream-ground-shadow.js', 'dream-library-scene.js',
  'dream-post-scene.js', 'assets/library-painted-v26.webp', 'assets/post-painted-v28.webp'];
await mkdir(folder, { recursive: true });
const sources = [];
for (const name of sourceNames) {
  const currentSha256 = sha(await readFile(new URL('../dist/' + name, import.meta.url)));
  const baselineSha256 = sha(await readFile(resolve(baseline, name)));
  sources.push({ name, currentSha256, baselineSha256 });
  if (!['dream-engine.js', 'dream-traveler-performance.js'].includes(name)) {
    assert.equal(currentSha256, baselineSha256, name + ' retains the frozen v29 bytes');
  }
}
const frames = [], routes = [], pauses = [];
let comparedUpdates = 0;

async function makeRoute(chapterIndex, label, width, height) {
  const canvases = [createCanvas(width, height), createCanvas(width, height)];
  const events = [[], []], tape = [];
  canvases.forEach(c => { c.getBoundingClientRect = () => ({ width, height }); });
  const games = [DreamGame, PreviousGame].map((Class, i) => new Class(canvases[i], {
    onPuzzle: event => events[i].push({ type: 'puzzle', event }),
    onCapEvent: event => events[i].push({ type: 'cap', event }),
    onComplete: event => events[i].push({ type: 'complete', event }),
  }, resources));
  const [game, previous] = games;
  games.forEach(g => g.start({ chapterIndex, sound: false }));
  const assetKey = chapterIndex === 3 ? 'libraryScenes' : 'postScenes';
  await Promise.all(games.map(g => g[assetKey].request({ mode: 'story', chapterIndex })));
  games.forEach(g => assert.ok(chapterIndex === 3 ? g.getPaintedLibraryImage() : g.getPaintedPostImage(), 'use the real loaded production painting'));
  let updates = 0, activeUpdates = 0, gripSamples = 0, catchSamples = 0, claspSamples = 0;
  let maxSoleError = 0, maxGripError = 0, maxRightPriorityError = 0;

  function geometry() {
    const p = game.getCharacterPresentation(), old = BaseGame.prototype.getCharacterPresentation.call(game);
    assert.deepEqual(p.rig, old.rig, 'the one original head/body/cap rig remains authoritative');
    const motion = getTravelerMotion(game.body, { time: game.visualTime, hop: p.hop,
      reducedMotion: game.options.reducedMotion, performance: p.performance });
    const soles = motion.legs.filter(leg => leg.planted).map(leg => transformCapPoint(p.rig.bodyMatrix, leg.foot));
    for (const sole of soles) { maxSoleError = Math.max(maxSoleError, Math.abs(sole.y - game.body.y)); near(sole.y, game.body.y); }
    if (p.grip === 1) {
      gripSamples++;
      const error = Math.hypot(p.arms.left.world.x - p.rig.gripWorld.x, p.arms.left.world.y - p.rig.gripWorld.y);
      maxGripError = Math.max(maxGripError, error); near(error, 0, 'the occupied support hand stays on the actual cap grip');
    }
    if (p.catching === 1 || p.clasp === 1) {
      if (p.catching === 1) catchSamples++; if (p.clasp === 1) claspSamples++;
      const error = Math.hypot(p.arms.right.world.x - old.arms.right.world.x, p.arms.right.world.y - old.arms.right.world.y);
      maxRightPriorityError = Math.max(maxRightPriorityError, error); near(error, 0, 'catch and clasp take priority over free-arm balance');
    }
    return { rig: p.rig, soles, grip: p.grip, clasp: p.clasp, catching: p.catching,
      left: p.arms.left.world, right: p.arms.right.world };
  }
  function equalPhysical() {
    assert.equal(physical(game), physical(previous), 'same real inputs retain the candidate simulation');
    assert.deepEqual(events[0], events[1]);
  }
  function tick(n = 1) {
    tape.push({ method: 'update', count: n, dt: 1 / 60 });
    for (let i = 0; i < n; i++) {
      if (game.state === 'playing') activeUpdates++;
      games.forEach(g => g.update(1 / 60));
      updates++; comparedUpdates++; equalPhysical(); geometry();
    }
  }
  function act(method, ...args) {
    tape.push({ method, args });
    const results = games.map(g => g[method](...args));
    assert.deepEqual(results[0], results[1]); equalPhysical();
    return results[0];
  }
  function until(predicate, max = 1200) {
    for (let i = 0; i < max; i++) { if (predicate()) return; tick(); }
    assert.fail('Bounded actual-input route timed out: ' + physical(game));
  }
  function walk(x, max = 1000) {
    for (let i = 0; i < max; i++) {
      if (Math.abs(game.body.x - x) < 2 && Math.abs(game.body.vx) < 10 && game.body.grounded) {
        act('setInput', { x: 0, y: 0 }); tick(6); return;
      }
      act('setInput', { x: clamp((x - game.body.x) / 35, -1, 1), y: 0 }); tick();
    }
    assert.fail('Bounded normal walking failed: ' + physical(game));
  }
  function solveLamp(index) {
    const lamp = game.lanterns[index];
    assert.equal(act('toggleSoul'), true);
    for (let i = 0; i < 900; i++) {
      const dx = lamp.x - game.soul.x, dy = lamp.y - game.soul.y;
      if (Math.hypot(dx, dy) < 15 && Math.hypot(game.soul.vx, game.soul.vy) < 50) break;
      act('setInput', { x: clamp(dx / 75, -1, 1), y: clamp(dy / 75, -1, 1) }); tick();
    }
    act('setInput', { x: 0, y: 0 }); tick(5);
    assert.equal(act('pulse'), true); assert.equal(game.pendingSeal, index);
    assert.equal(act('resolvePuzzle', true), true); assert.equal(game.lanterns[index].lit, true);
    assert.equal(act('recall'), true); tick(70);
  }
  async function capture(name, { core = true } = {}) {
    const before = physical(game), view = game.getTravelerPerformanceView(), pose = geometry();
    assert.ok(view && game.body.grounded && pose.soles.length > 0);
    const shadow = getGroundShadowView({ body: game.body, level: game.level, movers: game.movers,
      closedBarriers: game.level.barriers.filter(b => !game.barrierOpen(b)) });
    assert.ok(shadow && shadow.distance === 0, 'the pictured feet stand on a real surface');
    const platform = game.movers.find(p => p.id === game.body.platform);
    if (platform) {
      assert.equal(view.platformId, platform.id); near(game.body.y, platform.y);
      for (const sole of pose.soles) assert.ok(sole.x >= platform.x && sole.x <= platform.x + platform.w, 'captured soles remain within the actual deck');
    }
    const prefix = `${label}-${name}`;
    let ablatedPixels, ablatedPng;
    // Local renderer ablation only. No runtime hook is added and no physical
    // sample changes; restore the original prototype method even on failure.
    game.getTravelerPerformanceView = () => null;
    try { game.render(); ablatedPixels = pixels(canvases[0]); ablatedPng = await canvases[0].encode('png'); }
    finally { delete game.getTravelerPerformanceView; }
    previous.render();
    assert.deepEqual(ablatedPixels, pixels(canvases[1]), 'the same-frame ablation is pixel-identical to the actual frozen v29 renderer');
    game.render(); const actualPixels = pixels(canvases[0]);
    assert.equal(physical(game), before); equalPhysical();
    assert.deepEqual(game.getTravelerPerformanceView(), view);
    const px = (game.body.x - game.camera) * game.scale;
    const py = game.body.y * game.scale + game.viewportOffsetY;
    let changed = 0, outside = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (actualPixels[i] === ablatedPixels[i] && actualPixels[i + 1] === ablatedPixels[i + 1]
        && actualPixels[i + 2] === ablatedPixels[i + 2] && actualPixels[i + 3] === ablatedPixels[i + 3]) continue;
      changed++;
      if (Math.abs(x - px) > 65 * game.scale + 2 || y < py - 135 * game.scale - 2 || y > py + 8 * game.scale + 2) outside++;
    }
    assert.equal(outside, 0, 'same-frame changes stay within the existing character drawing bounds');
    if (core) assert.ok(changed > 0, 'the actual-size core pose has a visible pixel change');
    const png = await canvases[0].encode('png');
    await writeFile(resolve(folder, prefix + '.png'), png);
    await writeFile(resolve(folder, prefix + '-ablated.png'), ablatedPng);
    frames.push({ file: prefix + '.png', ablatedFile: prefix + '-ablated.png', width, height,
      bytes: png.length, sha256: sha(png), ablatedBytes: ablatedPng.length, ablatedSha256: sha(ablatedPng),
      core, chapterIndex, physicsTime: game.time, form: game.form, capPhase: game.cap.phase,
      body: { ...game.body }, platform: platform ? { ...platform } : null, performance: view,
      shadow, pose, screenFeet: pose.soles.map(p => ({ x: (p.x - game.camera) * game.scale, y: p.y * game.scale + game.viewportOffsetY })),
      changedPixels: changed, outsideCharacter: outside, ablationEqualsFrozenCandidatePixels: true });
  }
  function pauseCanvas(name) {
    assert.equal(act('pause'), true); game.render();
    const before = physical(game), view = game.getTravelerPerformanceView(), rig = game.getCharacterPresentation().rig;
    const frozen = pixels(canvases[0]);
    for (let i = 0; i < 6; i++) {
      tick(); game.render();
      assert.equal(physical(game), before); assert.deepEqual(game.getTravelerPerformanceView(), view);
      assert.deepEqual(game.getCharacterPresentation().rig, rig); assert.deepEqual(pixels(canvases[0]), frozen);
    }
    pauses.push({ name: `${label}-${name}`, chapterIndex, updateAndRenderOpportunities: 6,
      bodyPlatform: game.body.platform, fullCanvasSha256: sha(frozen), fullCanvasAndViewAndRigFrozen: true,
      observedBrowserRAF: false });
    assert.equal(act('resume'), true);
  }
  async function occupiedHands(name) {
    assert.equal(act('toggleSoul'), true); tick(40);
    assert.equal(game.getCharacterPresentation().grip, 1);
    await capture(name + '-open', { core: false });
    assert.equal(act('recall'), true); tick(10);
    assert.equal(game.getCharacterPresentation().catching, 1);
    await capture(name + '-catch', { core: false });
    tick(44); assert.equal(game.cap.phase, 'closed');
  }
  function close(extra = {}) {
    assert.equal(game.deaths, 0);
    assert.ok(gripSamples > 0 && catchSamples > 0 && claspSamples > 0);
    routes.push({ label, chapterIndex, viewport: { width, height }, actualControlMethods: true,
      coordinateInjection: false, directChapterFixture: true, browserUnlocking: false, completeChapter: false,
      updates, activeUpdates, physicsTime: game.time, deaths: game.deaths,
      body: { ...game.body }, inputTapeSha256: sha(JSON.stringify(tape)), inputTapeEntries: tape.length,
      geometry: { maxSoleError, maxGripError, maxRightPriorityError, gripSamples, catchSamples, claspSamples }, ...extra });
  }
  return { game, tick, act, until, walk, solveLamp, capture, pauseCanvas, occupiedHands, close,
    destroy() { games.forEach(g => g.destroy()); } };
}

for (const [label, width, height] of [['phone-390', 390, 595], ['phone-320', 320, 431]]) {
  const library = await makeRoute(3, label, width, height);
  try {
    const cycles = [];
    for (const [id, x, low] of [['book-a', 691, 478], ['book-b', 1439, 473]]) {
      const h = library, g = h.game;
      h.walk(x); const p = g.movers.find(p => p.id === id);
      h.until(() => p.y >= low && p.dy > 0);
      assert.equal(h.act('jump'), true);
      h.until(() => g.body.grounded && g.body.platform === id, 180); h.tick(13);
      const relative = g.body.x - p.x, walkPhase = g.body.walk, captured = new Set();
      let up = 0, down = 0, maxRelativeDrift = 0;
      const cycleFrames = Math.ceil((Math.PI * 2 / p.speed + .15) * 60);
      for (let i = 0; i < cycleFrames; i++) {
        h.tick(); const view = g.getTravelerPerformanceView();
        assert.equal(view.phase, 'ride'); assert.equal(view.landingAge, null);
        assert.equal(g.body.platform, id); assert.equal(g.body.walk, walkPhase); assert.equal(g.body.vx, 0);
        assert.deepEqual(g.input, { x: 0, y: 0 }); near(g.body.y, p.y);
        maxRelativeDrift = Math.max(maxRelativeDrift, Math.abs(g.body.x - p.x - relative));
        if (p.dy < 0) { up++; assert.ok(view.verticalBalance < 0); }
        if (p.dy > 0) { down++; assert.ok(view.verticalBalance > 0); }
        // Capture a clear signed transport sample, away from the almost-still
        // turning point; this observes actual displacement and changes no pose.
        const direction = p.dy < -.75 ? 'up' : p.dy > .75 ? 'down' : null;
        if (direction && !captured.has(direction)) {
          await h.capture(id + '-' + direction); h.pauseCanvas(id + '-' + direction); captured.add(direction);
        }
      }
      assert.equal(captured.size, 2); assert.ok(up > 100 && down > 100); assert.ok(maxRelativeDrift < 1e-9);
      cycles.push({ id, cycleFrames, up, down, maxRelativeDrift });
      if (id === 'book-a') { await h.occupiedHands(id); h.solveLamp(0); }
    }
    library.close({ cycles });
  } finally { library.destroy(); }

  const post = await makeRoute(5, label, width, height);
  try {
    const h = post, g = h.game;
    h.walk(430); assert.equal(g.plateState.get('letter'), true); h.solveLamp(0);
    h.walk(760); assert.equal(h.act('jump'), true); h.until(() => g.body.grounded && g.body.y === 465, 100);
    h.walk(845); const p = g.movers[0];
    h.until(() => p.x <= 850 && p.dx > 0); h.act('setInput', { x: 1, y: 0 });
    h.until(() => g.body.grounded && g.body.platform === 'last-stage', 100);
    h.act('setInput', { x: 0, y: 0 }); h.until(() => g.body.vx === 0, 30); h.tick(13);
    const relative = g.body.x - p.x, walkPhase = g.body.walk, captured = new Set();
    let left = 0, right = 0, maxRelativeDrift = 0;
    const cycleFrames = Math.ceil((Math.PI * 2 / p.speed + .15) * 60);
    for (let i = 0; i < cycleFrames; i++) {
      h.tick(); const view = g.getTravelerPerformanceView();
      assert.equal(view.phase, 'ride'); assert.equal(view.platformId, 'last-stage');
      assert.equal(g.body.walk, walkPhase); near(g.body.y, p.y);
      maxRelativeDrift = Math.max(maxRelativeDrift, Math.abs(g.body.x - p.x - relative));
      if (p.dx < 0) left++; if (p.dx > 0) right++;
      const direction = p.dx < -1 ? 'left' : p.dx > 1 ? 'right' : null;
      if (direction && !captured.has(direction)) {
        await h.capture('last-stage-' + direction); h.pauseCanvas('last-stage-' + direction); captured.add(direction);
      }
    }
    assert.equal(captured.size, 2); assert.ok(left > 100 && right > 100); assert.ok(maxRelativeDrift < 1e-9);
    await h.occupiedHands('last-stage');
    h.until(() => p.x >= 1120 && p.dx > 0); assert.equal(h.act('jump'), true); h.walk(1280);
    assert.equal(g.body.y, 465); assert.equal(g.body.platform, null);
    h.walk(1440); h.act('setInput', { x: 1, y: 0 }); h.until(() => g.pads[0].boing > 0 && g.body.vy < -800, 60);
    assert.equal(g.body.vy, -850); assert.equal(g.getTravelerPerformanceView().phase, 'rise');
    assert.equal(g.getTravelerPerformanceView().landing, 0);
    for (let i = 0; i < 1000 && !(g.body.grounded && g.body.y === 390); i++) {
      h.act('setInput', { x: clamp((1680 - g.body.x) / 35, -1, 1), y: 0 }); h.tick();
    }
    assert.equal(g.body.y, 390); assert.equal(g.body.grounded, true);
    assert.equal(g.getTravelerPerformanceView().phase, 'land'); assert.equal(g.getTravelerPerformanceView().landingAge, 0);
    await h.capture('post-root-land'); h.pauseCanvas('post-root-land');
    post.close({ cycle: { id: 'last-stage', cycleFrames, left, right, maxRelativeDrift },
      actualMushroomVelocity: -850, actualRootY: 390, firstContactCaptured: true });
  } finally { post.destroy(); }
}
const report = { scope: 'Local pre-study: actual production Canvas at native 390/320 sizes. Direct chapter fixtures followed by original control methods; not browser unlocking, real touch, full-chapter completion, physical-device testing, or a release.',
  baselineCommit, scriptSha256: sha(await readFile(fileURLToPath(import.meta.url))), sources,
  comparedUpdates, coreFrames: frames.filter(f => f.core).length, frameCount: frames.length,
  pngCount: frames.length * 2, routes, frames, pauses,
  ablation: 'Only the current instance performance getter is temporarily disabled at the identical physical sample. Its pixels must match the independent frozen v29 renderer; the original getter is restored in finally.',
  visualInspection: 'Numeric and pixel checks run here; native PNGs still require human/model image review. No image is enlarged, composited, retouched, or used as a replacement renderer.' };
await writeFile(resolve(folder, 'riders-v30-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ folder, baselineCommit, comparedUpdates, routes: routes.length,
  coreFrames: report.coreFrames, frameCount: frames.length, pngCount: report.pngCount,
  pausedFullCanvasChecks: pauses.length, sourceInvariantChecks: sourceNames.length - 2 }));

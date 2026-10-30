// Isolated v31 art research: native production Canvas, real controls and an
// independent frozen v30 renderer. Direct authored starts are offline fixtures;
// they are not evidence of browser input, saved unlocking or a public release.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DreamGame } from '../dist/dream-engine.js';
import { getTravelerFaceView, hasSoulJoy } from '../dist/dream-traveler-face.js';
import { transformCapPoint } from '../dist/dream-cap-art.js';
import { getTravelerMotion } from '../dist/dream-traveler-art.js';

const folder = resolve(process.argv[2] || '/tmp/tougaigu-v31-face');
assert.ok(process.argv[3], 'Pass the frozen local v30 pre-study directory, including its source-manifest.json');
const baseline = resolve(process.argv[3]);
const baseManifest = JSON.parse(await readFile(resolve(baseline, 'source-manifest.json'), 'utf8'));
const { DreamGame: PreviousGame } = await import(pathToFileURL(resolve(baseline, 'dist/dream-engine.js')).href);
const require = createRequire(import.meta.url);
const { createCanvas, loadImage } = require(require.resolve('@napi-rs/canvas', {
  paths: [process.cwd(), process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || ''],
}));
const noop = () => {};
globalThis.window = { devicePixelRatio: 1, addEventListener: noop, removeEventListener: noop };
globalThis.document = { hidden: false, addEventListener: noop, removeEventListener: noop };
globalThis.requestAnimationFrame = () => 1; globalThis.cancelAnimationFrame = noop;
const clamp = (v, low, high) => Math.max(low, Math.min(high, v));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const pixels = canvas => Buffer.from(canvas.data());
const copy = value => JSON.parse(JSON.stringify(value));
const sources = [], frames = [], routes = [], pauses = [];
let comparedUpdates = 0, geometryComparisons = 0;
await mkdir(folder, { recursive: true });
for (const entry of baseManifest.files) {
  const baselineSha256 = sha(await readFile(resolve(baseline, entry.path)));
  assert.equal(baselineSha256, entry.sha256, entry.path + ' frozen baseline hash');
  const currentSha256 = sha(await readFile(new URL('../' + entry.path, import.meta.url)));
  if (!['dist/dream-engine.js', 'dist/dream-soul-art.js'].includes(entry.path))
    assert.equal(currentSha256, baselineSha256, entry.path + ' unchanged by face research');
  sources.push({ path: entry.path, baselineSha256, currentSha256 });
}
sources.push({ path: 'dist/dream-traveler-face.js', currentSha256: sha(await readFile(new URL('../dist/dream-traveler-face.js', import.meta.url))) });
const scriptSha256 = sha(await readFile(fileURLToPath(import.meta.url)));
const resources = Object.fromEntries(['loadImage', 'loadTheatreImage', 'loadLibraryImage',
  'loadCoastImage', 'loadPostImage'].map(key => [key, src => loadImage(fileURLToPath(src))]));
const physical = g => JSON.stringify({ body: g.body, soul: g.soul, form: g.form, state: g.state,
  input: g.input, time: g.time, visualTime: g.visualTime, runId: g.runId, energy: g.energy,
  emoteTime: g.emoteTime, deaths: g.deaths, cap: g.cap, movers: g.movers, lamps: g.lanterns,
  memories: g.memories, particles: g.particles, hazards: g.hazards, checkpoint: g.checkpoint,
  pads: g.pads, firstTicket: g.firstTicket, greenhousePlant: g.greenhousePlant,
  plateState: [...g.plateState], pendingSeal: g.pendingSeal, pendingTalk: g.pendingTalk,
  options: g.options, capActivity: g.capActivity?.getSnapshot(), lostCase: g.lostCase?.getSnapshot(),
  moonPlay: g.moonPlay?.getSnapshot() });

async function makeRoute(label, chapterIndex, width = 320, height = 431, options = {}) {
  const canvases = [createCanvas(width, height), createCanvas(width, height)], events = [[], []], tape = [];
  canvases.forEach(canvas => { canvas.getBoundingClientRect = () => ({ width, height }); });
  const games = [DreamGame, PreviousGame].map((Class, index) => new Class(canvases[index], {
    onPuzzle: event => events[index].push({ type: 'puzzle', event }),
    onCapEvent: event => events[index].push({ type: 'cap', event }),
    onComplete: event => events[index].push({ type: 'complete', event }),
  }, resources));
  const [game, previous] = games;
  games.forEach(g => g.start({ chapterIndex, sound: false, ...options }));
  const assetKey = ['paintedScenes', 'greenhouseScenes', 'theatreScenes', 'libraryScenes', 'coastScenes', 'postScenes'][chapterIndex];
  await Promise.all(games.map(g => g[assetKey].request({ mode: g.mode, chapterIndex: g.chapterIndex })));
  let updates = 0, gripSamples = 0, catchSamples = 0, claspSamples = 0;
  let maxGripError = 0, maxSoleError = 0;
  const equal = () => {
    assert.equal(physical(game), physical(previous), 'exact original state, rewards and event time for the same inputs');
    assert.deepEqual(events[0], events[1]);
    const pose = game.getCharacterPresentation(), before = previous.getCharacterPresentation();
    assert.deepEqual(pose, before, 'one unchanged cap rig, body, feet and arm presentation');
    assert.deepEqual(game.getSoulPresentation(pose), previous.getSoulPresentation(before), 'same actual presented soul');
    const motion = getTravelerMotion(game.body, { time: game.visualTime, hop: pose.hop,
      reducedMotion: game.options.reducedMotion, performance: pose.performance });
    for (const leg of motion.legs.filter(leg => leg.planted)) {
      const sole = transformCapPoint(pose.rig.bodyMatrix, leg.foot);
      maxSoleError = Math.max(maxSoleError, Math.abs(sole.y - game.body.y));
      assert.ok(Math.abs(sole.y - game.body.y) < 1e-8);
    }
    if (pose.grip === 1) {
      gripSamples++;
      const error = Math.hypot(pose.arms.left.world.x - pose.rig.gripWorld.x, pose.arms.left.world.y - pose.rig.gripWorld.y);
      maxGripError = Math.max(maxGripError, error); assert.ok(error < 1e-8);
    }
    if (pose.catching === 1) catchSamples++;
    if (pose.clasp === 1) claspSamples++;
    geometryComparisons++;
  };
  equal();
  const act = (method, ...args) => {
    tape.push({ method, args, afterUpdate: updates });
    const values = games.map(g => g[method](...args)); assert.deepEqual(values[0], values[1]); equal(); return values[0];
  };
  const tick = (count = 1) => {
    tape.push({ method: 'update', count, dt: 1 / 60 });
    for (let i = 0; i < count; i++) { games.forEach(g => g.update(1 / 60)); updates++; comparedUpdates++; equal(); }
  };
  const until = (predicate, limit = 1800) => {
    for (let i = 0; i < limit; i++) { if (predicate()) return; tick(); }
    assert.fail(label + ': bounded actual-input route timed out');
  };
  const fly = (x, y, stop = () => false) => {
    for (let i = 0; i < 900; i++) {
      if (stop()) return;
      const dx = x - game.soul.x, dy = y - game.soul.y;
      if (Math.hypot(dx, dy) < 12 && Math.hypot(game.soul.vx, game.soul.vy) < 35) {
        act('setInput', { x: 0, y: 0 }); tick(5); return;
      }
      act('setInput', { x: clamp(dx / 65, -1, 1), y: clamp(dy / 65, -1, 1) }); tick();
    }
    assert.fail(label + ': flight target not reached');
  };
  const walk = x => {
    for (let i = 0; i < 1000; i++) {
      if (Math.abs(x - game.body.x) < 2 && Math.abs(game.body.vx) < 10 && game.body.grounded) {
        act('setInput', { x: 0, y: 0 }); tick(6); return;
      }
      act('setInput', { x: clamp((x - game.body.x) / 35, -1, 1), y: 0 }); tick();
    }
    assert.fail(label + ': walking target not reached');
  };
  function allowedFaceRects(pose, shown) {
    const screen = point => ({ x: (point.x - game.camera) * game.scale, y: point.y * game.scale + game.viewportOffsetY });
    const rect = points => {
      const mapped = points.map(screen);
      return { left: Math.floor(Math.min(...mapped.map(p => p.x))) - 2,
        right: Math.ceil(Math.max(...mapped.map(p => p.x))) + 2,
        top: Math.floor(Math.min(...mapped.map(p => p.y))) - 2,
        bottom: Math.ceil(Math.max(...mapped.map(p => p.y))) + 2 };
    };
    const boxes = [rect([[-27, -15], [27, -15], [-27, 27], [27, 27]]
      .map(([x, y]) => transformCapPoint(pose.rig.headMatrix, { x, y })))];
    if (shown && hasSoulJoy(game, shown)) {
      const time = game.options.reducedMotion ? 0 : game.visualTime;
      const bob = game.options.reducedMotion || shown.layer === 'inside' ? 0 : Math.sin(time * 3) * 2;
      const angle = game.options.reducedMotion ? 0 : clamp(shown.vx / 340, -1, 1) * .14;
      const size = shown.scale ?? 1;
      boxes.push(rect([[-12, -11], [14, -11], [-12, 10], [14, 10]].map(([x, y]) => ({
        x: shown.x + size * (Math.cos(angle) * x - Math.sin(angle) * y),
        y: shown.y + bob * size + size * (Math.sin(angle) * x + Math.cos(angle) * y),
      }))));
    }
    return boxes;
  }
  async function capture(name, evidence = {}) {
    equal(); const before = physical(game), pose = game.getCharacterPresentation(), shown = game.getSoulPresentation(pose);
    game.render(); previous.render(); const currentPixels = pixels(canvases[0]), oldPixels = pixels(canvases[1]);
    const boxes = allowedFaceRects(pose, shown); let changedPixels = 0, outsideFaces = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const at = (y * width + x) * 4;
      if (currentPixels[at] === oldPixels[at] && currentPixels[at + 1] === oldPixels[at + 1]
        && currentPixels[at + 2] === oldPixels[at + 2] && currentPixels[at + 3] === oldPixels[at + 3]) continue;
      changedPixels++; if (!boxes.some(b => x >= b.left && x <= b.right && y >= b.top && y <= b.bottom)) outsideFaces++;
    }
    assert.equal(outsideFaces, 0, 'all same-frame pixel changes remain inside the two actual faces');
    if (game.mode === 'festival') assert.equal(changedPixels, 0, 'festival whole Canvas remains byte-identical');
    else assert.ok(changedPixels > 0, 'native phone frame actually displays a change');
    assert.equal(physical(game), before, 'rendering never advances any game state'); equal();
    const file = label + '-' + name + '.png', baselineFile = label + '-' + name + '-v30.png';
    const [png, oldPng] = await Promise.all(canvases.map(c => c.encode('png')));
    await writeFile(resolve(folder, file), png); await writeFile(resolve(folder, baselineFile), oldPng);
    frames.push({ file, baselineFile, sha256: sha(png), baselineSha256: sha(oldPng), width, height,
      chapterIndex, mode: game.mode, updates, physicsTime: game.time, emoteTime: game.emoteTime, energy: game.energy,
      capPhase: game.cap.phase, form: game.form, body: copy(game.body), soul: copy(shown),
      face: getTravelerFaceView(game, game.body, game.visualTime, shown), soulJoy: hasSoulJoy(game, shown),
      reducedMotion: game.options.reducedMotion, actualControls: true, changedPixels, outsideFaces,
      allowedFaceRects: boxes, ...evidence });
  }
  const pauseCanvas = name => {
    assert.equal(act('pause'), true); game.render();
    const before = physical(game), raw = pixels(canvases[0]), pose = game.getCharacterPresentation();
    const shown = game.getSoulPresentation(pose), face = getTravelerFaceView(game, game.body, game.visualTime, shown);
    for (let i = 0; i < 6; i++) {
      tick(); game.render(); assert.equal(physical(game), before); assert.deepEqual(pixels(canvases[0]), raw);
      assert.deepEqual(game.getCharacterPresentation(), pose);
      assert.deepEqual(getTravelerFaceView(game, game.body, game.visualTime, shown), face);
    }
    pauses.push({ route: label, name, opportunities: 6, entireCanvasFrozen: true, viewAndRigFrozen: true, sha256: sha(raw), browserRAF: false });
    assert.equal(act('resume'), true);
  };
  const close = () => {
    assert.equal(game.deaths, 0);
    routes.push({ label, chapterIndex, width, height, mode: game.mode, updates, physicsTime: game.time,
      deaths: game.deaths, directChapterFixture: true, browserUnlocking: false, coordinateInjection: false,
      energyInjection: false, eventTimeInjection: false, actualControlMethods: true,
      inputTape: tape, inputTapeSha256: sha(JSON.stringify(tape)), events: events[0],
      firstTicket: copy(game.firstTicket), memories: copy(game.memories), lanterns: copy(game.lanterns),
      geometry: { maxGripError, maxSoleError, gripSamples, catchSamples, claspSamples } });
    games.forEach(g => g.destroy());
  };
  return { game, act, tick, until, fly, walk, capture, pauseCanvas, close };
}

for (let chapter = 0; chapter < 6; chapter++) {
  const route = await makeRoute('phone-320-chapter-' + (chapter + 1), chapter);
  route.until(() => route.game.body.invulnerable === 0, 180);
  route.tick(12); await route.capture('neutral'); route.close();
}

for (const [label, width, height] of [['phone-320', 320, 431], ['phone-390', 390, 595]]) {
  const route = await makeRoute(label + '-events', 0, width, height), g = route.game;
  route.tick(12); assert.equal(route.act('toggleSoul'), true); route.tick(12);
  await route.capture('opening-attention'); route.tick(28);
  const ticket = g.memories[0];
  route.fly(ticket.x, ticket.y, () => ticket.collected);
  assert.ok(ticket.collected && g.firstTicket.phase === 'held'); assert.equal(g.emoteTime, 2.3);
  await route.capture('ticket-joy', { actualEvent: 'memory-0 physical collision', originalEmoteSeconds: 2.3 });
  route.pauseCanvas('ticket-joy'); route.act('setInput', { x: 0, y: 0 });
  assert.equal(route.act('recall'), true); route.tick(10);
  assert.equal(g.getCharacterPresentation().catching, 1); await route.capture('ticket-catch');
  route.until(() => g.cap.phase === 'closed', 90);
  assert.ok(g.emoteTime > 0); await route.capture('ticket-closed-joy', { actualEvent: 'same memory event after real cap closure' });
  route.until(() => g.emoteTime === 0, 180); await route.capture('ticket-expired');
  route.walk(430); assert.ok(g.plateState.get('ticket'));
  assert.equal(route.act('toggleSoul'), true);
  const lamp = g.lanterns[0]; route.fly(lamp.x, lamp.y);
  route.act('setInput', { x: 0, y: 0 }); assert.equal(route.act('pulse'), true); assert.equal(g.pendingSeal, 0);
  assert.equal(route.act('resolvePuzzle', true), true); assert.ok(lamp.lit); assert.equal(g.emoteTime, 2);
  await route.capture('lamp-joy', { actualEvent: 'pulse near real lamp and original resolvePuzzle(true)', originalEmoteSeconds: 2 });
  assert.equal(route.act('recall'), true); route.until(() => g.cap.phase === 'closed', 90);
  assert.ok(g.emoteTime > 0); await route.capture('lamp-closed-joy', { actualEvent: 'same lamp event after real cap closure' });
  route.pauseCanvas('lamp-closed-joy'); route.act('setReducedMotion', true);
  await route.capture('lamp-reduced-joy'); route.pauseCanvas('lamp-reduced-joy'); route.close();

  const tired = await makeRoute(label + '-fatigue', 0, width, height), f = tired.game;
  tired.tick(12); assert.equal(tired.act('toggleSoul'), true); tired.fly(185, 430); tired.act('setInput', { x: 0, y: 0 });
  tired.until(() => f.energy < 25, 1600); assert.ok(f.energy >= 20);
  await tired.capture('soul-25', { actualEvent: 'original free-flight energy drain crosses 25' });
  tired.until(() => f.energy < 20, 100); await tired.capture('body-20', { actualEvent: 'original free-flight energy drain crosses 20' });
  tired.pauseCanvas('body-20'); tired.until(() => f.energy < 5.8, 240);
  assert.equal(tired.act('recall'), true); tired.until(() => f.cap.phase === 'closed', 90);
  assert.ok(f.energy < 20 && f.energy > 0); await tired.capture('closed-tired', { actualEvent: 'manual recall before original auto-recall, then actual body recovery' });
  tired.pauseCanvas('closed-tired'); tired.until(() => f.energy >= 20, 90);
  await tired.capture('recovered-20'); tired.close();
}

const festival = await makeRoute('phone-320-festival', 0, 320, 431, { festival: { id: 'halloween' } });
festival.tick(12); await festival.capture('neutral');
assert.equal(festival.act('toggleSoul'), true); festival.tick(40); await festival.capture('open'); festival.close();

const report = { scope: 'Isolated local v31 pre-study; native production Canvas with real input methods, no browser or release claim',
  baseline: { path: baseline, gitHead: baseManifest.baseHead, scope: baseManifest.scope,
    sourceManifestSha256: sha(await readFile(resolve(baseline, 'source-manifest.json'))) },
  scriptSha256, sources, comparedUpdates, geometryComparisons, frames, routes, pauses,
  limits: ['Direct authored chapter starts, not UI unlocking.', 'Fixed 1/60 update steps, not browser RAF or touch delivery.',
    'No version/cache resource stamp, workflow, remote branch or public deployment changed.',
    'Pure rendering research based on local uncommitted v30; neither v30 nor v31 is claimed released.'] };
await writeFile(resolve(folder, 'face-v31-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ folder, frames: frames.length, routes: routes.length, comparedUpdates,
  geometryComparisons, pauses: pauses.length, outsideFaceChanges: frames.reduce((sum, f) => sum + f.outsideFaces, 0),
  allDeaths: routes.reduce((sum, r) => sum + r.deaths, 0), scriptSha256 }));

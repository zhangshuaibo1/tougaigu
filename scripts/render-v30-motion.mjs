// Offline paired production-renderer review. Each pair starts at the authored
// chapter spawn, then receives identical real jump/update inputs. The baseline
// is a separate, unchanged v29 checkout. This is not normal browser unlocking,
// touch, a HUD test, or physical-device performance evidence.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DreamGame } from '../dist/dream-engine.js';
import { getGroundShadowView } from '../dist/dream-ground-shadow.js';

assert.ok(process.argv[3], 'Pass an unchanged baseline dist directory as the second argument');
const folder = resolve(process.argv[2] || '/tmp/tougaigu-v30-motion');
const baseline = resolve(process.argv[3]);
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
const physical = g => JSON.stringify({ body: g.body, soul: g.soul, form: g.form, state: g.state,
  input: g.input, time: g.time, visualTime: g.visualTime, energy: g.energy, deaths: g.deaths,
  cap: g.cap, movers: g.movers, lamps: g.lanterns, memories: g.memories, particles: g.particles,
  hazards: g.hazards, checkpoint: g.checkpoint, featherCharges: g.featherCharges,
  firstTicket: g.firstTicket, greenhousePlant: g.greenhousePlant, pads: g.pads });
const resources = Object.fromEntries(['loadImage', 'loadTheatreImage', 'loadLibraryImage',
  'loadCoastImage', 'loadPostImage'].map(key => [key, src => loadImage(fileURLToPath(src))]));
const sourceNames = ['dream-engine-base.js', 'dream-levels.js', 'dream-engine.js',
  'dream-traveler-performance.js', 'dream-traveler-art.js', 'dream-station-art.js', 'dream-ground-shadow.js'];
await mkdir(folder, { recursive: true });
const sources = [];
for (const name of sourceNames) sources.push({ name,
  currentSha256: sha(await readFile(new URL('../dist/' + name, import.meta.url))),
  baselineSha256: sha(await readFile(resolve(baseline, name))) });
for (const name of ['dream-engine-base.js', 'dream-levels.js', 'dream-traveler-art.js',
  'dream-station-art.js', 'dream-ground-shadow.js']) {
  const source = sources.find(item => item.name === name);
  assert.equal(source.currentSha256, source.baselineSha256, name + ' must retain the v29 implementation');
}
// The caller independently checks this checkout with git before invoking Node.
// Every renderer dependency listed above is also hashed directly in this run;
// no child process or network access is needed to reproduce the render.
const baselineCommit = process.argv[4];
assert.match(baselineCommit || '', /^[a-f0-9]{40}$/, 'Pass the independently verified baseline commit');
const frames = [], routes = [];
let comparedUpdates = 0;

for (const [label, width, height] of [['desktop', 1100, 640], ['phone-390', 390, 595], ['phone-320', 320, 431]]) {
  for (let chapterIndex = 0; chapterIndex < 6; chapterIndex++) {
    const canvases = [createCanvas(width, height), createCanvas(width, height)];
    for (const canvas of canvases) canvas.getBoundingClientRect = () => ({ width, height });
    const game = new DreamGame(canvases[0], {}, resources);
    const previous = new PreviousGame(canvases[1], {}, resources);
    const games = [game, previous];
    games.forEach(g => g.start({ chapterIndex, sound: false }));
    try {
      for (const g of games) await Promise.all(['paintedScenes', 'greenhouseScenes', 'theatreScenes',
        'libraryScenes', 'coastScenes', 'postScenes'].map(key => g[key].request({ mode: 'story', chapterIndex })));
      function tick(count = 1) {
        for (let i = 0; i < count; i++) {
          games.forEach(g => g.update(1 / 60));
          assert.equal(physical(game), physical(previous), 'paired same-input physics diverged');
          comparedUpdates++;
        }
      }
      async function capture(name) {
        const before = physical(game), view = game.getTravelerPerformanceView();
        assert.ok(view, 'The product entry point must enable all six main chapters');
        games.forEach(g => g.render());
        assert.equal(physical(game), before, 'rendering cannot advance the simulation');
        assert.equal(physical(game), physical(previous));
        const actual = canvases[0].data(), old = canvases[1].data();
        const shadow = getGroundShadowView({ body: game.body, level: game.level, movers: game.movers,
          closedBarriers: game.level.barriers.filter(barrier => !game.barrierOpen(barrier)) });
        const px = (game.body.x - game.camera) * game.scale;
        const py = game.body.y * game.scale + game.viewportOffsetY;
        let changed = 0, outside = 0;
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
          const at = (y * width + x) * 4;
          if (actual[at] === old[at] && actual[at + 1] === old[at + 1]
            && actual[at + 2] === old[at + 2] && actual[at + 3] === old[at + 3]) continue;
          changed++;
          const inCharacter = Math.abs(x - px) <= 65 * game.scale + 2
            && y >= py - 135 * game.scale - 2 && y <= py + 8 * game.scale + 2;
          const sy = shadow ? shadow.y * game.scale + game.viewportOffsetY : null;
          const inShadow = chapterIndex < 2 && shadow && Math.abs(x - px) <= 34 * game.scale + 2
            && Math.abs(y - sy) <= 10 * game.scale + 2;
          if (!inCharacter && !inShadow) outside++;
        }
        assert.equal(outside, 0, 'Changes stay in the original character and true support-shadow regions');
        if (chapterIndex === 2) assert.equal(changed, 0, 'The mature third-chapter jump retains identical pixels');
        else if (['rise', 'fall', 'land', 'settle'].includes(name)) assert.ok(changed > 0, 'The production pose must visibly differ');
        const nameBase = `${label}-chapter-${chapterIndex + 1}-${name}`;
        const encoded = await canvases[0].encode('png');
        await writeFile(resolve(folder, nameBase + '.png'), encoded);
        const record = { file: nameBase + '.png', width, height, bytes: encoded.length, sha256: sha(encoded),
          chapterIndex, phase: view.phase, performance: view, body: { ...game.body },
          shadow, changedPixels: changed, outsideAllowedRegions: outside };
        // Exact original-size baseline images for the first two chapters make
        // the corrected airborne contact shadow reviewable without zoom.
        if (chapterIndex < 2 && ['fall', 'settle'].includes(name)) {
          const baselinePng = await canvases[1].encode('png');
          record.baselineFile = nameBase + '-v29.png'; record.baselineSha256 = sha(baselinePng);
          await writeFile(resolve(folder, record.baselineFile), baselinePng);
        }
        frames.push(record);
      }
      tick(30);
      games.forEach(g => assert.equal(g.jump(), true)); tick(6);
      assert.equal(game.getTravelerPerformanceView().phase, 'rise'); await capture('rise');
      for (let i = 0; i < 120 && game.body.vy < 160; i++) tick();
      assert.equal(game.getTravelerPerformanceView().phase, 'fall'); await capture('fall');
      for (let i = 0; i < 120 && !game.body.grounded; i++) tick();
      assert.equal(game.getTravelerPerformanceView().phase, 'land'); await capture('land');
      tick(6); assert.equal(game.getTravelerPerformanceView().phase, 'land'); await capture('settle');
      tick(7); assert.equal(game.getTravelerPerformanceView().phase, 'idle'); await capture('settled');
      game.pause(); game.render();
      const frozenPixels = Buffer.from(canvases[0].data()), frozenView = game.getTravelerPerformanceView();
      for (let i = 0; i < 6; i++) game.update(1 / 60);
      game.render(); assert.deepEqual(Buffer.from(canvases[0].data()), frozenPixels);
      assert.deepEqual(game.getTravelerPerformanceView(), frozenView);
      routes.push({ viewport: { width, height }, chapterIndex, normalJumpFromAuthoredSpawn: true,
        browserUnlocking: false, completeChapter: false, deaths: game.deaths, pausedCanvasAndViewFrozen: true });
    } finally { games.forEach(g => g.destroy()); }
  }
}
const report = { scope: 'Offline paired production Canvas, authored-spawn chapter fixtures and normal one-jump input. Not browser unlocking, HUD, touch, a full route, or physical-device performance.',
  baselineCommit, sources, comparedUpdates, routes, frames };
await writeFile(resolve(folder, 'motion-v30-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ folder, baselineCommit, comparedUpdates, frameCount: frames.length,
  sourceInvariantChecks: 5, routes: routes.length, chapter3PixelIdentity: true }));

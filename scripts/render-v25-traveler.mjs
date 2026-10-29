// Offline production Canvas review. Every captured pose is reached by normal
// input from the authored spawn, not by assigning body/platform/energy fields.
// Comparison baselines disable only the new pure performance view, retaining
// v24's existing rig, gait, materials and painted theatre at the same instant.
// These are Canvas images, not browser HUD, touchscreen or physical-device QA.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DreamGame } from '../dist/dream-engine.js';

const require = createRequire(import.meta.url);
const { createCanvas, loadImage } = require(require.resolve('@napi-rs/canvas', {
  paths: [process.cwd(), process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || ''],
}));
const folder = resolve(process.argv[2] || '/tmp/tougaigu-v25-traveler');
await mkdir(folder, { recursive: true });
const noop = () => {};
globalThis.window = { devicePixelRatio: 1, addEventListener: noop, removeEventListener: noop };
globalThis.document = { hidden: false, addEventListener: noop, removeEventListener: noop };
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = noop;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const tick = (game, frames = 1) => { for (let i = 0; i < frames; i++) game.update(1 / 60); };
const physics = game => JSON.stringify({ body: game.body, soul: game.soul, cap: game.cap,
  energy: game.energy, form: game.form, time: game.time, state: game.state, movers: game.movers,
  deaths: game.deaths, checkpoint: game.checkpoint, memories: game.memories, lamps: game.lanterns, particles: game.particles });
const pixels = canvas => Buffer.from(canvas.data());
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const equal = (a, b, message) => { assert.deepEqual(a, b, message); checks++; };
const frames = [], routes = [], differences = [];
function copyCanvas(canvas) {
  const result = createCanvas(canvas.width, canvas.height);
  // Copy pixel storage immediately. A deferred canvas-to-canvas image can
  // otherwise observe a later route frame when the comparison sheet is drawn.
  result.getContext('2d').putImageData(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height), 0, 0);
  return result;
}
function walk(game, target, limit = 900) {
  for (let i = 0; i < limit; i++) {
    if (Math.abs(game.body.x - target) < 2 && Math.abs(game.body.vx) < 10 && game.body.grounded) {
      game.setInput({ x: 0, y: 0 }); tick(game, 10); return;
    }
    game.setInput({ x: clamp((target - game.body.x) / 35, -1, 1), y: 0 }); tick(game);
  }
  assert.fail('Normal input did not reach ' + target + ': ' + JSON.stringify(game.body));
}
function wait(game, predicate, limit = 1600) {
  game.setInput({ x: 0, y: 0 });
  for (let i = 0; i < limit; i++) { if (predicate()) return; tick(game); }
  assert.fail('Normal route timed out: ' + JSON.stringify({ body: game.body, stage: game.movers[0] }));
}

for (const [label, width, height] of [['desktop', 1100, 640], ['phone-390', 390, 595], ['phone-320', 320, 431]]) {
  const canvas = createCanvas(width, height), comparisons = [];
  canvas.getBoundingClientRect = () => ({ width, height });
  const game = new DreamGame(canvas, {}, { loadTheatreImage: src => loadImage(fileURLToPath(src)) });
  game.start({ chapterIndex: 2, sound: false });
  await game.theatreScenes.request({ mode: 'story', chapterIndex: 2 });
  check(Boolean(game.getPaintedTheatreImage()), 'Load the actual production theatre painting before review');
  tick(game, 80);
  async function capture(name, { compare = true } = {}) {
    const old = physics(game), view = game.getTravelerPerformanceView();
    let baseline;
    if (compare) {
      // Local renderer ablation, never a production hook or a gameplay write.
      game.getTravelerPerformanceView = () => null;
      try { game.render(); baseline = copyCanvas(canvas); }
      finally { delete game.getTravelerPerformanceView; }
    }
    game.render();
    equal(physics(game), old, 'Rendering and its v24-compatible comparison leave simulation unchanged');
    const path = `${label}-${name}.png`;
    await writeFile(resolve(folder, path), await canvas.encode('png')); frames.push(path);
    if (compare) {
      const before = baseline.data(), after = canvas.data();
      let changed = 0, outside = 0;
      const px = (game.body.x - game.camera) * game.scale, py = game.body.y * game.scale + game.viewportOffsetY;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const at = (y * width + x) * 4;
        if (before[at] === after[at] && before[at + 1] === after[at + 1] && before[at + 2] === after[at + 2] && before[at + 3] === after[at + 3]) continue;
        changed++;
        if (Math.abs(x - px) > 65 * game.scale + 2 || y < py - 135 * game.scale - 2 || y > py + 7 * game.scale + 2) outside++;
      }
      equal(outside, 0, 'Changed pixels stay in the existing character drawing envelope');
      if (['rise', 'fall', 'land', 'settle', 'ride'].includes(name)) check(changed > 40, 'The actual normal-size pose has a visible local change');
      differences.push({ label, name, changedPixels: changed, outsideCharacter: outside, performance: view });
      comparisons.push({ name, before: baseline, after: copyCanvas(canvas), x: px, y: py, scale: game.scale });
    }
  }
  walk(game, 510);
  check(game.jump(), 'Jump using the real body input from the authored ground');
  game.setInput({ x: 1, y: 0 }); tick(game, 6);
  check(game.getTravelerPerformanceView().phase === 'rise', 'Capture an actual ascending body'); await capture('rise');
  for (let i = 0; i < 90 && game.body.vy < 160; i++) tick(game);
  check(!game.body.grounded && game.getTravelerPerformanceView().phase === 'fall', 'Capture actual descent before contact'); await capture('fall');
  for (let i = 0; i < 90 && !game.body.grounded; i++) tick(game);
  equal(game.body.y, 465, 'The normal jump really reaches the left shelf');
  equal(game.getTravelerPerformanceView().phase, 'land', 'A real shelf collision starts the body settle'); await capture('land');
  game.setInput({ x: 0, y: 0 }); tick(game, 6);
  equal(game.body.land, 0, 'The old compression has finished by this review frame');
  equal(game.getTravelerPerformanceView().phase, 'land', 'The .2s arm/cloth settle remains visible without holding physics'); await capture('settle');
  walk(game, 680);
  wait(game, () => game.movers[0].dx < 0 && game.movers[0].x < 735);
  for (let i = 0; i < 360; i++) {
    const stage = game.movers[0];
    if (game.body.grounded && game.body.platform === stage.id && game.body.x - stage.x > 100) break;
    game.setInput({ x: clamp((stage.x + stage.w * .78 - game.body.x) / 35, -1, 1), y: 0 }); tick(game);
  }
  game.setInput({ x: 0, y: 0 }); tick(game, 12);
  wait(game, () => game.movers[0].dx > 0 && game.movers[0].x >= 900);
  equal(game.body.platform, 'stage', 'The body is actually attached to the runtime stage');
  equal(game.getTravelerPerformanceView().phase, 'ride', 'Only the real rider gets the steady posture'); await capture('ride');
  game.pause(); game.render(); const frozen = pixels(canvas), frozenView = game.getTravelerPerformanceView();
  tick(game, 90); game.render(); equal(pixels(canvas), frozen, 'Pause freezes the entire actual Canvas frame');
  equal(game.getTravelerPerformanceView(), frozenView, 'Pause freezes the body performance view'); game.resume();
  check(game.toggleSoul(), 'The normal cap input remains available aboard'); tick(game, 36); await capture('ride-open', { compare: false });
  check(game.recall(), 'The normal return remains available aboard'); tick(game, 10); await capture('ride-return', { compare: false });
  tick(game, 40);
  wait(game, () => game.movers[0].dx > 0 && game.movers[0].x >= 950 && game.movers[0].x < 1000);
  game.setInput({ x: 1, y: 0 });
  for (let i = 0; i < 150; i++) {
    if (game.body.platform === null && game.body.grounded && game.body.x > 1220 && game.body.y === 465) break;
    tick(game);
  }
  game.setInput({ x: 0, y: 0 }); tick(game, 12);
  equal(game.body.platform, null, 'Actual input walks off the moving deck'); equal(game.body.y, 465, 'The rider remains on the right shelf');
  check(game.body.x > 1130 && game.body.x < 1355 && game.deaths === 0, 'The full crossing reaches the correct bank with no recovery');
  await capture('ashore', { compare: false });
  game.setReducedMotion(true); game.render(); const still = pixels(canvas), stillView = game.getTravelerPerformanceView();
  game.visualTime += 137; game.render(); equal(pixels(canvas), still, 'Reduced motion ignores a perturbed decorative time');
  equal(game.getTravelerPerformanceView(), stillView, 'Reduced motion has no landing-age or balance animation clock');

  // Crops stay at exactly the rendered pixel size; no zoom makes the new pose
  // look more legible than the phone image. Full scenes above preserve context.
  const cell = 155, cropHeight = 160, sheet = createCanvas(cell * comparisons.length, 388), c = sheet.getContext('2d');
  c.fillStyle = '#172331'; c.fillRect(0, 0, sheet.width, sheet.height);
  c.font = '12px sans-serif'; c.fillStyle = '#eadfc6';
  c.fillText(`${label}: original-size crops; same physical sample`, 10, 18);
  c.fillText('v24 pose / v25 pose', 10, 36);
  comparisons.forEach((sample, index) => {
    const x = index * cell, sourceX = sample.x - cell / 2, sourceY = sample.y - 140;
    c.fillText(sample.name, x + 10, 56);
    for (const [row, image] of [sample.before, sample.after].entries()) {
      c.drawImage(image, sourceX, sourceY, cell, cropHeight, x, 66 + row * 160, cell, cropHeight);
    }
  });
  const sheetName = `${label}-comparison.png`;
  await writeFile(resolve(folder, sheetName), await sheet.encode('png')); frames.push(sheetName);
  routes.push({ viewport: { width, height }, normalInput: true, phases: comparisons.map(item => item.name),
    deaths: game.deaths, bodyX: game.body.x, bodyY: game.body.y, onMovingPlatform: game.body.platform,
    physicsSeconds: game.time, completeChapter: false });
  game.destroy();
}
const report = { checks, frames, routes, differences, productionCanvas: true, browserQA: false,
  comparison: 'same physical sample with only the new performance view disabled; crops are not enlarged',
  timePerturbation: 'visualTime is deliberately changed only after the normal-input route to check reduced motion' };
await writeFile(resolve(folder, 'traveler-v25-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ folder, checks, frames, routes, differenceCount: differences.length }));

// Optional, offline Canvas proof. No browser, saved player data or production
// services are involved. Scene captures travel through the real DreamGame.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { STORY_AWAKENINGS } from '../dist/dream-awakenings.js';
import { drawStoryAwakening } from '../dist/dream-awakening-art.js';
import { DreamGame } from '../dist/dream-engine.js';

const require = createRequire(import.meta.url);
const { createCanvas } = require(require.resolve('@napi-rs/canvas', { paths: [process.cwd(), process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || ''] }));
const folder = resolve(process.argv[2] || '/tmp/tougaigu-story-awakenings-v12');
await mkdir(folder, { recursive: true });
const noop = () => {};
globalThis.window = { devicePixelRatio: 1, addEventListener: noop, removeEventListener: noop };
globalThis.document = { hidden: false, addEventListener: noop, removeEventListener: noop };
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = noop;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const chapters = ['station', 'greenhouse', 'theatre', 'library', 'coast', 'post'];
const pixels = canvas => Buffer.from(canvas.data());
const ink = canvas => { const data = canvas.data(); let count = 0; for (let i = 3; i < data.length; i += 4) if (data[i]) count++; return count; };
function pixelBounds(canvas) {
  const data = canvas.data(); let left = canvas.width, right = -1, top = canvas.height, bottom = -1;
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) if (data[(y * canvas.width + x) * 4 + 3]) {
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  return right < 0 ? null : { left, right, top, bottom };
}
function bg(c, w, h) { const gradient = c.createLinearGradient(0, 0, 0, h); gradient.addColorStop(0, '#20323c'); gradient.addColorStop(1, '#354b50'); c.fillStyle = gradient; c.fillRect(0, 0, w, h); }
function label(c, text, x, y, size = 12) { c.font = `${size}px sans-serif`; c.fillStyle = '#e5d6ba'; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText(text, x, y); }
function viewFor(cfg, progress, clearZones = []) {
  return { ...cfg, cfg, lamp: { x: 0, y: 100 }, anchor: { x: 100, y: 100 }, bounds: { left: 52, right: 148, top: 52, bottom: 148 }, clearZones, elapsed: progress * cfg.duration, progress, stage: progress === 1 ? 'settled' : 'unfold', settled: progress === 1 };
}
function artImage(view, reduced = false) { const canvas = createCanvas(200, 200); drawStoryAwakening(canvas.getContext('2d'), view, reduced); return canvas; }
let pure = 0, bounded = 0, protectedCircles = 0;
const detail = createCanvas(4 * 280, 3 * 320), dc = detail.getContext('2d'); bg(dc, detail.width, detail.height);
const phases = [0, .25, .5, .75, 1];
const staged = createCanvas(5 * 200, 12 * 200), sc = staged.getContext('2d'); bg(sc, staged.width, staged.height);
for (const [index, cfg] of STORY_AWAKENINGS.entries()) {
  const blanks = artImage(null); assert.equal(ink(blanks), 0);
  let firstInk = null;
  for (const p of phases) {
    const view = viewFor(cfg, p), serialized = JSON.stringify(view);
    const a = artImage(view), b = artImage(view);
    assert.deepEqual(pixels(a), pixels(b), `${cfg.kind}: deterministic pixels`); assert.equal(JSON.stringify(view), serialized, `${cfg.kind}: immutable input`); pure++;
    if (p === 0) assert.equal(ink(a), 0, 'An event has no answer image before unfolding');
    else {
      assert.ok(ink(a) > 100, `${cfg.kind}: visible drawing`);
      const bounds = pixelBounds(a); assert.ok(bounds.left >= 52 && bounds.right < 148 && bounds.top >= 52 && bounds.bottom < 148, `${cfg.kind}: declared 96-pixel bounds`); bounded++;
      if (p === .5) firstInk = pixels(a);
      if (p === 1) assert.notDeepEqual(pixels(a), firstInk, `${cfg.kind}: the final pose differs visibly from its middle`);
    }
    const x = phases.indexOf(p) * 200, y = index * 200;
    sc.save(); sc.translate(x - 50, y - 35); sc.scale(1.5, 1.5); drawStoryAwakening(sc, view); sc.restore();
    label(sc, p === 0 ? `${cfg.kind} / unsolved` : `${(p * 1.8).toFixed(2)}s`, x + 8, y + 18, 10);
  }
  assert.deepEqual(pixels(artImage(viewFor(cfg, .05), true)), pixels(artImage(viewFor(cfg, 1))), `${cfg.kind}: reduced motion paints the exact final pose`);
  assert.deepEqual(pixels(artImage({ ...viewFor(cfg, 1), elapsed: 300 })), pixels(artImage(viewFor(cfg, 1))), `${cfg.kind}: no settled animation clock`);
  const circles = [{ x: 88, y: 100, r: 15 }, { x: 108, y: 100, r: 15 }];
  const cleared = artImage(viewFor(cfg, 1, circles)), data = cleared.data();
  for (let y = 53; y < 147; y++) for (let x = 53; x < 147; x++) if (circles.some(z => Math.hypot(x + .5 - z.x, y + .5 - z.y) < z.r - 1.2)) {
    assert.equal(data[(y * 200 + x) * 4 + 3], 0, `${cfg.kind}: overlapping exclusion circles cannot reveal ink`);
  }
  assert.ok(ink(cleared) > 50, `${cfg.kind}: exclusion keeps the rest of the scene`); protectedCircles++;
  const x = index % 4 * 280, y = Math.floor(index / 4) * 320;
  label(dc, cfg.kind, x + 12, y + 22, 12);
  dc.save(); dc.translate(x + 140 - 100 * 2.6, y + 170 - 100 * 2.6); dc.scale(2.6, 2.6); drawStoryAwakening(dc, viewFor(cfg, 1)); dc.restore();
}
await writeFile(resolve(folder, 'awakening-details.png'), await detail.encode('png'));
await writeFile(resolve(folder, 'awakening-stages.png'), await staged.encode('png'));

// Paint only the event through the game's actual camera and protection view.
function layer(game, view, clear = true) {
  const canvas = createCanvas(game.canvas.width, game.canvas.height), c = canvas.getContext('2d');
  c.setTransform(game.dpr * game.scale, 0, 0, game.dpr * game.scale, -game.camera * game.dpr * game.scale, game.dpr * game.viewportOffsetY);
  drawStoryAwakening(c, clear ? view : { ...view, clearZones: [] }); return canvas;
}
function clone(canvas) { const copy = createCanvas(canvas.width, canvas.height); copy.getContext('2d').drawImage(canvas, 0, 0); return copy; }
const tick = (game, seconds) => { for (let i = 0; i < Math.round(seconds * 60); i++) game.update(1 / 60); };
// The greenhouse east lamp is viewed from its stepping platform: leaving the
// body on the ground at 1540 would put it in the existing roaming shadow.
const anchors = [[420, 1220], [550, 1370], [430, 1530], [660, 1740], [460, 1510], [430, 1950]];
function walkTo(game, target, limit = 45) {
  let lastJump = -2;
  for (let frame = 0; frame < limit * 60 && game.state === 'playing'; frame++) {
    const delta = target - game.body.x;
    if (Math.abs(delta) < 10 && game.body.grounded) { game.setInput({ x: 0, y: 0 }); tick(game, .15); return; }
    const mushroomNear = game.pads.some(pad => game.body.x > pad.x - 110 && game.body.x < pad.x + pad.w + 45);
    if (!mushroomNear && Math.abs(delta) >= 130 && game.body.grounded && game.time - lastJump > .38) { game.jump(); lastJump = game.time; }
    game.setInput({ x: Math.abs(delta) < 8 ? 0 : Math.sign(delta), y: 0 }); game.update(1 / 60);
  }
  assert.fail(`Actual walk failed: chapter ${game.chapterIndex}, target ${target}`);
}
function flyTo(game, target) {
  for (let frame = 0; frame < 8 * 60; frame++) {
    assert.equal(game.form, 'soul', `Chapter ${game.chapterIndex}: inspection flight lost the body at ${game.body.x},${game.body.y}`); const dx = target.x - game.soul.x, dy = target.y - game.soul.y;
    if (Math.hypot(dx, dy) < 45) { game.setInput({ x: 0, y: 0 }); return; }
    game.setInput({ x: clamp(dx / 75, -1, 1), y: clamp(dy / 75, -1, 1) }); game.update(1 / 60);
  }
  assert.fail(`Actual flight failed: chapter ${game.chapterIndex}`);
}
const metrics = [];
// Phone dimensions are the actual canvas rectangles measured in the site,
// after its header and controls: 390x844/320x680 are the enclosing screens.
for (const [mode, width, height] of [['desktop', 1100, 640], ['mobile-390', 390, 595], ['mobile-320', 320, 431]]) {
  const tw = mode === 'desktop' ? 550 : width, th = mode === 'desktop' ? 344 : height + 24;
  const sheet = createCanvas(tw * 4, th * 3), c = sheet.getContext('2d'); bg(c, sheet.width, sheet.height);
  for (let chapterIndex = 0; chapterIndex < 6; chapterIndex++) {
    const canvas = createCanvas(width, height); canvas.getBoundingClientRect = () => ({ width, height });
    const asked = [], game = new DreamGame(canvas, { onPuzzle: event => asked.push(event) });
    game.start({ chapterIndex, sound: false, season: { id: 'halloween' }, outfit: 'halloween' });
    assert.deepEqual(game.getStoryAwakeningViews(), [], 'Unsolved scene has no awakening views');
    for (let sealIndex = 0; sealIndex < 2; sealIndex++) {
      walkTo(game, anchors[chapterIndex][sealIndex]);
      if (chapterIndex === 1 && sealIndex === 1 && game.body.y > 450) { assert.equal(game.jump(), true); tick(game, 1); assert.ok(game.body.y <= 450 && game.body.grounded, 'Jump onto the existing greenhouse stepping platform'); }
      assert.equal(game.toggleSoul(), true); flyTo(game, game.lanterns[sealIndex]);
      assert.equal(game.interact(), true); assert.equal(game.pendingSeal, sealIndex); assert.equal(asked.at(-1).sealIndex, sealIndex);
      game.render(); const before = clone(canvas);
      assert.equal(game.getStoryAwakeningViews().some(v => v.sealIndex === sealIndex), false, 'Pending answer has no new art');
      assert.equal(game.resolvePuzzle(true), true);
      const deaths = game.deaths;
      tick(game, .9); game.render(); const middle = clone(canvas);
      const midView = game.getStoryAwakeningViews().find(v => v.sealIndex === sealIndex);
      assert.ok(midView.progress > .49 && midView.progress < .51);
      game.pause(); const frozen = pixels(canvas), pausedViews = JSON.stringify(game.getStoryAwakeningViews()); tick(game, 1); game.render();
      assert.deepEqual(pixels(canvas), frozen, 'Pause freezes the whole actual scene');
      assert.equal(JSON.stringify(game.getStoryAwakeningViews()), pausedViews, 'Pause freezes event time and placement'); game.resume();
      tick(game, .9); game.render();
      assert.equal(game.deaths, deaths, 'The inspection route must leave the body somewhere safe while watching');
      const view = game.getStoryAwakeningViews().find(v => v.sealIndex === sealIndex);
      assert.equal(view.progress, 1); assert.equal(view.settled, true);
      const visibleInk = ink(layer(game, view)), possibleInk = ink(layer(game, view, false));
      assert.ok(visibleInk > 80, `${mode} ${view.kind}: the real frame must contain a readable part of the scene`);
      const b = view.bounds, viewportLeft = game.camera, viewportRight = game.camera + game.viewWidth;
      const viewportFraction = Math.max(0, Math.min(b.right, viewportRight) - Math.max(b.left, viewportLeft)) / (b.right - b.left);
      assert.ok(viewportFraction >= .95, `${mode} ${view.kind}: the scene stays in view while the camera settles`);
      metrics.push({ mode, kind: view.kind, anchor: view.anchor, visibleInk, possibleInk, visibleFraction: +(visibleInk / possibleInk).toFixed(3), viewportFraction: +viewportFraction.toFixed(3) });
      const cell = chapterIndex * 2 + sealIndex, x = cell % 4 * tw, y = Math.floor(cell / 4) * th;
      c.drawImage(canvas, x, y + 24, tw, th - 24); label(c, `${chapters[chapterIndex]} / lamp ${sealIndex + 1}`, x + 8, y + 17);
      await writeFile(resolve(folder, `${chapters[chapterIndex]}-${sealIndex}-${mode}.png`), await canvas.encode('png'));
      if (mode === 'mobile-390') {
        const trio = createCanvas(width * 3, height + 24), tc = trio.getContext('2d'); bg(tc, trio.width, trio.height);
        for (const [i, image] of [before, middle, canvas].entries()) { tc.drawImage(image, i * width, 24); label(tc, ['before answer', '0.90s', '1.80s / remains'][i], i * width + 10, 17); }
        await writeFile(resolve(folder, `${chapters[chapterIndex]}-${sealIndex}-sequence.png`), await trio.encode('png'));
      }
      if (mode === 'mobile-320' && chapterIndex === 0 && sealIndex === 0) {
        game.setOutfit('christmas'); game.render();
        await writeFile(resolve(folder, 'station-0-mobile-320-christmas.png'), await canvas.encode('png'));
        game.setOutfit('halloween');
      }
      assert.equal(game.recall(), true);
    }
    game.destroy();
  }
  await writeFile(resolve(folder, `awakening-${mode}.png`), await sheet.encode('png'));
}

// State restoration: clipping, paint, transform and alpha may not escape.
const stateCanvas = createCanvas(200, 200), ctx = stateCanvas.getContext('2d');
ctx.translate(3, 7); ctx.scale(.9, .9); ctx.globalAlpha = .63; ctx.lineWidth = 5; ctx.strokeStyle = '#123456'; ctx.fillStyle = '#fedcba';
const state = () => JSON.stringify([ctx.getTransform().toString(), ctx.globalAlpha, ctx.lineWidth, ctx.lineCap, ctx.lineJoin]);
const previous = state(); drawStoryAwakening(ctx, viewFor(STORY_AWAKENINGS[0], 1, [{ x: 100, y: 100, r: 15 }])); assert.equal(state(), previous);
// napi Canvas restores actual paints but its JS paint getters retain the last
// assigned string. Compare real strokes/fills outside the event, not getters.
const control = createCanvas(200, 200).getContext('2d');
control.translate(3, 7); control.scale(.9, .9); control.globalAlpha = .63; control.lineWidth = 5; control.strokeStyle = '#123456'; control.fillStyle = '#fedcba';
for (const c of [ctx, control]) { c.fillRect(0, 0, 20, 20); c.beginPath(); c.moveTo(180, 3); c.lineTo(180, 20); c.stroke(); }
assert.deepEqual(Buffer.from(ctx.getImageData(0, 0, 200, 40).data), Buffer.from(control.getImageData(0, 0, 200, 40).data), 'The renderer restores actual fill and stroke paints');
ctx.resetTransform(); ctx.globalAlpha = 1; ctx.fillStyle = '#abcdef'; ctx.fillRect(0, 0, 10, 10);
assert.deepEqual([...ctx.getImageData(2, 2, 1, 1).data], [171, 205, 239, 255], 'The renderer restores the caller clip');
for (const invalid of [null, {}, { kind: '__proto__' }, { ...viewFor(STORY_AWAKENINGS[0], 1), anchor: { x: NaN, y: 100 } }, { ...viewFor(STORY_AWAKENINGS[0], 1), bounds: { left: 20, right: 10, top: 0, bottom: 30 } }]) assert.equal(ink(artImage(invalid)), 0);
await writeFile(resolve(folder, 'visibility.json'), JSON.stringify(metrics, null, 2) + '\n');
console.log(`Rendered 12 individual stories, five stages and 36 real game scenes to ${folder}`);
console.log(`${pure} pure/deterministic cases, ${bounded} bounds checks, ${protectedCircles} overlapping protection checks; reduced motion, paused frames and Canvas state passed.`);
console.log(`Actual visible ink ratios: ${Math.min(...metrics.map(m => m.visibleFraction)).toFixed(3)} to ${Math.max(...metrics.map(m => m.visibleFraction)).toFixed(3)}.`);

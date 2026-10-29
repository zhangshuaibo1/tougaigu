// Offline production Canvas proof. It is not browser, touch or device QA.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DreamGame } from '../dist/dream-engine.js';
import { createDreamSave, completeDreamChapter, chooseStoryReply } from '../dist/dream-story.js';
import { drawCapMiniature } from '../dist/dream-cap-art.js';

const require = createRequire(import.meta.url);
const { createCanvas, loadImage } = require(require.resolve('@napi-rs/canvas', { paths: [process.cwd(), process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || ''] }));
const folder = resolve(process.argv[2] || '/tmp/tougaigu-v18-letter'); await mkdir(folder, { recursive: true });
const noop = () => {};
globalThis.window = { devicePixelRatio: 1, addEventListener: noop, removeEventListener: noop };
globalThis.document = { hidden: false, addEventListener: noop, removeEventListener: noop };
globalThis.requestAnimationFrame = () => 1; globalThis.cancelAnimationFrame = noop;
const tick = (game, frames = 1) => { for (let i = 0; i < frames; i++) game.update(1 / 60); };
const pixels = canvas => Buffer.from(canvas.data());
const state = game => JSON.stringify({ snapshot: game.getSnapshot(), capScene: game.capScene, body: game.body, soul: game.soul });
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const equal = (a, b, message) => { assert.deepEqual(a, b, message); checks++; };
const frames = [];
async function save(canvas, file) { await writeFile(resolve(folder, file), await canvas.encode('png')); frames.push(file); }

for (const [name, width, height] of [['desktop', 1100, 640], ['phone-390', 390, 595], ['phone-320', 320, 431]]) {
  for (const choice of ['send', 'keep']) {
    const story = createDreamSave();
    for (const chapterIndex of [0, 1]) completeDreamChapter(story, { chapterIndex, time: 60, memories: 0, deaths: 0, stars: 2 });
    check(chooseStoryReply(story, 'letter', choice), 'the fixture uses an accepted existing story choice');
    const canvas = createCanvas(width, height); canvas.getBoundingClientRect = () => ({ width, height });
    const game = new DreamGame(canvas, {}, { loadImage: src => loadImage(fileURLToPath(src)) });
    game.start({ chapterIndex: 1, letterChoice: story.choices.letter, sound: false });
    await game.greenhouseScenes.request({ mode: 'story', chapterIndex: 1 });
    tick(game, 60); game.render(); check(game.greenhousePaintedFrame, 'production painted background is decoded');
    check(game.greenhousePlant.stage === 0, 'a chosen letter does not grant a plant');
    await save(canvas, `${name}-${choice}-arrival.png`);
    check(game.toggleSoul(), 'ordinary cap input opens the memory window'); tick(game, 120);
    check(game.letterEcho.phase === 'playing', 'the bounded echo plays after the normal cap projection');
    const before = state(game); game.render(); equal(state(game), before, 'render has no gameplay side effects');
    await save(canvas, `${name}-${choice}-echo.png`);
    game.pause(); game.render(); const paused = pixels(canvas); tick(game, 90); game.render();
    equal(pixels(canvas), paused, 'the actual whole scene is pixel-identical while paused');
    game.resume(); tick(game, 180); check(game.letterEcho.phase === 'settled', 'one opening settles to the saved scene');
    game.render(); await save(canvas, `${name}-${choice}-settled.png`);
    game.setReducedMotion(true); game.render(); const reduced = pixels(canvas); game.visualTime += 100; game.render();
    equal(pixels(canvas), reduced, 'reduced motion keeps the selected scene static');
    game.destroy();
  }
}

const detail = createCanvas(1000, 510), c = detail.getContext('2d');
c.fillStyle = '#142f32'; c.fillRect(0, 0, detail.width, detail.height);
for (const [column, choice] of ['send', 'keep'].entries()) for (const [row, stage] of [0, 3].entries()) {
  const x = column * 500 + 245, y = row * 240 + 175;
  c.save(); c.translate(x, y); c.scale(2.4, 2.4);
  drawCapMiniature(c, { motif: 'sprout', greenhouse: { pot: 'clay', stage, fromStage: stage, progress: 1 }, letterEcho: { choice } }, 0);
  c.restore(); c.font = '15px sans-serif'; c.fillStyle = '#eee0bf';
  c.fillText(`${choice} / plant stage ${stage} / enlarged art inspection`, column * 500 + 28, row * 240 + 32);
}
await save(detail, 'letter-miniature-details.png');
const report = { checks, frames, productionRenderer: true, normalCapInput: true, chosenSaveFixture: true, newRunPlantStage: 0, browserQA: false };
await writeFile(resolve(folder, 'letter-echo-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ folder, ...report }));

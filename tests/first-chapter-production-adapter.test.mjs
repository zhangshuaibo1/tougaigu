import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { DreamGame } from '../dist/dream-engine.js';
import { DreamGame as OriginalDreamGame } from '../dist/dream-engine-legacy.js';
import { isFirstChapterDaydream } from '../dist/dream-ashi-daydream.js';
const noop = () => {};
globalThis.window = { devicePixelRatio: 1, addEventListener: noop, removeEventListener: noop };
globalThis.document = { hidden: false, addEventListener: noop, removeEventListener: noop };
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = noop;
function canvas(id) {
  const ctx = new Proxy({ globalAlpha: 1 }, { get: (o, k) => k in o ? o[k] : noop });
  return { id, getContext: () => ctx, getBoundingClientRect: () => ({width: 390, height: 600}) };
}
test('the production engine and retained daydream painter match their exact reviewed source blobs', () => {
  const b = readFileSync(new URL('../dist/dream-engine-legacy.js', import.meta.url));
  const sha = createHash('sha1').update(Buffer.from(`blob ${b.length}\0`)).update(b).digest('hex');
  assert.equal(sha, 'f79f33ae1b40dc5aca52cac74792f8607e4f8330');
  const p = readFileSync(new URL('../dist/dream-ashi-daydream.js', import.meta.url));
  assert.equal(createHash('sha256').update(p).digest('hex'), '80035b0efadf9b11509464a059eafb695175d7533eea5c2aa77ecd710bdf7026');
});
test('the actual game canvas selects artwork but every other canvas remains opt-in', () => {
  const real = new DreamGame(canvas('dream-canvas'));
  const other = new DreamGame(canvas('preview'));
  assert.equal(real.daydreamFirstChapter, true);
  assert.equal(other.daydreamFirstChapter, false);
  for (const mode of ['story', 'festival']) for (let index = 0; index < 6; index++) {
    real.mode = mode; real.chapterIndex = index;
    assert.equal(isFirstChapterDaydream(real), mode === 'story' && index === 0);
  }
  real.destroy(); other.destroy();
});
test('the adapter cannot replace simulation, input, start, save, reward or camera methods', () => {
  assert.equal(Object.getPrototypeOf(DreamGame.prototype), OriginalDreamGame.prototype);
  assert.deepEqual(Object.getOwnPropertyNames(DreamGame.prototype).sort(), ['constructor','drawCapLid','drawSkullFront','drawStationRim'].sort());
  for (const method of ['start','update','jump','toggleSoul','recall','getSnapshot','getCharacterPresentation','setInput']) {
    assert.equal(DreamGame.prototype[method], OriginalDreamGame.prototype[method], method);
  }
});

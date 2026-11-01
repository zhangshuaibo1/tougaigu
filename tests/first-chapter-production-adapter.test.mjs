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
test('the retained engine and new painter are byte-identical to the verified source assets', () => {
  const b = readFileSync(new URL('../dist/dream-engine-legacy.js', import.meta.url));
  const sha = createHash('sha1').update(Buffer.from(`blob ${b.length}\0`)).update(b).digest('hex');
  assert.equal(sha, '49baa14351da49a2deed0b842dfcdd113bfa3227');
  const p = readFileSync(new URL('../dist/dream-ashi-daydream.js', import.meta.url));
  assert.equal(createHash('sha256').update(p).digest('hex'), 'e6873944329953641482701872b82a22baecf6d092c02d411bfab14275fa6abf');
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

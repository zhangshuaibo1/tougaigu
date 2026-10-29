import test from 'node:test';
import assert from 'node:assert/strict';
import { createStoryPortraitController } from '../dist/dream-story-portrait.js';

class Classes {
  names = new Set();
  add(n) { this.names.add(n); }
  remove(n) { this.names.delete(n); }
  contains(n) { return this.names.has(n); }
}
class ImageStub extends EventTarget {
  classList = new Classes();
  complete = false;
  naturalWidth = 0;
  alt = '';
  #requests = new Map();
  set src(value) {
    this._src = value;
    this.complete = false;
    this.naturalWidth = 0;
  }
  get src() { return this._src; }
  getAttribute(name) { return name === 'src' ? this._src : null; }
  decode() {
    const source = this.src;
    return new Promise((resolve, reject) => { this.#requests.set(source, { resolve, reject }); });
  }
  ready(src) {
    this._src = src;
    this.complete = true;
    this.naturalWidth = 200;
    this.dispatchEvent(new Event('load'));
  }
  decoded(src) { this.#requests.get(src)?.resolve(); }
  fail(src) { this._src = src; this.complete = true; this.naturalWidth = 0; this.dispatchEvent(new Event('error')); }
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('fast flipping cannot expose an older speaker while the new line is visible', async () => {
  const image = new ImageStub(), frame = { dataset: {} }, p = createStoryPortraitController(image, frame);
  p.show('./hero.svg', '阿拾');
  assert.equal(image.classList.contains('story-portrait-pending'), true);
  image.ready('./hero.svg');
  p.show('./soul.svg', '拾光');
  image.decoded('./hero.svg');
  await flush();
  assert.equal(image.classList.contains('story-portrait-pending'), true);
  assert.equal(frame.dataset.portrait, 'loading');
  image.ready('./soul.svg');image.decoded('./soul.svg');await flush();
  assert.equal(image.classList.contains('story-portrait-pending'), false);
  assert.equal(frame.dataset.portrait, 'ready');
  assert.equal(image.alt, '拾光');
});

test('closing a story invalidates its pending image, new story may load normally', async () => {
  const image = new ImageStub(), frame = { dataset: {} }, p = createStoryPortraitController(image, frame);
  p.show('./hero.svg', '阿拾');image.ready('./hero.svg');
  p.cancel();image.decoded('./hero.svg');await flush();
  assert.equal(image.classList.contains('story-portrait-pending'), true);
  p.show('./moth.svg', '绒绒');image.ready('./moth.svg');image.decoded('./moth.svg');await flush();
  assert.equal(frame.dataset.portrait, 'ready');
});

test('failed portrait remains neutral while the text stays readable', async () => {
  const image = new ImageStub(), frame = { dataset: {} }, p = createStoryPortraitController(image, frame);
  p.show('./missing.svg', '拾光');image.fail('./missing.svg');await flush();
  assert.equal(frame.dataset.portrait, 'unavailable');
  assert.equal(image.classList.contains('story-portrait-pending'), true);
  assert.equal(image.alt, '拾光');
});

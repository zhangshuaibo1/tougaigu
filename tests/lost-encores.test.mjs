import test from 'node:test';
import assert from 'node:assert/strict';
import { LOST_CASES } from '../dist/dream-lost-cases.js';
import { LOST_ENCORES, getLostEncore } from '../dist/dream-lost-encores.js';

const expectedScenes = [
  ['lost-station-01', 'story-0', 'train'],
  ['lost-halloween-01', 'halloween', 'candy'],
  ['lost-valentine-01', 'valentine', 'window'],
  ['lost-greenhouse-01', 'story-1', 'sprout'],
  ['lost-library-01', 'story-3', 'echo'],
  ['lost-thanksgiving-01', 'thanksgiving', 'table'],
];

test('each actual case has exactly two follow-up scenes, using six distinct stage motifs', () => {
  assert.equal(LOST_ENCORES.length, 12);
  assert.equal(new Set(LOST_ENCORES.map(scene => scene.caseId + ':' + scene.variant)).size, 12);
  assert.deepEqual(LOST_CASES.map(item => [item.id, item.sceneId]), expectedScenes.map(([id, sceneId]) => [id, sceneId]));
  for (const [caseId, sceneId, kind] of expectedScenes) {
    assert.deepEqual(LOST_ENCORES.filter(scene => scene.caseId === caseId).map(scene => scene.variant), [0, 1]);
    for (let variant = 0; variant < 2; variant++) {
      const scene = getLostEncore(caseId, variant);
      assert.equal(scene.sceneId, sceneId);
      assert.equal(scene.kind, kind);
      assert.equal(scene.caseId, caseId);
      assert.equal(scene.variant, variant);
    }
  }
  assert.equal(new Set(LOST_ENCORES.map(scene => scene.kind)).size, 6);
});

test('every scene has one short, distinct Chinese caption and a usable art accent', () => {
  assert.equal(new Set(LOST_ENCORES.map(scene => scene.caption)).size, 12);
  for (const scene of LOST_ENCORES) {
    assert.ok(Array.from(scene.caption).length >= 8, scene.caption);
    assert.ok(Array.from(scene.caption).length <= 18, scene.caption);
    assert.match(scene.caption, /^[\p{Script=Han}，。]+$/u);
    assert.match(scene.accent, /^#[0-9a-f]{6}$/);
    assert.ok(scene.detail.length > 0);
  }
});

test('paired endings carry the promised visual change without repeating a recipient or puzzle answer', () => {
  const endings = [
    ['lit-window', 'waiting-bench'],
    ['invitation-seat', 'postal-sweet'],
    ['scarf-pocket', 'head-window'],
    ['leaf', 'shade'],
    ['bubble', 'curtain'],
    ['warm-soup', 'extra-chair'],
  ];
  for (const [index, [caseId]] of expectedScenes.entries()) {
    assert.deepEqual([getLostEncore(caseId, 0).detail, getLostEncore(caseId, 1).detail], endings[index]);
  }
  for (const scene of LOST_ENCORES) {
    assert.deepEqual(Object.keys(scene).sort(), ['accent', 'caption', 'caseId', 'detail', 'kind', 'sceneId', 'variant']);
    assert.ok(!('answer' in scene || 'recipient' in scene || 'claimantId' in scene || 'clues' in scene || 'reward' in scene));
  }
});

test('unknown or malformed selections return null without coercing input or silently selecting a first scene', () => {
  const hostile = { toString() { throw new Error('The catalog must not coerce a case ID'); } };
  for (const id of [undefined, null, 1, true, {}, [], hostile, Symbol('case'), 'missing', '__proto__', 'constructor', 'story-0', 'lost-station-01:0']) {
    assert.equal(getLostEncore(id, 0), null);
  }
  for (const variant of [undefined, null, -1, 2, 0.5, NaN, Infinity, '0', '1', true, {}, [], 0n, Symbol('variant')]) {
    assert.equal(getLostEncore('lost-station-01', variant), null);
  }
});

test('the exported catalog and all returned records are immutable, stable shared descriptions', () => {
  assert.ok(Object.isFrozen(LOST_ENCORES));
  assert.throws(() => LOST_ENCORES.push({}), TypeError);
  for (const scene of LOST_ENCORES) {
    assert.ok(Object.isFrozen(scene));
    assert.equal(getLostEncore(scene.caseId, scene.variant), scene);
    assert.throws(() => { scene.caption = '改写'; }, TypeError);
    assert.throws(() => { scene.detail = 'wrong'; }, TypeError);
  }
});

test('looking up completed-scene decoration neither changes evidence content nor accumulates play state', () => {
  const casesBefore = JSON.stringify(LOST_CASES);
  const scenesBefore = JSON.stringify(LOST_ENCORES);
  for (let repeat = 0; repeat < 4; repeat++) {
    for (const [caseId] of [...expectedScenes].reverse()) {
      for (const variant of [1, 0, 1]) assert.ok(getLostEncore(caseId, variant));
    }
  }
  assert.equal(JSON.stringify(LOST_CASES), casesBefore);
  assert.equal(JSON.stringify(LOST_ENCORES), scenesBefore);
});

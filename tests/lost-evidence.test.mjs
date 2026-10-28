import test from 'node:test';
import assert from 'node:assert/strict';
import { getLostCase } from '../dist/dream-lost-cases.js';
import { lostDiagramModel, createLostDiagram } from '../dist/lost-evidence.js';

// A deliberately small DOM: tests inspect player-facing labels, order and empty
// slots without needing a browser, CSS measurements or the implementation's SVG paths.
class Element {
  constructor(tagName) { this.tagName = tagName; this.children = []; this.attributes = new Map(); this.className = ''; this.text = ''; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  append(...children) { this.children.push(...children); }
  set textContent(value) { this.text = String(value); this.children = []; }
  get textContent() { return this.text + this.children.map(child => child.textContent).join(''); }
}
const doc = { createElement: name => new Element(name), createElementNS: (_namespace, name) => new Element(name) };
const walk = root => [root, ...root.children.flatMap(walk)];
const hasClass = (element, name) => element.className.split(/\s+/u).includes(name);
const findClass = (root, name) => walk(root).find(element => hasClass(element, name));
const tags = (root, name) => walk(root).filter(element => element.tagName === name);
const corners = ['左上', '右上', '左下', '右下'];
const beatMarks = ['①', '②', '③', '④'];
const sounds = { 月: 'moon', 铃: 'bell', 星: 'star', 浪: 'wave' };
const badges = { 松果: 'pinecone', 信封: 'envelope', 月亮: 'moon' };

const readHoles = text => {
  const match = /^(?:正面|背面)开孔：(.+?)。/u.exec(text);
  assert.ok(match, text);
  return match[1].split('、');
};
const readBeats = text => new Map([...text.matchAll(/([①②③④])(月|铃|星|浪)/gu)].map(match => [beatMarks.indexOf(match[1]) + 1, match[2]]));
const readRelation = text => {
  const match = /(松果|信封|月亮)在(松果|信封|月亮)左边/u.exec(text);
  assert.ok(match, text);
  return [match[1], match[2]];
};

test('both greenhouse variants render the four written corners upright, with only the observed face open', () => {
  for (const variant of getLostCase('story-1').variants) {
    for (const clue of variant.clues) {
      const openings = new Set(readHoles(clue.text));
      const model = lostDiagramModel(clue.diagram), root = createLostDiagram(clue.diagram, doc);
      assert.equal(model.kind, 'grid');
      assert.deepEqual(model.cells.map(cell => cell.corner), corners);
      assert.deepEqual(model.cells.filter(cell => cell.active).map(cell => cell.corner), corners.filter(corner => openings.has(corner)));
      const arrow = findClass(root, 'lost-grid-orientation');
      assert.ok(arrow);
      assert.equal(arrow.textContent, '↑');
      assert.equal(arrow.getAttribute('aria-label'), '箭头朝上');
      const grid = findClass(root, 'lost-evidence-grid');
      assert.equal(grid.children.length, 4);
      assert.deepEqual(grid.children.map(cell => cell.textContent), corners, 'DOM order must be left/right within the top row, then the bottom row');
      for (const [index, cell] of grid.children.entries()) {
        const active = openings.has(corners[index]);
        assert.equal(hasClass(cell, 'active'), active);
        assert.equal(cell.getAttribute('aria-label'), corners[index] + '：' + (active ? '开孔' : '挡光'));
      }
      assert.equal(root.getAttribute('role'), 'group');
      assert.ok(root.getAttribute('aria-label').includes('箭头朝上'));
    }
  }
});

test('each greenhouse claimant badge matches its visible corner names instead of a hidden winning result', () => {
  for (const variant of getLostCase('story-1').variants) {
    for (const claimant of variant.claimants) {
      const match = /^灯牌亮格：(.+)。$/u.exec(claimant.observation);
      assert.ok(match);
      const lit = new Set(match[1].split('、'));
      const model = lostDiagramModel(claimant.diagram), root = createLostDiagram(claimant.diagram, doc);
      assert.equal(model.stencil, false);
      assert.deepEqual(model.cells.filter(cell => cell.active).map(cell => cell.corner), corners.filter(corner => lit.has(corner)));
      const grid = findClass(root, 'lost-evidence-grid');
      for (const [index, cell] of grid.children.entries()) assert.equal(cell.getAttribute('aria-label'), corners[index] + '：' + (lit.has(corners[index]) ? '亮' : '暗'));
      assert.equal(findClass(root, 'lost-grid-orientation'), undefined);
    }
  }
});

test('both whale variants put visible notes at their written beat numbers and leave the other face blank', () => {
  for (const variant of getLostCase('story-3').variants) {
    for (const clue of variant.clues) {
      const written = readBeats(clue.text);
      assert.equal(written.size, 2);
      const model = lostDiagramModel(clue.diagram), root = createLostDiagram(clue.diagram, doc);
      assert.equal(model.kind, 'beats');
      assert.deepEqual(model.beats.map(beat => beat.beat), [1, 2, 3, 4]);
      assert.equal(root.children.length, 4);
      assert.equal(tags(root, 'svg').length, 2, 'a face reveals exactly its own two symbols');
      for (const [index, part] of root.children.entries()) {
        const beat = index + 1, name = written.get(beat);
        assert.equal(part.children[0].textContent, String(beat));
        if (name) {
          assert.equal(model.beats[index].symbol, sounds[name]);
          assert.equal(model.beats[index].name, name);
          assert.equal(part.getAttribute('aria-label'), '第' + beat + '拍：' + name);
          assert.equal(tags(part, 'svg').length, 1);
          assert.equal(tags(part, 'b')[0].textContent, name);
          assert.equal(hasClass(part, 'known'), true);
        } else {
          assert.equal(model.beats[index].symbol, null);
          assert.equal(model.beats[index].name, '未记');
          assert.equal(part.getAttribute('aria-label'), '第' + beat + '拍：未记');
          assert.equal(tags(part, 'svg').length, 0);
          assert.equal(tags(part, 'b')[0].textContent, '—');
          assert.equal(hasClass(part, 'unknown'), true);
        }
      }
    }
  }
});

test('rendering the other side or a singer does not backfill unseen beats in a later face-only diagram', () => {
  for (const variant of getLostCase('story-3').variants) {
    const [front, back] = variant.clues;
    const firstFront = lostDiagramModel(front.diagram);
    createLostDiagram(back.diagram, doc);
    for (const claimant of variant.claimants) {
      const match = /^四拍签名：(.+)。$/u.exec(claimant.observation);
      assert.ok(match);
      const written = match[1].split('、');
      const model = lostDiagramModel(claimant.diagram), root = createLostDiagram(claimant.diagram, doc);
      assert.deepEqual(model.beats.map(beat => beat.name), written);
      assert.deepEqual(model.beats.map(beat => beat.symbol), written.map(name => sounds[name]));
      assert.equal(tags(root, 'svg').length, 4);
      assert.equal(root.children.some(part => hasClass(part, 'unknown')), false);
    }
    assert.deepEqual(lostDiagramModel(front.diagram), firstFront);
    assert.equal(firstFront.beats[1].symbol, null);
    assert.equal(firstFront.beats[3].symbol, null);
  }
});

test('both Thanksgiving variants show just the current left-of relation and keep every seat free of assigned badges', () => {
  for (const variant of getLostCase('thanksgiving').variants) {
    for (const clue of variant.clues) {
      const [left, right] = readRelation(clue.text);
      const model = lostDiagramModel(clue.diagram), root = createLostDiagram(clue.diagram, doc);
      assert.equal(model.kind, 'seats');
      assert.equal(model.left, badges[left]);
      assert.equal(model.right, badges[right]);
      const relation = findClass(root, 'lost-seat-relation');
      const visibleBadges = relation.children.filter(child => hasClass(child, 'lost-name-badge'));
      assert.deepEqual(visibleBadges.map(badge => tags(badge, 'b')[0].textContent), [left, right]);
      assert.equal(findClass(relation, 'lost-relation-arrow').textContent, '在左边 →');
      assert.equal(tags(root, 'svg').length, 2, 'only the two badges in this face appear');
      const target = findClass(root, 'lost-seat-target');
      if (/座签属中间/u.test(clue.text)) {
        assert.equal(model.targetSeat, 1);
        assert.ok(target);
        assert.equal(target.children.length, 3);
        assert.deepEqual(target.children.map(seat => hasClass(seat, 'target')), [false, true, false]);
        assert.equal(target.textContent, '');
        assert.equal(tags(target, 'svg').length, 0);
        assert.ok(target.children.every(seat => seat.children.length === 0), 'target chairs cannot be filled with inferred owners');
      } else {
        assert.equal(model.targetSeat, null);
        assert.equal(target, undefined, 'the back face adds its relation without borrowing the front target mark');
      }
    }
    for (const claimant of variant.claimants) {
      const match = /^名牌是(松果|信封|月亮)；/u.exec(claimant.observation);
      assert.ok(match);
      const model = lostDiagramModel(claimant.diagram), root = createLostDiagram(claimant.diagram, doc);
      assert.equal(model.kind, 'badge');
      assert.equal(model.symbol, badges[match[1]]);
      assert.equal(tags(root, 'b')[0].textContent, match[1]);
      assert.equal(tags(root, 'svg').length, 1);
      assert.equal(findClass(root, 'lost-seat-target'), undefined);
    }
  }
});

test('malformed dimensions, cells, beats, symbols and seating facts return null instead of fabricated evidence', () => {
  const stencil = { type: 'light-stencil', rows: 2, columns: 2, orientation: 'up', holes: [0, 1] };
  const score = { type: 'score-fragment', beats: 4, slots: [{ beat: 0, symbol: 'moon' }] };
  const seats = { type: 'seat-relation', seatCount: 3, direction: 'screen-left-to-right', relation: { left: 'pinecone', right: 'moon' } };
  const invalid = [
    ['missing', undefined], ['null', null], ['boolean', true], ['text', 'light-stencil'], ['array', []], ['unknown type', { type: 'unknown' }],
    ['wrong rows', { ...stencil, rows: 3 }], ['string columns', { ...stencil, columns: '2' }], ['rotated face', { ...stencil, orientation: 'down' }],
    ['duplicate holes', { ...stencil, holes: [0, 0] }], ['outside hole', { ...stencil, holes: [4] }], ['negative hole', { ...stencil, holes: [-1] }],
    ['string hole', { ...stencil, holes: ['0'] }], ['nonfinite hole', { ...stencil, holes: [NaN] }], ['fractional hole', { ...stencil, holes: [0.5] }],
    ['nonarray badge', { type: 'lamp-badge', cells: '0,1' }], ['duplicate badge', { type: 'lamp-badge', cells: [1, 1] }],
    ['wrong beat count', { ...score, beats: 3 }], ['null slots', { ...score, slots: null }], ['missing slot', { ...score, slots: [null] }],
    ['duplicate beat', { ...score, slots: [{ beat: 0, symbol: 'moon' }, { beat: 0, symbol: 'bell' }] }],
    ['outside beat', { ...score, slots: [{ beat: 4, symbol: 'moon' }] }], ['string beat', { ...score, slots: [{ beat: '0', symbol: 'moon' }] }],
    ['unknown sound', { ...score, slots: [{ beat: 0, symbol: 'envelope' }] }],
    ['short full signature', { type: 'rhythm-signature', symbols: ['moon', 'star', 'bell'] }],
    ['invalid full signature', { type: 'rhythm-signature', symbols: ['moon', 'star', 'bell', null] }],
    ['wrong seat count', { ...seats, seatCount: 4 }], ['same badge twice', { ...seats, relation: { left: 'moon', right: 'moon' } }],
    ['unknown badge', { ...seats, relation: { left: 'wave', right: 'moon' } }], ['wrong target', { ...seats, targetSeat: 0 }],
    ['reversed direction', { ...seats, direction: 'right-to-left' }], ['prototype badge', { type: 'name-badge', symbol: '__proto__' }],
  ];
  for (const [label, diagram] of invalid) {
    assert.equal(lostDiagramModel(diagram), null, label);
    assert.equal(createLostDiagram(diagram, doc), null, label);
  }
});

test('sparse arrays cannot turn missing cells or missing signature notes into a valid drawing', () => {
  const mixedCells = [0, 1, 2];
  delete mixedCells[1];
  const mixedSymbols = ['moon', 'bell', 'star', 'wave'];
  delete mixedSymbols[1];
  for (const diagram of [
    { type: 'light-stencil', rows: 2, columns: 2, orientation: 'up', holes: Array(1) },
    { type: 'lamp-badge', cells: mixedCells },
    { type: 'rhythm-signature', symbols: Array(4) },
    { type: 'rhythm-signature', symbols: mixedSymbols },
    { type: 'score-fragment', beats: 4, slots: Array(1) },
  ]) {
    assert.equal(lostDiagramModel(diagram), null);
    assert.equal(createLostDiagram(diagram, doc), null);
  }
});

test('an explicitly malformed direction is rejected rather than silently treated as screen-left-to-right', () => {
  for (const direction of [false, 0, '', null, 'up']) {
    const diagram = { type: 'seat-relation', seatCount: 3, direction, relation: { left: 'envelope', right: 'pinecone' } };
    assert.equal(lostDiagramModel(diagram), null, String(direction));
    assert.equal(createLostDiagram(diagram, doc), null, String(direction));
  }
});

test('models are independent copies and rendering cannot alter any authored evidence', () => {
  const cases = ['story-1', 'story-3', 'thanksgiving'].map(getLostCase);
  const before = JSON.stringify(cases);
  for (const item of cases) for (const variant of item.variants) {
    for (const value of [...variant.clues, ...variant.claimants]) {
      const first = lostDiagramModel(value.diagram), second = lostDiagramModel(value.diagram);
      assert.ok(first);
      assert.deepEqual(first, second);
      assert.notEqual(first, second);
      first.label = 'caller-owned text';
      if (first.cells) first.cells[0].active = !first.cells[0].active;
      if (first.beats) first.beats[0].name = 'caller-owned note';
      assert.deepEqual(lostDiagramModel(value.diagram), second);
      createLostDiagram(value.diagram, doc);
    }
  }
  assert.equal(JSON.stringify(cases), before);
});

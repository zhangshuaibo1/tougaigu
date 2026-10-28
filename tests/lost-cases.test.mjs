import test from 'node:test';
import assert from 'node:assert/strict';
import { LOST_CASES, getLostCase, getLostCaseVariant, evaluateLostClaim } from '../dist/dream-lost-cases.js';

const clue = (variant, id) => variant.clues.find(item => item.id === id);
const unique = values => new Set(values).size === values.length;
const invalidJudgement = { valid: false, correct: false, feedback: null, receipt: null };

test('three scene cabinets expose two complete, stable evidence sets apiece', () => {
  assert.deepEqual(LOST_CASES.map(item => [item.id, item.sceneId]), [
    ['lost-station-01', 'story-0'],
    ['lost-halloween-01', 'halloween'],
    ['lost-valentine-01', 'valentine'],
  ]);
  const variantIds = [];
  for (const item of LOST_CASES) {
    assert.equal(getLostCase(item.sceneId), item);
    assert.equal(item.variants.length, 2);
    assert.equal(item.clues, item.variants[0].clues);
    assert.equal(item.claimants, item.variants[0].claimants);
    assert.ok(item.object.name && item.object.motif && item.intro && item.title);
    for (const [index, variant] of item.variants.entries()) {
      variantIds.push(variant.id);
      assert.equal(getLostCaseVariant(item.id, index), variant);
      assert.equal(variant.index, index);
      assert.equal(variant.caseId, item.id);
      assert.equal(variant.sceneId, item.sceneId);
      assert.deepEqual(variant.clues.map(part => part.side).sort(), ['back', 'front']);
      assert.ok(unique(variant.clues.map(part => part.id)));
      assert.equal(variant.claimants.length, 3);
      assert.ok(unique(variant.claimants.map(person => person.id)));
      for (const part of variant.clues) assert.ok(part.id && part.title && part.text && part.diagram);
      for (const person of variant.claimants) assert.ok(person.id && person.name && person.motif && person.observation);
      assert.ok(variant.logic && variant.success && variant.receipt);
    }
  }
  assert.ok(unique(variantIds));
});

test('a reader can uniquely solve each ticket from the displayed return stamp and arrow directions', () => {
  const item = getLostCase('story-0');
  // This model reads the public Chinese route text, independently of the engine's diagram comparisons.
  const readRoute = text => {
    const match = /^(?:票面路线|去程)：(.+) → (.+)。$/u.exec(text);
    assert.ok(match, text);
    return [match[1], match[2]];
  };
  for (const variant of item.variants) {
    const ticket = clue(variant, 'ticket-front');
    const stamp = clue(variant, 'ticket-back');
    const [returnFrom, returnTo] = readRoute(ticket.text);
    assert.match(stamp.text, /回程.*方向倒过来/u);
    assert.equal(ticket.diagram.from.label, returnFrom);
    assert.equal(ticket.diagram.to.label, returnTo);
    assert.equal(stamp.diagram.journey, 'return');
    const possibleOwners = variant.claimants.filter(person => {
      const [outwardFrom, outwardTo] = readRoute(person.observation);
      assert.equal(person.diagram.from.label, outwardFrom);
      assert.equal(person.diagram.to.label, outwardTo);
      const fits = outwardTo === returnFrom && outwardFrom === returnTo;
      assert.equal(evaluateLostClaim(item.id, variant.index, person.id).correct, fits);
      return fits;
    });
    assert.equal(possibleOwners.length, 1);
    assert.equal(variant.answer, possibleOwners[0].id);
  }
  assert.notEqual(item.variants[0].answer, item.variants[1].answer);
});

test('each Halloween candidate has an independently calculated truth table with exactly one possible owner', () => {
  const item = getLostCase('halloween');
  const models = [
    {
      texts: ['糖罐是蝙蝠的。', '糖罐不是蝙蝠的。', '糖罐不是小兔的。'],
      predicates: [owner => owner === 'bat', owner => owner !== 'bat', owner => owner !== 'rabbit'],
      tables: { rabbit: [false, true, false], bat: [true, false, true], pumpkin: [false, true, true] },
    },
    {
      texts: ['糖罐是南瓜先生的。', '糖罐不是南瓜先生的。', '糖罐不是蝙蝠的。'],
      predicates: [owner => owner === 'pumpkin', owner => owner !== 'pumpkin', owner => owner !== 'bat'],
      tables: { rabbit: [false, true, true], bat: [false, true, false], pumpkin: [true, false, true] },
    },
  ];
  for (const [index, model] of models.entries()) {
    const variant = item.variants[index];
    const notes = clue(variant, 'jar-notes').diagram.notes;
    const rule = clue(variant, 'jar-rule');
    assert.equal(rule.diagram.exactlyTrue, 1);
    assert.match(rule.text, /恰好只有一句是真话/u);
    assert.deepEqual(notes.map(note => note.text), model.texts);
    assert.ok(unique(notes.map(note => note.id)));
    const possibleOwners = [];
    for (const person of variant.claimants) {
      const note = notes.find(note => note.id === person.noteId);
      assert.ok(note, 'each note is visible beside its claimant');
      assert.equal(note.holderId, person.id);
      assert.equal(person.observation, note.mark + ' ' + note.text);
      const truths = model.predicates.map(predicate => predicate(person.id));
      assert.deepEqual(truths, model.tables[person.id]);
      const trueCount = truths.filter(Boolean).length;
      assert.equal(trueCount, person.id === (index === 0 ? 'rabbit' : 'bat') ? 1 : 2);
      assert.equal(evaluateLostClaim(item.id, index, person.id).correct, trueCount === 1);
      if (trueCount === 1) possibleOwners.push(person.id);
    }
    // The expected answer is checked only after all three possible worlds have been evaluated.
    assert.equal(possibleOwners.length, 1);
    assert.equal(variant.answer, possibleOwners[0]);
    for (const note of notes) {
      const subject = variant.claimants.find(person => person.id === note.claim.ownerId);
      assert.ok(subject);
      assert.ok(['is', 'is-not'].includes(note.claim.operator));
      assert.equal(note.text, '糖罐' + (note.claim.operator === 'is' ? '是' : '不是') + subject.name + '的。');
    }
  }
});

test('each gratitude letter names an observable action, distinguishes writer and courier, and has one recipient', () => {
  const item = getLostCase('valentine');
  // These roles come from the complete observations shown alongside the three claimants.
  const visibleRoles = new Map([
    ['ashi', { action: 'hold-steady', evidence: /站稳供光/u }],
    ['light', { action: 'cross-curtain', evidence: /飞过帘幕.*念头带回来/u }],
    ['crane', { action: 'deliver-letter', evidence: /负责送信.*送达章/u }],
  ]);
  const requests = [
    { sender: 'light', action: 'hold-steady', text: '谢谢你替我站稳，让我飞得很远。' },
    { sender: 'ashi', action: 'cross-curtain', text: '谢谢你替我穿过帘幕，把念头带回来。' },
  ];
  for (const [index, request] of requests.entries()) {
    const variant = item.variants[index];
    const letter = clue(variant, 'letter-front');
    const back = clue(variant, 'letter-back');
    assert.equal(letter.text, request.text);
    assert.equal(letter.diagram.thankedActionId, request.action);
    assert.equal(back.diagram.sender.id, request.sender);
    assert.equal(back.diagram.courier.id, 'crane');
    assert.match(back.text, new RegExp('落款来自' + back.diagram.sender.name, 'u'));
    assert.match(back.text, /阿翎的送达章，不能当作收件人/u);
    const possibleRecipients = variant.claimants.filter(person => {
      const role = visibleRoles.get(person.id);
      assert.ok(role);
      assert.match(person.observation, role.evidence);
      assert.equal(person.diagram.actionId, role.action);
      const fits = role.action === request.action && person.id !== request.sender && person.id !== 'crane';
      assert.equal(evaluateLostClaim(item.id, index, person.id).correct, fits);
      return fits;
    });
    assert.equal(possibleRecipients.length, 1);
    assert.equal(variant.answer, possibleRecipients[0].id);
    assert.equal(letter.diagram.actionLabel, possibleRecipients[0].diagram.label);
  }
});

test('all 18 claims return one short outcome, and only the six correct claims return a receipt', () => {
  let correctCount = 0, incorrectCount = 0;
  for (const item of LOST_CASES) {
    for (const variant of item.variants) {
      const correctIds = [], incorrectIds = [];
      for (const person of variant.claimants) {
        const result = evaluateLostClaim(item.id, variant.index, person.id);
        assert.equal(result.valid, true);
        assert.equal(typeof result.correct, 'boolean');
        assert.equal(typeof result.feedback, 'string');
        assert.ok(result.feedback);
        if (result.correct) {
          correctCount++;
          correctIds.push(person.id);
          assert.equal(result.feedback, variant.success);
          assert.equal(result.receipt, variant.receipt);
        } else {
          incorrectCount++;
          incorrectIds.push(person.id);
          assert.equal(result.feedback, variant.wrong[person.id]);
          assert.equal(result.receipt, null);
        }
      }
      assert.equal(correctIds.length, 1);
      assert.deepEqual(Object.keys(variant.wrong).sort(), incorrectIds.sort());
    }
  }
  assert.equal(correctCount, 6);
  assert.equal(incorrectCount, 12);
});

test('unknown, prototype-like, and mistyped inputs cannot select a case or produce a valid claim', () => {
  for (const sceneId of [undefined, null, 0, false, {}, [], 'missing', 'constructor', '__proto__', 'lost-station-01']) {
    assert.equal(getLostCase(sceneId), null);
  }
  for (const caseId of [undefined, null, 0, false, {}, [], 'missing', 'constructor', '__proto__', 'story-0']) {
    assert.equal(getLostCaseVariant(caseId, 0), null);
    assert.deepEqual(evaluateLostClaim(caseId, 0, 'keeper'), invalidJudgement);
  }
  for (const index of [undefined, null, '0', -1, 2, 0.5, NaN, Infinity, 0n, false, {}]) {
    assert.equal(getLostCaseVariant('lost-station-01', index), null);
    assert.deepEqual(evaluateLostClaim('lost-station-01', index, 'keeper'), invalidJudgement);
  }
  for (const person of [undefined, null, 0, false, {}, [], 'missing', 'constructor', '__proto__', 'light']) {
    assert.deepEqual(evaluateLostClaim('lost-station-01', 0, person), invalidJudgement);
  }
});

test('every displayed line is original plain-text-sized content of at most 50 characters', () => {
  const displayedKeys = new Set(['title', 'name', 'intro', 'text', 'observation', 'success', 'receipt', 'label', 'actionLabel', 'mark']);
  let checked = 0;
  const check = (text, path) => {
    checked++;
    assert.equal(typeof text, 'string', path);
    assert.equal(text, text.trim(), path);
    assert.ok(text.length > 0, path);
    assert.ok(Array.from(text).length <= 50, path + ': ' + text);
    assert.doesNotMatch(text, /[\n\r<>]/u, path);
  };
  const visit = (value, path) => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      const next = path + '.' + key;
      if (displayedKeys.has(key)) check(child, next);
      else if (key === 'wrong') for (const [person, feedback] of Object.entries(child)) check(feedback, next + '.' + person);
      else visit(child, next);
    }
  };
  visit(LOST_CASES, 'LOST_CASES');
  assert.ok(checked > 100);
  for (const item of LOST_CASES) {
    for (const variant of item.variants) {
      assert.equal((variant.success.match(/[。！？]/gu) || []).length, 1, 'one sentence per successful claim');
    }
  }
});

test('content is deeply immutable and repeated evaluation has no state or reward side effects', () => {
  const before = JSON.stringify(LOST_CASES);
  const seen = new WeakSet();
  const checkFrozen = value => {
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    assert.equal(Object.isFrozen(value), true);
    for (const child of Object.values(value)) checkFrozen(child);
  };
  checkFrozen(LOST_CASES);
  assert.throws(() => { LOST_CASES[0].variants[0].answer = 'moth'; }, TypeError);
  assert.throws(() => { LOST_CASES[0].variants.push({}); }, TypeError);
  for (const item of LOST_CASES) {
    for (const variant of item.variants) {
      for (const person of variant.claimants) {
        const first = evaluateLostClaim(item.id, variant.index, person.id);
        const next = evaluateLostClaim(item.id, variant.index, person.id);
        assert.deepEqual(first, next);
        assert.notEqual(first, next);
        first.feedback = 'a caller can edit its own outcome';
        assert.deepEqual(evaluateLostClaim(item.id, variant.index, person.id), next);
        assert.deepEqual(Object.keys(next).sort(), ['correct', 'feedback', 'receipt', 'valid']);
      }
    }
  }
  assert.equal(JSON.stringify(LOST_CASES), before);
});

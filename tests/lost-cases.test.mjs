import test from 'node:test';
import assert from 'node:assert/strict';
import { LOST_CASES, LOST_CASE_TOTALS, getLostCase, getLostCaseVariant, evaluateLostClaim } from '../dist/dream-lost-cases.js';

const clue = (variant, id) => variant.clues.find(item => item.id === id);
const unique = values => new Set(values).size === values.length;
const invalidJudgement = { valid: false, correct: false, feedback: null, receipt: null };

test('six scene cabinets expose two complete, stable evidence sets apiece', () => {
  assert.deepEqual(LOST_CASES.map(item => [item.id, item.sceneId]), [
    ['lost-station-01', 'story-0'],
    ['lost-halloween-01', 'halloween'],
    ['lost-valentine-01', 'valentine'],
    ['lost-greenhouse-01', 'story-1'],
    ['lost-library-01', 'story-3'],
    ['lost-thanksgiving-01', 'thanksgiving'],
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

test('immutable catalog totals count actual cases, authored evidence sets, and their two sides', () => {
  assert.deepEqual(LOST_CASE_TOTALS, { cases: 6, variants: 12, clues: 24 });
  assert.equal(LOST_CASE_TOTALS.cases, LOST_CASES.length);
  assert.equal(LOST_CASE_TOTALS.variants, LOST_CASES.flatMap(item => item.variants).length);
  assert.equal(LOST_CASE_TOTALS.clues, LOST_CASES.flatMap(item => item.variants.flatMap(variant => variant.clues)).length);
  assert.equal(Object.isFrozen(LOST_CASE_TOTALS), true);
  assert.throws(() => { LOST_CASE_TOTALS.variants = 0; }, TypeError);
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

test('all 36 claims return one short outcome, and only one claimant per evidence set gets a receipt', () => {
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
  assert.equal(correctCount, LOST_CASE_TOTALS.variants);
  assert.equal(incorrectCount, LOST_CASE_TOTALS.variants * 2);
});

test('two upright paper masks have one shared light badge, while either face alone leaves two owners', () => {
  const item = getLostCase('story-1'), labels = ['左上', '右上', '左下', '右下'];
  // Derive the pattern from visible cell names, independently of the evaluator's integer diagrams.
  const readHoles = text => {
    const match = /^(?:正面|背面)开孔：(.+?)。/u.exec(text);
    assert.ok(match, text);
    return match[1].split('、');
  };
  const readBadge = text => {
    const match = /^灯牌亮格：(.+)。$/u.exec(text);
    assert.ok(match, text);
    return match[1].split('、');
  };
  for (const variant of item.variants) {
    assert.equal(variant.logic.type, 'stencil-overlap');
    const front = clue(variant, 'seed-front'), back = clue(variant, 'seed-back');
    assert.match(front.text, /两面都开孔才会亮/u);
    assert.match(back.text, /箭头朝上对齐.*主人的灯牌/u);
    const holes = [readHoles(front.text), readHoles(back.text)];
    for (const [index, face] of [front, back].entries()) {
      assert.deepEqual(face.diagram, { type: 'light-stencil', rows: 2, columns: 2, orientation: 'up', holes: holes[index].map(name => labels.indexOf(name)) });
      assert.ok(holes[index].every(name => labels.includes(name)));
      assert.ok(unique(holes[index]));
    }
    const badgeById = new Map(variant.claimants.map(person => {
      const badge = readBadge(person.observation);
      assert.deepEqual(person.diagram, { type: 'lamp-badge', cells: badge.map(name => labels.indexOf(name)) });
      assert.ok(unique(badge));
      return [person.id, badge];
    }));
    for (const face of holes) {
      const stillPossible = variant.claimants.filter(person => badgeById.get(person.id).every(cell => face.includes(cell)));
      assert.equal(stillPossible.length, 2, 'neither face reveals a unique owner');
    }
    const lit = labels.filter(cell => holes[0].includes(cell) && holes[1].includes(cell));
    const possible = variant.claimants.filter(person => {
      const badge = badgeById.get(person.id), fits = lit.length === badge.length && lit.every(cell => badge.includes(cell));
      const judgement = evaluateLostClaim(item.id, variant.index, person.id);
      assert.equal(judgement.valid, true);
      assert.equal(judgement.correct, fits);
      return fits;
    });
    assert.equal(possible.length, 1);
    assert.equal(variant.answer, possible[0].id);
    for (const [personId, feedback] of Object.entries(variant.wrong)) {
      const match = /^(.+)的(左上|右上|左下|右下)格，被(正面|背面)挡住了。$/u.exec(feedback);
      assert.ok(match, feedback);
      assert.equal(match[1], variant.claimants.find(person => person.id === personId).name);
      assert.ok(badgeById.get(personId).includes(match[2]));
      const face = match[3] === '正面' ? 0 : 1;
      assert.equal(holes[face].includes(match[2]), false);
      assert.equal(holes[1 - face].includes(match[2]), true);
    }
  }
  assert.deepEqual(item.variants.map(variant => variant.answer), ['sprout', 'mushroom']);
});

test('odd and even written beat numbers reconstruct one signature; either side alone still fits two singers', () => {
  const item = getLostCase('story-3'), marks = ['①', '②', '③', '④'];
  const symbolIds = { 月: 'moon', 铃: 'bell', 星: 'star', 浪: 'wave' };
  const readSlots = text => [...text.matchAll(/([①②③④])(月|铃|星|浪)/gu)].map(match => ({ beat: marks.indexOf(match[1]), label: match[2] }));
  const readSignature = text => {
    const match = /^四拍签名：(.+)。$/u.exec(text);
    assert.ok(match, text);
    return match[1].split('、');
  };
  for (const variant of item.variants) {
    assert.equal(variant.logic.type, 'interleave-beats');
    const front = clue(variant, 'score-front'), back = clue(variant, 'score-back');
    assert.match(front.text, /按①②③④合起来.*主人的四拍签名/u);
    assert.match(back.text, /数字就是拍号/u);
    const faces = [readSlots(front.text), readSlots(back.text)];
    assert.deepEqual(faces[0].map(slot => slot.beat), [0, 2]);
    assert.deepEqual(faces[1].map(slot => slot.beat), [1, 3]);
    for (const [index, face] of [front, back].entries()) assert.deepEqual(face.diagram, {
      type: 'score-fragment', beats: 4,
      slots: faces[index].map(slot => ({ beat: slot.beat, symbol: symbolIds[slot.label] })),
    });
    const songs = new Map(variant.claimants.map(person => {
      const notes = readSignature(person.observation);
      assert.equal(notes.length, 4);
      assert.deepEqual(person.diagram, { type: 'rhythm-signature', symbols: notes.map(label => symbolIds[label]) });
      return [person.id, notes];
    }));
    for (const face of faces) assert.equal(variant.claimants.filter(person => face.every(slot => songs.get(person.id)[slot.beat] === slot.label)).length, 2);
    const ordered = faces.flat().sort((a, b) => a.beat - b.beat).map(slot => slot.label);
    const possible = variant.claimants.filter(person => {
      const fits = songs.get(person.id).every((symbol, beat) => symbol === ordered[beat]);
      const judgement = evaluateLostClaim(item.id, variant.index, person.id);
      assert.equal(judgement.valid, true);
      assert.equal(judgement.correct, fits);
      return fits;
    });
    assert.equal(possible.length, 1);
    assert.equal(variant.answer, possible[0].id);
    for (const [personId, feedback] of Object.entries(variant.wrong)) {
      const match = /^(.+)的第([一二三四])拍是(月|铃|星|浪)，书签这一拍是(月|铃|星|浪)。$/u.exec(feedback);
      assert.ok(match, feedback);
      assert.equal(match[1], variant.claimants.find(person => person.id === personId).name);
      const beat = ['一', '二', '三', '四'].indexOf(match[2]);
      assert.equal(songs.get(personId)[beat], match[3]);
      assert.equal(ordered[beat], match[4]);
      assert.notEqual(match[3], match[4]);
    }
  }
  assert.deepEqual(item.variants.map(variant => variant.answer), ['whale', 'moth']);
});

test('two visible left-of relationships yield one seating order, and neither side alone determines the middle guest', () => {
  const item = getLostCase('thanksgiving'), symbols = { 松果: 'pinecone', 信封: 'envelope', 月亮: 'moon' };
  const readRelation = text => {
    const match = /(松果|信封|月亮)在(松果|信封|月亮)左边/u.exec(text);
    assert.ok(match, text);
    return [match[1], match[2]];
  };
  const seatOrders = people => [
    [people[0], people[1], people[2]], [people[0], people[2], people[1]],
    [people[1], people[0], people[2]], [people[1], people[2], people[0]],
    [people[2], people[0], people[1]], [people[2], people[1], people[0]],
  ];
  for (const variant of item.variants) {
    assert.equal(variant.logic.type, 'seat-order');
    assert.equal(variant.logic.targetSeat, 1);
    const front = clue(variant, 'seat-front'), back = clue(variant, 'seat-back');
    assert.match(front.text, /三席并排，座签属中间/u);
    assert.match(back.text, /三种名牌各占一席.*左右按你看到的方向/u);
    const relations = [readRelation(front.text), readRelation(back.text)];
    for (const [index, face] of [front, back].entries()) assert.deepEqual(face.diagram, {
      type: 'seat-relation', seatCount: 3, ...(index === 0 ? { targetSeat: 1 } : {}),
      direction: 'screen-left-to-right', relation: { left: symbols[relations[index][0]], right: symbols[relations[index][1]] },
    });
    const badges = new Map(variant.claimants.map(person => {
      const match = /^名牌是(松果|信封|月亮)；/u.exec(person.observation);
      assert.ok(match, person.observation);
      assert.deepEqual(person.diagram, { type: 'name-badge', symbol: symbols[match[1]] });
      return [person.id, match[1]];
    }));
    const worlds = seatOrders(variant.claimants.map(person => person.id));
    const fits = (world, relation) => {
      const row = world.map(personId => badges.get(personId));
      return row.indexOf(relation[0]) < row.indexOf(relation[1]);
    };
    for (const relation of relations) assert.equal(new Set(worlds.filter(world => fits(world, relation)).map(world => world[1])).size, 3);
    const possibleWorlds = worlds.filter(world => relations.every(relation => fits(world, relation)));
    assert.equal(possibleWorlds.length, 1);
    const order = possibleWorlds[0];
    for (const person of variant.claimants) {
      const judgement = evaluateLostClaim(item.id, variant.index, person.id);
      assert.equal(judgement.valid, true);
      assert.equal(judgement.correct, person.id === order[1]);
    }
    assert.equal(variant.answer, order[1]);
    for (const [personId, feedback] of Object.entries(variant.wrong)) {
      const match = /^(.+)的(松果|信封|月亮)在最(左|右)边，座签留给中间的人。$/u.exec(feedback);
      assert.ok(match, feedback);
      assert.equal(match[1], variant.claimants.find(person => person.id === personId).name);
      assert.equal(badges.get(personId), match[2]);
      assert.equal(order.indexOf(personId), match[3] === '左' ? 0 : 2);
    }
  }
  assert.deepEqual(item.variants.map(variant => variant.answer), ['lili', 'ashi']);
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

test('callers cannot inject replacement diagrams or answer annotations into the closed catalog', () => {
  for (const item of LOST_CASES) {
    const variant = item.variants[0], forged = structuredClone(variant);
    forged.answer = variant.claimants.find(person => person.id !== variant.answer).id;
    forged.logic.type = 'unknown-rule';
    forged.clues[0].diagram = { type: 'light-stencil', rows: Infinity, holes: [0, 0, -1, '1'] };
    assert.equal(getLostCase(forged), null);
    assert.equal(getLostCaseVariant(item.id, forged), null);
    assert.deepEqual(evaluateLostClaim(item.id, forged, forged.answer), invalidJudgement);
    assert.deepEqual(evaluateLostClaim(item, 0, forged.answer), invalidJudgement);
    assert.throws(() => { variant.clues[0].diagram.type = 'unknown-rule'; }, TypeError);
    assert.equal(evaluateLostClaim(item.id, 0, variant.answer).correct, true);
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

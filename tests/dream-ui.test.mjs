import test from 'node:test';
import assert from 'node:assert/strict';
import { getStageObjective, getStageActions, formatControlHint } from '../dist/dream-ui.js';
import { getCapBookMiniature } from '../dist/cap-book.js';
import { getCapScene } from '../dist/dream-cap-story.js';

const first = changes => ({ mode: 'story', chapterIndex: 0, form: 'body', bodyX: 105, seals: 0, firstTicket: { phase: 'missing' }, ...changes });

test('first-visit goals identify the optional ticket but do not pull a player back after they skip it', () => {
  assert.match(getStageObjective(first()), /铜踏板.*去程票可选/);
  const skipped = getStageObjective(first({ bodyX: 420 }));
  assert.match(skipped, /铜踏板.*掀开头盖骨/); assert.doesNotMatch(skipped, /票|记忆/);
  const flying = getStageObjective(first({ bodyX: 420, form: 'soul' }));
  assert.match(flying, /身体留在踏板.*第一盏诗灯/);
  const advanced = getStageObjective(first({ bodyX: 1200, seals: 1 }));
  assert.match(advanced, /第二盏诗灯.*可选/); assert.doesNotMatch(advanced, /票|回去|找回/);
});

test('the ticket goal changes from holding to delivery to the next required action', () => {
  assert.match(getStageObjective(first({ form: 'soul', firstTicket: { phase: 'held' } })), /回到身体.*送上小火车/);
  assert.match(getStageObjective(first({ firstTicket: { phase: 'returning' } })), /正回到.*向右找诗灯/);
  assert.match(getStageObjective(first({ firstTicket: { phase: 'stowed' } })), /铜踏板.*掀开头盖骨/);
  assert.doesNotMatch(getStageObjective(first({ firstTicket: { phase: 'stowed' } })), /去程票/);
  for (const phase of ['missing', 'held', 'stowed']) assert.match(getStageObjective(first({ seals: 2, firstTicket: { phase } })), /发光的门/);
});

test('story memory stays optional while festival gift requirements keep their original objective', () => {
  assert.match(getStageObjective({ mode: 'story', chapterIndex: 1, seals: 1 }), /记忆可选/);
  const objective = '谜灯 1 / 2 · 礼物 2 / 3';
  assert.equal(getStageObjective({ mode: 'festival', chapterIndex: 0, objective }), objective);
});

test('a reachable lamp takes button and goal priority over nearby moon controls', () => {
  const snapshot = first({ form: 'soul', target: { kind: 'lamp', name: '诗灯' }, moonPlay: { near: true, canTurn: true, variant: 0 } });
  const actions = getStageActions(snapshot);
  assert.equal(actions.action, '解谜'); assert.equal(actions.interact, '解谜');
  assert.match(actions.actionDescription, /与诗灯共鸣/);
  assert.match(getStageObjective(snapshot), /诗灯.*谜题/);
  snapshot.target = null;
  assert.equal(getStageActions(snapshot).action, '转月镜');
  snapshot.moonPlay.near = false;
  assert.equal(getStageActions(snapshot).action, '回声脉冲');
});

test('body conversations keep priority and a moon scene only relabels available actions', () => {
  const snapshot = first({ target: { kind: 'npc', name: '绒绒' }, moonPlay: { near: true, canAdvance: true, variant: 0 } });
  assert.equal(getStageActions(snapshot).interact, '交谈');
  assert.equal(getStageActions(snapshot).interactDescription, '与绒绒交谈');
  assert.doesNotMatch(getStageObjective(snapshot), /借月/);
  snapshot.target = null;
  assert.equal(getStageActions(snapshot).interact, '换一幕');
  assert.equal(getStageActions(snapshot).action, '跳跃');
  snapshot.moonPlay.canAdvance = false;
  assert.equal(getStageActions(snapshot).interact, '互动');
});

test('pointer hints name actual buttons while keyboard hints preserve shortcuts', () => {
  const soul = getStageActions({ form: 'soul' });
  const text = 'WASD / 方向键飞行 · 按 E 回到身体 · 空格 / Q：共鸣';
  assert.equal(formatControlHint(text, 'keyboard', soul), text);
  const pointer = formatControlHint(text, 'buttons', soul);
  assert.match(pointer, /方向按钮.*「回到身体」.*「回声脉冲」.*「互动」/);
  assert.doesNotMatch(pointer, /WASD|方向键|\bE\b|\bQ\b|空格/);
  const lamp = getStageActions({ form: 'soul', target: { kind: 'lamp' } });
  assert.equal(formatControlHint('空格 / Q：与诗灯共鸣', 'buttons', lamp), '「解谜」：与诗灯共鸣');
  assert.match(formatControlHint('按 E 掀开头盖骨', 'buttons', getStageActions({ form: 'body' })), /点「掀开头盖骨」/);
});

test('the greenhouse book needs the exact seed index and exact ticket evidence', () => {
  const scene = getCapScene({ chapterIndex: 1 });
  const unrelated = getCapBookMiniature(scene, { stationRecord: { memories: [1, 2], bestMemories: 3 }, greenhouseRecord: { memories: [0, 2], seals: [0, 1], bestMemories: 3 } });
  assert.deepEqual(unrelated.greenhouse, { pot: 'clay', stage: 0, fromStage: 0, progress: 1 });
  assert.equal(unrelated.firstTicket, false);
  for (const [seals, stage] of [[[], 1], [[0], 2], [[1, 0, 1], 3]]) {
    const records = { stationRecord: { memories: [0] }, greenhouseRecord: { memories: [1], seals } };
    const before = structuredClone(records), picture = getCapBookMiniature(scene, records);
    assert.deepEqual(picture.greenhouse, { pot: 'ticket', stage, fromStage: stage, progress: 1 });
    assert.deepEqual(records, before); assert.equal(scene.greenhouse, undefined);
  }
});

test('book ticket and greenhouse props stay confined to their own story scenes', () => {
  const records = { stationRecord: { memories: [0] }, greenhouseRecord: { memories: [1], seals: [0, 1] } };
  const station = getCapBookMiniature(getCapScene({ chapterIndex: 0 }), records);
  assert.equal(station.firstTicket, true); assert.equal(station.greenhouse, undefined);
  const theatre = getCapBookMiniature(getCapScene({ chapterIndex: 2 }), records);
  assert.equal(theatre.firstTicket, false); assert.equal(theatre.greenhouse, undefined);
  const festival = getCapBookMiniature({ id: 'festival-test', motif: 'garden', festivalId: 'test' }, records);
  assert.equal(festival.firstTicket, false); assert.equal(festival.greenhouse, undefined);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { getDreamLevel } from '../dist/dream-levels.js';
import { getTheatreGuidance, THEATRE_GUIDANCE_STAGES } from '../dist/dream-theatre-guidance.js';

function scene(body = {}, moving = {}) {
  const level = getDreamLevel(2), stage = level.movers[0];
  return { mode: 'story', chapterIndex: 2, form: 'body', nearHint: '', level,
    body: { x: 710, y: 465, w: 30, h: 58, grounded: true, platform: null, ...body },
    movers: [{ ...stage, baseX: stage.x, baseY: stage.y, dx: 0, ...moving }] };
}
const hint = context => getTheatreGuidance(context);
const freeze = value => { if (value && typeof value === 'object') { for (const v of Object.values(value)) freeze(v); Object.freeze(value); } return value; };

test('the four short route hints follow current stage geometry and actual grounded attachment', () => {
  assert.deepEqual(THEATRE_GUIDANCE_STAGES, ['wait', 'board', 'ride', 'alight']);
  assert.deepEqual(hint(scene()), { stage: 'wait', text: '在踏台上等一等，舞台会回来接你。', moverId: 'stage' });
  assert.deepEqual(hint(scene({}, { x: 725, dx: 1 })), { stage: 'board', text: '舞台靠近了 · 向右走上去，或轻轻一跳。', moverId: 'stage' });
  assert.deepEqual(hint(scene({ x: 920, platform: 'stage' }, { x: 850 })), { stage: 'ride', text: '站稳就好，舞台会载你去下一幕。', moverId: 'stage' });
  assert.deepEqual(hint(scene({ x: 1120, platform: 'stage' }, { x: 1035 })), { stage: 'alight', text: '右侧踏台到了 · 向右走下舞台。', moverId: 'stage' });
});

test('approach first asks for the real elevated landing, and guidance ends on the far bank', () => {
  const approach = hint(scene({ x: 590, y: 560 }));
  assert.equal(approach.stage, 'wait'); assert.equal(approach.text, '先跳上踏台，再等舞台来接你。');
  assert.equal(hint(scene({ x: 105, y: 560 })), null, 'do not clutter the entrance before the stage approach');
  assert.equal(hint(scene({ x: 1270, y: 465 })), null, 'the character has really left the moving stage');
  assert.equal(hint(scene({ x: 1510, y: 560 })), null);
});

test('boarding never tells a player to walk across an open gap or toward a departed deck', () => {
  assert.equal(hint(scene({}, { x: 770 })).stage, 'board', 'close current deck is walkably connected');
  assert.equal(hint(scene({}, { x: 770.01 })).stage, 'wait', 'outside the body-based close threshold');
  assert.equal(hint(scene({ x: 775 }, { x: 800 })).stage, 'wait', 'near the body but disconnected from the left bank');
  assert.equal(hint(scene({ x: 775 }, { x: 605, w: 185 })).stage, 'wait', 'the visible deck does not extend ahead of the feet');
  assert.equal(hint(scene({}, { x: 1185, dx: 0 })).stage, 'wait', 'at a distant turn it is still necessary to wait');
  assert.equal(hint(scene({}, { x: 725, y: 465.02 })).stage, 'wait', 'a nearby deck at a different height is not a walkable docking');
});

test('a stale platform ID or airborne body cannot be mistaken for riding or alighting', () => {
  for (const grounded of [false, undefined, 1]) assert.equal(hint(scene({ x: 920, platform: 'stage', grounded }, { x: 850 })), null);
  assert.equal(hint(scene({ x: 920, y: 410, platform: 'stage' }, { x: 850 })), null, 'a jump with stale grounded evidence is above the real deck');
  assert.equal(hint(scene({ x: 920, y: 510, platform: 'stage' }, { x: 850 })), null, 'already below the deck');
  assert.equal(hint(scene({ x: 920, platform: null }, { x: 850 })), null, 'near a deck is not attached to it');
  assert.equal(hint(scene({ x: 920, platform: 'other' }, { x: 850 })), null);
});

test('alighting requires both actual bank overlap and a body close enough to use it', () => {
  assert.equal(hint(scene({ x: 1000, platform: 'stage' }, { x: 950 })).stage, 'ride', 'stage reaches bank but the rider is still on its left');
  assert.equal(hint(scene({ x: 1070, platform: 'stage' }, { x: 945 })).stage, 'ride', 'deck edge only touches bank, with no physical overlap');
  assert.equal(hint(scene({ x: 1070, platform: 'stage' }, { x: 947 })).stage, 'alight');
  assert.equal(hint(scene({ x: 1270, platform: 'stage' }, { x: 1185 })).stage, 'alight', 'overlapping bank still permits a safe rightward exit');
  assert.equal(hint(scene({ x: 1120, y: 464, platform: 'stage' }, { x: 1035, y: 464 })).stage, 'ride', 'a visually close bank at another height is not a docking');
});

test('current interactions, soul control and other chapters or festivals retain priority', () => {
  for (const nearHint of ['Q：与绒绒聊一聊', '空格 / Q：与诗灯共鸣', 'E 掀盖，借一束月光', '走到失物匣旁 · Q 查看', '诗灯在等你的答案。']) {
    assert.equal(hint({ ...scene({}, { x: 725 }), nearHint }), null);
  }
  for (const form of ['soul', undefined]) assert.equal(hint({ ...scene(), form }), null);
  for (const chapterIndex of [0, 1, 3, 4, 5, undefined]) assert.equal(hint({ ...scene(), chapterIndex }), null);
  assert.equal(hint({ ...scene(), mode: 'festival' }), null);
});

test('landing geometry comes from the authored level while stage position comes from runtime movers', () => {
  const a = scene({}, { x: 725 }), expected = hint(a), shifted = scene({}, { x: 725 });
  const offset = 300;
  shifted.body.x += offset;
  for (const p of shifted.level.platforms) p.x += offset;
  for (const p of shifted.level.movers) p.x += offset;
  for (const p of shifted.movers) { p.x += offset; p.baseX += offset; }
  assert.deepEqual(hint(shifted), expected);
  a.level.movers[0].x = 940; a.movers[0].x = 1185;
  assert.equal(hint(a).stage, 'wait', 'authored stage coordinate cannot override its real current position');
});

test('pure calls are pause-stable and reject incomplete or non-finite geometry', () => {
  const frozen = freeze(scene({ x: 920, platform: 'stage' }, { x: 850 })), before = JSON.stringify(frozen);
  const first = hint(frozen);
  for (let i = 0; i < 50; i++) assert.deepEqual(hint({ ...frozen, state: 'paused', time: i * 100 }), first);
  assert.equal(JSON.stringify(frozen), before); assert.ok(Object.isFrozen(first));
  for (const patch of [{ body: null }, { movers: [] }, { level: {} }, { body: { ...frozen.body, x: NaN } }, { body: { ...frozen.body, w: 0 } }]) assert.equal(hint({ ...frozen, ...patch }), null);
  const noBank = scene(); noBank.level.platforms = noBank.level.platforms.filter(p => p.x !== 1130);
  assert.equal(hint(noBank), null);
  assert.equal(hint(), null);
});

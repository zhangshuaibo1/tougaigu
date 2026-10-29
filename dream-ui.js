import { DREAM_LEVELS } from './dream-levels.js';

// Goals describe the next piece of the main journey. The nearby hint remains
// free to describe a friend, puzzle or optional activity within reach.
export function getStageObjective(snapshot = {}) {
  const soul = snapshot.form === 'soul';
  if (soul && snapshot.target?.kind === 'lamp') return '与眼前的诗灯共鸣，解开它的谜题';
  const lost = snapshot.lostCase;
  if (lost && (lost.nearBox || ['active', 'solved', 'delivering', 'returning'].includes(lost.phase))) return lost.title;
  const moon = snapshot.moonPlay;
  if (moon?.near && snapshot.target?.kind !== 'npc') return '借月追光 · 第 ' + (moon.variant + 1) + ' 幕 / 3';
  if (snapshot.mode === 'festival') return snapshot.objective || '点亮谜灯，找齐这一封来信的礼物';
  if (snapshot.seals >= 2) return soul ? '两盏诗灯已亮 · 回到身体，走进发光的门' : '两盏诗灯已亮 · 向右走进发光的门';
  if (snapshot.chapterIndex !== 0 || !Number.isFinite(snapshot.bodyX)) return '点亮诗灯 ' + (snapshot.seals || 0) + ' / 2 · 记忆可选';

  const ticket = snapshot.firstTicket;
  if (ticket?.phase === 'held') return '去程票抱好了 · 回到身体，把它送上小火车';
  if (ticket?.phase === 'returning') return '去程票正回到小火车 · 接着向右找诗灯';
  if (snapshot.seals === 1) return soul && snapshot.bodyX < 1050 ? '第一盏诗灯已亮 · 回到身体，向右找下一盏' : '向右寻找第二盏诗灯 · 记忆可选';
  const plate = DREAM_LEVELS[0].plates[0];
  if (snapshot.bodyX < plate.x - 25 && ticket?.phase === 'missing') return '向右去铜踏板 · 上方去程票可选收集';
  if (snapshot.bodyX < plate.x || snapshot.bodyX > plate.x + plate.w) return soul ? '回到身体，把阿拾留在发光铜踏板上' : '把阿拾留在发光铜踏板上，再掀开头盖骨';
  return soul ? '身体留在踏板上 · 拾光向右飞近第一盏诗灯' : '铜踏板在脚下 · 掀开头盖骨，让拾光去点灯';
}

export function getStageActions(snapshot = {}) {
  const soul = snapshot.form === 'soul';
  const actions = {
    toggle: soul ? '回到身体' : '掀开头盖骨',
    action: soul ? '回声脉冲' : '跳跃',
    actionDescription: soul ? '发出回声脉冲' : '跳跃',
    glyph: soul ? '✧' : '↑',
    interact: '互动', interactDescription: '互动',
  };
  // These priorities match the engine: a poem lamp or a friend must not be
  // relabelled as a nearby optional moon scene.
  if (soul && snapshot.target?.kind === 'lamp') {
    actions.action = actions.interact = '解谜';
    actions.actionDescription = actions.interactDescription = '解谜：与诗灯共鸣，打开谜题';
  } else if (!soul && snapshot.target?.kind === 'npc') {
    actions.interact = '交谈';
    actions.interactDescription = '与' + snapshot.target.name + '交谈';
  } else if (snapshot.moonPlay?.near && (snapshot.moonPlay.canTurn || snapshot.moonPlay.canAdvance)) {
    actions.interact = snapshot.moonPlay.canTurn ? '转月镜' : '换一幕';
    actions.interactDescription = actions.interact;
    if (snapshot.moonPlay.canTurn) actions.action = actions.actionDescription = '转月镜';
  }
  return actions;
}

// Use the last actual input source, never viewport width, to name controls.
export function formatControlHint(text, source = 'keyboard', actions = getStageActions()) {
  if (source === 'keyboard') return String(text || '');
  const button = label => '「' + label + '」';
  const both = actions.action === actions.interact ? button(actions.action) : button(actions.action) + ' / ' + button(actions.interact);
  return String(text || '')
    // The button already names the action; do not print it twice on touch UI.
    .replace(/(按\s*)?E\b\s*(掀开头盖骨|回到身体)/g, (_, press, verb) =>
      verb === actions.toggle ? (press ? '点' : '') + button(actions.toggle) : (press || '') + 'E ' + verb)
    .replace(/WASD\s*\/\s*方向键|WASD|方向键/g, '方向按钮')
    .replace(/空格\s*\/\s*Q/g, both)
    .replace(/按\s*E\b/g, '点' + button(actions.toggle))
    .replace(/按\s*Q\b/g, '点' + button(actions.interact))
    .replace(/按\s*(?:空格|SPACE)/g, '点' + button(actions.action))
    .replace(/\bE\b/g, button(actions.toggle))
    .replace(/\bQ\b/g, button(actions.interact))
    .replace(/空格|\bSPACE\b/g, button(actions.action));
}

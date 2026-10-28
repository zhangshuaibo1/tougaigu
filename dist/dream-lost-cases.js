// Original, self-contained lost-property stories. No UI, storage, rewards or clocks.
// Diagrams carry the same facts shown in prose, so a claimant can be judged from evidence.
const freeze = value => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};

const places = {
  station: { id: 'station', label: '站台', motif: 'station' },
  clocktower: { id: 'clocktower', label: '钟楼', motif: 'clock' },
  greenhouse: { id: 'greenhouse', label: '温室', motif: 'sprout' },
};
const route = (from, to, label) => ({ type: 'route', from: places[from], to: places[to], label });
const outward = (id, name, motif, from, to) => ({
  id, name, motif,
  observation: '去程：' + places[from].label + ' → ' + places[to].label + '。',
  diagram: route(from, to, '去程'),
});
const stationClaimants = [
  outward('moth', '绒绒', 'moth', 'station', 'clocktower'),
  outward('keeper', '归先生', 'keeper', 'clocktower', 'station'),
  outward('ashi', '阿拾', 'ashi', 'station', 'greenhouse'),
];
const ticketClues = (from, to) => [
  {
    id: 'ticket-front', side: 'front', title: '车票正面',
    text: '票面路线：' + places[from].label + ' → ' + places[to].label + '。',
    diagram: route(from, to, '票面路线'),
  },
  {
    id: 'ticket-back', side: 'back', title: '车票背面',
    text: '小印章写着“回程”：这张票要把去程的方向倒过来。',
    diagram: { type: 'stamp', label: '回程', journey: 'return' },
  },
];

const halloweenPeople = [
  { id: 'rabbit', name: '小兔', motif: 'rabbit' },
  { id: 'bat', name: '蝙蝠', motif: 'bat' },
  { id: 'pumpkin', name: '南瓜先生', motif: 'pumpkin' },
];
const personName = id => halloweenPeople.find(person => person.id === id).name;
const jarEvidence = (pairedOwner, excludedOwner) => {
  const claims = [
    { operator: 'is', ownerId: pairedOwner },
    { operator: 'is-not', ownerId: pairedOwner },
    { operator: 'is-not', ownerId: excludedOwner },
  ];
  const notes = claims.map((claim, index) => ({
    id: 'note-' + (index + 1), mark: ['①', '②', '③'][index],
    holderId: halloweenPeople[index].id,
    text: '糖罐' + (claim.operator === 'is' ? '是' : '不是') + personName(claim.ownerId) + '的。',
    claim,
  }));
  return {
    clues: [
      {
        id: 'jar-notes', side: 'front', title: '糖罐正面',
        text: '三张便签贴在罐边，编号和认领者旁的一样。',
        diagram: { type: 'notes', notes },
      },
      {
        id: 'jar-rule', side: 'back', title: '糖罐底面',
        text: '三张便签中，恰好只有一句是真话；另外两句是玩笑。',
        diagram: { type: 'truth-rule', exactlyTrue: 1, label: '恰好一句真话' },
      },
    ],
    claimants: halloweenPeople.map((person, index) => ({
      ...person, observation: notes[index].mark + ' ' + notes[index].text,
      noteId: notes[index].id,
    })),
  };
};

const letterClaimants = [
  {
    id: 'ashi', name: '阿拾', motif: 'ashi',
    observation: '阿拾留在原处站稳供光，让拾光从头顶飞出去。',
    diagram: { type: 'action', actionId: 'hold-steady', label: '站稳供光' },
  },
  {
    id: 'light', name: '拾光', motif: 'light',
    observation: '拾光飞过帘幕，把藏起来的念头带回来。',
    diagram: { type: 'action', actionId: 'cross-curtain', label: '穿帘带回念头' },
  },
  {
    id: 'crane', name: '阿翎', motif: 'paper-crane',
    observation: '阿翎负责送信，信送到后盖上纸鹤送达章。',
    diagram: { type: 'action', actionId: 'deliver-letter', label: '送信盖章' },
  },
];
const letterClues = (senderId, thankedActionId, text) => {
  const sender = letterClaimants.find(person => person.id === senderId);
  const senderMark = senderId === 'light' ? '小光点落款' : '骷髅邮戳落款';
  const actionLabel = letterClaimants.find(person => person.diagram.actionId === thankedActionId).diagram.label;
  return [
    {
      id: 'letter-front', side: 'front', title: '信纸正面', text,
      diagram: { type: 'letter', thankedActionId, actionLabel, label: '把谢谢送给做这件事的人' },
    },
    {
      id: 'letter-back', side: 'back', title: '信纸与信封背面',
      text: '落款来自' + sender.name + '；纸鹤印是阿翎的送达章，不能当作收件人。',
      diagram: {
        type: 'mail-marks',
        sender: { id: sender.id, name: sender.name, label: senderMark },
        courier: { id: 'crane', name: '阿翎', label: '纸鹤送达章' },
      },
    },
  ];
};

// Both paper layers and every claimant's badge use this upright coordinate frame.
const cellLabels = ['左上', '右上', '左下', '右下'];
const lampBadge = (id, name, motif, cells) => ({
  id, name, motif,
  observation: '灯牌亮格：' + cells.map(cell => cellLabels[cell]).join('、') + '。',
  diagram: { type: 'lamp-badge', cells },
});
const greenhouseClaimants = [
  lampBadge('sprout', '芽芽', 'sprout', [0, 1]),
  lampBadge('mushroom', '伞伞', 'mushroom', [0, 2]),
  lampBadge('moth', '绒绒', 'moth', [0, 3]),
];
const seedClues = (front, back) => [
  {
    id: 'seed-front', side: 'front', title: '袋面小窗',
    text: '正面开孔：' + front.map(cell => cellLabels[cell]).join('、') + '。两面都开孔才会亮。',
    diagram: { type: 'light-stencil', rows: 2, columns: 2, orientation: 'up', holes: front },
  },
  {
    id: 'seed-back', side: 'back', title: '袋背小窗',
    text: '背面开孔：' + back.map(cell => cellLabels[cell]).join('、') + '。箭头朝上对齐，亮格配主人的灯牌。',
    diagram: { type: 'light-stencil', rows: 2, columns: 2, orientation: 'up', holes: back },
  },
];

const soundLabels = { moon: '月', bell: '铃', star: '星', wave: '浪' };
const beatMarks = ['①', '②', '③', '④'];
const signature = (id, name, motif, symbols) => ({
  id, name, motif,
  observation: '四拍签名：' + symbols.map(symbol => soundLabels[symbol]).join('、') + '。',
  diagram: { type: 'rhythm-signature', symbols },
});
const scoreClues = symbols => {
  const slots = beats => beats.map(beat => ({ beat, symbol: symbols[beat] }));
  const line = beats => beats.map(beat => beatMarks[beat] + soundLabels[symbols[beat]]).join('、');
  return [
    {
      id: 'score-front', side: 'front', title: '书签正面',
      text: '正面记' + line([0, 2]) + '；按①②③④合起来，才是主人的四拍签名。',
      diagram: { type: 'score-fragment', beats: 4, slots: slots([0, 2]) },
    },
    {
      id: 'score-back', side: 'back', title: '书签背面',
      text: '背面记' + line([1, 3]) + '；数字就是拍号。',
      diagram: { type: 'score-fragment', beats: 4, slots: slots([1, 3]) },
    },
  ];
};

const seatLabels = { pinecone: '松果', envelope: '信封', moon: '月亮' };
const thanksgivingClaimants = [
  { id: 'lili', name: '栗栗', motif: 'squirrel', observation: '名牌是松果；尾巴抱着一只空碗。', diagram: { type: 'name-badge', symbol: 'pinecone' } },
  { id: 'ashi', name: '阿拾', motif: 'ashi', observation: '名牌是信封；脚边还留着一束光。', diagram: { type: 'name-badge', symbol: 'envelope' } },
  { id: 'moth', name: '绒绒', motif: 'moth', observation: '名牌是月亮；翅膀替餐巾挡着风。', diagram: { type: 'name-badge', symbol: 'moon' } },
];
const seatClues = (front, back) => [
  {
    id: 'seat-front', side: 'front', title: '座签正面',
    text: '三席并排，座签属中间；' + seatLabels[front.left] + '在' + seatLabels[front.right] + '左边。',
    diagram: { type: 'seat-relation', seatCount: 3, targetSeat: 1, direction: 'screen-left-to-right', relation: front },
  },
  {
    id: 'seat-back', side: 'back', title: '座签背面',
    text: seatLabels[back.left] + '在' + seatLabels[back.right] + '左边。三种名牌各占一席，左右按你看到的方向。',
    diagram: { type: 'seat-relation', seatCount: 3, direction: 'screen-left-to-right', relation: back },
  },
];

const authorCase = spec => ({
  ...spec,
  // The first evidence set is also available for a static cabinet/album preview.
  clues: spec.variants[0].clues,
  claimants: spec.variants[0].claimants,
  variants: spec.variants.map((variant, index) => ({ ...variant, index, caseId: spec.id, sceneId: spec.sceneId })),
});

export const LOST_CASES = freeze([
  authorCase({
    id: 'lost-station-01', sceneId: 'story-0',
    title: '谁掉了这张回程票？',
    object: { name: '无名回程票', motif: 'ticket' },
    intro: '长椅下面有张无名车票，谁正等它回家？',
    variants: [
      {
        id: 'clocktower-return', clues: ticketClues('station', 'clocktower'), claimants: stationClaimants,
        logic: { type: 'return-route', routeClueId: 'ticket-front', stampClueId: 'ticket-back' },
        answer: 'keeper',
        wrong: {
          moth: '绒绒的回程应从钟楼回站台，方向对不上。',
          ashi: '阿拾的去程连着温室，票面没有这一站。',
        },
        success: '修完站钟，这回能回家了。',
        receipt: '归先生收好回程票，钟楼的小窗亮了。',
      },
      {
        id: 'station-return', clues: ticketClues('clocktower', 'station'), claimants: stationClaimants,
        logic: { type: 'return-route', routeClueId: 'ticket-front', stampClueId: 'ticket-back' },
        answer: 'moth',
        wrong: {
          keeper: '归先生的回程应从站台回钟楼，方向对不上。',
          ashi: '阿拾的去程连着温室，票面没有这一站。',
        },
        success: '原来我给自己留过一张回程票。',
        receipt: '绒绒坐回候车椅，把回程票放进检票册。',
      },
    ],
  }),
  authorCase({
    id: 'lost-halloween-01', sceneId: 'halloween',
    title: '糖罐的三张便签',
    object: { name: '无名糖罐', motif: 'candy-jar' },
    intro: '糖罐掉了名字，三张便签里藏着两句玩笑。',
    variants: [
      {
        id: 'rabbit-jar', ...jarEvidence('bat', 'rabbit'),
        logic: { type: 'truth-count', notesClueId: 'jar-notes', ruleClueId: 'jar-rule' },
        answer: 'rabbit',
        wrong: {
          bat: '若给蝙蝠，第一和第三张便签都会说真话。',
          pumpkin: '若给南瓜先生，第二和第三张便签都会说真话。',
        },
        success: '糖罐回来了，我也想来坐坐。',
        receipt: '小兔推开窗，把糖罐放在了邀请座旁。',
      },
      {
        id: 'bat-jar', ...jarEvidence('pumpkin', 'bat'),
        logic: { type: 'truth-count', notesClueId: 'jar-notes', ruleClueId: 'jar-rule' },
        answer: 'bat',
        wrong: {
          rabbit: '若给小兔，第二和第三张便签都会说真话。',
          pumpkin: '若给南瓜先生，第一和第三张便签都会说真话。',
        },
        success: '这次我带糖来，便签就不乱贴了。',
        receipt: '蝙蝠把糖罐挂稳，给夜邮局留了一颗糖。',
      },
    ],
  }),
  authorCase({
    id: 'lost-valentine-01', sceneId: 'valentine',
    title: '这封谢谢，写给谁？',
    object: { name: '没有收件人的感谢信', motif: 'letter' },
    intro: '阿翎送来一封无名感谢信，谁在等这句谢谢？',
    variants: [
      {
        id: 'thanks-for-standing',
        clues: letterClues('light', 'hold-steady', '谢谢你替我站稳，让我飞得很远。'),
        claimants: letterClaimants,
        logic: { type: 'thanked-action', letterClueId: 'letter-front', marksClueId: 'letter-back' },
        answer: 'ashi',
        wrong: {
          light: '小光点是拾光的落款，写信人正在感谢替它站稳的人。',
          crane: '纸鹤盖的是送达章；信里感谢的是替拾光站稳的人。',
        },
        success: '这一次，你也在收件人里。',
        receipt: '阿拾把感谢信收进围巾，拾光绕着小窗飞了一圈。',
      },
      {
        id: 'thanks-for-flying',
        clues: letterClues('ashi', 'cross-curtain', '谢谢你替我穿过帘幕，把念头带回来。'),
        claimants: letterClaimants,
        logic: { type: 'thanked-action', letterClueId: 'letter-front', marksClueId: 'letter-back' },
        answer: 'light',
        wrong: {
          ashi: '骷髅邮戳是阿拾的落款，他在感谢替自己飞出去的人。',
          crane: '阿翎负责送信；穿过帘幕、带回念头的是另一位。',
        },
        success: '你替我站稳，我把这句谢谢带回来了。',
        receipt: '拾光把信挂在头顶小窗旁，阿拾轻轻扣好了盖子。',
      },
    ],
  }),
  authorCase({
    id: 'lost-greenhouse-01', sceneId: 'story-1',
    title: '种子袋的两层小窗',
    object: { name: '借光种子袋', motif: 'seed-window-bag' },
    intro: '阿拾站稳供光，种子袋的两层小窗都醒了。',
    variants: [
      {
        id: 'top-light', clues: seedClues([0, 1, 2], [0, 1, 3]), claimants: greenhouseClaimants,
        logic: { type: 'stencil-overlap', frontClueId: 'seed-front', backClueId: 'seed-back' },
        answer: 'sprout',
        wrong: {
          mushroom: '伞伞的左下格，被背面挡住了。',
          moth: '绒绒的右下格，被正面挡住了。',
        },
        success: '我就说，脑袋里的春天没下班。',
        receipt: '芽芽把种子袋挂在头顶小窗，第一片叶子接住了光。',
      },
      {
        id: 'left-light', clues: seedClues([0, 2, 3], [0, 1, 2]), claimants: greenhouseClaimants,
        logic: { type: 'stencil-overlap', frontClueId: 'seed-front', backClueId: 'seed-back' },
        answer: 'mushroom',
        wrong: {
          sprout: '芽芽的右上格，被正面挡住了。',
          moth: '绒绒的右下格，被背面挡住了。',
        },
        success: '伞借你遮雨，光替我留一点。',
        receipt: '伞伞把种子袋藏进伞褶，阿拾头里多了一片小阴凉。',
      },
    ],
  }),
  authorCase({
    id: 'lost-library-01', sceneId: 'story-3',
    title: '谁的四拍藏在书签里？',
    object: { name: '回声书签', motif: 'echo-bookmark' },
    intro: '阿拾把光留在书页上，拾光捞起一枚只肯唱两拍的书签。',
    variants: [
      {
        id: 'moon-start', clues: scoreClues(['moon', 'bell', 'star', 'wave']),
        claimants: [
          signature('whale', '蓝页', 'whale', ['moon', 'bell', 'star', 'wave']),
          signature('moth', '绒绒', 'moth', ['moon', 'wave', 'star', 'bell']),
          signature('ashi', '阿拾', 'ashi', ['star', 'bell', 'moon', 'wave']),
        ],
        logic: { type: 'interleave-beats', frontClueId: 'score-front', backClueId: 'score-back' },
        answer: 'whale',
        wrong: {
          moth: '绒绒的第二拍是浪，书签这一拍是铃。',
          ashi: '阿拾的第一拍是星，书签这一拍是月。',
        },
        success: '书签归位，打嗝也能按拍子来。',
        receipt: '蓝页把书签夹回书里，小鲸从阿拾头顶吹出四个泡泡。',
      },
      {
        id: 'bell-start', clues: scoreClues(['bell', 'wave', 'moon', 'star']),
        claimants: [
          signature('whale', '蓝页', 'whale', ['bell', 'star', 'moon', 'wave']),
          signature('moth', '绒绒', 'moth', ['bell', 'wave', 'moon', 'star']),
          signature('ashi', '阿拾', 'ashi', ['moon', 'wave', 'bell', 'star']),
        ],
        logic: { type: 'interleave-beats', frontClueId: 'score-front', backClueId: 'score-back' },
        answer: 'moth',
        wrong: {
          whale: '蓝页的第二拍是星，书签这一拍是浪。',
          ashi: '阿拾的第一拍是月，书签这一拍是铃。',
        },
        success: '找到了，今晚的谢幕能多唱两拍。',
        receipt: '绒绒轻敲书签，四个音符在头顶小窗排队谢幕。',
      },
    ],
  }),
  authorCase({
    id: 'lost-thanksgiving-01', sceneId: 'thanksgiving',
    title: '中间那把椅子，等谁？',
    object: { name: '漏印名字的座签', motif: 'folded-seat-card' },
    intro: '阿拾留在桌边供光，拾光吹开一张漏印名字的座签。',
    variants: [
      {
        id: 'first-table', clues: seatClues({ left: 'envelope', right: 'pinecone' }, { left: 'pinecone', right: 'moon' }), claimants: thanksgivingClaimants,
        logic: { type: 'seat-order', frontClueId: 'seat-front', backClueId: 'seat-back', targetSeat: 1 },
        answer: 'lili',
        wrong: {
          ashi: '阿拾的信封在最左边，座签留给中间的人。',
          moth: '绒绒的月亮在最右边，座签留给中间的人。',
        },
        success: '原来中间这碗，也有我的份。',
        receipt: '栗栗终于坐下，阿拾头里的小长桌多了一缕热气。',
      },
      {
        id: 'second-table', clues: seatClues({ left: 'moon', right: 'envelope' }, { left: 'envelope', right: 'pinecone' }), claimants: thanksgivingClaimants,
        logic: { type: 'seat-order', frontClueId: 'seat-front', backClueId: 'seat-back', targetSeat: 1 },
        answer: 'ashi',
        wrong: {
          lili: '栗栗的松果在最右边，座签留给中间的人。',
          moth: '绒绒的月亮在最左边，座签留给中间的人。',
        },
        success: '头顶留了光，桌边也给我留了座。',
        receipt: '阿拾收好座签，拾光把空椅子拖到头顶的小餐桌旁。',
      },
    ],
  }),
]);

export const LOST_CASE_TOTALS = freeze({
  cases: LOST_CASES.length,
  variants: LOST_CASES.reduce((total, item) => total + item.variants.length, 0),
  clues: LOST_CASES.reduce((total, item) => total + item.variants.reduce((sum, variant) => sum + variant.clues.length, 0), 0),
});

const casesByScene = new Map(LOST_CASES.map(item => [item.sceneId, item]));
const casesById = new Map(LOST_CASES.map(item => [item.id, item]));

/** Scene IDs select a cabinet; case IDs select its authored evidence variants. */
export function getLostCase(sceneId) {
  return typeof sceneId === 'string' ? casesByScene.get(sceneId) || null : null;
}

export function getLostCaseVariant(caseId, index) {
  if (typeof caseId !== 'string' || !Number.isInteger(index) || index < 0) return null;
  return casesById.get(caseId)?.variants[index] || null;
}

const diagram = (variant, clueId) => variant.clues.find(clue => clue.id === clueId)?.diagram;
const plain = value => Boolean(value && typeof value === 'object' && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null));
const identifier = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value)
  && !['constructor', 'prototype'].includes(value);
const shortText = value => typeof value === 'string' && value.trim() === value && value.length > 0
  && [...value].length <= 50 && !/[\r\n<>]/.test(value);
const uniqueIndexes = (values, count) => Array.isArray(values) && values.length > 0 && values.length <= count
  && new Set(values).size === values.length
  && Array.from(values).every(value => Number.isInteger(value) && value >= 0 && value < count);
const symbolsAre = (values, labels, length) => Array.isArray(values) && values.length === length
  && Array.from(values).every(symbol => typeof symbol === 'string' && Object.hasOwn(labels, symbol));
const sameSet = (a, b) => a.length === b.length && a.every(value => b.includes(value));
const validVariant = variant => plain(variant) && plain(variant.logic)
  && Array.isArray(variant.clues) && variant.clues.length === 2
  && Array.from(variant.clues).every(clue => plain(clue) && identifier(clue.id) && ['front', 'back'].includes(clue.side)
    && shortText(clue.title) && shortText(clue.text) && plain(clue.diagram))
  && new Set(variant.clues.map(clue => clue.id)).size === 2 && new Set(variant.clues.map(clue => clue.side)).size === 2
  && Array.isArray(variant.claimants) && variant.claimants.length === 3
  && Array.from(variant.claimants).every(person => plain(person) && identifier(person.id)
    && shortText(person.name) && identifier(person.motif) && shortText(person.observation))
  && new Set(variant.claimants.map(person => person.id)).size === 3
  && identifier(variant.answer) && plain(variant.wrong) && shortText(variant.success) && shortText(variant.receipt);
const twoSides = variant => {
  const { frontClueId, backClueId } = variant.logic;
  if (!identifier(frontClueId) || !identifier(backClueId) || frontClueId === backClueId) return null;
  const front = variant.clues.find(clue => clue.id === frontClueId), back = variant.clues.find(clue => clue.id === backClueId);
  return front?.side === 'front' && back?.side === 'back' ? [front.diagram, back.diagram] : null;
};
const permutations = values => values.length
  ? values.flatMap((value, index) => permutations(values.filter((_, other) => other !== index)).map(rest => [value, ...rest]))
  : [[]];
const solvesEvidence = (variant, claimant) => {
  const logic = variant.logic;
  if (logic.type === 'return-route') {
    const ticket = diagram(variant, logic.routeClueId), stamp = diagram(variant, logic.stampClueId), trip = claimant.diagram;
    const validRoute = value => plain(value) && value.type === 'route' && plain(value.from) && plain(value.to) && identifier(value.from.id) && identifier(value.to.id);
    if (!validRoute(ticket) || !validRoute(trip) || stamp?.type !== 'stamp' || stamp.journey !== 'return') return null;
    return stamp?.journey === 'return' && ticket?.from.id === trip?.to.id && ticket?.to.id === trip?.from.id;
  }
  if (logic.type === 'truth-count') {
    const notes = diagram(variant, logic.notesClueId)?.notes, rule = diagram(variant, logic.ruleClueId);
    if (!Array.isArray(notes) || notes.length !== 3 || rule?.type !== 'truth-rule' || !Number.isInteger(rule.exactlyTrue) || rule.exactlyTrue < 0 || rule.exactlyTrue > notes.length
      || !Array.from(notes).every(note => plain(note) && plain(note.claim) && ['is', 'is-not'].includes(note.claim.operator)
        && variant.claimants.some(person => person.id === note.claim.ownerId))) return null;
    const truths = notes.reduce((count, note) => count + Number(note.claim.operator === 'is' ? claimant.id === note.claim.ownerId : note.claim.operator === 'is-not' && claimant.id !== note.claim.ownerId), 0);
    return truths === rule.exactlyTrue;
  }
  if (logic.type === 'thanked-action') {
    const letter = diagram(variant, logic.letterClueId), marks = diagram(variant, logic.marksClueId);
    if (letter?.type !== 'letter' || !identifier(letter.thankedActionId) || marks?.type !== 'mail-marks'
      || !plain(marks.sender) || !plain(marks.courier) || !variant.claimants.some(person => person.id === marks.sender.id)
      || !variant.claimants.some(person => person.id === marks.courier.id) || claimant.diagram?.type !== 'action' || !identifier(claimant.diagram.actionId)) return null;
    return Boolean(letter && marks && claimant.diagram?.actionId === letter.thankedActionId && claimant.id !== marks.sender.id);
  }
  if (logic.type === 'stencil-overlap') {
    const sides = twoSides(variant), badge = claimant.diagram;
    if (!sides || !sides.every(side => side.type === 'light-stencil' && side.rows === 2 && side.columns === 2
      && side.orientation === 'up' && uniqueIndexes(side.holes, 4))
      || badge?.type !== 'lamp-badge' || !uniqueIndexes(badge.cells, 4)) return null;
    const [front, back] = sides, lit = front.holes.filter(cell => back.holes.includes(cell));
    return sameSet(lit, badge.cells);
  }
  if (logic.type === 'interleave-beats') {
    const sides = twoSides(variant), signature = claimant.diagram;
    if (!sides || !sides.every((side, parity) => side.type === 'score-fragment' && side.beats === 4
      && Array.isArray(side.slots) && side.slots.length === 2
      && Array.from(side.slots).every(slot => plain(slot) && Number.isInteger(slot.beat) && slot.beat >= 0 && slot.beat < 4
        && slot.beat % 2 === parity && typeof slot.symbol === 'string' && Object.hasOwn(soundLabels, slot.symbol))
      && new Set(side.slots.map(slot => slot.beat)).size === 2)
      || signature?.type !== 'rhythm-signature' || !symbolsAre(signature.symbols, soundLabels, 4)) return null;
    const complete = Array(4);
    for (const side of sides) for (const slot of side.slots) complete[slot.beat] = slot.symbol;
    return signature.symbols.every((symbol, beat) => symbol === complete[beat]);
  }
  if (logic.type === 'seat-order') {
    const sides = twoSides(variant), badges = variant.claimants.map(person => person.diagram?.symbol);
    if (!sides || logic.targetSeat !== 1 || sides[0].targetSeat !== 1 || sides[1].targetSeat !== undefined
      || !variant.claimants.every(person => person.diagram?.type === 'name-badge')
      || !symbolsAre(badges, seatLabels, 3) || new Set(badges).size !== 3
      || !sides.every(side => side.type === 'seat-relation' && side.seatCount === 3 && side.direction === 'screen-left-to-right'
        && plain(side.relation) && badges.includes(side.relation.left) && badges.includes(side.relation.right)
        && side.relation.left !== side.relation.right)) return null;
    const orders = permutations(badges).filter(order => sides.every(side => order.indexOf(side.relation.left) < order.indexOf(side.relation.right)));
    if (orders.length !== 1) return null;
    return claimant.diagram.symbol === orders[0][sides[0].targetSeat];
  }
  return null;
};

const invalidJudgement = () => ({ valid: false, correct: false, feedback: null, receipt: null });

/** Returns a new judgement; evaluating never changes a case or claims any reward. */
export function evaluateLostClaim(caseId, variantIndex, claimantId) {
  const variant = getLostCaseVariant(caseId, variantIndex);
  if (!validVariant(variant) || typeof claimantId !== 'string') return invalidJudgement();
  const claimant = variant.claimants.find(item => item.id === claimantId);
  if (!claimant) return invalidJudgement();
  const checks = variant.claimants.map(person => solvesEvidence(variant, person));
  if (checks.some(result => typeof result !== 'boolean') || checks.filter(Boolean).length !== 1) return invalidJudgement();
  const winner = variant.claimants[checks.indexOf(true)].id;
  // Derive the winner first, then verify authored labels and feedback agree with that evidence.
  if (variant.answer !== winner || Object.keys(variant.wrong).length !== 2
    || variant.claimants.some(person => person.id !== winner && (!Object.hasOwn(variant.wrong, person.id) || !shortText(variant.wrong[person.id])))) return invalidJudgement();
  const correct = checks[variant.claimants.indexOf(claimant)];
  return { valid: true, correct, feedback: correct ? variant.success : variant.wrong[claimant.id], receipt: correct ? variant.receipt : null };
}

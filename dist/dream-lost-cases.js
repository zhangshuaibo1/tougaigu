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
]);

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
const solvesEvidence = (variant, claimant) => {
  const logic = variant.logic;
  if (logic.type === 'return-route') {
    const ticket = diagram(variant, logic.routeClueId), stamp = diagram(variant, logic.stampClueId), trip = claimant.diagram;
    return stamp?.journey === 'return' && ticket?.from.id === trip?.to.id && ticket?.to.id === trip?.from.id;
  }
  if (logic.type === 'truth-count') {
    const notes = diagram(variant, logic.notesClueId)?.notes, rule = diagram(variant, logic.ruleClueId);
    if (!notes || !rule) return false;
    const truths = notes.reduce((count, note) => count + Number(note.claim.operator === 'is' ? claimant.id === note.claim.ownerId : note.claim.operator === 'is-not' && claimant.id !== note.claim.ownerId), 0);
    return truths === rule.exactlyTrue;
  }
  if (logic.type === 'thanked-action') {
    const letter = diagram(variant, logic.letterClueId), marks = diagram(variant, logic.marksClueId);
    return Boolean(letter && marks && claimant.diagram?.actionId === letter.thankedActionId && claimant.id !== marks.sender.id);
  }
  return false;
};

/** Returns a new judgement; evaluating never changes a case or claims any reward. */
export function evaluateLostClaim(caseId, variantIndex, claimantId) {
  const variant = getLostCaseVariant(caseId, variantIndex);
  const claimant = variant && typeof claimantId === 'string' ? variant.claimants.find(item => item.id === claimantId) : null;
  if (!variant || !claimant) return { valid: false, correct: false, feedback: null, receipt: null };
  const correct = solvesEvidence(variant, claimant);
  return { valid: true, correct, feedback: correct ? variant.success : variant.wrong[claimant.id], receipt: correct ? variant.receipt : null };
}

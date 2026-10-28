// Optional, player-opened conversations in the six main chapters. These
// descriptions never read or write progress; the caller supplies current facts.
import { normalizeJourneyContext } from './dream-journey.js';
const encounters = [
  {
    id: 'story-npc-0', chapterIndex: 0, sceneId: 'story-0',
    speaker: 'moth', name: '绒绒', motif: 'moth', prop: 'station-lantern',
    x: 190, y: 560, accent: '#cfb7ef',
    lines: [
      [
        { speaker: 'moth', text: '脑袋里有灯，别闷着。站上铜踏板，再掀盖放拾光过帘幕。' },
        { speaker: 'ashi', text: '明白，我负责站稳，头里的乘客负责探路。', mood: 'open' },
      ],
      [
        { speaker: 'moth', text: '第一盏亮了，站钟肯走了。另一盏还在前面，身体也得跟上。' },
        { speaker: 'light', text: '车厢不空了，还能捎上一句没说出口的你好。', mood: 'joy' },
      ],
      [
        { speaker: 'moth', text: '两盏灯都在替你留路。让拾光归位，带着身体去出口吧。' },
        { speaker: 'ashi', text: '头盖扣好，车票收好。这次我也算乘客。', mood: 'joy' },
      ],
    ],
    repeat: [
      [{ speaker: 'moth', text: '检票不查鼻孔。铜踏板上站稳，再开你的头顶候车室。' }],
      [{ speaker: 'moth', text: '还有一盏等你。别只把拾光送远，身体也该换个站台。' }],
      [{ speaker: 'moth', text: '灯亮齐了，末班车还等你这副骨头走进出口。' }],
    ],
  },
  {
    id: 'story-npc-1', chapterIndex: 1, sceneId: 'story-1',
    speaker: 'keeper', name: '归先生', motif: 'keeper', prop: 'greenhouse-can',
    x: 190, y: 560, accent: '#a9d4b5',
    lines: [
      [
        { speaker: 'keeper', text: '我替主人看一会儿花。阿拾，掀盖借点光，别把嫩芽扣在里面。' },
        { speaker: 'light', text: '身体踩上大蘑菇，就能借力去高台等我。', mood: 'brave' },
      ],
      [
        { speaker: 'keeper', text: '亮了一盏，雨少退了一步。让身体站稳，拾光去够另一盏。' },
        { speaker: 'ashi', text: '那我不催它开花，只把头顶的窗再推开一点。', mood: 'open' },
      ],
      [
        { speaker: 'keeper', text: '两盏都亮了，窗边总算暖些。拾光归位后，带着身体往前走。' },
        { speaker: 'light', text: '小芽把春天装好了。放心，它只占靠窗那格。', mood: 'joy' },
      ],
    ],
    repeat: [
      [{ speaker: 'keeper', text: '小芽长得慢，蘑菇送得快。踩稳再向右，别甩着头盖赶路。' }],
      [{ speaker: 'keeper', text: '另一盏还没醒。你站稳借光，我替嫩芽看着窗。' }],
      [{ speaker: 'keeper', text: '花不必今天全开。两盏灯已齐，先把身体送到出口。' }],
    ],
  },
  {
    id: 'story-npc-2', chapterIndex: 2, sceneId: 'story-2',
    speaker: 'moth', name: '绒绒', motif: 'moth', prop: 'theatre-ticket',
    x: 190, y: 560, accent: '#d9b3dd',
    lines: [
      [
        { speaker: 'moth', text: '纸月亮就位了。先跳上踏台，等移动舞台靠近，身体再上场。' },
        { speaker: 'ashi', text: '我头里的剧场也开门，拾光负责追光，我负责不掉下去。', mood: 'open' },
      ],
      [
        { speaker: 'moth', text: '一盏追光亮了。灵魂能先探路，身体得等舞台来接。' },
        { speaker: 'light', text: '台词还没找齐没关系，我先替你照着落脚的地方。', mood: 'brave' },
      ],
      [
        { speaker: 'moth', text: '两盏月光都到齐了。让拾光回盖，带着身体去出口谢幕。' },
        { speaker: 'ashi', text: '谢幕时可以鞠躬吧？我保证不把脑袋里的观众倒出来。', mood: 'joy' },
      ],
    ],
    repeat: [
      [{ speaker: 'moth', text: '鼻孔不售票。跳上踏台，等那块会动的舞台来接你。' }],
      [{ speaker: 'moth', text: '一盏照路，一盏还在等。主角的骨头也得跟上追光。' }],
      [{ speaker: 'moth', text: '这回掌声齐了。把拾光带回头顶，身体从出口下台。' }],
    ],
  },
  {
    id: 'story-npc-3', chapterIndex: 3, sceneId: 'story-3',
    speaker: 'whale', name: '蓝页', motif: 'whale', prop: 'library-book',
    x: 190, y: 560, accent: '#9fd8e1',
    lines: [
      [
        { speaker: 'whale', text: '你的脑袋能借书，不能当书架住下。身体踩浮书，拾光去借灯。' },
        { speaker: 'light', text: '风廊会推我，按住方向就能稳稳飞。你替我守着落脚点。', mood: 'brave' },
      ],
      [
        { speaker: 'whale', text: '一盏灯记住你了。另一盏还在风廊那边，别让身体等得太远。' },
        { speaker: 'ashi', text: '我把头盖留一道缝，读不完的这一页，路上慢慢读。', mood: 'tender' },
      ],
      [
        { speaker: 'whale', text: '两盏灯都亮了，借阅手续齐。拾光归位，带着身体走向出口。' },
        { speaker: 'ashi', text: '今天借一片海，归还一个肯出门的脑袋。', mood: 'joy' },
      ],
    ],
    repeat: [
      [{ speaker: 'whale', text: '书可以踩，借阅卡不用踩。让身体稳住，再开头顶的小窗。' }],
      [{ speaker: 'whale', text: '另一盏灯还在等。风往哪吹，拾光就往需要的方向修正。' }],
      [{ speaker: 'whale', text: '催还章改成路上慢读了。带好拾光和身体，从出口出发。' }],
    ],
  },
  {
    id: 'story-npc-4', chapterIndex: 4, sceneId: 'story-4',
    speaker: 'keeper', name: '归先生', motif: 'keeper', prop: 'coast-watch',
    x: 190, y: 560, accent: '#c6b5a1',
    lines: [
      [
        { speaker: 'keeper', text: '钟摆经过时，别让骨头硬闯。掀盖让拾光靠近，发脉冲暂停它。' },
        { speaker: 'light', text: '时间只借我们几秒。停住后快归位，让身体走过去。', mood: 'brave' },
      ],
      [
        { speaker: 'keeper', text: '一盏灯走到下一秒了。前面还有钟摆，把身体留在安全处。' },
        { speaker: 'ashi', text: '这次我不拧紧头盖了，给下一步留点响声。', mood: 'open' },
      ],
      [
        { speaker: 'keeper', text: '两盏灯都亮了。让拾光归位，带着身体走向出口，我慢慢跟上。' },
        { speaker: 'ashi', text: '怀表往前走一格，我的脑袋也给明天让个座。', mood: 'tender' },
      ],
    ],
    repeat: [
      [{ speaker: 'keeper', text: '脉冲只借几秒，不借整夜。掀盖停钟摆，归位让身体通过。' }],
      [{ speaker: 'keeper', text: '第一盏还亮着。把头里的勇气借出来，再去照亮另一盏。' }],
      [{ speaker: 'keeper', text: '两盏灯齐了。别只让念头过海，身体也要走到出口。' }],
    ],
  },
  {
    id: 'story-npc-5', chapterIndex: 5, sceneId: 'story-5',
    speaker: 'keeper', name: '归先生', motif: 'keeper', prop: 'post-letter',
    x: 190, y: 560, accent: '#e5c598',
    lines: [
      [
        { speaker: 'keeper', text: '邮局还等两盏灯。你们轮流站稳和飞远，我替这封信留着门。' },
        { speaker: 'ashi', text: '头里的乘客都到齐了。最后一程，还是两个人一起走。', mood: 'open' },
      ],
      [
        { speaker: 'keeper', text: '一盏先亮了，另一盏还没醒。前面的机关，你们已经一起走过。' },
        { speaker: 'light', text: '踏板交给身体，钟摆交给脉冲。头顶的窗，继续开着。', mood: 'brave' },
      ],
      [
        { speaker: 'keeper', text: '最后两盏灯都亮了。让拾光回到头顶，带着身体把信送进门。' },
        { speaker: 'ashi', text: '收件人是明天。邮差和脑袋里的光，今天一起到。', mood: 'joy' },
      ],
    ],
    repeat: [
      [{ speaker: 'keeper', text: '留门这件事，我会。你们掀盖、借光，把两盏灯请回来。' }],
      [{ speaker: 'keeper', text: '还差一盏。脑袋里的日出不催人，身体找稳下一处落脚点。' }],
      [{ speaker: 'keeper', text: '门留好了。拾光归位，阿拾往前；这回不用分开送信。' }],
    ],
  },
];

function freezeDeep(value) {
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object' && !Object.isFrozen(child)) freezeDeep(child);
  }
  return Object.freeze(value);
}

export const STORY_ENCOUNTERS = freezeDeep(encounters);

export function getStoryNPC(chapterIndex) {
  return Number.isInteger(chapterIndex) && chapterIndex >= 0 && chapterIndex < STORY_ENCOUNTERS.length
    ? STORY_ENCOUNTERS[chapterIndex] : null;
}

function plainRecord(value) {
  if (!value || typeof value !== 'object') return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    return !Array.isArray(value) && (prototype === Object.prototype || prototype === null);
  } catch { return false; }
}

function option(value, key) {
  if (!plainRecord(value)) return undefined;
  try {
    const item = Object.getOwnPropertyDescriptor(value, key);
    return item && Object.hasOwn(item, 'value') ? item.value : undefined;
  } catch { return undefined; }
}

function encounterState(chapterIndex, options) {
  const seals = option(options, 'seals');
  const stage = Number.isInteger(seals) && seals >= 0 && seals <= 2 ? seals : 0;
  const candidate = option(options, 'journey');
  return {
    stage, repeated: option(options, 'repeated') === true,
    journey: chapterIndex <= 1 && plainRecord(candidate) ? normalizeJourneyContext(candidate) : null,
  };
}

// Earlier chapters may greet a newly delivered object even if the same friend
// was already visited. Later chapters retain their established NPC-level repeat.
export function getStoryEncounterKey(chapterIndex, options = {}) {
  const npc = getStoryNPC(chapterIndex);
  if (!npc) return null;
  if (chapterIndex > 1) return npc.id;
  const {stage, journey} = encounterState(chapterIndex, options);
  const reaction = !journey ? 'default' : chapterIndex === 0
    ? 'ticket-' + journey.ticketPhase
    : [journey.hasTicket ? 'ticket-pot' : 'plain-pot', journey.seedPhase, journey.plantStage].join(':');
  return npc.id + ':lamps-' + stage + ':' + reaction;
}

const dialogue = (speaker, text, mood) => ({speaker, text, ...(mood ? {mood} : {})});
function stationJourneyLines(stage, repeated, journey) {
  if (journey.ticketPhase === 'held' || journey.ticketPhase === 'returning') {
    const returning = journey.ticketPhase === 'returning';
    if (repeated) return [dialogue('moth', returning
      ? '票正在回家的路上。等拾光抱它坐稳，再带身体向前走。'
      : '票还在拾光怀里。先归位，再去找路上的光。')];
    return [
      dialogue('moth', returning
        ? '拾光正抱着去程票回家。车厢已经留好座，等它轻轻坐稳。'
        : '去程票已经接住了，还在拾光怀里。先归位，陪它坐进头顶的小火车。'),
      dialogue('ashi', [
        '车票坐稳后，身体站上铜踏板，拾光再去找诗灯。',
        '车票坐稳后，我们带着身体去找前面的另一盏灯。',
        '车票坐稳后，我带着身体从亮起的门出发。',
      ][stage], 'tender'),
    ];
  }
  const full = journey.hasTicket ? [
    [
      dialogue('moth', '去程票收进小火车了。身体站上铜踏板，再让拾光穿过帘幕。'),
      dialogue('ashi', '下一站若有种子想搭车，我给它留个靠窗座。', 'open'),
    ],
    [
      dialogue('moth', '第一盏亮了，车票也收好了。另一盏在前方，身体别落在站台。'),
      dialogue('light', '小火车有了乘客。等你一起走，再给新来的念头让个座。', 'joy'),
    ],
    [
      dialogue('moth', '两盏灯齐了，去程票也在车上。拾光归位，让身体从出口出发。'),
      dialogue('ashi', '这张票先不丢。下一站，也许还有谁需要一个座位。', 'tender'),
    ],
  ] : [
    [
      dialogue('moth', '去程票还在站台上方。先掀盖去够一够，再让身体站上铜踏板。'),
      dialogue('ashi', '身体守住路，拾光去接头顶候车室的第一位乘客。', 'open'),
    ],
    [
      dialogue('moth', '第一盏亮了。去程票还等在上方，另一盏灯则等着身体往前走。'),
      dialogue('light', '头里的小火车留着空位。哪天想带上它，我们再来接。', 'joy'),
    ],
    [
      dialogue('moth', '两盏灯齐了，归位带身体去出口吧。去程票还留在站台，愿意时再找。'),
      dialogue('ashi', '小火车先留个空座。忘了带上的念头，不会被催着下车。', 'tender'),
    ],
  ];
  if (!repeated) return full[stage];
  const text = journey.hasTicket ? [
    '票坐稳了。身体站铜踏板，拾光掀盖过帘幕，别把车厢也抖出去。',
    '票在车上等你。另一盏还没亮，带身体继续向前吧。',
    '去程票不催人。两盏灯齐了，归位带身体从出口出发。',
  ] : [
    '上方那张票还没上车。掀盖去看看，铜踏板会等身体站稳。',
    '另一盏灯在前面。没带上的车票也留着，不必锁上头顶的小窗。',
    '两盏灯替你留路，身体能去出口。车票还在，随时可以回来找。',
  ];
  return [dialogue('moth', text[stage])];
}

function greenhouseJourneyLines(stage, repeated, journey) {
  const direction = [
    '让身体借蘑菇站稳，拾光去够诗灯。',
    '还差一盏光，身体站稳再掀盖。',
    '两盏灯齐了，归位带身体去出口。',
  ][stage];
  let first, response, short;
  if (journey.seedPhase === 'missing') {
    first = [
      '高处旧靴子里有粒种子。身体借蘑菇上高台，让拾光去接它。',
      '一盏灯亮了，旧靴子里的种子还在等。蘑菇会送身体上高台。',
      '两盏灯齐了，身体能去出口。旧靴子里的种子，愿意时再带上。',
    ][stage];
    response = journey.hasTicket
      ? '旧车票折成了小纸盆。空着的靠窗座，原来是给它留的。'
      : '头里的小盆还空着。先替它开扇窗，再去接那位小客人。';
    short = stage === 2 ? '种子还在旧靴子里。两盏灯齐了，归位让身体继续走也可以。'
      : '旧靴子里的种子还没搬家。身体借蘑菇站稳，拾光去看看。';
  } else if (journey.seedPhase === 'held' || journey.seedPhase === 'returning') {
    first = journey.seedPhase === 'held'
      ? '种子还在拾光手里。先归位，把它轻轻放进头顶的小盆。'
      : '拾光正抱它回家。盆已经摆稳，等种子轻轻落下就好。';
    response = '我把头顶的窗留着。先接住这位小客人，再陪它去借光。';
    short = journey.seedPhase === 'held' ? '拾光还抱着种子。先归位落盆，别急着替它数花瓣。'
      : '种子正在回家的路上。小盆等得住，你也不必催它。';
  } else if (journey.plantStage === 1) {
    first = '种子落盆了。小小的一程，也值得替它好好站稳。';
    response = '我守住它的窗。' + direction;
    short = '种子已经安家。' + direction;
  } else if (journey.plantStage === 2) {
    first = '叶子探出来了。它认得你借来的那束光，也认得回家的小盆。';
    response = '头盖再开一点，别碰着叶尖。' + direction;
    short = '这片叶子是你带回的春天。' + direction;
  } else {
    first = '那粒种子真的开花了。你替它站过稳，也替它开过窗。';
    response = '这回，头里有一朵自己带回的花。' + direction;
    short = '花会记得你给的光。' + direction;
  }
  return repeated ? [dialogue('keeper', short)] : [dialogue('keeper', first), dialogue('ashi', response, journey.plantStage === 3 ? 'joy' : 'tender')];
}

export function getStoryEncounter(chapterIndex, options = {}) {
  const npc = getStoryNPC(chapterIndex);
  if (!npc) return null;
  const {stage, repeated, journey} = encounterState(chapterIndex, options);
  // Keep existing references and text for callers without journey evidence.
  if (!journey) return (repeated ? npc.repeat : npc.lines)[stage];
  return freezeDeep(chapterIndex === 0 ? stationJourneyLines(stage, repeated, journey)
    : greenhouseJourneyLines(stage, repeated, journey));
}

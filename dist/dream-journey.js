// Read-only links between the first two chapters. Exact cap-book evidence owns
// discoveries; chapter totals cannot invent a ticket, seed or readable fragment.
import { CHAPTERS } from './dream-story.js';
import { normalizeLetterChoice } from './dream-letter-echo.js';

function record(value) {
  if (!value || typeof value !== 'object') return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    return !Array.isArray(value) && (prototype === Object.prototype || prototype === null);
  } catch { return false; }
}

// Do not call inherited getters, accessors or coercion hooks in imported data.
function own(value, key) {
  if (!record(value)) return undefined;
  try {
    const property = Object.getOwnPropertyDescriptor(value, key);
    return property && Object.hasOwn(property, 'value') ? property.value : undefined;
  } catch { return undefined; }
}

function indexes(value, count) {
  try {
    if (!Array.isArray(value)) return [];
    const result = new Set();
    // Saved arrays have at most three entries. Bound malformed imported input
    // without trusting a custom iterator or invoking an element getter.
    const size = Math.min(Object.getOwnPropertyDescriptor(value, 'length')?.value || 0, 64);
    for (let index = 0; index < size; index++) {
      const entry = Object.getOwnPropertyDescriptor(value, String(index));
      const item = entry && Object.hasOwn(entry, 'value') ? entry.value : undefined;
      if (Number.isInteger(item) && item >= 0 && item < count) result.add(item);
    }
    return [...result].sort((a, b) => a - b);
  } catch { return []; }
}

function freeze(value) {
  for (const item of Object.values(value)) if (item && typeof item === 'object') freeze(item);
  return Object.freeze(value);
}
const line = (speaker, text, mood) => ({speaker, text, ...(mood ? {mood} : {})});
const copyLines = lines => freeze(lines.map(item => ({...item})));
const validChapter = value => Number.isInteger(value) && value >= 0 && value < CHAPTERS.length;

export function getJourneyFacts(input = {}) {
  const station = own(input, 'stationRecord'), greenhouse = own(input, 'greenhouseRecord');
  return freeze({
    hasTicket: indexes(own(station, 'memories'), 3).includes(0),
    hasSeed: indexes(own(greenhouse, 'memories'), 3).includes(1),
    greenhouseSeals: indexes(own(greenhouse, 'seals'), 2),
  });
}

export function getGreenhouseStage(input = {}) {
  if (own(input, 'seedPlanted') !== true) return 0;
  return 1 + indexes(own(input, 'seals'), 2).length;
}

export function getDiscoveredLetter(chapterIndex, input = {}) {
  if (!validChapter(chapterIndex)) return freeze({fragments: [], missing: [], legacyOnly: false});
  const found = indexes(own(own(input, 'record'), 'memories'), 3);
  const legacyCount = own(input, 'legacyCount');
  return freeze({
    fragments: found.map(index => ({index, text: CHAPTERS[chapterIndex].memories[index]})),
    missing: [0, 1, 2].filter(index => !found.includes(index)),
    legacyOnly: found.length === 0 && Number.isInteger(legacyCount) && legacyCount >= 1 && legacyCount <= 3,
  });
}

// The same fact normalizer is shared by optional conversations and cap bubbles.
// A carried ticket is not yet on the train; a carried seed is not planted.
export function normalizeJourneyContext(input = {}) {
  const requestedTicket = own(input, 'ticketPhase');
  const ticketPhase = ['missing', 'held', 'returning', 'stowed'].includes(requestedTicket) ? requestedTicket
    : requestedTicket === undefined && own(input, 'hasTicket') === true ? 'stowed' : 'missing';
  const requested = own(input, 'seedPhase');
  const knownPhase = ['missing', 'held', 'returning', 'planted'].includes(requested);
  const seedPhase = knownPhase ? requested : requested === undefined && own(input, 'hasSeed') === true ? 'planted' : 'missing';
  const requestedStage = own(input, 'plantStage');
  const plantStage = seedPhase !== 'planted' ? 0
    : Number.isInteger(requestedStage) && requestedStage >= 1 && requestedStage <= 3 ? requestedStage
      : getGreenhouseStage({seedPlanted: true, seals: own(input, 'greenhouseSeals')});
  const letterChoice = normalizeLetterChoice(own(input, 'letterChoice'));
  return freeze({
    hasTicket: ticketPhase === 'stowed', ticketPhase,
    hasSeed: seedPhase !== 'missing', seedPhase, plantStage,
    ...(letterChoice ? {letterChoice} : {}),
  });
}

export function resolveChapterStory(chapterIndex, kind, facts = {}) {
  if (!validChapter(chapterIndex) || !['intro', 'outro'].includes(kind)) return null;
  const original = CHAPTERS[chapterIndex][kind];
  if (chapterIndex > 1) return copyLines(original);
  const state = normalizeJourneyContext(facts), lines = original.map(item => ({...item}));
  if (chapterIndex === 0) {
    if (state.ticketPhase === 'held' || state.ticketPhase === 'returning') {
      const returning = state.ticketPhase === 'returning';
      if (kind === 'intro') {
        lines[1] = line('ashi', returning
          ? '拾光正抱着去程票回家。我把头盖留着，等这位乘客坐稳。'
          : '拾光接住去程票了。我的头顶先留一道窗，等它抱着票回来。', 'open');
        lines[2] = line('light', returning
          ? '小火车已经留好座。再等一小会儿，我就把这位乘客送回头顶。'
          : '我抱着票，你替我留着窗。先回到头顶的小火车，再去找前面的灯。', 'brave');
      } else lines[2] = line('light', returning
        ? '去程票正随我回到头顶。等它在小火车里坐稳，我们再一起出发。'
        : '去程票还在我怀里。先陪它回到头顶的小火车，下一站再慢慢出发。', 'joy');
      return copyLines(lines);
    }
    if (kind === 'intro' && state.hasTicket) {
      lines[1] = line('ashi', '去程票还在头里的小火车上。今晚再出发，记得给新来的念头留个座位。', 'open');
    }
    if (kind === 'outro') {
      lines[2] = state.hasTicket
        ? line('light', '去程票坐进小火车了。下一站若有种子想搭车，我们给它留个靠窗座。', 'joy')
        : line('light', '小火车已经听见发车铃。还没带回的念头会留在站台，愿意时再来接它。', 'joy');
    }
    return copyLines(lines);
  }
  if (kind === 'intro') {
    if (state.plantStage === 3) lines[0] = line('ashi', '头里的小花还在窗边。这里的雨往回走，它却记得我们借来的两盏灯。', 'tender');
    else if (state.plantStage === 2) lines[0] = line('ashi', '头里的种子已经长出叶子。这里的雨往回走，叶尖还朝着打开的窗。', 'open');
    else if (state.plantStage === 1) lines[0] = line('ashi', '种子已经在头里的小盆坐好。雨想往回走，它倒想先看看明天。', 'curious');
    else if (state.seedPhase === 'held' || state.seedPhase === 'returning') lines[0] = line('ashi', '拾光接住了种子。我的头顶留着一只小盆，先陪它稳稳地回去。', 'tender');
    else lines[0] = state.hasTicket
      ? line('ashi', '旧车票折成了小纸盆。原来去过的地方，还能给下一站留个座位。', 'curious')
      : line('ashi', '这里连雨都往回走。头里的小盆倒是空着，像在等一粒种子。', 'curious');
    lines[2] = state.seedPhase === 'missing'
      ? line('light', '高处旧靴子里有位小客人。身体借蘑菇站稳，我去看看它愿不愿意同行。', 'brave')
      : state.plantStage === 3
        ? line('light', '这朵花已经认得回家的窗。你站稳，我们也替温室继续借一点光。', 'brave')
        : line('light', '你替它守住小盆，我去借灯光。归位时轻轻扣盖，给下一片叶子留点地方。', 'brave');
  } else {
    lines[2] = state.plantStage === 3
      ? line('light', '种子在头里开花了。它认得你借来的两盏灯，也认得每次为它打开的窗。', 'joy')
      : state.plantStage === 2
        ? line('light', '头里的小芽已经长出叶子。另一盏光不必催，它会陪着我们慢慢往前。', 'joy')
        : state.plantStage === 1
          ? line('light', '种子已经在头里安家。开花可以慢一点，头顶的窗会给它一直留着。', 'joy')
          : state.seedPhase === 'held' || state.seedPhase === 'returning'
            ? line('light', '种子还在回家的路上。先陪它落进小盆，花开的事，可以等一等。', 'joy')
            : line('light', '温室亮了，头里的小盆还空着。旧靴子里的种子，等愿意时再来接。', 'joy');
  }
  return copyLines(lines);
}

// Returns null when the normal scene feedback should own the event. Growth
// announcements are emitted by the simulation; this helper adds no save event.
export function getJourneyCapLines(chapterIndex, event, facts = {}) {
  if (chapterIndex !== 1) return null;
  const type = typeof event === 'string' ? event : own(event, 'type');
  const index = own(event, 'index'), state = normalizeJourneyContext(facts);
  if (!['open', 'reopen', 'return', 'memory', 'seal'].includes(type)) return null;
  if (type === 'memory' && index !== 1) return null;
  if (type === 'seal' && index !== 0 && index !== 1) return null;
  if (type === 'memory' && !state.hasSeed) return null;
  if (state.seedPhase === 'held') return copyLines([line('light', '种子接住了！按 E，陪我把它送进头顶的小盆。', 'joy')]);
  if (state.seedPhase === 'returning') return copyLines([line('ashi', '小盆已经摆稳，等拾光把种子轻轻放下。', 'tender')]);
  if (state.plantStage === 3) return copyLines([line('light', '这朵小花，记得你替它借来的两盏光。', 'joy')]);
  if (state.plantStage === 2) return copyLines([line('ashi', '叶子探出头了，盖子得给它留点地方。', 'joy')]);
  if (state.plantStage === 1) return copyLines([line('light', '种子在小盆里坐好了，再去借一盏灯光。', 'brave')]);
  return copyLines([line('light', state.hasTicket
    ? '旧车票折成小纸盆，等旧靴子里的种子上车。'
    : '头里的小盆还空着，旧靴子里有粒种子。', 'peek')]);
}

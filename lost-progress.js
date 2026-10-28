import { LOST_CASES, getLostCaseVariant, evaluateLostClaim } from './dream-lost-cases.js';

export const LOST_SAVE_KEY = 'tougaigu.lostcases.v1';
const known = new Map(LOST_CASES.map(item => [item.id, item]));
const MAX_TIMESTAMP = 8640000000000000;
const MAX_REVISION = Number.MAX_SAFE_INTEGER;
const MAX_STORED_LENGTH = 16384;
const MAX_LIST_INPUT = 64;
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
const plain = value => Boolean(value && typeof value === 'object' && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null));
const own = (value, key) => value && Object.hasOwn(value, key) ? value[key] : undefined;
const timestamp = value => Number.isSafeInteger(value) && value >= 0 && value <= MAX_TIMESTAMP;
const variantIndex = (value, item) => Number.isInteger(value) && value >= 0 && value < item.variants.length;
const identifier = value => typeof value === 'string' && value.length <= 96
  && /^[a-zA-Z0-9_-]+$/.test(value) && !forbidden.has(value) ? value : '';
const emptyRecord = () => ({ activeVariant: 0, activeAt: 0, seenClues: { 0: [], 1: [] }, solvedVariants: [] });
const indexes = (values, limit) => {
  if (!Array.isArray(values)) return [];
  const found = new Set();
  for (let index = 0; index < Math.min(values.length, MAX_LIST_INPUT); index++) {
    const value = own(values, index);
    if (Number.isInteger(value) && value >= 0 && value < limit) found.add(value);
    if (found.size === limit) break;
  }
  return [...found].sort((a, b) => a - b);
};
const storageOrDefault = storage => {
  try { return storage === undefined ? globalThis.localStorage : storage; } catch { return null; }
};
const compare = (a, b) => a === b ? 0 : a > b ? 1 : -1;
const revisionOrder = (a, b) => compare(a.revision, b.revision) || compare(a.revisionId, b.revisionId);
const nextTime = (previous, now) => previous < MAX_TIMESTAMP ? Math.max(timestamp(now) ? now : 0, previous + 1) : null;
const hasProgress = record => record.activeAt > 0 || record.activeVariant > 0
  || record.solvedVariants.length > 0 || Object.values(record.seenClues).some(values => values.length > 0);

export function createLostSave() {
  return { version: 1, revision: 0, revisionId: 'base', cases: {} };
}

/** Sanitizes a bounded copy; viewing or solving one evidence set never fills the other. */
export function validateLostSave(input) {
  const save = createLostSave();
  if (!plain(input) || own(input, 'version') !== 1 || !plain(own(input, 'cases'))) return save;
  const revision = own(input, 'revision'), revisionId = identifier(own(input, 'revisionId'));
  // The revision pair is atomic: malformed counters cannot acquire a stronger ID at revision zero.
  if (Number.isSafeInteger(revision) && revision > 0 && revision <= MAX_REVISION && revisionId) {
    save.revision = revision;
    save.revisionId = revisionId;
  }
  for (const [id, item] of known) {
    const value = own(input.cases, id);
    if (!plain(value)) continue;
    const record = emptyRecord(), active = own(value, 'activeVariant'), activeAt = own(value, 'activeAt');
    if (variantIndex(active, item) && timestamp(activeAt)) {
      record.activeVariant = active;
      record.activeAt = activeAt;
    }
    const seen = own(value, 'seenClues');
    if (plain(seen)) for (const variant of item.variants) record.seenClues[variant.index] = indexes(own(seen, variant.index), variant.clues.length);
    record.solvedVariants = indexes(own(value, 'solvedVariants'), item.variants.length);
    if (hasProgress(record)) save.cases[id] = record;
  }
  return save;
}

export function lostRevision(save) {
  const clean = validateLostSave(save);
  return clean.revision + ':' + clean.revisionId;
}

const importId = revision => {
  try {
    const generated = globalThis.crypto?.randomUUID?.();
    if (identifier(generated)) return generated;
  } catch { /* A private-mode crypto failure does not block a normal import. */ }
  return 'import-' + revision.toString(36) + '-' + Math.random().toString(36).slice(2, 14);
};

/** A replacement is a new generation, including when an intentionally empty backup is imported. */
export function replaceLostSave(input, current, stored, { now = Date.now(), id } = {}) {
  const next = validateLostSave(input), a = validateLostSave(current), b = validateLostSave(stored);
  const previous = Math.max(next.revision, a.revision, b.revision);
  // Refuse an unrepresentable successor instead of wrapping to an older generation.
  if (previous >= MAX_REVISION) throw new RangeError('失物存档的版本号超出可继续更新的范围。');
  next.revision = Math.max(timestamp(now) ? now : 0, previous + 1);
  next.revisionId = identifier(id) || importId(next.revision);
  return next;
}

export function loadLostSave(storage) {
  try {
    const raw = storageOrDefault(storage)?.getItem(LOST_SAVE_KEY);
    return typeof raw === 'string' && raw.length > 0 && raw.length <= MAX_STORED_LENGTH
      ? validateLostSave(JSON.parse(raw)) : createLostSave();
  } catch { return createLostSave(); }
}

export function persistLostSave(save, storage) {
  try {
    const target = storageOrDefault(storage);
    if (!target || typeof target.setItem !== 'function') return false;
    const serialized = JSON.stringify(validateLostSave(save));
    if (serialized.length > MAX_STORED_LENGTH) return false;
    target.setItem(LOST_SAVE_KEY, serialized);
    return true;
  } catch { return false; }
}

export function getLostRecord(save, caseId) {
  return known.has(caseId) ? validateLostSave(save).cases[caseId] || emptyRecord() : null;
}

export function getLostStats(save) {
  const records = Object.values(validateLostSave(save).cases);
  return {
    cases: records.filter(record => record.solvedVariants.length > 0).length,
    variants: records.reduce((total, record) => total + record.solvedVariants.length, 0),
    clues: records.reduce((total, record) => total + Object.values(record.seenClues).reduce((sum, values) => sum + values.length, 0), 0),
  };
}

/** Same-generation facts union; a newer replacement wins wholesale, without resurrecting old facts. */
export function mergeLostSaves(a, b) {
  const left = validateLostSave(a), right = validateLostSave(b), order = revisionOrder(left, right);
  if (order !== 0) return order > 0 ? left : right;
  const merged = createLostSave();
  merged.revision = left.revision;
  merged.revisionId = left.revisionId;
  for (const [id, item] of known) {
    const x = left.cases[id] || emptyRecord(), y = right.cases[id] || emptyRecord();
    // Numeric variant breaks an equal-time tie deterministically in every merge order.
    const latest = compare(x.activeAt, y.activeAt) || compare(x.activeVariant, y.activeVariant);
    const preference = latest >= 0 ? x : y;
    const record = { ...emptyRecord(), activeVariant: preference.activeVariant, activeAt: preference.activeAt };
    for (const variant of item.variants) record.seenClues[variant.index] = indexes([...x.seenClues[variant.index], ...y.seenClues[variant.index]], variant.clues.length);
    record.solvedVariants = indexes([...x.solvedVariants, ...y.solvedVariants], item.variants.length);
    if (hasProgress(record)) merged.cases[id] = record;
  }
  return merged;
}

const denied = reason => ({ ok: false, changed: false, firstSolve: false, reason });
const validContext = (item, event) => {
  const chapter = own(event, 'chapterIndex'), festival = own(event, 'festivalId'), mode = own(event, 'mode');
  if (!Number.isInteger(chapter) || chapter < 0 || chapter > 5 || own(event, 'sceneId') !== item.sceneId) return false;
  const story = /^story-([0-5])$/.exec(item.sceneId);
  return story ? mode === 'story' && festival === null && chapter === Number(story[1])
    : mode === 'festival' && festival === item.sceneId;
};

/** Mutates only the supplied save, never storage. Only actual clue events register viewed evidence. */
export function recordLostEvent(save, event, { now = Date.now() } = {}) {
  if (!plain(save) || !plain(event)) return denied('invalid-event');
  const type = own(event, 'type'), item = known.get(own(event, 'caseId'));
  if (!['open', 'clue', 'wrong', 'solve'].includes(type) || !item || !validContext(item, event)) return denied('invalid-context');
  const index = own(event, 'variant');
  if (!variantIndex(index, item)) return denied('invalid-variant');
  const variant = getLostCaseVariant(item.id, index), clueIndex = own(event, 'clueIndex');
  if ((type === 'clue' || clueIndex !== undefined) && (!Number.isInteger(clueIndex) || clueIndex < 0 || clueIndex >= variant.clues.length)) return denied('invalid-clue');
  const clean = validateLostSave(save);
  if (own(event, 'revision') !== lostRevision(clean)) return denied('stale-revision');
  const record = clean.cases[item.id] || emptyRecord();
  const before = JSON.stringify(record);
  if (type === 'wrong' || type === 'solve') {
    const judgement = evaluateLostClaim(item.id, index, own(event, 'claimantId'));
    if (!judgement.valid || judgement.correct !== (type === 'solve')) return denied('invalid-claim');
    if (record.seenClues[index].length !== variant.clues.length) return denied('unseen-clues');
  }
  if (type === 'open') {
    const activeAt = nextTime(record.activeAt, now);
    if (activeAt === null) return denied('clock-exhausted');
    record.activeVariant = index;
    record.activeAt = activeAt;
  }
  if (type === 'clue') record.seenClues[index] = indexes([...record.seenClues[index], clueIndex], variant.clues.length);
  const firstSolve = type === 'solve' && !record.solvedVariants.includes(index);
  if (firstSolve) record.solvedVariants = indexes([...record.solvedVariants, index], item.variants.length);
  const changed = before !== JSON.stringify(record);
  if (changed) {
    clean.cases[item.id] = record;
    Object.assign(save, clean);
  }
  return { ok: true, changed, firstSolve, record: getLostRecord(changed ? clean : save, item.id) };
}

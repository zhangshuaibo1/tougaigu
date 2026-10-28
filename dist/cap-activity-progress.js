import { CAP_ACTIVITIES } from './dream-cap-activities.js';

export const CAP_ACTIVITY_SAVE_KEY = 'tougaigu.capactivities.v1';
export const CAP_ACTIVITY_VARIANTS = ['第一次借景', '换一条路', '再绕一圈'];
const known = new Map(CAP_ACTIVITIES.map(activity => [activity.sceneId, activity]));
const indexes = values => Array.isArray(values) ? [...new Set(values.filter(value => Number.isInteger(value) && value >= 0 && value <= 2))].sort() : [];
const CLOSED_ATTEMPT_LIMIT = 16;
const MAX_TIMESTAMP = 8640000000000000;
const emptyRecord = () => ({ completedSteps: [], completedVariants: [], best: {}, pending: null, pendingAt: 0, closedAttempts: [] });
const storageOrDefault = storage => { try { return storage === undefined ? globalThis.localStorage : storage; } catch { return null; } };
const validTimestamp = value => Number.isSafeInteger(value) && value >= 0 && value <= MAX_TIMESTAMP;
const timestamp = value => validTimestamp(value) ? value : 0;
const identifier = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,96}$/.test(value) ? value : '';
const closedAttempts = values => {
  const entries = new Map();
  if (Array.isArray(values)) for (const value of values) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || !identifier(value.attemptId) || !validTimestamp(value.closedAt)) continue;
    const previous = entries.get(value.attemptId);
    if (!previous || value.closedAt > previous.closedAt) entries.set(value.attemptId, { attemptId: value.attemptId, closedAt: value.closedAt });
  }
  return [...entries.values()].sort((a, b) => b.closedAt - a.closedAt || a.attemptId.localeCompare(b.attemptId)).slice(0, CLOSED_ATTEMPT_LIMIT);
};
const revisionOrder = (a, b) => a.revision - b.revision || a.revisionId.localeCompare(b.revisionId);
const nextTime = previous => Math.min(MAX_TIMESTAMP, Math.max(Date.now(), previous + 1));
const score = value => value && Number.isInteger(value.switches) && value.switches >= 0 && value.switches <= 99999 && Number.isFinite(value.seconds) && value.seconds >= 0 && value.seconds <= 86400 ? { switches: value.switches, seconds: Math.round(value.seconds * 1000) / 1000 } : null;
const better = (a, b) => !a ? b : !b ? a : b.switches < a.switches || b.switches === a.switches && b.seconds < a.seconds ? b : a;

export function createCapActivitySave() { return { version: 1, revision: 0, revisionId: 'base', scenes: {} }; }
export function capActivityRevision(save) { return timestamp(save?.revision) + ':' + (identifier(save?.revisionId) || 'base'); }

export function validateCapActivitySave(input) {
  const save = createCapActivitySave();
  if (!input || typeof input !== 'object' || Array.isArray(input) || input.version !== 1 || !input.scenes || typeof input.scenes !== 'object' || Array.isArray(input.scenes)) return save;
  save.revision = timestamp(input.revision);
  save.revisionId = identifier(input.revisionId) || 'base';
  for (const id of known.keys()) {
    if (!Object.hasOwn(input.scenes, id)) continue;
    const value = input.scenes[id];
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const record = { ...emptyRecord(), completedSteps: indexes(value.completedSteps), completedVariants: indexes(value.completedVariants), pendingAt: timestamp(value.pendingAt), closedAttempts: closedAttempts(value.closedAttempts) };
    for (const variant of [0, 1, 2]) {
      const candidate = value.best && Object.hasOwn(value.best, String(variant)) ? score(value.best[variant]) : null;
      if (candidate) { record.best[variant] = candidate; record.completedVariants = indexes([...record.completedVariants, variant]); }
    }
    if (record.completedVariants.includes(0)) record.completedSteps = [0, 1, 2];
    const pending = value.pending;
    if (pending && Number.isInteger(pending.variant) && pending.variant >= 0 && pending.variant < 3 && identifier(pending.attemptId) && !record.closedAttempts.some(entry => entry.attemptId === pending.attemptId)) record.pending = { variant: pending.variant, completedSteps: indexes(pending.completedSteps), attemptId: pending.attemptId };
    if (record.completedSteps.length || record.completedVariants.length || record.pending || record.pendingAt || record.closedAttempts.length) save.scenes[id] = record;
  }
  return save;
}

export function replaceCapActivitySave(input, current, stored, { now = Date.now(), id } = {}) {
  const next = validateCapActivitySave(input), a = validateCapActivitySave(current), b = validateCapActivitySave(stored);
  next.revision = Math.max(timestamp(now), a.revision + 1, b.revision + 1, next.revision + 1);
  next.revisionId = identifier(id) || globalThis.crypto?.randomUUID?.() || 'import-' + next.revision.toString(36);
  return next;
}

export function loadCapActivitySave(storage) {
  try {
    const raw = storageOrDefault(storage)?.getItem(CAP_ACTIVITY_SAVE_KEY);
    return raw && raw.length <= 65536 ? validateCapActivitySave(JSON.parse(raw)) : createCapActivitySave();
  } catch { return createCapActivitySave(); }
}

export function persistCapActivitySave(save, storage) {
  try {
    const target = storageOrDefault(storage);
    if (!target) return false;
    target.setItem(CAP_ACTIVITY_SAVE_KEY, JSON.stringify(validateCapActivitySave(save)));
    return true;
  } catch { return false; }
}

export function getCapActivityRecord(save, id) { return known.has(id) ? validateCapActivitySave(save).scenes[id] || emptyRecord() : null; }

export function getCapActivityStats(save) {
  const records = Object.values(validateCapActivitySave(save).scenes);
  return { completed: records.filter(record => record.completedVariants.includes(0)).length, variants: records.reduce((total, record) => total + record.completedVariants.length, 0), steps: records.reduce((total, record) => total + record.completedSteps.length, 0) };
}

export function mergeCapActivitySaves(a, b) {
  const result = validateCapActivitySave(a), other = validateCapActivitySave(b);
  const revision = revisionOrder(result, other);
  if (revision !== 0) return revision > 0 ? result : other;
  for (const [id, record] of Object.entries(other.scenes)) {
    const current = result.scenes[id] || emptyRecord();
    const closed = closedAttempts([...current.closedAttempts, ...record.closedAttempts]);
    const isClosed = pending => pending && closed.some(entry => entry.attemptId === pending.attemptId);
    // A late writer can give a finished attempt a newer timestamp. Exclude that
    // attempt before choosing the current route, without erasing a fresh replay.
    const candidates = [current, record].filter(value => !isClosed(value.pending));
    const latest = candidates.sort((a, b) => b.pendingAt - a.pendingAt || (b.pending?.attemptId || '~').localeCompare(a.pending?.attemptId || '~'))[0];
    const combined = { completedSteps: indexes([...current.completedSteps, ...record.completedSteps]), completedVariants: indexes([...current.completedVariants, ...record.completedVariants]), best: {}, pending: latest?.pending || null, pendingAt: latest?.pendingAt ?? Math.max(current.pendingAt, record.pendingAt), closedAttempts: closed };
    if (!isClosed(current.pending) && !isClosed(record.pending) && current.pending && record.pending && current.pending.attemptId === record.pending.attemptId && current.pending.variant === record.pending.variant) combined.pending = { ...latest.pending, completedSteps: indexes([...current.pending.completedSteps, ...record.pending.completedSteps]) };
    for (const variant of [0, 1, 2]) { const value = better(current.best[variant], record.best[variant]); if (value) combined.best[variant] = { ...value }; }
    result.scenes[id] = combined;
  }
  return validateCapActivitySave(result);
}

export function recordCapActivityEvent(save, event) {
  if (!save || typeof save !== 'object' || !event || !['start', 'step', 'wrong', 'complete'].includes(event.type)) return { ok: false };
  const activity = known.get(event.sceneId);
  if (!activity || !Number.isInteger(event.variant) || event.variant < 0 || event.variant > 2) return { ok: false };
  if (activity.festivalId ? event.festivalId !== activity.festivalId : event.festivalId != null || event.chapterIndex !== activity.chapterIndex) return { ok: false };
  if (event.type === 'step' && (!Number.isInteger(event.stepIndex) || event.stepIndex < 0 || event.stepIndex > 2)) return { ok: false };
  if (event.type === 'complete' && indexes(event.completedSteps).length !== 3) return { ok: false };
  if (event.attemptId !== undefined && !identifier(event.attemptId)) return { ok: false };
  const clean = validateCapActivitySave(save), record = clean.scenes[activity.sceneId] || emptyRecord(), before = JSON.stringify(record);
  const suppliedAttemptId = identifier(event.attemptId);
  if (suppliedAttemptId && record.closedAttempts.some(entry => entry.attemptId === suppliedAttemptId)) return { ok: false, changed: false, firstCompletion: false, reason: 'closed-attempt', activity, record: getCapActivityRecord(save, activity.sceneId) };
  if (suppliedAttemptId && record.pending?.attemptId === suppliedAttemptId && record.pending.variant !== event.variant) return { ok: false };
  const firstCompletion = event.type === 'complete' && !record.completedVariants.includes(event.variant);
  if (event.type === 'start' || event.type === 'step') {
    const attemptId = suppliedAttemptId || 'legacy-' + event.variant;
    const previousSteps = record.pending?.attemptId === attemptId && record.pending.variant === event.variant ? record.pending.completedSteps : [];
    const pending = { variant: event.variant, completedSteps: indexes([...previousSteps, ...indexes(event.completedSteps), ...(event.type === 'step' ? [event.stepIndex] : [])]), attemptId };
    if (JSON.stringify(pending) !== JSON.stringify(record.pending)) { record.pending = pending; record.pendingAt = nextTime(record.pendingAt); }
  }
  if (event.type === 'step' && event.variant === 0) record.completedSteps = indexes([...record.completedSteps, event.stepIndex]);
  if (event.type === 'complete') {
    record.completedVariants = indexes([...record.completedVariants, event.variant]);
    if (event.variant === 0) record.completedSteps = [0, 1, 2];
    const candidate = event.resumed === true ? null : score({ switches: event.switches, seconds: event.activeSeconds });
    if (candidate) record.best[event.variant] = better(record.best[event.variant], candidate);
    const closedAt = nextTime(Math.max(record.pendingAt, record.closedAttempts[0]?.closedAt || 0));
    // Legacy events had no attempt identity; keep their previous score behavior.
    if (suppliedAttemptId) record.closedAttempts = closedAttempts([...record.closedAttempts, { attemptId: suppliedAttemptId, closedAt }]);
    if (record.pending && (!event.attemptId || record.pending.attemptId === event.attemptId)) { record.pending = null; record.pendingAt = closedAt; }
  }
  const changed = before !== JSON.stringify(record);
  if (changed) { clean.scenes[activity.sceneId] = record; Object.assign(save, validateCapActivitySave(clean)); }
  return { ok: true, changed, firstCompletion, activity, record: getCapActivityRecord(save, activity.sceneId) };
}

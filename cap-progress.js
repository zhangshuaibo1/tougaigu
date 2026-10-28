import { CAP_SCENES, getCapScene } from './dream-cap-story.js';

export const CAP_SAVE_KEY = 'tougaigu.capbook.v1';
const known = new Set(CAP_SCENES.map(scene => scene.id));
const integer = (value, max) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(0, Math.floor(value))) : 0;
const indexes = (values, count) => Array.isArray(values) ? [...new Set(values.filter(value => Number.isInteger(value) && value >= 0 && value < count))].sort() : [];
const emptyRecord = () => ({ opens: 0, memories: [], seals: [] });
const storageOrDefault = storage => { try { return storage === undefined ? globalThis.localStorage : storage; } catch { return null; } };

export function createCapSave() { return { version: 1, scenes: {} }; }

export function validateCapSave(input) {
  const save = createCapSave();
  if (!input || typeof input !== 'object' || Array.isArray(input) || !input.scenes || typeof input.scenes !== 'object') return save;
  for (const id of known) {
    if (!Object.hasOwn(input.scenes, id)) continue;
    const value = input.scenes[id];
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const record = { opens: integer(value.opens, 99999), memories: indexes(value.memories, 3), seals: indexes(value.seals, 2) };
    if (record.opens || record.memories.length || record.seals.length) save.scenes[id] = record;
  }
  return save;
}

export function loadCapSave(storage) {
  try {
    const raw = storageOrDefault(storage)?.getItem(CAP_SAVE_KEY);
    return raw && raw.length <= 65536 ? validateCapSave(JSON.parse(raw)) : createCapSave();
  } catch { return createCapSave(); }
}

export function persistCapSave(save, storage) {
  try {
    const target = storageOrDefault(storage);
    if (!target) return false;
    target.setItem(CAP_SAVE_KEY, JSON.stringify(validateCapSave(save)));
    return true;
  } catch { return false; }
}

export function mergeCapSaves(a, b) {
  const result = validateCapSave(a), other = validateCapSave(b);
  for (const [id, record] of Object.entries(other.scenes)) {
    const current = result.scenes[id] || emptyRecord();
    result.scenes[id] = { opens: Math.max(current.opens, record.opens), memories: indexes([...current.memories, ...record.memories], 3), seals: indexes([...current.seals, ...record.seals], 2) };
  }
  return result;
}

export function getCapRecord(save, id) { return known.has(id) ? validateCapSave(save).scenes[id] || emptyRecord() : null; }

export function getCapStats(save) {
  const records = Object.values(validateCapSave(save).scenes);
  return { opened: records.filter(record => record.opens > 0).length, opens: records.reduce((sum, record) => sum + record.opens, 0), memories: records.reduce((sum, record) => sum + record.memories.length, 0), seals: records.reduce((sum, record) => sum + record.seals.length, 0), complete: records.filter(record => record.memories.length === 3 && record.seals.length === 2).length };
}

export function recordCapEvent(save, event) {
  if (!save || typeof save !== 'object' || !event || !['open', 'return', 'memory', 'seal'].includes(event.type)) return { ok: false };
  if (event.festivalId != null && !CAP_SCENES.some(scene => scene.festivalId === event.festivalId)) return { ok: false };
  if (event.festivalId == null && (!Number.isInteger(event.chapterIndex) || event.chapterIndex < 0 || event.chapterIndex > 5)) return { ok: false };
  const scene = getCapScene({ chapterIndex: event.chapterIndex, festivalId: event.festivalId });
  if (!scene || !known.has(scene.id)) return { ok: false };
  if ((event.type === 'memory' && (!Number.isInteger(event.index) || event.index < 0 || event.index > 2)) || (event.type === 'seal' && (!Number.isInteger(event.index) || event.index < 0 || event.index > 1))) return { ok: false };
  const clean = validateCapSave(save);
  const record = clean.scenes[scene.id] || emptyRecord();
  const firstOpen = event.type === 'open' && record.opens === 0;
  let changed = false;
  if (event.type === 'open') { const before = record.opens; record.opens = Math.min(99999, record.opens + 1); changed = record.opens !== before; }
  if (event.type === 'memory' && !record.memories.includes(event.index)) { record.memories.push(event.index); record.memories.sort(); changed = true; }
  if (event.type === 'seal' && !record.seals.includes(event.index)) { record.seals.push(event.index); record.seals.sort(); changed = true; }
  if (changed) { clean.scenes[scene.id] = record; save.version = 1; save.scenes = clean.scenes; }
  return { ok: true, changed, firstOpen, scene, record };
}

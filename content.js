// TOUGAIGU: original game content and browser-local progression.
// Storage is deliberately local. These scores are not a global leaderboard.
export const SAVE_KEY = 'tougaigu.save.v1';
const WALLET_LIMIT = 100_000_000;
const IMPORT_LIMIT = 256_000;
const MODES = new Set(['standard', 'endless', 'daily']);

export const CHARACTERS = [
  { id: 'bone', name: '小骨', title: '白骨游侠', description: '头很硬，心很软。生命更高，白骨飞弹更有力。', color: '#f4d9ad', unlockCost: 0, health: 110, attack: 20, speed: 185, talent: '结实骨架', shortDescription: '均衡 · 高生命' },
  { id: 'witch', name: '骨巫', title: '幽火术士', description: '把孤独绕成星环。开局自带一颗护身骷髅。', color: '#b9a2f5', unlockCost: 180, health: 85, attack: 17, speed: 180, talent: '初始灵魂环绕', shortDescription: '法术 · 环绕流' },
  { id: 'rogue', name: '夜骨', title: '午夜疾行者', description: '风吹过墓园，骨头已经溜了。跑得更快，暴击更强。', color: '#a7dac3', unlockCost: 320, health: 90, attack: 17, speed: 215, talent: '迅捷冲刺与暴击', shortDescription: '敏捷 · 暴击流' },
];

export const UPGRADES = [
  { id: 'damage', name: '硬骨头', description: '白骨飞弹伤害提高 20%。再硬一点，就能打穿黑夜。', type: 'power', max: 5, icon: 'bone', color: '#efaa70' },
  { id: 'haste', name: '手速超度', description: '攻击速度提高 15%。让怪物少等一会儿。', type: 'power', max: 5, icon: 'bolt', color: '#efaa70' },
  { id: 'speed', name: '脚底抹油', description: '移动速度提高 8%。留得青骨在，不怕墓园宽。', type: 'survival', max: 5, icon: 'wind', color: '#a7dac3' },
  { id: 'vitality', name: '加一根肋骨', description: '最大生命提高 22，并立即恢复 22 点生命。', type: 'survival', max: 5, icon: 'heart', color: '#a7dac3' },
  { id: 'regen', name: '骨头也会长', description: '每秒恢复 0.18 点生命。慢慢来，还能再活一会。', type: 'survival', max: 5, icon: 'sprout', color: '#a7dac3' },
  { id: 'magnet', name: '招魂磁铁', description: '拾取范围增加 30。灵魂会自己找上门。', type: 'survival', max: 5, icon: 'magnet', color: '#a7dac3' },
  { id: 'multishot', name: '一骨三连', description: '每次攻击多发射一枚白骨飞弹。多一根，多一份安心。', type: 'weapon', max: 3, icon: 'arrows', color: '#b9a2f5' },
  { id: 'pierce', name: '穿骨而过', description: '飞弹可以额外穿透一个敌人。前排也挡不住。', type: 'weapon', max: 3, icon: 'arrow', color: '#b9a2f5' },
  { id: 'crit', name: '会心一骨', description: '暴击率增加 8 个百分点。偶尔，狠狠地幸运一下。', type: 'power', max: 5, icon: 'spark', color: '#efaa70' },
  { id: 'orbit', name: '灵魂环绕', description: '增加一颗环绕你的护身骷髅，触碰敌人时造成伤害。', type: 'weapon', max: 4, icon: 'orbit', color: '#b9a2f5' },
  { id: 'lightning', name: '天打雷劈', description: '定期释放连锁闪电。升级提高伤害，并电到更多敌人。', type: 'weapon', max: 4, icon: 'lightning', color: '#b9a2f5' },
  { id: 'blast', name: '原地散架', description: '击败敌人时有概率引发爆炸。升级扩大威力与范围。', type: 'weapon', max: 4, icon: 'burst', color: '#b9a2f5' },
  { id: 'freeze', name: '冷到骨子里', description: '白骨飞弹使敌人减速。升级提高减速效果与持续时间。', type: 'weapon', max: 4, icon: 'snow', color: '#b9a2f5' },
  { id: 'vampirism', name: '借点阳寿', description: '每击败一个敌人，恢复 0.15 点生命。以战养骨。', type: 'survival', max: 5, icon: 'drop', color: '#a7dac3' },
  { id: 'shield', name: '祖传锅盖', description: '获得能抵挡一次伤害的护盾。升级缩短护盾恢复时间。', type: 'survival', max: 4, icon: 'shield', color: '#a7dac3' },
  { id: 'luck', name: '祖坟冒青烟', description: '获得的经验提高 8%，恢复道具更容易出现。', type: 'power', max: 5, icon: 'clover', color: '#efaa70' },
  { id: 'range', name: '长骨远虑', description: '飞弹射程提高 12%。把麻烦解决在远处。', type: 'power', max: 5, icon: 'target', color: '#efaa70' },
  { id: 'size', name: '大骨熬汤', description: '飞弹体积增加 15%。这么大一根，总能打中。', type: 'power', max: 5, icon: 'expand', color: '#efaa70' },
];

export const SYNERGIES = [
  { id: 'soul-ring', name: '灵魂星环', description: '更多星火绕着你转。', requirements: { orbit: 4, speed: 3 }, color: '#b9a2f5' },
  { id: 'thunder', name: '雷霆共鸣', description: '让墓园听见你的心跳。', requirements: { lightning: 4, haste: 3 }, color: '#a7dac3' },
  { id: 'bone-storm', name: '白骨风暴', description: '把白骨飞弹变成一场风暴。', requirements: { damage: 5, multishot: 3 }, color: '#efaa70' },
];

export const META_UPGRADES = [
  { id: 'damage', name: '骨质强化', description: '每级提高 4% 初始伤害。', baseCost: 40, max: 5, color: '#efaa70', icon: 'bone' },
  { id: 'vitality', name: '厚实骨架', description: '每级增加 8 点初始生命。', baseCost: 40, max: 5, color: '#a7dac3', icon: 'heart' },
  { id: 'haste', name: '灵巧关节', description: '每级提高 3% 初始攻击速度。', baseCost: 50, max: 5, color: '#efaa70', icon: 'bolt' },
  { id: 'magnet', name: '招魂体质', description: '每级增加 10 点初始拾取范围。', baseCost: 35, max: 5, color: '#b9a2f5', icon: 'magnet' },
  { id: 'luck', name: '祖先保佑', description: '每级提高 2% 经验获取。', baseCost: 60, max: 5, color: '#a7dac3', icon: 'clover' },
];

export const ACHIEVEMENTS = [
  { id: 'first_run', name: '第一次散架', description: '完成第一场至少 15 秒的冒险。', reward: 30, icon: 'flag' },
  { id: 'kill100', name: '墓园清洁工', description: '累计击败 100 个敌人。', reward: 35, icon: 'spark' },
  { id: 'kill1000', name: '今晚不太平', description: '累计击败 1,000 个敌人。', reward: 100, icon: 'moon' },
  { id: 'boss1', name: '大块头也散架', description: '击败你的第一个首领。', reward: 60, icon: 'crown' },
  { id: 'level10', name: '骨骼惊奇', description: '在一场冒险中达到 10 级。', reward: 50, icon: 'bolt' },
  { id: 'survive180', name: '夜还很长', description: '在墓园坚持至少 3 分钟。', reward: 50, icon: 'clock' },
  { id: 'win', name: '等到天亮', description: '完成一次墓园突围或每日挑战。', reward: 120, icon: 'sun' },
  { id: 'allheroes', name: '一家人，骨骨齐齐', description: '解锁全部 3 位角色。', reward: 80, icon: 'group' },
];

export const ENEMIES = [
  { id: 'ghost', name: '游荡幽灵', title: '普通怪物', description: '慢悠悠地靠近你。数量一多，再温柔的幽灵也会挤得慌。', tip: '绕开包围，给自己留一条路。', color: '#a7dac3' },
  { id: 'bat', name: '午夜蝙蝠', title: '快速怪物', description: '翅膀很忙，方向很准。会迅速缩短与你的距离。', tip: '保持移动，必要时冲刺拉开距离。', color: '#b9a2f5' },
  { id: 'slime', name: '墓地软糖', title: '厚血怪物', description: '看起来很好捏，打起来不太容易。', tip: '持续输出，别为它停下脚步。', color: '#bad373' },
  { id: 'mage', name: '残魂法师', title: '远程怪物', description: '它不急着过来，它的法术会来。', tip: '观察弹道，横向移动更容易躲开。', color: '#edab73' },
  { id: 'charger', name: '暴脾气', title: '冲锋怪物', description: '先盯住，再一头撞过来。脾气来得快，刹车来得慢。', tip: '看准冲锋方向，向侧面躲。', color: '#e67e86' },
  { id: 'boss', name: '墓园守夜人', title: '首领', description: '每到关键时刻，它就来查岗。生命多，招式也多。', tip: '先躲危险区域，再寻找输出空隙。', color: '#e6b65c' },
];

const charIds = new Set(CHARACTERS.map((item) => item.id));
const achievementIds = new Set(ACHIEVEMENTS.map((item) => item.id));
const metaById = new Map(META_UPGRADES.map((item) => [item.id, item]));
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const number = (value, fallback = 0, maximum = WALLET_LIMIT, minimum = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(minimum, Math.min(maximum, value)) : fallback;
const integer = (value, fallback = 0, maximum = WALLET_LIMIT, minimum = 0) => Math.floor(number(value, fallback, maximum, minimum));
const objectField = (object, key) => isRecord(object) && own(object, key) && isRecord(object[key]) ? object[key] : {};
const arrayField = (object, key) => isRecord(object) && own(object, key) && Array.isArray(object[key]) ? object[key] : [];

export function createDefaultSave() {
  return {
    version: 1,
    bones: 0,
    selectedCharacter: 'bone',
    unlockedCharacters: ['bone'],
    meta: { damage: 0, vitality: 0, haste: 0, magnet: 0, luck: 0 },
    stats: { runs: 0, kills: 0, bosses: 0, bestScore: 0, bestTime: 0, wins: 0, maxLevel: 1 },
    achievements: [],
    history: [],
    dailyBests: {},
    settings: { sound: true, reducedMotion: false },
  };
}

function validDailyKey(key) {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const date = new Date(`${key}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === key;
}

function sanitizeHistory(item) {
  if (!isRecord(item) || !MODES.has(item.mode) || !charIds.has(item.characterId)) return null;
  const timestamp = typeof item.at === 'string' ? new Date(item.at) : null;
  if (!timestamp || !Number.isFinite(timestamp.getTime())) return null;
  return {
    id: typeof item.id === 'string' ? item.id.slice(0, 128) : '',
    at: timestamp.toISOString(), mode: item.mode, characterId: item.characterId,
    time: number(item.time, 0, 86_400), kills: integer(item.kills, 0, 1_000_000),
    level: integer(item.level, 1, 500, 1), score: integer(item.score, 0, 1_000_000_000),
    bosses: integer(item.bosses, 0, 10_000), won: item.won === true,
    seed: integer(item.seed, 0, 0xffffffff), earned: integer(item.earned, 0, 100_000),
  };
}

/** Return a fresh, whitelisted v1 save. Invalid containers/versions throw. */
export function validateSave(raw) {
  if (!isRecord(raw) || !own(raw, 'version') || raw.version !== 1) {
    throw new Error('这不是可读取的头盖骨存档，或存档版本暂不支持。');
  }
  const save = createDefaultSave();
  save.bones = integer(own(raw, 'bones') ? raw.bones : 0);
  save.unlockedCharacters = ['bone', ...new Set(arrayField(raw, 'unlockedCharacters').filter((id) => charIds.has(id) && id !== 'bone'))];
  save.selectedCharacter = save.unlockedCharacters.includes(raw.selectedCharacter) ? raw.selectedCharacter : 'bone';
  const meta = objectField(raw, 'meta');
  for (const item of META_UPGRADES) save.meta[item.id] = integer(own(meta, item.id) ? meta[item.id] : 0, 0, item.max);
  const stats = objectField(raw, 'stats');
  const ceilings = { runs: 10_000_000, kills: 1_000_000_000, bosses: 10_000_000, bestScore: 1_000_000_000, bestTime: 86_400, wins: 10_000_000, maxLevel: 500 };
  for (const key of Object.keys(save.stats)) {
    save.stats[key] = integer(own(stats, key) ? stats[key] : save.stats[key], save.stats[key], ceilings[key], key === 'maxLevel' ? 1 : 0);
  }
  save.stats.wins = Math.min(save.stats.wins, save.stats.runs);
  save.achievements = [...new Set(arrayField(raw, 'achievements').filter((id) => achievementIds.has(id)))];
  save.history = arrayField(raw, 'history').slice(0, 20).map(sanitizeHistory).filter(Boolean);
  const daily = objectField(raw, 'dailyBests');
  for (const key of Object.keys(daily).filter(validDailyKey).sort().slice(-30)) {
    const item = daily[key];
    if (!isRecord(item)) continue;
    save.dailyBests[key] = {
      score: integer(item.score, 0, 1_000_000_000), time: number(item.time, 0, 86_400),
      kills: integer(item.kills, 0, 1_000_000), level: integer(item.level, 1, 500, 1),
      seed: integer(item.seed, 0, 0xffffffff),
    };
  }
  const settings = objectField(raw, 'settings');
  save.settings.sound = typeof settings.sound === 'boolean' ? settings.sound : true;
  save.settings.reducedMotion = typeof settings.reducedMotion === 'boolean' ? settings.reducedMotion : false;
  return save;
}

function browserStorage() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

export function loadSave(storage) {
  try {
    const source = storage === undefined ? browserStorage() : storage;
    const text = source?.getItem(SAVE_KEY);
    if (!text || text.length > IMPORT_LIMIT) return createDefaultSave();
    return validateSave(JSON.parse(text));
  } catch {
    return createDefaultSave();
  }
}

export function persistSave(save, storage) {
  try {
    const target = storage === undefined ? browserStorage() : storage;
    if (!target || typeof target.setItem !== 'function') return false;
    target.setItem(SAVE_KEY, JSON.stringify(validateSave(save)));
    return true;
  } catch {
    return false;
  }
}

export function metaCost(id, level) {
  const item = metaById.get(id);
  if (!item) return Infinity;
  const current = integer(level, 0, item.max);
  if (current >= item.max) return Infinity;
  return Math.ceil(item.baseCost * (1.65 ** current) / 5) * 5;
}

export function buyMeta(save, id) {
  const item = metaById.get(id);
  if (!item || !save || !isRecord(save.meta)) return { ok: false, reason: '找不到这项强化。' };
  const level = integer(save.meta[id], 0, item.max);
  if (level >= item.max) return { ok: false, reason: '这项强化已经满级。' };
  const cost = metaCost(id, level);
  if (!Number.isFinite(save.bones) || save.bones < cost) return { ok: false, reason: `还需要 ${Math.max(0, cost - integer(save.bones))} 骨片。` };
  save.bones = integer(save.bones) - cost;
  save.meta[id] = level + 1;
  return { ok: true, cost, level: level + 1 };
}

function achievementReached(save, id) {
  const s = save.stats;
  switch (id) {
    case 'first_run': return s.runs >= 1;
    case 'kill100': return s.kills >= 100;
    case 'kill1000': return s.kills >= 1000;
    case 'boss1': return s.bosses >= 1;
    case 'level10': return s.maxLevel >= 10;
    case 'survive180': return s.bestTime >= 180;
    case 'win': return s.wins >= 1;
    case 'allheroes': return CHARACTERS.every((hero) => save.unlockedCharacters.includes(hero.id));
    default: return false;
  }
}

function awardAchievements(save) {
  const unlocked = ACHIEVEMENTS.filter((item) => !save.achievements.includes(item.id) && achievementReached(save, item.id));
  const earned = unlocked.reduce((total, item) => total + item.reward, 0);
  save.achievements.push(...unlocked.map((item) => item.id));
  save.bones = Math.min(WALLET_LIMIT, save.bones + earned);
  return { earned, unlockedAchievements: unlocked.map((item) => item.id) };
}

export function unlockCharacter(save, id) {
  const hero = CHARACTERS.find((item) => item.id === id);
  if (!hero || !save || !Array.isArray(save.unlockedCharacters)) return { ok: false, reason: '还没有发现这位伙伴。' };
  if (save.unlockedCharacters.includes(id)) return { ok: false, reason: '这位伙伴已经加入队伍。' };
  if (!Number.isFinite(save.bones) || save.bones < hero.unlockCost) return { ok: false, reason: `还需要 ${Math.max(0, hero.unlockCost - integer(save.bones))} 骨片。` };
  save.bones = integer(save.bones) - hero.unlockCost;
  save.unlockedCharacters.push(id);
  return { ok: true, cost: hero.unlockCost, ...awardAchievements(save) };
}

export function getDailyKey(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  if (!Number.isFinite(value.getTime())) throw new Error('每日挑战日期无效。');
  return value.toISOString().slice(0, 10);
}

export function getDailySeed(date = new Date()) {
  const text = `tougaigu:daily:v1:${getDailyKey(date)}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  return hash >>> 0;
}

export function recordRun(save, result) {
  if (!isRecord(result) || !MODES.has(result.mode) || !charIds.has(result.characterId)) {
    return { earned: 0, unlockedAchievements: [], qualified: false, reason: '本局数据无效。' };
  }
  const suppliedId = typeof result.runId === 'string' ? result.runId.slice(0, 128) : typeof result.id === 'string' ? result.id.slice(0, 128) : '';
  if (suppliedId && save.history.some((run) => run.id === suppliedId)) {
    return { earned: 0, unlockedAchievements: [], qualified: false, reason: '本局已经结算。' };
  }
  const time = number(result.time, 0, 86_400);
  const kills = integer(result.kills, 0, 1_000_000);
  const bosses = integer(result.bosses, 0, 10_000);
  const level = integer(result.level, 1, 500, 1);
  const score = integer(result.score, 0, 1_000_000_000);
  const seed = integer(result.seed, 0, 0xffffffff);
  const won = result.won === true && result.mode !== 'endless' && time >= 300 && bosses >= 1;
  const qualified = time >= 15;
  const now = new Date();
  let earned = 0;
  let unlockedAchievements = [];
  if (qualified) {
    const reward = Math.min(10_000, Math.floor(time / 4) + Math.floor(kills / 6) + bosses * 30 + (won ? 100 : 0));
    const previousWallet = save.bones;
    save.bones = Math.min(WALLET_LIMIT, save.bones + reward);
    earned = save.bones - previousWallet;
    save.stats.runs = Math.min(10_000_000, save.stats.runs + 1);
    save.stats.kills = Math.min(1_000_000_000, save.stats.kills + kills);
    save.stats.bosses = Math.min(10_000_000, save.stats.bosses + bosses);
    save.stats.bestScore = Math.max(save.stats.bestScore, score);
    save.stats.bestTime = Math.max(save.stats.bestTime, time);
    save.stats.maxLevel = Math.max(save.stats.maxLevel, level);
    if (won) save.stats.wins = Math.min(10_000_000, save.stats.wins + 1);
    const beforeAchievementWallet = save.bones;
    const awarded = awardAchievements(save);
    earned += save.bones - beforeAchievementWallet;
    unlockedAchievements = awarded.unlockedAchievements;
    if (result.mode === 'daily') {
      const day = validDailyKey(result.dailyKey) ? result.dailyKey : getDailyKey(now);
      const previous = save.dailyBests[day];
      if (!previous || score > previous.score || (score === previous.score && time > previous.time)) {
        save.dailyBests[day] = { score, time, kills, level, seed };
      }
      const keep = new Set(Object.keys(save.dailyBests).filter(validDailyKey).sort().slice(-30));
      for (const key of Object.keys(save.dailyBests)) if (!keep.has(key)) delete save.dailyBests[key];
    }
  }
  save.history.unshift({
    id: suppliedId, at: now.toISOString(), mode: result.mode, characterId: result.characterId,
    time, kills, level, score, bosses, won, seed, earned,
  });
  save.history.length = Math.min(save.history.length, 20);
  return { earned, unlockedAchievements, qualified, reason: qualified ? undefined : '坚持满 15 秒即可获得本局成长奖励。' };
}

export function exportSave(save) {
  return JSON.stringify(validateSave(save), null, 2);
}

export function importSave(text) {
  if (typeof text !== 'string' || text.length > IMPORT_LIMIT) throw new Error('存档文件过大或格式不正确。');
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new Error('无法读取这个文件，请选择之前导出的 JSON 存档。'); }
  return validateSave(parsed);
}

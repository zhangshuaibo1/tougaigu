// Read-only route guidance for the authored moving stage. Interactions keep
// priority: call after the original near-hint resolver and pass its result.
const finite = Number.isFinite;
const rect = value => value && finite(value.x) && finite(value.y) && finite(value.w) && finite(value.h) && value.w > 2 && value.h > 0;
const overlaps = (body, surface) => body.x + body.w / 2 > surface.x + 1 && body.x - body.w / 2 < surface.x + surface.w - 1;
const standing = (body, surface) => overlaps(body, surface) && Math.abs(body.y - surface.y) < 3;
const docked = (stage, bank) => Math.abs(stage.y - bank.y) <= .01
  && Math.min(stage.x + stage.w, bank.x + bank.w) - Math.max(stage.x, bank.x) > 1;

export const THEATRE_GUIDANCE_STAGES = Object.freeze(['wait', 'board', 'ride', 'alight']);

/**
 * context: {mode, chapterIndex, form, body, level, movers, nearHint?}
 * Returns null, or {stage, text, moverId}. No timers, remembered phase, input
 * writes or progress. A pause leaves the same physical snapshot and same hint.
 */
export function getTheatreGuidance(context = {}) {
  const { mode, chapterIndex, form, body, level, movers, nearHint } = context;
  if (mode !== 'story' || chapterIndex !== 2 || form !== 'body'
      || !body || body.grounded !== true || !finite(body.x) || !finite(body.y) || !finite(body.w) || body.w <= 0
      || !level || !Array.isArray(level.platforms) || !Array.isArray(movers)
      || (typeof nearHint === 'string' && nearHint.trim())) return null;
  const stage = movers.find(item => rect(item) && item.kind === 'stage' && typeof item.id === 'string');
  if (!stage) return null;
  const authored = Array.isArray(level.movers) ? level.movers.find(item => item.id === stage.id && rect(item)) : null;
  if (!authored) return null;
  const middle = (finite(stage.baseX) ? stage.baseX : authored.x) + stage.w / 2;
  const banks = level.platforms.filter(surface => rect(surface) && Math.abs(surface.y - stage.y) < 12);
  const left = banks.filter(surface => surface.x + surface.w / 2 < middle).sort((a, b) => b.x + b.w - a.x - a.w)[0];
  const right = banks.filter(surface => surface.x + surface.w / 2 > middle).sort((a, b) => a.x - b.x)[0];
  if (!left || !right || left.x + left.w >= right.x) return null;
  const result = (phase, text) => Object.freeze({ stage: phase, text, moverId: stage.id });

  // The attachment ID alone is insufficient: it may be stale during a jump.
  if (body.platform === stage.id && standing(body, stage)) {
    const atFarBank = docked(stage, right) && body.x + body.w / 2 + 55 >= right.x
      && body.x - body.w / 2 < right.x + right.w - 1;
    return atFarBank
      ? result('alight', '右侧踏台到了 · 向右走下舞台。')
      : result('ride', '站稳就好，舞台会载你去下一幕。');
  }
  if (standing(body, right)) return null;
  if (standing(body, left)) {
    // A close leading edge and real forward deck are required; proximity to a
    // stage that is already behind the player must not invite a blind step.
    const canBoard = docked(stage, left) && stage.x <= body.x + body.w / 2 + 45
      && stage.x + stage.w > body.x + body.w / 2 + 8;
    return canBoard
      ? result('board', '舞台靠近了 · 向右走上去，或轻轻一跳。')
      : result('wait', '在踏台上等一等，舞台会回来接你。');
  }
  const approach = body.x >= left.x - 120 && body.x < left.x + left.w
    && level.platforms.some(surface => rect(surface) && surface.y > left.y + 12 && standing(body, surface));
  return approach ? result('wait', '先跳上踏台，再等舞台来接你。') : null;
}

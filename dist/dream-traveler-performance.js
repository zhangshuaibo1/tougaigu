// Main-story body acting. Existing simulation samples and visualTime are the
// only inputs; this module never moves an actor, owns a clock, or grants progress.
import { solveCapArm, transformCapPoint } from './dream-cap-art.js';

export const TRAVELER_LANDING_DURATION = .2;
const finite = Number.isFinite;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const number = (value, fallback = 0) => finite(value) ? value : fallback;
const ease = value => value * value * (3 - 2 * value);
const rect = p => p && [p.x, p.y, p.w, p.h].every(finite) && p.w > 2 && p.h > 0;
const list = value => Array.isArray(value) ? value : [];
const standing = (b, p) => rect(b) && rect(p) && b.grounded === true
  && Math.abs(b.y - p.y) < .05 && b.x + b.w / 2 > p.x + 1 && b.x - b.w / 2 < p.x + p.w - 1;
// Festival levels also use chapterIndex=0. The explicit mode and integer
// range are part of this contract, not a truthy/coerced chapter shortcut.
export const isTravelerPerformanceScene = context => context?.mode === 'story'
  && Number.isInteger(context.chapterIndex) && context.chapterIndex >= 0 && context.chapterIndex <= 5;
const inScope = context => isTravelerPerformanceScene(context) && rect(context.body);
const riding = (body, p) => p && ['stage', 'book'].includes(p.kind)
  && ['x', 'y'].includes(p.axis) && typeof p.id === 'string' && p.id.length > 0
  && p.id === body.platform && standing(body, p);

export function createTravelerPerformance() {
  return { landingAt: null, landingStrength: 0, landingRunId: null, landingDeaths: null, landingBody: null, stepSeconds: 1 / 60 };
}

export function settleTravelerPerformance(state) {
  if (state) { state.landingAt = null; state.landingStrength = 0; state.landingRunId = null; state.landingDeaths = null; state.landingBody = null; }
}

// `before` is a copied pre-update physical sample. The caller supplies the same
// bounded dt that the existing update consumes, including fixed-step catch-up.
export function advanceTravelerPerformance(state, before, context = {}, dt = 0) {
  if (!state || !before || !inScope(context) || context.state !== 'playing' || !finite(dt) || dt <= 0) return;
  state.stepSeconds = Math.min(.04, dt);
  // Recovery replaces the body even when a feather prevents the death count
  // from increasing. Identity catches that real reset without guessing from y.
  if (before.body !== context.body || before.runId !== context.runId || before.deaths !== context.deaths || context.reducedMotion) {
    settleTravelerPerformance(state); return;
  }
  const now = number(context.time);
  if (state.landingAt !== null && now - state.landingAt >= TRAVELER_LANDING_DURATION) settleTravelerPerformance(state);
  // Walking onto a same-height deck, respawn, a grounded idle frame and a body
  // falling while its soul is out are not new landing performances.
  if (before.form !== 'body' || context.form !== 'body' || before.grounded !== false
      || context.body.grounded !== true || !finite(before.vy) || before.vy <= 0) return;
  const surfaces = [...list(context.level?.platforms), ...list(context.movers), ...list(context.closedBarriers)];
  if (!surfaces.some(surface => standing(context.body, surface))) return;
  state.landingAt = now;
  state.landingStrength = clamp(before.vy / 600, .3, 1);
  state.landingRunId = context.runId;
  state.landingDeaths = context.deaths;
  state.landingBody = context.body;
}

/** A frozen view consumed by both the renderer and read-only observations. */
export function getTravelerPerformanceView(state, context = {}) {
  if (!inScope(context)) return null;
  const b = context.body, reducedMotion = Boolean(context.reducedMotion);
  const grounded = b.grounded === true, airborne = !grounded;
  const attached = list(context.movers).find(p => riding(b, p));
  const sameVisit = state?.landingBody === b && state?.landingRunId === context.runId && state?.landingDeaths === context.deaths;
  const elapsed = sameVisit && finite(state?.landingAt) ? Math.max(0, number(context.time) - state.landingAt) : null;
  const landingAge = !reducedMotion && grounded && elapsed !== null && elapsed < TRAVELER_LANDING_DURATION ? elapsed : null;
  const rise = reducedMotion || grounded ? 0 : clamp(-number(b.vy) / 600, 0, 1);
  const fall = reducedMotion || grounded ? 0 : clamp(number(b.vy) / 650, 0, 1);
  const landing = landingAge === null ? 0 : ease(1 - landingAge / TRAVELER_LANDING_DURATION) * number(state.landingStrength);
  const ride = reducedMotion || !attached ? 0 : 1 - ease(clamp(Math.abs(number(b.vx)) / 120, 0, 1));
  // dx belongs to the real moving surface; vx belongs to walking. Never turn
  // platform transport into a false walking cycle or an independent sway clock.
  const step = Math.max(.0001, number(state?.stepSeconds, 1 / 60));
  const platformVelocity = attached ? number(number(attached.dx) / step) : 0;
  const platformVerticalVelocity = attached ? number(number(attached.dy) / step) : 0;
  const platformAxis = attached?.axis || null;
  const balance = reducedMotion || platformAxis !== 'x' ? 0 : clamp(platformVelocity / 180, -1, 1) * (b.face === -1 ? -1 : 1) * ride;
  // A rising book has negative dy even though its grounded rider has vy=0.
  // Read that real displacement separately: vertical travel never becomes
  // a sideways sway, a walking cycle, or an extra body/foot translation.
  const verticalBalance = reducedMotion || platformAxis !== 'y' || ride === 0 ? 0 : clamp(platformVerticalVelocity / 90, -1, 1) * ride;
  const verticalRide = platformAxis === 'y' ? ride : 0;
  const air = reducedMotion ? 0 : Number(airborne);
  const spread = air * (5 + fall * 9 - rise) + landing * 5;
  const lift = air * (5 + rise * 10 + fall * 4) - landing * 3;
  const freeArms = Object.freeze({
    left: Object.freeze({ x: -16 - spread - ride * (6 + balance * 2), y: -16 - lift - ride * (6 - balance * 2) + verticalBalance * 3 }),
    right: Object.freeze({ x: 17 + spread + ride * (7 - balance * 2), y: -16 - lift - ride * (2 + balance * 2) - verticalRide * 4 + verticalBalance * 3 }),
  });
  const phase = airborne ? (number(b.vy) < 0 ? 'rise' : 'fall') : landingAge !== null ? 'land' : attached ? 'ride' : 'idle';
  return Object.freeze({ phase, reducedMotion, rise, fall, landing, ride, landingAge,
    landingDuration: TRAVELER_LANDING_DURATION, platformId: attached?.id || null,
    platformAxis, platformKind: attached?.kind || null,
    platformVelocity, platformVerticalVelocity, balance, verticalBalance, freeArms });
}

/** Retain the exact original rig. Only unoccupied portions of each arm act. */
export function applyTravelerPerformance(presentation, view) {
  if (!view) return presentation;
  const p = presentation, arms = {};
  for (const side of ['left', 'right']) {
    const original = p.arms[side], restX = side === 'left' ? -16 : 17;
    const busy = side === 'left' ? p.grip : p.clasp;
    const free = (1 - clamp(number(busy), 0, 1)) ** 2 * (1 - clamp(number(p.catching), 0, 1));
    const offset = view.freeArms[side];
    const arm = solveCapArm(original.shoulder, {
      x: original.requested.x + (offset.x - restX) * free,
      y: original.requested.y + (offset.y + 16) * free,
    }, side === 'left' ? -1 : 1);
    arm.world = transformCapPoint(p.rig.bodyMatrix, arm.wrist);
    arms[side] = arm;
  }
  return { ...p, performance: view, arms };
}

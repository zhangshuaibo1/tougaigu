import test from 'node:test';
import assert from 'node:assert/strict';
import { getDreamLevel } from '../dist/dream-levels.js';
import { getGroundShadowView, drawGroundShadow, GROUND_SHADOW_MAX_DISTANCE } from '../dist/dream-ground-shadow.js';

const surface = (x, y, w = 100, h = 18, extra = {}) => ({ x, y, w, h, ...extra });
const body = (x, y, extra = {}) => ({ x, y, w: 30, h: 58, grounded: true, platform: null, ...extra });
const view = (b, platforms = [], movers = [], closedBarriers = []) => getGroundShadowView({ body: b, level: { platforms }, movers, closedBarriers });
const freeze = value => { if (value && typeof value === 'object') { for (const v of Object.values(value)) freeze(v); Object.freeze(value); } return value; };

test('nearest catchable top surface owns the shadow, including authored one-way platforms', () => {
  const result = view(body(150, 300, { grounded: false }), [surface(0, 560, 1000, 100, { solid: true }), surface(100, 465), surface(100, 385)]);
  assert.equal(result.surface.y, 385); assert.equal(result.surface.source, 'platform'); assert.equal(result.distance, 85);
  assert.equal(result.x, 150); assert.equal(result.y, 387);
  assert.deepEqual(result.clip, { x: 100, y: 385, w: 100, h: result.radiusY * 2 + 2 });
  assert.equal(result.surface.kind, null);
});

test('the real theatre gap has no floor shadow unless a runtime stage actually passes underneath', () => {
  const level = getDreamLevel(2), b = body(990, 430, { grounded: false });
  assert.equal(getGroundShadowView({ body: b, level, movers: [] }), null, 'never use authored level.movers as if it were current');
  const crossing = { ...level.movers[0], x: 900, y: 465 };
  const hit = getGroundShadowView({ body: b, level, movers: [crossing] });
  assert.equal(hit.surface.id, 'stage'); assert.equal(hit.surface.x, 900); assert.equal(hit.surface.source, 'mover');
  assert.equal(getGroundShadowView({ body: b, level, movers: [{ ...crossing, x: 1185 }] }), null, 'a stage already away cannot cast a floating shadow');
});

test('platform edge eligibility uses the same body width and strict one-pixel inset as landing', () => {
  const p = surface(100, 465, 100), left = body(86, 450, { grounded: false }), right = body(214, 450, { grounded: false });
  assert.equal(view(left, [p]), null); assert.equal(view(right, [p]), null);
  const leftTouch = view({ ...left, x: 86.01 }, [p]), rightTouch = view({ ...right, x: 213.99 }, [p]);
  assert.ok(leftTouch); assert.ok(rightTouch);
  assert.equal(leftTouch.x, 86.01, 'do not move the shadow center onto the platform and fake contact');
  assert.deepEqual(leftTouch.clip, { x: p.x, y: p.y, w: p.w, h: leftTouch.radiusY * 2 + 2 });
  assert.equal(view(body(70, 450), [p]), null, 'a broad visual ellipse alone cannot create a support');
});

test('a grounded attachment wins only an equal-height overlap, never a nearer top above it', () => {
  const fixed = surface(565, 465, 220), moving = surface(700, 465, 185, 20, { id: 'stage', kind: 'stage' });
  assert.equal(view(body(730, 465, { platform: 'stage' }), [fixed], [moving]).surface.source, 'mover');
  assert.equal(view(body(730, 465), [fixed], [moving]).surface.source, 'platform');
  assert.equal(view(body(730, 450, { grounded: false, platform: 'stage' }), [fixed], [moving]).surface.source, 'platform', 'stale airborne attachment gives no priority');
  assert.equal(view(body(730, 400, { platform: 'stage' }), [surface(700, 430, 100)], [moving]).surface.y, 430);
});

test('surfaces above the feet are ignored on ascent and descent; lower surfaces remain possible', () => {
  const shelf = surface(100, 465, 100), floor = surface(0, 560, 1000, 100);
  assert.equal(view(body(150, 467, { grounded: false, vy: -200 }), [shelf, floor]).surface.y, 560);
  assert.equal(view(body(150, 467, { grounded: false, vy: 200 }), [shelf, floor]).surface.y, 560);
  assert.equal(view(body(150, 561), [shelf, floor]), null);
  assert.equal(view(body(150, 465), [shelf, floor]).distance, 0);
});

test('height continuously fades and contracts a shadow without changing its true surface position', () => {
  const p = surface(0, 560, 1000, 100), sequence = [0, 45, 90, 180, 300].map(distance => view(body(150, p.y - distance, { grounded: distance === 0 }), [p]));
  for (let i = 1; i < sequence.length; i++) {
    assert.ok(sequence[i].opacity < sequence[i - 1].opacity);
    assert.ok(sequence[i].radiusX < sequence[i - 1].radiusX); assert.ok(sequence[i].radiusY < sequence[i - 1].radiusY);
    assert.equal(sequence[i].y, 562);
  }
  assert.equal(view(body(150, p.y - GROUND_SHADOW_MAX_DISTANCE), [p]), null);
  const thin = view(body(150, 465), [surface(100, 465, 100, 2)]);
  assert.equal(thin.clip.h, 2); assert.equal(thin.y, 466);
});

test('only the supplied closed-barrier evidence can contribute a landing top', () => {
  const b = body(120, 300), gate = surface(100, 390, 38, 170, { id: 'gate', latchedBy: 0 });
  const floor = surface(0, 560, 1000, 100);
  const context = { body: b, level: { platforms: [floor], barriers: [gate] }, movers: [] };
  assert.equal(getGroundShadowView(context).surface.source, 'platform', 'do not guess a barrier is closed from its authored presence');
  assert.equal(getGroundShadowView({ ...context, closedBarriers: [gate] }).surface.id, 'gate');
  assert.equal(getGroundShadowView({ ...context, closedBarriers: [] }).surface.id, null);
});

test('view derivation is pause-stable, detached from its input, and rejects bad geometry', () => {
  const input = freeze({ body: body(150, 430), level: { platforms: [surface(100, 465)] }, movers: [], closedBarriers: [] }), before = JSON.stringify(input);
  const first = getGroundShadowView(input); assert.ok(Object.isFrozen(first)); assert.ok(Object.isFrozen(first.clip)); assert.ok(Object.isFrozen(first.surface));
  for (let i = 0; i < 50; i++) assert.deepEqual(getGroundShadowView({ ...input, time: i, state: 'paused' }), first);
  assert.equal(JSON.stringify(input), before);
  for (const b of [null, body(NaN, 430), body(150, Infinity), body(150, 430, { w: 0 })]) assert.equal(view(b, input.level.platforms), null);
  assert.equal(view(body(150, 430), [surface(100, NaN), surface(100, 465, -100), surface(100, 465, 100, 0)]), null);
  assert.equal(getGroundShadowView(), null);
});

test('the painter clips the actual ellipse to its surface and restores all caller canvas state', () => {
  const calls = [], stack = [], state = { globalAlpha: .6, fillStyle: '#123456' };
  const c = {
    get globalAlpha() { return state.globalAlpha; }, set globalAlpha(value) { state.globalAlpha = value; },
    get fillStyle() { return state.fillStyle; }, set fillStyle(value) { state.fillStyle = value; },
    save() { stack.push({ ...state }); calls.push(['save']); }, restore() { Object.assign(state, stack.pop()); calls.push(['restore']); },
    beginPath() { calls.push(['beginPath']); }, rect(...args) { calls.push(['rect', ...args]); }, clip() { calls.push(['clip']); },
    ellipse(...args) { calls.push(['ellipse', ...args]); }, fill() { calls.push(['fill', state.globalAlpha, state.fillStyle]); },
  };
  const result = view(body(213.5, 450), [surface(100, 465, 100, 2)]), before = JSON.stringify(result);
  drawGroundShadow(c, result);
  assert.deepEqual(calls.find(call => call[0] === 'rect'), ['rect', 100, 465, 100, 2]);
  assert.ok(calls.findIndex(call => call[0] === 'clip') < calls.findIndex(call => call[0] === 'ellipse'));
  assert.equal(calls.find(call => call[0] === 'ellipse')[1], 213.5);
  assert.equal(calls.find(call => call[0] === 'fill')[1], .6 * result.opacity);
  assert.deepEqual(state, { globalAlpha: .6, fillStyle: '#123456' }); assert.equal(stack.length, 0); assert.equal(JSON.stringify(result), before);
  const count = calls.length; drawGroundShadow(c, null); drawGroundShadow(c, { ...result, radiusX: Infinity }); assert.equal(calls.length, count);
});

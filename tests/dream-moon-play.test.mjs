import test from 'node:test';
import assert from 'node:assert/strict';
import { DreamMoonPlay, MOON_PLAY_CONFIG, reflectMoonRay, solveMoonSource } from '../dist/dream-moon-play.js';
import { getDreamLevel } from '../dist/dream-levels.js';

const cfg = MOON_PLAY_CONFIG;
const near = (actual, expected, epsilon = 1e-9) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
const context = (overrides = {}) => ({
  state: 'playing', form: 'soul', body: {...cfg.anchor, grounded: true},
  soul: {x: cfg.anchor.x, y: cfg.anchor.y - 83}, reducedMotion: false, ...overrides,
});
const tick = (play, seconds, input) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) play.update(1 / 60, input);
};
const aimAt = (play, targetIndex, overrides = {}) => {
  const view = play.getView();
  return context({...overrides, soul: solveMoonSource(view.targets[targetIndex], view.mirror.angle)});
};
const finish = play => {
  for (let i = 0; i < 3; i++) tick(play, .5, aimAt(play, i));
  assert.equal(play.getView().complete, true);
};

test('the authored stage stays on the right bank, away from the main lamp and platform', () => {
  assert.equal(cfg.variants.length, 3);
  assert.equal(new Set(cfg.variants.map(variant => variant.id)).size, 3);
  const level = getDreamLevel(2);
  assert.ok(level.platforms.some(platform => platform.y === cfg.anchor.y && platform.x <= cfg.anchor.x - cfg.bodyRangeX && platform.x + platform.w >= cfg.anchor.x + cfg.bodyRangeX));
  assert.ok(level.lanterns.every(lamp => Math.hypot(lamp.x - cfg.mirror.x, lamp.y - cfg.mirror.y) > cfg.turnRadius + 102));
  for (const variant of cfg.variants) {
    assert.equal(variant.targets.length, 3);
    for (const target of variant.targets) {
      assert.ok(target.x >= 1270 && target.x <= 1655 && target.y >= 205 && target.y <= 505);
      assert.ok(!(target.x >= 1530 && target.y >= 415 && target.y <= 473));
      assert.equal(typeof target.kind, 'string');
      assert.equal(typeof target.label, 'string');
    }
  }
  assert.equal(Object.isFrozen(cfg), true);
  assert.equal(Object.isFrozen(cfg.variants[0].targets[0]), true);
});

test('the ray obeys plane-mirror reflection, including oblique incidence and a rotated mirror', () => {
  const horizontal = reflectMoonRay({x: -3, y: 4}, 0, {x: 0, y: 0});
  near(horizontal.incoming.x, .6); near(horizontal.incoming.y, -.8);
  near(horizontal.outgoing.x, .6); near(horizontal.outgoing.y, .8);
  const rotated = reflectMoonRay({x: 0, y: 100}, Math.PI / 4, {x: 0, y: 0});
  near(rotated.outgoing.x, -1); near(rotated.outgoing.y, 0);
  for (const angle of cfg.angles) {
    const ray = reflectMoonRay({x: 1392, y: 498}, angle);
    near(Math.hypot(ray.outgoing.x, ray.outgoing.y), 1);
    const tangent = {x: Math.cos(angle), y: Math.sin(angle)};
    near(ray.incoming.x * tangent.x + ray.incoming.y * tangent.y, ray.outgoing.x * tangent.x + ray.outgoing.y * tangent.y);
    near(ray.incoming.x * ray.normal.x + ray.incoming.y * ray.normal.y, -(ray.outgoing.x * ray.normal.x + ray.outgoing.y * ray.normal.y));
  }
});

test('each target in every arrangement is reachable with all three mirror angles', () => {
  for (const variant of cfg.variants) for (const target of variant.targets) for (const angle of cfg.angles) {
    const source = solveMoonSource(target, angle);
    assert.ok(source.y >= 32 && source.y <= 545);
    assert.ok(source.x >= 16 && source.x <= getDreamLevel(2).width - 16);
    assert.ok(Math.hypot(source.x - cfg.anchor.x, source.y - (cfg.anchor.y - 56)) < 565);
    const ray = reflectMoonRay(source, angle);
    assert.ok(ray.distance > cfg.minSourceDistance && ray.distance < cfg.maxSourceDistance);
    const dx = target.x - cfg.mirror.x, dy = target.y - cfg.mirror.y;
    near(dx * ray.outgoing.y - dy * ray.outgoing.x, 0, 1e-8);
    assert.ok(dx * ray.outgoing.x + dy * ray.outgoing.y > 0);
    assert.ok(Math.hypot(dx, dy) < cfg.beamLength);
  }
});

test('moving the real source changes the ray and holding its reflection lights only the hit target', () => {
  const play = new DreamMoonPlay();
  const input = aimAt(play, 0);
  play.refresh(input);
  const first = play.getView();
  assert.deepEqual(first.beam[0], input.soul);
  const moved = context({soul: {x: input.soul.x - 90, y: input.soul.y - 100}});
  play.refresh(moved);
  assert.notDeepEqual(play.getView().beam[2], first.beam[2]);
  tick(play, .4, input);
  assert.equal(play.getView().targets[0].lit, false);
  assert.ok(play.getView().targets[0].charge > .8);
  tick(play, .05, input);
  assert.deepEqual(play.getSnapshot().groups[0].lit, [0]);
  tick(play, 1, input);
  assert.equal(play.getView().targets[0].unfoldProgress, 1);
  tick(play, 1, moved);
  assert.equal(play.getView().targets[0].lit, true);
});

test('brief passes, missed beams and source distances at either boundary cannot complete a hold', () => {
  const play = new DreamMoonPlay();
  const input = aimAt(play, 0);
  tick(play, .25, input);
  play.update(1 / 60, context({soul: {...cfg.mirror}}));
  assert.equal(play.getView().targets[0].charge, 0);
  tick(play, .25, input);
  assert.equal(play.getView().targets[0].lit, false);
  for (const distance of [0, cfg.minSourceDistance, cfg.maxSourceDistance, 900]) {
    tick(play, 1, context({soul: {x: cfg.mirror.x + distance, y: cfg.mirror.y}}));
    assert.deepEqual(play.getView().beam, []);
    assert.equal(play.getView().progress.lit, 0);
  }
});

test('pausing freezes charge, unfolded scenery and the presentation clock', () => {
  const play = new DreamMoonPlay();
  const input = aimAt(play, 0);
  tick(play, .25, input);
  const before = play.getView();
  tick(play, 30, {...input, state: 'paused'});
  near(play.clock, before.clock);
  near(play.getView().targets[0].charge, before.targets[0].charge);
  assert.deepEqual(play.getView().beam, before.beam);
  assert.deepEqual(play.getView().source, before.source);
  assert.equal(play.getView().active, false);
  assert.equal(play.getView().illuminated, true);
  assert.equal(play.getView().canTurn, false);
  assert.equal(play.pulse(cfg.mirror), false);
  tick(play, .2, input);
  assert.equal(play.getView().targets[0].lit, true);
  tick(play, .2, input);
  const unfolding = play.getView().targets[0].unfoldProgress;
  tick(play, 3, {...input, state: 'paused'});
  assert.equal(play.getView().targets[0].unfoldProgress, unfolding);
});

test('body return, leaving the ring and being airborne suspend play without erasing lit props', () => {
  const play = new DreamMoonPlay();
  tick(play, .5, aimAt(play, 0));
  tick(play, .2, aimAt(play, 1));
  for (const input of [
    context({form: 'body'}),
    context({body: {...cfg.anchor, grounded: false}}),
    context({body: {x: cfg.anchor.x + cfg.bodyRangeX + .1, y: cfg.anchor.y, grounded: true}}),
    context({body: {x: cfg.anchor.x, y: cfg.anchor.y - cfg.bodyRangeY - .1, grounded: true}}),
  ]) {
    const clock = play.clock;
    tick(play, 2, input);
    assert.equal(play.getView().active, false);
    assert.equal(play.clock, clock);
    assert.equal(play.getView().targets[0].lit, true);
    assert.equal(play.getView().targets[1].charge, 0);
  }
  tick(play, .5, aimAt(play, 1));
  assert.deepEqual(play.getSnapshot().groups[0].lit, [0, 1]);
});

test('mirror turns require an active soul within 85 pixels and cycle through exactly three orientations', () => {
  const play = new DreamMoonPlay();
  play.refresh(context());
  assert.equal(play.pulse({x: cfg.mirror.x + cfg.turnRadius + .01, y: cfg.mirror.y}), false);
  assert.equal(play.getView().mirror.index, 0);
  for (const expected of [1, 2, 0]) {
    assert.equal(play.pulse({x: cfg.mirror.x + cfg.turnRadius, y: cfg.mirror.y}), true);
    assert.equal(play.getView().mirror.index, expected);
  }
  play.refresh(context({form: 'body'}));
  assert.equal(play.pulse(cfg.mirror), false);
  play.refresh(context({body: {...cfg.anchor, grounded: false}}));
  assert.equal(play.pulse(cfg.mirror), false);
});

test('all three arrangements solve through public methods and a later cycle preserves their lights and orientation', () => {
  const play = new DreamMoonPlay();
  const body = context({form: 'body'});
  assert.equal(play.interact(body), false);
  for (let variant = 0; variant < 3; variant++) {
    assert.equal(play.getView().variant, variant);
    play.refresh(context({soul: {x: cfg.mirror.x, y: cfg.mirror.y + 60}}));
    for (let turn = 0; turn < variant; turn++) assert.equal(play.pulse(play.context.soul), true);
    finish(play);
    assert.equal(play.interact(context()), false);
    assert.equal(play.interact({...body, state: 'paused'}), false);
    assert.equal(play.interact({...body, body: {...cfg.anchor, grounded: false}}), false);
    assert.equal(play.interact(body), true);
  }
  assert.equal(play.getView().variant, 0);
  assert.deepEqual(play.getView().completedVariants, [0, 1, 2]);
  for (let variant = 0; variant < 3; variant++) {
    assert.equal(play.getView().complete, true);
    assert.equal(play.getView().mirror.index, variant);
    assert.equal(play.interact(body), true);
  }
  const freshChapter = new DreamMoonPlay();
  assert.deepEqual(freshChapter.getView().completedVariants, []);
  assert.equal(freshChapter.getView().progress.lit, 0);
});

test('reduced motion preserves the real puzzle but shows lit props immediately', () => {
  const play = new DreamMoonPlay();
  tick(play, .4, aimAt(play, 0, {reducedMotion: true}));
  assert.equal(play.getView().targets[0].lit, false);
  tick(play, .05, aimAt(play, 0, {reducedMotion: true}));
  assert.equal(play.getView().targets[0].lit, true);
  assert.equal(play.getView().targets[0].unfoldProgress, 1);
});

test('malformed contexts, source points and time cannot fabricate progress or poison the model', () => {
  const play = new DreamMoonPlay();
  for (const input of [undefined, null, {}, [], context({body: {x: '1460', y: 560, grounded: true}}),
    context({soul: {x: Infinity, y: 380}}), context({soul: {x: 1460, y: NaN}})]) {
    assert.doesNotThrow(() => play.update(1 / 60, input));
    assert.deepEqual(play.getView().beam, []);
    assert.equal(play.getView().progress.lit, 0);
  }
  for (const dt of [undefined, null, NaN, Infinity, -1, '1', {}]) play.update(dt, aimAt(play, 0));
  assert.equal(play.getView().targets[0].charge, 0);
  play.update(1000, aimAt(play, 0));
  assert.equal(play.getView().targets[0].lit, false);
  assert.ok(play.getView().targets[0].charge <= .1 / cfg.holdSeconds + 1e-9);
  for (const invalid of [null, {}, {x: '1', y: 2}, {x: NaN, y: 0}, {x: 1, y: Infinity}]) {
    assert.equal(reflectMoonRay(invalid, 0), null);
    assert.equal(solveMoonSource(invalid, 0), null);
    assert.equal(play.pulse(invalid), false);
  }
  assert.equal(reflectMoonRay(cfg.mirror, 0), null);
  assert.equal(reflectMoonRay({x: 1, y: 2}, Infinity), null);
  assert.equal(solveMoonSource(cfg.mirror, 0), null);
  assert.equal(solveMoonSource({x: 1, y: 2}, 0, -1), null);
});

test('view and snapshot copies cannot edit internal progress, authored geometry or captured input', () => {
  const play = new DreamMoonPlay();
  const input = aimAt(play, 0);
  play.refresh(input);
  input.soul.x = 999;
  const view = play.getView(), snapshot = play.getSnapshot();
  view.anchor.x = -1; view.mirror.angles[0] = 0;
  view.targets[0].lit = true; view.targets[0].x = -1;
  view.source.x = -1; view.beam[0].x = -1; view.completedVariants.push(2);
  snapshot.groups[0].lit.push(0); snapshot.progress.lit = 3;
  assert.equal(play.getView().targets[0].lit, false);
  assert.equal(play.getView().targets[0].x, cfg.variants[0].targets[0].x);
  assert.equal(play.getView().anchor.x, cfg.anchor.x);
  assert.equal(play.getView().mirror.angles[0], cfg.angles[0]);
  assert.notEqual(play.getView().source.x, 999);
  assert.deepEqual(play.getSnapshot().groups[0].lit, []);
});

test('hints follow the current interaction and destroyed instances remain inert', () => {
  const play = new DreamMoonPlay();
  assert.match(play.getHint(context({form: 'body'})), /E.*掀盖/);
  assert.match(play.getHint(context({soul: cfg.mirror})), /Q.*空格.*转月镜/);
  assert.equal(play.getHint(context({state: 'paused'})), '');
  assert.equal(play.getHint(context({body: {x: 20, y: 560, grounded: true}})), '');
  finish(play);
  assert.match(play.getHint(context({form: 'body'})), /Q.*换一幕/);
  assert.match(play.getHint(context()), /E.*归位/);
  play.destroy();
  const before = play.getSnapshot();
  tick(play, 2, context());
  play.refresh(context());
  assert.equal(play.pulse(cfg.mirror), false);
  assert.equal(play.interact(context({form: 'body'})), false);
  assert.equal(play.getHint(context()), '');
  assert.deepEqual(play.getSnapshot(), before);
  assert.deepEqual(play.getView().beam, []);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { DreamGame } from '../dist/dream-engine.js';
import { DREAM_LEVELS } from '../dist/dream-levels.js';
import { FESTIVAL_LEVELS } from '../dist/dream-festival-levels.js';
import { MOON_PLAY_CONFIG, solveMoonSource } from '../dist/dream-moon-play.js';

const noop = () => {};
globalThis.window = {devicePixelRatio: 1, addEventListener: noop, removeEventListener: noop};
globalThis.document = {hidden: false, addEventListener: noop, removeEventListener: noop};
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = noop;
const cfg = MOON_PLAY_CONFIG;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const numeric = args => {
  for (const value of args) {
    if (typeof value === 'number') assert.ok(Number.isFinite(value), 'a renderer produced a non-finite coordinate');
    else if (Array.isArray(value)) numeric(value);
  }
};
function drawingContext() {
  return new Proxy({
    globalAlpha: 1,
    createLinearGradient: (...args) => { numeric(args); return {addColorStop: noop}; },
    createRadialGradient: (...args) => { numeric(args); return {addColorStop: noop}; },
    measureText: text => ({width: String(text).length * 8}),
  }, {get: (target, key) => key in target ? target[key] : (...args) => numeric(args)});
}
function makeGame(options = {}, callbacks = {}, size = {width: 1100, height: 620}) {
  const ctx = drawingContext();
  const game = new DreamGame({getContext: () => ctx, getBoundingClientRect: () => size}, callbacks);
  game.start({chapterIndex: 2, sound: false, ...options});
  return game;
}
const tick = (game, seconds) => { for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) game.update(1 / 60); };

function walkTo(game, x) {
  assert.equal(game.form, 'body');
  for (let frame = 0; frame < 12 * 60; frame++) {
    const dx = x - game.body.x;
    if (Math.abs(dx) < 1 && Math.abs(game.body.vx) < 10) {
      game.setInput({x: 0, y: 0}); tick(game, .12); return;
    }
    game.setInput({x: clamp(dx / 42, -1, 1), y: 0}); game.update(1 / 60);
  }
  assert.fail('ordinary body input did not reach the right-bank marker');
}

function enterFromRightBank(game) {
  // Set only the test's starting checkpoint. From this real, authored piece of
  // ground onward, all walking, flight, mirror inputs and scene changes use
  // DreamGame controls. No moon progress or soul coordinate is assigned.
  const checkpoint = game.level.checkpoints[1];
  assert.equal(checkpoint.x, 1360);
  game.body.x = checkpoint.x;
  game.update(1 / 60);
  assert.equal(game.checkpoint.index, 1);
  walkTo(game, cfg.anchor.x);
  assert.equal(game.body.grounded, true);
  assert.equal(game.moonPlay.getSnapshot().near, true);
}

function readySoul(game) {
  if (game.form === 'soul' && game.energy < 24) game.recall();
  if (game.form === 'body') {
    game.setInput({x: 0, y: 0});
    for (let frame = 0; frame < 7 * 60 && game.energy < 98; frame++) game.update(1 / 60);
    assert.equal(game.toggleSoul(), true);
  }
}

function flyTo(game, target) {
  readySoul(game);
  for (let frame = 0; frame < 10 * 60; frame++) {
    assert.equal(game.form, 'soul', 'a normal flight must stay within the energy budget');
    const dx = target.x - game.soul.x, dy = target.y - game.soul.y;
    if (Math.hypot(dx, dy) < 2 && Math.hypot(game.soul.vx, game.soul.vy) < 8) {
      game.setInput({x: 0, y: 0}); return;
    }
    game.setInput({x: clamp(dx / 44, -1, 1), y: clamp(dy / 44, -1, 1)});
    game.update(1 / 60);
  }
  assert.fail(`ordinary flight did not reach ${target.x},${target.y}`);
}

function turnTo(game, index) {
  flyTo(game, {x: cfg.mirror.x, y: cfg.mirror.y + 60});
  assert.equal(game.getSnapshot().moonPlay.canTurn, true, 'the touch HUD must advertise a nearby mirror turn');
  assert.equal(game.getSnapshot().moonPlay.canAdvance, false);
  while (game.moonPlay.getView().mirror.index !== index) {
    tick(game, .5);
    assert.equal(game.interact(), true);
    assert.equal(game.getSnapshot().moonPlay.canTurn, true, 'turning the mirror must keep its nearby touch action available');
    assert.equal(game.getSnapshot().moonPlay.canAdvance, false);
  }
}

function illuminate(game, index) {
  readySoul(game);
  const view = game.moonPlay.getView();
  if (view.targets[index].lit) return;
  const targetSource = solveMoonSource(view.targets[index], view.mirror.angle);
  flyTo(game, targetSource);
  tick(game, .6);
  assert.equal(game.moonPlay.getView().targets[index].lit, true, `${view.variantId} / ${index} did not receive a held reflection`);
}

function solveScene(game) {
  for (let index = 0; index < 3; index++) illuminate(game, index);
  assert.equal(game.moonPlay.getSnapshot().complete, true);
}

function assertStageFits(game) {
  game.render();
  const view = game.moonPlay.getView();
  assert.equal(game.moonFramed, true);
  for (const target of view.targets) {
    const left = (target.x - 40 - game.camera) * game.scale;
    const right = (target.x + 40 - game.camera) * game.scale;
    const top = (target.y - 46) * game.scale + game.viewportOffsetY;
    const bottom = (target.y + 48) * game.scale + game.viewportOffsetY;
    assert.ok(left >= 0 && right <= game.cssWidth, `${target.id} must fit horizontally, including its prop and charge ring`);
    assert.ok(top >= 0 && bottom <= game.cssHeight, `${target.id} must fit vertically, including its label`);
  }
  const feet = cfg.anchor.y * game.scale + game.viewportOffsetY;
  assert.ok(feet > 0 && feet < game.cssHeight, 'the body must remain visible below the whole stage');
}

test('all three moon scenes complete through actual walking, soul flight, Q turns and E returns without advancing the main story', () => {
  const puzzles = [], completions = [], capEvents = [];
  const game = makeGame({}, {onPuzzle: event => puzzles.push(event), onComplete: event => completions.push(event), onCapActivity: event => capEvents.push(event)});
  const authored = JSON.stringify(game.level), beforeCap = structuredClone(game.capActivity.record), beforeLost = game.lostCase?.getRecord() ?? null;
  enterFromRightBank(game);
  assert.match(game.getNearHint(), /E.*掀盖/);
  assert.equal(game.getSnapshot().moonPlay.canTurn, false);
  assert.equal(game.getSnapshot().moonPlay.canAdvance, false);
  for (let variant = 0; variant < 3; variant++) {
    assert.equal(game.moonPlay.getView().variant, variant);
    readySoul(game);
    turnTo(game, variant);
    solveScene(game);
    assert.equal(game.getSnapshot().moonPlay.progress.lit, 3);
    assert.equal(game.state, 'playing');
    assert.equal(game.recall(), true);
    assert.equal(game.getSnapshot().moonPlay.canTurn, false);
    assert.equal(game.getSnapshot().moonPlay.canAdvance, true, 'a completed scene must advertise the next-scene touch action after E return');
    assert.match(game.getNearHint(), /Q.*换一幕/);
    assert.equal(game.interact(), true);
    assert.equal(game.getSnapshot().moonPlay.canAdvance, variant === 2, 'an uncompleted next scene must clear the next-scene touch action');
  }
  assert.equal(game.moonPlay.getView().variant, 0);
  assert.deepEqual(game.getSnapshot().moonPlay.completedVariants, [0, 1, 2]);
  assert.deepEqual(game.lanterns.map(lamp => lamp.lit), [false, false]);
  assert.equal(game.getSnapshot().memories, 0);
  assert.equal(game.canExit(), false);
  assert.equal(game.deaths, 0);
  assert.deepEqual(puzzles, []); assert.deepEqual(completions, []); assert.deepEqual(capEvents, []);
  assert.deepEqual(game.capActivity.record, beforeCap);
  assert.deepEqual(game.lostCase?.getRecord() ?? null, beforeLost);
  assert.equal(JSON.stringify(game.level), authored, 'optional play must not edit authored geometry');
  game.destroy();
});

test('320x431 and 390x595 canvases show all three props in every scene and release the camera for the main lamp', () => {
  for (const size of [{width: 320, height: 431}, {width: 390, height: 595}]) {
    const game = makeGame({}, {}, size);
    enterFromRightBank(game);
    for (let variant = 0; variant < 3; variant++) {
      readySoul(game);
      assertStageFits(game);
      solveScene(game);
      assertStageFits(game);
      assert.equal(game.recall(), true);
      assert.equal(game.interact(), true);
    }
    flyTo(game, game.lanterns[1]);
    tick(game, .5); game.render();
    assert.equal(game.moonFramed, false, 'a moon-ring body must not trap the camera while the soul explores the main lamp');
    for (const object of [game.soul, game.lanterns[1]]) {
      const x = (object.x - game.camera) * game.scale;
      const y = object.y * game.scale + game.viewportOffsetY;
      assert.ok(x > 24 && x < size.width - 24 && y > 24 && y < size.height - 24);
    }
    assert.deepEqual(game.lanterns.map(lamp => lamp.lit), [false, false]);
    game.destroy();
  }
});

test('an ordinary flight to the nearby main lamp keeps the poem prompt and its answer authoritative', () => {
  const asked = [], game = makeGame({}, {onPuzzle: event => asked.push(event)});
  enterFromRightBank(game);
  illuminate(game, 0);
  const mirrorIndex = game.moonPlay.getView().mirror.index;
  flyTo(game, game.lanterns[1]);
  assert.equal(game.lanterns[1].lit, false);
  assert.match(game.getNearHint(), /诗灯共鸣/);
  assert.equal(game.interact(), true);
  assert.equal(game.pendingSeal, 1);
  assert.equal(game.state, 'paused');
  assert.equal(asked.length, 1);
  assert.equal(asked[0].chapterIndex, 2);
  assert.equal(asked[0].sealIndex, 1);
  assert.equal(game.moonPlay.getView().mirror.index, mirrorIndex);
  assert.equal(game.lanterns[1].lit, false);
  assert.equal(game.resolvePuzzle(true), true);
  assert.equal(game.lanterns[1].lit, true);
  assert.equal(game.lanterns[0].lit, false);
  assert.equal(game.moonPlay.getView().targets[0].lit, true);
  game.destroy();
});

test('pause and render freeze the last moon beam, charge and clock while normal resume restores control', () => {
  const game = makeGame();
  enterFromRightBank(game); illuminate(game, 0);
  flyTo(game, {x: cfg.mirror.x, y: cfg.mirror.y + 60});
  assert.equal(game.getSnapshot().moonPlay.canTurn, true);
  const live = game.moonPlay.getView();
  assert.equal(live.beam.length, 3);
  assert.equal(game.pause(), true);
  const paused = game.moonPlay.getView(), time = game.time, energy = game.energy;
  assert.equal(paused.active, false); assert.equal(paused.illuminated, true);
  assert.equal(game.getSnapshot().moonPlay.canTurn, false, 'pausing must remove the turn action even while the frozen mirror remains visible');
  assert.equal(game.getSnapshot().moonPlay.canAdvance, false);
  assert.deepEqual(paused.beam, live.beam); assert.deepEqual(paused.source, live.source);
  tick(game, 4);
  for (let frame = 0; frame < 5; frame++) game.render();
  assert.deepEqual(game.moonPlay.getView(), paused);
  assert.equal(game.time, time); assert.equal(game.energy, energy);
  assert.equal(game.interact(), false); assert.equal(game.toggleSoul(), false);
  assert.equal(game.resume(), true);
  tick(game, .2);
  assert.equal(game.getSnapshot().moonPlay.canTurn, true);
  assert.equal(game.getSnapshot().moonPlay.canAdvance, false);
  assert.ok(game.moonPlay.clock > paused.clock);
  const before = {view: game.moonPlay.getView(), body: {...game.body}, soul: {...game.soul}, snapshot: game.getSnapshot()};
  for (let frame = 0; frame < 5; frame++) game.render();
  assert.deepEqual({view: game.moonPlay.getView(), body: {...game.body}, soul: {...game.soul}, snapshot: game.getSnapshot()}, before);
  game.destroy();
});

test('natural energy recall and a fall retain moon progress; leaving permits movement and restarting clears the old visit', () => {
  const game = makeGame();
  enterFromRightBank(game); illuminate(game, 0);
  const lit = game.moonPlay.getSnapshot().groups[0].lit;
  for (let frame = 0; frame < 25 * 60 && game.form === 'soul'; frame++) game.update(1 / 60);
  assert.equal(game.form, 'body');
  assert.equal(game.moonPlay.getView().illuminated, false);
  assert.deepEqual(game.moonPlay.getSnapshot().groups[0].lit, lit);
  const resting = game.moonPlay.clock;
  tick(game, 6);
  assert.equal(game.energy, 100); assert.equal(game.moonPlay.clock, resting);
  illuminate(game, 1);
  const moon = game.moonPlay, kept = moon.getSnapshot().groups[0].lit;
  game.body.y = 730; game.update(1 / 60);
  assert.equal(game.deaths, 1); assert.equal(game.form, 'body');
  assert.equal(game.body.x, game.level.checkpoints[1].x);
  assert.equal(game.moonPlay, moon);
  assert.deepEqual(moon.getSnapshot().groups[0].lit, kept);
  walkTo(game, cfg.anchor.x);
  solveScene(game);
  assert.equal(game.recall(), true);
  assert.equal(game.getSnapshot().moonPlay.canAdvance, true);
  walkTo(game, cfg.anchor.x + 130);
  assert.equal(moon.getSnapshot().near, false);
  assert.equal(game.getSnapshot().moonPlay.canTurn, false);
  assert.equal(game.getSnapshot().moonPlay.canAdvance, false, 'leaving the marker must clear a previously available next-scene touch action');
  assert.equal(game.interact(), false, 'Q away from the marker cannot switch the completed scene');
  assert.equal(moon.getSnapshot().variant, 0);
  const old = game.moonPlay;
  game.restart();
  assert.equal(old.getSnapshot().destroyed, true);
  assert.notEqual(game.moonPlay, old);
  assert.equal(game.getSnapshot().moonPlay.progress.lit, 0);
  assert.deepEqual(game.getSnapshot().moonPlay.completedVariants, []);
  const final = game.moonPlay;
  game.destroy();
  assert.equal(final.getSnapshot().destroyed, true);
  assert.equal(game.moonPlay, null);
});

test('theatre borrowing switches and the station lost cabinet retain their existing Q actions', () => {
  const record = {completedSteps: [0, 1, 2], completedVariants: [0], best: {}, pending: null};
  const game = makeGame({capActivityRecord: record});
  walkTo(game, 330);
  assert.equal(game.moonPlay.getSnapshot().near, false);
  assert.equal(game.interact(), true);
  assert.equal(game.capActivity.variant, 1);
  assert.equal(game.toggleSoul(), true);
  flyTo(game, game.capActivity.nodes.a);
  const before = game.capActivity.switches.a;
  assert.equal(game.interact(), true);
  assert.equal(game.capActivity.switches.a, 1 - before);
  assert.equal(game.moonPlay.getView().mirror.index, 0);
  assert.equal(game.moonPlay.getView().progress.lit, 0);
  assert.equal(game.recall(), true);
  game.destroy();
  const station = makeGame({chapterIndex: 0, capActivityRecord: record});
  walkTo(station, 465);
  assert.equal(station.interact(), true);
  assert.equal(station.lostCase.opened, true);
  assert.equal(station.toggleSoul(), true);
  assert.equal(station.lostCase.isExpanded(), true);
  assert.equal(station.moonPlay, null);
  station.destroy();
});

test('only main-story chapter three installs moon play, including after switching to a festival with the same physical base', () => {
  const authored = JSON.stringify(DREAM_LEVELS);
  for (let chapterIndex = 0; chapterIndex < 6; chapterIndex++) {
    const game = makeGame({chapterIndex});
    assert.equal(Boolean(game.moonPlay), chapterIndex === 2);
    assert.equal(Boolean(game.getSnapshot().moonPlay), chapterIndex === 2);
    game.render(); game.destroy();
  }
  const game = makeGame(), previous = game.moonPlay;
  for (const festival of FESTIVAL_LEVELS) {
    game.start({festival: {id: festival.festivalId}, sound: false});
    assert.equal(game.mode, 'festival');
    assert.equal(game.moonPlay, null);
    assert.equal(game.getSnapshot().moonPlay, null);
    assert.equal(game.moonFramed, false);
    game.render();
  }
  assert.equal(previous.getSnapshot().destroyed, true);
  game.destroy();
  assert.equal(JSON.stringify(DREAM_LEVELS), authored);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { DreamGame } from '../dist/dream-engine.js';
import { DreamGame as BaseGame } from '../dist/dream-engine-base.js';
import { createDreamSave, completeDreamChapter, chooseStoryReply, validateDreamSave, persistDreamSave, loadDreamSave } from '../dist/dream-story.js';
import { getStoryEncounter, getStoryEncounterKey } from '../dist/dream-encounters.js';
import { normalizeJourneyContext } from '../dist/dream-journey.js';
import { getFestival } from '../dist/dream-festivals.js';
import { drawCapMiniature } from '../dist/dream-cap-art.js';
import { normalizeLetterChoice, drawLetterEcho, drawLetterMiniature, drawLetterSceneWindow, LETTER_ECHO_DURATION } from '../dist/dream-letter-echo.js';

const noop = () => {};
let requests = 0;
globalThis.window = { devicePixelRatio: 1, addEventListener: noop, removeEventListener: noop };
globalThis.document = { hidden: false, addEventListener: noop, removeEventListener: noop };
globalThis.requestAnimationFrame = () => ++requests;
globalThis.cancelAnimationFrame = noop;
function context() {
  const calls = [], stack = [], values = { globalAlpha: 1, globalCompositeOperation: 'source-over' };
  const gradient = (type, args) => {
    const stops = []; calls.push([type, ...args, stops]); return { addColorStop: (...pair) => stops.push(pair) };
  };
  const api = {
    calls, stack,
    save() { stack.push({ ...values }); calls.push(['save']); },
    restore() { assert.ok(stack.length, 'balanced canvas stack'); Object.assign(values, stack.pop()); calls.push(['restore']); },
    createLinearGradient: (...args) => gradient('linear', args),
    createRadialGradient: (...args) => gradient('radial', args),
    measureText: text => ({ width: String(text).length * 8 }),
  };
  return new Proxy(api, {
    get: (target, key) => key in target ? target[key] : key in values ? values[key] : (...args) => {
      for (const n of args) if (typeof n === 'number') assert.ok(Number.isFinite(n), String(key));
      calls.push([key, ...args]);
    },
    set: (target, key, value) => { if (key in target) target[key] = value; else values[key] = value; return true; },
  });
}
function fixture(options = {}, callbacks = {}, Class = DreamGame) {
  const c = context(), events = [], capEvents = [], hud = [], talks = [];
  const game = new Class({ getContext: () => c, getBoundingClientRect: () => ({ width: 1100, height: 640 }) }, {
    onEvent: e => events.push(e), onCapEvent: e => capEvents.push(e), onHud: e => hud.push(e), onTalk: e => talks.push(e), ...callbacks,
  });
  game.start({ chapterIndex: 1, sound: false, ...options });
  return { game, c, events, capEvents, hud, talks };
}
const tick = (game, seconds) => { for (let i = 0; i < Math.ceil(seconds * 60); i++) game.update(1 / 60); };
function render(h) { h.c.calls.length = 0; h.game.render(); assert.equal(h.c.stack.length, 0); return structuredClone(h.c.calls); }
const facts = game => JSON.stringify({ body: game.body, soul: game.soul, time: game.time, deaths: game.deaths, energy: game.energy, memories: game.memories, lanterns: game.lanterns, plant: game.greenhousePlant, progress: game.capActivity?.record, lost: game.lostCase?.getRecord(), level: game.level });
const snapshot = game => JSON.stringify({ ...game.getSnapshot(), capScene: game.capScene, echo: game.letterEcho, visualTime: game.visualTime });
function savedChoice(choice) {
  const save = createDreamSave();
  for (const chapterIndex of [0, 1]) assert.equal(completeDreamChapter(save, { chapterIndex, time: 60, memories: 0, deaths: 0, stars: 2 }).ok, true);
  assert.equal(chooseStoryReply(save, 'letter', choice), true); return save;
}

test('only the existing validated saved reply enables a window; completion alone does not invent one', () => {
  const unearned = createDreamSave(); unearned.choices.letter = 'send';
  assert.equal(validateDreamSave(unearned).choices.letter, null);
  for (const choice of [undefined, null, 'SEND', 'release', true, 1, {}, ['send']]) {
    const h = fixture({ letterChoice: choice, greenhouseRecord: { memories: [1], seals: [0, 1] } });
    assert.equal(h.game.letterEcho, null); assert.equal('letterEcho' in h.game.capScene, false);
    assert.equal('letterChoice' in h.game.getSnapshot().journey, false); h.game.destroy();
  }
  for (const choice of ['send', 'keep']) {
    const save = validateDreamSave(savedChoice(choice));
    const h = fixture({ letterChoice: save.choices.letter });
    assert.equal(h.game.letterEcho.choice, choice);
    assert.equal(h.game.greenhousePlant.stage, 0); assert.equal(h.game.getSnapshot().memories, 0);
    assert.equal(h.game.getSnapshot().seals, 0); assert.equal(h.game.exitReady(), false); h.game.destroy();
  }
});

test('ordinary first cap opening performs one bounded echo after the original miniature, without a second loop', () => {
  for (const choice of ['send', 'keep']) {
    const h = fixture({ letterChoice: choice }), beforeFrames = requests;
    tick(h.game, 2); assert.equal(h.game.letterEcho.phase, 'waiting');
    assert.equal(h.game.toggleSoul(), true); tick(h.game, 1);
    assert.equal(h.game.letterEcho.phase, 'waiting'); tick(h.game, .5);
    assert.equal(h.game.letterEcho.phase, 'playing'); assert.ok(h.game.letterEcho.elapsed > 0);
    tick(h.game, 3); assert.equal(h.game.letterEcho.phase, 'settled');
    assert.equal(h.game.letterEcho.elapsed, LETTER_ECHO_DURATION); assert.equal(requests, beforeFrames);
    assert.equal(h.game.recall(), true); tick(h.game, 1); h.game.toggleSoul(); tick(h.game, 2);
    assert.equal(h.game.letterEcho.phase, 'settled', 'same run must not repeatedly re-send a remembered reply');
    h.game.destroy();
  }
});

test('a pause freezes both the performance and its rendered frame with no hidden rewards or callbacks', () => {
  for (const choice of ['send', 'keep']) {
    const h = fixture({ letterChoice: choice }); h.game.toggleSoul(); tick(h.game, 2);
    assert.equal(h.game.letterEcho.phase, 'playing'); h.game.pause();
    const saved = snapshot(h.game), before = facts(h.game), frame = render(h), counts = [h.events.length, h.capEvents.length, h.hud.length];
    tick(h.game, 10); assert.equal(snapshot(h.game), saved); assert.equal(facts(h.game), before);
    assert.deepEqual(render(h), frame); assert.deepEqual([h.events.length, h.capEvents.length, h.hud.length], counts);
    h.game.resume(); tick(h.game, 3); assert.equal(h.game.letterEcho.phase, 'settled'); h.game.destroy();
  }
});

test('recalling before the echo leaves it for the next opening; recalling during it safely settles it', () => {
  const h = fixture({ letterChoice: 'keep' }); h.game.toggleSoul(); tick(h.game, .7); h.game.recall(); tick(h.game, 1);
  assert.equal(h.game.letterEcho.phase, 'waiting');
  h.game.toggleSoul(); tick(h.game, 1.7); assert.equal(h.game.letterEcho.phase, 'playing');
  h.game.recall(); tick(h.game, .05); assert.equal(h.game.letterEcho.phase, 'settled');
  tick(h.game, 1); assert.equal(h.game.capOpen, 0); assert.equal(h.game.greenhousePlant.stage, 0); h.game.destroy();
});

test('reduced motion keeps the chosen scene visible and never replays when motion is restored', () => {
  for (const choice of ['send', 'keep']) for (const initially of [false, true]) {
    const h = fixture({ letterChoice: choice, reducedMotion: initially }); h.game.toggleSoul(); tick(h.game, 1.8);
    if (!initially) assert.equal(h.game.letterEcho.phase, 'playing');
    h.game.setReducedMotion(true); assert.equal(h.game.letterEcho.phase, 'settled');
    assert.equal(h.game.capScene.letterEcho.choice, choice); h.game.pause();
    const frame = render(h); h.game.visualTime += 100; assert.deepEqual(render(h), frame);
    h.game.setReducedMotion(false); h.game.resume(); tick(h.game, 1);
    assert.equal(h.game.letterEcho.phase, 'settled'); h.game.destroy();
  }
});

test('diary re-selection replaces an in-flight reply while paused without changing the game facts', () => {
  const save = savedChoice('send'), h = fixture({ letterChoice: save.choices.letter });
  h.game.toggleSoul(); tick(h.game, 1.8); h.game.pause();
  const before = facts(h.game), old = h.game.letterEcho;
  assert.equal(chooseStoryReply(save, 'letter', 'keep'), true);
  assert.equal(h.game.setLetterChoice(save.choices.letter), true);
  assert.notEqual(h.game.letterEcho, old); assert.equal(h.game.letterEcho.choice, 'keep');
  assert.equal(h.game.letterEcho.phase, 'waiting'); assert.equal(facts(h.game), before);
  tick(h.game, 2); assert.equal(h.game.letterEcho.elapsed, 0);
  h.game.resume(); tick(h.game, .1); assert.equal(h.game.letterEcho.phase, 'playing');
  const elapsed = h.game.letterEcho.elapsed; assert.equal(h.game.setLetterChoice('keep'), false); assert.equal(h.game.letterEcho.elapsed, elapsed);
  assert.equal(h.game.setLetterChoice('invalid'), true); assert.equal(h.game.letterEcho, null); assert.equal('letterEcho' in h.game.capScene, false);
  h.game.destroy();
});

test('the original save key restores choices, and restarting replays presentation without changing discoveries', () => {
  const data = new Map(), storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
  const save = savedChoice('keep'); assert.equal(persistDreamSave(save, storage), true);
  const loaded = loadDreamSave(storage), h = fixture({ letterChoice: loaded.choices.letter });
  assert.equal(data.size, 1); h.game.toggleSoul(); tick(h.game, 5); assert.equal(h.game.letterEcho.phase, 'settled');
  h.game.restart(); assert.equal(h.game.letterEcho.choice, 'keep'); assert.equal(h.game.letterEcho.phase, 'waiting');
  assert.equal(h.game.greenhousePlant.stage, 0); assert.equal(h.game.getSnapshot().memories, 0); assert.equal(h.game.getSnapshot().seals, 0);
  assert.deepEqual(loadDreamSave(storage), loaded); h.game.destroy();
});

test('reply feedback follows actual selection and preserves urgent seed and lamp directions', () => {
  const h = fixture({ letterChoice: 'send' }); h.game.interact();
  const send = h.talks.at(-1), first = getStoryEncounter(1, send);
  assert.equal(send.journey.letterChoice, 'send'); assert.match(first[0].text, /种子/); assert.match(first.at(-1).text, /托风寄走/);
  h.game.resolveTalk(); h.game.setLetterChoice('keep'); h.game.interact();
  const keep = h.talks.at(-1), second = getStoryEncounter(1, keep);
  assert.equal(keep.repeated, false); assert.match(second.at(-1).text, /保管信/);
  assert.notEqual(getStoryEncounterKey(1, send), getStoryEncounterKey(1, keep));
  assert.equal(second.some(line => /开花了|带回的花/.test(line.text)), false);
  h.game.resolveTalk(); h.game.interact(); assert.equal(h.talks.at(-1).repeated, true);
  assert.equal(getStoryEncounter(1, h.talks.at(-1)).length, 1); h.game.destroy();
});

test('each echo preserves the inherited physics, chapter geometry and optional collection semantics', () => {
  for (const choice of ['send', 'keep']) {
    const a = fixture({ letterChoice: choice }), b = fixture({}, {}, BaseGame);
    for (const h of [a, b]) h.game.toggleSoul();
    for (let frame = 0; frame < 300; frame++) {
      a.game.update(1 / 60); b.game.update(1 / 60); assert.equal(facts(a.game), facts(b.game));
    }
    assert.equal(a.capEvents.length, b.capEvents.length);
    assert.deepEqual(a.capEvents, b.capEvents); assert.deepEqual(a.events, b.events);
    a.game.destroy(); b.game.destroy();
  }
});

test('other chapters and festivals do not inherit a greenhouse reply, even when it was selected in the diary', () => {
  const h = fixture({ letterChoice: 'send' });
  for (const options of [0, 2, 3, 4, 5].map(chapterIndex => ({ chapterIndex })).concat([{ festival: getFestival('halloween') }])) {
    h.game.start({ ...options, letterChoice: 'keep', sound: false });
    assert.equal(h.game.letterEcho, null); assert.equal('letterEcho' in h.game.capScene, false);
    assert.equal('letterEcho' in h.game.getSnapshot(), false);
    h.game.setLetterChoice('send'); assert.equal(h.game.letterEcho, null);
  }
  h.game.destroy(); assert.equal(h.game.setLetterChoice('keep'), false); h.game.update(1 / 60);
  assert.equal(h.game.letterEcho, null); assert.deepEqual(render(h), []);
});

test('rendering is pure, balanced, finite and visibly different for both choices at ordinary miniature scale', () => {
  const frames = [];
  for (const choice of ['send', 'keep']) {
    const h = fixture({ letterChoice: choice }); h.game.toggleSoul(); tick(h.game, 2);
    const before = snapshot(h.game), frame = render(h); assert.equal(snapshot(h.game), before);
    assert.deepEqual(render(h), frame); frames.push(frame);
    const mini = context(), scene = { motif: 'sprout', greenhouse: { stage: 0, pot: 'clay' }, letterEcho: { choice } };
    drawCapMiniature(mini, scene, 0); assert.equal(mini.stack.length, 0);
    assert.equal(scene.greenhouse.stage, 0);
    for (const elapsed of [0, .1, 1, 2.7, LETTER_ECHO_DURATION]) for (const face of [-1, 1]) {
      const c = context(); drawLetterEcho(c, { choice, phase: 'playing', elapsed }, { opening: { x: 25, y: 490 }, face, camera: 0, width: 320 });
      assert.equal(c.stack.length, 0);
    }
    h.game.destroy();
  }
  assert.notDeepEqual(frames[0], frames[1]);
  const c = context(); drawLetterEcho(c, null); drawLetterMiniature(c, null); drawLetterSceneWindow(c, null); assert.deepEqual(c.calls, []);
});

test('choice normalization never coerces an object or reads inherited and accessor journey values', () => {
  const trap = { toString() { throw new Error('coercion'); } };
  assert.equal(normalizeLetterChoice(trap), null);
  const accessor = Object.defineProperty({}, 'letterChoice', { get() { throw new Error('getter'); } });
  assert.equal('letterChoice' in normalizeJourneyContext(accessor), false);
  assert.equal('letterChoice' in normalizeJourneyContext(Object.create({ letterChoice: 'send' })), false);
  assert.equal(normalizeJourneyContext({ letterChoice: 'send' }).letterChoice, 'send');
});

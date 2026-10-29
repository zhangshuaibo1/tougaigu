import test from 'node:test';
import assert from 'node:assert/strict';
import { DreamGame } from '../dist/dream-engine.js';
import { DreamGame as BaseGame } from '../dist/dream-engine-base.js';
import { drawStationBackdrop, drawStationArchitecture } from '../dist/dream-station-art.js';
import { FESTIVAL_LEVELS } from '../dist/dream-festival-levels.js';
import { getFestival } from '../dist/dream-festivals.js';
import { PAINTED_STATION_URL } from '../dist/dream-painted-scene.js';
import { PAINTED_GREENHOUSE_URL } from '../dist/dream-greenhouse-scene.js';

const noop = () => {};
let requestedFrames = 0;
globalThis.window = { devicePixelRatio: 1, addEventListener: noop, removeEventListener: noop };
globalThis.document = { hidden: false, addEventListener: noop, removeEventListener: noop };
globalThis.requestAnimationFrame = () => ++requestedFrames;
globalThis.cancelAnimationFrame = noop;
const station = Object.freeze({ mode: 'story', chapterIndex: 0 });
const image = Object.freeze({ complete: true, naturalWidth: 2172, naturalHeight: 724 });
const otherScenes = [3, 4, 5].map(chapterIndex => ({ chapterIndex })).concat(
  FESTIVAL_LEVELS.map(level => ({ festival: getFestival(level.festivalId) })),
);
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

// Record the real renderer's operations and actual Canvas save/restore state.
// No colors or individual decorative shapes are required by these assertions.
function drawingContext() {
  const calls = [], stack = [], values = {
    globalAlpha: 1, globalCompositeOperation: 'source-over', imageSmoothingEnabled: true,
    imageSmoothingQuality: 'low', fillStyle: '#000', strokeStyle: '#000', lineWidth: 1,
    lineCap: 'butt', lineJoin: 'miter', lineDashOffset: 0,
    shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
  };
  const gradient = (kind, args) => {
    const stops = [];
    calls.push([kind, ...args, stops]);
    return { addColorStop(offset, color) { stops.push([offset, color]); } };
  };
  const api = {
    calls, stack, canvas: null, failImage: false,
    save() { stack.push({ ...values }); calls.push(['save']); },
    restore() {
      assert.ok(stack.length, 'Canvas state must be balanced');
      const restored = stack.pop();
      for (const key of Object.keys(values)) delete values[key];
      Object.assign(values, restored); calls.push(['restore']);
    },
    createLinearGradient(...args) { return gradient('linearGradient', args); },
    createRadialGradient(...args) { return gradient('radialGradient', args); },
    measureText: text => ({ width: String(text).length * 8 }),
    drawImage(...args) {
      calls.push(['drawImage', ...args]);
      if (api.failImage) throw new Error('Decoded image is temporarily unavailable');
    },
  };
  return new Proxy(api, {
    get(object, key) {
      if (key in object) return object[key];
      if (key in values) return values[key];
      return (...args) => {
        for (const value of args) if (typeof value === 'number') assert.ok(Number.isFinite(value), String(key));
        calls.push([key, ...args]);
      };
    },
    set(object, key, value) { if (key in object) object[key] = value; else values[key] = value; return true; },
  });
}

function makeGame(loadImage, Class = DreamGame) {
  const c = drawingContext(), events = [], hud = [], capEvents = [];
  const game = new Class({ getContext: () => c, getBoundingClientRect: () => ({ width: 1100, height: 640 }) }, {
    onEvent: event => events.push(event), onHud: snapshot => hud.push(snapshot), onCapEvent: event => capEvents.push(event),
  }, { loadImage });
  return { game, c, events, hud, capEvents };
}
function tick(game, count = 1) { for (let index = 0; index < count; index++) game.update(1 / 60); }
function render(fixture) {
  fixture.c.calls.length = 0;
  assert.doesNotThrow(() => fixture.game.render());
  assert.equal(fixture.c.stack.length, 0);
  return structuredClone(fixture.c.calls);
}
function simulation(game) {
  return JSON.stringify({
    snapshot: game.getSnapshot(), input: game.input, body: game.body, soul: game.soul,
    cap: game.cap, capScene: game.capScene, stationSignal: game.stationSignal,
    camera: game.camera, visualTime: game.visualTime, level: game.level,
    particles: game.particles, pulses: game.pulses, plates: [...game.plateState],
    awakenings: game.storyAwakenings, greeting: game.stationGreeting,
  });
}
const callbackCounts = fixture => [fixture.events.length, fixture.hud.length, fixture.capEvents.length];
function assertFallback(fixture) {
  const { game, c } = fixture, view = game.getSceneBackdropView(), time = game.options.reducedMotion ? 0 : game.visualTime;
  const expected = drawingContext();
  drawStationBackdrop(expected, view, time, game.options.reducedMotion);
  c.calls.length = 0; game.drawBackground(c, game.viewWidth, 640, time);
  // A failed image attempt may precede the complete procedural background.
  assert.deepEqual(c.calls.slice(-expected.calls.length), expected.calls);
  assert.equal(game.paintedFrame, false);
  expected.calls.length = 0; c.calls.length = 0;
  drawStationArchitecture(expected, game); game.drawArchitecture(c, time);
  assert.deepEqual(c.calls, expected.calls, 'v15 station windows and architecture remain the fallback');
  assert.equal(Object.hasOwn(game.getStoryNPCView(), 'lighting'), false);
  assert.equal(c.stack.length, 0); assert.equal(expected.stack.length, 0);
}
function collectTicket(game) {
  assert.equal(game.toggleSoul(), true);
  const ticket = game.memories[0];
  for (let frame = 0; frame < 240 && !ticket.collected; frame++) {
    game.setInput({ x: Math.max(-1, Math.min(1, (ticket.x - game.soul.x) / 60)), y: Math.max(-1, Math.min(1, (ticket.y - game.soul.y) / 60)) });
    tick(game);
  }
  game.setInput({ x: 0, y: 0 });
  assert.equal(ticket.collected, true, 'real flight input reaches the first ticket');
  assert.equal(game.firstTicket.phase, 'held');
}

test('the first story chapter requests its painting once, independently of the greenhouse', async () => {
  const sources = [], pending = deferred(), h = makeGame(src => { sources.push(src); return pending.promise; });
  await Promise.resolve(); assert.deepEqual(sources, []);
  assert.equal(h.game.paintedScenes.getSnapshot().status, 'idle');
  for (const options of otherScenes) {
    h.game.start({ sound: false, ...options }); await Promise.resolve();
    assert.equal(h.game.paintedScenes.getSnapshot().status, 'idle');
    assert.equal(h.game.getPaintedStationImage(), null);
  }
  h.game.start({ chapterIndex: 0, sound: false }); await Promise.resolve();
  assert.deepEqual(sources, [PAINTED_STATION_URL]);
  assert.equal(h.game.paintedScenes.getSnapshot().status, 'loading');
  const requested = h.game.paintedScenes.request(station);
  h.game.start({ chapterIndex: 1, sound: false });
  pending.resolve(image); assert.equal(await requested, true);
  assert.equal(await h.game.greenhouseScenes.request({ mode: 'story', chapterIndex: 1 }), true);
  render(h); assert.equal(h.game.paintedFrame, false); assert.equal(h.game.getPaintedStationImage(), null);
  assert.equal(h.game.greenhousePaintedFrame, true); assert.equal(h.game.getPaintedGreenhouseImage(), image);
  h.game.start({ chapterIndex: 0, sound: false }); render(h);
  assert.equal(h.game.getPaintedStationImage(), image); assert.equal(h.game.paintedFrame, true);
  assert.equal(h.c.calls.filter(call => call[0] === 'drawImage').length, 1);
  assert.deepEqual(sources, [PAINTED_STATION_URL, PAINTED_GREENHOUSE_URL]); h.game.destroy();
});

test('a ready first-chapter image cannot alter the final three chapters or ten festival draw sequences', async () => {
  const h = makeGame(() => image), base = makeGame(undefined, BaseGame);
  h.game.start({ sound: false }); await h.game.paintedScenes.request(station); render(h);
  for (const options of otherScenes) {
    h.game.start({ sound: false, ...options }); base.game.start({ sound: false, ...options });
    assert.deepEqual(render(h), render(base));
    assert.equal(h.game.paintedFrame, false); assert.equal(h.game.getPaintedStationImage(), null);
    const view = h.game.getStoryNPCView();
    if (view) assert.equal(Object.hasOwn(view, 'lighting'), false);
  }
  h.game.destroy(); base.game.destroy();
});

test('pending and rejected images retain v15 windows, the real plate, and the latched signal', async () => {
  for (const rejected of [false, true]) {
    const pending = deferred(); let loads = 0;
    const h = makeGame(() => { loads++; return pending.promise; });
    h.game.start({ sound: false }); await Promise.resolve();
    const requested = h.game.paintedScenes.request(station);
    if (rejected) { pending.reject(new Error('offline')); assert.equal(await requested, false); }
    assertFallback(h);
    h.game.setInput({ x: 1 });
    for (let frame = 0; frame < 180 && h.game.body.x < 420; frame++) tick(h.game);
    h.game.setInput({ x: 0 }); tick(h.game, 20);
    assert.equal(h.game.plateState.get('ticket'), true); assert.equal(h.game.stationSignal.amount, 1);
    assert.equal(h.game.barrierOpen(h.game.level.barriers[0]), true);
    assertFallback(h); const unlitWindows = structuredClone(h.c.calls);
    h.game.lightSeal(0); tick(h.game, 20); assertFallback(h);
    assert.notDeepEqual(h.c.calls, unlitWindows, 'the real first poem lamp still changes its fallback window');
    h.game.setInput({ x: -1 }); tick(h.game, 45); h.game.setInput({ x: 0 }); tick(h.game, 15);
    assert.equal(h.game.plateState.get('ticket'), false); assert.equal(h.game.stationSignal.amount, 1);
    assert.equal(h.game.barrierOpen(h.game.level.barriers[0]), true); assert.equal(loads, 1);
    h.game.destroy(); if (!rejected) { pending.resolve(image); assert.equal(await requested, false); }
  }
});

test('draw failures recover complete v15 fallback and remove only painted NPC lighting without touching the simulation', async () => {
  const h = makeGame(() => image); h.game.start({ sound: false });
  await h.game.paintedScenes.request(station); render(h);
  assert.equal(h.game.paintedFrame, true); assert.equal(h.game.getStoryNPCView().lighting, 'painted-station');
  const before = simulation(h.game), callbacks = callbackCounts(h);
  h.c.failImage = true; render(h); assertFallback(h);
  assert.equal(simulation(h.game), before); assert.deepEqual(callbackCounts(h), callbacks);
  assert.equal(h.game.paintedScenes.getSnapshot().status, 'ready');
  h.c.failImage = false; render(h);
  assert.equal(h.game.paintedFrame, true); assert.equal(h.game.getStoryNPCView().lighting, 'painted-station');
  assert.equal(simulation(h.game), before); assert.deepEqual(callbackCounts(h), callbacks); h.game.destroy();
});

test('real flight collects a ticket while loading and late readiness cannot advance its paused homecoming or award it twice', async () => {
  const pending = deferred(), h = makeGame(() => pending.promise);
  h.game.start({ sound: false }); await Promise.resolve(); collectTicket(h.game);
  assert.equal(h.game.recall(), true); tick(h.game, 10);
  assert.equal(h.game.firstTicket.phase, 'returning'); assert.equal(h.game.pause(), true);
  const before = simulation(h.game), callbacks = callbackCounts(h);
  pending.resolve(image); assert.equal(await h.game.paintedScenes.request(station), true);
  render(h); tick(h.game, 120); render(h);
  assert.equal(simulation(h.game), before); assert.deepEqual(callbackCounts(h), callbacks);
  const frame = render(h); assert.deepEqual(render(h), frame, 'paused rendering remains deterministic after readiness');
  assert.equal(h.game.resume(), true); tick(h.game, 60);
  assert.equal(h.game.firstTicket.phase, 'stowed'); assert.equal(h.game.getSnapshot().memories, 1);
  assert.equal(h.capEvents.filter(event => event.type === 'memory' && event.index === 0).length, 1);
  assert.equal(h.game.stationGreeting.greeting, 'welcome'); h.game.destroy();
});

test('restart reuses the image and preserves the saved-ticket display without manufacturing current-run memories', async () => {
  let loads = 0; const h = makeGame(() => { loads++; return image; });
  h.game.start({ sound: false }); await h.game.paintedScenes.request(station); collectTicket(h.game);
  h.game.recall(); tick(h.game, 60); h.game.lightSeal(0); tick(h.game, 20); h.game.restart();
  render(h); assert.equal(loads, 1); assert.equal(h.game.getPaintedStationImage(), image);
  assert.equal(h.game.firstTicket.phase, 'stowed'); assert.equal(h.game.firstTicket.newlyCollected, false);
  assert.equal(h.game.getSnapshot().memories, 0); assert.equal(h.game.getSnapshot().seals, 0);
  assert.equal(h.game.stationSignal.amount, 0); assert.equal(h.game.stationGreeting.greeting, 'settled');
  h.game.start({ chapterIndex: 1, sound: false, firstTicketCollected: true }); render(h);
  assert.equal(h.game.greenhousePlant.pot, 'ticket'); assert.equal(h.game.greenhousePlant.stage, 0);
  assert.equal(h.game.getPaintedStationImage(), null); assert.equal(h.game.paintedFrame, false); h.game.destroy();
});

test('destruction before and after the loader begins makes late success and failure inert', async () => {
  for (const loaderStarted of [false, true]) for (const fails of [false, true]) {
    const pending = deferred(); let loads = 0;
    const h = makeGame(() => { loads++; return pending.promise; }); h.game.start({ sound: false });
    const requested = h.game.paintedScenes.request(station);
    if (loaderStarted) await Promise.resolve();
    h.game.destroy(); h.c.calls.length = 0;
    const callbacks = callbackCounts(h), frames = requestedFrames;
    if (fails && loaderStarted) pending.reject(new Error('late decode failure')); else pending.resolve(image);
    assert.equal(await requested, false); assert.equal(loads, loaderStarted ? 1 : 0);
    h.game.start({ sound: false }); h.game.update(1 / 60); h.game.render();
    assert.equal(h.game.state, 'destroyed'); assert.equal(h.game.paintedFrame, false);
    assert.equal(h.game.getPaintedStationImage(), null); assert.equal(h.game.paintedScenes.getSnapshot().status, 'destroyed');
    assert.deepEqual(h.c.calls, []); assert.deepEqual(callbackCounts(h), callbacks); assert.equal(requestedFrames, frames);
  }
});

test('a pause callback may switch chapters or destroy the run while an image is pending without a late completion overwriting it', async () => {
  for (const action of ['start', 'destroy']) {
    const pending = deferred(), h = makeGame(() => pending.promise); h.game.start({ sound: false });
    await Promise.resolve(); collectTicket(h.game);
    let calls = 0;
    h.game.callbacks.onPause = () => {
      calls++;
      if (action === 'start') h.game.start({ chapterIndex: 1, sound: false, firstTicketCollected: true });
      else h.game.destroy();
    };
    const requested = h.game.paintedScenes.request(station); h.game.pause(); assert.equal(calls, 1);
    const before = simulation(h.game), callbacks = callbackCounts(h), frames = requestedFrames;
    pending.resolve(image); assert.equal(await requested, action === 'start'); render(h);
    assert.equal(simulation(h.game), before); assert.deepEqual(callbackCounts(h), callbacks);
    assert.equal(requestedFrames, frames); assert.equal(h.game.paintedFrame, false); assert.equal(h.game.getPaintedStationImage(), null);
    if (action === 'start') {
      assert.equal(h.game.chapterIndex, 1); assert.equal(h.game.state, 'playing');
      assert.equal(h.game.greenhousePlant.pot, 'ticket'); assert.equal(h.game.getSnapshot().memories, 0);
    } else assert.equal(h.game.state, 'destroyed');
    h.game.destroy();
  }
});

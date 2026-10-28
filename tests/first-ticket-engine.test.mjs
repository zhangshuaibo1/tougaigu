import test from 'node:test';
import assert from 'node:assert/strict';
import { DreamGame } from '../dist/dream-engine.js';

const noop = () => {};
globalThis.window = { devicePixelRatio: 1, addEventListener: noop, removeEventListener: noop };
globalThis.document = { hidden: false, addEventListener: noop, removeEventListener: noop };
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = noop;

function makeGame(options = {}) {
  const events = [], hud = [];
  const context = new Proxy({
    globalAlpha: 1,
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    measureText: text => ({ width: String(text).length * 10 }),
  }, { get: (object, key) => key in object ? object[key] : noop });
  const game = new DreamGame({
    getContext: () => context,
    getBoundingClientRect: () => ({ width: 1100, height: 620 }),
  }, { onCapEvent: event => events.push(event), onHud: snapshot => hud.push(snapshot) });
  game.start({ chapterIndex: 0, sound: false, ...options });
  return { game, events, hud };
}
function tick(game, frames = 1) { for (let i = 0; i < frames; i++) game.update(1 / 60); }
function memoryEvents(events) { return events.filter(event => event.type === 'memory' && event.index === 0); }

// Use ordinary controls and the real collection radius, from the authored
// spawn to the authored ticket. No direct call to rememberInCap is involved.
function collectBySoul(game) {
  assert.equal(game.form, 'body'); assert.equal(game.memories[0].collected, false);
  assert.equal(game.toggleSoul(), true);
  const target = game.memories[0];
  for (let frame = 0; frame < 240 && !target.collected; frame++) {
    const dx = target.x - game.soul.x, dy = target.y - game.soul.y;
    game.setInput({ x: Math.max(-1, Math.min(1, dx / 60)), y: Math.max(-1, Math.min(1, dy / 60)) });
    game.update(1 / 60);
  }
  game.setInput({ x: 0, y: 0 });
  assert.equal(target.collected, true, 'An ordinary flight must reach the first ticket');
  assert.equal(game.form, 'soul');
  tick(game, 20);
}

test('a new visit never puts an uncollected ticket in the head or in the hands', () => {
  const { game, events } = makeGame();
  assert.equal(game.firstTicket.phase, 'missing'); assert.equal(game.firstTicket.collected, false);
  assert.equal(game.capScene.firstTicket, false); assert.equal(game.getSnapshot().memories, 0);
  game.toggleSoul(); tick(game, 45); game.render();
  assert.equal(game.firstTicket.phase, 'missing'); assert.equal(game.capScene.firstTicket, false);
  game.recall(); tick(game, 50); game.render();
  assert.equal(game.firstTicket.phase, 'missing'); assert.equal(memoryEvents(events).length, 0);
  game.destroy();
});

test('actual soul flight collects one ticket and holds it until the return reaches the head', () => {
  const { game, events } = makeGame(); collectBySoul(game);
  assert.equal(game.firstTicket.phase, 'held'); assert.equal(game.firstTicket.newlyCollected, true);
  assert.equal(game.options.firstTicketCollected, true); assert.equal(game.capScene.firstTicket, false);
  assert.equal(game.getSnapshot().memories, 1); assert.equal(memoryEvents(events).length, 1);
  assert.equal(game.thoughtFlights.length, 0, 'The held ticket must not also become a flying memory particle');
  assert.match(game.getFirstTicketHint(), /E/);
  game.recall(); assert.equal(game.firstTicket.phase, 'returning');
  tick(game, 28); assert.equal(game.firstTicket.phase, 'returning'); assert.equal(game.capScene.firstTicket, false);
  assert.ok(game.getSoulPresentation(), 'The ticket is still on the visible returning soul before arrival');
  tick(game, 1); assert.equal(game.firstTicket.phase, 'stowed'); assert.equal(game.capScene.firstTicket, true);
  assert.equal(game.getSoulPresentation(), null);
  tick(game, 25); game.toggleSoul(); tick(game, 45); game.render();
  assert.equal(game.firstTicket.phase, 'stowed'); assert.equal(game.capScene.firstTicket, true);
  assert.equal(memoryEvents(events).length, 1, 'Showing the ticket again is not another collection');
  game.destroy();
});

test('the ordinary body jump can collect the same ticket and stores it immediately', () => {
  const { game, events } = makeGame();
  game.setInput({ x: 1, y: 0 }); assert.equal(game.jump(), true);
  for (let frame = 0; frame < 90 && !game.memories[0].collected; frame++) game.update(1 / 60);
  game.setInput({ x: 0, y: 0 });
  assert.equal(game.memories[0].collected, true, 'Walk and jump must still collect the optional first memory');
  assert.equal(game.form, 'body'); assert.equal(game.firstTicket.phase, 'stowed');
  assert.equal(game.capScene.firstTicket, true); assert.equal(game.options.firstTicketCollected, true);
  assert.equal(memoryEvents(events).length, 1);
  game.toggleSoul(); tick(game, 45); assert.equal(game.firstTicket.phase, 'stowed');
  game.destroy();
});

test('pause freezes the held ticket, its returning flight and the arrival hint clock', () => {
  const { game } = makeGame(); collectBySoul(game);
  game.pause(); const held = structuredClone(game.firstTicket); tick(game, 180); game.render();
  assert.deepEqual(game.firstTicket, held); assert.equal(game.recall(), false);
  game.resume(); game.recall(); tick(game, 10); game.pause();
  const returning = structuredClone(game.firstTicket), pose = game.getSoulPresentation(), cap = structuredClone(game.cap);
  tick(game, 180); game.render(); assert.deepEqual(game.firstTicket, returning);
  assert.deepEqual(game.getSoulPresentation(), pose); assert.deepEqual(game.cap, cap);
  game.resume(); tick(game, 40); assert.equal(game.firstTicket.phase, 'stowed');
  game.pause(); const stowed = structuredClone(game.firstTicket); tick(game, 180);
  assert.deepEqual(game.firstTicket, stowed); game.destroy();
});

test('rapid E interruption keeps a single held ticket, then deposits it on the final return', () => {
  const { game, events } = makeGame(); collectBySoul(game);
  for (let i = 0; i < 10; i++) {
    game.recall(); tick(game, 8); assert.equal(game.firstTicket.phase, 'returning');
    game.toggleSoul(); assert.equal(game.firstTicket.phase, 'held'); assert.equal(game.capScene.firstTicket, false);
    tick(game, 15); game.render();
  }
  game.recall(); tick(game, 50);
  assert.equal(game.firstTicket.phase, 'stowed'); assert.equal(game.capScene.firstTicket, true);
  assert.equal(memoryEvents(events).length, 1); assert.equal(game.getSnapshot().memories, 1);
  game.destroy();
});

test('energy exhaustion carries the ticket home and starts recovery without another memory event', () => {
  const { game, events } = makeGame(); collectBySoul(game);
  game.energy = .001; tick(game);
  assert.equal(game.form, 'body'); assert.equal(game.firstTicket.phase, 'returning');
  tick(game, 50); assert.equal(game.firstTicket.phase, 'stowed');
  assert.equal(game.capScene.firstTicket, true); assert.ok(game.energy > 10);
  assert.equal(memoryEvents(events).length, 1); game.destroy();
});

test('reduced motion stores the ticket on recall without a return flight', () => {
  const { game, events } = makeGame({ reducedMotion: true }); collectBySoul(game);
  assert.equal(game.firstTicket.phase, 'held'); assert.equal(game.capScene.firstTicket, false);
  game.recall(); assert.equal(game.firstTicket.phase, 'stowed'); assert.equal(game.capScene.firstTicket, true);
  assert.equal(game.getSoulPresentation(), null); assert.equal(game.cap.phase, 'closed');
  assert.equal(memoryEvents(events).length, 1); game.destroy();
});

test('enabling reduced motion during the return deposits the ticket and never replays the flight', () => {
  const { game, events } = makeGame(); collectBySoul(game); game.recall(); tick(game, 10);
  assert.equal(game.firstTicket.phase, 'returning'); game.setReducedMotion(true);
  assert.equal(game.firstTicket.phase, 'stowed'); assert.equal(game.capScene.firstTicket, true);
  assert.equal(game.getSoulPresentation(), null); game.setReducedMotion(false); tick(game, 60);
  assert.equal(game.firstTicket.phase, 'stowed'); assert.equal(memoryEvents(events).length, 1);
  game.destroy();
});

test('reduced motion during a paused return publishes the final stored state without waiting for resume', () => {
  const { game, hud } = makeGame(); collectBySoul(game); game.recall(); tick(game, 10); game.pause();
  assert.equal(game.firstTicket.phase, 'returning');
  game.setReducedMotion(true);
  assert.equal(game.state, 'paused'); assert.equal(game.firstTicket.phase, 'stowed');
  assert.equal(hud.at(-1).firstTicket.phase, 'stowed', 'Paused settings need a final HUD, because the frame clock is frozen');
  assert.equal(hud.at(-1).firstTicket.collected, true); game.destroy();
});

test('fall recovery safely stows held or returning tickets while preserving real collection', () => {
  for (const returning of [false, true]) {
    const { game, events } = makeGame(); collectBySoul(game);
    if (returning) { game.recall(); tick(game, 10); }
    game.body.y = 730; tick(game);
    assert.equal(game.form, 'body'); assert.equal(game.deaths, 1); assert.equal(game.cap.phase, 'closed');
    assert.equal(game.firstTicket.phase, 'stowed'); assert.equal(game.capScene.firstTicket, true);
    assert.equal(game.memories[0].collected, true); assert.equal(memoryEvents(events).length, 1);
    game.destroy();
  }
});

test('finishing during a return stores the ticket before completion and clears its flight', () => {
  const { game, events } = makeGame(); collectBySoul(game);
  game.lightSeal(0); game.lightSeal(1); game.recall();
  Object.assign(game.body, { x: game.level.exit.x, y: game.level.exit.y, vx: 0, vy: 0 });
  tick(game); assert.equal(game.state, 'complete'); assert.equal(game.firstTicket.phase, 'stowed');
  assert.equal(game.capScene.firstTicket, true); assert.equal(game.getSoulPresentation(), null);
  assert.equal(memoryEvents(events).length, 1); game.destroy();
});

test('restart retains the earned display but resets this run memory counter and never fakes a collection', () => {
  const { game, events } = makeGame(); collectBySoul(game); game.restart();
  assert.equal(game.firstTicket.phase, 'stowed'); assert.equal(game.firstTicket.newlyCollected, false);
  assert.equal(game.capScene.firstTicket, true); assert.equal(game.options.firstTicketCollected, true);
  assert.equal(game.getSnapshot().memories, 0); assert.equal(game.memories[0].collected, false);
  assert.equal(memoryEvents(events).length, 1);
  collectBySoul(game); assert.equal(game.getSnapshot().memories, 1); assert.equal(memoryEvents(events).length, 2);
  game.recall(); tick(game, 50); assert.equal(game.firstTicket.phase, 'stowed'); game.destroy();
});

test('a saved collection restores only the display, with no held ticket, memory count or earned event', () => {
  const { game, events } = makeGame({ firstTicketCollected: true });
  assert.equal(game.firstTicket.phase, 'stowed'); assert.equal(game.capScene.firstTicket, true);
  assert.equal(game.firstTicket.newlyCollected, false); assert.equal(game.getSnapshot().memories, 0);
  game.toggleSoul(); tick(game, 45); game.render();
  assert.equal(game.firstTicket.phase, 'stowed'); assert.equal(memoryEvents(events).length, 0);
  game.destroy();
  for (const value of [false, 1, 'true', null]) {
    const { game: fresh } = makeGame({ firstTicketCollected: value });
    assert.equal(fresh.firstTicket.collected, false); assert.equal(fresh.capScene.firstTicket, false);
    fresh.destroy();
  }
});

test('other chapters and all ten festivals keep their own first-memory behavior', () => {
  const options = [1, 2, 3, 4, 5].map(chapterIndex => ({ chapterIndex }));
  for (const id of ['halloween', 'thanksgiving', 'christmas', 'newyear', 'spring', 'lantern', 'valentine', 'dragonboat', 'qixi', 'midautumn']) options.push({ festival: { id } });
  for (const option of options) {
    const { game, events } = makeGame({ ...option, firstTicketCollected: true });
    assert.equal(game.firstTicket.collected, false); assert.equal(game.capScene.firstTicket, false);
    assert.equal(game.getSnapshot().firstTicket, null);
    // Each chapter's real target coordinates differ. Start beside its first
    // memory, then let the regular update collect it; never call the ticket helper.
    const target = game.memories[0];
    Object.assign(game.body, { x: target.x, y: 560, vx: 0, vy: 0 });
    game.toggleSoul(); Object.assign(game.soul, { x: target.x, y: target.y, vx: 0, vy: 0 }); tick(game);
    assert.equal(target.collected, true); assert.equal(memoryEvents(events).length, 1);
    assert.equal(game.firstTicket.collected, false); assert.equal(game.capScene.firstTicket, false);
    game.recall(); tick(game, 50); assert.equal(game.firstTicket.phase, 'missing'); game.destroy();
  }
});

test('HUD snapshots cannot mutate the live ticket or issue duplicate collection events', () => {
  const { game, events } = makeGame(); collectBySoul(game);
  const snapshot = game.getSnapshot(); snapshot.firstTicket.phase = 'stowed'; snapshot.firstTicket.collected = false;
  assert.equal(game.firstTicket.phase, 'held'); assert.equal(game.firstTicket.collected, true);
  for (let i = 0; i < 6; i++) { game.emitHud(); game.render(); tick(game, 10); }
  assert.equal(memoryEvents(events).length, 1); game.destroy();
});

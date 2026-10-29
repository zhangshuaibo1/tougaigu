import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { DreamGame } from '../dist/dream-engine.js';
import { CHAPTERS } from '../dist/dream-story.js';
import { getStageObjective, getStageActions, formatControlHint } from '../dist/dream-ui.js';
import { getCapActivity } from '../dist/dream-cap-activities.js';

const noop = () => {};
globalThis.window = { devicePixelRatio: 1, addEventListener: noop, removeEventListener: noop };
globalThis.document = { hidden: false, addEventListener: noop, removeEventListener: noop };
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = noop;

// Execute the entire production callback, including its real early return. Do
// not copy its energy code into a helper or alter its gate for the regression.
// Only unrelated DOM/shell plumbing and the wall clock are test doubles.
const appSource = readFileSync(new URL('../dist/dream-app.js', import.meta.url), 'utf8');
const handlerStart = appSource.indexOf('\nfunction onHud(snapshot) {');
const handlerEnd = appSource.indexOf('\nfunction announce(', handlerStart);
assert.ok(handlerStart >= 0 && handlerEnd > handlerStart, 'Find the actual complete onHud callback');
const handlerSource = appSource.slice(handlerStart, handlerEnd);
const energyIds = new Set(['stage-energy', 'stage-energy-label', 'stage-energy-meter']);

function makeHud() {
  const nodes = new Map(), writes = [];
  let clock = 1000;
  function node(id) {
    if (nodes.has(id)) return nodes.get(id);
    const properties = {}, attributes = new Map();
    const element = { dataset: {}, classList: { toggle: noop } };
    for (const key of ['textContent', 'innerHTML', 'hidden']) {
      properties[key] = key === 'hidden' ? false : '';
      Object.defineProperty(element, key, {
        get: () => properties[key],
        set(value) { properties[key] = value; writes.push({ id, key, value }); },
      });
    }
    element.style = new Proxy({}, {
      set(target, key, value) {
        target[key] = value;
        writes.push({ id, key: 'style.' + key, value });
        return true;
      },
    });
    element.getAttribute = name => attributes.get(name) ?? null;
    element.setAttribute = (name, value) => {
      attributes.set(name, String(value));
      writes.push({ id, key: name, value: String(value) });
    };
    nodes.set(id, element);
    return element;
  }
  const select = selector => {
    if (selector === 'dialog[open]') return null;
    assert.match(selector, /^#[\w-]+$/);
    return node(selector.slice(1));
  };
  const environment = {
    $: select, document: { querySelector: select, body: { classList: { toggle: noop } } },
    performance: { now: () => clock }, currentHud: null, lastHudAt: 0,
    hub: null, runSessionId: 'energy-regression', shellOverlayOpen: false,
    settled: false, activePuzzle: null, pendingTalk: false, currentFestival: null,
    lostSave: null, getLostRecord: () => null, renderLostEvidence: noop,
    CHAPTERS, getStageObjective, getStageActions, getCapActivity,
    controlSource: 'buttons', updateShell: noop, resetInput: noop,
    timeLabel: seconds => String(seconds),
    controlHint: (text, snapshot) => formatControlHint(text, 'buttons', getStageActions(snapshot)),
  };
  const onHud = runInNewContext(handlerSource + '\nonHud;', environment, { filename: 'dist/dream-app.js:onHud' });
  return {
    onHud, node, writes, environment,
    setClock: value => { clock = value; },
    getClock: () => clock,
    energyWrites: () => writes.filter(write => energyIds.has(write.id)),
    objectiveWrites: () => writes.filter(write => write.id === 'stage-objective').length,
  };
}

function checkEnergy(hud, snapshot) {
  const percent = Math.max(0, Math.min(100, snapshot.energy / Math.max(1, snapshot.maxEnergy) * 100));
  const rounded = Math.ceil(percent);
  const label = snapshot.form === 'soul' ? `灵光 ${rounded}%` : percent < 99 ? `恢复中 ${rounded}%` : '灵光充足';
  assert.ok(Math.abs(parseFloat(hud.node('stage-energy').style.width) - percent) < .0001,
    `Energy fill must follow this callback: ${hud.node('stage-energy').style.width} versus ${percent}%`);
  assert.equal(hud.node('stage-energy').style.background, percent < 25 ? 'var(--dream-orange)' : 'var(--dream-mint)');
  assert.equal(hud.node('stage-energy-label').textContent, label);
  assert.equal(hud.node('stage-energy-meter').getAttribute('aria-valuenow'), String(rounded));
  assert.equal(hud.node('stage-energy-meter').getAttribute('aria-valuetext'), label.includes('%') ? label : `${label} ${rounded}%`);
  assert.strictEqual(hud.environment.currentHud, snapshot, 'The whole group refers to the latest actual engine snapshot');
}

function makeGame(hud) {
  const observations = [];
  const context = new Proxy({
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    measureText: text => ({ width: String(text).length * 10 }),
  }, { get: (object, key) => key in object ? object[key] : noop });
  const game = new DreamGame({
    getContext: () => context,
    getBoundingClientRect: () => ({ width: 320, height: 431 }),
  }, { onHud(snapshot) {
    const previous = hud.environment.currentHud;
    const gated = hud.getClock() - hud.environment.lastHudAt < 80 && previous?.form === snapshot.form && previous?.gifts === snapshot.gifts && snapshot.state === 'playing';
    const before = hud.objectiveWrites();
    const unchanged = structuredClone(snapshot);
    hud.onHud(snapshot);
    checkEnergy(hud, snapshot);
    assert.deepEqual(snapshot, unchanged, 'Presentation must not change the engine snapshot');
    assert.equal(hud.objectiveWrites() - before, gated ? 0 : 1, 'Expensive HUD work must retain its existing gate');
    observations.push({ clock: hud.getClock(), snapshot, gated });
  } });
  // These tests exercise real frame stepping, ordinary controls and the existing
  // callback cadence. Painting is unrelated; no extra HUD polling is introduced.
  game.render = noop;
  game.start({ chapterIndex: 0, sound: false });
  return { game, observations };
}

test('production onHud synchronizes each real catch-up snapshot at the same wall time while other HUD stays gated', t => {
  const hud = makeHud(), { game, observations } = makeGame(hud);
  let timestamp = 0;
  const frame = interval => {
    timestamp += interval;
    hud.setClock(1000 + timestamp);
    game.frame(timestamp);
  };
  try {
    game.frame(timestamp);
    assert.equal(game.toggleSoul(), true);
    for (let i = 0; i < 1800 && game.energy > 40; i++) frame(1000 / 60);
    assert.equal(game.form, 'soul');
    assert.ok(game.energy <= 40 && game.energy > 39);
    assert.equal(game.recall(), true);
    const recoveryStart = observations.length;
    let maxLiveDifference = 0;
    for (let i = 0; i < 16; i++) {
      frame(200);
      const displayed = Number(hud.node('stage-energy-meter').getAttribute('aria-valuenow'));
      maxLiveDifference = Math.max(maxLiveDifference, Math.abs(displayed - game.energy));
    }
    const recovery = observations.slice(recoveryStart);
    const sameClockChanges = recovery.filter((row, i) => i > 0 && row.clock === recovery[i - 1].clock && row.snapshot.energy !== recovery[i - 1].snapshot.energy);
    assert.ok(sameClockChanges.length >= 8, 'Exercise multiple genuine 100ms simulation callbacks inside 200ms frames');
    assert.ok(sameClockChanges.every(row => row.gated), 'The second callback really takes the production early return');
    assert.ok(maxLiveDifference <= 3, `Recovery HUD must stay close to live energy, maximum difference ${maxLiveDifference}`);
    assert.equal(game.deaths, 0);
    assert.equal(game.state, 'playing');
    assert.equal(game.form, 'body');
    t.diagnostic(`${sameClockChanges.length} same-clock energy changes across 16 recovery frames; largest live HUD difference ${maxLiveDifference.toFixed(4)} percentage points`);
  } finally { game.destroy(); }
});

test('real low-energy and recovery callbacks update color, visible text and ARIA together through the gate', () => {
  const hud = makeHud(), { game, observations } = makeGame(hud);
  let timestamp = 0;
  try {
    game.frame(timestamp);
    assert.equal(game.toggleSoul(), true);
    for (let i = 0; i < 100 && game.energy >= 24; i++) {
      timestamp += 200;
      hud.setClock(1000 + timestamp);
      game.frame(timestamp);
    }
    assert.equal(game.form, 'soul');
    assert.ok(game.energy < 24);
    assert.equal(hud.node('stage-energy').style.background, 'var(--dream-orange)');
    assert.match(hud.node('stage-energy-label').textContent, /^灵光 2\d%$/);
    assert.equal(game.recall(), true);
    assert.match(hud.node('stage-energy-label').textContent, /^恢复中 2\d%$/);
    for (let i = 0; i < 3; i++) {
      timestamp += 200;
      hud.setClock(1000 + timestamp);
      game.frame(timestamp);
    }
    assert.equal(hud.node('stage-energy').style.background, 'var(--dream-mint)');
    assert.ok(observations.some(row => row.gated && row.snapshot.energy < 25 && row.snapshot.form === 'soul'));
    assert.ok(observations.some(row => row.gated && row.snapshot.energy > 25 && row.snapshot.form === 'body'));
  } finally { game.destroy(); }
});

test('unchanged real snapshots do not rewrite the energy group, and same-energy form changes keep complete labels', () => {
  const hud = makeHud(), { game } = makeGame(hud);
  try {
    assert.equal(hud.node('stage-energy-label').textContent, '灵光充足');
    assert.equal(hud.node('stage-energy-meter').getAttribute('aria-valuetext'), '灵光充足 100%');
    const initialWrites = hud.energyWrites().length;
    game.emitHud();
    assert.equal(hud.energyWrites().length, initialWrites);
    assert.equal(game.toggleSoul(), true);
    assert.equal(hud.node('stage-energy-label').textContent, '灵光 100%');
    assert.equal(hud.node('stage-energy-meter').getAttribute('aria-valuetext'), '灵光 100%');
    game.frame(0);
    hud.setClock(1200);
    game.frame(200);
    hud.setClock(1400);
    game.frame(400);
    const writesBeforeRepeat = hud.energyWrites().length;
    const heavyBeforeRepeat = hud.objectiveWrites();
    game.emitHud();
    const settledWrites = hud.energyWrites().length;
    // The forced snapshot may be newer than the latest periodic callback; its
    // immediate repeat has exactly the same fractional energy and form.
    game.emitHud();
    assert.equal(hud.energyWrites().length, settledWrites);
    assert.ok(settledWrites >= writesBeforeRepeat);
    assert.equal(hud.objectiveWrites(), heavyBeforeRepeat);
    assert.equal(game.recall(), true);
    assert.match(hud.node('stage-energy-label').textContent, /^恢复中 \d+%$/);
    assert.equal(game.deaths, 0);
  } finally { game.destroy(); }
});

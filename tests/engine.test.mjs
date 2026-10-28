import test from 'node:test';
import assert from 'node:assert/strict';
import { ArenaGame, createRng, getPlayerStats, makeUpgradeChoices, UPGRADE_CAPS } from '../dist/engine.js';

// A canvas sink tests the actual simulation without adding controls to the shipped game.
const noop = () => {};
globalThis.window = { devicePixelRatio: 1, addEventListener: noop, removeEventListener: noop };
globalThis.document = { hidden: false, addEventListener: noop, removeEventListener: noop };
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = noop;
const context = new Proxy({ createRadialGradient: () => ({ addColorStop: noop }) }, {
  get(target, key) { return key in target ? target[key] : noop; },
});
function makeGame(options = {}, callbacks = {}) {
  const game = new ArenaGame({ getContext: () => context, getBoundingClientRect: () => ({ width: 960, height: 600 }) }, callbacks);
  game.start({ seed: 'test-seed', sound: false, ...options });
  return game;
}
function simulate(game, seconds) {
  for (let tick = 0; tick < seconds * 60 && game.state !== 'ended'; tick++) {
    if (game.state === 'upgrade') game.chooseUpgrade(game.pendingChoices[0]);
    game.setInput({ x: Math.sin(tick / 160) * .4, y: Math.cos(tick / 160) * .4 });
    game.update(1 / 60);
  }
  return { time: game.time, kills: game.kills, xp: game.xp, level: game.level, hp: game.player.hp, upgrades: game.upgrades, enemies: game.enemies.map(e => [e.kind, e.x, e.y, e.hp]) };
}

test('seeded runs reproduce; different seeds produce different sequences', () => {
  const a = createRng('today'), b = createRng('today'), c = createRng('tomorrow');
  const values = Array.from({ length: 50 }, a);
  assert.deepEqual(values, Array.from({ length: 50 }, b));
  assert.notDeepEqual(values, Array.from({ length: 50 }, c));
  assert.ok(values.every(x => x >= 0 && x < 1));
});

test('upgrade offers never repeat an option or offer a capped upgrade', () => {
  const ranks = { ...UPGRADE_CAPS, damage: 4, orbit: 3 };
  assert.deepEqual(makeUpgradeChoices(ranks, createRng('upgrade')).sort(), ['damage', 'orbit']);
  assert.deepEqual(makeUpgradeChoices(UPGRADE_CAPS, createRng('complete')), []);
});

test('daily mode excludes permanent advantages while preserving hero identity', () => {
  const meta = { damage: 5, vitality: 5, haste: 5, magnet: 5, luck: 5 };
  const daily = makeGame({ mode: 'daily', characterId: 'witch', meta });
  const normal = makeGame({ mode: 'standard', characterId: 'witch', meta });
  assert.equal(daily.stats.maxHp, 85);
  assert.equal(daily.upgrades.orbit, 1);
  assert.equal(normal.stats.maxHp, 125);
  assert.equal(normal.stats.damage, 17 * 1.2);
  assert.equal(normal.stats.interval, .72 / 1.15);
  assert.equal(normal.stats.pickup, 116);
  assert.equal(normal.stats.xpMultiplier, 1.1);
  daily.destroy(); normal.destroy();
});

test('reduced motion changes only visuals, not the deterministic daily simulation', () => {
  const a = makeGame({ mode: 'daily', reducedMotion: false });
  const b = makeGame({ mode: 'daily', reducedMotion: true });
  assert.deepEqual(simulate(a, 35), simulate(b, 35));
  a.destroy(); b.destroy();
});

test('pause freezes time; long resumed frames cannot teleport the player', () => {
  const g = makeGame();
  g.setInput({ x: 1, y: 0 }); g.pause(); const x = g.player.x;
  g.update(1); assert.equal(g.time, 0); assert.equal(g.player.x, x);
  g.resume(); g.setInput({ x: 1, y: 0 }); g.update(5);
  assert.equal(g.time, .04); assert.ok(g.player.x < 10);
  assert.equal(g.dash(), true); assert.equal(g.dash(), false);
  g.destroy();
});

test('a level-up grants exactly one valid choice and vitality heals correctly', () => {
  const g = makeGame(); g.player.hp = 40; g.levelUp();
  const before = { ...g.upgrades };
  assert.equal(g.chooseUpgrade('not-a-card'), false); assert.deepEqual(g.upgrades, before);
  const id = g.pendingChoices[0]; assert.equal(g.chooseUpgrade(id), true);
  assert.equal(g.upgrades[id], before[id] + 1); assert.equal(g.chooseUpgrade(id), false);
  const stats = getPlayerStats('bone', {}, { vitality: 2 }); assert.equal(stats.maxHp, 154);
  g.destroy();
});

test('damage invulnerability prevents a crowd applying damage in the same frame', () => {
  const g = makeGame(); const hp = g.player.hp;
  g.hurt(10); g.hurt(10); assert.equal(g.player.hp, hp - 10);
  g.destroy();
});

test('third boss completion reports victory once; endless mode stays playable', () => {
  const results = []; const g = makeGame({}, { onEnd: result => results.push(result) });
  for (let n = 0; n < 3; n++) { g.spawnBoss(); g.hit(g.enemies.find(e => e.boss && !e.dead), 10000); }
  assert.equal(g.state, 'ended'); assert.equal(results.length, 1); assert.equal(results[0].won, true); assert.equal(results[0].bosses, 3);
  g.finish(false); assert.equal(results.length, 1);
  const endless = makeGame({ mode: 'endless' });
  for (let n = 0; n < 3; n++) { endless.spawnBoss(); endless.hit(endless.enemies.find(e => e.boss && !e.dead), 10000); }
  assert.equal(endless.state, 'playing');
  g.destroy(); endless.destroy();
});

test('drop compaction bounds entity counts and conserves accumulated XP', () => {
  const g = makeGame(); g.gems = Array.from({ length: 305 }, (_, i) => ({ x: 1000 + i, y: 1000, value: i % 3 + 1 }));
  const total = g.gems.reduce((n, gem) => n + gem.value, 0); g.update(.01);
  assert.ok(g.gems.length <= 300); assert.equal(g.gems.reduce((n, gem) => n + gem.value, 0), total);
  g.destroy();
});

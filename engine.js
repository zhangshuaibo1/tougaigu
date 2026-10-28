/* Tougaigu — a deterministic, dependency-free arena simulation and renderer. */
const TAU = Math.PI * 2;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const mix = (a, b, t) => a + (b - a) * t;
const COLORS = { ink: '#171321', bone: '#f4ddb2', orange: '#ff905c', mint: '#8ee1c1', lilac: '#b29aee', rose: '#f47c98' };

export const UPGRADE_CAPS = Object.freeze({ damage: 5, haste: 5, speed: 5, vitality: 5, regen: 5, magnet: 5, multishot: 3, pierce: 3, crit: 5, orbit: 4, lightning: 4, blast: 4, freeze: 4, vampirism: 5, shield: 4, luck: 5, range: 5, size: 5 });
const HEROES = { bone: { hp: 110, damage: 20, speed: 185, interval: .68, dash: 4.2, crit: .08 }, witch: { hp: 85, damage: 17, speed: 180, interval: .72, dash: 4.2, crit: .08 }, rogue: { hp: 90, damage: 17, speed: 215, interval: .61, dash: 3.2, crit: .16 } };

export function createRng(seed) {
  let state = 2166136261;
  for (const c of String(seed)) state = Math.imul(state ^ c.charCodeAt(0), 16777619);
  return function () {
    state |= 0; state = state + 0x6D2B79F5 | 0;
    let n = Math.imul(state ^ state >>> 15, 1 | state);
    n = n + Math.imul(n ^ n >>> 7, 61 | n) ^ n;
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}

export function makeUpgradeChoices(upgrades, rng) {
  const pool = Object.keys(UPGRADE_CAPS).filter(id => (upgrades[id] || 0) < UPGRADE_CAPS[id]);
  const result = [];
  while (pool.length && result.length < 3) result.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return result;
}

export function getPlayerStats(characterId, meta = {}, upgrades = {}) {
  const h = HEROES[characterId] || HEROES.bone;
  const u = id => clamp(Number(upgrades[id]) || 0, 0, UPGRADE_CAPS[id]);
  const m = id => clamp(Number(meta[id]) || 0, 0, 5);
  return {
    maxHp: h.hp + m('vitality') * 8 + u('vitality') * 22,
    damage: h.damage * (1 + m('damage') * .04 + u('damage') * .20),
    speed: h.speed * (1 + u('speed') * .08),
    interval: h.interval / (1 + m('haste') * .03 + u('haste') * .15),
    pickup: 66 + m('magnet') * 10 + u('magnet') * 30,
    range: 475 * (1 + u('range') * .12),
    shotSize: 5 * (1 + u('size') * .15),
    crit: Math.min(.8, h.crit + u('crit') * .08),
    xpMultiplier: 1 + m('luck') * .02 + u('luck') * .08,
    regen: u('regen') * .18,
    dashMax: h.dash,
  };
}

function ellipse(ctx, x, y, rx, ry, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, TAU); ctx.fill();
}
function line(ctx, ax, ay, bx, by, color, width = 2) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
}
function rounded(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
}

/** Vector character asset shared by the arena and the character-selection UI. */
export function drawSkull(ctx, x, y, size, color = COLORS.bone, variant = 'bone', time = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(size / 64, size / 64);
  const bob = Math.sin(time * 3) * 1.5;
  ellipse(ctx, 0, 29, 27, 7, '#00000035');
  ctx.translate(0, bob);
  ctx.fillStyle = variant === 'witch' ? '#7279b8' : variant === 'rogue' ? '#c86549' : '#8c73bd';
  ctx.beginPath(); ctx.moveTo(-21, 3); ctx.quadraticCurveTo(-29, 14, -28, 31); ctx.lineTo(-13, 26); ctx.lineTo(-2, 31); ctx.lineTo(12, 26); ctx.lineTo(26, 32); ctx.quadraticCurveTo(26, 13, 18, 5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#493450'; ctx.beginPath(); ctx.moveTo(-13, 8); ctx.lineTo(16, 8); ctx.lineTo(16, 28); ctx.lineTo(-10, 27); ctx.closePath(); ctx.fill();
  line(ctx, -8, 16, 9, 18, color, 4); line(ctx, -7, 23, 8, 24, color, 3);
  ellipse(ctx, -13, 30, 6, 4, color); ellipse(ctx, 12, 30, 6, 4, color);
  ctx.strokeStyle = '#362638'; ctx.lineWidth = 3;
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-23, -4); ctx.bezierCurveTo(-25, -32, 25, -35, 25, -7); ctx.quadraticCurveTo(25, 7, 15, 11); ctx.lineTo(12, 21); ctx.lineTo(-13, 21); ctx.lineTo(-16, 10); ctx.quadraticCurveTo(-24, 6, -23, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ellipse(ctx, -9, 0, 7.3, 8, '#362638'); ellipse(ctx, 11, -1, 7, 8, '#362638');
  ellipse(ctx, -7, -2, 2.6, 3.7, variant === 'witch' ? '#8ee1c1' : '#ffad77'); ellipse(ctx, 13, -3, 2.5, 3.6, variant === 'witch' ? '#8ee1c1' : '#ffad77');
  ctx.fillStyle = '#604052'; ctx.beginPath(); ctx.moveTo(2, 6); ctx.lineTo(-2, 12); ctx.lineTo(5, 12); ctx.closePath(); ctx.fill();
  line(ctx, -10, 15, 12, 15, '#8d6f69', 1.5); [-6, 0, 6].forEach(n => line(ctx, n, 14, n, 20, '#8d6f69', 1.4));
  ellipse(ctx, -19, 7, 3.5, 2, '#e99b7a88'); ellipse(ctx, 21, 5, 3, 2, '#e99b7a88');
  line(ctx, -5, -23, -2, -15, '#bba184', 1.4); line(ctx, -2, -15, 3, -18, '#bba184', 1.4);
  if (variant === 'witch') {
    ctx.fillStyle = '#56487b'; ctx.beginPath(); ctx.moveTo(-29, -18); ctx.lineTo(-8, -49); ctx.lineTo(3, -38); ctx.lineTo(15, -48); ctx.lineTo(24, -20); ctx.closePath(); ctx.fill();
    ellipse(ctx, -1, -19, 33, 7, '#716098'); line(ctx, -19, -23, 20, -25, '#bda2e7', 4);
    ellipse(ctx, 2, -29, 3, 3, '#f8cd78');
  } else if (variant === 'rogue') {
    ctx.fillStyle = '#be624b'; ctx.beginPath(); ctx.moveTo(-24, -9); ctx.quadraticCurveTo(-23, -34, 9, -30); ctx.quadraticCurveTo(25, -27, 26, -11); ctx.lineTo(15, -20); ctx.lineTo(-1, -17); ctx.closePath(); ctx.fill();
    line(ctx, -18, -14, -30, -2, '#ee9575', 4);
  } else {
    ctx.fillStyle = '#f29a62'; ctx.beginPath(); ctx.moveTo(-16, -26); ctx.lineTo(-18, -37); ctx.lineTo(-7, -32); ctx.lineTo(0, -42); ctx.lineTo(7, -32); ctx.lineTo(17, -38); ctx.lineTo(15, -27); ctx.closePath(); ctx.fill();
    ellipse(ctx, 0, -30, 3, 2, '#ffe2a6');
  }
  ctx.restore();
}

export class ArenaGame {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false });
    if (!this.ctx) throw new Error('Canvas 2D is unavailable.');
    this.cb = callbacks; this.state = 'idle'; this.input = { x: 0, y: 0 }; this.camera = { x: 0, y: 0 };
    this.width = 960; this.height = 600; this.lastFrame = 0; this.raf = 0; this.destroyed = false;
    this.audio = null; this.sound = true; this.lastAudio = 0;
    this._resize = () => this.resize();
    this._visibility = () => { if (document.hidden && this.state === 'playing') { this.pause(); this.cb.onPause?.(); } };
    window.addEventListener('resize', this._resize); document.addEventListener('visibilitychange', this._visibility);
    this.resize();
  }

  start(options = {}) {
    cancelAnimationFrame(this.raf); this.destroyed = false;
    this.mode = ['standard', 'daily', 'endless'].includes(options.mode) ? options.mode : 'standard';
    this.characterId = HEROES[options.characterId] ? options.characterId : 'bone';
    this.meta = this.mode === 'daily' ? {} : { ...(options.meta || {}) };
    this.seed = String(options.seed ?? Date.now()); this.rng = createRng(this.seed);
    this.spawnRng = createRng(this.seed + ':spawns'); this.upgradeRng = createRng(this.seed + ':upgrades'); this.fxRng = createRng(this.seed + ':visuals');
    this.sound = options.sound !== false; this.reducedMotion = Boolean(options.reducedMotion);
    this.upgrades = Object.fromEntries(Object.keys(UPGRADE_CAPS).map(id => [id, 0]));
    if (this.characterId === 'witch') this.upgrades.orbit = 1;
    this.stats = getPlayerStats(this.characterId, this.meta, this.upgrades);
    this.player = { x: 0, y: 0, r: 16, hp: this.stats.maxHp, invincible: 0, dashTime: 0, dashX: 1, dashY: 0, facing: 1 };
    this.camera = { x: 0, y: 0 }; this.input = { x: 0, y: 0 }; this.lastDirection = { x: 1, y: 0 };
    this.time = 0; this.level = 1; this.xp = 0; this.xpNext = 10; this.kills = 0; this.score = 0;
    this.bosses = 0; this.bossesSpawned = 0; this.wave = 1; this.enemyId = 0;
    this.enemies = []; this.shots = []; this.enemyShots = []; this.gems = []; this.hearts = [];
    this.particles = []; this.labels = []; this.arcs = []; this.rings = []; this.evolutions = new Set();
    this.spawnTimer = 1; this.fireTimer = .4; this.lightningTimer = 2; this.dashCooldown = 0; this.shieldCooldown = 0;
    this.shake = 0; this.hudTimer = 0; this.pendingChoices = []; this.state = 'playing';
    for (let n = 0; n < 5; n++) this.spawnEnemy('ghost');
    this.lastFrame = performance.now(); this.resize(); this.emitHud();
    this.cb.onEvent?.({ type: 'start', text: '移动躲避，自动攻击。骨头硬一点，活得久一点。' });
    this.raf = requestAnimationFrame(t => this.frame(t));
  }

  setInput({ x = 0, y = 0 } = {}) {
    const length = Math.hypot(x, y);
    this.input = { x: length > 1 ? x / length : x, y: length > 1 ? y / length : y };
  }
  setSound(on) { this.sound = Boolean(on); }
  pause() { if (this.state === 'playing') { this.state = 'paused'; this.setInput(); this.emitHud(); } }
  resume() { if (this.state === 'paused') { this.state = 'playing'; this.lastFrame = performance.now(); } }

  dash() {
    if (this.state !== 'playing' || this.dashCooldown > 0) return false;
    const p = this.player, move = Math.hypot(this.input.x, this.input.y) > .1 ? this.input : this.lastDirection;
    p.dashX = move.x; p.dashY = move.y; p.dashTime = .19; p.invincible = Math.max(.32, p.invincible);
    this.dashCooldown = this.stats.dashMax; this.tone(220, .12, 'sawtooth', .03, 700);
    this.puff(p.x, p.y, COLORS.lilac, 13, 110); this.emitHud(); return true;
  }

  chooseUpgrade(id) {
    if (this.state !== 'upgrade' || !this.pendingChoices.includes(id) || this.upgrades[id] >= UPGRADE_CAPS[id]) return false;
    this.upgrades[id]++; this.stats = getPlayerStats(this.characterId, this.meta, this.upgrades);
    if (id === 'vitality') this.player.hp = Math.min(this.stats.maxHp, this.player.hp + 22);
    this.player.invincible = Math.max(this.player.invincible, .8);
    this.pendingChoices = []; this.state = 'playing'; this.lastFrame = performance.now();
    this.tone(550, .18, 'sine', .05, 1000); this.checkEvolutions(); this.emitHud(); return true;
  }

  checkEvolutions() {
    const u = this.upgrades;
    const recipes = [ ['orbit', u.orbit >= 4 && u.speed >= 3, '灵魂星环'], ['lightning', u.lightning >= 4 && u.haste >= 3, '雷霆共鸣'], ['bone', u.damage >= 5 && u.multishot >= 3, '白骨风暴'] ];
    for (const [id, ready, name] of recipes) if (ready && !this.evolutions.has(id)) {
      this.evolutions.add(id); this.cb.onEvent?.({ type: 'evolution', text: '武器进化 · ' + name });
      this.rings.push({ x: this.player.x, y: this.player.y, r: 20, max: 220, life: .8, color: COLORS.orange });
    }
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.width = Math.max(280, r.width || this.canvas.clientWidth || 960);
    this.height = Math.max(240, r.height || this.canvas.clientHeight || 600);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.width * dpr); this.canvas.height = Math.round(this.height * dpr);
    this.dpr = dpr;
    // World scale leaves enough reaction space even on narrow portrait screens.
    this.zoom = clamp(Math.min(this.width / 740, this.height / 480), .62, 1.1);
    if (this.player) this.render();
  }

  frame(now) {
    if (this.destroyed) return;
    const dt = Math.max(0, Math.min(.04, (now - this.lastFrame) / 1000)); this.lastFrame = now;
    if (this.state === 'playing') this.update(dt);
    this.render(); this.raf = requestAnimationFrame(t => this.frame(t));
  }

  update(dt) {
    if (this.state !== 'playing' || !(dt > 0)) return;
    dt = Math.min(dt, .04);
    this.time += dt; this.dashCooldown = Math.max(0, this.dashCooldown - dt); this.shieldCooldown = Math.max(0, this.shieldCooldown - dt);
    const p = this.player, u = this.upgrades;
    p.invincible = Math.max(0, p.invincible - dt); p.dashTime = Math.max(0, p.dashTime - dt);
    if (Math.hypot(this.input.x, this.input.y) > .05) { this.lastDirection = { ...this.input }; if (this.input.x) p.facing = Math.sign(this.input.x); }
    const move = p.dashTime > 0 ? { x: p.dashX, y: p.dashY } : this.input;
    const speed = this.stats.speed * (p.dashTime > 0 ? 4.4 : 1);
    p.x += move.x * speed * dt; p.y += move.y * speed * dt;
    p.hp = Math.min(this.stats.maxHp, p.hp + this.stats.regen * dt);
    this.camera.x = mix(this.camera.x, p.x, Math.min(1, dt * 7)); this.camera.y = mix(this.camera.y, p.y, Math.min(1, dt * 7));
    if (p.dashTime > 0 && !this.reducedMotion && this.fxRng() < .6) this.puff(p.x, p.y, COLORS.lilac, 1, 20);
    const wave = 1 + Math.floor(this.time / 30);
    if (wave !== this.wave) { this.wave = wave; this.cb.onEvent?.({ type: 'wave', text: `第 ${wave} 波 · 夜色更深了` }); }
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const group = 1 + Math.floor(this.time / 100);
      for (let n = 0; n < Math.min(group, 5); n++) if (this.enemies.length < 150) this.spawnEnemy();
      this.spawnTimer = Math.max(.48, 1.65 - this.time / 290);
    }
    const bossAt = this.bossesSpawned < 3 ? [90, 180, 300][this.bossesSpawned] : 300 + (this.bossesSpawned - 2) * 120;
    if (this.time >= bossAt && !this.enemies.some(e => e.boss) && (this.mode === 'endless' || this.bossesSpawned < 3)) this.spawnBoss();
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) this.fire();
    this.lightningTimer -= dt;
    if (u.lightning && this.lightningTimer <= 0) { this.lightning(); this.lightningTimer = Math.max(1.1, 3.7 - u.lightning * .45) * (this.evolutions.has('lightning') ? .65 : 1); }

    for (const e of this.enemies) {
      if (e.dead) continue;
      e.flash = Math.max(0, e.flash - dt); e.slow = Math.max(0, e.slow - dt); e.orbitHit = Math.max(0, (e.orbitHit || 0) - dt);
      e.age += dt; const d = distance(e, p) || 1, nx = (p.x - e.x) / d, ny = (p.y - e.y) / d;
      let vx = nx, vy = ny, speed = e.speed * (e.slow > 0 ? e.slowFactor : 1);
      if (e.kind === 'bat') { vx += Math.sin(e.age * 4 + e.id) * .3; vy += Math.cos(e.age * 4 + e.id) * .3; }
      if (e.kind === 'mage') {
        if (d < 245) { vx = -nx * .5; vy = -ny * .5; } else if (d < 340) { vx = -ny * .5; vy = nx * .5; }
        e.attack -= dt;
        if (e.attack < .5 && e.attack > 0) e.telegraph = e.attack;
        if (e.attack <= 0) { this.enemyBullet(e, nx, ny, 175); e.attack = 3.4; e.telegraph = 0; }
      }
      if (e.kind === 'charger') {
        e.attack -= dt;
        if (e.attack <= .65 && e.attack > 0) { speed = 0; e.telegraph = .65; e.aimX = nx; e.aimY = ny; }
        if (e.attack <= 0 && e.attack > -.38) { vx = e.aimX; vy = e.aimY; speed = 380; e.telegraph = 0; }
        if (e.attack <= -.38) e.attack = 3.3;
      }
      if (e.boss) {
        e.attack -= dt;
        if (e.attack <= .8 && e.attack > 0) e.telegraph = e.attack;
        if (e.attack <= 0) {
          const count = 8 + Math.min(e.stage, 3) * 2;
          for (let n = 0; n < count; n++) { const a = n / count * TAU + e.age * .15; this.enemyBullet(e, Math.cos(a), Math.sin(a), 115 + e.stage * 8); }
          e.attack = 4.6 - Math.min(e.stage, 3) * .3; e.telegraph = 0;
        }
      }
      e.x += vx * speed * dt; e.y += vy * speed * dt;
      // Push apart only nearby bodies. This avoids a single opaque stack at the hero.
      if (d < e.r + p.r && p.dashTime <= 0) { this.hurt(e.damage); e.x -= nx * 5; e.y -= ny * 5; }
      if (d > Math.max(this.width, this.height) / this.zoom + 500 && !e.boss) { const a = this.spawnRng() * TAU, r = this.spawnRadius(a); e.x = p.x + Math.cos(a) * r; e.y = p.y + Math.sin(a) * r; }
      if (u.orbit && e.orbitHit <= 0) {
        for (let n = 0; n < u.orbit; n++) {
          const a = this.time * (this.evolutions.has('orbit') ? 3.1 : 2.2) + n / u.orbit * TAU, rad = this.evolutions.has('orbit') ? 96 : 77;
          if (Math.hypot(e.x - p.x - Math.cos(a) * rad, e.y - p.y - Math.sin(a) * rad) < e.r + 12) {
            e.orbitHit = .38; this.hit(e, (9 + u.orbit * 5) * (this.evolutions.has('orbit') ? 1.4 : 1)); break;
          }
        }
      }
    }
    // Inexpensive deterministic separation for the most dangerous local crowd.
    for (let i = 0; i < this.enemies.length; i++) for (let j = i + 1; j < this.enemies.length; j++) {
      const a = this.enemies[i], b = this.enemies[j]; if (a.dead || b.dead) continue;
      const dx = a.x - b.x, dy = a.y - b.y, min = (a.r + b.r) * .7;
      if (Math.abs(dx) > min || Math.abs(dy) > min) continue;
      const d = Math.hypot(dx, dy) || .1;
      if (d < min) { const push = Math.min(30 * dt, (min - d) * .2); a.x += dx / d * push; a.y += dy / d * push; b.x -= dx / d * push; b.y -= dy / d * push; }
    }

    for (const b of this.shots) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      for (const e of this.enemies) {
        if (e.dead || b.life <= 0 || b.hits.has(e.id) || Math.abs(e.x - b.x) > e.r + b.r) continue;
        if (distance(e, b) < e.r + b.r) {
          b.hits.add(e.id); this.hit(e, b.damage, b.crit);
          if (u.freeze) { e.slow = .9 + u.freeze * .35; e.slowFactor = Math.max(.4, .82 - u.freeze * .09); }
          if (--b.pierce < 0) b.life = 0;
        }
      }
    }
    for (const b of this.enemyShots) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; if (distance(b, p) < b.r + p.r) { this.hurt(b.damage); b.life = 0; } }
    for (const gem of this.gems) {
      const d = distance(gem, p);
      if (d < this.stats.pickup) gem.attracted = true;
      if (gem.attracted) { const speed = 300 + (this.stats.pickup - Math.min(this.stats.pickup, d)) * 3; gem.x += (p.x - gem.x) / (d || 1) * Math.min(speed * dt, d); gem.y += (p.y - gem.y) / (d || 1) * Math.min(speed * dt, d); }
      if (distance(gem, p) < 19) { this.xp += gem.value * this.stats.xpMultiplier; this.score += Math.round(gem.value * 5); gem.dead = true; }
    }
    for (const heart of this.hearts) { heart.life -= dt; if (distance(heart, p) < 30) { p.hp = Math.min(this.stats.maxHp, p.hp + 18); heart.life = 0; this.float(p.x, p.y - 25, '+18', COLORS.mint); this.tone(600, .08, 'sine', .025, 800); } }
    this.enemies = this.enemies.filter(e => !e.dead); this.shots = this.shots.filter(b => b.life > 0); this.enemyShots = this.enemyShots.filter(b => b.life > 0);
    this.gems = this.gems.filter(g => !g.dead); this.hearts = this.hearts.filter(h => h.life > 0);
    if (this.gems.length > 300) { // Merge stale drops instead of silently losing their XP.
      const older = this.gems.splice(0, this.gems.length - 260); const total = older.reduce((n, g) => n + g.value, 0);
      this.gems.push({ x: p.x + 100, y: p.y + 40, value: total, attracted: false, rare: true });
    }
    for (const q of this.particles) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= .96; q.vy *= .96; }
    for (const q of this.labels) { q.life -= dt; q.y -= dt * 26; }
    for (const q of this.arcs) q.life -= dt;
    for (const q of this.rings) { q.life -= dt; q.r = mix(q.r, q.max, Math.min(1, dt * 6)); }
    this.particles = this.particles.filter(q => q.life > 0); this.labels = this.labels.filter(q => q.life > 0);
    this.arcs = this.arcs.filter(q => q.life > 0); this.rings = this.rings.filter(q => q.life > 0); this.shake = Math.max(0, this.shake - dt * 20);
    if (this.state === 'playing' && this.xp >= this.xpNext) this.levelUp();
    this.hudTimer -= dt; if (this.hudTimer <= 0) { this.emitHud(); this.hudTimer = .08; }
  }

  spawnRadius(angle) {
    const hw = this.width / this.zoom / 2 + 80, hh = this.height / this.zoom / 2 + 80;
    return Math.min(hw / Math.max(.001, Math.abs(Math.cos(angle))), hh / Math.max(.001, Math.abs(Math.sin(angle))));
  }
  spawnEnemy(forced) {
    const roll = this.spawnRng(), t = this.time;
    const kind = forced || (t > 135 && roll > .78 ? 'charger' : t > 65 && roll > .72 ? 'mage' : t > 35 && roll > .52 ? 'slime' : t > 15 && roll > .28 ? 'bat' : 'ghost');
    const base = { ghost: [18, 48, 13, 9, 4], bat: [15, 90, 12, 7, 4], slime: [55, 39, 20, 13, 8], mage: [42, 48, 17, 10, 8], charger: [65, 58, 18, 16, 10] }[kind];
    const a = this.spawnRng() * TAU, radius = this.spawnRadius(a), scale = 1 + t / 260;
    const hp = base[0] * scale;
    this.enemies.push({ id: ++this.enemyId, kind, x: this.player.x + Math.cos(a) * radius, y: this.player.y + Math.sin(a) * radius, r: base[2], hp, maxHp: hp, speed: base[1] * (1 + Math.min(.45, t / 1100)), damage: base[3] * (1 + t / 550), xp: base[4], age: this.spawnRng() * 10, flash: 0, slow: 0, attack: 2 + this.spawnRng(), telegraph: 0, orbitHit: 0 });
  }
  spawnBoss() {
    const stage = ++this.bossesSpawned; const a = this.spawnRng() * TAU, radius = this.spawnRadius(a);
    const hp = [0, 650, 1600, 3400][stage] || 3400 * Math.pow(1.5, stage - 3);
    const name = stage === 1 ? '提灯守墓人' : stage === 2 ? '腐败骑士' : stage === 3 ? '永夜骨王' : `永夜骨王 · ${stage - 2}`;
    this.enemies.push({ id: ++this.enemyId, kind: 'boss', boss: true, stage, name, x: this.player.x + Math.cos(a) * radius, y: this.player.y + Math.sin(a) * radius, hp, maxHp: hp, r: stage === 3 ? 43 : 36, speed: 38 + stage * 5, damage: 22 + stage * 5, xp: 65 + stage * 30, age: 0, flash: 0, slow: 0, orbitHit: 0, attack: 3, telegraph: 0 });
    this.cb.onEvent?.({ type: 'boss', text: '首领出现 · ' + name }); this.tone(100, .45, 'triangle', .05, 55);
    this.emitHud();
  }

  fire() {
    const targets = this.enemies.filter(e => !e.dead && distance(e, this.player) < this.stats.range).sort((a, b) => distance(a, this.player) - distance(b, this.player));
    if (!targets.length) { this.fireTimer = .12; return; }
    const count = 1 + this.upgrades.multishot + (this.evolutions.has('bone') ? 2 : 0);
    for (let n = 0; n < count; n++) {
      const target = targets[n % targets.length], d = distance(target, this.player) || 1;
      const crit = this.rng() < this.stats.crit;
      this.shots.push({ x: this.player.x, y: this.player.y - 7, vx: (target.x - this.player.x) / d * 540, vy: (target.y - this.player.y) / d * 540, damage: this.stats.damage * (crit ? 2.2 : 1), crit, r: this.stats.shotSize, life: this.stats.range / 540 + .15, pierce: this.upgrades.pierce, hits: new Set(), angle: Math.atan2(target.y - this.player.y, target.x - this.player.x) });
    }
    this.fireTimer = this.stats.interval; this.tone(330 + this.fxRng() * 90, .035, 'triangle', .018, 160);
  }
  enemyBullet(e, nx, ny, speed) {
    if (this.enemyShots.length >= 100) return;
    this.enemyShots.push({ x: e.x, y: e.y, vx: nx * speed, vy: ny * speed, r: e.boss ? 7 : 6, life: 5, damage: e.damage * .8, boss: Boolean(e.boss) });
  }
  lightning() {
    let origin = this.player;
    const struck = new Set(), rank = this.upgrades.lightning;
    for (let n = 0; n < rank + 1; n++) {
      const target = this.enemies.filter(e => !e.dead && !struck.has(e.id) && distance(e, origin) < (n === 0 ? 410 : 200)).sort((a, b) => distance(a, origin) - distance(b, origin))[0];
      if (!target) break;
      struck.add(target.id); this.arcs.push({ ax: origin.x, ay: origin.y, bx: target.x, by: target.y, life: .22, offset: (this.fxRng() - .5) * 32 });
      this.hit(target, (18 + rank * 10) * (this.evolutions.has('lightning') ? 1.35 : 1)); origin = target;
    }
    if (struck.size) this.tone(1000, .07, 'sawtooth', .025, 150);
  }
  hit(e, damage, crit = false, allowBlast = true) {
    if (e.dead) return;
    e.hp -= damage; e.flash = .12;
    this.float(e.x, e.y - e.r, String(Math.round(damage)), crit ? '#ffe29a' : '#eadbc6', crit);
    this.puff(e.x, e.y, e.kind === 'ghost' ? COLORS.mint : COLORS.orange, crit ? 4 : 2, 65);
    if (e.hp > 0) return;
    e.dead = true; this.kills++; this.score += e.boss ? 600 * e.stage : 12;
    this.gems.push({ x: e.x, y: e.y, value: e.xp, rare: e.boss, attracted: false });
    this.player.hp = Math.min(this.stats.maxHp, this.player.hp + this.upgrades.vampirism * .15);
    if (this.rng() < .025 + this.upgrades.luck * .012 || e.boss) if (this.hearts.length < 35) this.hearts.push({ x: e.x + 15, y: e.y, life: 40 });
    this.puff(e.x, e.y, e.boss ? COLORS.orange : COLORS.mint, e.boss ? 24 : 6, 95);
    if (this.upgrades.blast && allowBlast && this.rng() < .4 + this.upgrades.blast * .1) {
      const radius = 38 + this.upgrades.blast * 13;
      this.rings.push({ x: e.x, y: e.y, r: 5, max: radius, life: .32, color: COLORS.orange });
      for (const other of this.enemies) if (!other.dead && distance(other, e) < radius) this.hit(other, 12 + this.upgrades.blast * 8, false, false);
    }
    if (e.boss) {
      this.bosses++; this.player.hp = Math.min(this.stats.maxHp, this.player.hp + this.stats.maxHp * .25);
      this.enemyShots.length = 0; this.cb.onEvent?.({ type: 'bossDefeated', text: `${e.name} 已击败 · 回复 25% 生命` });
      this.rings.push({ x: e.x, y: e.y, r: 20, max: 260, life: 1, color: COLORS.orange });
      if (this.mode !== 'endless' && e.stage === 3) this.finish(true);
    }
  }
  hurt(damage) {
    const p = this.player;
    if (p.invincible > 0 || this.state !== 'playing') return;
    if (this.upgrades.shield && this.shieldCooldown <= 0) {
      this.shieldCooldown = 16 - this.upgrades.shield * 2; p.invincible = .55;
      this.rings.push({ x: p.x, y: p.y, r: 20, max: 75, life: .35, color: COLORS.lilac }); this.float(p.x, p.y - 32, '格挡', COLORS.lilac); return;
    }
    p.hp = Math.max(0, p.hp - damage); p.invincible = .8; this.shake = this.reducedMotion ? 0 : 4;
    this.puff(p.x, p.y, COLORS.rose, 8, 100); this.tone(140, .12, 'sawtooth', .04, 70);
    this.emitHud(); if (p.hp <= 0) this.finish(false);
  }
  levelUp() {
    this.xp -= this.xpNext; this.level++; this.xpNext = 9 + this.level * 6;
    this.pendingChoices = makeUpgradeChoices(this.upgrades, this.upgradeRng);
    this.tone(660, .2, 'sine', .04, 1100);
    this.rings.push({ x: this.player.x, y: this.player.y, r: 5, max: 150, life: .6, color: COLORS.mint });
    if (this.pendingChoices.length) { this.state = 'upgrade'; this.setInput(); this.emitHud(); this.cb.onUpgrade?.([...this.pendingChoices]); }
    else { this.player.hp = Math.min(this.stats.maxHp, this.player.hp + 30); this.cb.onEvent?.({ type: 'level', text: '骨骼已臻完美 · 回复 30 生命' }); }
  }
  finish(won) {
    if (this.state === 'ended') return;
    this.state = 'ended'; this.setInput(); this.emitHud();
    this.cb.onEnd?.({ mode: this.mode, characterId: this.characterId, time: this.time, kills: this.kills, level: this.level, score: Math.round(this.score + this.time * 3 + (won ? 2000 : 0)), bosses: this.bosses, won, seed: this.seed });
  }
  emitHud() {
    if (!this.player) return;
    const e = this.enemies.find(e => e.boss && !e.dead);
    this.cb.onHud?.({ hp: Math.max(0, this.player.hp), maxHp: this.stats.maxHp, xp: this.xp, xpNext: this.xpNext, level: this.level, kills: this.kills, time: this.time, wave: this.wave, dashCooldown: this.dashCooldown, dashMax: this.stats.dashMax, score: Math.round(this.score + this.time * 3), boss: e ? { name: e.name, hp: Math.max(0, e.hp), maxHp: e.maxHp } : null, upgrades: { ...this.upgrades } });
  }
  float(x, y, text, color, big = false) {
    if (this.labels.length >= 65) this.labels.shift();
    this.labels.push({ x, y, text, color, big, life: .65 });
  }
  puff(x, y, color, count, speed) {
    if (this.reducedMotion) count = Math.min(2, count);
    count = Math.min(count, 260 - this.particles.length);
    for (let n = 0; n < count; n++) { const a = this.fxRng() * TAU, v = speed * (.2 + this.fxRng()); this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, color, life: .25 + this.fxRng() * .3, size: 1.5 + this.fxRng() * 2 }); }
  }
  tone(freq, duration, type = 'sine', volume = .03, end = freq) {
    if (!this.sound) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      if (!this.audio) this.audio = new Audio();
      if (this.audio.state === 'suspended') this.audio.resume().catch(() => {});
      const now = this.audio.currentTime;
      if (now - this.lastAudio < .025) return;
      this.lastAudio = now; const osc = this.audio.createOscillator(), gain = this.audio.createGain();
      osc.type = type; osc.frequency.setValueAtTime(freq, now); osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), now + duration);
      gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      osc.connect(gain); gain.connect(this.audio.destination); osc.start(now); osc.stop(now + duration + .01);
    } catch { /* Audio is an optional enhancement, never a gameplay dependency. */ }
  }

  render() {
    if (!this.player || !this.ctx) return;
    const c = this.ctx, w = this.width, h = this.height;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.fillStyle = '#171321'; c.fillRect(0, 0, w, h);
    c.save();
    const shakeX = this.shake ? Math.sin(this.time * 79) * this.shake : 0, shakeY = this.shake ? Math.cos(this.time * 61) * this.shake : 0;
    c.translate(w / 2 + shakeX, h / 2 + shakeY); c.scale(this.zoom, this.zoom); c.translate(-this.camera.x, -this.camera.y);
    this.drawFloor(c);
    for (const g of this.gems) {
      // Keep XP readable at roughly a five-pixel radius, including portrait zoom.
      const s = (g.rare ? 10 : 7) / this.zoom, center = 2.5 / this.zoom;
      const bob = this.reducedMotion ? 0 : Math.sin(this.time * 3 + g.x) * 1.5;
      c.save(); c.translate(g.x, g.y + bob);
      ellipse(c, 0, 0, (g.rare ? 10 : 7) / this.zoom, (g.rare ? 10 : 7) / this.zoom, g.rare ? '#ffac4e20' : '#8ee1c118');
      c.rotate(Math.PI / 4); c.fillStyle = g.rare ? '#f4b16b' : '#9adfc4'; c.shadowColor = g.rare ? '#ffae5880' : '#80e5bd60'; c.shadowBlur = g.rare ? 13 : 7; c.fillRect(-s / 2, -s / 2, s, s);
      c.shadowBlur = 0; c.fillStyle = g.rare ? '#fff0ca' : '#e4ffe6'; c.fillRect(-center / 2, -center / 2, center, center); c.restore();
    }
    for (const heart of this.hearts) {
      c.save(); c.translate(heart.x, heart.y); c.fillStyle = COLORS.rose; c.beginPath(); c.moveTo(0, 8); c.bezierCurveTo(-18, -3, -5, -13, 0, -5); c.bezierCurveTo(5, -13, 18, -3, 0, 8); c.fill(); c.restore();
    }
    const drawables = [...this.enemies.filter(e => !e.dead), { ...this.player, hero: true }].sort((a, b) => a.y - b.y);
    for (const e of drawables) {
      if (e.hero) this.drawPlayer(c); else if (Math.abs(e.x - this.camera.x) < w / this.zoom / 2 + 100 && Math.abs(e.y - this.camera.y) < h / this.zoom / 2 + 100) this.drawEnemy(c, e);
    }
    for (const b of this.shots) {
      c.save(); c.translate(b.x, b.y); c.rotate(b.angle); c.strokeStyle = b.crit ? '#ffd687' : COLORS.bone; c.lineCap = 'round'; c.lineWidth = b.r * .9;
      c.beginPath(); c.moveTo(-8, 0); c.lineTo(7, 0); c.stroke();
      ellipse(c, -8, -2.5, b.r * .65, b.r * .65, b.crit ? '#ffd687' : COLORS.bone); ellipse(c, -8, 2.5, b.r * .65, b.r * .65, b.crit ? '#ffd687' : COLORS.bone);
      ellipse(c, 7, -2.5, b.r * .65, b.r * .65, b.crit ? '#ffd687' : COLORS.bone); ellipse(c, 7, 2.5, b.r * .65, b.r * .65, b.crit ? '#ffd687' : COLORS.bone); c.restore();
    }
    for (const b of this.enemyShots) { ellipse(c, b.x, b.y, b.r + 4, b.r + 4, b.boss ? '#ea744126' : '#b696ed26'); ellipse(c, b.x, b.y, b.r, b.r, b.boss ? '#fb9b68' : '#b59ae6'); ellipse(c, b.x - 1, b.y - 1, b.r * .45, b.r * .45, '#ffe3be'); }
    if (this.upgrades.orbit) for (let n = 0; n < this.upgrades.orbit; n++) {
      const a = this.time * (this.evolutions.has('orbit') ? 3.1 : 2.2) + n / this.upgrades.orbit * TAU, rad = this.evolutions.has('orbit') ? 96 : 77, x = this.player.x + Math.cos(a) * rad, y = this.player.y + Math.sin(a) * rad;
      ellipse(c, x, y, 14, 14, '#b7a0f41c'); ellipse(c, x, y - 2, 9, 9, this.evolutions.has('orbit') ? '#ffe1a1' : '#c4b5ed'); ellipse(c, x - 3, y - 3, 2, 3, '#4c3d6e'); ellipse(c, x + 3, y - 3, 2, 3, '#4c3d6e'); rounded(c, x - 4, y + 4, 8, 5, 2, '#c4b5ed');
    }
    for (const a of this.arcs) {
      c.globalAlpha = Math.min(1, a.life * 7); c.strokeStyle = '#d5c8ff'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(a.ax, a.ay);
      c.lineTo(mix(a.ax, a.bx, .33) + a.offset, mix(a.ay, a.by, .33) - a.offset); c.lineTo(mix(a.ax, a.bx, .66) - a.offset, mix(a.ay, a.by, .66) + a.offset); c.lineTo(a.bx, a.by); c.stroke();
    }
    c.globalAlpha = 1;
    for (const r of this.rings) { c.globalAlpha = Math.min(.65, r.life * 1.4); c.strokeStyle = r.color; c.lineWidth = 3; c.beginPath(); c.arc(r.x, r.y, r.r, 0, TAU); c.stroke(); }
    for (const q of this.particles) { c.globalAlpha = Math.min(1, q.life * 3); ellipse(c, q.x, q.y, q.size, q.size, q.color); }
    for (const q of this.labels) {
      c.globalAlpha = Math.min(1, q.life * 4); c.font = `${q.big ? '800 19px' : '700 12px'} system-ui,sans-serif`; c.textAlign = 'center'; c.fillStyle = q.color; c.strokeStyle = '#171321'; c.lineWidth = 3; c.strokeText(q.text, q.x, q.y); c.fillText(q.text, q.x, q.y);
    }
    c.globalAlpha = 1; c.restore();
    const fog = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .15, w / 2, h / 2, Math.max(w, h) * .68);
    fog.addColorStop(0, '#110f1800'); fog.addColorStop(1, '#0e0c1470'); c.fillStyle = fog; c.fillRect(0, 0, w, h);
    if (this.player.hp / this.stats.maxHp < .25) { c.strokeStyle = '#f47c9840'; c.lineWidth = 12; c.strokeRect(0, 0, w, h); }
    // Boss direction remains visible when the enemy is outside the camera.
    const boss = this.enemies.find(e => e.boss && !e.dead);
    if (boss) {
      const sx = (boss.x - this.camera.x) * this.zoom + w / 2, sy = (boss.y - this.camera.y) * this.zoom + h / 2;
      if (sx < 30 || sx > w - 30 || sy < 30 || sy > h - 30) {
        const x = clamp(sx, 25, w - 25), y = clamp(sy, 60, h - 35), a = Math.atan2(sy - h / 2, sx - w / 2);
        c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = COLORS.orange; c.beginPath(); c.moveTo(9, 0); c.lineTo(-6, -6); c.lineTo(-6, 6); c.closePath(); c.fill(); c.restore();
      }
    }
  }

  drawFloor(c) {
    const halfW = this.width / this.zoom / 2, halfH = this.height / this.zoom / 2;
    const left = this.camera.x - halfW - 100, top = this.camera.y - halfH - 100;
    const right = this.camera.x + halfW + 100, bottom = this.camera.y + halfH + 100;
    const step = 72;
    c.lineWidth = 1; c.strokeStyle = '#9a89ba09'; c.beginPath();
    for (let x = Math.floor(left / step) * step; x < right; x += step) { c.moveTo(x, top); c.lineTo(x, bottom); }
    for (let y = Math.floor(top / step) * step; y < bottom; y += step) { c.moveTo(left, y); c.lineTo(right, y); } c.stroke();
    for (let gx = Math.floor(left / 150); gx <= Math.ceil(right / 150); gx++) for (let gy = Math.floor(top / 150); gy <= Math.ceil(bottom / 150); gy++) {
      const hash = ((Math.imul(gx, 374761393) ^ Math.imul(gy, 668265263)) >>> 0), x = gx * 150 + hash % 65, y = gy * 150 + (hash >>> 8) % 65;
      if ((hash % 7) < 2 && Math.hypot(x, y) > 80) {
        c.save(); c.translate(x, y); c.rotate(((hash % 20) - 10) * .02); ellipse(c, 0, 6, 20, 6, '#0f0d1850');
        rounded(c, -12, -22, 24, 30, [11, 11, 3, 3], '#282332'); line(c, 0, -16, 0, 0, '#514257', 2); line(c, -5, -10, 5, -10, '#514257', 2); line(c, -18, 8, 19, 8, '#30283c', 2); c.restore();
      } else {
        line(c, x, y + 3, x - 3, y - 5, '#38463e90', 1); line(c, x + 1, y + 3, x + 5, y - 7, '#38463e90', 1);
        if (hash % 11 === 0) ellipse(c, x - 3, y - 6, 2, 2, '#b0946860');
      }
    }
    // Quiet ritual rings make the starting clearing feel authored.
    c.strokeStyle = '#8d6f9320'; c.lineWidth = 1;
    for (const r of [100, 108, 145]) { c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke(); }
    for (let n = 0; n < 12; n++) { const a = n / 12 * TAU; line(c, Math.cos(a) * 111, Math.sin(a) * 111, Math.cos(a) * 123, Math.sin(a) * 123, '#8d6f9330', 1.5); }
  }
  drawPlayer(c) {
    const p = this.player;
    c.save();
    if (p.invincible > 0 && Math.floor(p.invincible * 18) % 2 === 0) c.globalAlpha = .55;
    const walking = Math.hypot(this.input.x, this.input.y) > .1 && this.state === 'playing';
    drawSkull(c, p.x, p.y - 11, 43, COLORS.bone, this.characterId, this.reducedMotion ? 0 : this.time * (walking ? 3.4 : 1));
    if (this.upgrades.shield && this.shieldCooldown <= 0) { c.strokeStyle = '#bba7e6a0'; c.lineWidth = 1.7; c.beginPath(); c.arc(p.x, p.y - 5, 27, 0, TAU); c.stroke(); }
    c.restore();
    if (p.hp < this.stats.maxHp) { rounded(c, p.x - 20, p.y + 25, 40, 4, 2, '#0b0a12'); rounded(c, p.x - 20, p.y + 25, Math.max(.1, 40 * p.hp / this.stats.maxHp), 4, 2, p.hp / this.stats.maxHp < .3 ? COLORS.rose : COLORS.mint); }
    if (this.dashCooldown <= 0 && this.state === 'playing') { ellipse(c, p.x - 4, p.y + 34, 1.5, 1.5, '#c6afea'); ellipse(c, p.x + 4, p.y + 34, 1.5, 1.5, '#c6afea'); }
  }
  drawEnemy(c, e) {
    c.save(); c.translate(e.x, e.y);
    const bob = this.reducedMotion ? 0 : Math.sin(e.age * 4) * 2;
    ellipse(c, 0, e.r * .65, e.r * .9, e.r * .3, '#08060f40');
    if (e.telegraph > 0) { c.strokeStyle = '#ff91628c'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, e.r + 8 + Math.sin(this.time * 16) * 3, 0, TAU); c.stroke(); }
    const color = e.flash > 0 ? '#fff1d5' : e.slow > 0 ? '#9ccfd9' : e.kind === 'ghost' ? '#83b9a9' : e.kind === 'bat' ? '#a391c4' : e.kind === 'slime' ? '#a69b72' : e.kind === 'mage' ? '#aa84a7' : '#d58565';
    c.translate(0, bob);
    if (e.boss) {
      c.scale(e.r / 24, e.r / 24); c.fillStyle = e.flash ? '#efd7a7' : e.stage === 3 ? '#b46b64' : '#74617e';
      c.beginPath(); c.moveTo(-19, -7); c.lineTo(-27, 29); c.lineTo(-9, 24); c.lineTo(0, 31); c.lineTo(13, 25); c.lineTo(28, 28); c.lineTo(20, -8); c.closePath(); c.fill();
      ellipse(c, 0, -7, 20, 21, e.flash ? '#fff0c9' : '#c8a184'); ellipse(c, -8, -9, 6, 7, '#362738'); ellipse(c, 8, -9, 6, 7, '#362738');
      ellipse(c, -8, -8, 3, 2, '#ff8c5f'); ellipse(c, 8, -8, 3, 2, '#ff8c5f'); rounded(c, -10, 5, 20, 9, 2, '#d7b38d');
      [-5, 0, 5].forEach(x => line(c, x, 6, x, 12, '#654c50', 1));
      c.fillStyle = '#d1965d'; c.beginPath(); c.moveTo(-20, -22); c.lineTo(-23, -39); c.lineTo(-9, -30); c.lineTo(0, -43); c.lineTo(9, -30); c.lineTo(23, -39); c.lineTo(20, -22); c.closePath(); c.fill();
      line(c, 29, -15, 29, 27, '#b59975', 3); ellipse(c, 29, -17, 6, 8, '#eda064');
    } else if (e.kind === 'ghost') {
      c.fillStyle = color; c.beginPath(); c.moveTo(-13, 12); c.lineTo(-14, -2); c.bezierCurveTo(-15, -24, 15, -24, 14, -2); c.lineTo(13, 12); c.lineTo(5, 8); c.lineTo(0, 13); c.lineTo(-6, 8); c.closePath(); c.fill();
      ellipse(c, -5, -5, 2.8, 4, '#273a38'); ellipse(c, 5, -5, 2.8, 4, '#273a38'); ellipse(c, 0, 3, 2, 2.5, '#48665a');
    } else if (e.kind === 'bat') {
      const flap = Math.sin(e.age * 13) * 6;
      c.fillStyle = color; c.beginPath(); c.moveTo(-4, 1); c.quadraticCurveTo(-21, -15 - flap, -24, 1); c.lineTo(-17, 0); c.lineTo(-14, 8); c.lineTo(-6, 5); c.lineTo(0, 9); c.lineTo(6, 5); c.lineTo(14, 8); c.lineTo(17, 0); c.lineTo(24, 1); c.quadraticCurveTo(21, -15 - flap, 4, 1); c.fill();
      ellipse(c, 0, 0, 8, 10, color); c.fillStyle = color; c.beginPath(); c.moveTo(-7, -5); c.lineTo(-9, -15); c.lineTo(-1, -9); c.lineTo(2, -9); c.lineTo(9, -15); c.lineTo(7, -4); c.fill(); ellipse(c, -3, 0, 2, 2.5, '#ffe0a0'); ellipse(c, 3, 0, 2, 2.5, '#ffe0a0');
    } else if (e.kind === 'slime') {
      c.fillStyle = color; c.beginPath(); c.moveTo(-22, 11); c.bezierCurveTo(-25, 0, -9, -30, 4, -20); c.bezierCurveTo(20, -15, 27, 7, 19, 12); c.closePath(); c.fill(); ellipse(c, -4, -4, 3, 4, '#454334'); ellipse(c, 8, -4, 3, 4, '#454334'); ellipse(c, -8, -11, 5, 2, '#d7d3a760');
    } else if (e.kind === 'mage') {
      c.fillStyle = color; c.beginPath(); c.moveTo(0, -27); c.lineTo(-19, 14); c.quadraticCurveTo(0, 8, 19, 14); c.closePath(); c.fill(); ellipse(c, 0, -4, 9, 10, '#4d3654'); ellipse(c, -3, -5, 2, 2, '#e7a7db'); ellipse(c, 3, -5, 2, 2, '#e7a7db'); line(c, 20, -12, 17, 15, '#a79a88', 2); ellipse(c, 21, -15, 4, 5, '#c4a4e5');
    } else {
      ellipse(c, 0, -1, 18, 19, color); c.fillStyle = '#d7bf93'; c.beginPath(); c.moveTo(-14, -12); c.lineTo(-23, -23); c.lineTo(-19, -4); c.moveTo(14, -12); c.lineTo(23, -23); c.lineTo(19, -4); c.fill();
      line(c, -11, -8, -3, -5, '#4e3035', 3); line(c, 3, -5, 11, -8, '#4e3035', 3); ellipse(c, -7, -1, 2, 2, '#ffe0a2'); ellipse(c, 7, -1, 2, 2, '#ffe0a2'); rounded(c, -7, 7, 14, 3, 1, '#6b3c3c');
    }
    c.restore();
    if (!e.boss && e.hp < e.maxHp) { rounded(c, e.x - 13, e.y - e.r - 12, 26, 3, 1.5, '#0c0a12'); rounded(c, e.x - 13, e.y - e.r - 12, Math.max(.1, 26 * e.hp / e.maxHp), 3, 1.5, '#b28e9c'); }
  }

  destroy() {
    this.destroyed = true; this.state = 'destroyed'; cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this._resize); document.removeEventListener('visibilitychange', this._visibility);
    if (this.audio) this.audio.close().catch(() => {}); this.audio = null;
  }
}

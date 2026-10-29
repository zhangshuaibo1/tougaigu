// A remembered reply becomes a tiny visible scene, not another reward or
// delivery. Only the game's existing update advances this bounded performance.
const TAU = Math.PI * 2;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;
const ease = n => { const q = clamp(n, 0, 1); return q * q * (3 - 2 * q); };
export const CLOCK_ECHO_DURATION = 2.8;
export const normalizeClockChoice = value => value === 'release' || value === 'hold' ? value : null;

export function createClockEcho(value, reducedMotion = false) {
  const choice = normalizeClockChoice(value);
  return choice ? { choice, phase: reducedMotion ? 'settled' : 'waiting', elapsed: reducedMotion ? CLOCK_ECHO_DURATION : 0 } : null;
}
export function settleClockEcho(echo) {
  if (!echo) return;
  echo.phase = 'settled'; echo.elapsed = CLOCK_ECHO_DURATION;
}
export function advanceClockEcho(echo, dt, context = {}) {
  if (!echo || context.playing !== true || !Number.isFinite(dt) || dt <= 0) return;
  if (context.reducedMotion === true) { settleClockEcho(echo); return; }
  if (echo.phase === 'settled') return;
  if (echo.phase === 'waiting') {
    if (context.capPhase !== 'open' || !Number.isFinite(context.capAge) || context.capAge < 1.4 ||
        !Number.isFinite(context.capOpen) || context.capOpen < .85) return;
    echo.phase = 'playing'; echo.elapsed = 0;
  }
  if (context.capPhase === 'returning' || context.capOpen < .55) { settleClockEcho(echo); return; }
  echo.elapsed = Math.min(CLOCK_ECHO_DURATION, echo.elapsed + clamp(dt, 0, .04));
  if (echo.elapsed >= CLOCK_ECHO_DURATION - 1e-9) settleClockEcho(echo);
}
export function getClockEchoSnapshot(echo) {
  return echo ? { choice: echo.choice, phase: echo.phase, elapsed: echo.elapsed } : null;
}

function path(c, draw, fill, stroke = null, width = 1) {
  c.beginPath(); draw(c);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
}
function line(c, points, color, width = 1) {
  path(c, p => points.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)), null, color, width);
}
function oval(c, x, y, rx, ry, fill, stroke = null, width = 1) {
  path(c, p => p.ellipse(x, y, rx, ry, 0, 0, TAU), fill, stroke, width);
}
function box(c, x, y, w, h, fill, stroke = null, radius = 2) {
  path(c, p => p.roundRect(x, y, w, h, radius), fill, stroke);
}
function material(c, x, y, w, h, stops) {
  const g = c.createLinearGradient(x, y, x + w, y + h);
  for (const [at, color] of stops) g.addColorStop(at, color);
  return g;
}

// A folded little whale recalls Bluepage without duplicating the real NPC.
function paperWhale(c, x, y, scale = 1, angle = 0) {
  c.save(); c.translate(x, y); c.rotate(angle); c.scale(scale, scale);
  path(c, p => {
    p.moveTo(-20, 0); p.quadraticCurveTo(-19, -12, -8, -12); p.lineTo(7, -10);
    p.lineTo(17, -1); p.lineTo(25, -9); p.lineTo(24, 1); p.lineTo(29, 8);
    p.lineTo(15, 4); p.quadraticCurveTo(6, 15, -8, 10); p.quadraticCurveTo(-17, 8, -20, 0); p.closePath();
  }, material(c, -18, -12, 38, 25, [[0, '#e1ecd3'], [.34, '#b3d2cc'], [1, '#6f9da9']]), '#416d7c', .8);
  path(c, p => { p.moveTo(-17, 3); p.lineTo(5, 0); p.lineTo(16, 4); p.quadraticCurveTo(5, 12, -8, 9); p.closePath(); }, '#f2e5c3');
  line(c, [[-7, -10], [5, 0], [1, 8]], '#5b8a94a0', .75);
  path(c, p => { p.moveTo(2, 1); p.lineTo(10, 7); p.lineTo(0, 7); p.closePath(); }, '#8db3b6', '#557e8b', .65);
  line(c, [[17, -1], [24, 1], [24, 6]], '#5c8591', .7);
  oval(c, -12, -2, 1.5, 1.9, '#264653'); oval(c, -11.6, -2.5, .45, .6, '#fff6d7');
  c.restore();
}

function copperClock(c, x, y, scale = 1, time = 0) {
  c.save(); c.translate(x, y); c.scale(scale, scale);
  oval(c, 0, -29, 5.4, 6, '#b29c72', '#e8c896'); oval(c, 0, -29, 3.1, 3.7, '#34505a');
  const brass = material(c, -24, -26, 50, 52, [[0, '#f0d29b'], [.25, '#a5815e'], [.51, '#e4c38e'], [.8, '#8e8266'], [1, '#456e70']]);
  oval(c, 0, 0, 25, 27, brass, '#345560', 1.2);
  oval(c, 0, 0, 21, 23, '#244956', '#e5c896', .8);
  oval(c, 0, 0, 18, 20, material(c, -15, -20, 30, 40, [[0, '#486971'], [.55, '#294e5a'], [1, '#3a6268']]));
  for (let i = 0; i < 12; i++) {
    const a = i * TAU / 12;
    line(c, [[Math.sin(a) * 16, -Math.cos(a) * 18], [Math.sin(a) * (i % 3 ? 18 : 19), -Math.cos(a) * (i % 3 ? 20 : 21)]], '#e7d6b2', i % 3 ? .8 : 1.2);
  }
  const hand = finite(time) * .16;
  line(c, [[Math.sin(hand) * 12, -Math.cos(hand) * 15], [0, 0], [9, 5]], '#f7e5ba', 1.7);
  oval(c, 0, 0, 2.4, 2.4, '#dbbd86'); oval(c, -.4, -.6, .8, .8, '#fff0cc');
  path(c, p => { p.moveTo(-12, -14); p.quadraticCurveTo(-18, -6, -16, 2); }, null, '#d1e6d557', 1.2);
  c.restore();
}

function readingWindow(c, x, y, scale = 1) {
  c.save(); c.translate(x, y); c.scale(scale, scale);
  // A folded page, an open window and a small lamp: keeping is not locking.
  path(c, p => { p.moveTo(-25, -30); p.lineTo(15, -30); p.lineTo(25, -20); p.lineTo(25, 28); p.lineTo(-25, 28); p.closePath(); },
    material(c, -25, -30, 50, 60, [[0, '#f7e6bd'], [.6, '#ddc59d'], [1, '#b69878']]), '#7a837b', 1);
  path(c, p => { p.moveTo(15, -30); p.lineTo(15, -20); p.lineTo(25, -20); }, '#fdf0cf', '#bda783', .7);
  box(c, -17, -21, 33, 36, '#305560', '#a58b67', 5);
  box(c, -13, -17, 25, 28, material(c, -12, -17, 25, 28, [[0, '#aaccc05c'], [1, '#e0c78b57']]), '#7a9a91', 3);
  path(c, p => { p.moveTo(-17, -20); p.lineTo(-23, -16); p.lineTo(-23, 12); p.lineTo(-17, 15); p.closePath(); }, '#789e98', '#bfcaac', .7);
  path(c, p => { p.moveTo(16, -20); p.lineTo(21, -16); p.lineTo(21, 12); p.lineTo(16, 15); p.closePath(); }, '#6c9692', '#bfcaac', .7);
  line(c, [[-18, 16], [19, 16]], '#dfd4ab', 2.3);
  line(c, [[-17, 22], [11, 22]], '#a48d72', .7);
  line(c, [[6, 10], [6, 1]], '#e7cc90', 1.4); oval(c, 6, -1, 4, 5, '#f1cd84');
  oval(c, 5.6, -2, 1.5, 2.6, '#fff1b9'); oval(c, 6, 10, 4.5, 1.2, '#c6a576');
  line(c, [[-7, -15], [-7, 11]], '#dfd4ad7d', .8);
  c.restore();
}

export function drawClockMiniature(c, echo, time = 0) {
  const choice = normalizeClockChoice(echo?.choice);
  if (!c || !choice) return;
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  if (choice === 'release') {
    copperClock(c, -4, -16, 1, time);
    paperWhale(c, 31, -31, .5, -.2);
    path(c, p => { p.moveTo(10, -8); p.quadraticCurveTo(35, -7, 39, -21); }, null, '#d6e8c995', .9);
  } else {
    readingWindow(c, 0, -14, 1);
    paperWhale(c, -1, -14, .38, .02);
  }
  c.restore();
}

// The projection follows the existing head rig, with horizontal bounds in the
// actual view. It never moves the player, lamp, hazard, camera or saved reply.
export function drawClockEcho(c, echo, presentation = {}) {
  const choice = normalizeClockChoice(echo?.choice), opening = presentation.opening;
  if (!c || !choice || echo.phase !== 'playing' || !opening ||
      !Number.isFinite(opening.x) || !Number.isFinite(opening.y)) return;
  const p = clamp(finite(echo.elapsed) / CLOCK_ECHO_DURATION, 0, 1);
  const camera = finite(presentation.camera), width = Math.max(160, finite(presentation.width, 1100));
  const face = presentation.face === -1 ? -1 : 1;
  const x = clamp(opening.x + face * 72, camera + 43, camera + width - 43), y = opening.y - 94;
  const alpha = ease(p / .13) * (1 - ease((p - .8) / .2));
  c.save(); c.globalAlpha *= alpha; c.lineJoin = 'round'; c.lineCap = 'round';
  const glow = c.createRadialGradient(x, y, 3, x, y, 57);
  glow.addColorStop(0, choice === 'release' ? '#bde3d325' : '#f3d29429'); glow.addColorStop(1, '#ccdfc800');
  c.fillStyle = glow; c.fillRect(x - 57, y - 57, 114, 114);
  path(c, q => { q.moveTo(opening.x - 6, opening.y); q.lineTo(x - 22, y + 29); q.lineTo(x + 22, y + 29); q.lineTo(opening.x + 6, opening.y); q.closePath(); }, '#c2ded80b');
  if (choice === 'release') {
    copperClock(c, x, y, .87, echo.elapsed * 2);
    const q = ease(p / .72), u = 1 - q;
    const wx = u * u * opening.x + 2 * u * q * (x - face * 40) + q * q * (x + face * 24);
    const wy = u * u * opening.y + 2 * u * q * (y - 39) + q * q * (y - 28);
    c.save(); c.globalAlpha *= 1 - ease((p - .63) / .3);
    paperWhale(c, wx, wy, .78 - .3 * q, -face * (.15 + Math.sin(p * Math.PI) * .2)); c.restore();
    // One expanding bell ring fades out; the persistent watch lives in the cap.
    const ring = ease((p - .35) / .55);
    c.save(); c.globalAlpha *= Math.sin(ring * Math.PI) * .5;
    oval(c, x, y, 25 + ring * 16, 27 + ring * 17, null, '#e6d8ac', .9); c.restore();
  } else {
    const rise = ease(p / .36), home = ease((p - .59) / .33);
    const px = (opening.x + (x - opening.x) * rise) * (1 - home) + (opening.x - face * 9) * home;
    const py = (opening.y + (y - opening.y) * rise) * (1 - home) + (opening.y - 8) * home;
    readingWindow(c, px, py, .86 - .59 * home);
    paperWhale(c, px - 2, py - 3, .34 - .2 * home, 0);
  }
  c.restore();
}

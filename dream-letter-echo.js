// A saved reply can be seen again when the head opens. This is presentation,
// never a second delivery, collectible, timer, reward or source of story facts.
const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const ease = value => { const q = clamp(value, 0, 1); return q * q * (3 - 2 * q); };
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
export const LETTER_ECHO_DURATION = 2.8;
export const LETTER_SCENE_WINDOW = Object.freeze({ x: 172, y: 382 });

export function normalizeLetterChoice(value) {
  return value === 'send' || value === 'keep' ? value : null;
}

export function createLetterEcho(value, reducedMotion = false) {
  const choice = normalizeLetterChoice(value);
  return choice ? { choice, phase: reducedMotion ? 'settled' : 'waiting', elapsed: reducedMotion ? LETTER_ECHO_DURATION : 0 } : null;
}

export function settleLetterEcho(echo) {
  if (!echo) return;
  echo.phase = 'settled'; echo.elapsed = LETTER_ECHO_DURATION;
}

// Called only by the game's existing update. Wait for the usual cap projection
// to finish so the flower, soul and new little window do not talk at once.
export function advanceLetterEcho(echo, dt, context = {}) {
  if (!echo || context.playing !== true || !(dt > 0)) return;
  if (context.reducedMotion === true) { settleLetterEcho(echo); return; }
  if (echo.phase === 'settled') return;
  if (echo.phase === 'waiting') {
    if (context.capPhase !== 'open' || context.capAge < 1.4 || context.capOpen < .85) return;
    echo.phase = 'playing'; echo.elapsed = 0;
  }
  if (context.capPhase === 'returning' || context.capOpen < .55) { settleLetterEcho(echo); return; }
  echo.elapsed = Math.min(LETTER_ECHO_DURATION, echo.elapsed + clamp(finite(dt), 0, .04));
  if (echo.elapsed >= LETTER_ECHO_DURATION - 1e-9) settleLetterEcho(echo);
}

export function getLetterEchoSnapshot(echo) {
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
function oval(c, x, y, rx, ry, color) {
  path(c, p => p.ellipse(x, y, rx, ry, 0, 0, TAU), color);
}
function box(c, x, y, w, h, fill, stroke = null, radius = 2) {
  path(c, p => p.roundRect(x, y, w, h, radius), fill, stroke);
}

function envelope(c, x, y, scale = 1, turn = 0) {
  c.save(); c.translate(x, y); c.rotate(turn); c.scale(scale, scale);
  box(c, -15, -9, 30, 19, '#f3dfb8', '#8f7960');
  path(c, p => { p.moveTo(-14, 9); p.lineTo(-1, -1); p.lineTo(14, 9); }, '#e5c99b');
  line(c, [[-14, -8], [0, 2], [14, -8]], '#ac8b66', 1.1);
  line(c, [[-12, -7], [0, 1], [12, -7]], '#fff2d3', .65);
  oval(c, 0, 2, 3, 3, '#c78070'); oval(c, -.6, 1.2, 1.1, 1, '#f5b39a');
  box(c, 8, -6, 4, 5, '#8ba99d', '#b8d3b9', .5);
  line(c, [[-11, 6], [-7, 6]], '#b79974', .7); c.restore();
}

function windowFrame(c, choice, t = 0) {
  // A copper frame and two distinct shutters remain readable when projected.
  box(c, -21, -28, 42, 56, '#132c3566', null, 7);
  box(c, -19, -30, 38, 54, '#192f30', '#c6ae7f', 6);
  const light = c.createLinearGradient(0, -27, 0, 21);
  light.addColorStop(0, choice === 'keep' ? '#e5c27b57' : '#99d9d150');
  light.addColorStop(1, '#b8cba014');
  box(c, -15, -26, 30, 46, light, '#7e9b86', 4);
  const spread = choice === 'send' ? 11 : 5;
  for (const side of [-1, 1]) {
    path(c, p => {
      p.moveTo(side * 18, -26); p.lineTo(side * (18 + spread), -22);
      p.lineTo(side * (18 + spread), 18); p.lineTo(side * 18, 21); p.closePath();
    }, '#567e70', '#a6b591');
    line(c, [[side * 20, -17], [side * (17 + spread), -15]], '#c6d3ad', .7);
    line(c, [[side * 20, 10], [side * (17 + spread), 8]], '#293f3a', .7);
    oval(c, side * 19, -19, 1.3, 1.3, '#dcc493');
  }
  box(c, -23, 20, 46, 5, '#bba277', '#e3c99c', 1);
  line(c, [[-16, -26], [-16, 16]], '#eee1b15c', .8);
  for (const side of [-1, 1]) oval(c, side * 16, 18, 1.1, 1.1, '#e4c795');
  if (choice === 'send') {
    for (const [offset, alpha] of [[0, 'aa'], [8, '66']]) {
      const sway = Math.sin(t * 1.7 + offset) * 2;
      path(c, p => { p.moveTo(-12, -4 + offset); p.bezierCurveTo(-3, -10 + offset, 8, 3 + offset + sway, 18, -5 + offset); }, null, '#c4e6d2' + alpha, 1.3);
    }
    // The empty sill is intentional: a sent letter is not still being kept.
    line(c, [[-8, -15], [-3, -18], [1, -15], [6, -18], [11, -15]], '#e9e5c4', 1.1);
  } else {
    line(c, [[0, -26], [0, 15]], '#b4b68c', 1);
    line(c, [[-14, -6], [14, -6]], '#b4b68c', 1);
    box(c, -14, 11, 28, 5, '#9b7f5d', '#d4b88b', 1);
  }
}

// Inside the established [-60,60] miniature bounds, to the left of the real
// plant. Only this painter knows the window; it cannot grow or collect a seed.
export function drawLetterMiniature(c, echo, t = 0) {
  const choice = normalizeLetterChoice(echo?.choice);
  if (!c || !choice) return;
  c.save(); c.translate(-35, -23); c.scale(.57, .57);
  windowFrame(c, choice, finite(t));
  if (choice === 'keep') envelope(c, 0, 7, .72, -.08);
  c.restore();
}

// A quiet persistent wall window above the first stretch of floor. It does not
// resemble a pickup or platform and is never included in collision geometry.
export function drawLetterSceneWindow(c, choice, t = 0) {
  choice = normalizeLetterChoice(choice);
  if (!c || !choice) return;
  c.save(); c.translate(LETTER_SCENE_WINDOW.x, LETTER_SCENE_WINDOW.y); c.scale(.98, .98); c.globalAlpha *= .78;
  const glow = c.createRadialGradient(0, 0, 2, 0, 0, 55);
  glow.addColorStop(0, choice === 'keep' ? '#e4c38418' : '#a6e2d21b'); glow.addColorStop(1, '#b3d7bd00');
  c.fillStyle = glow; c.fillRect(-55, -55, 110, 110);
  windowFrame(c, choice, finite(t));
  // An amber reading lamp stands for keeping; no duplicate letter is drawn.
  if (choice === 'keep') {
    line(c, [[8, 16], [8, 4]], '#cfb480', 1.5); oval(c, 8, 3, 4, 6, '#ebce8b');
    oval(c, 7, 2, 1.5, 3, '#fff0bd');
  }
  c.restore();
}

// Drawing receives a snapshot and the existing rig; it never changes an echo,
// advances a clock, schedules a frame or writes game progress.
export function drawLetterEcho(c, echo, presentation = {}) {
  const choice = normalizeLetterChoice(echo?.choice);
  if (!c || !choice || echo.phase !== 'playing') return;
  const opening = presentation.opening;
  if (!opening || !Number.isFinite(opening.x) || !Number.isFinite(opening.y)) return;
  const p = clamp(finite(echo.elapsed) / LETTER_ECHO_DURATION, 0, 1);
  const face = presentation.face === -1 ? -1 : 1;
  const camera = finite(presentation.camera), width = Math.max(160, finite(presentation.width, 1100));
  // Near the entrance, the memory uses the already-visible wall window.
  // Elsewhere it borrows a projected window above the head. Never stack both.
  const wallWindow = LETTER_SCENE_WINDOW.x > camera + 40 && LETTER_SCENE_WINDOW.x < camera + width - 40
    && Math.hypot(opening.x - LETTER_SCENE_WINDOW.x, opening.y - LETTER_SCENE_WINDOW.y) < 220;
  const x = wallWindow ? LETTER_SCENE_WINDOW.x : clamp(opening.x + face * 68, camera + 45, camera + width - 45);
  const y = wallWindow ? LETTER_SCENE_WINDOW.y : opening.y - 90;
  const alpha = ease(p / .13) * (1 - ease((p - .8) / .2));
  c.save(); c.globalAlpha *= alpha;
  const glow = c.createRadialGradient(x, y, 3, x, y, 56);
  glow.addColorStop(0, '#d5e5b923'); glow.addColorStop(1, '#d5e5b900');
  c.fillStyle = glow; c.fillRect(x - 56, y - 56, 112, 112);
  if (!wallWindow) {
    path(c, p => { p.moveTo(opening.x - 6, opening.y); p.lineTo(x - 25, y + 23); p.lineTo(x + 25, y + 23); p.lineTo(opening.x + 6, opening.y); p.closePath(); }, '#b7d9bf09');
    c.save(); c.translate(x, y); windowFrame(c, choice, echo.elapsed); c.restore();
  }
  let q, lx, ly, angle, scale;
  if (choice === 'send') {
    q = ease(p / .75);
    const u = 1 - q;
    lx = u * u * opening.x + 2 * u * q * (x - face * 35) + q * q * (x + face * 30);
    ly = u * u * opening.y + 2 * u * q * (y - 35) + q * q * (y - 19);
    angle = face * (.18 + Math.sin(p * TAU * 1.6) * .16); scale = 1 - .4 * ease((p - .55) / .4);
    line(c, [[opening.x, opening.y - 4], [opening.x + face * 9, opening.y - 18]], '#d6edcc55', 1);
    c.globalAlpha *= 1 - ease((p - .68) / .25);
  } else {
    q = ease(p / .45);
    const home = ease((p - .6) / .32);
    lx = (opening.x + (x - opening.x) * q) * (1 - home) + (opening.x - face * 12) * home;
    ly = (opening.y + (y + 7 - opening.y) * q - Math.sin(q * Math.PI) * 20) * (1 - home) + (opening.y - 8) * home;
    angle = -.08 + Math.sin(p * Math.PI) * .12; scale = 1 - .72 * home;
  }
  envelope(c, lx, ly, scale, angle); c.restore();
}

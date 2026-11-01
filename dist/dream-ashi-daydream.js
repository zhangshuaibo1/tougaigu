// First-chapter production Canvas character study: the title is a metaphor for
// imagination, not a skull or a removable helmet. Pure drawing; existing cap
// physics, character rig, hand grip, saves, sound and rewards remain authoritative.
import { CAP_GRIP } from './dream-cap-art.js';
import { getOutfitPalette } from './dream-festival-art.js';
const TAU = Math.PI * 2;
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const number = (n, otherwise = 0) => Number.isFinite(n) ? n : otherwise;
const color = (n, fallback) => /^#[0-9a-f]{6}$/i.test(n || '') ? n : fallback;
function oval(c, x, y, rx, ry, paint, rotation = 0) {
  c.beginPath(); c.ellipse(x, y, rx, ry, rotation, 0, TAU);
  c.fillStyle = paint; c.fill();
}
function stroke(c, points, paint, width = 1) {
  c.beginPath();
  for (const [i, p] of points.entries()) i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]);
  c.strokeStyle = paint; c.lineWidth = width; c.stroke();
}
function curve(c, coords, paint, width = 1) {
  c.beginPath(); c.moveTo(coords[0], coords[1]); c.bezierCurveTo(...coords.slice(2));
  c.strokeStyle = paint; c.lineWidth = width; c.stroke();
}
function fillGradient(c, x0, y0, x1, y1, stops) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  for (const [p, color] of stops) g.addColorStop(p, color);
  return g;
}
function star(c, x, y, size, paint) {
  c.beginPath(); c.moveTo(x, y - size); c.quadraticCurveTo(x + size * .16, y - size * .12, x + size, y);
  c.quadraticCurveTo(x + size * .16, y + size * .14, x, y + size);
  c.quadraticCurveTo(x - size * .18, y + size * .12, x - size, y);
  c.quadraticCurveTo(x - size * .16, y - size * .15, x, y - size);
  c.fillStyle = paint; c.fill();
}
export function isFirstChapterDaydream(game) {
  return game?.daydreamFirstChapter === true && game?.mode === 'story' && game?.chapterIndex === 0;
}
export function getDaydreamFaceView(game, body = game?.body, t = 0, shown = null) {
  if (!isFirstChapterDaydream(game) || !body) return null;
  const reduced = !!game?.options?.reducedMotion;
  const tired = number(game?.energy, 100) < 20;
  const smiling = number(game?.emoteTime) > 0 && !tired;
  const attentive = game?.form === 'soul' || game?.cap?.phase === 'returning';
  const opening = game?.cap?.phase === 'opening';
  const clock = reduced ? 0 : number(t);
  const blink = Math.sin(clock * 1.27 + .4) > .985 ? .14 : tired ? .42 : opening ? 1.05 : smiling ? .75 : 1;
  const face = body.face === -1 ? -1 : 1;
  const focus = attentive ? clamp((number(shown?.x, number(body.x)) - number(body.x)) * face / 100, -3, 3)
    : clamp(number(body.vx) * face / 180, -1.3, 1.3) + .35;
  return Object.freeze({reduced, tired, smiling, attentive, opening, blink, focus,
    drift: reduced ? 0 : clamp(number(body.vx) / 210, -1, 1) * 1.8,
    rise: reduced ? 0 : clamp(-number(body.vy) / 650, 0, 1),
    glow: color(game?.level?.theme?.light, '#e9bf78'),
    spirit: color(game?.level?.theme?.spirit, '#a2ead9')});
}

// Draws into the *existing* headLocalMatrix, without altering world transforms.
// The face is continuous even when E opens the imagination window above it.
export function drawFirstChapterDaydreamFace(c, game, body, t, shown) {
  const v = getDaydreamFaceView(game, body, t, shown);
  if (!v) return false;
  c.save();
  try {
    c.lineCap = 'round'; c.lineJoin = 'round';
    // A delicate fabric collar under the chin, preserving original 42px head size.
    oval(c, 0, 18, 17, 7, '#879d988c');
    curve(c, [-13, 17, -8, 22, 8, 22, 13, 17], '#e7d9bd', 2.2);
    // Warm cheeks and rounded jaw, not a bone mask or exposed skull.
    c.beginPath(); c.moveTo(-19, -15); c.bezierCurveTo(-26, -5, -22, 13, -13, 19);
    c.quadraticCurveTo(0, 28, 13, 19); c.bezierCurveTo(22, 13, 26, -5, 19, -15);
    c.quadraticCurveTo(0, -27, -19, -15); c.closePath();
    c.fillStyle = fillGradient(c, -21, -22, 22, 24, [
      [0, '#fff0d6'], [.27, '#ffe3cb'], [.61, '#e8bda9'], [1, '#c8958d']]);
    c.fill(); c.strokeStyle = '#9a727278'; c.lineWidth = .95; c.stroke();
    // Broad cheek shadows and a pearl edge allow the face to read at 320px.
    oval(c, -16, 7, 5.1, 4.6, '#ca8f9060'); oval(c, 16, 7, 5.1, 4.6, '#c78d8b60');
    curve(c, [-16, -3, -20, 8, -14, 16, -8, 18], '#fff3dda6', 1.25);
    curve(c, [17, -3, 20, 8, 13, 16, 8, 19], '#925e685a', 1.2);
    // The hair is attached to the real head at every cap phase; nothing peels off.
    const sway = v.drift * .6 - v.rise * .4;
    c.beginPath(); c.moveTo(-20, -11); c.bezierCurveTo(-25, -33, -7, -39, 10, -34);
    c.bezierCurveTo(25, -32, 27, -17, 18, -9); c.quadraticCurveTo(15, -20, 8, -18);
    c.quadraticCurveTo(2, -10, -3, -13); c.quadraticCurveTo(-12, -21, -20, -11); c.closePath();
    c.fillStyle = fillGradient(c, -20, -33, 20, -9, [
      [0, '#334c56'], [.31, '#526275'], [.58, '#767084'], [1, '#354b61']]); c.fill();
    c.beginPath(); c.moveTo(-21, -12); c.bezierCurveTo(-25, -20, -18, -31, -6, -33);
    c.quadraticCurveTo(-19 + sway, -23, -13 + sway, -15); c.quadraticCurveTo(-17, -11, -21, -12); c.fillStyle = '#3f5869'; c.fill();
    curve(c, [-18, -27, -6, -35, 6, -35, 13, -27], '#d7c3bd70', 1.25);
    curve(c, [-7, -28, 1 + sway, -25, 5 + sway, -22, 8, -15], '#a8a0a8a0', 1);
    // Hair ribbon at the back, not a hat or metallic crown.
    curve(c, [14, -26, 22, -24, 23, -19, 22, -12], '#8abfbaa0', 2.2);
    // Soft brows, curved eyelids and finite gaze keep old attention semantics.
    for (const x of [-9, 9]) {
      curve(c, [x - 4.8, -5.9, x - 3, -8.8, x + 2.5, -9, x + 5.4, -6.3], '#5e5360', 1.1);
      if (v.blink < .35 || v.smiling) {
        curve(c, [x - 5.1, 1.4, x - 3.4, -1.2, x + 3.8, -1.2, x + 5.2, 1.2], '#544956', 1.75);
        if (v.tired) curve(c, [x - 4, 2.7, x - 1, 4, x + 2, 3.9, x + 4, 2.5], '#ae7a7d', .85);
      } else {
        oval(c, x, .5, 5.3, 5.6 * v.blink, '#fff6e8');
        oval(c, x + v.focus, .4 + (v.attentive ? -1 : .1), 2.5, 3.3 * v.blink, '#405666');
        oval(c, x + v.focus + .7, -1.2, .8, 1.15, '#fff8e8');
        curve(c, [x - 4.6, -2.6, x - 1.8, -4.5, x + 2, -4.4, x + 4.8, -2.1], '#524452', 1.55);
      }
    }
    oval(c, 0, 9, 2.3, 1.4, '#bd8886');
    curve(c, [0, 9.1, -.8, 11, -.7, 11.8, 1.2, 12.1], '#a06e73', .8);
    if (v.tired) oval(c, .5, 16.5, 2.7, 2, '#845d66');
    else if (v.smiling) curve(c, [-6, 15.1, -4, 20.6, 4.5, 20.7, 6.5, 15], '#995e6b', 1.55);
    else curve(c, [-4.2, 16.1, -1.6, 17.9, 2.9, 18, 4.5, 16], '#986e72', 1.3);
    if (v.smiling && !v.reduced) star(c, 21, -3, 2.2, v.glow + 'ba');
    return true;
  } finally { c.restore(); }
}

// The original real hand still follows CAP_GRIP through capLocalMatrix. What
// it now holds is a translucent trail of thoughts, not a piece of headgear.
export function drawFirstChapterThoughtRibbon(c, game, t, rig, outfit = 'auto') {
  if (!isFirstChapterDaydream(game)) return false;
  const reduced = !!game.options?.reducedMotion;
  const open = clamp(number(game.capOpen), 0, 1);
  const pulse = reduced ? 0 : Math.sin(number(t) * 2.1) * open * .8;
  const dress = getOutfitPalette(outfit);
  const accent = color(dress.scarf, '#d7b7ba');
  c.save();
  try {
    c.transform(...rig.capLocalMatrix);
    c.lineCap = 'round'; c.lineJoin = 'round';
    // The left anchor remains exactly at the old wrist grip, both facings.
    curve(c, [CAP_GRIP.x, CAP_GRIP.y, -11, -24 - pulse, 9, -35 - pulse, 21, -26], accent + '8c', 3.4);
    curve(c, [-16, -15, -9, -28 - pulse, 6, -31 - pulse, 19, -23], '#fff3dda0', 1.35);
    curve(c, [CAP_GRIP.x, CAP_GRIP.y, 1, -22, 16, -8 + pulse, 22, -16], '#98dcd29c', 2.2);
    curve(c, [2, -33 - pulse, 7, -41 - pulse, 18, -39, 23, -32], '#b6ccde7d', 1.5);
    oval(c, CAP_GRIP.x, CAP_GRIP.y, 3.2, 3.2, '#ffdfb8');
    oval(c, CAP_GRIP.x, CAP_GRIP.y, 1.4, 1.4, '#fdf7de');
    star(c, 20, -26 - pulse, 3.9 + open, '#ffe6a1');
    star(c, 7, -32 - pulse, 2.1, '#b8f0de');
    if (open > .12) {
      const g = c.createRadialGradient(2, -19, 1, 2, -19, 32);
      g.addColorStop(0, '#e5fff2' + Math.round(open * 50).toString(16).padStart(2, '0'));
      g.addColorStop(1, '#e5fff200');
      c.fillStyle = g; c.fillRect(-30, -55, 70, 70);
    }
    return true;
  } finally { c.restore(); }
}
export function drawFirstChapterThoughtRim(c, game) {
  if (!isFirstChapterDaydream(game)) return false;
  const open = clamp(number(game.capOpen), 0, 1);
  if (open <= .02) return true;
  c.save();
  try {
    c.globalAlpha *= open;
    // One flicker-free glowing crescent, not a rigid exposed-bone rim.
    c.beginPath(); c.ellipse(0, -17, 20, 6.2, 0, .12, Math.PI - .12);
    c.strokeStyle = '#a5dec7'; c.lineWidth = 2.3; c.stroke();
    c.beginPath(); c.ellipse(0, -18, 18, 4.5, 0, .08, Math.PI - .08);
    c.strokeStyle = '#fff1c58a'; c.lineWidth = 1.1; c.stroke();
    return true;
  } finally { c.restore(); }
}

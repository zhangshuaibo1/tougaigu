// Shiguang is the same small white-and-mint soul that lives in Ashi's cap.
// Presentation only: the engine owns its pose, layer, position, flight, energy,
// carried objects and clock. In particular, this painter never advances a return.
import { drawFirstTicket } from './dream-first-ticket-art.js';
import { drawGreenhouseSeed } from './dream-greenhouse-art.js';
import { hasSoulJoy } from './dream-traveler-face.js';

const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const color = (value, fallback) => /^#[\da-f]{6}$/i.test(value || '') ? value : fallback;
const REQUIRED = ['save', 'restore', 'translate', 'rotate', 'scale', 'beginPath',
  'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'closePath', 'ellipse',
  'arc', 'fill', 'stroke', 'fillRect', 'roundRect', 'createLinearGradient', 'createRadialGradient'];

function gradient(c, x0, y0, x1, y1, stops) {
  const paint = c.createLinearGradient(x0, y0, x1, y1);
  for (const [at, shade] of stops) paint.addColorStop(at, shade);
  return paint;
}
function oval(c, x, y, rx, ry, paint) {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU);
  c.fillStyle = paint; c.fill();
}
function curve(c, points, paint, width = 1) {
  c.beginPath(); c.moveTo(points[0], points[1]); c.bezierCurveTo(...points.slice(2));
  c.strokeStyle = paint; c.lineWidth = width; c.stroke();
}
function star(c, x, y, radius, paint) {
  c.beginPath(); c.moveTo(x, y - radius);
  c.quadraticCurveTo(x + radius * .2, y - radius * .2, x + radius, y);
  c.quadraticCurveTo(x + radius * .2, y + radius * .2, x, y + radius);
  c.quadraticCurveTo(x - radius * .2, y + radius * .2, x - radius, y);
  c.quadraticCurveTo(x - radius * .2, y - radius * .2, x, y - radius);
  c.closePath(); c.fillStyle = paint; c.fill();
}

function silhouette(c, tailX, tailY) {
  // Long hair is the moving outer silhouette, not a floating spirit tail.
  // The same bounded velocity response keeps the girl readable in phone play.
  c.beginPath(); c.moveTo(-15, 4);
  c.bezierCurveTo(-20, -7, -17, -24, -8, -31);
  c.quadraticCurveTo(0, -37, 9, -30);
  c.bezierCurveTo(18, -24, 18, -8, 15, 4);
  c.bezierCurveTo(18, 11, tailX + 7, tailY - 4, tailX + 1, tailY);
  c.bezierCurveTo(tailX - 3, tailY + 2, 8, 17, 4, 12);
  c.bezierCurveTo(0, 9, -5, 15, -10, 12);
  c.bezierCurveTo(-14, 10, -17, 7, -15, 4);
  c.closePath();
}

function humanShiguang(c, tailX, tailY, spirit, vx, vy, returning, peeking, reduced) {
  // Back hair: chestnut brown, long and softly separated into two flowing locks.
  const hair = gradient(c, -18, -34, 22, 30, [
    [0, '#684638'], [.28, '#49332f'], [.66, '#34272a'], [1, '#241f29'],
  ]);
  silhouette(c, tailX, tailY); c.fillStyle = hair; c.fill();
  c.strokeStyle = '#241f29'; c.lineWidth = 1.15; c.stroke();
  curve(c, [-12, -18, -18, -5, -13, 9, tailX - 2, tailY - 3], '#9b7052b8', 1.15);
  curve(c, [10, -17, 17, -3, 13, 10, 8 + tailX * .18, 25], '#9b705277', 1.05);
  curve(c, [-8, -28, -3, -32, 3, -31, 7, -26], '#c18b647e', 1.2);

  // Full human body. The arms and legs respond to the actual flight vector;
  // they do not affect collision, velocity, anchors or any game state.
  const lean = reduced ? 0 : clamp(vx / 340, -1, 1) * .08;
  const reach = returning ? .55 : peeking ? -.12 : clamp(Math.abs(vx) / 340, 0, 1) * .3;
  c.save(); c.rotate(lean);
  // Legs and shoes sit behind the coat hem.
  curve(c, [-4, 17, -6, 23, -7 + reach * 2, 30, -8 + reach * 2, 34], '#594b49', 4.1);
  curve(c, [4, 17, 6, 23, 7 - reach * 2, 30, 8 - reach * 2, 34], '#594b49', 4.1);
  curve(c, [-4, 18, -6, 24, -7 + reach * 2, 30, -8 + reach * 2, 33], '#e2d5c2', 2.25);
  curve(c, [4, 18, 6, 24, 7 - reach * 2, 30, 8 - reach * 2, 33], '#e2d5c2', 2.25);
  oval(c, -9 + reach * 2, 34, 4.5, 2.2, '#5a4542');
  oval(c, 9 - reach * 2, 34, 4.5, 2.2, '#5a4542');

  // Arms are visible beside the coat and settle inward during a return.
  const armSweep = reduced ? 0 : clamp(vy / 340, -1, 1) * 2.2;
  curve(c, [-8, -5, -15, -4 - reach * 5, -18 - reach * 2, 3 + armSweep, -15, 10 + armSweep], '#c7b49f', 5.2);
  curve(c, [8, -5, 15, -4 - reach * 5, 18 + reach * 2, 3 + armSweep, 15, 10 + armSweep], '#c7b49f', 5.2);
  curve(c, [-8, -5, -15, -4 - reach * 5, -18 - reach * 2, 3 + armSweep, -15, 9 + armSweep], '#eee0ca', 3.1);
  curve(c, [8, -5, 15, -4 - reach * 5, 18 + reach * 2, 3 + armSweep, 15, 9 + armSweep], '#eee0ca', 3.1);
  oval(c, -15, 10 + armSweep, 2.4, 2.7, '#e9c9b0');
  oval(c, 15, 10 + armSweep, 2.4, 2.7, '#e9c9b0');

  // Beige outer coat with lapels, seams and a softly shaded hem.
  c.beginPath(); c.moveTo(-9, -8); c.quadraticCurveTo(-13, -4, -11, 7);
  c.lineTo(-9, 22); c.quadraticCurveTo(0, 25, 9, 22);
  c.lineTo(11, 7); c.quadraticCurveTo(13, -4, 9, -8);
  c.quadraticCurveTo(0, -12, -9, -8); c.closePath();
  c.fillStyle = gradient(c, -12, -9, 12, 23, [
    [0, '#fff0d9'], [.35, '#e9d9c2'], [.72, '#d4c0a8'], [1, '#9c8d82'],
  ]); c.fill(); c.strokeStyle = '#8f7e72'; c.lineWidth = .85; c.stroke();
  curve(c, [-8, -5, -5, -1, -2, 1, 0, 5], '#fff7e4', 1.1);
  curve(c, [8, -5, 5, -1, 2, 1, 0, 5], '#b49e8d', 1.05);
  curve(c, [-8, 17, -3, 19, 3, 19, 8, 17], '#fff0d2a6', .8);
  curve(c, [0, 5, -.5, 10, .5, 16, 0, 21], '#aa9585a8', .8);
  for (const y of [9, 14]) oval(c, 1.7, y, .7, .7, '#8c776b');

  // Neck, skin and a real human face. The face landmarks remain at the
  // established play-scale positions so existing expression timing is kept.
  c.beginPath(); c.roundRect(-3.2, -13, 6.4, 9, 2); c.fillStyle = '#e7bfa6'; c.fill();
  oval(c, -11, -7, 2.2, 3, '#dcae96'); oval(c, 11, -7, 2.2, 3, '#dcae96');
  const skin = gradient(c, -11, -21, 11, 8, [
    [0, '#ffe0c7'], [.42, '#f0c8ae'], [1, '#d99f88'],
  ]);
  oval(c, 0, -8, 10.7, 13.4, skin);
  curve(c, [-9, -13, -10, -5, -7, 2, -3, 4], '#fff0d4a0', .9);
  // Long side locks frame rather than obscure the face.
  c.beginPath(); c.moveTo(-11, -23); c.quadraticCurveTo(-17, -9, -13, 8);
  c.quadraticCurveTo(-11, 14, -8, 17); c.quadraticCurveTo(-10, 3, -9, -5);
  c.closePath(); c.fillStyle = hair; c.fill();
  c.beginPath(); c.moveTo(11, -23); c.quadraticCurveTo(17, -8, 13, 8);
  c.quadraticCurveTo(11, 14, 8, 17); c.quadraticCurveTo(10, 3, 9, -5);
  c.closePath(); c.fillStyle = hair; c.fill();
  // Two separate locks catch the same side light as the full-length hair.
  // They remain under the scarf, so no strand can cover the eyes or nose.
  curve(c, [-14, -15, -16, -7, -13, 7, -10, 13], '#bd8b6b82', .72);
  curve(c, [12, -17, 15, -8, 13, 6, 10, 13], '#926b5b9c', .86);

  // Red scarf is a clear identity marker, with a restrained wind-driven tail.
  c.beginPath(); c.moveTo(-8, -5); c.quadraticCurveTo(0, -1, 8, -5);
  c.lineTo(7, 1); c.quadraticCurveTo(0, 5, -7, 1); c.closePath();
  c.fillStyle = gradient(c, -8, -5, 8, 2, [[0, '#9d3f49'], [.45, '#d75d60'], [1, '#a63e4d']]); c.fill();
  curve(c, [-6, -2, -3, 0, 2, 1, 6, -2], '#f3a09a', .75);
  c.beginPath(); c.moveTo(-7, -2); c.bezierCurveTo(-15, -1, -22, -5 + tailY * .08, -29 - tailX * .25, -3 + tailX * .08);
  c.lineTo(-27 - tailX * .25, 2 + tailX * .08); c.bezierCurveTo(-18, 3, -12, 4, -6, 2);
  c.closePath(); c.fillStyle = gradient(c, -28, -5, -7, 3, [[0, '#ef8580'], [.5, '#c94d59'], [1, '#873846']]); c.fill();
  curve(c, [-25 - tailX * .2, -2 + tailX * .06, -19, -1, -13, 1, -8, 0], '#f4aaa0b8', .7);
  // Hem stitching follows the same real velocity-derived tailX, not a new clock.
  curve(c, [-27 - tailX * .25, 1 + tailX * .08, -20, 2, -15, 2, -9, 1], '#7c354899', .65);
  curve(c, [-4, -1, 0, 1, 4, 1, 6, -1], '#ed9893b0', .6);

  // A warm hair clip replaces the old floating forehead star.
  oval(c, -8.5, -20.2, 2.1, 1.3, '#e8b56d');
  oval(c, -8.5, -20.2, .8, .65, '#fff0c7');
  c.restore();
  // The tiny chapter light is reflected on the hair, not emitted as a fairy halo.
  oval(c, 8.4, -27.4, 1.1, .65, spirit + '9a');
}
function soulFace(c, { time, vx, vy, sleepy, returning, peeking, joyful, light }) {
  const lookX = clamp(vx / 250, -1.2, 1.2), lookY = clamp(vy / 340, -1, 1) * .45;
  // A narrow, smooth blink uses only the supplied render clock. Low energy
  // remains a held expression; returning gets a relieved, small smile.
  const blink = 1 - .84 * clamp((Math.sin(time * 1.42 + 1) - .975) / .025, 0, 1);
  const eyelid = sleepy ? .42 : blink;
  const eye = gradient(c, -4, -11, 7, -.5, [[0, '#254d55'], [.65, '#355d62'], [1, '#4b807a']]);
  for (const x of [-6, 7]) {
    if (returning) {
      const rise = sleepy ? 2.3 : 3.8, y = sleepy ? -4.9 : -4.4;
      curve(c, [x - 3, y, x - 1.3, y - rise, x + 1.3, y - rise, x + 3, y], '#35545d', 1.7);
      curve(c, [x - 2.1, y + 1.2, x - .8, y + 1.5, x + .8, y + 1.5, x + 2.1, y + .8], '#9ed2b75b', .65);
    } else if (joyful && eyelid > .3) {
      // A real success has a broad closed-eye crescent, distinct from both the
      // round gaze and the low-energy half lid at the native phone size.
      c.beginPath(); c.moveTo(x - 4.3, -3.5);
      c.bezierCurveTo(x - 4.6, -9.6, x + 4.6, -9.6, x + 4.3, -3.5);
      c.bezierCurveTo(x + 2.3, -6.7, x - 2.3, -6.7, x - 4.3, -3.5);
      c.closePath(); c.fillStyle = eye; c.fill();
    } else {
      oval(c, x, -6, 4, 5 * eyelid, eye);
      if (eyelid > .3) {
        oval(c, x + 1 + lookX, -7 + lookY, 1.1, sleepy ? .65 : 1.4, '#fff9e4');
        if (!sleepy) oval(c, x - 1.2, -3.8, .55, .6, '#a5d8bd9c');
      }
      if (sleepy) curve(c, [x - 2.8, -9.1, x - 1, -8.1, x + .6, -8.3, x + 2.8, -9.3], '#84b9a886', .8);
    }
  }
  // Soft blush is deliberately below the eyes, leaving the original face
  // landmarks and the shared held-ticket/seed hands clear at normal scale.
  for (const x of [-12, 13]) {
    const blush = c.createRadialGradient(x, 1, 0, x, 1, 3.4);
    blush.addColorStop(0, '#f1c1a885'); blush.addColorStop(1, '#f1c1a800');
    oval(c, x, 1, 3.4, 1.9, blush);
  }
  if (returning) {
    curve(c, [-3.6, 2.5, -1.3, sleepy ? 6 : 7.2, 3.5, sleepy ? 6 : 7.2, 5.4, 2.5], '#558b7e', 1.25);
    curve(c, [-1.3, 6.2, .2, 6.9, 2, 6.8, 3.1, 6.1], '#ecffe1a1', .65);
  } else if (sleepy || peeking) {
    oval(c, 1, sleepy ? 4 : 3, sleepy ? 2.3 : 2, sleepy ? 3 : 2.6, '#65968b');
    oval(c, 1.2, sleepy ? 5.1 : 4, .9, .6, '#a4d1bcb0');
  } else if (joyful) {
    c.beginPath(); c.moveTo(-4.9, 1.8); c.quadraticCurveTo(1, 4.2, 6.7, 1.8);
    c.bezierCurveTo(6.6, 8.3, -4.9, 8.3, -4.9, 1.8); c.closePath();
    c.fillStyle = '#35545d'; c.fill();
    oval(c, 1, 5.2, 2.6, 1, '#efc4a3');
  } else {
    curve(c, [-3, 3, -.8, 7.5, 2.8, 7.5, 5, 3], '#5e9081', 1.15);
  }
  // The face remains human; no floating-sprite crown or halo.
}

/**
 * Paint an engine-provided presentedSoul in its existing world/inside layer.
 * The caller retains responsibility for layer order and the cap's front rim.
 * Returns true when drawn (or intentionally invisible); false requests the
 * original painter for an unsupported context/presentation. No input is changed.
 */
export function drawRefinedSoul(c, game, presentedSoul, t = 0) {
  const s = presentedSoul;
  if (!c || !REQUIRED.every(name => typeof c[name] === 'function') || !game || !s
      || !Number.isFinite(s.x) || !Number.isFinite(s.y)) return false;
  const size = s.scale ?? 1, alpha = s.alpha ?? 1;
  if (!Number.isFinite(size) || size < 0 || size > 20 || !Number.isFinite(alpha)
      || ![s.x - 60 * size, s.x + 60 * size, s.y - 60 * size, s.y + 60 * size].every(Number.isFinite)) return false;
  if (!size || alpha <= 0) return true;

  const reduced = game.options?.reducedMotion === true, time = reduced ? 0 : finite(t);
  const spirit = color(game.level?.theme?.spirit, '#a2ead9'), light = color(game.level?.theme?.light, '#efd198');
  const vx = finite(s.vx), vy = finite(s.vy), maxEnergy = Math.max(.001, finite(game.maxEnergy, 100));
  const energy = finite(game.energy, maxEnergy), sleepy = energy < 25;
  const returning = s.pose === 'return', peeking = s.pose === 'peek';
  const bob = reduced || s.layer === 'inside' ? 0 : Math.sin(time * 3) * 2;
  const tilt = reduced ? 0 : clamp(vx / 340, -1, 1) * .14;
  const tailX = -clamp(vx, -400, 400) * .055;
  const tailY = clamp((sleepy ? 23 : 29) - clamp(vy / 340, -1, 1) * 2 + Math.sin(time * 4) * 1.2, 20, 30.7);

  c.save();
  try {
    c.globalAlpha *= clamp(alpha, 0, 1); c.lineCap = 'round'; c.lineJoin = 'round';
    if (typeof c.setLineDash === 'function') c.setLineDash([]);
    const glow = c.createRadialGradient(s.x, s.y, Math.min(1, 58 * size), s.x, s.y, 58 * size);
    glow.addColorStop(0, spirit + '1d'); glow.addColorStop(.48, spirit + '0a'); glow.addColorStop(1, spirit + '00');
    c.fillStyle = glow; c.fillRect(s.x - 60 * size, s.y - 60 * size, 120 * size, 120 * size);

    c.save();
    try {
      // These are the same transforms as base drawSoul. Neither cap-relative
      // coordinates nor held-object anchors are reconstructed from game.soul.
      c.translate(s.x, s.y + bob * size); c.rotate(tilt); c.scale(size, size);
      humanShiguang(c, tailX, tailY, spirit, vx, vy, returning, peeking, reduced);
      soulFace(c, { time, vx, vy, sleepy, returning, peeking, joyful: hasSoulJoy(game, s), light });
      if (finite(game.emoteTime) > 0) {
        star(c, -23, -12, 3, light + 'bb'); star(c, 23, -18, 2.5, light + 'bb');
      }
      // Use the original art and embracing hands, with the exact original
      // offsets/scales. Merely painting never collects, stows or plants them.
      if (['held', 'returning'].includes(game.firstTicket?.phase))
        drawFirstTicket(c, { x: 0, y: 13, scale: .55, held: true }, time, reduced);
      if (['held', 'returning'].includes(game.greenhousePlant?.phase))
        drawGreenhouseSeed(c, { x: 0, y: 13, scale: .65, held: true }, time, reduced);
    } finally { c.restore(); }

    if (sleepy && !returning) {
      // The original small energy arc is centered on the real presentation,
      // independent of the decorative bob, just as before this refinement.
      c.strokeStyle = '#efba9c88'; c.lineWidth = 2; c.beginPath();
      c.arc(s.x, s.y, 30 * size, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(energy / maxEnergy, 0, 1)); c.stroke();
    }
    return true;
  } catch { return false; }
  finally { c.restore(); }
}

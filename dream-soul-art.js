// Shiguang is the same small white-and-mint soul that lives in Ashi's cap.
// Presentation only: the engine owns its pose, layer, position, flight, energy,
// carried objects and clock. In particular, this painter never advances a return.
import { drawFirstTicket } from './dream-first-ticket-art.js';
import { drawGreenhouseSeed } from './dream-greenhouse-art.js';

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
  // The crest, cheeks and face keep the original play-size envelope. A round
  // tail tip replaces the sharp endpoint; it is still part of one soft body.
  c.beginPath(); c.moveTo(-15, 4);
  c.bezierCurveTo(-24, -8, -17, -22, -6, -23);
  c.quadraticCurveTo(1, -28, 2, -35);
  c.bezierCurveTo(10, -31, 7, -25, 12, -22);
  c.bezierCurveTo(20, -21, 23, -14, 19, -9);
  c.bezierCurveTo(25, 7, 14, 17, tailX + 2.4, tailY - 1.4);
  c.bezierCurveTo(tailX + .7, tailY + .6, tailX - 1.3, tailY + .4, tailX - 1.4, tailY - 1.1);
  c.bezierCurveTo(tailX - .2, tailY - 6.8, -3, 15, -15, 4);
  c.closePath();
}

function pearlBody(c, tailX, tailY, spirit) {
  // Broad light and shade survive the small phone projection. The main body
  // stays mint even when a chapter's ambient spirit color is violet or blue.
  const pearl = gradient(c, -15, -29, 19, 27, [
    [0, '#fbfff1f7'], [.32, '#e4f9e9f5'], [.66, '#b9e9d5ed'], [1, '#79c7b9c7'],
  ]);
  silhouette(c, tailX, tailY); c.fillStyle = pearl; c.fill();

  const softLight = c.createRadialGradient(-7, -17, 1, -2, -9, 34);
  softLight.addColorStop(0, '#ffffe6a0');
  softLight.addColorStop(.5, '#f0ffe52b'); softLight.addColorStop(1, '#efffdf00');
  silhouette(c, tailX, tailY); c.fillStyle = softLight; c.fill();
  silhouette(c, tailX, tailY);
  c.fillStyle = gradient(c, -14, -14, 23, 22, [[0, '#397e8100'], [.57, '#397e8100'], [1, '#297c8252']]); c.fill();

  // A fine, darker lower contour keeps the translucent pearl readable against
  // warm lamps. The upper rim catches light without a bloom over the eyes.
  c.strokeStyle = gradient(c, -16, -24, 19, 25, [
    [0, '#f3ffe8e8'], [.35, '#d9f8e1ce'], [.72, '#84bfadce'], [1, '#578f88d9'],
  ]);
  c.lineWidth = 1.15; c.stroke();
  curve(c, [-15.6, -8, -17.5, -14, -12.4, -20, -6.5, -21.5], '#ffffeeb8', 1.75);
  curve(c, [-4.3, -23.5, -.1, -26.2, 1.3, -29.4, 2.2, -32.2], '#ffffeaa3', 1.2);
  curve(c, [18.5, -12, 21.6, -5.2, 17.2, 6.2, 11.6, 10.8], '#e2f8e3b5', 1.1);
  curve(c, [18.1, -3.2, 18.1, 2.5, 15.3, 6.2, 12.6, 8.1], spirit + '69', 1.4);
  curve(c, [-8.5, 11.8, -.5, 16.9, tailX + 1.6, tailY - 7.2, tailX - .1, tailY - 2.2], '#e5ffdf92', .95);
  // A quiet underside reflection gives the tail a thickness rather than a
  // painted stripe. It follows the exact same velocity-derived bend.
  curve(c, [4.4, 13.6, 9, 16, tailX + 2.6, tailY - 4.6, tailX + .6, tailY - 1.9], '#84c9b86b', .8);
  oval(c, -10.6, -16.2, 1.4, .8, '#fffdeac4');
}

function soulFace(c, { time, vx, vy, sleepy, returning, peeking, light }) {
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
  } else {
    curve(c, [-3, 3, -.8, 7.5, 2.8, 7.5, 5, 3], '#5e9081', 1.15);
  }
  star(c, 0, -15.5, 3.3, '#9fbf946b');
  star(c, 0, -16, 3.2, light);
  star(c, -.3, -16.5, 1.35, '#fff7d5db');
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
    glow.addColorStop(0, spirit + '36'); glow.addColorStop(.48, spirit + '15'); glow.addColorStop(1, spirit + '00');
    c.fillStyle = glow; c.fillRect(s.x - 60 * size, s.y - 60 * size, 120 * size, 120 * size);

    c.save();
    try {
      // These are the same transforms as base drawSoul. Neither cap-relative
      // coordinates nor held-object anchors are reconstructed from game.soul.
      c.translate(s.x, s.y + bob * size); c.rotate(tilt); c.scale(size, size);
      pearlBody(c, tailX, tailY, spirit);
      soulFace(c, { time, vx, vy, sleepy, returning, peeking, light });
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

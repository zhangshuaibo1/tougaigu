// A face painted inside the existing head matrix. The original engine owns
// energy, emote duration, the presented soul, cap contacts and every clock.
// No state is advanced here; a smile can use only the event time still left.
const TAU = Math.PI * 2;
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const REQUIRED = ['save', 'restore', 'beginPath', 'moveTo', 'lineTo',
  'bezierCurveTo', 'quadraticCurveTo', 'closePath', 'ellipse', 'fill', 'stroke',
  'clip', 'createLinearGradient'];

export function isTravelerFaceScene(game) {
  return game?.mode === 'story' && Number.isInteger(game.chapterIndex)
    && game.chapterIndex >= 0 && game.chapterIndex < 6;
}

/** Read the original facts, without reading or reconstructing a presentation. */
export function getTravelerFaceView(game, body = game?.body, t = 0, shown = null) {
  if (!isTravelerFaceScene(game) || !body) return null;
  const time = game.options?.reducedMotion ? 0 : finite(t);
  const sleepy = finite(game.energy, 100) < 20;
  const happy = finite(game.emoteTime) > 0;
  const opening = game.cap?.phase === 'opening';
  const attentive = game.form === 'soul' || game.cap?.phase === 'returning';
  const kind = sleepy ? 'tired' : attentive || opening ? 'attentive' : happy ? 'joy' : 'neutral';
  // Keep the original blink, exact eye landmarks and actual shown-soul gaze.
  const blink = Math.sin(time * 1.27 + .4) > .985 ? .12
    : sleepy ? .43 : opening ? 1.06 : happy ? .7 : 1;
  const lookX = attentive
    ? clamp((finite(shown?.x, finite(body.x)) - finite(body.x)) * finite(body.face, 1) / 100, -3, 3)
    : clamp(finite(body.vx) * finite(body.face, 1) / 180, -1.3, 1.3) + .35;
  const lookY = attentive ? -2.7 : sleepy ? 1.8 : -.7;
  return { kind, sleepy, happy, opening, attentive, blink, lookX, lookY };
}

/** A real success may change a free soul's face, never its return/peek pose. */
export function hasSoulJoy(game, shown) {
  return isTravelerFaceScene(game) && finite(game.emoteTime) > 0
    && finite(game.energy, 100) >= 25 && shown?.pose === 'free' && shown.layer === 'world';
}

function oval(c, x, y, rx, ry, paint) {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fillStyle = paint; c.fill();
}
function line(c, points, paint, width) {
  c.beginPath(); c.moveTo(...points[0]);
  for (const point of points.slice(1)) c.lineTo(...point);
  c.strokeStyle = paint; c.lineWidth = width; c.stroke();
}
function skull(c) {
  c.beginPath(); c.moveTo(-22, -13); c.bezierCurveTo(-26, 0, -23, 10, -14, 14);
  c.lineTo(-13, 22); c.quadraticCurveTo(0, 26, 13, 22); c.lineTo(14, 14);
  c.bezierCurveTo(23, 10, 26, 0, 22, -13); c.closePath();
}
function bonePlanes(c) {
  // The silhouette is unchanged. Two broad planes give the cheek and jaw a
  // readable thickness at phone scale, without adding a network of tiny lines.
  const ivory = c.createLinearGradient(-22, -13, 23, 23);
  ivory.addColorStop(0, '#fff1d2'); ivory.addColorStop(.48, '#ead9b8'); ivory.addColorStop(1, '#c1b08f');
  skull(c); c.fillStyle = ivory; c.fill(); c.strokeStyle = '#bbaa8a'; c.lineWidth = 1.2; c.stroke();
  c.beginPath(); c.moveTo(16, -12); c.quadraticCurveTo(23, -4, 19, 8);
  c.quadraticCurveTo(17, 12, 12, 14); c.lineTo(10, 21);
  c.quadraticCurveTo(4, 24, -5, 23); c.quadraticCurveTo(2, 26, 13, 22);
  c.lineTo(14, 14); c.bezierCurveTo(23, 10, 26, 0, 22, -13); c.closePath();
  const shade = c.createLinearGradient(10, -8, 23, 18);
  shade.addColorStop(0, '#b89d7540'); shade.addColorStop(1, '#9d805759');
  c.fillStyle = shade; c.fill();
  c.beginPath(); c.moveTo(-21, -11); c.quadraticCurveTo(-23, 1, -18, 7);
  c.quadraticCurveTo(-16, 10, -12, 10); c.quadraticCurveTo(-16, 6, -16, 1);
  c.quadraticCurveTo(-17, -7, -21, -11); c.closePath(); c.fillStyle = '#fff9e175'; c.fill();
}
function eyeSocket(c, x, view) {
  c.beginPath();
  if (view.kind === 'joy' && view.blink > .2) {
    // A filled crescent stays legible when the whole eye is only nine pixels.
    c.moveTo(x - 6.6, 3.2); c.bezierCurveTo(x - 6.9, -6.7, x + 6.9, -6.7, x + 6.6, 3.2);
    c.bezierCurveTo(x + 3.4, -1.7, x - 3.4, -1.7, x - 6.6, 3.2); c.closePath();
  } else if (view.kind === 'tired' && view.blink > .2) {
    // The heavy upper edge slopes down toward the middle; the mouth below is
    // an O, so fatigue cannot read as the upward closed-eye success expression.
    c.moveTo(x - 6.4, -2.5); c.quadraticCurveTo(x, .7, x + 6.4, -2.5);
    c.bezierCurveTo(x + 7.1, 6.4, x - 7.1, 6.4, x - 6.4, -2.5); c.closePath();
  } else c.ellipse(x, 1, 6.6, 8.2 * view.blink, 0, 0, TAU);
}
function teeth(c, joyful) {
  if (joyful) {
    c.beginPath(); c.moveTo(-8.8, 17.5); c.quadraticCurveTo(0, 20.8, 8.8, 17.5);
    c.bezierCurveTo(6.7, 25, -6.7, 25, -8.8, 17.5); c.closePath(); c.fillStyle = '#75604e'; c.fill();
    c.beginPath(); c.moveTo(-6.8, 19.1); c.quadraticCurveTo(0, 21.1, 6.8, 19.1);
    c.lineTo(5.8, 21); c.quadraticCurveTo(0, 23.1, -5.8, 21); c.closePath(); c.fillStyle = '#fff2d4'; c.fill();
    for (const x of [-3, 3]) line(c, [[x, 20.4], [x, 22]], '#b99d7b', .8);
  } else for (const x of [-7, 0, 7]) line(c, [[x, 20], [x, 24]], '#9b8d7a', 1.4);
}

/** Paint in the caller's existing head space; never transform the shared rig. */
export function drawTravelerSkullFront(c, game, body, t, shown) {
  const view = getTravelerFaceView(game, body, t, shown);
  if (!view || !c || !REQUIRED.every(name => typeof c[name] === 'function')) return false;
  const light = /^#[\da-f]{6}$/i.test(game.level?.theme?.light || '') ? game.level.theme.light : '#efd198';
  c.save();
  try {
    c.lineCap = 'round'; c.lineJoin = 'round';
    bonePlanes(c);
    for (const x of [-9, 9]) {
      c.save();
      try {
        eyeSocket(c, x, view); c.fillStyle = '#2d303d'; c.fill();
        // Gaze stays at the original shown-soul coordinates. Clipping keeps a
        // tired eye's glint within its cavity instead of lighting the eyelid.
        c.clip();
        if (view.blink > .2 && view.kind !== 'joy') {
          oval(c, x + view.lookX, view.lookY, 2.2, 2.6, light);
          oval(c, x + view.lookX + 1, view.lookY - 1.5, .9, 1, '#fff1ce');
        }
      } finally { c.restore(); }
    }
    if (view.attentive || view.happy) {
      line(c, [[-15, -11], [-10, -13], [-5, -11]], '#bba684', 1.2);
      line(c, [[5, -11], [10, -13], [15, -11]], '#bba684', 1.2);
    }
    oval(c, -18, 8, 3.8, 1.7, '#d39b8b44'); oval(c, 18, 8, 3.8, 1.7, '#d39b8b44');
    c.beginPath(); c.moveTo(0, 9); c.lineTo(-3, 14); c.lineTo(3, 14);
    c.closePath(); c.fillStyle = '#736566'; c.fill();
    teeth(c, view.kind === 'joy');
    if (view.sleepy) oval(c, 0, 19, 3.2, 2.9, '#796554');
    return true;
  } finally { c.restore(); }
}

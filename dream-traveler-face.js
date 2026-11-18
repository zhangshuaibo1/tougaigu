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
// Human skin and brown side-swept bangs, painted in the original head rig.
// The lifted "idea" is a metaphor: never render a literal bone face or helmet.
function faceOutline(c) {
  c.beginPath(); c.moveTo(-22, -13); c.bezierCurveTo(-25, -1, -22, 13, -14, 17);
  c.lineTo(-11, 23); c.quadraticCurveTo(0, 27, 11, 23); c.lineTo(14, 17);
  c.bezierCurveTo(22, 13, 25, -1, 22, -13); c.closePath();
}
function skinPlanes(c) {
  // Ears stay below the cheek silhouette and never become skull plates.
  oval(c, -22, 4, 3.5, 6, '#c78f77');
  oval(c, 22, 4, 3.5, 6, '#b67d69');
  oval(c, -22, 4, 1.4, 3.1, '#e9b59b');
  oval(c, 22, 4, 1.4, 3.1, '#db9f86');
  const skin = c.createLinearGradient(-22, -15, 22, 24);
  skin.addColorStop(0, '#f8dec4'); skin.addColorStop(.42, '#efbfa3');
  skin.addColorStop(1, '#bb8474');
  faceOutline(c); c.fillStyle = skin; c.fill(); c.strokeStyle = '#986f65';
  c.lineWidth = 1.05; c.stroke();
  const cheek = c.createLinearGradient(4, -5, 23, 23);
  cheek.addColorStop(0, '#f8d5b300'); cheek.addColorStop(1, '#97696757');
  c.beginPath(); c.moveTo(12, -9); c.quadraticCurveTo(25, 4, 13, 21);
  c.quadraticCurveTo(4, 25, 1, 24); c.quadraticCurveTo(15, 7, 12, -9);
  c.closePath(); c.fillStyle = cheek; c.fill();
  // Hair has three overlapping swept clumps and a visible lit strand.
  const hair = c.createLinearGradient(-20, -21, 20, -3);
  hair.addColorStop(0, '#af734f'); hair.addColorStop(.44, '#75482f');
  hair.addColorStop(1, '#3b2926');
  c.beginPath(); c.moveTo(-22,-12); c.bezierCurveTo(-22,-21,-8,-24,3,-21);
  c.bezierCurveTo(15,-24,23,-17,22,-9);
  c.quadraticCurveTo(11,-13,5,-9); c.quadraticCurveTo(-4,-3,-12,-9);
  c.quadraticCurveTo(-18,-7,-22,-12); c.closePath();
  c.fillStyle = hair; c.fill();
  line(c, [[-19,-14],[-9,-17],[0,-14]], '#c08b62', 1.4);
  line(c, [[1,-17],[10,-16],[17,-11]], '#987056', 1.05);
  c.beginPath(); c.moveTo(-20,-10); c.quadraticCurveTo(-23,1,-18,6);
  c.lineTo(-15,0); c.quadraticCurveTo(-16,-7,-20,-10); c.closePath();
  c.fillStyle='#63402e'; c.fill();
  c.beginPath(); c.moveTo(21,-11); c.quadraticCurveTo(23,-2,19,5);
  c.lineTo(16,-1); c.quadraticCurveTo(16,-7,21,-11); c.closePath();
  c.fillStyle='#513426'; c.fill();
}
function eyeSocket(c, x, view) {
  c.beginPath();
  if (view.kind === 'joy' && view.blink > .2) {
    c.moveTo(x - 4.5, 2); c.quadraticCurveTo(x, -2.8, x + 4.5, 2);
    c.quadraticCurveTo(x, -.5, x - 4.5, 2); c.closePath();
  } else if (view.kind === 'tired' && view.blink > .2) {
    c.moveTo(x - 4.3, -.6); c.quadraticCurveTo(x, 1.7, x + 4.3, -.6);
    c.quadraticCurveTo(x + 4.1, 4.5, x, 4.9);
    c.quadraticCurveTo(x - 4.1, 4.5, x - 4.3, -.6); c.closePath();
  } else c.ellipse(x, 1, 4.2, 5.3 * view.blink, 0, 0, TAU);
}
function lips(c, joyful) {
  if (joyful) {
    c.beginPath(); c.moveTo(-7.2, 16.8); c.quadraticCurveTo(0, 20.3, 7.2, 16.8);
    c.bezierCurveTo(5.1, 22.1, -5.1, 22.1, -7.2, 16.8); c.closePath();
    c.fillStyle='#75604e'; c.fill();
    c.beginPath(); c.moveTo(-4.8, 17.8); c.quadraticCurveTo(0, 19.3, 4.8, 17.8);
    c.quadraticCurveTo(0, 20.8, -4.8, 17.8); c.closePath();
    c.fillStyle='#fff0de'; c.fill();
  } else {
    c.beginPath(); c.moveTo(-5.7, 18.5); c.quadraticCurveTo(0, joyful ? 22 : 19, 5.7, 18.5);
    c.strokeStyle='#875c57'; c.lineWidth=1.65; c.stroke();
    line(c,[[-4,20],[0,21],[4,20]],'#d68d80',.8);
  }
}

/** Paint in the caller's existing head space; never transform the shared rig. */
export function drawTravelerSkullFront(c, game, body, t, shown) {
  const view = getTravelerFaceView(game, body, t, shown);
  if (!view || !c || !REQUIRED.every(name => typeof c[name] === 'function')) return false;
  const light = /^#[\da-f]{6}$/i.test(game.level?.theme?.light || '') ? game.level.theme.light : '#efd198';
  c.save();
  try {
    c.lineCap = 'round'; c.lineJoin = 'round';
    skinPlanes(c);
    for (const x of [-9, 9]) {
      c.save();
      try {
        eyeSocket(c, x, view); c.fillStyle = '#2d303d'; c.fill();
        // Gaze stays at the original shown-soul coordinates. Clipping keeps a
        // tired eye's glint within its cavity instead of lighting the eyelid.
        c.clip();
        if (view.blink > .2 && view.kind !== 'joy') {
          // An ivory-white eye plane, separate warm-brown iris and small dark
          // pupil stay inside the existing clipped socket as the gaze moves.
          // Their coordinates are presentation-only, never world physics.
          oval(c, x, 1, 3.6, Math.max(.5, 4.15 * view.blink), '#f6e9dc');
          const gazeX = x + view.lookX * .66;
          const gazeY = 1 + view.lookY * .3;
          oval(c, gazeX, gazeY, 2.35, 2.7, '#784e38');
          oval(c, gazeX + .3, gazeY + .1, 1.3, 1.9, '#302c2d');
          oval(c, gazeX - .7, gazeY - 1.2, .75, .9, '#fff1ce');
          // A very narrow environment reflection uses the original chapter
          // light while the iris keeps the same human brown in every scene.
          oval(c, gazeX + 1, gazeY - 1.55, .4, .55, light);
        }
      } finally { c.restore(); }
    }
    // Brows share the same skin plane; they remain attached in all six chapters.
    for (const x of [-9,9]) line(c, [[x-4.1,-9.1],[x,-10.2-(view.attentive?1.2:0)],[x+4.1,-9.1]], '#674439', 1.4);
    oval(c, -18, 8, 3.8, 1.7, '#d39b8b44'); oval(c, 18, 8, 3.8, 1.7, '#d39b8b44');
    // A small shaded bridge and tip instead of a triangular nose cavity.
    line(c, [[1,6],[-.8,12],[1.5,13.4]], '#bd8172', 1.18);
    oval(c, 1.2, 13.7, 2.1, 1.1, '#e6a38b');
    lips(c, view.kind === 'joy');
    if (view.sleepy) oval(c, 0, 19, 3.2, 2.9, '#796554');
    return true;
  } finally { c.restore(); }
}

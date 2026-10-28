// A solved lamp leaves a little piece of its story in the world. These are
// deliberately different objects, not badges. Timing and eligibility belong
// to DreamGame; this module only paints the supplied, already-solved view.
const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smooth = value => value * value * (3 - 2 * value);
const phase = (p, from, to) => smooth(clamp((p - from) / (to - from), 0, 1));
const P = Object.freeze({ ink: '#64747a', paper: '#ebdcc1', edge: '#bba48c', pale: '#f4e6c9', gold: '#d4b77e', blue: '#91bdce', wood: '#967b7f', dark: '#344952' });

function path(c, draw, fill, stroke = null, width = 1) {
  c.beginPath(); draw(c);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
}
function line(c, points, color, width = 1) {
  path(c, p => points.forEach((point, i) => i ? p.lineTo(...point) : p.moveTo(...point)), null, color, width);
}
function oval(c, x, y, rx, ry, fill, stroke = null, width = 1, angle = 0) {
  path(c, p => p.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), angle, 0, TAU), fill, stroke, width);
}
function box(c, x, y, w, h, r, fill, stroke = null, width = 1) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  path(c, p => {
    p.moveTo(x + radius, y); p.arcTo(x + w, y, x + w, y + h, radius);
    p.arcTo(x + w, y + h, x, y + h, radius); p.arcTo(x, y + h, x, y, radius);
    p.arcTo(x, y, x + w, y, radius); p.closePath();
  }, fill, stroke, width);
}
function wash(c, x, y, rx, ry, color, alpha = .16) {
  c.save(); c.globalAlpha *= alpha; c.translate(x, y); c.scale(rx, ry);
  const glow = c.createRadialGradient(0, 0, 0, 0, 0, 1);
  glow.addColorStop(0, color); glow.addColorStop(.45, color + 'b0'); glow.addColorStop(1, color + '00');
  oval(c, 0, 0, 1, 1, glow); c.restore();
}
function leaf(c, x, y, length, angle, color, growth = 1) {
  if (growth <= 0) return;
  c.save(); c.translate(x, y); c.rotate(angle); c.scale(growth, growth);
  path(c, p => { p.moveTo(0, 0); p.quadraticCurveTo(length * .72, -length * .38, length, 0); p.quadraticCurveTo(length * .43, length * .3, 0, 0); }, color);
  line(c, [[1, 0], [length * .83, 0]], '#d0d8ab', .55); c.restore();
}
function crescent(c, x, y, r, color) {
  path(c, p => {
    p.moveTo(x + r * .5, y - r * .86);
    p.bezierCurveTo(x - r * .3, y - r * .92, x - r * .63, y + r * .4, x + r * .5, y + r * .86);
    p.bezierCurveTo(x - r * 1.5, y + r * .7, x - r * 1.5, y - r * .7, x + r * .5, y - r * .86);
  }, color);
}
function letter(c, x, y, w = 14, h = 10, accent = P.gold, open = 0) {
  c.save(); c.translate(x, y);
  box(c, -w / 2, -h / 2, w, h, 1, P.paper, P.edge, .65);
  line(c, [[-w / 2 + 1, h / 2 - 1], [0, -1], [w / 2 - 1, h / 2 - 1]], P.edge, .6);
  path(c, p => { p.moveTo(-w / 2, -h / 2); p.lineTo(0, open ? -h / 2 - h * .7 * open : 1); p.lineTo(w / 2, -h / 2); }, P.pale, P.edge, .65);
  if (!open) oval(c, 0, 1, 1.4, 1.4, accent);
  c.restore();
}
function wave(c, y, width, color, lift = 0) {
  path(c, p => {
    p.moveTo(-width, y);
    p.bezierCurveTo(-width * .65, y - 4 - lift, -width * .25, y + 4, 0, y);
    p.bezierCurveTo(width * .3, y - 4, width * .7, y + 4 + lift, width, y);
  }, null, color, .9);
}
function book(c, y, spread = 1, accent = P.blue) {
  c.save(); c.translate(0, y);
  const w = 31 * spread;
  path(c, p => { p.moveTo(0, -1); p.quadraticCurveTo(-w * .6, -12, -w, -6); p.lineTo(-w - 2, 12); p.quadraticCurveTo(-w * .4, 8, 0, 16); p.quadraticCurveTo(w * .55, 6, w + 2, 12); p.lineTo(w, -6); p.quadraticCurveTo(w * .52, -12, 0, -1); }, '#9c8796', P.ink, 1);
  path(c, p => { p.moveTo(0, -3); p.quadraticCurveTo(-w * .56, -14, -w, -8); p.lineTo(-w, 9); p.quadraticCurveTo(-w * .47, 5, 0, 13); p.quadraticCurveTo(w * .5, 5, w, 9); p.lineTo(w, -8); p.quadraticCurveTo(w * .52, -14, 0, -3); }, P.paper, P.edge, .85);
  for (const side of [-1, 1]) {
    path(c, p => { p.moveTo(side * 4, 1); p.quadraticCurveTo(side * w * .5, -6, side * (w - 5), -3); }, null, '#bcac9b', .6);
    path(c, p => { p.moveTo(side * 4, 5); p.quadraticCurveTo(side * w * .5, -2, side * (w - 5), 1); }, null, '#bcac9b', .6);
    path(c, p => { p.moveTo(side * 4, 9); p.quadraticCurveTo(side * w * .5, 2, side * (w - 5), 5); }, null, '#bcac9b', .6);
  }
  line(c, [[0, -3], [0, 12]], accent, 1.1); c.restore();
}

function stationEnvelope(c, p, accent) {
  const opening = phase(p, .04, .4), rise = phase(p, .26, .85), window = phase(p, .54, .96);
  c.save(); c.translate(0, 5 - 5 * rise); c.rotate(-.055 * (1 - rise));
  // The open flap remains attached behind the paper as it becomes a window.
  path(c, q => { q.moveTo(-32, 3); q.lineTo(0, 5 - 31 * opening); q.lineTo(32, 3); }, '#d6c3aa', P.edge, 1);
  c.save(); c.translate(0, 25 - 45 * rise);
  box(c, -23, -16, 46, 44, 3, P.paper, P.edge, .9);
  c.save(); c.globalAlpha *= window;
  box(c, -18, -11, 36, 28, 2, '#526f78', '#c3b7a0', .8);
  wash(c, 0, 1, 17, 13, accent, .22);
  path(c, q => { q.moveTo(-17, 13); q.quadraticCurveTo(-9, 7, -2, 10); q.quadraticCurveTo(7, 1, 17, 8); q.lineTo(17, 16); q.lineTo(-17, 16); }, '#8da8a2');
  line(c, [[0, -11], [0, 16]], '#d7c8aa', 1.4); line(c, [[-17, 1], [17, 1]], '#d7c8aa', 1.2);
  box(c, -12, 21, 24, 3, 1, '#746c6b'); line(c, [[-10, 21], [10, 21]], accent, .7);
  c.restore();
  if (window < 1) { c.save(); c.globalAlpha *= 1 - window; for (const y of [-7, 0, 7]) line(c, [[-14, y], [12, y]], '#b4a28f', .8); c.restore(); }
  c.restore();
  path(c, q => { q.moveTo(-32, 3); q.lineTo(-31, 35); q.quadraticCurveTo(0, 40, 31, 35); q.lineTo(32, 3); q.lineTo(0, 23); q.closePath(); }, '#dcc7a9', P.edge, 1);
  line(c, [[-30, 34], [-4, 16]], '#c4aa94', .8); line(c, [[30, 34], [4, 16]], '#c4aa94', .8);
  oval(c, 0, 23, 4.5, 4.5, '#a47c81', '#ceb29c', .7); oval(c, 0, 23, 1.8, 1.8, accent);
  c.restore();
}

function traveller(c, x, y, i, arrive, accent) {
  c.save(); c.translate(x - (1 - arrive) * 10, y - Math.sin(arrive * Math.PI) * 9); c.globalAlpha *= arrive;
  const coats = ['#cba9b9', '#9ebdb6', '#d3bd8c', '#afa7c7'];
  oval(c, 0, -8, 2.25, 2.6, P.paper);
  path(c, q => { q.moveTo(-2, -5); q.quadraticCurveTo(0, -6, 2, -5); q.lineTo(3.5, 3); q.quadraticCurveTo(0, 5, -3.5, 3); }, coats[i % 4]);
  line(c, [[-1, 4], [-2, 7]], P.paper, 1); line(c, [[1, 4], [3, 6]], P.paper, 1);
  line(c, [[1, -3], [5, -4]], P.paper, .9);
  // The eight tools are intentionally different even at this tiny scale.
  c.save(); c.translate(5, -5);
  if (i === 0) { path(c, q => { q.moveTo(0, 3); q.lineTo(-3, -2); q.quadraticCurveTo(0, -5, 4, -2); q.closePath(); }, accent); line(c, [[0, 3], [0, -3]], P.edge, .5); }
  if (i === 1) { oval(c, 0, -2, 2, 2.4, '#c8ab80'); oval(c, 0, 1.5, 2.6, 2.8, '#c8ab80'); }
  if (i === 2) { line(c, [[-2, 1], [3, -6]], '#e7e3cb', 1.3); line(c, [[-2, -1], [1, 2]], '#bb9a77', 1); }
  if (i === 3) { leaf(c, -2, 1, 7, -.8, '#a6c596'); }
  if (i === 4) { line(c, [[-4, -2], [4, -2]], '#c7b285', 1.6); oval(c, 0, -2, .6, .6, P.dark); }
  if (i === 5) { for (const angle of [-.7, 0, .7]) leaf(c, 0, 1, 5, -Math.PI / 2 + angle, '#d5b2c4'); }
  if (i === 6) { oval(c, -1, -1, 3.5, 1.8, P.blue); path(c, q => { q.moveTo(2, -1); q.lineTo(5, -3); q.lineTo(5, 1); }, P.blue); }
  if (i === 7) { box(c, -2, -4, 4, 7, .6, P.paper, P.edge, .5); line(c, [[-1, -1], [1, -1]], P.ink, .5); }
  c.restore(); c.restore();
}
function stationCrossing(c, p, accent) {
  const sea = phase(p, .02, .42);
  // A narrow, weathered old picture is specific to this story only.
  path(c, q => { q.moveTo(-42, -32); q.lineTo(40, -34); q.lineTo(42, 31); q.lineTo(-41, 34); q.closePath(); }, '#465e6730', '#a99580', 1);
  for (const side of [-1, 1]) { line(c, [[side * 35, -31], [side * 40, -31], [side * 40, -25]], '#dcc39a', 1.3); line(c, [[side * 35, 31], [side * 39, 31], [side * 39, 25]], '#dcc39a', 1.3); }
  c.save(); c.globalAlpha *= sea;
  for (let i = 0; i < 3; i++) wave(c, 19 + i * 5, 35 - i * 2, i === 1 ? '#b7d3d3' : '#779fae');
  path(c, q => { q.moveTo(-34, -17); q.quadraticCurveTo(-25, -22, -16, -17); q.moveTo(16, -21); q.quadraticCurveTo(26, -25, 33, -20); }, null, '#a2b7b5', .7);
  c.restore();
  for (let i = 0; i < 8; i++) traveller(c, -34 + i * 9.3, 7 - (i % 2) * 5, i, phase(p, .13 + i * .055, .53 + i * .06), accent);
}

function greenhouseWillow(c, p, accent) {
  const growth = phase(p, .08, .78);
  path(c, q => { q.moveTo(-41, -29); q.bezierCurveTo(-26, -39, 9, -39, 37, -27); }, null, '#a7b69a', 2);
  path(c, q => { q.moveTo(-36, -30); q.bezierCurveTo(-19, -34, 11, -33, 31, -26); }, null, '#d9cfab', .55);
  for (let i = 0; i < 6; i++) {
    const x = -29 + i * 12, end = 10 + ((i * 11) % 23), strand = phase(p, .08 + i * .03, .65 + i * .035);
    path(c, q => { q.moveTo(x, -31); q.bezierCurveTo(x + 9 * growth, -14, x - 7 * growth, end - 15, x - 4 * growth, -31 + (end + 31) * strand); }, null, '#91aa90', .85);
    for (let j = 0; j < 4; j++) {
      const y = -23 + j * (end + 23) / 4, bend = Math.sin(j * 1.4 + i) * 2;
      leaf(c, x + bend, y, 10 + j, .8 + (j % 2 ? .6 : -.3), j % 2 ? accent : '#9bc393', phase(p, .19 + j * .1 + i * .02, .48 + j * .12 + i * .018));
    }
  }
  // Spring wind briefly closes these scissors, then opens and rests.
  const snip = Math.sin(phase(p, .05, .63) * Math.PI), a = .44 - snip * .39;
  c.save(); c.translate(-25 + 8 * growth, 28); c.rotate(-.38);
  for (const side of [-1, 1]) {
    c.save(); c.rotate(side * a);
    oval(c, -10, side * 2, 4.1, 3.3, null, '#cbb68e', 1.3);
    line(c, [[-6, side * 2], [2, 0], [15, side * 3]], '#c9d5cf', 1.5); c.restore();
  }
  oval(c, 1, 0, 1.8, 1.8, '#e8d19c'); c.restore();
  c.save(); c.globalAlpha *= 1 - phase(p, .55, .95);
  path(c, q => { q.moveTo(-40, 12); q.bezierCurveTo(-22, 0, -14, 24, 8, 16); }, null, '#c3ded1', .8); c.restore();
}
function sesameFlower(c, x, y, side, growth, accent) {
  if (!growth) return;
  c.save(); c.translate(x, y); c.scale(growth, growth); c.rotate(side * .25);
  path(c, q => { q.moveTo(0, 0); q.quadraticCurveTo(side * 7, -9, side * 13, -3); q.quadraticCurveTo(side * 10, 0, side * 13, 3); q.quadraticCurveTo(side * 6, 8, 0, 0); }, P.pale, '#c6adc4', .65);
  oval(c, side * 10.4, .5, 2.7, 3.4, accent); line(c, [[side * 3, 0], [side * 8, .5]], '#c4b192', .55);
  oval(c, side * 10, 0, .8, .8, '#a88d88'); c.restore();
}
function greenhouseSesame(c, p, accent) {
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 22, height = i === 1 ? 72 : 57, stem = phase(p, .04 + i * .04, .62 + i * .06);
    path(c, q => { q.moveTo(x, 36); q.quadraticCurveTo(x + (i - 1) * 3, 1, x + (i - 1) * 2, 36 - height * stem); }, null, '#9dbb99', 1.5);
    for (let j = 0; j < 3; j++) {
      const y = 23 - j * 20 + (i === 1 ? -6 : 2), sign = (i + j) % 2 ? -1 : 1;
      leaf(c, x, y + 6, 12, sign > 0 ? -.65 : -2.5, '#9dbb99', phase(p, .1 + j * .16, .38 + j * .18));
      sesameFlower(c, x, y, sign, phase(p, .19 + j * .21 + i * .025, .48 + j * .21 + i * .025), accent);
    }
    for (let j = 0; j < 3; j++) oval(c, x - 4 + j * 4, 40 - j % 2, .8, 1.3, '#c5b497', null, 1, .3);
  }
}

function smallWindow(c, x, y, w, h, type, opening, accent) {
  c.save(); c.translate(x, y);
  box(c, -w / 2, -h / 2, w, h, type === 'round' ? w / 2 : 2, '#3b5662', P.edge, 1.2);
  c.save(); c.globalAlpha *= opening;
  box(c, -w / 2 + 3, -h / 2 + 3, w - 6, h - 6, type === 'round' ? w / 3 : 1, '#8a9c99');
  wash(c, 0, 0, w * .33, h * .36, accent, .38); c.restore();
  if (type === 'roof') path(c, q => { q.moveTo(-w / 2 - 3, -h / 2 + 1); q.lineTo(0, -h / 2 - 8); q.lineTo(w / 2 + 3, -h / 2 + 1); }, null, '#c4a888', 1.7);
  line(c, [[0, -h / 2 + 2], [0, h / 2 - 2]], '#c3b39a', 1);
  line(c, [[-w / 2 + 2, 0], [w / 2 - 2, 0]], '#c3b39a', .9);
  for (const side of [-1, 1]) {
    path(c, q => { q.moveTo(side * w / 2, -h / 2); q.lineTo(side * (w / 2 + 5 * opening), -h / 2 + 3); q.lineTo(side * (w / 2 + 4 * opening), h / 2 - 2); q.lineTo(side * w / 2, h / 2); }, '#9b8b91', '#c2a995', .65);
  }
  c.restore();
}
function theatreHomeward(c, p, accent) {
  const moon = phase(p, .04, .4), light = phase(p, .26, .91);
  c.save(); c.globalAlpha *= moon; crescent(c, -27, -29, 9, P.pale); c.restore();
  c.save(); c.globalAlpha *= light * .2;
  path(c, q => { q.moveTo(-29, -21); q.lineTo(-38, 35); q.quadraticCurveTo(-22, 42, -6, 33); q.lineTo(-23, -21); }, accent); c.restore();
  smallWindow(c, 22, -8, 28, 34, 'roof', phase(p, .22, .84), accent);
  // An empty chair, with a folded scarf rather than an implied resident.
  c.save(); c.translate(-20, 17 + 4 * (1 - light));
  path(c, q => { q.moveTo(-9, -13); q.quadraticCurveTo(0, -20, 9, -13); q.lineTo(9, 5); q.lineTo(-9, 5); q.closePath(); }, '#8c7384', '#c9b099', 1.1);
  for (const x of [-5, 0, 5]) line(c, [[x, -11], [x, 3]], '#c1a396', .7);
  path(c, q => { q.moveTo(-11, 5); q.quadraticCurveTo(0, 1, 11, 5); q.lineTo(10, 9); q.lineTo(-10, 9); }, '#b49e9c', '#d0b9a2', .85);
  line(c, [[-8, 9], [-10, 20]], '#ab9291', 1.7); line(c, [[8, 9], [10, 20]], '#ab9291', 1.7);
  path(c, q => { q.moveTo(2, -14); q.lineTo(7, -13); q.lineTo(7, -1); q.lineTo(2, -3); }, '#adb8b2');
  c.restore();
}
function theatreMoon(c, p, accent) {
  const part = phase(p, .12, .75), rise = phase(p, .2, .88), light = phase(p, .55, 1);
  path(c, q => { q.moveTo(-39, -35); q.quadraticCurveTo(0, -42, 39, -35); }, null, '#c0a587', 1.6);
  line(c, [[0, -37], [0, 25 - 39 * rise]], '#c3bdac', .65);
  c.save(); c.globalAlpha *= .14 * light;
  path(c, q => { q.moveTo(0, -31); q.lineTo(-26, 36); q.quadraticCurveTo(0, 42, 26, 36); q.closePath(); }, accent); c.restore();
  c.save(); c.translate(0, 28 - 39 * rise); c.rotate((1 - rise) * -.4);
  crescent(c, 0, 0, 16, accent);
  path(c, q => { q.moveTo(-8, -9); q.quadraticCurveTo(-13, 0, -7, 9); }, null, '#bfa995', .65);
  oval(c, -6, -4, 1, 1, '#b5a797'); c.restore();
  for (const side of [-1, 1]) {
    const inner = 12 + 19 * part;
    path(c, q => { q.moveTo(side * 41, -34); q.lineTo(side * inner, -35); q.bezierCurveTo(side * (inner - 4), -8, side * 36, 14, side * 32, 32); q.quadraticCurveTo(side * 37, 36, side * 43, 31); q.closePath(); }, side < 0 ? '#856d88' : '#967b94', '#c4a2b4', .9);
    path(c, q => { q.moveTo(side * (inner + 3), -29); q.quadraticCurveTo(side * 32, -3, side * 39, 28); }, null, '#b093aa', 1.1);
    line(c, [[side * 34, 13], [side * 42, 11]], '#d8bc94', 1.6);
    line(c, [[side * 40, 12], [side * 41, 22]], '#d8bc94', .8); oval(c, side * 41, 23, 1.6, 2.5, '#d8bc94');
  }
}

function libraryHorizon(c, p, accent) {
  const rise = phase(p, .08, .67), open = phase(p, .35, .97);
  book(c, 26, .65 + .35 * rise, accent);
  c.save(); c.translate(0, 27 - 28 * rise); c.scale(1, .25 + .75 * rise);
  // Tall lifted pages create a window; its curved lower edge cannot be a step.
  path(c, q => { q.moveTo(-25, 23); q.lineTo(-25, -29); q.quadraticCurveTo(-12, -38, 0, -32); q.quadraticCurveTo(13, -38, 25, -29); q.lineTo(25, 23); q.quadraticCurveTo(0, 13, -25, 23); }, '#d8d8c6', '#b5b2a7', 1);
  c.save(); c.globalAlpha *= open;
  box(c, -20, -28, 40, 43, 4, '#557c90');
  path(c, q => { q.moveTo(-20, 1); q.bezierCurveTo(-11, -8, -2, 3, 8, -3); q.lineTo(20, -10); q.lineTo(20, 15); q.lineTo(-20, 15); }, '#86aaa9');
  path(c, q => { q.moveTo(-20, 12); q.quadraticCurveTo(-7, 1, 8, 10); q.lineTo(20, 7); q.lineTo(20, 15); q.lineTo(-20, 15); }, '#b2bdae');
  oval(c, 10, -19, 4, 4, '#e6dbb5');
  path(c, q => { q.moveTo(-15, -17); q.quadraticCurveTo(-9, -22, -4, -17); q.lineTo(1, -17); }, null, '#c6dfe0', .8);
  c.restore();
  for (const side of [-1, 1]) {
    const inner = 2 + open * 19;
    path(c, q => { q.moveTo(side * 23, -28); q.lineTo(side * inner, -31); q.lineTo(side * inner, 17); q.lineTo(side * 23, 20); q.closePath(); }, P.paper, '#b9ae9c', .75);
    line(c, [[side * (inner + 2), -23], [side * (inner + 2), 12]], '#c9bcaa', .6);
  }
  c.restore();
}
function libraryBookmark(c, p, accent) {
  const open = phase(p, .06, .5), emerge = phase(p, .35, .94), mark = phase(p, .17, .66);
  c.save(); c.translate(0, 16 - 32 * emerge); c.scale(.48 + .52 * emerge, .48 + .52 * emerge); c.globalAlpha *= emerge;
  path(c, q => { q.moveTo(-22, -6); q.bezierCurveTo(-10, -20, 15, -19, 22, -4); q.quadraticCurveTo(27, 0, 32, -8); q.quadraticCurveTo(32, 3, 24, 6); q.bezierCurveTo(10, 16, -13, 15, -22, 4); q.quadraticCurveTo(-27, -1, -22, -6); }, '#99c6d4', '#668c9f', 1);
  path(c, q => { q.moveTo(-20, 3); q.quadraticCurveTo(0, 14, 20, 5); q.quadraticCurveTo(2, 18, -15, 9); }, '#d3e3d9');
  path(c, q => { q.moveTo(-2, 5); q.quadraticCurveTo(-2, 18, -12, 13); q.lineTo(-10, 4); }, '#7baabf', '#6792a5', .7);
  oval(c, -16, -2, 1.6, 1.6, '#405d6f'); oval(c, -16.4, -2.5, .5, .5, '#f3ebd0');
  path(c, q => { q.moveTo(-22, 3); q.quadraticCurveTo(-18, 6, -13, 4); }, null, '#668b9b', .7);
  oval(c, 4, -23, 2.4, 2.4, null, '#c4dce0', .8); oval(c, 9, -29, 1.3, 1.3, '#c4dce0');
  c.restore();
  book(c, 22, .57 + .43 * open, accent);
  // The ribbon descends into the fold, while the two leaves loosen once.
  c.save(); c.translate(3, -29 + 48 * mark);
  path(c, q => { q.moveTo(-3, -7); q.lineTo(3, -7); q.lineTo(3, 15); q.lineTo(0, 12); q.lineTo(-3, 15); q.closePath(); }, '#ad8eaf', '#d1b8bf', .65);
  line(c, [[0, -4], [0, 7]], '#e4cbb6', .65); c.restore();
  for (const side of [-1, 1]) {
    path(c, q => { q.moveTo(side * 2, 22); q.quadraticCurveTo(side * 17, 1 - 10 * open, side * 31, 14); q.quadraticCurveTo(side * 18, 8, side * 3, 28); }, P.paper, '#b2a89a', .65);
  }
}

function coastTide(c, p, accent) {
  const pour = phase(p, .14, .77), tide = phase(p, .36, 1);
  c.save(); c.translate(-2, -11); c.rotate(-.12 * pour);
  path(c, q => { q.moveTo(-20, 3); q.bezierCurveTo(-26, -34, 26, -34, 20, 3); }, null, '#c3aa80', 2.5);
  path(c, q => { q.moveTo(-17, 1); q.bezierCurveTo(-21, -25, 21, -25, 17, 1); }, null, '#e3c99c', .65);
  path(c, q => { q.moveTo(-24, -3); q.lineTo(-18, 20); q.quadraticCurveTo(0, 28, 18, 20); q.lineTo(24, -3); }, '#ac9476', '#ddc59a', 1.1);
  for (let i = -3; i <= 3; i++) line(c, [[i * 6, -1], [i * 4.7 + 2, 21]], '#7f8070', .8);
  for (const y of [4, 10, 16]) path(c, q => { q.moveTo(-23 + y * .2, y); q.quadraticCurveTo(0, y + 7, 23 - y * .2, y); }, null, '#d5bb8d', 1);
  oval(c, 0, -3, 24, 7, '#526a70', '#dfc59c', 1.3);
  c.save(); c.globalAlpha *= 1 - pour; oval(c, 0, -3, 19, 3.5, '#a8ced3'); c.restore();
  c.restore();
  for (let i = 0; i < 3; i++) {
    const drop = phase(p, .16 + i * .1, .66 + i * .09), fade = 1 - phase(p, .7, .98);
    c.save(); c.globalAlpha *= fade * drop;
    oval(c, -10 + i * 10, 7 + drop * 22, 1.3, 2.7, accent); c.restore();
  }
  c.save(); c.globalAlpha *= tide;
  for (let i = 0; i < 3; i++) wave(c, 29 + i * 5, (19 + i * 11) * (.6 + .4 * tide), i === 1 ? accent : '#89b5c1');
  c.restore();
}
function coastClock(c, p, accent) {
  const reveal = phase(p, .04, .47), tick = phase(p, .28, .74), reflection = phase(p, .6, 1);
  c.save(); c.translate(0, -6);
  oval(c, 0, 0, 28, 28, '#8e8282', P.edge, 1.3); oval(c, 0, 0, 24, 24, '#e1d6bc', '#6b7d80', 1.5);
  oval(c, 0, -30, 3.3, 3.3, null, '#c1aa88', 1.3);
  for (let i = 0; i < 12; i++) {
    const a = i * TAU / 12 - Math.PI / 2;
    line(c, [[Math.cos(a) * 19, Math.sin(a) * 19], [Math.cos(a) * 21.5, Math.sin(a) * 21.5]], i % 3 ? '#9a9384' : '#63767b', i % 3 ? .75 : 1.3);
  }
  path(c, q => { q.moveTo(-17, -17); q.lineTo(-12, -12); q.lineTo(-15, -6); q.lineTo(-10, -3); }, null, '#b8aa95', .65);
  const angle = -Math.PI / 3 + tick * Math.PI / 6;
  line(c, [[0, 0], [Math.cos(angle) * 18, Math.sin(angle) * 18]], '#5c7180', 1.7);
  line(c, [[0, 0], [-7, -9]], '#887d81', 2.1); oval(c, 0, 0, 2.4, 2.4, accent, '#958a7c', .6);
  c.save(); c.globalAlpha *= reveal; path(c, q => { q.moveTo(12, 19); q.lineTo(17, 15); q.lineTo(21, 16); }, null, '#e6c68f', 2.2); c.restore();
  c.restore();
  line(c, [[0, 23], [0, 31]], '#b6a68d', .9); oval(c, 0, 31, 4, 3, '#c2af8c');
  c.save(); c.globalAlpha *= reflection * .6;
  path(c, q => { q.moveTo(-21, 35); q.quadraticCurveTo(0, 43, 21, 35); q.moveTo(-13, 41); q.quadraticCurveTo(0, 44, 13, 41); }, null, accent, 1.1); c.restore();
}

function postWindows(c, p, accent) {
  const windows = [{ x: -27, y: -11, type: 'roof' }, { x: 27, y: -11, type: 'round' }, { x: 0, y: 25, type: 'square' }];
  for (const [i, win] of windows.entries()) {
    const arrival = phase(p, .15 + i * .12, .58 + i * .15);
    c.save(); c.globalAlpha *= phase(p, .02 + i * .06, .32 + i * .08);
    smallWindow(c, win.x, win.y, 22, 27, win.type, arrival, accent); c.restore();
    c.save(); c.globalAlpha *= arrival * .45;
    path(c, q => { q.moveTo(0, -34); q.quadraticCurveTo(win.x * .9, -30, win.x, win.y); }, null, '#ddc89e', .8); c.restore();
    if (arrival > 0) {
      c.save(); c.translate(win.x * arrival, -34 + (win.y + 34) * arrival); c.rotate((1 - arrival) * (i - 1) * .4);
      letter(c, 0, 1, 11, 8, '#b6929f'); c.restore();
    }
  }
  letter(c, 0, -35, 17, 11, accent, phase(p, .02, .3));
  // Short architectural curls connect the scattered windows without a plaque.
  c.save(); c.globalAlpha *= phase(p, .7, 1) * .6;
  path(c, q => { q.moveTo(-37, 16); q.quadraticCurveTo(-35, 28, -21, 28); q.moveTo(37, 16); q.quadraticCurveTo(35, 28, 21, 28); }, null, '#b79c89', .8); c.restore();
}
function postDawnstamp(c, p, accent) {
  const open = phase(p, .05, .46), merge = phase(p, .38, .91), warm = phase(p, .58, 1);
  c.save(); c.rotate((1 - open) * -.12);
  // A perforated stamp is the story object, rather than a shared UI frame.
  path(c, q => {
    q.moveTo(-31, -36);
    for (let i = 0; i < 8; i++) { const x = -31 + i * 7.75; q.lineTo(x + 1.5, -36); q.quadraticCurveTo(x + 3.9, -31.5, x + 6.25, -36); }
    q.lineTo(31, -36);
    for (let i = 0; i < 10; i++) { const y = -36 + i * 7.4; q.lineTo(31, y + 1.3); q.quadraticCurveTo(26.8, y + 3.7, 31, y + 6.1); }
    q.lineTo(31, 38);
    for (let i = 0; i < 8; i++) { const x = 31 - i * 7.75; q.lineTo(x - 1.5, 38); q.quadraticCurveTo(x - 3.9, 33.5, x - 6.25, 38); }
    q.lineTo(-31, 38);
    for (let i = 0; i < 10; i++) { const y = 38 - i * 7.4; q.lineTo(-31, y - 1.3); q.quadraticCurveTo(-26.8, y - 3.7, -31, y - 6.1); }
    q.closePath();
  }, '#dfcdb0', '#bca78e', .85);
  box(c, -24, -28, 48, 57, 1, '#526f7a', '#b69c85', 1);
  wash(c, 0, 0, 21, 25, accent, .12 + .15 * warm);
  c.save(); c.globalAlpha *= 1 - merge;
  oval(c, -10 + merge * 3, -7, 8, 8, '#eed399');
  for (let i = 0; i < 8; i++) { const a = i * TAU / 8; line(c, [[-10 + Math.cos(a) * 10, -7 + Math.sin(a) * 10], [-10 + Math.cos(a) * 12, -7 + Math.sin(a) * 12]], '#e5c990', .8); }
  crescent(c, 12 - merge * 3, -7, 9, '#dce2cc'); c.restore();
  // Vector strokes keep the answer legible without requiring a CJK font.
  c.save(); c.globalAlpha *= merge;
  line(c, [[-17, -18], [-17, 9], [-5, 9], [-5, -18], [-17, -18]], '#f2dfb5', 2);
  line(c, [[-17, -5], [-5, -5]], '#f2dfb5', 1.9);
  path(c, q => { q.moveTo(2, 10); q.quadraticCurveTo(6, 4, 6, -5); q.lineTo(6, -18); q.lineTo(19, -18); q.lineTo(19, 7); q.quadraticCurveTo(19, 12, 13, 9); }, null, '#f2dfb5', 2);
  line(c, [[6, -10], [18, -10]], '#f2dfb5', 1.7); line(c, [[6, -1], [18, -1]], '#f2dfb5', 1.7);
  c.restore();
  line(c, [[-20, 21], [-9, 21]], '#b9c5bb', .7); line(c, [[-20, 24], [-3, 24]], '#b9c5bb', .6);
  c.save(); c.globalAlpha *= warm; path(c, q => { q.moveTo(-23, 12); q.lineTo(-23, 28); q.lineTo(23, 28); q.lineTo(23, 14); }, null, accent, 1.7); c.restore();
  for (let i = 0; i < 3; i++) path(c, q => { q.moveTo(8, 19 + i * 3); q.quadraticCurveTo(16, 16 + i * 3, 23, 19 + i * 3); q.lineTo(33, 18 + i * 3); }, null, '#8c7f79', .65);
  c.restore();
}

const PAINTERS = Object.freeze({
  'station-envelope': stationEnvelope, 'station-crossing': stationCrossing,
  'greenhouse-willow': greenhouseWillow, 'greenhouse-sesame': greenhouseSesame,
  'theatre-homeward': theatreHomeward, 'theatre-moon': theatreMoon,
  'library-horizon': libraryHorizon, 'library-bookmark': libraryBookmark,
  'coast-tide': coastTide, 'coast-clock': coastClock,
  'post-windows': postWindows, 'post-dawnstamp': postDawnstamp,
});

export function drawStoryAwakening(c, view, reducedMotion = false) {
  if (!view || !c) return;
  const kind = view.kind || view.cfg?.kind, paint = Object.hasOwn(PAINTERS, kind) ? PAINTERS[kind] : null;
  const anchor = view.anchor, bounds = view.bounds;
  if (!paint || !anchor || !bounds || ![anchor.x, anchor.y, bounds.left, bounds.right, bounds.top, bounds.bottom].every(Number.isFinite)) return;
  const width = bounds.right - bounds.left, height = bounds.bottom - bounds.top;
  if (width <= 0 || height <= 0) return;
  const duration = view.duration || view.cfg?.duration || 1.8;
  const value = Number.isFinite(view.progress) ? view.progress : Number.isFinite(view.elapsed) ? view.elapsed / duration : 0;
  const progress = reducedMotion || view.settled === true ? 1 : clamp(value, 0, 1);
  if (progress <= 0) return;
  const color = view.accent || view.cfg?.accent;
  const accent = typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? color : P.gold;
  c.save();
  // First constrain the event; then subtract each protected circle separately.
  // A single even-odd path for all circles would expose their intersections.
  c.beginPath(); c.rect(bounds.left, bounds.top, width, height); c.clip();
  for (const zone of Array.isArray(view.clearZones) ? view.clearZones : []) {
    if (!zone || ![zone.x, zone.y, zone.r].every(Number.isFinite) || zone.r <= 0) continue;
    const nearX = clamp(zone.x, bounds.left, bounds.right), nearY = clamp(zone.y, bounds.top, bounds.bottom);
    if ((zone.x - nearX) ** 2 + (zone.y - nearY) ** 2 > zone.r ** 2) continue;
    c.beginPath(); c.rect(bounds.left, bounds.top, width, height);
    c.moveTo(zone.x + zone.r, zone.y); c.arc(zone.x, zone.y, zone.r, 0, TAU); c.closePath(); c.clip('evenodd');
  }
  c.translate(anchor.x, anchor.y); c.scale(width / 96, height / 96);
  c.globalAlpha *= .93 * phase(progress, 0, .16);
  c.lineCap = 'round'; c.lineJoin = 'round';
  paint(c, progress, accent);
  c.restore();
}

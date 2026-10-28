// The same little departure ticket travels from the platform to Shiguang's
// hands, then rides the toy train inside Ashi's cap. Presentation only.
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const finite = (n, fallback) => Number.isFinite(n) ? n : fallback;

function oval(c, x, y, rx, ry, color, rotation = 0) {
  c.beginPath(); c.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
  c.fillStyle = color; c.fill();
}
function star(c, x, y, r, color) {
  c.beginPath(); c.moveTo(x, y - r);
  c.quadraticCurveTo(x + r * .2, y - r * .2, x + r, y);
  c.quadraticCurveTo(x + r * .2, y + r * .2, x, y + r);
  c.quadraticCurveTo(x - r * .2, y + r * .2, x - r, y);
  c.quadraticCurveTo(x - r * .2, y - r * .2, x, y - r);
  c.fillStyle = color; c.fill();
}
function ticketOutline(c) {
  c.beginPath(); c.moveTo(-18, -14);
  for (let x = -14; x <= 10; x += 6) {
    c.lineTo(x - 1, -14); c.lineTo(x, -12.8); c.lineTo(x + 1, -14);
  }
  c.lineTo(18, -14); c.quadraticCurveTo(22, -14, 22, -10);
  c.lineTo(22, -4); c.bezierCurveTo(16, -4, 16, 4, 22, 4);
  c.lineTo(22, 10); c.quadraticCurveTo(22, 14, 18, 14);
  for (let x = 10; x >= -14; x -= 6) {
    c.lineTo(x + 1, 14); c.lineTo(x, 12.8); c.lineTo(x - 1, 14);
  }
  c.lineTo(-18, 14); c.quadraticCurveTo(-22, 14, -22, 10);
  c.lineTo(-22, 4); c.bezierCurveTo(-16, 4, -16, -4, -22, -4);
  c.lineTo(-22, -10); c.quadraticCurveTo(-22, -14, -18, -14); c.closePath();
}

// Local bounds are [-26, 26] × [-16, 16], including the optional embracing
// hands. No clock-based animation: the engine owns bobbing, flight and pause.
export function drawFirstTicket(c, options = {}, t = 0, reducedMotion = false) {
  if (!c || !options) return;
  const x = finite(options.x, 0), y = finite(options.y, 0);
  const scale = clamp(finite(options.scale, 1), 0, 20);
  const alpha = clamp(finite(options.alpha, 1), 0, 1);
  if (scale === 0 || alpha === 0) return;
  c.save(); c.translate(x, y); c.rotate(finite(options.rotation, 0));
  c.scale(scale, scale); c.globalAlpha *= alpha;
  c.lineCap = 'round'; c.lineJoin = 'round';

  if (options.held) {
    c.strokeStyle = '#b7ebd7'; c.lineWidth = 4;
    for (const side of [-1, 1]) {
      c.beginPath(); c.moveTo(side * 14, -10);
      c.quadraticCurveTo(side * 26, -7, side * 23, 4); c.stroke();
    }
  }

  // A paper edge, conductor's notches and perforated stub remain recognizable
  // at world size; the small train and star replace unreadable miniature type.
  c.save(); c.translate(0, 1.4); ticketOutline(c);
  c.fillStyle = '#263d4738'; c.fill(); c.restore();
  ticketOutline(c);
  const paper = c.createLinearGradient(-6, -14, 7, 14);
  paper.addColorStop(0, '#fff1cc'); paper.addColorStop(.54, '#f5dca6'); paper.addColorStop(1, '#d9b879');
  c.fillStyle = paper; c.fill(); c.strokeStyle = '#a48051'; c.lineWidth = 1.15; c.stroke();

  c.beginPath(); c.moveTo(-16, -9.5); c.lineTo(6, -9.5);
  c.moveTo(-16, 9.5); c.lineTo(6, 9.5);
  c.strokeStyle = '#b58e5c88'; c.lineWidth = .8; c.stroke();
  c.strokeStyle = '#9c7b52'; c.lineWidth = .8;
  for (let y = -11; y <= 9; y += 4) {
    c.beginPath(); c.moveTo(10, y); c.lineTo(10, y + 1.8); c.stroke();
  }

  // A miniature carriage with two warm windows and an upward star stamp.
  c.fillStyle = '#567d73'; c.beginPath(); c.roundRect(-14, -4, 14, 8, 1.5); c.fill();
  c.fillRect(-1, -1, 4, 5); c.fillRect(0, -5, 1.8, 4);
  c.fillStyle = '#fff0c3'; c.fillRect(-11.5, -2, 3, 2.5); c.fillRect(-6.5, -2, 3, 2.5);
  for (const wx of [-10, -2]) oval(c, wx, 5.2, 2, 2, '#6f644d');
  c.beginPath(); c.moveTo(-16, 7.7); c.lineTo(4.5, 7.7);
  c.strokeStyle = '#b28b57'; c.lineWidth = .8; c.stroke();
  star(c, 4, -5.6, 3.2, '#b88c49');
  oval(c, 16, -6, 2, 2, '#b98b49');
  c.strokeStyle = '#b18b57'; c.lineWidth = 1.15;
  c.beginPath(); c.moveTo(14, 0); c.lineTo(18, 0); c.moveTo(14, 3); c.lineTo(18, 3); c.moveTo(14, 6); c.lineTo(16.5, 6); c.stroke();
  c.beginPath(); c.moveTo(-16, -11.3); c.lineTo(5, -11.3);
  c.strokeStyle = '#fff8dfbb'; c.lineWidth = .8; c.stroke();

  if (options.held) {
    oval(c, -21, 1.4, 4.2, 3, '#e5ffec', -.32);
    oval(c, 21, 1.4, 4.2, 3, '#e5ffec', .32);
    c.strokeStyle = '#a9d7c5'; c.lineWidth = .8;
    for (const side of [-1, 1]) {
      c.beginPath(); c.moveTo(side * 20, -.2); c.lineTo(side * 18.5, 2); c.stroke();
    }
  }
  c.restore();
}

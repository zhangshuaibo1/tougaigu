// Materials for the actual fifth-chapter geometry. No visual clock can freeze
// a hazard: the frozen cue reads the simulation's existing countdown only.
const TAU = Math.PI * 2;
const finite = Number.isFinite;
function line(c, points, color, width = 1) {
  c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.strokeStyle = color; c.lineWidth = width; c.stroke();
}
function disc(c, x, y, r, color) {
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = color; c.fill();
}
function gradient(c, x1, y1, x2, y2, stops) {
  const g = c.createLinearGradient(x1, y1, x2, y2);
  for (const [at, color] of stops) g.addColorStop(at, color);
  return g;
}

export function drawCoastPlatform(c, p, { camera = 0, viewWidth = Infinity } = {}) {
  if (!c || typeof c.save !== 'function' || !p || ![p.x, p.y, p.w, p.h, camera].every(finite) ||
      p.w <= 0 || p.h <= 0 || !finite(p.x + p.w) ||
      ((!finite(viewWidth) && viewWidth !== Infinity) || viewWidth <= 0) ||
      (p.kind && !['ground', 'stone'].includes(p.kind))) return false;
  if (p.x + p.w < camera - 80 || p.x > camera + viewWidth + 80) return true;
  let saved = false, drawn = false;
  try {
    c.save(); saved = true; c.beginPath(); c.rect(p.x, p.y, p.w, p.h); c.clip();
    c.fillStyle = gradient(c, 0, p.y, 0, p.y + Math.min(p.h, 95),
      [[0, '#a49d8a'], [.12, '#807f76'], [.46, '#52656a'], [1, '#253e4b']]);
    c.fillRect(p.x, p.y, p.w, p.h);
    const left = Math.max(p.x, camera - 80), right = Math.min(p.x + p.w, camera + viewWidth + 80);
    for (let row = 0; row < Math.min(5, Math.ceil(p.h / 25)); row++) {
      const y = p.y + row * 25, shift = row % 2 ? 42 : 0;
      const start = p.x + Math.floor((left - p.x - shift) / 84) * 84 + shift;
      for (let x = start, count = 0; x < right && count < 90; x += 84, count++) {
        const tone = Math.sin(x * .31 + row * 4) > 0;
        c.fillStyle = tone ? '#ead3a51a' : '#102f4519'; c.fillRect(x + 1, y + 2, 82, 22);
        line(c, [[x, y + 2], [x + 1, y + 24], [x + 83, y + 24]], '#183d4a7a', .9);
        line(c, [[x + 4, y + 3], [x + 75, y + 3]], '#e7d6b02d', .8);
        line(c, [[x + 23, y + 9], [x + 29, y + 13], [x + 34, y + 12]], '#223f4939', .7);
        c.fillStyle = '#e2d0aa24'; c.fillRect(x + 56, y + 8, 3, 1);
      }
    }
    // The white landing edge is exactly at p.y, inside the physical rectangle.
    c.fillStyle = '#e6d6b4'; c.fillRect(p.x, p.y, p.w, Math.min(1, p.h));
    c.fillStyle = '#b8b49a'; c.fillRect(p.x, p.y + 1, p.w, Math.min(2, Math.max(0, p.h - 1)));
    if (p.h <= 24) {
      c.fillStyle = '#244652'; c.fillRect(p.x, p.y + p.h - 3, p.w, 3);
      for (const x of [p.x + 7, p.x + p.w - 11]) {
        c.fillStyle = '#a88c63'; c.fillRect(x, p.y + 4, 4, Math.max(1, p.h - 8));
        c.fillStyle = '#ebcf97'; c.fillRect(x, p.y + 5, 3, 1);
      }
    }
    drawn = true;
  } catch { drawn = false; } finally { if (saved) try { c.restore(); } catch { drawn = false; } }
  return drawn;
}

export function getCoastPendulumView(h) {
  if (h?.kind !== 'pendulum' || ![h.x, h.y, h.px, h.py, h.r].every(finite) || h.r < 12) return null;
  return Object.freeze({ x: h.x, y: h.y, px: h.px, py: h.py, radius: h.r,
    angle: finite(h.angle) ? h.angle : 0, frozen: finite(h.frozen) && h.frozen > 0 ? h.frozen : 0 });
}

export function drawCoastPendulum(c, hazard, { camera = 0, viewWidth = Infinity } = {}) {
  const h = getCoastPendulumView(hazard);
  if (!h || !c || typeof c.save !== 'function') return false;
  if (Math.max(h.x, h.px) + h.radius + 32 < camera || Math.min(h.x, h.px) - h.radius - 32 > camera + viewWidth) return true;
  const frozen = h.frozen > 0, edge = frozen ? '#b9f1ee' : '#e6b99a';
  let saved = false, drawn = false;
  try {
    c.save(); saved = true; c.lineCap = 'round'; c.lineJoin = 'round';
    // A visible heavy suspension is attached to the real pivot and bob.
    line(c, [[h.x, h.y], [h.px, h.py]], '#1d3945', 6);
    line(c, [[h.x, h.y], [h.px, h.py]], frozen ? '#6ba7ac' : '#9d8d71', 3.6);
    line(c, [[h.x + 1, h.y], [h.px + 1, h.py]], '#e4d5af9e', .85);
    disc(c, h.x, h.y, 12, '#263e48');
    disc(c, h.x, h.y, 9, gradient(c, h.x - 8, h.y - 8, h.x + 9, h.y + 9,
      [[0, '#e1c590'], [.4, '#9b8668'], [.65, '#d1b17a'], [1, '#556e6c']]));
    disc(c, h.x, h.y, 4, '#31515b'); disc(c, h.x - 1, h.y - 1, 1.4, '#d6d6b5');
    c.translate(h.px, h.py); c.rotate(-h.angle);
    const r = h.radius;
    const halo = c.createRadialGradient(0, 0, r - 3, 0, 0, r + 25);
    halo.addColorStop(0, frozen ? '#91e3e52a' : '#d2917523'); halo.addColorStop(1, '#b8c1bf00');
    disc(c, 0, 0, r + 25, halo);
    // All solid metal stays in the engine's original dangerous disc radius.
    disc(c, 0, 0, r, '#233d48');
    disc(c, 0, 0, r - 1.1, gradient(c, -r, -r, r, r,
      frozen ? [[0, '#d1e8d5'], [.3, '#84bbbc'], [.52, '#dcefd9'], [.73, '#568f9a'], [1, '#315f74']] :
        [[0, '#e1c296'], [.25, '#a17c56'], [.47, '#f0d39e'], [.7, '#8f7054'], [1, '#3c6266']]));
    disc(c, 0, 0, r - 5, '#2c4a55'); disc(c, 0, 0, r - 7,
      gradient(c, -r / 2, -r, r / 2, r, [[0, '#78928d'], [.35, '#485e65'], [1, '#243e4d']]));
    c.beginPath(); c.arc(0, 0, r - 3.5, 0, TAU); c.strokeStyle = edge; c.lineWidth = .8; c.stroke();
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12, outer = r - 9, inner = outer - (i % 3 ? 2.5 : 5);
      line(c, [[Math.sin(a) * inner, -Math.cos(a) * inner], [Math.sin(a) * outer, -Math.cos(a) * outer]], edge, i % 3 ? .8 : 1.5);
    }
    line(c, [[-1, -(r - 14)], [0, 0], [9, 6]], '#182e3c', 3.8);
    line(c, [[-1, -(r - 14)], [0, 0], [9, 6]], '#f5e5bb', 1.6);
    disc(c, 0, 0, 3.3, '#bb9865'); disc(c, -.7, -.7, 1.1, '#fbecc5');
    c.beginPath(); c.arc(-1, -1, r - 11, Math.PI * 1.04, Math.PI * 1.39);
    c.strokeStyle = '#eef3d55e'; c.lineWidth = 1.3; c.stroke();
    for (const a of [-.75, .75, 2.4, 3.9]) {
      const x = Math.sin(a) * (r - 3.5), y = -Math.cos(a) * (r - 3.5);
      disc(c, x, y, 1.3, '#294957'); disc(c, x - .25, y - .35, .55, '#f5d9a8');
    }
    c.rotate(h.angle);
    if (frozen) {
      // Four crystalline marks and a truthful countdown clearly mean safe now.
      for (const [x, y] of [[-r - 8, -5], [r + 8, 5], [0, -r - 9], [0, r + 9]]) {
        line(c, [[x - 3, y], [x + 3, y]], '#c7f6ee', 1);
        line(c, [[x, y - 4], [x, y + 4]], '#c7f6ee', 1);
      }
      c.font = '11px "PingFang SC","Microsoft YaHei",sans-serif'; c.textAlign = 'center';
      c.fillStyle = '#13333bd9'; c.fillRect(-34, r + 17, 68, 17);
      c.fillStyle = '#d2faf1'; c.fillText(`静止 ${h.frozen.toFixed(1)}s`, 0, r + 29);
    }
    drawn = true;
  } catch { drawn = false; } finally { if (saved) try { c.restore(); } catch { drawn = false; } }
  return drawn;
}

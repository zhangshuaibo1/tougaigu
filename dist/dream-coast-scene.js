// Chapter five's distant town is only scenery. Stone, lamps, pendulums and
// the exit remain actual world objects, never baked into this panorama.
import { createPaintedSceneAssets } from './dream-painted-scene.js';

export const COAST_PAINT_URL = new URL('./assets/coast-painted-v27.webp', import.meta.url).href;
export const COAST_PAINT_PARALLAX = .7;
export const COAST_LIGHT_ZONES = Object.freeze([
  Object.freeze({ x: .50, y: .49, rx: .065, ry: .12 }),
  Object.freeze({ x: .88, y: .44, rx: .055, ry: .16 }),
]);
const finite = Number.isFinite;
const positive = n => finite(n) && n > 0;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const eligibleCoast = context => context?.mode === 'story' && context?.chapterIndex === 4;

export function createCoastSceneAssets(options = {}) {
  return createPaintedSceneAssets({ loadImage: options.loadImage, src: options.src || COAST_PAINT_URL, chapterIndex: 4 });
}

export function getPaintedCoastLayout(view) {
  const v = view?.viewport;
  if (!positive(v?.width) || !positive(view?.worldWidth) || !finite(view?.cameraX) ||
      !finite(v.top) || !finite(v.bottom) || v.bottom <= v.top) return null;
  const travel = Math.max(0, view.worldWidth - v.width), camera = clamp(view.cameraX, 0, travel);
  const width = Math.max(2400, v.width + COAST_PAINT_PARALLAX * travel + 40);
  // Finish with the far lighthouse in view. A left-anchored 2400px panorama
  // would otherwise hide that entire right shore at the narrow exit camera.
  const initialX = Math.min(0, v.width + COAST_PAINT_PARALLAX * travel - width);
  const x = clamp(initialX - COAST_PAINT_PARALLAX * camera, v.width - width, 0);
  const layout = { x, y: -52, width, height: width / 3,
    cameraX: camera, parallax: COAST_PAINT_PARALLAX };
  return Object.values(layout).every(finite) ? Object.freeze(layout) : null;
}

export function drawPaintedCoast(c, view, image) {
  const l = getPaintedCoastLayout(view);
  if (!l || !image || typeof c?.drawImage !== 'function' || typeof c?.save !== 'function') return false;
  try {
    if (image.complete === false || !positive('naturalWidth' in image ? image.naturalWidth : image.width) ||
        !positive('naturalHeight' in image ? image.naturalHeight : image.height)) return false;
  } catch { return false; }
  let saved = false, drawn = false;
  try {
    c.save(); saved = true;
    c.beginPath(); c.rect(0, view.viewport.top, view.viewport.width, view.viewport.bottom - view.viewport.top); c.clip();
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(image, l.x, l.y, l.width, l.height); drawn = true;
  } catch { drawn = false; } finally { if (saved) try { c.restore(); } catch { drawn = false; } }
  return drawn;
}

// Two quiet pools on the distant copper roofs answer this run's real lamps.
// The original dawn and windows in the painting are not completion signals.
export function drawPaintedCoastLights(c, view, amounts = []) {
  const l = getPaintedCoastLayout(view);
  if (!l || typeof c?.createRadialGradient !== 'function' || typeof c?.save !== 'function') return false;
  let saved = false, drawn = false;
  try {
    c.save(); saved = true;
    c.beginPath(); c.rect(0, view.viewport.top, view.viewport.width, view.viewport.bottom - view.viewport.top); c.clip();
    for (const [i, z] of COAST_LIGHT_ZONES.entries()) {
      const a = clamp(finite(amounts[i]) ? amounts[i] : 0, 0, 1);
      if (!a) continue;
      const x = l.x + l.width * z.x, y = l.y + l.height * z.y, rx = l.width * z.rx, ry = l.height * z.ry;
      c.save();
      try {
        c.translate(x, y); c.scale(1, ry / rx);
        const glow = c.createRadialGradient(0, 0, 2, 0, 0, rx);
        glow.addColorStop(0, `rgba(255,220,157,${(a * .27).toFixed(4)})`);
        glow.addColorStop(.35, `rgba(250,195,127,${(a * .14).toFixed(4)})`);
        glow.addColorStop(1, 'rgba(250,195,127,0)');
        c.fillStyle = glow; c.beginPath(); c.arc(0, 0, rx, 0, Math.PI * 2); c.fill();
      } finally { c.restore(); }
    }
    drawn = true;
  } catch { drawn = false; } finally { if (saved) try { c.restore(); } catch { drawn = false; } }
  return drawn;
}

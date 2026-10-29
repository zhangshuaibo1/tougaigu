// Pure contact-shadow view over the same top surfaces used by body landing.
// Callers pass runtime movers and already-filtered closed barriers. In
// particular, level.movers is authored geometry, not a current moving surface.
const finite = Number.isFinite;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const rect = value => value && finite(value.x) && finite(value.y) && finite(value.w) && finite(value.h) && value.w > 2 && value.h > 0;
export const GROUND_SHADOW_MAX_DISTANCE = 360;

/**
 * {body, level, movers, closedBarriers} -> a frozen view or null.
 * level.platforms includes both solid and one-way platforms, as physics does.
 * closedBarriers must be level.barriers filtered with the actual barrierOpen
 * result. Missing closedBarriers means no barrier evidence, never all closed.
 */
export function getGroundShadowView(context = {}) {
  const { body, level, movers, closedBarriers } = context;
  if (!body || !finite(body.x) || !finite(body.y) || !finite(body.w) || body.w <= 0) return null;
  let nearest = null;
  for (const [source, list] of [['platform', level?.platforms], ['mover', movers], ['barrier', closedBarriers]]) {
    if (!Array.isArray(list)) continue;
    for (const surface of list) {
      if (!rect(surface) || surface.y < body.y - .01
          || !(body.x + body.w / 2 > surface.x + 1 && body.x - body.w / 2 < surface.x + surface.w - 1)) continue;
      const distance = Math.max(0, surface.y - body.y);
      if (distance >= GROUND_SHADOW_MAX_DISTANCE) continue;
      // At overlapping equal-height surfaces, use the mover that really owns
      // the grounded feet, matching the landing loop's attachment preference.
      const attached = body.grounded === true && source === 'mover' && typeof surface.id === 'string' && surface.id === body.platform;
      if (!nearest || surface.y < nearest.surface.y - .01
          || (Math.abs(surface.y - nearest.surface.y) < .01 && attached && !nearest.attached)) {
        nearest = { surface, source, distance, attached };
      }
    }
  }
  if (!nearest) return null;
  const { surface, source, distance } = nearest, q = distance / GROUND_SHADOW_MAX_DISTANCE;
  const radiusX = clamp(body.w * .8, 10, 32) * (1 - .55 * q), radiusY = 4 * (1 - .5 * q);
  return Object.freeze({
    x: body.x, y: surface.y + Math.min(2, surface.h / 2), radiusX, radiusY,
    opacity: .42 * Math.pow(1 - q, 1.5), distance,
    surface: Object.freeze({ id: typeof surface.id === 'string' ? surface.id : null, kind: typeof surface.kind === 'string' ? surface.kind : null,
      x: surface.x, y: surface.y, w: surface.w, h: surface.h, source }),
    clip: Object.freeze({ x: surface.x, y: surface.y, w: surface.w, h: Math.min(surface.h, radiusY * 2 + 2) }),
  });
}

/** Draw a world-coordinate view; preserves transform, alpha, paints and clip. */
export function drawGroundShadow(c, view) {
  if (!c || !view || !rect(view.clip) || !finite(view.x) || !finite(view.y)
      || !finite(view.radiusX) || !finite(view.radiusY) || view.radiusX <= 0 || view.radiusY <= 0
      || !finite(view.opacity) || view.opacity <= 0) return;
  c.save();
  c.beginPath(); c.rect(view.clip.x, view.clip.y, view.clip.w, view.clip.h); c.clip();
  c.globalAlpha *= clamp(view.opacity, 0, 1);
  c.fillStyle = '#071e2c'; c.beginPath(); c.ellipse(view.x, view.y, view.radiusX, view.radiusY, 0, 0, Math.PI * 2); c.fill();
  c.restore();
}

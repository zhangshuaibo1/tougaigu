import test from 'node:test';
import assert from 'node:assert/strict';
import { createTheatreEncore, advanceTheatreEncore, getTheatreEncoreView, drawTheatreEncore } from '../dist/dream-theatre-encore.js';
import { DreamGame } from '../dist/dream-engine.js';

const STEP = 1 / 60;
function fixture() {
  const stage = { id: 'stage', kind: 'stage', x: 695, y: 465, w: 185, h: 20, dx: 3 };
  const body = { x: 791, y: 465, w: 34, h: 55, grounded: true, platform: 'stage' };
  const context = {
    mode: 'story', chapterIndex: 2, state: 'playing', form: 'body', deaths: 0,
    body, movers: [stage],
    level: { platforms: [{ x: 565, y: 465, w: 220, h: 18 }, { x: 1130, y: 465, w: 225, h: 18 }] },
  };
  return { state: createTheatreEncore(), context, stage, body };
}
function tick(f, frames = 1) {
  for (let i = 0; i < frames; i++) advanceTheatreEncore(f.state, f.context, STEP);
}
function ride(f) {
  tick(f);
  assert.equal(f.state.phase, 'riding');
  for (const x of [730, 820, 940, 1040, 1090]) {
    f.stage.dx = x - f.stage.x;
    f.stage.x = x;
    f.body.x = x + 96;
    tick(f);
  }
  assert.ok(f.state.rideDistance > 145);
}
function land(f) {
  // This body is wholly past the moving deck, on the actual right-bank shelf.
  f.body.x = 1300;
  f.body.platform = null;
  tick(f);
}
function earn(f = fixture()) {
  ride(f);
  land(f);
  assert.equal(f.state.phase, 'active');
  assert.equal(f.state.age, 0);
  return f;
}

// Compose the actual Canvas affine transforms, including the caller's world
// transform. Recording only translate() arguments would miss a double camera.
function canvasRecorder() {
  let matrix = [1, 0, 0, 1, 0, 0];
  let values = { globalAlpha: 1, fillStyle: '#000', strokeStyle: '#000', lineWidth: 1 };
  const stack = [], calls = [], arcs = [];
  let gradientCount = 0;
  const point = (x, y) => [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]];
  function multiply(a, b, c, d, e, f) {
    const [ma, mb, mc, md, me, mf] = matrix;
    matrix = [ma * a + mc * b, mb * a + md * b, ma * c + mc * d, mb * c + md * d, ma * e + mc * f + me, mb * e + md * f + mf];
  }
  const styles = () => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value?.gradientId ?? value]));
  function record(name, args = []) {
    for (const value of args) if (typeof value === 'number') assert.ok(Number.isFinite(value), name + ' has finite coordinates');
    assert.ok(matrix.every(Number.isFinite));
    calls.push({ name, args: [...args], matrix: [...matrix], values: styles() });
  }
  const api = {
    calls, arcs, point,
    snapshot: () => ({ matrix: [...matrix], values: styles(), depth: stack.length }),
    save() { stack.push({ matrix: [...matrix], values: { ...values } }); record('save'); },
    restore() { assert.ok(stack.length, 'restore has a matching save'); ({ matrix, values } = stack.pop()); record('restore'); },
    setTransform(...args) { matrix = [...args]; record('setTransform', args); },
    translate(x, y) { multiply(1, 0, 0, 1, x, y); record('translate', [x, y]); },
    scale(x, y) { multiply(x, 0, 0, y, 0, 0); record('scale', [x, y]); },
    rotate(angle) { const c = Math.cos(angle), s = Math.sin(angle); multiply(c, s, -s, c, 0, 0); record('rotate', [angle]); },
    arc(x, y, radius, ...rest) { arcs.push({ center: point(x, y), radius, alpha: values.globalAlpha }); record('arc', [x, y, radius, ...rest]); },
    createLinearGradient(...args) {
      const gradientId = 'gradient-' + gradientCount++;
      record('createLinearGradient', args);
      return { gradientId, addColorStop(offset, color) { record('addColorStop', [offset, color]); } };
    },
  };
  return new Proxy(api, {
    get(target, key) { return key in target ? target[key] : key in values ? values[key] : (...args) => record(key, args); },
    set(target, key, value) { values[key] = value; return true; },
  });
}
function paint(state, options = {}) {
  const c = canvasRecorder(), before = c.snapshot(), stateBefore = structuredClone(state);
  const drawn = drawTheatreEncore(c, state, options);
  assert.deepEqual(c.snapshot(), before, 'painting restores caller transform and style');
  assert.deepEqual(state, stateBefore, 'painting does not advance the earned effect');
  return { drawn, calls: c.calls, arcs: c.arcs };
}

test('an earned curtain call finishes on its playing clock after switching to soul and cannot replay by toggling forms', () => {
  const f = earn();
  tick(f, 18);
  const bodyAge = f.state.age;
  f.context.form = 'soul';
  const physical = structuredClone(f.context);
  tick(f);
  assert.ok(f.state.age > bodyAge, 'soul flight must not freeze an already earned curtain call');
  tick(f, 180);
  assert.deepEqual(getTheatreEncoreView(f.state), { phase: 'done', age: 2.1, duration: 2.1 });
  assert.deepEqual(f.context, physical, 'the effect cannot modify body, stage, deaths or scene data');
  const completed = structuredClone(f.state);
  for (const form of ['body', 'soul', 'body']) { f.context.form = form; tick(f, 30); assert.deepEqual(f.state, completed); }
  assert.equal(paint(f.state).drawn, false, 'a completed effect is no longer painted');
});

test('soul form still cannot earn a curtain call by boarding or by landing on the far bank', () => {
  const boarding = fixture();
  boarding.context.form = 'soul';
  tick(boarding, 30);
  assert.equal(boarding.state.phase, 'waiting');
  assert.equal(getTheatreEncoreView(boarding.state), null);

  const landing = fixture();
  ride(landing);
  landing.context.form = 'soul';
  const distance = landing.state.rideDistance;
  land(landing);
  assert.equal(landing.state.phase, 'riding');
  assert.equal(landing.state.rideDistance, distance);
  assert.equal(getTheatreEncoreView(landing.state), null, 'only body form may qualify at the actual landing');
});

test('pause freezes the earned clock and drawing in either form, and resume continues the same effect', () => {
  for (const form of ['body', 'soul']) {
    const f = earn();
    tick(f, 18);
    f.context.form = form;
    f.context.state = 'paused';
    const frozen = structuredClone(f.state), frame = paint(f.state);
    tick(f, 180);
    assert.deepEqual(f.state, frozen, form + ' pause must freeze the full effect state');
    assert.deepEqual(paint(f.state), frame);
    f.context.state = 'playing';
    tick(f);
    assert.ok(Math.abs(f.state.age - frozen.age - STEP) < 1e-12, form + ' resumes from its paused age');
    assert.equal(f.state.phase, 'active');
  }
});

test('death invalidates active and completed effects in either form; paused deaths are handled on resume', () => {
  for (const phase of ['active', 'done']) for (const form of ['body', 'soul']) {
    const f = earn();
    if (phase === 'done') tick(f, 180);
    f.context.form = form;
    f.context.state = 'paused';
    f.context.deaths++;
    const paused = structuredClone(f.state);
    tick(f, 30);
    assert.deepEqual(f.state, paused, 'a pause cannot advance or reset presentation state');
    f.context.state = 'playing';
    tick(f);
    assert.deepEqual(f.state, { ...createTheatreEncore(), deaths: 1 });
    tick(f, 30);
    assert.equal(f.state.phase, 'waiting', 'a far-bank respawn cannot re-earn the effect');
    assert.equal(getTheatreEncoreView(f.state), null);
  }
});

test('reduced motion keeps the medallion still while its playing deadline also expires in soul form', () => {
  const f = earn();
  tick(f, 12);
  const early = paint(f.state, { reducedMotion: true });
  assert.equal(early.drawn, true);
  f.context.form = 'soul';
  tick(f, 72);
  assert.ok(f.state.age > 1, 'reduced-motion drawing does not suspend the soul-form clock');
  assert.deepEqual(paint(f.state, { reducedMotion: true }), early, 'age changes do not animate a reduced-motion medallion');
  tick(f, 180);
  assert.equal(f.state.phase, 'done');
  assert.equal(paint(f.state, { reducedMotion: true }).drawn, false);
});

test('production architecture places the curtain moon in world space with one camera transform at desktop and portrait scales', () => {
  const f = earn();
  tick(f, 30);
  for (const camera of [0, 400, 800]) for (const [scale, offsetY] of [[1, 0], [0.5, 23], [2, -18]]) {
    const c = canvasRecorder();
    c.setTransform(scale, 0, 0, scale, 0, offsetY);
    c.translate(-camera, 0);
    const caller = c.snapshot(), bodyScreen = c.point(f.body.x, f.body.y);
    const scene = {
      isStationFinish: () => false, isGreenhouseFinish: () => false, isTheatreFinish: () => true,
      theatrePaintedFrame: true, movers: [], camera, viewWidth: 1100,
      theatreEncore: f.state, options: { reducedMotion: true }, letterEcho: null,
    };
    DreamGame.prototype.drawArchitecture.call(scene, c, 0);
    const moon = c.arcs.find(arc => arc.radius === 12);
    assert.ok(moon && moon.alpha > 0, 'the production architecture actually paints the visible moon');
    assert.ok(Math.abs(moon.center[0] - scale * (1240 - camera)) < 1e-9, 'camera is applied exactly once');
    assert.ok(Math.abs(moon.center[1] - (offsetY + scale * 375)) < 1e-9, 'the moon stays above the right bank');
    assert.ok(Math.abs(moon.center[0] - bodyScreen[0] - scale * (1240 - f.body.x)) < 1e-9, 'moon and rider retain their world-space separation');
    assert.deepEqual(c.snapshot(), caller, 'architecture restores the original world transform');
  }
});

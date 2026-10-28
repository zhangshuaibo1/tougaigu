// The borrowed-moon interlude is local to one visit to the theatre. It owns
// neither chapter collisions nor puzzle lamps, rewards, energy or saved progress.
const point = value => !!(value && typeof value === 'object'
  && typeof value.x === 'number' && Number.isFinite(value.x)
  && typeof value.y === 'number' && Number.isFinite(value.y));
const copyPoint = value => ({x: value.x, y: value.y});
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const length = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const freezeDeep = value => {
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object' && !Object.isFrozen(child)) freezeDeep(child);
  }
  return Object.freeze(value);
};

export const MOON_PLAY_CONFIG = freezeDeep({
  id: 'borrowed-moon-play', chapterIndex: 2,
  anchor: {x: 1460, y: 560},
  mirror: {x: 1460, y: 380},
  // Screen coordinates: angles describe the mirror's surface, not its normal.
  angles: [Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4],
  bodyRangeX: 70, bodyRangeY: 24, turnRadius: 85,
  minSourceDistance: 35, maxSourceDistance: 310,
  beamLength: 335, targetRadius: 19, holdSeconds: .45, unfoldSeconds: .9,
  variants: [
    {
      id: 'moon-windows', title: '给空窗借月',
      caption: '空窗先亮起来，风铃和纸鸟就有了听众。',
      targets: [
        {id: 'moon-window', x: 1318, y: 352, label: '窗', kind: 'window'},
        {id: 'moon-bell', x: 1442, y: 232, label: '风铃', kind: 'bell'},
        {id: 'moon-bird', x: 1612, y: 292, label: '纸鸟', kind: 'bird'},
      ],
    },
    {
      id: 'moon-wind', title: '送晚风上场',
      caption: '纸船载着晚风，去接还没睡着的星星。',
      targets: [
        {id: 'moon-boat', x: 1322, y: 272, label: '纸船', kind: 'boat'},
        {id: 'moon-kite', x: 1492, y: 218, label: '风筝', kind: 'kite'},
        {id: 'moon-star', x: 1630, y: 356, label: '星星', kind: 'star'},
      ],
    },
    {
      id: 'moon-home', title: '等一盏归灯',
      caption: '檐下留一盏灯，月鱼也能认得回家的水路。',
      targets: [
        {id: 'moon-lantern', x: 1305, y: 312, label: '灯笼', kind: 'lantern'},
        {id: 'moon-roof', x: 1436, y: 246, label: '屋檐', kind: 'roof'},
        {id: 'moon-fish', x: 1598, y: 238, label: '月鱼', kind: 'moonfish'},
      ],
    },
  ],
});

// A plane mirror reflects a unit incident vector i about its unit normal n:
// r = i - 2(i . n)n. No destination or target is used to aim this ray.
export function reflectMoonRay(source, angle, mirror = MOON_PLAY_CONFIG.mirror) {
  if (!point(source) || !point(mirror) || typeof angle !== 'number' || !Number.isFinite(angle)) return null;
  const distance = length(source, mirror);
  if (!Number.isFinite(distance) || distance <= 1e-9) return null;
  const incoming = {x: (mirror.x - source.x) / distance, y: (mirror.y - source.y) / distance};
  const normal = {x: -Math.sin(angle), y: Math.cos(angle)};
  const dot = incoming.x * normal.x + incoming.y * normal.y;
  const outgoing = {x: incoming.x - 2 * dot * normal.x, y: incoming.y - 2 * dot * normal.y};
  return {
    incoming, outgoing, normal, distance,
    beam: [copyPoint(source), copyPoint(mirror), {
      x: mirror.x + outgoing.x * MOON_PLAY_CONFIG.beamLength,
      y: mirror.y + outgoing.y * MOON_PLAY_CONFIG.beamLength,
    }],
  };
}

// Reference placement for reachability checks. This never runs during play;
// the live beam always uses the player's real soul position instead.
export function solveMoonSource(target, angle, distance = 140, mirror = MOON_PLAY_CONFIG.mirror) {
  if (!point(target) || !point(mirror) || typeof angle !== 'number' || !Number.isFinite(angle)
      || typeof distance !== 'number' || !Number.isFinite(distance) || distance <= 0) return null;
  const span = length(target, mirror);
  if (!Number.isFinite(span) || span <= 1e-9) return null;
  const outgoing = {x: (target.x - mirror.x) / span, y: (target.y - mirror.y) / span};
  const normal = {x: -Math.sin(angle), y: Math.cos(angle)};
  const dot = outgoing.x * normal.x + outgoing.y * normal.y;
  const incoming = {x: outgoing.x - 2 * dot * normal.x, y: outgoing.y - 2 * dot * normal.y};
  return {x: mirror.x - incoming.x * distance, y: mirror.y - incoming.y * distance};
}

const hitsTarget = (ray, target) => {
  if (!ray) return false;
  const mirror = MOON_PLAY_CONFIG.mirror;
  const dx = target.x - mirror.x, dy = target.y - mirror.y;
  const along = dx * ray.outgoing.x + dy * ray.outgoing.y;
  if (along <= 0 || along > MOON_PLAY_CONFIG.beamLength) return false;
  const across = Math.abs(dx * ray.outgoing.y - dy * ray.outgoing.x);
  return across <= MOON_PLAY_CONFIG.targetRadius;
};

export class DreamMoonPlay {
  constructor() {
    this.destroyed = false;
    this.variant = 0;
    this.clock = 0;
    this.context = null;
    this.near = false;
    this.active = false;
    this.illuminated = false;
    this.presentationSource = null;
    this.ray = null;
    this.groups = MOON_PLAY_CONFIG.variants.map(variant => ({
      mirrorIndex: 0,
      targets: variant.targets.map(() => ({lit: false, held: 0, unfolded: 0})),
    }));
  }

  get current() { return this.groups[this.variant]; }
  get complete() { return this.current.targets.every(target => target.lit); }
  get completedVariants() {
    return this.groups.flatMap((group, index) => group.targets.every(target => target.lit) ? [index] : []);
  }

  bodyInRange(body) {
    return point(body) && body.grounded === true
      && Math.abs(body.x - MOON_PLAY_CONFIG.anchor.x) <= MOON_PLAY_CONFIG.bodyRangeX
      && Math.abs(body.y - MOON_PLAY_CONFIG.anchor.y) <= MOON_PLAY_CONFIG.bodyRangeY;
  }

  refresh(context) {
    if (this.destroyed) return;
    // Copy live inputs: neither rendering nor callers can mutate the stored
    // coordinates without explicitly refreshing them on the next simulation step.
    this.context = {
      state: context?.state,
      form: context?.form,
      body: point(context?.body) ? {...copyPoint(context.body), grounded: context.body.grounded === true} : null,
      soul: point(context?.soul) ? copyPoint(context.soul) : null,
      reducedMotion: context?.reducedMotion === true,
    };
    this.near = this.bodyInRange(this.context.body);
    this.active = this.context.state === 'playing' && this.context.form === 'soul' && this.near;
    if (this.active) {
      this.illuminated = true;
      this.presentationSource = this.context.soul ? copyPoint(this.context.soul) : null;
      this.ray = null;
      if (this.context.soul) {
        const distance = length(this.context.soul, MOON_PLAY_CONFIG.mirror);
        if (distance > MOON_PLAY_CONFIG.minSourceDistance && distance < MOON_PLAY_CONFIG.maxSourceDistance) {
          this.ray = reflectMoonRay(this.context.soul, MOON_PLAY_CONFIG.angles[this.current.mirrorIndex]);
        }
      }
    } else if (this.context.state !== 'paused' || this.context.form !== 'soul' || !this.near) {
      this.illuminated = false;
      this.presentationSource = null;
      this.ray = null;
    }
    // Paused scenes retain their exact last beam and source. Presentation is
    // frozen, while `active` is false so no hold or mirror input can advance.
    // A pause freezes a partly held beam; leaving or returning to the body
    // ends that continuous exposure. Already unfolded scenery is never erased.
    if (this.context.state === 'playing' && !this.active) {
      for (const target of this.current.targets) if (!target.lit) target.held = 0;
    }
    if (this.context.reducedMotion) {
      for (const group of this.groups) for (const target of group.targets) if (target.lit) target.unfolded = 1;
    }
  }

  update(dt, context) {
    if (this.destroyed) return;
    this.refresh(context);
    // Stalled frames cannot replace a deliberate hold. The engine normally
    // calls this with fixed substeps; invalid or backwards time is inert.
    dt = typeof dt === 'number' && Number.isFinite(dt) ? clamp(dt, 0, .1) : 0;
    if (!this.active || !dt) return;
    this.clock += dt;
    const targets = MOON_PLAY_CONFIG.variants[this.variant].targets;
    for (let index = 0; index < targets.length; index++) {
      const status = this.current.targets[index];
      if (status.lit) {
        status.unfolded = this.context.reducedMotion ? 1 : clamp(status.unfolded + dt / MOON_PLAY_CONFIG.unfoldSeconds, 0, 1);
        continue;
      }
      status.held = hitsTarget(this.ray, targets[index]) ? Math.min(MOON_PLAY_CONFIG.holdSeconds, status.held + dt) : 0;
      if (status.held + 1e-9 >= MOON_PLAY_CONFIG.holdSeconds) {
        status.lit = true;
        status.held = MOON_PLAY_CONFIG.holdSeconds;
        status.unfolded = this.context.reducedMotion ? 1 : 0;
      }
    }
  }

  pulse(soul) {
    if (this.destroyed || !this.active || !point(soul)
        || length(soul, MOON_PLAY_CONFIG.mirror) > MOON_PLAY_CONFIG.turnRadius) return false;
    this.current.mirrorIndex = (this.current.mirrorIndex + 1) % MOON_PLAY_CONFIG.angles.length;
    for (const target of this.current.targets) if (!target.lit) target.held = 0;
    this.refresh({...this.context, soul});
    return true;
  }

  interact(context) {
    if (this.destroyed) return false;
    this.refresh(context);
    if (this.context.state !== 'playing' || this.context.form !== 'body' || !this.near || !this.complete) return false;
    this.variant = (this.variant + 1) % MOON_PLAY_CONFIG.variants.length;
    this.refresh(context);
    return true;
  }

  getHint(context = this.context) {
    if (this.destroyed || context?.state !== 'playing' || !this.bodyInRange(context?.body)) return '';
    if (context.form === 'body') return this.complete
      ? '借月追光 · Q 换一幕，已亮的小景会留下。'
      : '借月追光 · E 掀盖，让拾光把月光送进镜子。';
    if (context.form !== 'soul') return '';
    if (this.complete) return '这一幕亮齐了 · E 归位，再按 Q 换一幕。';
    if (point(context.soul) && length(context.soul, MOON_PLAY_CONFIG.mirror) <= MOON_PLAY_CONFIG.turnRadius) {
      return 'Q / 空格 转月镜 · 飞动拾光，追光会跟着你转。';
    }
    return '飞动拾光，让反射的月光停在小景上 · 靠近月镜可用 Q / 空格转向。';
  }

  getView() {
    const config = MOON_PLAY_CONFIG.variants[this.variant];
    const source = this.presentationSource ? copyPoint(this.presentationSource) : null;
    const targets = config.targets.map((target, index) => ({
      ...target, index, lit: this.current.targets[index].lit,
      charge: clamp(this.current.targets[index].held / MOON_PLAY_CONFIG.holdSeconds, 0, 1),
      unfoldProgress: this.current.targets[index].unfolded,
    }));
    return {
      anchor: {...MOON_PLAY_CONFIG.anchor},
      mirror: {...MOON_PLAY_CONFIG.mirror, angle: MOON_PLAY_CONFIG.angles[this.current.mirrorIndex],
        index: this.current.mirrorIndex, angles: [...MOON_PLAY_CONFIG.angles]},
      source, beam: this.ray ? this.ray.beam.map(copyPoint) : [], targets,
      variant: this.variant, variantId: config.id, title: config.title, caption: config.caption,
      active: this.active, illuminated: this.illuminated, near: this.near, complete: this.complete,
      completedVariants: this.completedVariants,
      progress: {lit: targets.filter(target => target.lit).length, total: targets.length},
      clock: this.clock, reducedMotion: this.context?.reducedMotion === true,
      canTurn: !!(this.active && source && length(source, MOON_PLAY_CONFIG.mirror) <= MOON_PLAY_CONFIG.turnRadius),
      canAdvance: !!(!this.destroyed && this.context?.state === 'playing' && this.context?.form === 'body' && this.near && this.complete),
    };
  }

  getSnapshot() {
    const view = this.getView();
    return {
      id: MOON_PLAY_CONFIG.id, variant: view.variant, variantId: view.variantId,
      title: view.title, progress: {...view.progress}, complete: view.complete,
      completedVariants: [...view.completedVariants], mirrorIndex: this.current.mirrorIndex,
      active: view.active, illuminated: view.illuminated, near: view.near, clock: this.clock, destroyed: this.destroyed,
      canTurn: view.canTurn, canAdvance: view.canAdvance,
      groups: this.groups.map((group, variant) => ({
        variant, mirrorIndex: group.mirrorIndex,
        lit: group.targets.flatMap((target, index) => target.lit ? [index] : []),
      })),
    };
  }

  destroy() {
    this.destroyed = true;
    this.context = null;
    this.active = false;
    this.illuminated = false;
    this.presentationSource = null;
    this.near = false;
    this.ray = null;
  }
}

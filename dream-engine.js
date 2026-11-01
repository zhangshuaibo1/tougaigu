// v34.1 production adapter: retain the complete verified six-chapter engine.
// Only the actual game canvas opts into first-chapter daydream artwork.
import { DreamGame as OriginalDreamGame } from './dream-engine-legacy.js';
import { drawFirstChapterDaydreamFace, drawFirstChapterThoughtRibbon, drawFirstChapterThoughtRim, isFirstChapterDaydream } from './dream-ashi-daydream.js';
export { DREAM_LEVELS, DREAM_PHYSICS, createDreamRng, getDreamStars } from './dream-engine-legacy.js';

export class DreamGame extends OriginalDreamGame {
  constructor(canvas, callbacks = {}, resources = {}) {
    super(canvas, callbacks, resources);
    this.daydreamFirstChapter = canvas?.id === 'dream-canvas';
  }
  drawStationRim(c) {
    if (drawFirstChapterThoughtRim(c, this)) return;
    super.drawStationRim(c);
  }
  drawSkullFront(c, body, time, shown) {
    if (drawFirstChapterDaydreamFace(c, this, body, time, shown)) return;
    super.drawSkullFront(c, body, time, shown);
  }
  drawCapLid(c, time, rig, outfit) {
    if (isFirstChapterDaydream(this) && drawFirstChapterThoughtRibbon(c, this, time, rig, outfit)) return;
    super.drawCapLid(c, time, rig, outfit);
  }
}

import { getEnding } from './dream-story.js';

// This is a view of the existing ending, not a new ending or a save field.
// In particular, the two mixed replies both keep the original tender ending.
const LETTER_LABELS = Object.freeze({ send: '信已寄出', keep: '信留窗边' });
const CLOCK_LABELS = Object.freeze({ release: '钟声向前', hold: '为想念留灯' });
const SKY_LABELS = Object.freeze({
  dawn: '晨光正升起',
  tender: '晨光刚抵达窗沿',
  lanterns: '长夜的窗灯亮着，太阳尚未升起',
});

export function getEndingScene(save) {
  const ending = getEnding(save);
  const letter = save?.choices?.letter, clock = save?.choices?.clock;
  if (!ending || !Object.hasOwn(LETTER_LABELS, letter) || !Object.hasOwn(CLOCK_LABELS, clock)) return null;
  const sky = SKY_LABELS[ending.id];
  if (!sky) return null;
  return Object.freeze({
    id: ending.id, letter, clock, sky,
    letterLabel: LETTER_LABELS[letter], clockLabel: CLOCK_LABELS[clock],
    description: `黎明邮局：${sky}。${LETTER_LABELS[letter]}，${CLOCK_LABELS[clock]}。拾光陪阿拾读完最后的回信。`,
  });
}

export function renderEndingScene(root, save) {
  const scene = getEndingScene(save);
  if (!root || !scene) return false;
  root.dataset.ending = scene.id;
  root.dataset.letter = scene.letter;
  root.dataset.clock = scene.clock;
  root.setAttribute('aria-label', scene.description);
  const letter = root.querySelector('[data-ending-letter-label]');
  const clock = root.querySelector('[data-ending-clock-label]');
  const sky = root.querySelector('[data-ending-sky-label]');
  if (letter) letter.textContent = scene.letterLabel;
  if (clock) clock.textContent = scene.clockLabel;
  if (sky) sky.textContent = scene.sky;
  return true;
}

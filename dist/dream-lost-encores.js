// Optional scenes shown only after an actual successful hand-off. The caller
// owns that gate; this catalog supplies no owner, answer, evidence, or reward.
const scenes = [
  {
    caseId: 'lost-station-01', sceneId: 'story-0', kind: 'train',
    variants: [
      { caption: '头顶借一束灯，照亮回家路。', accent: '#e6c68a', detail: 'lit-window' },
      { caption: '脑洞专线，加开一站等你。', accent: '#bed4c6', detail: 'waiting-bench' },
    ],
  },
  {
    caseId: 'lost-halloween-01', sceneId: 'halloween', kind: 'candy',
    variants: [
      { caption: '脑洞开小窗，胆小也有座。', accent: '#e5b580', detail: 'invitation-seat' },
      { caption: '夜邮局的灯，甜了一小格。', accent: '#c8b8e2', detail: 'postal-sweet' },
    ],
  },
  {
    caseId: 'lost-valentine-01', sceneId: 'valentine', kind: 'window',
    variants: [
      { caption: '站稳的骨头，也值得被谢谢。', accent: '#e4b2ad', detail: 'scarf-pocket' },
      { caption: '飞出去的光，也有信寄来。', accent: '#c8d9cf', detail: 'head-window' },
    ],
  },
  {
    caseId: 'lost-greenhouse-01', sceneId: 'story-1', kind: 'sprout',
    variants: [
      { caption: '头顶开窗，春天探了个头。', accent: '#bcd9a9', detail: 'leaf' },
      { caption: '脑洞长出阴凉，想法慢慢长。', accent: '#c9bdcf', detail: 'shade' },
    ],
  },
  {
    caseId: 'lost-library-01', sceneId: 'story-3', kind: 'echo',
    variants: [
      { caption: '头顶四个泡泡，都是谢谢。', accent: '#a9ceda', detail: 'bubble' },
      { caption: '借你一片留白，唱完这四拍。', accent: '#d6c2e4', detail: 'curtain' },
    ],
  },
  {
    caseId: 'lost-thanksgiving-01', sceneId: 'thanksgiving', kind: 'table',
    variants: [
      { caption: '头顶添一碗，等你坐下来。', accent: '#e6bf8f', detail: 'warm-soup' },
      { caption: '脑洞再挪挪，还坐得下一个。', accent: '#d6b895', detail: 'extra-chair' },
    ],
  },
];

function freezeDeep(value) {
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object' && !Object.isFrozen(child)) freezeDeep(child);
  }
  return Object.freeze(value);
}

export const LOST_ENCORES = freezeDeep(scenes.flatMap(scene => scene.variants.map((variation, variant) => ({
  caseId: scene.caseId, sceneId: scene.sceneId, variant, kind: scene.kind, ...variation,
}))));

const byCaseVariant = new Map(LOST_ENCORES.map(scene => [scene.caseId + ':' + scene.variant, scene]));

export function getLostEncore(caseId, variant) {
  if (typeof caseId !== 'string' || !Number.isInteger(variant) || variant < 0 || variant > 1) return null;
  return byCaseVariant.get(caseId + ':' + variant) || null;
}

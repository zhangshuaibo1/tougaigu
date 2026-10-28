// Main-story scenery revealed by a solved lamp. The caller must gate these
// motifs on that lamp's real `lit` state: there is no unsolved preview here.
// Positions, timing progress, collisions and rewards belong to the caller.
const awakenings = [
  {
    id: 'awakening-platform-0', puzzleId: 'platform-0', chapterIndex: 0, sealIndex: 0,
    kind: 'station-envelope', title: '纸信启程',
    caption: '信封展开了，没说出口的话有了去处。',
    accent: '#f0cf97', duration: 1.8,
  },
  {
    id: 'awakening-platform-1', puzzleId: 'platform-1', chapterIndex: 0, sealIndex: 1,
    kind: 'station-crossing', title: '各渡一程',
    caption: '旧画里的旅客，各自找到了过海的办法。',
    accent: '#bedbb6', duration: 1.8,
  },
  {
    id: 'awakening-greenhouse-0', puzzleId: 'greenhouse-0', chapterIndex: 1, sealIndex: 0,
    kind: 'greenhouse-willow', title: '春风裁叶',
    caption: '春风剪出细叶，柳枝从玻璃边舒展开。',
    accent: '#a9e2b5', duration: 1.8,
  },
  {
    id: 'awakening-greenhouse-1', puzzleId: 'greenhouse-1', chapterIndex: 1, sealIndex: 1,
    kind: 'greenhouse-sesame', title: '花逐节开',
    caption: '芝麻花一节节开，够到了窗边的光。',
    accent: '#e7c9e9', duration: 1.8,
  },
  {
    id: 'awakening-theater-0', puzzleId: 'theater-0', chapterIndex: 2, sealIndex: 0,
    kind: 'theatre-homeward', title: '月照故乡',
    caption: '月光落进故乡的小窗，也照着最后一排。',
    accent: '#e0c5e9', duration: 1.8,
  },
  {
    id: 'awakening-theater-1', puzzleId: 'theater-1', chapterIndex: 2, sealIndex: 1,
    kind: 'theatre-moon', title: '借月开场',
    caption: '借来的月亮升起，追光终于找回舞台。',
    accent: '#f2dda9', duration: 1.8,
  },
  {
    id: 'awakening-library-0', puzzleId: 'library-0', chapterIndex: 3, sealIndex: 0,
    kind: 'library-horizon', title: '高窗望远',
    caption: '书页打开高处的窗，远方又多了一层。',
    accent: '#b4dcea', duration: 1.8,
  },
  {
    id: 'awakening-library-1', puzzleId: 'library-1', chapterIndex: 3, sealIndex: 1,
    kind: 'library-bookmark', title: '书签留页',
    caption: '书签留住这一页，下一页还可以打开。',
    accent: '#cbd5ed', duration: 1.8,
  },
  {
    id: 'awakening-coast-0', puzzleId: 'coast-0', chapterIndex: 4, sealIndex: 0,
    kind: 'coast-tide', title: '潮水归海',
    caption: '水从竹篮回到海里，想念留在岸上。',
    accent: '#b4d9df', duration: 1.8,
  },
  {
    id: 'awakening-coast-1', puzzleId: 'coast-1', chapterIndex: 4, sealIndex: 1,
    kind: 'coast-clock', title: '向前一秒',
    caption: '旧表向前走一格，海面跟着亮了一下。',
    accent: '#e9c79d', duration: 1.8,
  },
  {
    id: 'awakening-postoffice-0', puzzleId: 'postoffice-0', chapterIndex: 5, sealIndex: 0,
    kind: 'post-windows', title: '窗窗有信',
    caption: '信到了每一扇窗，也给你留了一页。',
    accent: '#f2d09e', duration: 1.8,
  },
  {
    id: 'awakening-postoffice-1', puzzleId: 'postoffice-1', chapterIndex: 5, sealIndex: 1,
    kind: 'post-dawnstamp', title: '日月成明',
    caption: '日月在邮票上相逢，把明天轻轻照亮。',
    accent: '#f4dba7', duration: 1.8,
  },
];

function freezeDeep(value) {
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object' && !Object.isFrozen(child)) freezeDeep(child);
  }
  return Object.freeze(value);
}

export const STORY_AWAKENINGS = freezeDeep(awakenings);

export function getStoryAwakening(chapterIndex, sealIndex) {
  if (!Number.isInteger(chapterIndex) || chapterIndex < 0 || chapterIndex > 5
      || !Number.isInteger(sealIndex) || sealIndex < 0 || sealIndex > 1) return null;
  return STORY_AWAKENINGS[chapterIndex * 2 + sealIndex];
}

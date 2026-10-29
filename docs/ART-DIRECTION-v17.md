# v17 倒流温室：美术来源与接入

日期：2026-10-28（America/Los_Angeles）。本轮使用内置 imagegen 生成一张原创温室背景，沿用现有站台的绘本质感、冷暖关系和细致材料。没有使用外部游戏的角色或原画。

## 资源

- 生成原稿：`docs/art/greenhouse-painted-original.png`，2172×724，RGB，2,694,455 字节。SHA-256：`654811138d7f6081598b56fb8c6dff02a721547885f8d33a52bcd41bcfd86e66`。
- 生产图：`dist/assets/greenhouse-painted-v17.webp`，同样尺寸，WebP quality 94，508,666 字节。SHA-256：`f017cedf22b93e3fc53de1feb95e00cac21661dab00d90a31c2b9aa9efb4c4fd`。只转换格式，不裁切、不放大，体积减少约 81.1%。
- 原稿的正门实际位于横向约 50%，两扇可独立调光的圆拱窗位于约 44.55% 与 55.40%。代码采用实际成图的位置，不使用提示里未实现的 62% 构图假设。

## 生成方式与完整提示

方式：内置 imagegen；新图生成；不透明背景；未提供外部参考素材。最终代码中的可操作蘑菇、根台、诗灯、旧靴子与种子均由原游戏状态绘制，不烘焙入背景。

```text
Use case: illustration-story.
Asset type: production backdrop for an original polished 2D side-scrolling story puzzle game, chapter 'Backflow Greenhouse'. Create one NEW finished landscape illustration, panoramic 3:1 composition, approximately 2160 by 720 pixels.
Scene: a magical glass conservatory at blue-green twilight, seen from a level side view. A graceful central arched glasshouse with an elegant copper-and-aged-brass frame stands at 62% of the image width. Smaller interconnected conservatory wings extend far left and right. Curved roof ribs, clean individual panes with sparse dew, delicate iron botanical scrollwork, climbing willow tendrils, fern beds and modest potting benches give the building a handcrafted, lived-in quality. Distant willow trees, layered foliage and a quiet muted teal sky create depth. The ground line at the foot of the building is at about 79% of the image height.
Art direction: richly finished storybook game background, beautifully controlled painterly brushwork, tactile material edges, dimensional but gently stylized shapes, intricate coherent architecture. Restrained moss green, petrol teal, jade glass, aged copper, soft warm apricot light. The craftsmanship and finish should match a premium illustrated fantasy game. The design is wholly original.
Composition for gameplay: architectural detail stays mostly in the middle band, upper 26% is quiet dark teal sky with gentle atmospheric gradation, lower 21% is a broad calm dark mossy forecourt with very low contrast and no obstacles. At the center of the main greenhouse facade, place two recognizable slender arched greenhouse window bays, one on each side of the narrow center door. Both start dim, with dusky pale green glass and faint reflections; the game will overlay their illumination separately. Make these openings clean, regular and unobscured by plants. Small amber accents may glow elsewhere in the far wings, but avoid dazzling highlights. Central feature must survive a narrow vertical crop. Balanced detail, clear silhouette, attractive materials, readable shapes at game scale.
Constraints: background scenery only. No people, creatures, skulls, characters, floating envelopes, tickets, seeds, collectible objects, mushrooms, platforms, stepping stones, arrows, text, signs, interface, border, logos or watermark. Do not paint an obvious path into the distance or foreground railings. Avoid photo realism, plastic 3D surfaces, noisy particles, heavy bloom and blurred details. Fully opaque image.
```

## 可读性与接入约束

背景承担玻璃、铜框、远景树木、植物与安静前院。实际可落脚的上沿、弹床帽面、谜灯和可收集种子必须保持足够的轮廓与对比，不能改变碰撞尺寸或拾取半径。两扇窗分别读取对应诗灯的 `lit` 值，不能用灯总数或已有种子收藏推断本局解题状态。

资源应仅在主线第二章按需加载；失败保持原来温室的完整可玩绘制。任何加载、画面、窗光、材料和角色细节都不得更改存档、奖励、物理或谜题判定。验收与发布状态另见本轮 QA，不把素材完成等同游戏完成。


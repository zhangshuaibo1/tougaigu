# v22 剧场精绘资源

用途：第三章「借月剧场」后景。内置 imagegen 生成原创位图；生成后仅转换为 WebP 编码，不改动构图、颜色或透明度。真实人物、诗灯、月镜、绳索、平台、地面、坑洞及环境灯状态仍由游戏运行时绘制。

- 原始图：`theatre-painted-original-v22.png`，2172×724 RGB，2,032,141 字节，SHA-256 `89fcbdf1b2d9df778a2f67f429f994e1ce6e9d5ab392668d112cf7ee9c9c94f4`。
- 生产图：`../../dist/assets/theatre-painted-v22.webp`，2172×724，WebP quality=88 / method=6，178,844 字节，SHA-256 `8c59e1cf3a361501e57eaf8d9bc5e5df6a71823ac4773895f19e48e392632b7d`。
- 原 v20 SVG 保留为网络/解码失败时的后景回退；两者都失败时回退原 Canvas 场景。
- 设计要求：以成熟家庭游戏的完成度为参考，保留原创世界；背景材质有体积，坑洞范围保持暗且无连续台面；不得提前烘焙真实谜灯已解的发光、可拾取物或互动指示。

## 完整生成提示

Use case: illustration-story.
Asset type: production background bitmap for an original side-scrolling story puzzle game, the Borrowed Moon Theatre in 《掀起你的头盖骨》.
Primary request: A beautifully finished, original hand-painted theatre panorama, with the material richness, approachable rounded shapes and visual clarity of a lovingly crafted premium family game. Sophisticated layered 2D storybook painting, crisp painted edges and sculpted light, not pixel art, not a photo, not a flat vector mockup.
Scene: a warm, slightly forgotten tiny theatre at night. Deep mulberry and plum velvet curtains hang in generous rounded folds; aged honey brass proscenium with engraved small botanical motifs; worn walnut private theatre boxes on the left and right; dim indigo upholstered seats receding into a quiet auditorium; a small pale lavender crescent painted on a distant scenic wall. Nostalgic, curious, inviting, slightly magical. No scary or grotesque anatomy.
Composition: VERY WIDE PANORAMA 3:1, approximately 3072 by 1024. Camera faces straight across a side-scrolling stage, no dramatic wide-angle floor perspective. Compose many gentle background layers across the entire image, with equally carefully painted velvet and wood in the LEFT THIRD (the first gameplay view) and the right third. Deep velvet folds catch subdued desaturated lavender rim light. Wooden balconies sit in the rear, visibly behind the play plane. In the far backdrop, leave subdued unlit curtain areas around 28% and 73% across and 57% down; real game lights will illuminate these areas later. Very faint cool ambient reflections only, no glowing electric light pools.
Critical gameplay composition: the LOWER 35 percent of the entire image must fade into quiet dark navy/plum shadow with extremely low detail and no continuous visible floor, platform, planks, steps, ledges, bridge, ladder, railing or bright horizontal stripe. The real moving platform, pit, ground, ropes and characters will be drawn on top by the game. Keep the middle lower area particularly calm and dark so the real platform silhouette reads at once. Any seat shapes here should disappear fully into dark atmospheric shadow before the bottom third. Important art and beautifully modeled material folds live mostly in the top 65 percent.
Materials: velvety fabric microtexture without noisy grain, rich curved folds with reflected purple light, small tarnished brass edge highlights, understated engraved trim, soft worn walnut wood with rounded carved edges, subdued brocade wallpaper. Each material should feel tactile with intentional highlights and shadows, never uniformly glowing.
Color: muted dark plum #3b2345, midnight #11182c, dusty lavender reflections, restrained aged brass #b99569, warm walnut. Broad soft ambient illumination makes details visible; brightest artwork remains quieter than a luminous foreground player.
Constraints: BACKGROUND ONLY. No characters, no foreground playable objects, no physical floating platforms, no hanging interactive lanterns, no suspended ropes, no light switches, no mirrors, no collectible birds, stars, tickets or envelopes. No text, logos, UI, HUD, borders or watermark. No recognizable existing game character or copied franchise art. Not a screenshot; one seamless original illustration filling the canvas.

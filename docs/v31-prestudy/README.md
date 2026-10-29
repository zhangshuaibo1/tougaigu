# v31 本地美术预研：眼窝里的笑

## 当前边界

这是 `iteration-v31-face-prestudy-20261029` 上的独立本地研究，基于 `1ba8ce9a4261d74f7278f14ded776cd23681bfcd` 和逐字节复制的 v30 未提交研究。**没有将 v30 或 v31 宣称为已发布版本，没有运行本轮真实浏览器、触摸、存档解锁或线上验收。** v29、v30 原工作区和远端没有因本研究而修改；版本仍由主发布流程维护。

原始复制登记见 [base-snapshot.json](base-snapshot.json)。开始修改前，将全部 142 个运行时文件冻结到 `/tmp/tougaigu-v31-v30-base-1ba`，逐一核对原快照中的 38 项研究文件。完整运行时基线哈希保存在 [v30-source-manifest.json](v30-source-manifest.json)。

## 玩家可感的变化

原角色已经有眨眼、发光瞳孔、拾光方向追看、低能量半闭眼、回盖微笑、事件星光、骨盖渐变和拾光珠光身体。本研究保留这些既有机制，只扩大三个有实际事件依据的表情差别。

| 时刻 | 表情变化 | 仍由原引擎决定的事实 |
| --- | --- | --- |
| 拾光实际碰到去程票，或真实接近灯后完成共鸣 | 健康、自由飞行的拾光出现实心弯眼和张开的笑口；原珠光身体、星纹、尾巴、抱票手与票的位置保留 | `emoteTime > 0`、能量至少 25、实际呈现 `pose: free` / `layer: world` |
| 成功后回到身体，骨盖实际合拢，事件时间尚未结束 | 阿拾的深眼窝变成清楚的上扬笑眼，宽一些的微笑里保留小牙齿 | 原取物事件 2.3 秒、原灯事件 2 秒；只读取剩余时间，不补发、不重新计时 |
| 灵魂自然耗能，或玩家在低能量时主动回盖 | 阿拾的眼窝上缘下垂，与上扬笑眼形成轮廓差异，小圆嘴保留；瞳孔仍追随原 `shown` 灵魂坐标，并被眼窝遮罩限制在骨腔内 | 阿拾原阈值 `< 20`；拾光原阈值 `< 25`，两者没有合并 |

优先级为 **疲劳／真实开盖和追看 → 成功表情 → 普通表情**。原眨眼公式和时钟保留。回盖中的拾光和探头姿态继续使用原表情；阿拾在追看拾光时也不会被成功笑眼盖住注意方向。减动仍显示真实事件的意义，只使用原固定表现时钟。

骨面只加了较宽的右颧骨／下颌阴影和左侧骨面受光，外轮廓、鼻孔、小牙、裂纹、骨盖接缝、铰链、衣服、帽饰、站位和角色尺寸均沿用现有设计。本研究没有另做衣料细节。主要收益是可读的事件表情；材质是辅助调整。

## 最小运行时范围

- 新增 [dream-traveler-face.js](../../dist/dream-traveler-face.js)：`getTravelerFaceView(game, body, time, shown)` 为只读派生视图；`hasSoulJoy(game, shown)` 限定真实自由态成功；`drawTravelerSkullFront(...)` 在调用者现有头部矩阵内画脸，不创建另一套 rig。
- [dream-engine.js](../../dist/dream-engine.js)：相对复制的 v30，只新增模块导入与 `drawSkullFront` 小入口。六章故事以外走原绘制；不在 `getCharacterPresentation` 中递归读取灵魂呈现。
- [dream-soul-art.js](../../dist/dream-soul-art.js)：只在既有脸部 painter 增加自由态笑眼／嘴分支；原身体材质、变换、回盖、探头、疲劳、能量弧、手和携带物不变。

相对冻结的 v30 运行时，两个原文件变化、一个新模块加入；其余 140 个原运行时文件全部保持原字节，包括引擎物理、关卡、存档奖励、骨盖 rig、角色步态、移动平台表演和全部背景资源。工作区中其他既有未提交文件来自 root 复制的 v30 研究，不能计作本轮成果。

## 原尺寸对照

以下 8 张图为四组 **同输入、同一物理帧** 的 320 × 431 原始生产 Canvas 输出。未裁切、缩放、合成或使用图片生成修改。图像与报告的哈希见 [selection-manifest.json](selection-manifest.json)。

| 原实际时刻 | 冻结 v30 | 当前 v31 预研 |
| --- | --- | --- |
| 实际拾取去程票：拾光的笑眼／笑口 | [v30 原图](phone-320-events-ticket-joy-v30.png) | [预研原图](phone-320-events-ticket-joy.png) |
| 点亮第一盏灯并完成原回盖：阿拾上扬笑眼 | [v30 原图](phone-320-events-lamp-closed-joy-v30.png) | [预研原图](phone-320-events-lamp-closed-joy.png) |
| 自然耗能至低能量、主动回盖后：阿拾疲倦 | [v30 原图](phone-320-fatigue-closed-tired-v30.png) | [预研原图](phone-320-fatigue-closed-tired.png) |
| 第六章作者出生点，自然走完出生无敌时间：骨面 | [v30 原图](phone-320-chapter-6-neutral-v30.png) | [预研原图](phone-320-chapter-6-neutral.png) |

320 原尺寸图审中，上弯笑眼与低垂眼窝可直接区分；拾光抱票时的弯眼也可辨认。骨面调整保持克制。主会话也独立查看了 320 取票前后、点灯合盖开心、低能合盖疲倦的原 PNG，并认可这一方向。图审判断来自这些场景原图，没有使用放大图代替可见性证据。

## 实际控制与验证结果

[render-v31-face.mjs](../../scripts/render-v31-face.mjs) 对当前引擎和独立冻结 v30 使用同样的输入，每次以原 `update(1/60)` 推进。实际交互仅调用 `start`、`setInput`、`toggleSoul`、`pulse`、`resolvePuzzle(true)`、`recall`、`pause`、`resume`、`setReducedMotion` 等原方法；没有直接赋值身体／灵魂坐标、速度、能量、事件时间、奖励或解锁状态。灯谜正确结果是通过原引擎方法交付，不能据此称已完成浏览器中的答题操作。

本次固定步长离线路线的完整记录在 [face-v31-report.json](face-v31-report.json)，包括每条输入带、物理时间、能量、原事件剩余时间、原 cap 状态、源文件哈希、每帧像素差分范围和 PNG 哈希。

| 证据 | 实际结果 |
| --- | --- |
| 路线 | 11 条：六章 320 作者出生点，320／390 各一条实际取票与点灯路线、各一条自然耗能路线，另一个 Halloween 负例 |
| Canvas 帧 | 32 组同帧前后对照，合计 64 张原 PNG；其中 8 张归档，其他输出在 `/tmp/tougaigu-v31-face`，可用脚本重建 |
| 同输入更新 | 4,212 次，每次身体、灵魂、能量、事件时间、奖励、物件、灯、平台等原状态与 v30 一致 |
| rig／实际呈现比较 | 4,836 次，原 rig、手、脚和实际灵魂呈现逐项一致；包含实际开盖扶盖、回盖接住与扣盖样本 |
| 像素边界 | 32 组全部通过；所有变化限制在原头部脸面及实际呈现的拾光脸部范围，范围之外变化为 0 |
| 正常故事范围 | 六章均有 320 普通脸证据，出生无敌时间通过原更新自然结束，未强制清除透明状态 |
| 非故事隔离 | Halloween 普通／开盖两组全 Canvas 像素与冻结 v30 一致；其他节日原测试保留并通过 |
| 暂停 | 10 个真实状态各给 6 次更新＋渲染机会，共 60 次；整幅 Canvas、视图、rig 和原状态全冻住。它不等同于观察了浏览器 RAF |
| 死亡／物理 | 所有路线 0 死亡；原物理与奖励源码原字节不变 |

归档的实际时刻包括：拾票 `emoteTime = 2.3`、点灯 `emoteTime = 2`；点灯后的合盖笑脸尚余约 1.267 秒。自然耗能经过约 24.965、19.948 两个原阈值；低能主动回盖后的样片约 18.958 能量，继续原恢复到约 20.158 后即回普通表情。这些数值来自报告中的真实运行状态。

[traveler-face-v31.test.mjs](../../tests/traveler-face-v31.test.mjs) 的 7 个专测通过，覆盖六章／非法场景隔离、两个原能量阈值、表情优先级、事件到期、实际 `shown` 追看而非旧灵魂坐标、原眨眼时序、减动时钟、纯渲染与 Canvas 平衡、原珠光／物件绘制和真实取票回盖与 BaseGame 同输入比较。全部 `npm test` 通过 **73 个测试文件**；`node scripts/check.mjs` 检查 **68 个 JavaScript 模块、171 个本地引用** 通过；`git diff --check` 通过。

本研究未执行 `scripts/version-assets.mjs --check`，没有改版本号或资源缓存标记。新增模块的完整资源门禁、候选部署、真实浏览器路线、手机触摸、线上域名及最终视觉复核应由正式升版流程处理。

## 重建冻结基线与重新取图

当前冻结基线仍在 `/tmp/tougaigu-v31-v30-base-1ba`。直接重建图像：

```sh
node scripts/render-v31-face.mjs /tmp/tougaigu-v31-face /tmp/tougaigu-v31-v30-base-1ba
```

为避免以后 v30 正式升版导致本地基线丢失，另存 [v30-runtime.patch](v30-runtime.patch)：它只记录 `1ba8ce9` 到冻结 v30 的两个原运行时变化。已在独立临时目录应用并确认结果逐字节相等。若原 `/tmp` 基线不存在，可在独立 checkout 上重建：

```sh
git worktree add --detach /tmp/tougaigu-v31-v30-rebuilt 1ba8ce9a4261d74f7278f14ded776cd23681bfcd
git -C /tmp/tougaigu-v31-v30-rebuilt apply /workspace/scratch/2b18af2db412/tougaigu-v31/docs/v31-prestudy/v30-runtime.patch
cp docs/v31-prestudy/v30-source-manifest.json /tmp/tougaigu-v31-v30-rebuilt/source-manifest.json
node scripts/render-v31-face.mjs /tmp/tougaigu-v31-face /tmp/tougaigu-v31-v30-rebuilt
```

脚本会先检查基线的 142 个运行时文件哈希，再核对本轮允许变化以外的源码和资源。该重建配方只用于离线证据，不执行发布操作。

## 正式推进前仍需完成

先闭环 v29，再以正式通过验收的 v30 作为下一轮基点，重新核对本研究的两个集成点。选择保留这些表情后，按发布流程生成缓存标记并执行真实浏览器原路线：取票的自由笑脸、回盖注意优先、点灯合盖后短窗口、自然低能量和恢复、暂停／减动、三种手机宽度与六章实际场景。此处的固定步长和直接作者出生初始化不能代替这些验收。

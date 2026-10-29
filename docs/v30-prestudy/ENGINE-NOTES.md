# 六章动作接入：本地预研记录

这是独立工作区的预研结果，不是 v30 正式开始、浏览器验收或发布记录。工作区基点为 `38c25da4a204b81ef935f03c3c9152224578913b`；本次额外对照的是冻结的 v29 候选 `bfe9fd55400c89a06c5f0b677cf02a6380e0a624`，不能把候选称为已发布版本。版本、存档、远端和 v29 工作区均未由本预研修改。

## 接入与边界

`dist/dream-engine.js` 的 `start()` 和 `getTravelerPerformanceView()` 现在共同使用 `isTravelerPerformanceScene(this)`，只允许 `story` 模式的整数章节 0–5。十个节日仍然没有该表演状态或 view；原非第三章 null 断言已改为六章正例、十节日负例，未删除隔离保护。

第一、二章向原 `drawStationCharacter()` 传入真实 `getGroundShadowView()`：使用运行时身体、实际 mover、实际关闭的 barrier。默认反光色保留；第三至六章原绘制分支、shadow 参数和 reflection 字符串保留原样。没有新 RAF、定时器、时钟或资源请求。

纯表演模块沿用原起跳、下降、0.2 秒落地收势和手部占用优先级。真实 `stage/book` 接触才产生 ride。水平位移仍通过原 `platformVelocity/balance` 表达；纵书增加 `platformVerticalVelocity/verticalBalance`，自由手腕随本步 dy 最多调整 3 个世界像素。纵书不借用水平摇摆，不移动身体、脚底或原 rig。

## 同输入验证

运行方式：

```sh
node tests/traveler-performance.test.mjs
TOUGAIGU_V30_CANDIDATE_DIST=/tmp/tougaigu-v29-bfe-baseline/dist node tests/traveler-performance-v30.test.mjs
```

第二项的环境变量可选：默认比较产品 `DreamGame` 与 `BaseGame`；指定原字节候选目录后，三套引擎收到同一套真实控制方法。没有写入身体坐标、platform、grounded、能量、灯状态或完成结果。每次 update 对照身体、灵魂、输入、时间、能量、头盖、mover、灯、记忆、粒子、hazard、checkpoint、护符、主线物件、平台和 barrier、踏板状态、待解谜/对话、支线进度及事件回调。第三章额外逐字段比较候选原 view 和双臂。

| 检查 | 实际结果 |
|---|---|
| 原 traveler 专测 | 6/6；保留 1,223 次正常输入的完整第三章通关对照、早期 E 反转、死亡与羽毛恢复 |
| 新纯/集成专测 | 11/11，含产品/Base/冻结候选三路对照 |
| 六章普通跳跃 | 每章 241 次 update 对照，真实上升、下降、落地、暂停、灵魂落地、减动、重开；包含暂停调用，不能全部称为推进帧 |
| 第一、二章阴影 | 157 + 171 次 update 对照；绘制 trace 验证实际地面、单向台、腾空位置、透明度、裁剪与上下文恢复 |
| 第四章双书 | 总计 2,130 次 update 对照；book-a 453 帧、book-b 512 帧完整周期；dy 双向，零输入相对位移误差均为 0 |
| 第二章蘑菇/树根 | 274 次 update 对照；真实 `vy=-850`、未伪造一次落地、实际根台 `y=385`，阴影裁剪到根台 |
| 第六章横书/蘑菇/树根 | 1,484 次 update 对照；548 帧横书完整往返；相对位移最大浮点误差 `9.094947017729282e-13`；真实 `vy=-850`、根台 `y=390` |
| 生命周期 | 六章均覆盖零/负/NaN/负无限步长、原引擎将正无限限幅为 0.04、换章、销毁与销毁后 start；HUD 回调换 run/销毁不推进旧身体表演 |
| 最后全套 | 浏览器观察器升级完成后重跑 `npm test`：70/70 测试文件通过，无失败或跳过；`git diff --check` 通过 |
| 静态检查 | `npm run check` 通过：66 个模块、168 个本地引用、226 个 29.0.0 资产引用；未提升版本 |

上述明确列出的路线合计 5,662 次三路 update 对照，另有生命周期用例。首次全套在并行代理升级观察器期间为 69/70，唯一未通过文件是 `tests/browser-traveler-performance.test.mjs`；当次输出未展开具体断言，不据此单独推定失败原因。该代理完成后已重新运行完整全套，70/70 通过。

## 原字节保护

以 `read_bytes()` 比较当前文件与 `/tmp/tougaigu-v29-bfe-baseline/dist`，以下八个文件逐字节相同：`dream-engine-base.js`、`dream-levels.js`、`dream-festival-levels.js`、`dream-cap-art.js`、`dream-journey.js`、`dream-story.js`、`dream-festivals.js`、`play-rewards.js`。其中：

| 文件 | SHA-256 |
|---|---|
| `dream-engine-base.js` | `688e3006296e9d18fbaf49135b7b82b72d949539dcdc9387acefb224aab58699` |
| `dream-levels.js` | `38ca1aa53af038a9db50bdca15b6b92844f6f9428b82e7e320b34bdb7aac41c0` |
| `dream-cap-art.js` | `dad5b4a0e2c0ffb13c008c473068465d25f701509114b31ab100629e459063ed` |
| 本地 `dream-engine.js` | `ec03967f529ce408a3fad751834d18ef90869afe0962b00ea7d8a25c37f825f6` |
| 本地 `dream-traveler-performance.js` | `ff4f258632c6136fed2a4b95fa8aa828c25817d3db6318663b924ee93ecf2c5c` |

## 还需实际 Canvas 与浏览器确认的最小实例

根会话负责另存 `scripts/render-v30-motion.mjs`，本预研没有修改该脚本，也没有覆盖归档旧图。以下逻辑路径已经由真实控制方法走通，仍需视觉证据；离线直接起章夹具不能称为正常解锁的浏览器路线。

1. **六章出生处单跳，1100×640、390×595、320×431。** 比较同物理帧 rise/fall/land/第 6 帧收势/第 13 帧结束；第三章应与候选逐像素一致。前两章差分区域包括真实落点阴影，其余差分应限于角色原包围范围。暂停至少 6 次被动帧机会比较完整 Canvas 与 view。
2. **图书馆两书。** 正常走到 x≈691，等 book-a `y>=478 && dy>0` 后起跳，直到真实 `platform==='book-a'`；落地 13 帧后观察 dy 正负与换向。正常解开第一盏灯后，再到 x≈1439、等 book-b `y>=473 && dy>0` 后以同法登书。原尺寸图检查手腕对方向的细微反应、握盖/接住优先级和脚底，不放大图后宣称手机可读。
3. **邮局横书。** 正常踏住 letter 踏板并解第一灯，跳到 y465 踏台，x≈845 等 `last-stage.x<=850 && dx>0`，正常向右上书；停止输入直到 vx 为 0。双向各留一帧及暂停帧，确认站姿不走步、脚底不滑。
4. **两处真实蘑菇与根台。** 温室从 x≈730 向右踩蘑菇并停在 x≈970，实际落脚 y385；邮局按原完整路线越书后从 x≈1440 踩蘑菇并停在 x≈1680，实际落脚 y390。观察实际上弹、真实落地的短暂收势，以及根台上的阴影。不得用坐标或灯状态注入替代路线。

正式继续前应先收尾 v29、对齐其最终源码，再由唯一发布者执行候选、原尺寸图审阅与公网验证。这里没有浏览器、触摸设备、低端 GPU 或发布成功声明。

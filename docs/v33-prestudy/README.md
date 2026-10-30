# v33 预研：小旅伴「抬头等你」

状态：**本地独立预研及正式可调用的测试适配完成，未发布 v33。产品仍为 32.0.0。** 验证记录整理于 2026-10-30 UTC。本目录不是公开站点验收，也不代表 v32 的正式发布状态。适配只修改测试脚本，不修改产品。

工作树仅为 `tougaigu-v33-companion-prestudy`，分支 `prestudy-v33-companion-20261030`；基线提交 `d113b48f7964dbc3f67ce0e0fee40a39519979d1`，树 `ad30abdd5852d171c5853b706e86695748ff5aff`。本轮没有远端操作、版本升级或其他工作树修改。未来正式 v33 应把下列精确增量应用到届时通过验收的最新 v32，不能用本预研整树覆盖新基线。

## 玩家能看到什么

仍然是原有苔绿色小猫、原跟随位置和体量。身体使用清楚的浅腹与深侧面，脸部补齐短鼻和成对口鼻，原来的折线脚改成分开的软爪，尾巴、耳内和脸侧形成较大的明暗面。320 原尺寸中这些轮廓可以分辨，没有增添需要放大才能看到的道具、文字或装饰。

拾光飞起时，小猫的眼神同时跟随实际显示位置的横纵变化，并轻轻抬耳、抬头。身体形态切回 `body` 后，真正还在飞回的拾光仍然是视线目标。拾光到达头盖后，小猫在原归位进度最后三分之一短暂眨眼，闭盖后回看身体。现有开心星点、身体起伏和尾摆保留原语义。

新绘制器没有移动身体、小猫或拾光，没有新时钟、输入、碰撞、奖励、存档字段、加载资源或剧情门槛。小猫仍可能按原有镜头与跟随逻辑离开可见范围；本轮截图使用正常输入选取了小猫完整可见的观察点。

## 实现边界

`dream-companion-art.js` 是纯读取与纯 Canvas 绘制模块。`dream-engine.js` 增加 24 行集成，在一次同步 `render()` 的临时作用域内捕获 base 原本算出的第一份 `presentedSoul`；小猫消费的是同一个对象，包括合法的 `null`。`ready` 与结果分开，闭盖时不会重新求值。

作用域用 `finally` 恢复外层值。测试实际覆盖绘制抛错、一次嵌套 render、无 context 的 early return，以及 destroy 后完整 render。脱离帧上下文单独调用 `drawCompanion()` 时使用旧绘制器，getter 计数为零。销毁状态拒绝新精绘；不能把这一点表述成“销毁后独立调用旧绘制也完全不画”。

仅六个主线章节使用新精绘，十个节庆场景保持原绘制调用。基础引擎原字节未修改：SHA-256 `688e3006296e9d18fbaf49135b7b82b72d949539dcdc9387acefb224aab58699`。

归位眨眼来自已有 `cap.progress`，不是一个新计时器。原拾光到达约为 0.48 秒，原闭盖完成约为 0.72 秒；测试按真实固定步长跨越这些边界。仅有效 `returnFrom` 的真正归位触发：最初不可见时立刻双击 E 不产生眨眼；成功 E 反转清除归位，低能量拒绝的 E 保留当下真实归位；暂停冻结原时钟。游戏内减少动态设置沿用原逻辑立即落定头盖，新绘制的起伏、尾摆、倾斜和动态眨眼归零。

本轮保证小猫不增加第二次姿态求解。第六章已有的 `postDelivery` 绘制仍保留其既有读取，不能宣称所有场景全局只求值一次。

## 验证结果

| 验证 | 最终结果 | 证据 |
| --- | --- | --- |
| `npm test` | 77 / 77 测试文件通过 | `validation/npm-test-final.txt` |
| 专项 `node tests/companion-art-v33.test.mjs` | 8 / 8 实质测试通过 | `validation/companion-tests-final.txt` |
| `npm run check` | 69 JS 模块、172 本地引用、235 个 32.0.0 资源引用，0 个待改文件 | `validation/npm-check-final.txt` |
| 三尺寸真实本地 Chromium | 三项通过，共 41.897 秒 | `browser/report.json` |
| 适配后直接调用，只有当前 URL | 三项通过，共 32.371 秒 | `adapter/companion/report.json` |
| 原始基础引擎 | 与基线逐字节相同 | `verification.json` |
| 独立只读审阅 | 未发现 scope / fallback 的阻塞问题；后续补入重入实测 | 本说明及专项测试 |
| root 独立预研证据审计 | 24 原 PNG 哈希与尺寸、三尺寸行为与错误门槛、6 产品文件一致 | `root-review-pre-adapter.json`，原字节保留 |

专项测试包含：真实归位中的 `form=body` 仍使用所显示拾光；28 / 29 / 36 / 44 帧边界；成功及低能量失败的 E 反转；不可见双 E；暂停和减少动态；六章正常输入与 base 的逐步物理状态一致并实际完整 render；十个节庆绘制调用一致；null / 非有限输入 / 无效 context；Canvas 状态恢复；半途抛错不误当“没有画过”；同一对象引用、getter 计数、作用域重入与清理。

### 浏览器输入与原图

| 视口 | 实际输入 | Canvas 原尺寸 | 观察图中猫最左保守边界 | 归位 / 暂停 / 反转 / 减动 |
| --- | --- | --- | --- | --- |
| 1280 × 800 | 键盘 | 1280 × 677 | 8.46 px | 全部通过 |
| 390 × 844 | CDP 模拟触摸，设置使用原 UI | 390 × 595 | 6.18 px | 全部通过 |
| 320 × 680 | CDP 模拟触摸，设置使用原 UI | 320 × 431 | 4.98 px | 全部通过 |

上述是浏览器模拟视口与触摸输入，不是实体手机。使用 Chromium 140.0.7339.16、Playwright 1.55.0、device scale factor 1，仅访问两个 loopback HTTP 服务。没有改证书、忽略 TLS、修改存档、重写坐标、改变时钟或直接调用游戏动作。

每个尺寸都从新的浏览器 context 开始：原生 E / 按钮掀盖，正常方向输入收取第一张车票，飞到身体上方，原生归位；在真实归位中打开暂停菜单并确认时钟、视图及 Canvas 原始字节保持不变；继续后观察返回、眨眼、闭盖；再一次真实归位中用 E / 触摸反转；最后用游戏原设置开启减少动态并检查掀盖和归位。结尾仍是同一 run、身体仍在原位、只收取车票、零谜灯、零死亡，存档没有章节结算或新增 run。

`browser/320`、`browser/390`、`browser/1280` 各保留 8 张未改动 PNG：

- `before-neutral.png`、`after-neutral.png`：旧基线和新实现的原尺寸整页画面。
- `watching-up.png`、`returned.png`、`reduced-open.png`：实际操作后整页画面。
- `return-returning-canvas.png`、`return-arrival-blink-canvas.png`、`return-closed-canvas.png`：有限、只读 RAF 观察器锁存的当前 Canvas 原始像素，没有强制 render。

旧 / 新图来自不同新 context，动画采样时刻不同，不能用于宣称逐像素严格 A/B。整页 PNG 前的状态读取与截图也不承诺同一帧。有限观察器最多保留 180 个样本、32 个可信原生事件，5.2 秒自动停止；最终报告记录原始状态和图片哈希。`verification.json` 列出 24 张 PNG 的尺寸、字节与 SHA-256。肉眼已查看三尺寸旧 / 新整页，以及 320 归位、眨眼、减少动态图；root 另行检视了 320 对照、390 眨眼和 1280 抬头原图。

猫的保守可见边界采用原坐标加左 −32、右 +30、上 −62、下 +9 世界单位，再应用原 camera / scale / viewport offset。左界包含尾巴控制点 −28 和 3.35 半描边；没有为了截图移动小猫或相机。

### 保留的失败与修正

第一次全测试为 76 / 77：旧 `cap-character-motion` 测试抓到了初稿重复求值，产生数值相同但对象不同的姿态。没有降低旧测试要求，改为当前帧作用域复用后通过。原失败日志保存在 `validation/npm-test.txt`。

浏览器驱动也保留了三次不成功尝试的摘要与原报告 SHA，见 `browser-driver-corrections.json`：第一轮旧驱动在预测 12px 释放边界与实际 12.000000000268px 浮点差之间停住；第二轮松键后立即再读的观察断言失败，精确失败速度未捕获，因此惯性时序仅为推断，随后增加原运动的 220ms 自然落定；第三轮 390 图像检查的预估边界过宽。只修改本轮观察脚本及真实输入目标，没有修改产品或旧公共 helper。最终三尺寸完整流程通过，不把前述失败覆盖成通过。

本轮未重跑旧长篇浏览器全套，未做六章完整浏览器通关、所有可选活动、公网 HTTPS、Safari、实体设备或性能基准。减少动态检查使用游戏内设置，没有调整操作系统媒体偏好。

## 精确增量与接入方式

**正式集成使用 `integration-verification.json` 和 `integration-delta.patch`。** 前者提供当前七个源文件的状态、字节数、SHA-256、Git blob SHA 和旧 blob，后者仅包含这些文件，不包含旧版本其他代码、文档或整树快照。较早的 `verification.json`、`code-delta.patch` 则是适配前的冻结预研快照，必须作为旧证据保留，不能替代当前增量：

| 文件 | 责任 |
| --- | --- |
| `dist/dream-companion-art.js` | 新纯绘制与只读视图，8,254 bytes |
| `dist/dream-engine.js` | 24 行帧作用域及子类绘制 hook |
| `dist/index.html`、`dist/dream.html`、`dist/survivor.html` | 现有生成器补新模块 import map，仍为 32.0.0 |
| `tests/companion-art-v33.test.mjs` | 八项专项逻辑、绘制与帧集成测试 |
| `scripts/browser_companion_v33.py` | 三尺寸定向本地真实输入验证 |

正式集成应将七文件增量与本目录证据应用到最新通过的 v32，再按正式版本重新生成 import map。证据记录的是本预研源文件哈希，不能自动当作后续新提交或公开 URL 的验收。

### 可由正式验收调用的接口

当前已提供 `exercise_companion(browser, args, output, api)`。调用方传入现有浏览器、包含 `url` 与明确 `version` 的参数对象，以及现有原始输入 helper API。模块被导入时不加载 `browser-smoke.py`；只有 `__main__` CLI 路径加载该 driver。函数只释放自己新建的 contexts，不关闭调用者浏览器，也不执行旧长篇主流程。

默认只加载 `args.url`，一次跑 1280 / 390 / 320 三尺寸。`args.version` 必须显式存在，每个实际状态的网页 meta 版本都严格相等，不因未来版本是 33 而复用固定的 32。保留原生输入、真实归位 / 暂停 / E 反转 / 减少动态、同一 run 与原身体位置、无章节结算、零死亡和零页面 / HTTP / 请求错误门槛。失败会保存独立报告并抛出异常；成功返回紧凑 summary，其中 `details` 为 `companion/report.json`，含报告 SHA、源码 SHA、各尺寸结果与耗时。

未来 root 可在正式 `browser-smoke.py` 末尾的版本门槛 `>= 33` 内，沿用当前对白矩阵的错误处理方式接入：

```python
from browser_companion_v33 import exercise_companion
report['independentCompanion'] = await exercise_companion(b, args, output, __main__)
```

本工作树没有修改 `browser-smoke.py` 或发布 workflow。正式验收无需重建旧站。只有本地需要旧图对照时，设置可选 `args.companion_baseline`；CLI 的 `--baseline` 映射到该字段，并限制旧 URL 为 localhost / 127.0.0.1。不能把同一个新 URL 作为“旧基线”。CLI 现示例为 `python scripts/browser_companion_v33.py --url http://127.0.0.1:9333/ --version 32.0.0 --output /tmp/companion-check`。

适配只跑了一次当前 32 的局部调用：三尺寸 32.371 秒全部通过，不加载旧站。调用层还确认导入未载入 smoke、调用者 browser 返回后仍开放、自建 contexts 全部关闭；用该次实际浏览器读取的 32 状态检查 expected 33，会被严格拒绝。可复核 `adapter/caller-contract.json` 与 `validation/call-adapter.py`。它不是正式 33、全剧情或实体硬件通过，未来仍需对真正的新提交与站点执行验收。

### 原证据与适配证据的哈希边界

| 证据 | 对应 driver SHA-256 | 报告 SHA-256 |
| --- | --- | --- |
| 冻结预研，含旧 / 新原图 | `49a8230bc798dbd83db78e48f4913cf946275122d29da941a3933bc8b93ce866` | `623d522712b87735a93cbb700fd6179ebe10bbc451bddb899caf0299e4a6ea58` |
| 适配后当前 URL 直接调用 | `42b65bd9fdd0e4ad48002ddfd2b13f92ae4e461eb8a45414d519103db0ce4912` | `e69b59fd62e5830f55460b7dc608859448ec5807c16566b49110aa3ea28970eb` |

旧脚本原字节另存于 `snapshots/browser_companion_v33.pre-adapter.py`。两个报告的产品文件哈希完全相同；只读脚本不同。root 审计文件 SHA-256 为 `27a05e692646c3c9dddc84ea7821464a162587d886203464cdaee902cff65048`，只对应冻结预研。适配后 21 张原 PNG 位于 `adapter/companion/{1280,390,320}`，没有旧版对照图；与前 24 张原图分开保存。

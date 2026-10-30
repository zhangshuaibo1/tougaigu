# v31「眼窝里的笑」正式第二候选：原始报告与独立审计

**本归档证明正式候选通过，不是 v31 已经上线的证明。** 对应源码 `7ba7c5e00a6a32032e5becf5131a527322d03ac3`，分支 `iteration-v31-face-20261029`，GitHub Actions [40965474140](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40965474140) 于 2026-10-29 22:36:48 UTC 完成且为 success。此次 `Test public deployment` 步骤 skipped，无 live 报告。整理归档时官网仍为已完成验收的 v30.0.0；Pages 引用和完整 HTTPS 验收仍待 root 完成。

## 准确来源与无损保存

- 官方 artifact `12937168667`：208,201,793 字节，SHA-256 `8b5ce12098f05f60f06f628fa8482a03c1cd7134664692c9a5d606fdf16979b4`。完整下载与官方 digest 对齐；可信审计逐一核对 **796 个源码 blob、238 项安全 artifact 路径**，未执行 artifact 内程序。
- **675/675** 测试通过，失败、跳过、取消、todo 均为 0。检查为 68 个 JavaScript 模块、171 个本地引用、232 个 31.0.0 版本引用；三份入口的 importmap 各含 68 个模块，这是两个不同计数。
- [candidate-report.json.gz](candidate-report.json.gz) 保存 `candidate/report.json` 的全部原始字节，原报告 14,584,018 字节、SHA-256 `cf493719a6e37974e839ef50aea9396cca5fd0508e37b581eb6029ae6762efff`。没有删减或重序列化；gzip 采用空 filename、mtime=0，解压逐字节相等，重复压缩字节一致。压缩与解压哈希见 [manifest](manifest.json)。
- [audit-compact.json](audit-compact.json) 完整保留 796 项源码、238 项 ZIP 路径及 38 项即时证据清单；只省略各 viewport 摘要中重复的 post/endings 大对象。所有细节保留在原始 gzip 报告。
- [official-metadata.json](official-metadata.json) 保存官方 run/job/artifact 元数据，不包含签名下载 URL。[independent-candidate-review.json](independent-candidate-review.json)、[face-evidence-summary.json](face-evidence-summary.json) 和 [inherited-gates-summary.json](inherited-gates-summary.json) 是独立重新求值的结果；原审计中的临时绝对路径保留为检查当时的来源，不要求这些临时文件永远存在。
- [audit-adaptation.json](audit-adaptation.json) 记录可信审计器适配前后哈希。只更换准确 commit/run/artifact/目录/796 源码数量及正式候选范围说明；纯验证函数从准确主 Git 源读取，不执行工件程序，不放宽语义门槛。

## 首次失败与本次修正

第一正式候选 `05adb5da528dd449b85c7874313ac45262908921`，run [40963548412](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40963548412) failure：逻辑测试及资源检查通过，320 px 路线在原蘑菇成功上弹、单次连续右触、原树根 y390 落稳之后，最终摆锤尚未冻结时的身体安全靠近触发原 `x<2120 && deaths===0` 断言。旧日志没有保存该次 safe 的实际位置或死亡值，不能推断为已经证实某个具体超界值或受伤原因。失败 artifact `12938285523` 为 194,231,490 字节、SHA-256 `3f1cabb7fa3597fac17cb6873453b499bdadfe29cfc78174b5336f62eb15ba65`；public 步骤 skipped。

第二候选只将普通 `drive_to` 的目标 2110 提前为 2050，保留 `x<2120` 和零死亡，并增加 `x>=2000`、同 run/body/chapter/mode/state/form 及失败诊断。2050 是驾驶目标，不是保存报告中的实际停车位置。其后的开盖、第二盏灯、原冻结/归位/出口与结局/网络条件保持。相对 `0990533122f42a9bc22fc98282ab5f6ddc49f672`，`dist/`、`package.json`、`tests/`、`.github/` 全部原字节一致；没有改物理或放宽断言。

## 实际重新验证范围

| 范围 | 本次真实结果 | 解释边界 |
| --- | --- | --- |
| 表情 | 10 检查点、5 观察器、11 张原始 Canvas，973 次快照出现记录重新求值，5 次最终清理全部完成 | 记录可能重复，不等于独立 RAF 帧；六章动作快照不能代替六章表情覆盖 |
| 自然疲劳 | 首次身体 tired 在 16,354.2 ms、能量 19.948333333331142，共同截止 21,000 ms；归体恢复 neutral 为 24.1183333333312 | 本次身体疲劳是 soul / capPhase=open；闭盖疲劳只有早期离线证据 |
| 真实成功时限 | 320 收票闭盖 joy 尚余 0.75 秒，390 尚余 0.6 秒；桌面首次点灯闭盖 joy 尚余约 1.267 秒 | 没有重设票 2.3 秒或灯 2 秒事件 |
| 继承动作 | 1,100 次姿态快照记录重新验证，实际支撑脚底误差最大 0；三组原严格 v29 单跳采样定义完全一致 | 温室新单跳落到 y445；海岸入口 pause:null，不冒充旧 y385 或空中暂停 |
| 纵书 | 390 正常动画、320 减动均完整升降周期，无相对滑移 | 桌面为短段承载；整姿态/Canvas 暂停仅桌面 book-a |
| 第六章 | 桌面、390、320、主图失败共四条完整路线全部零死亡；原同体连续蘑菇、树根 y390、双灯及冻结后的原身体出口通过 | 手机为 Chromium CDP 模拟触摸；额外入口单跳/暂停仅正常桌面 |
| 结局与资源 | 6 份手机结局阅读、4 组真实选择+重载、26 份即时 JSON 与完整报告对齐；旧触摸隔离/新触摸打开尾声、迟到资源隔离通过 | 390 无需滚动；320 每个结局一次真实模拟滚动 |
| 最终网络 | 三视口实际 31.0.0；page/HTTP errors 为 0，最终图片完成；故意 requestfailed 精确 9 / 0 / 0 | 桌面的 9 项是严格注入清单，不应描述成零网络失败 |

## 原尺寸图审

下列四张文件均为官方 artifact 的原始当前 Canvas PNG，未裁剪、缩放、重绘或合成，独立审阅者已实际打开。其 SHA、原始尺寸和来源路径写入 manifest；其余 7 张已核对哈希的 Canvas 没有重复归档，也不声称都已逐张目视审阅。

| 真实时刻 | 原始图 | 观察 |
| --- | --- | --- |
| 320 收票后回盖 | [closedJoy](320-face-ticket-closedJoy.png) | 闭盖笑眼与笑口可辨，身体和伙伴保持清楚 |
| 320 收票自由态 | [freeJoy](320-face-ticket-freeJoy.png) | 离体拾光喜悦与开盖身体同时可见 |
| 320 自然低能量 | [bodyTiredOpen](1280-face-fatigue-bodyTiredOpen-320.png) | 疲劳脸与离体拾光可见；左侧抬起的盖子配件受既有镜头边缘裁切，不能声称整个角色无裁切 |
| 桌面首次点灯归体 | [lamp closedJoy](1280-first-lamp-face-lamp-closedJoy.png) | 闭盖喜悦、实际点亮的诗灯与原支撑平台可见 |

## 发布仍需完成

由 root 在刷新远端 main、gh-pages 和在途状态后，以最新 main 为第一父、准确 7ba 为额外父保留历史，完整继承 main 新增 v30 审计。只有同字节 Pages 部署和正式域名完整 HTTPS 回归通过，才能标 v31 正式发布。预创建但未引用的 Pages tree 不算发布结果。此次没有实体手机、Safari、低端 GPU 或帧率基准证据。

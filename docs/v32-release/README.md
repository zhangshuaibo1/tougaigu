# v32 发布：给对白留一点空地

**2026-10-30 UTC，v32 发布与完整公网验收已闭环。** 正式候选、原始产物审计、准确 Pages 部署、五项实际资源核对，以及 main `93655a7013adb3ecd41f7e1fac6935f7b5464539` 的完整候选／真实 HTTPS 游戏回归均已完成。[最终40984854669](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40984854669) 成功，独立数据与原图审阅通过。本页是 v32 当次部署记录，不据此声明 [tougaigu.com](https://tougaigu.com/) 此后的当前版本。

桌面普通故事把对白放在左侧，目标与公告放在右侧，保留原头像、文字和输入控件；低于900px的布局保持原组织方式。剧情、原3800／5800ms对白寿命、物理、存档、奖励与特殊活动规则保持。

| 项目 | 准确结果 |
|---|---|
| 已验候选 | `ce412d1298d0060dec08893f9b44cead9693edcf`；[40982421518](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40982421518) 成功 |
| 独立候选审计 | 913源码、143运行文件、完整报告／原图精确；683/683；旧严格玩法和网络清单保持 |
| Pages | `91ccef79541f2dd061059462c10d60cbecbed144`；tree `321e762d63088910a73b60a9b3cc7fb5344e8f9d` |
| Pages运行 | [40984296820](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40984296820) success |
| 部署文件 | 143个准确运行文件，另加空`.nojekyll`；CNAME单行tougaigu.com |
| 实际HTTPS资源 | 2026-10-30 01:12:16 UTC，index、dream、survivor及两份新样式均200并逐字节匹配候选 |
| 完整 main | `93655a7013adb3ecd41f7e1fac6935f7b5464539`；tree `3d5e268bbb8bef91b289097cf34f5012bbc08cd3`；[40984854669](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40984854669) success |
| 完整候选浏览器 | 2026-10-30 01:17:09—01:28:17 UTC，成功 |
| 完整正式 HTTPS | 2026-10-30 01:28:17—01:39:31 UTC，真实官网完整路线成功；不是五资源检查的替代推断 |
| main 原始产物审计 | 683/683；950 源文件内容／执行权限匹配；143 运行文件与候选／Pages 精确一致，public-index.html 与 main 原文件字节相同 |
| 完整玩法与布局 | 每套三视口、原六章／动作／邮局／结局／重载／故障隔离门槛和六对白配置均通过；网络 9／0／0 逐项精确，额外网络／页面／HTTP 错误 0 |
| 官方 artifact | `12948000217`，373,521,741 字节；SHA-256 `0dae5b5511f491f142b6a1effb6684ca10489ea4196e28aa05a73d267b9fa427` |
| 最终原图与证据 | 542 个唯一载荷、411 张 PNG 尺寸／哈希核验，人工检查其中 9 张；精简包 53 文件、13,221,720 字节 |

原始 [Pages回执](pages-publication.json)、[五资源核对](five-https-resources.json)、[官方候选原报告与审计](../v32-formal-candidate/second/README.md) 均保留。最终 [main／公网证据包](../v32-main-release/README.md)、[独立审计](../v32-main-release/independent-main-review.json)、[清单](../v32-main-release/manifest.json) 和 [root 交接复验](main-root-transfer-check.json) 已保存。清单 SHA-256 为 `f3fed38adbde98e02abcbdb4c1ebd2a936781aa078c78297c5520f92c3c83571`；复制后全部文件、13 个 gzip 与两套共 118 个即时 JSON tar 成员再次核验通过。

## 实际对白状态与图片时间

较早 ce412 候选的温室归位与越根两个读取分别出现对白和公告，不构成同帧共存证据；其实际共存来自三个首站 opening。该历史结果不被后来的 main 结果覆盖或改写。

本次 main 的 candidate 和 public 归位布局快照均为对白可见、公告不可见。candidate 越根快照的对白年龄约 3802.1ms，已自然消失；public 越根几何快照在约 3765.4ms 时对白和暖灯公告均可见。**public 后拍原 PNG 中对白已隐藏，因此该图片不能称作同帧共存图。** 两套首站各有三个同步 DOM opening 快照记录公告与对白共存；六配置的旧 CSS 消融仍只对照当前 DOM，不是完整旧版本运行。

面部观察器的原图数量在 candidate 为 11，在 public 为 12：公网多出原观察器合法第一灯 freeJoy，image／latch 同 sequence 6，原必需 11 张与原验证器全部保留。审计数量按实际读取，原始数据没有修改，详见 [数量说明](../v32-main-release/face-png-count-note.json)。

## 历史与边界

01:12:16 的五资源核对完成时，完整 main／HTTPS 回归仍待执行；当时要求保持 v32 至完整回归与产物审计结束，这一约束已在最终 run40984854669 满足。第一次正式候选失败及新增对白采样位置的有证据修正，见 [首次失败](../v32-formal-candidate/first-failure/README.md)、[定向修正](../v32-formal-candidate/timing-correction/README.md) 和 [QA](../QA-v32.md)。所有原失败、日志及较早本地证据继续保留。

没有实体手机、Safari、低端 GPU 或 FPS 结论；面部事件和开盖疲劳不扩大为全六章／所有服装面部覆盖。v31 已知 320px 抬盖配件左缘裁切不在本次对白改动的解决范围。

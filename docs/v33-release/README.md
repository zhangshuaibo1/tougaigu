# v33 发布：小旅伴·抬头等你

**v33当次发布与正式main验收已全部闭环。** [tougaigu.com](https://tougaigu.com/) 当次发布为 Pages `d997c58b2a846b2673b8baec500db9697a846d7a`；正式main `be05769a99a807f9396c03084760f8283ce4195e` 的 [40988381550](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40988381550) 于2026-10-30完成完整候选、真实HTTPS与独立原产物审计。本页记录v33的发布历史，不声明后续迭代的当前官网版本。

## 最终main与公网验收

| 项目 | 最终准确结果 |
|---|---|
| main tree | `5516892f4242d34b052630b5274641d3f8f27a91`；父提交为93655a7与1d63072 |
| 源码与部署 | 1138源码的Git内容及执行权限全匹配，257受保护文件精确等于已验候选；144运行文件精确匹配当次Pages，实际public HTML与main/dist/index.html逐字节一致 |
| 测试保留 | 691/691通过、77测试文件；原675／683名称、旧74／76测试文件与夹具按核验要求保留 |
| 完整候选步骤 | 2026-10-30 01:53:20—02:06:27 UTC，成功 |
| 完整真实HTTPS步骤 | 2026-10-30 02:06:27—02:19:36 UTC，成功；URL为 `https://tougaigu.com/?qa=be05769a99a807f9396c03084760f8283ce4195e` |
| 旧门槛 | 两套各原6跳跃、4完整书本周期、4邮局路线、6手机结局阅读、4桌面结局／重载及迟到资源隔离通过；严格网络9/0/0，无额外网络／页面／HTTP错误 |
| 对白 | 两套各6配置、12即时JSON／12原PNG，成对Canvas／控件矩形最大差0px；温室归位有对白无公告、越根无对白有公告 |
| 本main小猫 | 两套各3配置、474次快照记录、21张原PNG；候选32.495413248秒，公网33.058711260秒 |
| 本main面部 | 两套实际各11张，全部原必需11名保留；可选第一灯freeJoy均未锁存 |
| 官方artifact | 12948817989，448,421,971字节，585唯一ZIP载荷；452原PNG逐尺寸／哈希核验，10张人工原图保留 |

官方ZIP SHA-256：`dc03f41dd76a4d2c415d3de74433dd53181132a683377f357242a8ee16d723c8`。

[最终完整证据](../v33-main-release/README.md)、[独立审阅](../v33-main-release/independent-main-review.json)、[manifest](../v33-main-release/manifest.json) 保留两份完整主报告、两份六配置对白报告、两份三配置小猫报告和原日志。包共60文件、11,645,945字节；15 gzip及118原即时JSON成员全部无损复核。manifest SHA-256为 `5920973f36dc307d3b345f5d038c45d67f8d70963ad6394be6ec4b96c8ab022b`，审阅SHA-256为 `1dece2c33413890c0c775752f7083431a84c3f5947f90ac41ac7c9e85708ee3b`。

[公网小猫抬头原图](../v33-main-release/png/live/companion/1280/watching-up.png) · [320px公网眨眼原Canvas](../v33-main-release/png/live/companion/320/return-arrival-blink-canvas.png) · [公网自然对白原图](../v33-main-release/png/live/1280-greenhouse-leaves-returned.png)

较早独立候选1d63072的996源码、472次小猫记录和12张面部图保留在下方历史与 [候选原归档](../v33-formal-candidate/official/README.md)，没有替换成本main数据。该候选多出的合法第一灯freeJoy曾导致汇总器固定11张的假设失败，仅修正审计元数据；本main两套11张均按实际原记录通过，没有新的固定12张失败，更未修改原face校验器或旧阈值。

完整公网通过才满足当次发布门槛；七资源检查与候选成功仍分别记账。小猫专项是首站新上下文，六章故事覆盖来自原完整路线；全页PNG晚于DOM读取，归位Canvas则是被动RAF原锁存。JSON记录坐标与run、不证明对象引用；暂停原像素对未留存，证据为成功原断言及冻结状态。实体手机、Safari、性能和全部服装／活动不扩大为已验，已有窄屏配件裁切不由v33宣称修复。

## main发布时的阶段记录（历史原文）

> 以下正文完整保留自main `be05769a99a807f9396c03084760f8283ce4195e`。其中“待本main”“仍须等待”等语句描述当时的阶段；它们已由本页上方run 40988381550的最终验收关闭。较早候选、本地预研和失败记录继续保持各自原始数值与范围。

**33.0.0 已部署到 [tougaigu.com](https://tougaigu.com/)，正式候选与独立产物审计通过，七项实际 HTTPS 资源逐字节一致。完整 main 候选＋公网游戏回归由本主分支提交触发，仍须等待该轮实际结果。**

苔绿色小猫增加口鼻、耳内、双爪和尾缘的细节。它看向本帧实际显示的拾光，在拾光返回头盖时继续跟随目光，并在原归位末段轻轻眨眼。原身体、拾光和小猫的世界位置、跟随模拟、碰撞、能量、存档与奖励保持；新增表现读取原阶段与时间，减少动态沿用静态呈现。

| 项目 | 准确结果 |
|---|---|
| 已验候选 | `1d63072bb9a27690ed14b15d3103c6e8a87fa297`；[40984114609](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40984114609) 成功 |
| 候选原产物 | 996源码及权限精确，144运行文件、257受保护源码；691/691测试，原683名称与76测试文件保留 |
| 完整候选浏览器 | 790秒，原六章／手机／邮局／结局／故障与重载流程、六配置对白均通过 |
| 小旅伴专项 | 32.595662565秒，1280键盘与390/320模拟触摸；472次快照记录、21张原PNG核验 |
| Pages提交 | `d997c58b2a846b2673b8baec500db9697a846d7a`；tree `ef9072b947447304f4561855a8db58fb7fc42211` |
| Pages部署 | [40987732103](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40987732103)，success |
| 部署文件 | 144个准确运行文件，另加空`.nojekyll`；CNAME保持单行tougaigu.com |
| 实际HTTPS资源 | 2026-10-30 01:46:30.860 UTC，首页、dream、survivor、新小猫模块、engine及两份样式均200且逐字节匹配候选 |
| 完整正式HTTPS | 待本main提交的完整工作流；资源精确检查不替代游戏全流程 |

原始 [Pages回执](pages-publication.json)、[Pages工作流](pages-run.json)、[七资源核验](seven-https-resources.json) 和 [正式候选报告／原图](../v33-formal-candidate/official/README.md) 已归档。原base引擎在本33中保持原字节，body/shown同帧引用身份由原单元测试验证。

本次发布从最新v32 main `93655a7`继承完整历史，保留其 [候选及真实HTTPS最终证据](../v32-main-release/README.md)，只合入已验v33源码与对应证据。没有用较早候选整树覆盖后来的32记录。

候选的小猫专项只新增三个首站上下文；完整故事覆盖来自之前的原路线。它不新增实体手机、Safari、低端GPU、FPS或全部服饰组合的证明。320px抬盖服饰裁切由独立v34预研处理，不属于本次已发布内容。

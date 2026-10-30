# v32 发布：给对白留一点空地

**32.0.0 已部署到 https://tougaigu.com/；完整 main／HTTPS 游戏回归待本主分支提交的实际工作流结果。** 正式候选、原始产物审计、Pages部署和五项实际资源核对已经完成，各步骤分别记账。

桌面普通故事把对白放在左侧，目标与公告放在右侧，保留原头像、文字和输入控件；低于900px的布局保持原组织方式。剧情、原3800／5800ms对白寿命、物理、存档、奖励与特殊活动规则保持。

| 项目 | 准确结果 |
|---|---|
| 已验候选 | `ce412d1298d0060dec08893f9b44cead9693edcf`；[40982421518](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40982421518) 成功 |
| 独立候选审计 | 913源码、143运行文件、完整报告／原图精确；683/683；旧严格玩法和网络清单保持 |
| Pages | `91ccef79541f2dd061059462c10d60cbecbed144`；tree `321e762d63088910a73b60a9b3cc7fb5344e8f9d` |
| Pages运行 | [40984296820](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40984296820) success |
| 部署文件 | 143个准确运行文件，另加空`.nojekyll`；CNAME单行tougaigu.com |
| 实际HTTPS资源 | 2026-10-30 01:12:16 UTC，index、dream、survivor及两份新样式均200并逐字节匹配候选 |
| 完整正式HTTPS | 待本main工作流实际完成；五资源检查不替代游戏回归 |

原始 [Pages回执](pages-publication.json)、[五资源核对](five-https-resources.json)、[官方候选原报告与审计](../v32-formal-candidate/second/README.md) 已保存。第一次正式候选失败及新增对白采样位置的有证据修正，见 [首次失败](../v32-formal-candidate/first-failure/README.md) 和 [QA](../QA-v32.md)。

候选温室归位与越根两个读取分别出现对白和公告，不构成同帧共存证据；同帧共存实际来自三个首站opening。图片与几何读取也不冒称同一帧。没有实体手机、Safari、低端GPU或FPS结论。

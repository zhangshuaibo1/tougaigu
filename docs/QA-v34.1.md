# v34.1.0 · 第一章「让想象露出脸」

## 发布接管与基线

2026-11-01 用户最新明确指令为“强制部署”。本前台据此接管此次发布，替代等待2026-10-30旧root独占回复；不声称旧会话自行释放。接管已登记到issue #3评论6556894662。保留已有提交和回退点，更新refs必须fresh-read、expected_sha、force=false。

基线main为80120918c124c657996e95f02a62324fdda63bf1，完整源码tree为75976340bfaca7a554df1d006f9dc3a81b92800a；基线Pages为0bccfbd293c57b69c4d28966b277c5e25a74c091。旧v34已通过Pages41181107775和main完整HTTPS41181161756，README及旧在途文档中的准备状态仅为历史，不是当前发布状态。

## 真实游戏变动

保留用户指定七文件候选的原始画师和六项新测试。原补丁SHA256为6ddb5c8515a0ad4715e81df03ad34140c9908f0442c9654e6cd6e69f85f1c890；候选ZIP为eebf4a4ae635caaa547c6de25f37c8bb25bb4731c5cf48dc84e0dee5730056f2。已对官方完整源码应用并通过708项测试。

本次发布采用小型生产适配层接入同一画师：原dream-engine.js逐字节保留为dream-engine-legacy.js（Git Blob 49baa14351da49a2deed0b842dfcdd113bfa3227），新dream-engine.js继承该完整引擎，仅覆盖三个绘制方法。实际dream-canvas自动启用第一章新面容、目光、眨眼、情绪和取代头骨盖的灵感彩带。绘制器仍严格限制story/chapterIndex=0。其余五章、十节日、旧游戏、原物理、输入、镜头、存档、奖励、选择和企业页脚保持原路径。没有将23文件候选串接进来。

这是原七文件候选的接入方式调整，不能声称整份发布与原七文件补丁逐字节相同；新画师与原六项测试保持原字节，新增三项适配契约测试锁定旧引擎字节、实际画布启用和所有模拟方法继承。三份HTML及package.json统一34.1.0并沿用原version-assets脚本。完整运行资源147项。

本次仅第一章实时游戏角色变化，不代表全游戏NPC、剧情肖像、文案、其他章节或所有概念设计已重制完成。

## 本轮实际验收

- 完整本地npm test：711/711，0失败、0跳过、0取消，24.546秒。
- npm run check：72 JavaScript模块、178本地引用、244版本引用全部通过。
- index.html与dream.html保持完全一致；CNAME保持tougaigu.com加换行。
- 原六章、手机、物理与网络测试门槛没有放宽。真实Chromium候选和新正式HTTPS结论须以本提交触发的原iteration-check.yml及artifact为准，本文不预先宣称成功。

## 原失败与发布边界

新建自修改候选构建workflow的请求被工具安全检查阻止，未创建该workflow/分支，已放弃该方案。本发布不新增或修改workflow，只提交游戏代码并使用原仓库CI。两次内容传输不匹配产生的无引用blob已排除，最终引用均核对实际Git Blob。原候选/历史测试失败保留，不追认成本轮通过。

候选浏览器通过后再安全合并main并同轮发布Pages；Pages从已验dist精确生成、补唯一空.nojekyll，保留CNAME。只有新Pages成功、main完整候选及公网成功、目标资源和原始证据审计完成后才可报告完整发布通过。状态与新run统一记录在https://github.com/zhangshuaibo1/tougaigu/issues/3，不拿旧v34成功记录替代新验收。

# 持续迭代记录

## 约定

用户授权持续设计、开发、部署、验证，直到明确要求停止。每轮从远端最新代码和验收记录接续，不依赖对话中的旧版本号。参考《马里奥》《愤怒的小鸟》《植物大战僵尸》的制作完成度，保留阿拾、拾光和原创世界身份。先把第一章做成可复用的可玩美术样板，不以概念图或文档代替代码。

## 当前检查点

- v14 功能：`44d7c0318d4bd28eded8282b3fb2d58fbc4e67b9`。
- v14 Pages：`91d28b263912476c3f86fedd08e1f7be363022b7`；工作流 `40768300471` 已核实 success。402 项基线已重新执行通过；历史公网验收补充见 `QA-v14-public.md`。
- v15：功能提交 `a73c459ae10e839b89bb71577f51d9ab527e4f93` 已进入main；发布提交 `34bc7cb41ce75046e9f9811dc513e4001d03bb0b`，Pages流程成功，108个部署文件与候选dist一致。411项回归与桌面/窄屏候选浏览器检查通过。发布后公网验证 `40796493364` 成功，三个视口版本均为15.0.0，桌面从起点完成第一章；原始数据摘要在 `verification-v15.json`，详见 `QA-v15.md`。
- v15 发布时未取得精绘位图，保留当时的真实验收记录。v16 已从原工作区恢复相同 SHA-256 的完整 PNG，连同 WebP 生产资源、提示、角色动作与材质完成整合。
- v16「灯下的邮差」已发布并完成本轮验收：运行时代码 [c6438b744da7f26f0fe8cd0f30a3eb93edf099de](https://github.com/zhangshuaibo1/tougaigu/commit/c6438b744da7f26f0fe8cd0f30a3eb93edf099de)，验收脚本修复 [9099206986d2e81d3e3e989998302fb50c694f5b](https://github.com/zhangshuaibo1/tougaigu/commit/9099206986d2e81d3e3e989998302fb50c694f5b)，Pages [d09c3009d996472d2979f697ae05bf5cfda300df](https://github.com/zhangshuaibo1/tougaigu/commit/d09c3009d996472d2979f697ae05bf5cfda300df)。111 个运行时文件与发布分支一致；[Pages 40798348886](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40798348886) 和 [验收 40798906987](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40798906987) 均 success。
- v16 逻辑与离线证据：439 项 / 36 个测试文件通过；44 个模块、124 个静态引用、158 个版本引用通过；73 项离线合成检查通过。CI 候选及公网均验证 1280×800 键盘整章通关、错误答案、票归位、暂停及重载存档；390×844、320×680 验证模拟触屏收票归位、暂停与无横向溢出。六个 case 版本均为 16.0.0、无页面或 HTTP 错误；窄屏未进行整章通关。原始报告为 [verification-v16-public.json](verification-v16-public.json)。
- v16 首次 CI [40798347185](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40798347185) 因只读坐标探针路由不匹配入口 `?v=16.0.0` 而失败；脚本修复后保留所有原验收断言，完整重跑通过。不要把首次失败记为通过，也不要移除版本映射来迁就测试。
- 已人工检查公开页面的 1920×824、390×844 和 320×680 Chrome 视口，中文与精绘正常，390px 绒绒两句对话可继续出发，旧档案保持。真实浏览器截图与范围见 [QA-v16.md](QA-v16.md)；尚无物理手机、Safari 或低端 GPU 性能结论。

## 最近完成：v17 倒流温室

功能代码 `80007d24052caf7114be8744f5d6bb796744a060`；发布 `fed37ac54e51cf4a25c3b57366502571610ef1b8`。462 项逻辑、156 项离线 Canvas、24 张离线画面通过；候选 [40813054860](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40813054860) 与公网 [40813319511](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40813319511) 均成功，桌面真实键盘完成第一二章，320/390px 仅第一章模拟触屏。见 [QA-v17](QA-v17.md)。

## 最新发布：v18 头顶的小信窗

源码 `ff385419e5f6a6927c1429c78aec191b2a0c6152`，Pages `88bdf804719c1a4d2a32f2c2d71a3b10aadf2677`；[Pages 40814084678](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40814084678) 成功，115 个 dist 文件与真正部署 artifact 逐字节一致，另有 `.nojekyll`。474 个 Node 用例、146 项信窗+归先生离线 Canvas 检查通过（54+92）。候选 [40813493108](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40813493108) 与公网 [40814043011](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40814043011) 成功：桌面按正常输入通关两个章节、寄出与保管分支演出、日记改选、暂停与重载；390px、320px 测第一章触摸交互。详见 [QA-v18](QA-v18.md)。

## 下一优先：v19

拾光、伙伴和影子的统一角色体积/动作，第三章光影与可玩机关；把第二章窄屏交互从第一章流程拓展为真实触摸路线。仅在 v18 已经完成公网验收后开始新版本，不改奖励与已有存档；实体设备和 Safari 性能仍需验证。

## 验收与发布规则

源码、测试和文档在 main；dist 内容进入 gh-pages 根目录，保留 `.nojekyll`。不重建项目、不改权限、不购置服务、不覆盖存档和企业页脚。独立工作区/分支开发；更新 ref 前读取并使用 expected_sha，出现并发变更先协调。

执行回归、资源/语法检查、整屏桌面与窄屏画面检查，修复失败后再发布。明确区分逻辑测试、离线 Canvas、离线 HTML 浏览器、HTTP 本地浏览器、公网浏览器和物理手机，不将任意一项冒充另一项。CI 只验证，不自动发布。截图、报告、限制和下一项写入 QA。

# QA-v28 · 黎明邮局·最后一封，一起送

**状态：已于2026-10-29完成候选、Pages和正式HTTPS验收。** 当前公开版本28.0.0，原游戏地址 [https://tougaigu.com/](https://tougaigu.com/) 保持不变。本报告区分逻辑/离线、候选浏览器、正式公网浏览器及尚未覆盖的实体设备。

## 交付的可玩增量

- 严格`mode==='story' && chapterIndex===5`接入归档原画`post-painted-v28.webp`，黎明前纸仓小镇、铜顶、雾蓝暮光与邮局投递入口；加载失败回退既有可玩程序邮局，前五章与节日不请求本章原画。
- 真实踏板与帘幕、`last-stage`浮书、蘑菇与根台、风廊、末段钟摆、两盏`others/self`灯、身体出口保留引擎几何与事件；新增材质贴合真实碰撞体。两处暖光独立读取本次`lit`，静态暖窗不冒充解谜进度。
- 阿拾、拾光与唯一归先生的邮局服饰、握信、头盖姿态精修。两灯后真实`recall()`让晨光沿原`getSoulPresentation()`归位轨迹落向头内信封；约0.48秒归到头顶、0.72秒合盖的原序不变。合法提前重新掀盖、抵达后重新掀盖、低能量拒绝、自动归位、暂停、减少动态、死亡/重新开始/销毁及出口优先均有隔离测试。
- 不引入新的按键、计分、奖励、物理、存档字段或通关强制等待；既有可选日出活动和三个结局映射保持独立。

## 提交、测试、发布

- 最终运行时与`main`源码：`9a44ee58fa7818b4160925ecec355a8dfb1e25ba`。
- [候选CI40889957819](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40889957819) **success**；[Pages40892127956](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40892127956) **success**；[main候选+正式HTTPS40892019044](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40892019044) **success**。
- **613/613项自动测试通过**。在CI原始source.tar.gz独立重跑`npm test`亦613/613；`npm run check`核验64个JS模块、163个本地引用、218个版本引用，0处缓存版本待更新。
- Pages提交`5ee995f46f6d7cd53f056d834789eb14c4bc6c02`。通过GitHub原生树递归审计，`main/dist`138个运行blob和`gh-pages`同路径内容SHA/文件模式完全相同；Pages仅额外`.nojekyll`。两份CNAME内容均严格为`tougaigu.com\n`，SHA相等；没有把文档、测试或凭据部署到Pages根目录。

## 实际浏览器与原始证据

读取成功主流程 artifact `12907255538`（[工作流](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40892019044)）：包含`candidate/report.json`、`live/report.json`、完整原尺寸PNG、测试日志和源码快照。候选为本地HTTP页面，正式为`https://tougaigu.com/?qa=9a44ee58fa7818b4160925ecec355a8dfb1e25ba`。报告里1280×800、390×844、320×680三种视口均实际返回**28.0.0**，全部页面脚本错误/HTTP错误为空、可见图片全部成功加载、无横向溢出。最终网络失败账单：桌面8项故意请求失败，`actual`与`expected`逐条精确一致；390/320均为0项。

桌面Chromium真实通过前章正常解锁第六章、邮局入口NPC普通逐页头像解码、踏板、浮书连续实际承载、蘑菇越根台、第一灯/第二灯、拾光双灯后实际归位及信封太阳印记、身体自然进入出口、终章三页来信逐页`complete/naturalWidth`检查、一次结算与一个真实结局。没有人为增加精确出口门槛或改写完成判定，零死亡、奖励发放不变。1280、390、320的完整页面图片均已实际审阅。

390与320通过Chromium CDP模拟触摸，在正常前章解锁后进入第六章，完成安全区域移动和掀盖/归位；**不是手机终章全浮书与钟摆通章，也不是实体手机测试**。浏览器强制第六章WebP失败时保留可玩程序背景、实际移动后重开图片恢复；**不是坏图条件下整关走通**。候选和公网的真正待测/完成范围不可互换。

RAF抽样是初始空闲60帧：桌面p95约16.7ms，手机两视口约16.8ms；不代表高压全程、物理iPhone或低端GPU帧率。没有Safari/实体Android设备实测。尚未逐一通过浏览器实际重选三个`letter/clock`组合结局并确认跨重载不重复奖励，因此不能把原有三个结局映射的逻辑测试描述成三个完整公网通关。

## 失败与修复记录

[候选40887849143](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40887849143) 为**failure**：第六章浮书观察开始时真实水平输入尚未制动完全，导致采样误失败。后续仅调整`scripts/browser_post_v28.py`的观测起点，等待真实控制制动而非放宽承载/漂移断言；最终`9a44ee58`候选、Pages及公网工作流都已success。保留这次失败，不当作功能初次验收通过。

## 下一轮优先级

按 [PLAN-v29](PLAN-v29.md) 优先补三个结局实际日记改选/重载/无重复奖励、手机第六章真实全路线与坏图整章路线，结合原尺寸截图精修终章来信/结局对比度、阿拾和拾光的表情与回合反馈。不得回退第三章单跳严格采样、原有头像慢加载与rapid-next/Escape精确请求核账，也不修改域名及存档规则。

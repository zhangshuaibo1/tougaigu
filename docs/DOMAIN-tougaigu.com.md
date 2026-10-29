# tougaigu.com 域名配置与验收

## 当前状态

**DNS与域名绑定已完成，HTTPS主域名已能正常打开25.0.0游戏，GitHub的Enforce HTTPS已开启并在刷新后确认保存。CI正式验收地址和README主链接也已切换；全部入口的最终HTTPS跳转和8项网络检查均已通过。首次完整公网回归在严格网络检查中发现头像请求取消，普通故事阅读测试的等待缺口已修复并提交，修复后的完整回归待验收。**

- 用户已告知在Spaceship购买`tougaigu.com`并要求绑定游戏。
- 现有仓库：`zhangshuaibo1/tougaigu`；现有托管为GitHub Pages，发布内容来自`gh-pages`根目录。
- 正式入口：`https://tougaigu.com/`；HTTPS版`www.tougaigu.com`已验证跳转至主域名。旧入口为`https://zhangshuaibo1.github.io/tougaigu/`。
- 本轮验收源码为`923facef7056c97b8eb0be0a7ab803363dfe5d5e`，已进入main并包含域名配置和本轮普通故事阅读测试修正。域名文件、发布约束、CI正式URL和README更新已在`03a46bc4fb2abd02399287307c089501f40e7c63`发布；初始绑定提交`b7fd2dc268a81bdf07a5fef689c989a5e45b77f0`和随后记录保留在历史中。
- Pages仍为`aae84037876d1f736c9430482703941d036a3574`，只新增根目录`CNAME`，原126个运行时blob未改；[Pages部署40856251385](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40856251385)成功。
- 首次新域名完整验证[40858951757](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40858951757)未通过：564项逻辑测试、资源检查和候选浏览器检查成功，公网步骤在末尾严格网络检查中发现额外的`portrait-keeper.svg`请求取消。修复提交`923facef7056c97b8eb0be0a7ab803363dfe5d5e`已进入main，新的完整回归待验收，不能将首轮或修复后结果称为全绿。

## 已完成的配置

### GitHub Pages

先通过代码提交手动添加发布分支根目录的`CNAME`，内容为单行`tougaigu.com`，同时在源码`dist/CNAME`保留同一内容。随后进入已登录的[仓库Pages设置](https://github.com/zhangshuaibo1/tougaigu/settings/pages)，实际确认Custom domain为`tougaigu.com`、DNS check successful、发布来源为`gh-pages`和`/ (root)`。

证书可用后，勾选Enforce HTTPS并刷新页面。刷新后的实际DOM显示`checked=true`、`disabled=false`，页面正式站点链接变为`https://tougaigu.com/`。[HTTPS设置截图](domain-tougaigu-https-settings.png)保留了域名、DNS成功提示和已勾选的开关，150187字节，SHA-256为`777297930df8666b16d5d89804d849402ebea43d2cd1347af11068efffff11d7`。此设置确认与下文公网重定向检测分别记录。

[GitHub官方CNAME排查说明](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/troubleshooting-custom-domains-and-github-pages#cname-errors)明确说明，从分支发布时，自定义域名存放在发布来源根目录的`CNAME`文件，可通过设置页面或手动更新。本项目继续使用`gh-pages`分支发布；官方文档中自定义Actions工作流不使用CNAME的说明不属于此次部署方式。

### Spaceship DNS

在[Spaceship域名列表](https://www.spaceship.com/zh/application/domain-list-application/)的该域名控制台实际保存以下五条记录，TTL均为30分钟。名称服务器为`launch1.spaceship.net`和`launch2.spaceship.net`。操作前界面显示空记录，本次未删除其他业务记录。

| 类型 | 名称 | 值 | TTL |
| --- | --- | --- | --- |
| A | `@` | `185.199.108.153` | 30分钟 |
| A | `@` | `185.199.109.153` | 30分钟 |
| A | `@` | `185.199.110.153` | 30分钟 |
| A | `@` | `185.199.111.153` | 30分钟 |
| CNAME | `www` | `zhangshuaibo1.github.io` | 30分钟 |

记录值与[GitHub自定义域名官方说明](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)一致；`www`指向GitHub账户主机名，不带协议或仓库路径。控制台操作参考[Spaceship DNS记录说明](https://www.spaceship.com/knowledgebase/dns-records-types/)。[控制台截图](domain-tougaigu-dns.png)已归档，105525字节，SHA-256为`c8a9e86cdd118fc3356312ca58892053cba9c7a520cbecade1647bcff65c966b`。

Cloudflare和Google公共DNS查询均已返回根域名全部四条正确A记录；Google公共DNS查询已返回`www.tougaigu.com`的正确CNAME。此记录描述已完成的查询，不推断所有地区缓存已经刷新。

## HTTPS与实际浏览器检查

2026-10-29最初绑定时，HTTPS命令行请求出现503连接错误，Chrome报告`ERR_CERT_COMMON_NAME_INVALID`；当时GitHub网页也未登录。这是已解除的历史阻碍。随后证书可用，命令行在正常证书校验下取得HTTPS首页200，实际Chrome也正常打开新域名，没有绕过证书警告或关闭证书校验。

新域名浏览器页面的版本元数据为25.0.0。通过真实按钮操作“掀开头盖骨”，HUD从“阿拾·身体”变为“拾光·灵魂”；点击“回到身体”后恢复阿拾。该次浏览器检查的console error/warn列表为空。检查范围是首页渲染与掀盖、归位交互，不替代下文的完整章节回归。[新域名游戏截图](domain-tougaigu-https-game.png)已实际保存，110429字节，SHA-256为`56920abf3151f81e3c0b103343d242e0d3e1049454dd23efc6ce9d10b8c9e4be`。

03:38:45–46（America/Los_Angeles）的独立网络检查使用新的无敏感查询参数，仍观察到部分HTTP和旧入口响应未升级至HTTPS，并带有`Age`响应头。这些早期缓存结果完整保留在[网络验收JSON](verification-domain-tougaigu-network.json)的历史attempt中。

03:42:45的最后一次原入口命令行复验全部通过：HTTP主域名301至HTTPS主域名、最终200；HTTP版www和旧GitHub入口仍有缓存的第一跳到HTTP主域名，但随后主域名301升级到HTTPS、最终200。所有最终HTML均为25.0.0且与源码逐字节一致，正常证书校验通过。该JSON的最新汇总为`allPassed: true`，8个检查通过并保留4轮历史attempt；文件36846字节，SHA-256为`9b5da4d89f167c8fa71e1ab1f9a32b2909299a1643d74b6176bf7db1549c0577`。

随后主会话在真实Chrome新标签页中依次导航`http://tougaigu.com/`、`http://www.tougaigu.com/`和`https://zhangshuaibo1.github.io/tougaigu/`，三者最终URL均为`https://tougaigu.com/`，游戏标题正确且没有证书警告。这证明这些浏览器导航已到达HTTPS目标，不单凭最终URL推断具体服务器301链。另对未使用过的`http://tougaigu.com/dream.html`路径进行独立网络检查，实际取得HTTP 301到HTTPS、HTTPS 200的两步响应，`Age=0`。

网络证据和两张HTTPS截图均已实际保存，域名入口和重定向验证已经完成；DNS配置和GitHub登录、HTTPS开关不再是用户待办。当前待完成的是测试修正提交`923facef7056c97b8eb0be0a7ab803363dfe5d5e`的新一轮完整回归验收。

## 完整公网回归与测试修正

首次主线工作流[40858951757](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40858951757)针对`03a46bc4fb2abd02399287307c089501f40e7c63`执行。564项逻辑测试、资源检查和候选浏览器检查通过，但公网步骤末尾的严格网络检查记录了额外的`portrait-keeper.svg`请求失败`net::ERR_ABORTED`，因此该工作流未通过。

源码审查确认，旧的普通三页故事收尾helper在点击“下一句”前没有等待当前头像ready和decode完成，存在测试过快翻页、取消仍在加载头像的窗口。该缺口与本次请求取消相符，是合理的原因推断；由于该次具体取消时刻没有事件追踪，不能把推断写成已证实的唯一原因。

已提交[测试修正923facef](https://github.com/zhangshuaibo1/tougaigu/commit/923facef7056c97b8eb0be0a7ab803363dfe5d5e)：`scripts/browser-smoke.py`的普通阅读流程逐页使用显式expected检查，等待当前说话者头像ready、实际decode与对应证据完成后再点击下一句，并核对准确页数。新增回归覆盖异步头像等待会阻止提前翻页、解码证据错误正常传播、页数不符被拒绝。

此修正保留rapid-next与Escape/reopen场景的精确请求失败规则，也保留严格traveler逐帧采样要求；没有扩大网络错误忽略范围。生产`dist/`、游戏版本和Pages发布内容均未改变。[首轮失败原始摘录与产物校验](verification-domain-first-ci-failure.json)保留失败列表、原日志栈、产物字节数和SHA-256，没有改写为成功。

修复后工作流[40860849477](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40860849477)正在对同一25.0.0版本进行候选和新域名完整验收。结果确认前，后续迭代可继续候选开发，但应保持Pages版本稳定，避免中途替换正在验收的公开游戏；先读取该工作流最终结果和本记录，再承接最新main发布。完整结果取得后更新此段。

## 后续发布必须保留

- `main`的`dist/CNAME`及`gh-pages`根目录的`CNAME`均为单行`tougaigu.com`，保留末尾换行。
- 每轮同步`dist/`时包含`CNAME`，同时保留`.nojekyll`；不切换托管服务，不覆盖正在进行的游戏候选。
- `.github/workflows/iteration-check.yml`正式公网验收地址已改为`https://tougaigu.com/?qa=$CHECK_SHA`并发布到main，原严格游戏门槛保持。
- 后续候选先合入最新main的域名文件、正式验收URL和文档，再发布游戏内容。不能用旧候选的整棵树覆盖这些配置，也不能把旧入口的重定向页当成游戏HTML通过验收。

## 实际验收记录

| 检查项 | 结果及证据 |
| --- | --- |
| 检查日期与时区 | 2026-10-29，America/Los_Angeles；精确时刻以主会话原始记录为准 |
| 本次验收源码与gh-pages SHA | 验收源码 `923facef7056c97b8eb0be0a7ab803363dfe5d5e`；gh-pages `aae84037876d1f736c9430482703941d036a3574`；修复仅涉及测试，生产dist未变 |
| Pages域名与发布来源 | 根目录CNAME已发布；已登录Settings确认`tougaigu.com`、DNS check successful和`gh-pages` / `/ (root)` |
| DNS服务商 / 名称服务器 | Spaceship；`launch1.spaceship.net`、`launch2.spaceship.net` |
| 根域名A记录 | 控制台已保存四条；Cloudflare和Google公共DNS均已返回全部四条正确地址 |
| `www` CNAME | 控制台已保存；Google公共DNS返回`zhangshuaibo1.github.io` |
| HTTPS主域名证书校验 | 已通过正常命令行校验，`ssl_verify_result=0`；Chrome实际打开成功，无证书警告 |
| Pages Enforce HTTPS | 已开启并reload确认`checked=true`、`disabled=false`；设置截图已保存 |
| HTTPS主域名首页状态码与实际版本 | `https://tougaigu.com/`返回200，25139字节，与`dist/index.html`逐字节一致，为25.0.0 |
| HTTPS首页SHA-256 | `b7401262acab8f93b3f4094829468ecb22ad1ea046b2c3cc2c2a8bab169e1c73` |
| JavaScript模块 | HTTPS取得`dream-app.js`，200、63772字节，与源码一致；SHA-256 `078cd17e6aaa6a194aa941c8d2b3823e3da73d669f80f4e027a0bcc2448f67a6` |
| 站台背景资源 | HTTPS取得`assets/station-painted-v16.webp`，200、266328字节，与源码一致；SHA-256 `51406de059d3d092b0bf7c8f80f285f82dcc7fb17bcfbd77b5fcd000bb888fba` |
| HTTPS版`www`跳转 | `https://www.tougaigu.com/`返回301至`https://tougaigu.com/`，最终200、正常证书校验通过 |
| HTTP主域名与HTTP版`www` | 03:42:45命令行最终复验及实际Chrome导航均到HTTPS主域名；HTTP根301→HTTPS 200，HTTP www先缓存301至HTTP根、再301至HTTPS 200；早期HTTP 200保留为历史 |
| 旧GitHub Pages入口响应 | 03:42:45命令行：旧入口缓存301至HTTP主域名，再301至HTTPS主域名、最终200；真实Chrome最终URL同样为HTTPS主域名，早期缓存响应保留 |
| HTTP新路径升级验证 | `http://tougaigu.com/dream.html`实际取得HTTP 301到HTTPS、最终HTTPS 200的两步响应，`Age=0` |
| 实际浏览器交互 | Chrome新HTTPS域名25.0.0正常渲染；真实掀盖与归位按钮及HUD变化已验证，console error/warn为空 |
| 源码与发布目录CNAME一致 | 两处均为单行`tougaigu.com`；Pages原126个运行时blob未改 |
| Pages工作流 | [40856251385](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40856251385) success；这是域名文件发布结果 |
| 首次新域名完整公网回归 | [40858951757](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40858951757)未通过；564项逻辑、资源和候选浏览器成功，公网末尾严格网络检查发现额外`portrait-keeper.svg`的`net::ERR_ABORTED` |
| 普通故事阅读测试修正 | [923facef](https://github.com/zhangshuaibo1/tougaigu/commit/923facef7056c97b8eb0be0a7ab803363dfe5d5e)已提交main；逐页expected、ready/decode等待及证据、准确页数回归，严格网络与traveler规则保持 |
| 修复后完整公网回归 | [40860849477](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40860849477)运行中；最终结果待验收 |
| 当前浏览器存档导出 | 上一轮正常导出按钮均显示成功：故事页面0/6、生存页面0骨片，导出时保留原页。下载文件未读取核验，未在新域名导入，也未检查其他浏览器或设备 |

旅途导出覆盖故事、画册、借景、失物、节日及奖励；生存成长需在原《再活一局》中另行导出。以上仅记录当前浏览器的UI导出结果，不声称用户所有设备的存档已经迁移。

版本号、DNS缓存刷新、证书签发及存档迁移应分别记录；本次绑定不更改游戏存档格式、奖励和玩法。

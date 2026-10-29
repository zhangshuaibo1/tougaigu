# tougaigu.com 域名配置与验收

## 2026-10-29 HTTPS公网门禁补查

[main工作流40858951757](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40858951757)已通过 `curl -fsS https://tougaigu.com/` 和页面版本匹配，Chromium亦成功访问该HTTPS站点并运行剧情；这证明CI执行环境当时可经正常TLS访问，不等于GitHub Settings内的Enforce HTTPS已确认启用。该轮**没有通过完整公网游戏验收**：测试报告了已过时的归先生头像请求 `net::ERR_ABORTED`，资源失败分类严格检查因此失败。另两次 `portrait-hero-curious.svg`取消属于已有的受控竞态，剧场三次 `ERR_FAILED`为故意模拟素材故障。修复应让正常读页等待当前头像真正解码，不能全局忽略网络错误；仍需严格复验并核查Settings中的证书与Enforce HTTPS实际状态。以下原始域名配置/证据保留不删。

## 当前状态

**DNS记录已保存，GitHub Pages的域名文件已发布，HTTP首页已返回正确的25.0.0游戏。HTTPS尚未通过：浏览器报告证书域名不匹配，需登录GitHub继续检查证书和Enforce HTTPS。**

- 用户已告知在Spaceship购买`tougaigu.com`并要求绑定游戏。
- 现有仓库：`zhangshuaibo1/tougaigu`；现有托管为GitHub Pages，发布内容来自`gh-pages`根目录。
- 目标正式入口：`https://tougaigu.com/`，HTTPS待验收；已验证的HTTP入口为`http://tougaigu.com/`。旧入口为`https://zhangshuaibo1.github.io/tougaigu/`。
- 绑定提交：main `b7fd2dc268a81bdf07a5fef689c989a5e45b77f0`包含`dist/CNAME`、当时的待验收域名文档和迭代约束；Pages `aae84037876d1f736c9430482703941d036a3574`只新增根目录`CNAME`，原126个运行时blob未改。
- [Pages部署40856251385](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40856251385)成功。将CI正式地址和README主链接改为HTTPS新域名的补丁尚未发布，等待证书实际可用。

## 已完成的配置

### GitHub Pages

本次通过代码提交手动添加发布分支根目录的`CNAME`，内容为单行`tougaigu.com`，同时在源码`dist/CNAME`保留同一内容。没有登录GitHub Settings操作或声称已启用Enforce HTTPS。

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

## HTTPS与剩余步骤

本次HTTPS命令行请求出现503连接错误，实际Chrome打开`https://tougaigu.com/`报告`ERR_CERT_COMMON_NAME_INVALID`。没有绕过证书警告，也没有关闭证书校验。GitHub网页当前未登录，尚未查看Pages证书详情或勾选Enforce HTTPS。

1. 用户在当前浏览器登录GitHub后，打开[仓库Pages设置](https://github.com/zhangshuaibo1/tougaigu/settings/pages)，检查Custom domain是否为`tougaigu.com`、DNS检查和证书签发状态，保留`gh-pages`发布来源。
2. 证书可用后启用Enforce HTTPS，重新验证主域名、`www`和旧GitHub Pages入口的实际HTTPS结果。按[官方HTTPS排查说明](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/troubleshooting-custom-domains-and-github-pages#https-errors)处理实际出现的问题；不把等待时间推定为已签发成功。
3. HTTPS实际可用后，提交已准备的CI正式URL和README主链接补丁，并在新域名运行原严格公网游戏验收。
4. 确认备份文件可用后，在新域名正常导入。浏览器按域名隔离存储，新入口不会自动读取旧域名进度；导入沿用游戏现有确认流程。

## 后续发布必须保留

- `main`的`dist/CNAME`及`gh-pages`根目录的`CNAME`均为单行`tougaigu.com`，保留末尾换行。
- 每轮同步`dist/`时包含`CNAME`，同时保留`.nojekyll`；不切换托管服务，不覆盖正在进行的游戏候选。
- 已准备将`.github/workflows/iteration-check.yml`正式公网验收地址改为`https://tougaigu.com/?qa=$CHECK_SHA`；当前尚未发布该补丁，原严格游戏门槛保持。
- 新域名DNS和HTTPS实际可用后，才提交以其为正式验收地址的配置。旧入口当前已经重定向，旧CI的`curl -fsS`不跟随跳转，不能把重定向页当作游戏HTML通过验收。后续发布先承接域名配置与验收URL更新，再进行完整公网验证。

## 实际验收记录

| 检查项 | 结果及证据 |
| --- | --- |
| 检查日期与时区 | 2026-10-29，America/Los_Angeles；精确时刻以主会话原始记录为准 |
| 本次绑定main与gh-pages SHA | main `b7fd2dc268a81bdf07a5fef689c989a5e45b77f0`；gh-pages `aae84037876d1f736c9430482703941d036a3574` |
| Pages域名文件 | 手动提交根目录CNAME；HTTP主域名返回游戏、旧入口已跳转。Settings内字段尚未登录核查 |
| DNS服务商 / 名称服务器 | Spaceship；`launch1.spaceship.net`、`launch2.spaceship.net` |
| 根域名A记录 | 控制台已保存四条；Cloudflare和Google公共DNS均已返回全部四条正确地址 |
| `www` CNAME | 控制台已保存；Google公共DNS返回`zhangshuaibo1.github.io` |
| HTTPS证书有效且包含主域名 | 未通过；Chrome为`ERR_CERT_COMMON_NAME_INVALID`，命令行HTTPS请求503连接错误 |
| Pages Enforce HTTPS | 未操作、未验证；GitHub网页需用户登录 |
| 主域名首页状态码与实际版本 | `http://tougaigu.com/`返回200，HTML与本地`dist/index.html`逐字节一致，为25.0.0 |
| HTTP首页SHA-256 | `b7401262acab8f93b3f4094829468ecb22ad1ea046b2c3cc2c2a8bab169e1c73` |
| JavaScript模块与背景资源 | 待验证 |
| `www`最终地址与HTTPS | `http://www.tougaigu.com/`返回301，Location为`http://tougaigu.com/`；HTTPS仍待证书可用后验证 |
| 旧GitHub Pages入口响应 | `https://zhangshuaibo1.github.io/tougaigu/`返回301，Location为`http://tougaigu.com/`；HTTPS目标跳转仍待证书可用后复验 |
| 源码与发布目录CNAME一致 | 两处均为单行`tougaigu.com`；Pages原126个运行时blob未改 |
| Pages工作流 | [40856251385](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40856251385) success；这是域名文件发布结果 |
| 新域名完整公网游戏验收 | 尚未完成；HTTP首页一致不替代完整通关、资源和HTTPS验收 |
| 当前浏览器存档导出 | 正常导出按钮均显示成功：故事页面0/6、生存页面0骨片；原页面保留。下载文件未读取核验，未在新域名导入，也未检查其他浏览器或设备 |

旅途导出覆盖故事、画册、借景、失物、节日及奖励；生存成长需在原《再活一局》中另行导出。以上仅记录当前浏览器的UI导出结果，不声称用户所有设备的存档已经迁移。

版本号、DNS缓存刷新、证书签发及存档迁移应分别记录；本次绑定不更改游戏存档格式、奖励和玩法。

# tougaigu.com 域名配置与验收

## 当前状态

**本文件记录配置方案和待验收项目。DNS、GitHub Pages绑定、证书与重定向结果尚待主会话实际验证，不表示已上线成功。**

- 用户已告知在Spaceship购买`tougaigu.com`并要求绑定游戏。
- 现有仓库：`zhangshuaibo1/tougaigu`；现有托管为GitHub Pages，发布内容来自`gh-pages`根目录。
- 正式入口：`https://tougaigu.com/`；旧入口：`https://zhangshuaibo1.github.io/tougaigu/`。
- 绑定准备阶段核对到main为`a5410db6f2ea763fa25b7208203a18c6ab3475d0`，Pages为`e11fc55c6c02f91b76e6863aca0d5f61f265ca2f`，当时线上游戏版本为25.0.0。提交和发布前须再次读取远端状态。

## 配置步骤

1. 在旧入口通过“设置与存档 → 导出旅途存档 ↓”保存备份。旅途包含故事、画册、借景、失物、节日与时光奖励；原《再活一局》的生存成长须在该游戏中单独导出。
2. 在[仓库Pages设置](https://github.com/zhangshuaibo1/tougaigu/settings/pages)中将Custom domain设为`tougaigu.com`。保留现有`gh-pages`发布来源。实际保存结果待记录。
3. 在[Spaceship域名列表](https://www.spaceship.com/zh/application/domain-list-application/)打开该域名的Advanced DNS。先确认当前权威DNS由Spaceship管理；如使用其他名称服务器，应在实际DNS服务商修改。核对同名停车/转发记录后处理冲突，保留邮件及其他业务记录。
4. 配置下表。各条A记录分别添加，TTL采用控制台默认值；`www`目标不含协议和`/tougaigu/`路径。

| 类型 | 名称 | 值 |
| --- | --- | --- |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `zhangshuaibo1.github.io` |

以上地址按[GitHub自定义域名官方说明](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)核对。控制台操作参考[Spaceship DNS记录说明](https://www.spaceship.com/knowledgebase/dns-records-types/)。本表为计划配置，实际DNS响应在下表单独记录。

5. DNS解析正确、证书可用后，在Pages启用Enforce HTTPS，并验证主域名、`www`和旧入口的实际响应。等待期间不使用关闭证书校验的方式宣告成功。
6. 在新域名正常导入备份。浏览器按域名隔离存储，新入口不会自动读取旧域名进度；导入沿用游戏现有确认流程。

## 后续发布必须保留

- `main`的`dist/CNAME`及`gh-pages`根目录的`CNAME`均为单行`tougaigu.com`，保留末尾换行。
- 每轮同步`dist/`时包含`CNAME`，同时保留`.nojekyll`；不切换托管服务，不覆盖正在进行的游戏候选。
- `.github/workflows/iteration-check.yml`正式公网验收地址为`https://tougaigu.com/?qa=$CHECK_SHA`，原严格游戏门槛不变。
- 新域名DNS和HTTPS实际可用后，才提交以其为正式验收地址的配置。旧入口重定向另行检查，避免把旧域名重定向页当成游戏HTML。

## 实际验收记录（待填写）

| 检查项 | 结果及证据 |
| --- | --- |
| 检查时间与时区 | 待主会话填写 |
| 当前main与gh-pages SHA | 待发布前再次核对 |
| Pages Custom domain | 待验证 |
| 权威DNS服务商 / 名称服务器 | 待验证 |
| 根域名A记录 | 待验证 |
| `www` CNAME | 待验证 |
| HTTPS证书有效且包含主域名 | 待验证 |
| Pages Enforce HTTPS | 待验证 |
| 主域名首页状态码与实际版本 | 待验证 |
| JavaScript模块与背景资源 | 待验证 |
| `www`最终地址与HTTPS | 待验证 |
| 旧GitHub Pages入口最终地址 | 待验证 |
| 源码与发布目录CNAME一致 | 待验证 |
| 公网游戏验收 / 工作流链接 | 待验证 |
| 用户存档备份与迁移范围 | 待用户实际操作确认，不假定已完成 |

版本号、DNS缓存刷新、证书签发及存档迁移应分别记录；本次绑定不更改游戏存档格式、奖励和玩法。

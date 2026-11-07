# 项目协作与发布约束（强制）

本文件是本项目持续开发、分支协作、验收和发布的最高执行约束；与旧版本计划中的“多分支并行”“另开 iteration 分支”等历史文字冲突时，以本文件为准。历史分支与旧报告只作审计资料，不代表可继续开发或发布。

## 1. 分支唯一性与协作

- 唯一可写的持续开发分支：`iteration-latest`。所有会话、自动化任务、人工修改和协作者都必须在这一个分支上协同；先读取远端最新 HEAD，再在该分支追加提交。
- `main` 是正式源码基线，只能通过当前 `iteration-latest` 的审查 PR 合并更新；不得直接在 main 开发，不得从旧分支另起候选，不得建立第二条活动开发分支。
- `gh-pages` 是部署产物分支，只能由正式部署流程更新；不得把它当源码分支或手工开发分支。
- 既有 `iteration-v*`、`agent/*`、`prestudy/*`、`release-*` 等旧分支全部冻结为历史审计引用，不再接收提交、不再触发新候选。不得从中 cherry-pick 整树覆盖 main；需要的内容必须先对照最新 main 做有证据的差量整合到 `iteration-latest`。
- 历史分支引用暂时保留以保护已发生的提交、失败和发布证据；不得为了“只保留一个活动分支”而删除尚未确认已归档/可恢复的提交。完成独立归档与可恢复性核验后，才可清理旧分支引用。无论旧引用是否物理删除，活动开发分支始终只能有一个。
- 写入前必须 fresh-read 分支 SHA；更新 `iteration-latest` 使用 expected SHA、fast-forward（force=false）。若远端 HEAD 已变化或写入 lease 冲突，停止并重新读取，不覆盖、不强推、不抢占其他会话的提交。
- 同一时间只允许一个发布负责人推进候选→合并→部署闭环。所有其他会话只在 `iteration-latest` 协同，不另建分支、不并行发布。

## 2. 最新完整 dist 的候选整合方式

- 每轮以最新 `main` 为父历史和源码基线，在 `iteration-latest` 上建立候选；不得以本地包或旧候选的整棵仓库覆盖 main。
- 当最新完整游戏 `dist/` 已通过清单核对时，可将 `dist/` 作为一个整体候选替换：先比较路径清单、SHA、文件大小和模式；必须确认没有删除 main 仍需的运行路径，所有新增路径均被纳入，并保留 CNAME、空 `.nojekyll`、首页/模块版本戳。
- 整体替换仅限 `dist/` 及经审查的配套资源/版本文件。不得整体覆盖 `.github/`、`scripts/`、`tests/`、`docs/`、package/锁文件、QA证据、工作流或其他源码根目录。它们必须以最新 main 为准，按文件/函数差量整合。
- 保留六章、十节日、旧游戏、碰撞物理、输入、存档/奖励/选择、ARIA/语义、企业页脚和既有精确网络失败预算。测试失败原样保留并因果修复，不 skip、不放宽阈值。

## 3. 每批更新的强制闭环

1. 在 `iteration-latest` 完成一批真实代码/美术变更，更新本轮 QA/交接记录。
2. 运行原官方候选工作流：全量 Node 测试、资源/版本引用检查、真实 Chromium 候选浏览器及 1280/390/320 视口和既有故障资源、迟到、暂停/减动、剧情逐页 decode、输入/物理/解锁/存档/奖励/网络账本门槛。
3. 候选未通过、浏览器证据不足、并发负责人未交接或 artifact 无法独立审计时：停止，不合并、不更新 Pages、不覆盖稳定版；记录具体失败与阻塞。
4. 候选通过后，从最新 `main` SHA 建立/更新 PR，检查 PR base/head 和完整差异；只合并当前 `iteration-latest` 的已验收候选。合并后 fresh-read 新 main SHA。
5. **同一轮立即部署**：从该 main SHA 生成 Pages 运行树并更新 `gh-pages`，启动 GitHub Pages workflow；不得把部署推迟到下一轮或累积多轮更新。部署失败时保留 main 与旧 gh-pages，不伪报上线。
6. 部署后立即运行 main 完整官方工作流（含正式 `https://tougaigu.com/` Chromium 验收），下载本轮源代码与 Pages/live artifacts，逐路径核对 path/blob SHA/size/mode；核验唯一空 `.nojekyll`、单行 `CNAME=tougaigu.com`、首页版本、关键 JS/CSS/图片 HTTP 响应及正式域名返回目标版本。
7. 只有本轮 Pages run、main HTTPS run、artifact 独立审计、线上版本与关键资源响应全部成功，才报告“已上线”。否则明确区分“候选未通过”“已合并但未部署”“Pages部署完成但main HTTPS未通过”，列出候选/合并 SHA、Pages run、HTTPS run、线上版本和缺口。

## 4. 自动化入口

- `iteration-check.yml` 只接受 `main` 与 `iteration-latest` 的 push；手动 dispatch 若来自其他 ref 必须失败退出。
- 候选分支只跑本地真实浏览器候选，不执行正式公网步骤；只有 main 执行正式域名浏览器验收。
- 所有 game verification runs 使用同一个仓库级 concurrency group，`cancel-in-progress: false`，避免不同分支同时争用验收/发布资源。
- Pages 发布只允许在候选成功并合并 main 后执行；不得从冻结历史分支直接发布。

## 5. 视觉基准

唯一角色/场景视觉依据为用户批准的原始设定板 `docs/art-reference/approved-board.png`，必须核验其 SHA-256 为 `f728aa967f5ccd0fcb8a3ea2a13015f88e1904a293a77626a7770798a4891793`。阿拾为棕色短发、蓝夹克、米色内搭、旅行背包；拾光为长发、红围巾、米色外衣的人形女孩。头盖骨仅为“打开脑洞”的比喻，不得制作字面头骨头盔。不得以旧银发/湖绿围巾/小光灵方案替代批准基准。


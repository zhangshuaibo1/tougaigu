# v32 桌面对白布局预研

状态：**32.0.0 预研候选已完成本地全量、完整真实浏览器及六场景布局验证；正式候选 CI 与发布仍待完成。** 最新基点为已通过候选 CI 的 v31 `7ba7c5e00a6a32032e5becf5131a527322d03ac3`。本记录尚未确认 v31 的正式公网闭环，由根会话完成后再推进 v32。只对实际采样范围给出结论，不宣称所有姿势、平台或设备已无遮挡。

当前整合、独立边界补测及限制见 [INTEGRATION.md](INTEGRATION.md)，本轮完整本地日志、精确保留项与哈希见 [integration-review.json](integration-review.json)。下方原始研究及观测材料保留其历史基点与历史状态，不能把历史的 29.0.0 或“未升版”解释成当前候选版本。

实际本地原图、完整原报告归档、自然公告共存、先前测试工具失败与修复，以及根会话亲阅结论见 [LOCAL-RESULTS.md](LOCAL-RESULTS.md)。本地浏览器结果不代替 GitHub CI 或正式 HTTPS。

方案与待验范围见 [PLAN.md](PLAN.md)，精确基点、四项差异、139 项未改运行文件与本地测试原日志见 [verification.json](verification.json)。[原始问题图](before-greenhouse-root-crossed.png) 为官方候选原字节，没有改后效果图。

## 可迁移差异

- `dist/index.html`、`dist/dream.html`：各新增一个中性布局容器，原标签/属性/非空白文字保持。
- `dist/dream-play.css`：默认容器不生成盒；≥900px 的普通故事界面使用上方两列阅读区（节日、失物检查和月亮活动仍走原布局），原 HUD 与目标/公告按实际内容排布。
- `dist/cap-play.css`：同一范围的原对白归左列，完整自然换行，保留正文/头像尺寸、点击穿透与原减动行为。

[runtime.patch](runtime.patch) 只含这四项运行差异，已在独立临时目录对基点 `4c0fbacfbc63e06353d9ab3a20f41cb17bbd7553` 的原文件通过 `git apply --check`。**它不是针对未来正式 v31 的已验证补丁。** 接续时先审最终成功 v31 的相关差异，仅合并布局片段，保持正式版本、缓存标记、历史与随后新增功能。不得将本研究的整份旧入口拷回新版。

本整合工作区不会更新 main、gh-pages 或域名。正式发布顺序仍由根会话管理：先完成 v31 公网闭环，再对本轮做候选、原图与公网验收。

## 后续只读浏览器观测准备

基于已保存的 `cd8dffdc0104bb23a62fea06c0cdf5ac587d8c57` 另加最小观测代码，运行时 143 文件保持原字节。三个原安全点可记录阅读区、自然对白、角色真实 rig 投影，以及本次运行中的 Canvas/控制框比较；仍未执行真实浏览器。范围、严格缺失处理和跨版本配对限制见 [BROWSER-NOTES.md](BROWSER-NOTES.md)，离线检查见 [browser-local-review.json](browser-local-review.json)。

上述是保存的六项历史增量。本次在最终 v31 上按 diff 整合，并在原三条路线全部结束后补上六个独立 context 的真实 UI 检查；现已通过本地实际运行，正式 CI 仍待执行。没有以历史研究的整份 HTML 或浏览器脚本覆盖新版。

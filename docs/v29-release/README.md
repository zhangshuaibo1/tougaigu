# v29 正式发布：候选与公网完整证据

本归档对应正式 main 提交 **b13bc250c1c597dc9b46d06541f461c055ec6ae6**，GitHub Actions [40928071569](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40928071569)。2026-10-29 18:34:14 UTC，工作流成功完成；候选 localhost 与正式 **https://tougaigu.com/** 的全部浏览器门槛均通过，实际版本为 **29.0.0**。

## 精确来源

- 正式 artifact `12923740740`：282,572,410 字节，SHA-256 `2620dfb0315b4f81c5f0b6c1f9368e1e912d4f0b71e7b1bd5ad16f252e22f0b1`。
- 可信审计逐项核对698个源码blob与b13一致、421项安全artifact路径；未执行artifact内程序。648/648项测试通过，失败、跳过、取消、todo均为0。67 JavaScript模块、169本地引用、229个29.0.0资源版本引用通过。
- `candidate-main-report.json.gz` 保存本次main工作流的原候选报告：4,074,156字节，SHA-256 `47ec84d801027fe69f6b6b9814e2a70290ac7f9e45df1be2309af58fa45ce893`。
- `public-report.json.gz` 保存原正式HTTPS报告：4,074,422字节，SHA-256 `63dde4ea58aaf0b0c5d47db60c4bc328c62c1ba8bb632de673ce3d3aa6e05cda`。
- 两份报告原始字节未重序列化、未删减；gzip使用空文件名和mtime=0，解压逐字节核对，二次压缩得到相同字节。全部压缩与原始哈希见manifest。
- `audit-compact.json` 完整保留698项源码、421项ZIP路径及52项即时证据清单，只移除报告摘要中重复的大段post/endings对象；原始细节都在上述gzip。`secondary-audit.json` 记录独立复核，两份报告各26个即时JSON对象与原报告完全相等。`official-metadata.json` 保存官方run/job/artifact元数据，不含签名下载URL。

第六候选9f的独立CI与本次main候选是不同执行。9f的4,042,345字节原报告及20项候选归档保留在上一层 `verification-v29-candidate-full.json`、`verification-v29-candidate-audit.json` 和 `v29-sixth-candidate/`，不把本次b13数据回写成当时结果。

## 正式公网实际通过范围

1280×800、390×844、320×680均实际返回29.0.0，无页面/HTTP错误、无横向溢出，最后图片全部完成。桌面故意网络失败实际与预期精确一致为9项；两个独立手机基础上下文均0项。

第六章桌面、390模拟触摸、320模拟触摸、精确主图失败四条完整路线分别36.183/34.910/34.264/35.168秒，均0死亡。完整浮书周期、同身体连续蘑菇越台、双灯、真实归位、冻结后的原身体出口及结算通过；额外三次真实重玩使runs从1到4。迟到响应、离场旧响应隔离、再进入恢复也通过。

公网390旧触点91的click目标为null，派发后defaultPreventedAfter为true，结果卡保留；320旧触点151的click实际命中result-story并被阻止。新触点92/152仍正常拆信。这里依据原生事件记录；阅读滑动的CDP命令确认不是原生pointer事件轨迹。

桌面四种真实回复组合及每次重载均通过，原三种结局正确呈现，重读不重复奖励或改变章节成绩。390三种结局原本全部容纳，0次滑动；320三种结局各1次真实模拟滑动，scrollTop从0到69/103/103，三段正文、首页按钮和尾注均完整可见，按钮可命中，touchEnd和session detach记录完整。系统减少动态时tender结局的activeAnimations为空且三段正文保留。

## 原始公网画面与边界

四张PNG均为官方artifact原始字节、原始尺寸，独立审阅确认夜灯构图和三种手机阅读状态；未裁剪、缩放或合成。桌面初始截图本来允许自然滚动，不能仅凭单张桌面图声称底部全部可见。其他原图/即时JSON未重复打包，完整数据与路径保留在报告和清单中。

手机输入为Chromium CDP模拟触摸，不是实体设备。没有Safari或低端GPU验证。v30六章动作和v31表情预研不属于v29产品。发布提交、Pages逐blob比对与本轮完整状态见 [release summary](../verification-v29-release-summary.json) 和 [QA-v29](../QA-v29.md)。

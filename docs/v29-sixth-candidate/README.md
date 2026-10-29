# v29 第六候选原始验收归档

**范围：candidate-only；公网 HTTPS 验收待另外归档。** 本目录只代表候选提交 `9f372f3910a6141ddb4e5c6a5707438f7c8607d0` 的 CI 结果，不以 Pages 部署、首页字节相同或尚未完成的 main 工作流替代完整公网验收。

## 来源与保真

- GitHub Actions run `40924856127`，job `123627511600`，结论 success；candidate 分支的 public 步骤 skipped。
- 官方 artifact ID `12921870111`，原 ZIP 181,040,692 bytes，SHA256 `5c262973a206c158038527f52aacf5174468bfc0237281dfd9b3933af77a4949`。
- 根审计确认 697 个 source blob、213 个 ZIP 路径、648 / 648 项测试通过。compact audit 原样保留 sourceFiles、zipFiles、各项 hash、tests、references、partialEvidence 和 failureEvidence 对象；仅 reports 内重复的原始大对象替换为摘要及完整报告引用。
- 完整报告在 `../verification-v29-candidate-full.json`，4,042,345 bytes，SHA256 `a0fa9913f9b7cd1bf2c683b2088bae1a821e273fadc96449e4f674fabe2b514c`，从原 artifact 逐字节复制，未重新序列化。
- `immediate-json-lossless.zip` 收录全部 26 份即时 JSON（排除已单独保存的 report.json），原 member bytes 完整保留，逐 member 解压回读校验通过。ZIP 使用固定时间戳和排序；它是证据子集，未声称保留整个原官方 ZIP。
- 六份 `*-reading.json` 另行逐字节复制，便于直接审查。九张 PNG 为原图：三个不同桌面结局，以及 320 宽三种结局各自的 top/read 配对；未重编码、裁切或修图。
- `manifest.json` 保存每份来源、字节数、SHA256、对象比较结果、原生输入事实与证据边界。

## 读屏逐对象核对

六份 reading 的 `layoutSamples`、`reading`、`gestureAttempts`、`inputCleanup` 与完整 report 对应对象严格相等；对应六份即时 case JSON 与 report 的整个 case 也严格相等。没有四舍五入后比较。三段正文均完整覆盖，尾注完整可见，主页按钮完整可见且中心命中。最多 9 次有界滑动的原门槛保持。

| 宽度 | 结局 | scrollHeight / clientHeight | scrollTop | 滑动次数 |
| --- | --- | --- | --- | --- |
| 390 | dawn | 758 / 758 | 0 → 0 | 0 |
| 390 | lanterns | 792 / 792 | 0 → 0 | 0 |
| 390 | tender | 758 / 758 | 0 → 0 | 0 |
| 320 | dawn | 723 / 654 | 0 → 69 | 1 |
| 320 | lanterns | 757 / 654 | 0 → 103 | 1 |
| 320 | tender | 757 / 654 | 0 → 103 | 1 |

390 宽没有真实 overflow，因此无需滑动；320 宽三例各一次实际滑动，DOM scrollTop 分别增加 69、103、103。实际发出的触摸均收到 touchEnd 回执并完成 session detach。此处的触摸证据是 **CDP 命令回执 + 页面实际滚动/矩形测量**，不是额外捕获的原生 pointer 事件链，也不是真机触屏测试。

## 完整终章路线与原生输入事实

四份即时 route 与完整 report 对象严格相等，四份即时 mushroom-crossing 与各 route 的 mushroomObservation 严格相等。原始 `< -800` 弹起速度、2.8 秒内弹起、6 秒内根台落稳、同一身体、零死亡、自然释放和冻结中抵达原出口门槛均通过。

| 路线 | 完整路线秒数 | 原生按下到弹起秒数 | 原生按下到根台落稳秒数 | 实际落稳 X |
| --- | --- | --- | --- | --- |
| desktop | 36.012 | 0.2413 | 1.2576 | 1676.530620 |
| touch-390 | 34.626 | 0.1507 | 1.2503 | 1694.234645 |
| touch-320 | 34.416 | 0.1980 | 1.2645 | 1685.853575 |
| failed-primary | 35.251 | 0.2023 | 1.2310 | 1680.460989 |

390 宽原生旧触点为 **90**：释放时结果卡保留，出现一个旧 click，`targetId=null`，最终 `defaultPreventedAfter=true`；没有命中 `result-story` 的旧 click。随后新触点 **91** 的 down/up/click 命中结果按钮，未被阻止，独立 UI 断言确认进入 outro。

320 宽原生旧触点为 **153**：其 click 命中 `result-story`，最终 `defaultPreventedAfter=true`，`dialogsAfter=["result-dialog"]`；结果卡保留。随后新触点 **154** 的 down/up/click 未被阻止，独立 UI 断言确认进入 outro。manifest 保存原生事件原字段，包含 pointerId、pointerType、isTrusted、时间、target、最终 defaultPrevented 与 dialog 状态。

这两段是 Chromium 模拟触摸产生并由被动观察器捕获的**原生事件**；与结局滑动的 CDP 回执分别记录。fresh click 的 capture/microtask `dialogsAfter` 仍可能显示 result-dialog，因此进入 outro 的结论来自原测试独立的 `realOutroOpened` UI 断言，不由该早期采样推断。

主线首次路线恰好结算一次；三条扩展路线是真实合法重玩，章节完成次数从 1 增至 4，准确记录新增 3 次完成，不把重玩声称为没有再次结算。

## 结局、资源和全局门禁

四个桌面组合和真实 reload 均通过：send/release→dawn、keep/hold→lanterns、keep/release→tender、send/hold→tender。减少动态效果路径与资源延迟/离场迟到回归见完整 report 的 endings 和 postExtended。

1280 完整上下文最终恰好匹配 9 项预期请求失败；独立 390 与 320 上下文各 0 项请求失败。三个上下文的 pageErrors 与 httpErrors 均为空，finalImagesLoaded 和 finalExactNetworkMatch 均为 true。失败预算没有放宽。

本归档不代表公网完整验证；后续公网原始 report、截图和审计必须以其实际来源单独保存。

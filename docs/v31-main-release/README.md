# v31 官方 main 完整验证证据

本目录对应主分支提交 `75010ca44245e05cf44187768722081d244f39f4`，官方 run [40978620156](https://github.com/zhangshuaibo1/tougaigu/actions/runs/40978620156)。候选浏览器与真实 `https://tougaigu.com/?qa=75010ca44245e05cf44187768722081d244f39f4` 全程均通过，独立数据审计也已通过。

- 源码 tree：`f418c649635f0dc3f55679dd9d7b973bb34ef40a`；完整源码 797 个 blob，运行文件 143 个。
- Pages：`6e716a8c40e5ad0b917f3b3e85fe86f7b09a9241`，tree `89c590e390f02c089b67cfa6f3539c35fa836201`；143 个运行路径的内容与 Git 模式逐一相同。
- 官方 ZIP：artifact `12944314862`，322071593 字节，SHA-256 `9dc7dbb677cbd7be2ec30dca105fd94178d4117aa4045340380d64244e8e31e7`。
- 单元测试 675/675；两份报告都含 1280、390、320 视口。每份报告的预期故障计数为 9/0/0，所有实际故障与预期逐条一致，页面和 HTTP 错误均为零。
- 原始完整报告、原 stdout、测试日志及所有即时 JSON 均无删节、无重写；gzip/tar 只作无损打包。所有 PNG 保留原始尺寸和字节。
- `manifest.json` 列出本目录所有载荷的大小与 SHA-256。即时 JSON tar 的每个成员另有原始大小与 SHA-256。`source-integrity.json.gz` 保留全部源码逐 blob 对照，`artifact-audit.json.gz` 保留完整 ZIP 路径与哈希清单。

`candidate-*` 与 `public-*` 属于两次独立路线，不能将截图当作同步帧对比。数值中的 snapshot occurrences 包括报告中重复出现的快照，不是独立动画帧数。面部证据只覆盖实际保存的事件；疲劳证据是掀盖状态，不能扩大为合盖疲劳或全六章面部覆盖。该结果不含实体手机、Safari、低端 GPU 或帧率基准。

更早的本地 HTTPS 尝试因该执行环境 Chromium 的 `ERR_CERT_AUTHORITY_INVALID` 在首次导航失败，原记录保留在 `/tmp/v31-live-browser-20261030`；没有关闭 TLS 校验或放宽测试。那次失败不计为通过，本目录的通过结论来自官方 GitHub runner 的真实 HTTPS 完整路线。

原始大 ZIP 留在 `/tmp/tougaigu-v31-main-40978620156.zip`，全部原图与报告留在 `/tmp/tougaigu-v31-main-40978620156`。此目录仅选取必要原图；其他原图的尺寸与哈希可在完整清单查验。官方 artifact 有三天保留期限，当前归档保留完整报告和所有原始数值侧录。

# v34 正式候选准备证据

本目录记录从main `be05769a99a807f9396c03084760f8283ce4195e` 精确接续的34.0.0候选准备。现有 `local-34/` 是当前34本地验证，`../v34-prestudy/` 是保持33.0.0身份的原研究；正式GitHub完整候选与34真实HTTPS结果仍待执行。

- [完整说明与验收边界](../QA-v34.md)
- [研究转存校验](prestudy-transfer-check.json)
- [当前34本地清单](local-34/manifest.json)
- [当前34独立只读核验](local-34/review.json)

本地三个实际命令全部成功。原执行器在后处理中读错报告路径，原`execution.json`继续保留failed，实际CLI返回路径与报告、源码及702案例由独立只读review核验。不要将这个原始失败字段隐去或误报成游戏失败，也不要把局部成功写成完整候选或正式上线。

`framing-report.json.gz`无损保存原28,077,314字节报告。`original-png-inventory.json`列51张未编辑原PNG，其中6张原尺寸选图随本目录保存。manifest不自包含；每一载荷的SHA-256与来源均记录。截图与即时几何可能在相邻时刻，不声称同一帧。

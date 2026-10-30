# v34 正式工作树：独立只读复核

结论：源码身份、旧测试保留、原浏览器 AST 和 local-34 证据原字节复核通过。未改源码、任何原证据、远端 ref，也没有重跑测试或审 root 未完成的文字。

- 当前 260 个 protected 路径集合与 execution.json 完全一致；每一个当前 SHA256 都等于执行前和执行后。合并哈希表摘要：`53d229da2a8982c9b94699c44c67ac6c67108bd881a6e86c2b9e1168284e7580`。
- be05769a99a807f9396c03084760f8283ce4195e 的 77 个旧 test 文件加唯一 fixture 全部从 Git archive 读出，78 个文件逐字节相同。
- browser-smoke 只有一处9行 >=34 hook；去掉后不仅 AST 相同，整个源文件字节也与 be05769 相同。
- local-34 manifest 的16个payload共3,765,294字节全部核验；gzip解压后等于源报告原字节，6张所选PNG等于源原图；51张原图库存逐文件核对哈希、长度和尺寸，并全部由同次原报告引用。
- 当前34测试日志实际包含702条个案通过行和702/702汇总，fail/cancelled/skipped/todo均0，用时7,986.589729ms。旧691个案例名称与次数完整保留，新增11；没有借用预研日志或文件容器计数。
- 当前34浏览器报告的77项源哈希全等于这次执行/当前源码。1280键盘、390/320模拟触屏3/3通过，所有1346个游戏快照version都是34.0.0（两份save.version=1是存档schema），page/http/request均0。helper61.851211599991075秒，进程63.4531811800116秒。

## 外层 launcher 失败必须保留的区别

原execution.status确实是failed：三条验证命令各自exit0之后，外层误读了不存在的browser/report.json。真实helper返回的是cap-framing/report.json，版本字段是expectedVersion。独立读取正确的原报告，哈希 `e7c68786167bcf1a8acb9cb45ef83b6a5119276fa2a51412ddef61b236d2ee04`，与CLI、manifest、review完全相符。这里认可实际验证产物和源字节；**没有将外层launcher说成成功，也没有覆盖其失败记录。**

## 文件

- audit.json：源码/测试/AST与当前34运行结果的独立结论。
- artifact-checks.json：16个payload的逐项哈希及来源原字节核验。
- 只读复核脚本保留在 /tmp/review-v34-formal-root-independent.py；为保持交付简短，本目录不重复拷贝源码、原图或原报告。

这只属于当前34本地验证，不代表正式候选CI或公网发布已完成。

# 六章动作 · 独立本地预研画面

状态：本地预研，尚无v30候选/公网通过。改前为独立detached工作区中原字节的v29候选bfe9fd55400c89a06c5f0b677cf02a6380e0a624；当时该候选仍在验收，不把它标为已完成正式版本。

`scripts/render-v30-motion.mjs`对新产品DreamGame与独立v29实例施加相同实际一次jump和逐帧update。六章各在1100×640、390×595、320×431画布生成rise/fall/land/settle/settled五阶段，共90张新画面、18条起章路线、1728次逐步物理比较；首两章另保留同帧旧画面供对照。所有模拟状态相等，像素差异限于原角色包围和首两章真实支撑阴影区域；第三章15张同帧原尺寸画面逐像素相等。暂停后6次被动update仍冻结实际Canvas与表演view。

这里的章节直接从作者出生点初始化，然后只用正常跳跃输入；这是明确的离线起章夹具，不是正常浏览器解锁、手机触摸、完整章节、HUD或实体设备证据。浮书与蘑菇的动作物理专测另有范围，不能由这批普通跳跃图代替。

`motion-v30-report.json`保留全部已生成画面的原始测量与哈希；`selection-manifest.json`列出本目录归档的7张原PNG，其余可用脚本重现。图片均为生产Canvas直接输出，无放大、拼接或修图。正式v29闭环后还须重新对齐最终源码并完成v30真实浏览器与公网回归。

执行前先独立核对baseline工作区HEAD和dist差异，再调用：

```sh
node scripts/render-v30-motion.mjs /tmp/tougaigu-v30-motion /tmp/tougaigu-v29-bfe-baseline/dist bfe9fd55400c89a06c5f0b677cf02a6380e0a624
```

脚本会直接核对物理引擎、关卡、角色绘制、站台角色和接触阴影模块与baseline字节一致，同时记录实际读取的各源文件SHA256。它不从Node派生git进程，不需要网络。

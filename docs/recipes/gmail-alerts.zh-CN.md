# 从 iPhone 转发 Gmail 故障提醒

[使用案例](README.zh-CN.md) · [English](gmail-alerts.md) · [日本語](gmail-alerts.ja.md) · [简体中文](gmail-alerts.zh-CN.md)

假设监控服务发来的故障邮件在主题中带有 `[Incident]`。你可以在 Muse 中收到提醒，把邮件正文留在 Gmail。

为 Worker 单独生成并设置随机密钥 `HOOK_TOKEN`，部署后即可启用自定义 Webhook。快捷指令使用相同的值。

1. 在运行 iOS 27 的 iPhone 上，为目标邮箱开启 Gmail 通知。发送一封主题含有 `[Incident]` 的测试邮件，确认该词出现在通知的标题、副标题还是正文中。
2. 在“快捷指令”中选择“编辑 → 自动化 → 通知”，选取 **Gmail**。在上一步确认的字段上添加“包含 `[Incident]`”的筛选条件，并启用自动化。[Apple 通知筛选条件](https://support.apple.com/en-by/guide/shortcuts/apd932ff833f/10.0/ios/27)
3. 添加“获取 URL 内容”操作，将表中的主机名和 `YOUR_HOOK_TOKEN` 换成自己 Worker 的值。要在锁屏时自动发送，请关闭运行前确认，并允许锁定时运行。[Apple 自动化设置](https://support.apple.com/guide/shortcuts/add-automations-apdfbdbd7123/ios)

| 设置 | 值 |
| --- | --- |
| URL | `https://YOUR-WORKER/v1/hooks/custom` |
| 方法 | `POST` |
| 请求头 | `Authorization` = `Bearer YOUR_HOOK_TOKEN` |
| 请求体 | **JSON** · `message` = `收到故障提醒邮件，请查看 Gmail。` |

再发一封符合条件的邮件。手机显示 Gmail 通知后，检查 Muse 是否收到这条固定提醒。快捷指令只能读取通知预览。此方法无需 Gmail API 凭据或 IFTTT 账号。[IFTTT 示例](https://ifttt.ai/applets/QTwxUGeJ-send-an-ifttt-notification-when-an-ios-shortcut-starts)会在快捷指令启动后，通过 IFTTT 应用发送通知。

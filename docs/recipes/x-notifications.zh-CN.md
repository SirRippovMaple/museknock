# 接收已关注 X 账号的发帖通知

[使用案例](README.zh-CN.md) · [English](x-notifications.md) · [日本語](x-notifications.ja.md) · [简体中文](x-notifications.zh-CN.md)

如果你在 X 上关注了某个项目，可以在 Muse 中接收它的公告。X 应用收到推送后，iPhone 就向 Worker 发送 HTTPS 请求。这个过程无需 X 开发者凭据，也不产生 X Activity API 事件费用。[X 移动通知](https://help.x.com/en/managing-your-account/notifications-on-mobile-devices) · [X Activity API 计费](https://docs.x.com/x-api/activity/event-pricing)

为 Worker 单独生成并设置随机密钥 `HOOK_TOKEN`，部署后即可启用自定义 Webhook。快捷指令使用相同的值。

## 使用共享快捷指令

1. 在运行 iOS 27 的 iPhone 上[添加 MuseKnock notification](https://www.icloud.com/shortcuts/2cde50aa7ed54ea0a0ae4e9588123659)，然后在“快捷指令”中打开编辑界面。
2. 将赋给 `BASEURL` 的“文本”改为自己的 Worker 地址，例如 `https://YOUR-WORKER.workers.dev`，末尾不加斜杠。快捷指令会自动追加 `/v1/hooks/custom`。在下一个“文本”操作中，将 `Your HOOK_TOKEN here` 替换为自己 Worker 的 `HOOK_TOKEN`。
3. 打开“通知”自动化，确认所选应用为 **X**。示例带有标题筛选条件，请按手机收到的通知修改；如需转发所有 X 通知，可移除标题条件，再启用自动化。

下次收到符合条件的 X 通知时，快捷指令会将通知放入 JSON 的 `message` 字段发送。打开所选的 Muse 侧边对话，确认已收到通知。

## 手动创建

1. 在运行 iOS 27 的 iPhone 上允许 X 发送通知。打开已关注账号的主页，轻点铃铛，选择“所有帖子”。先查看一条推送，记下它在手机上显示的文字。
2. 在“快捷指令”中新建快捷指令，选择“编辑 → 自动化 → 通知”，然后选取 **X**。如果只想转发这个账号的通知，可以用通知标题或正文中实际出现的账号名等文字设置筛选条件。启用自动化。[Apple 通知触发条件](https://support.apple.com/en-by/guide/shortcuts/apd932ff833f/10.0/ios/27)
3. 添加“获取 URL 内容”操作，将表中的主机名和 `YOUR_HOOK_TOKEN` 换成自己 Worker 的值。分享快捷指令前请移除令牌。

| 设置 | 值 |
| --- | --- |
| URL | `https://YOUR-WORKER/v1/hooks/custom` |
| 方法 | `POST` |
| 请求头 | `Authorization` = `Bearer YOUR_HOOK_TOKEN` |
| 请求体 | **JSON** · `message` = `收到一条符合条件的 X 通知。` |

要转发标题，可将 JSON 字段 `message` 的值设为“通知”变量的“标题”。如果推送带有正文预览，也可以选择正文。要自动发送，请关闭运行前确认，并允许锁定时运行。下一条符合条件的推送到达时，检查所选的 Muse 侧边对话。[Apple 自动化设置](https://support.apple.com/guide/shortcuts/add-automations-apdfbdbd7123/ios) · [iOS 27 通知变量实测](https://notikeep.app/en/ios-27-notification-automation/)

此方法只处理启用自动化后 iPhone 收到的推送，无法补回错过的帖子或识别删帖事件。需要公开帖子的 ID、链接或删帖事件时，可以使用 [X API 直接集成](../../README.zh-CN.md#x-公开帖子)。

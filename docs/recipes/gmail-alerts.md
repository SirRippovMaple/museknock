# Forward Gmail incident alerts from your iPhone

[Recipes](README.md) · [English](gmail-alerts.md) · [日本語](gmail-alerts.ja.md) · [简体中文](gmail-alerts.zh-CN.md)

Suppose your monitoring service emails you with `[Incident]` in the subject. Muse can flag that an incident needs attention while the email stays in Gmail.

Enable the custom webhook by setting a dedicated random `HOOK_TOKEN` in your Worker’s secrets and deploying the change. Use the same value in the shortcut.

1. On an iPhone running iOS 27, enable Gmail notifications for that mailbox and send yourself a test email with `[Incident]` in the subject. Check whether the phrase appears in the notification title, subtitle, or message.
2. In Shortcuts, choose **Edit → Automation → Notification**, select **Gmail**, and filter the field you identified for `[Incident]`. Enable the automation. [Apple’s notification filters](https://support.apple.com/en-by/guide/shortcuts/apd932ff833f/10.0/ios/27)
3. Add **Get Contents of URL**. Use your Worker’s hostname and replace `YOUR_HOOK_TOKEN` with the webhook token from your deployment. To send alerts while the phone is locked, turn off trigger confirmation and allow the shortcut to run while locked. [Apple’s automation settings](https://support.apple.com/guide/shortcuts/add-automations-apdfbdbd7123/ios)

| Setting | Value |
| --- | --- |
| URL | `https://YOUR-WORKER/v1/hooks/custom` |
| Method | `POST` |
| Header | `Authorization` = `Bearer YOUR_HOOK_TOKEN` |
| Request Body | **JSON** · `message` = `An incident email arrived. Check Gmail.` |

Send another matching email. When its Gmail notification appears, look for the fixed message in Muse. The shortcut only sees the notification preview. This works without Gmail API credentials or an IFTTT account. The [IFTTT example applet](https://ifttt.ai/applets/QTwxUGeJ-send-an-ifttt-notification-when-an-ios-shortcut-starts) sends an IFTTT notification when a shortcut starts.

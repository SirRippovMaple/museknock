# Get alerts from an X account you follow

[Recipes](README.md) · [English](x-notifications.md) · [日本語](x-notifications.ja.md) · [简体中文](x-notifications.zh-CN.md)

Use this when you follow a project on X and want its announcements in Muse. Your iPhone receives the ordinary X push notification and sends an HTTPS request to your Worker. This uses no X developer credentials and incurs no X Activity API event charges. [X mobile notifications](https://help.x.com/en/managing-your-account/notifications-on-mobile-devices) · [X Activity event pricing](https://docs.x.com/x-api/activity/event-pricing)

Enable the custom webhook by setting a dedicated random `HOOK_TOKEN` in your Worker’s secrets and deploying the change. Use the same value in the shortcut.

## Use the shared shortcut

1. On an iPhone running iOS 27, [add MuseKnock notification](https://www.icloud.com/shortcuts/2cde50aa7ed54ea0a0ae4e9588123659) and open it for editing in Shortcuts.
2. Set the Text action that supplies `BASEURL` to your Worker URL, such as `https://YOUR-WORKER.workers.dev`, without a trailing slash. The shortcut appends `/v1/hooks/custom`. In the next Text action, replace `Your HOOK_TOKEN here` with your Worker’s `HOOK_TOKEN`.
3. Open the Notification automation and check that **X** is selected. The example includes a title filter. Change it to match a notification you receive, or remove it to forward all X notifications, then enable the automation.

When the next matching X notification arrives, the shortcut sends it in the JSON field `message`. Check your selected Muse side chat for the notification.

## Build it manually

1. On an iPhone running iOS 27, allow notifications from X. Open the profile of an account you follow, tap the bell, and choose **All posts**. Check how a post from that account appears on your phone.
2. In Shortcuts, create a shortcut and choose **Edit → Automation → Notification**. Select **X**. To pick out this account from other X alerts, filter on identifying text you actually see in the notification title or message. Enable the automation. [Apple’s notification trigger](https://support.apple.com/en-by/guide/shortcuts/apd932ff833f/10.0/ios/27)
3. Add **Get Contents of URL** with the settings below. Put your deployed Worker’s hostname in the URL and your own webhook token in the Authorization header. Remove the token before sharing the shortcut.

| Setting | Value |
| --- | --- |
| URL | `https://YOUR-WORKER/v1/hooks/custom` |
| Method | `POST` |
| Header | `Authorization` = `Bearer YOUR_HOOK_TOKEN` |
| Request Body | **JSON** · `message` = `A new X notification matched my filter.` |

For the headline, set the JSON field `message` to the **Notification → Title** variable. You can also select the body when the app includes a preview. For hands-free use, turn off confirmation on the trigger and allow the shortcut to run while locked. When the next matching post alert appears, check the selected Muse chat. [Apple’s automation settings](https://support.apple.com/guide/shortcuts/add-automations-apdfbdbd7123/ios) · [Notification fields observed on iOS 27](https://notikeep.app/en/ios-27-notification-automation/)

This recipe covers alerts that reach your iPhone while the automation is enabled. It cannot recover missed posts or report deletions. If you need post IDs, URLs, or deletion events for a public account, use the [direct X integration](../../README.md#x-public-posts).

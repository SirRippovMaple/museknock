# Track releases in a GitHub repository

[Recipes](README.md) · [English](github-releases.md) · [日本語](github-releases.ja.md) · [简体中文](github-releases.zh-CN.md)

Follow release activity for a repository you maintain, even when your phone is off.

1. Save a new random secret as `GITHUB_WEBHOOK_SECRET` in your Worker. In the repository’s **Settings → Webhooks**, add `https://YOUR-WORKER/v1/hooks/github` with the same secret and the `application/json` content type. Keep SSL verification enabled. [GitHub webhook setup](../../README.md#github-repository-events)
2. Choose **Let me select individual events** and select **Releases** only. After saving, check the initial `ping` under **Recent Deliveries**. A successful ping confirms the connection and creates no chat message.
3. When the next release is published, look for its repository, tag, and release URL in the selected Muse chat. GitHub also sends other release actions, including edits. The `action` field tells you what happened.

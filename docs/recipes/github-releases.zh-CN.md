# 跟踪 GitHub 仓库的版本发布

[使用案例](README.zh-CN.md) · [English](github-releases.md) · [日本語](github-releases.ja.md) · [简体中文](github-releases.zh-CN.md)

在 Muse 中跟踪自己管理的仓库的版本发布。GitHub 会直接通知 Worker，即使手机关机也能收到消息。

1. 在 Worker 中将新的随机密钥保存为 `GITHUB_WEBHOOK_SECRET`。在仓库的 **Settings → Webhooks** 中添加 `https://YOUR-WORKER/v1/hooks/github`，填入相同的密钥，内容类型选择 `application/json`，并启用 SSL 验证。[GitHub Webhook 配置步骤](../../README.zh-CN.md#github-仓库事件)
2. 在 **Let me select individual events** 中仅选择 **Releases**。保存后，在 **Recent Deliveries** 中确认首次 `ping` 成功。这次请求仅检查连接，不会向 Muse 发送消息。
3. 下次发布版本时，在所选的 Muse 侧边对话中查看仓库名、版本标签和发布链接。GitHub 还会发送编辑版本等事件，可通过 `action` 字段区分。

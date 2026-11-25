# GitHub リポジトリのリリースを追う

[レシピ集](README.ja.md) · [English](github-releases.md) · [日本語](github-releases.ja.md) · [简体中文](github-releases.zh-CN.md)

自分が管理するリポジトリのリリースを追う用途です。GitHub が直接 Worker に通知するので、iPhone の電源を切っていても届きます。

1. 新しいランダムな値を Worker の `GITHUB_WEBHOOK_SECRET` に保存します。リポジトリの **Settings → Webhooks** で `https://YOUR-WORKER/v1/hooks/github` を登録し、同じシークレットと `application/json` を指定します。SSL 検証は有効にします。[GitHub Webhook の設定手順](../../README.ja.md#github-のリポジトリイベント)
2. **Let me select individual events** で **Releases** だけを選びます。保存後、**Recent Deliveries** で初回の `ping` の成功を確認します。これは接続確認で、Muse には投稿されません。
3. 次にリリースが公開されたら、選択中の Muse サイドチャットでリポジトリ名、タグ、リリース URL を確認します。リリースの編集なども届きます。何が起きたかは `action` で判別できます。

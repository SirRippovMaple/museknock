# Gmail の障害通知だけを iPhone から届ける

[レシピ集](README.ja.md) · [English](gmail-alerts.md) · [日本語](gmail-alerts.ja.md) · [简体中文](gmail-alerts.zh-CN.md)

監視サービスから `[Incident]` という件名で障害メールが届く場合、メール本文は Gmail に残したまま、対応が必要なことだけを Muse に知らせられます。

Worker のシークレットに専用のランダムな `HOOK_TOKEN` を設定してデプロイし、カスタム Webhook を有効にします。ショートカットにも同じ値を使用します。

1. iOS 27 の iPhone で対象アカウントの Gmail 通知を有効にします。件名に `[Incident]` を含むテストメールを送り、その語句が通知のタイトル・サブタイトル・本文のどこに表示されるか確認します。
2. 「ショートカット」で「編集」→「オートメーション」→「通知」から **Gmail** を選びます。先ほど確認した項目に `[Incident]` が含まれることを条件にして、オートメーションを有効にします。[Apple の通知フィルタ](https://support.apple.com/en-by/guide/shortcuts/apd932ff833f/10.0/ios/27)
3. 「URLの内容を取得」を追加し、表のホスト名と `YOUR_HOOK_TOKEN` を自分の Worker の値に置き換えます。ロック中も自動で送りたい場合は、実行前の確認をオフにし、ロック中の実行を許可します。[Apple の自動実行設定](https://support.apple.com/guide/shortcuts/add-automations-apdfbdbd7123/ios)

| 設定項目 | 値 |
| --- | --- |
| URL | `https://YOUR-WORKER/v1/hooks/custom` |
| 方法 | `POST` |
| ヘッダー | `Authorization` = `Bearer YOUR_HOOK_TOKEN` |
| 要求本文 | **JSON** · `message` = `障害メールが届きました。Gmail を確認してください。` |

同じ条件でもう一度メールを送り、Gmail の通知が表示された後に、定型文が Muse に届くことを確認します。対象は端末に届く通知のプレビューです。Gmail API の認証情報も IFTTT のアカウントも必要ありません。[IFTTT の作例](https://ifttt.ai/applets/QTwxUGeJ-send-an-ifttt-notification-when-an-ios-shortcut-starts)は、ショートカットの起動をきっかけに IFTTT アプリから通知を送るものです。

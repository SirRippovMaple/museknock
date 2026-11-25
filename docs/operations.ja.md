# 通知の運用とカスタマイズ

[English](operations.md) · **日本語** · [简体中文](operations.zh-CN.md)

## 初回の端末認証

初回は、通知先のサイドチャットで Cloudflare コネクタを使ったセットアップを Muse に依頼します。[依頼文とブラウザ認証の手順](../README.ja.md#クイックスタート)

**ブラウザで Gadget 認証を完了できない場合**は、デプロイ済みの Worker を次の手順で認可します。

1. Bluetooth 対応の Mac に Node.js 22.12 以降と uv を用意し、ダウンロードしたリポジトリの `Pair MuseKnock.command` を開きます。Mac に開いたペアリング画面に同じ Worker の URL、管理トークン、Gadget SDK トークンを入力し、**Start pairing** を押します。
2. iPhone の BLE リーダー（例：nRF Connect）で画面に表示された Gadget に接続します。指定のサービスと特性を開き、**Write with response** で画面の確認値を書き込みます。Mac に **Phone verified** と表示されたらリーダーを切断します。
3. iPhone の Muse アプリで **Settings → Devices** を開き、**Allow community devices** を有効にします。**Add Device → Muse Gadget** から同じ Gadget を選び、Wi-Fi 一覧で **Use current connection** を選びます。
4. Mac に **Pairing complete** と表示されたら、Muse に設定リンクを依頼し、通知先のサイドチャットを登録・選択します。そのチャットにテスト通知が届けば完了です。

この Worker に使う有効なペアリング情報がすでに揃っている場合は、Cloudflare の **Settings → Variables and Secrets** で、同じペアリングの `MUSE_NODE_ID`、`MUSE_SDK_TOKEN`、`MUSE_REFRESH_TOKEN` をシークレットとしてまとめて設定し、デプロイします。管理用 MCP で `begin_muse_pairing` が `configured` を返したら、サイドチャットの登録に進めます。

コマンドは `begin_muse_pairing` からノード ID を取得し、ノード ID、SDK トークン、端末の更新トークンを Worker に渡します。Worker は `CREDENTIAL_ENCRYPTION_KEY` で暗号化して保存します。認可後は Muse に設定リンクを発行してもらい、ブラウザで既存のサイドチャットを登録します。

認証コマンドから受け取った情報は、Worker が Muse でトークンを更新できてから有効にします。保存済みのペアリングでは、`begin_muse_pairing` が直近の更新結果を返します。`unverified` は未確認、`verified` は更新成功、`rejected` は Muse が認証情報を拒否したことを示します。

## 届かない通知を調べる

Muse に「受付 ID … の配信状態を調べて」と頼みます。コネクタを設定する前でも、元と同じ `Idempotency-Key` で Webhook を再送すれば状態を確認できます。

| 状態 | 意味と確認先 |
| --- | --- |
| `queued` | Worker の配信待ちです。保存済みのペアリング、端末認証の有効性、端末に貸与済みの VM を確認してください。 Muse が投稿に HTTP 429 を返すと、Worker は本文を保持し、配信回数の上限と期限の範囲で再試行します。 |
| `sending` | Worker がイベントの配信を開始し、接続または投稿中です。 |
| `sent` | Muse が投稿に受付応答を返しました。Worker が通知を受け付けた時点の投稿先を開いてください。 |
| `suppressed` | 通知元のルール、メッセージの取り消し、ブレーカーなどで配信を抑止しました。`message_retracted` は配信前に Slack または X の投稿が削除されたか、LINE のメッセージが取り消されたことを示します。受付情報の `reason` が `source_open` ならその通知元が上限に達し、`circuit_open` なら全体の上限に達しています。 Worker は投稿直前にチャットの存在を確認します。`side_chat_missing` は Muse が 404 を返したことを示します。新着通知を再開するには、設定画面で既存のチャットを選択してください。抑止済みの通知は再送されません。 |
| `expired` | 受付から1時間が経ち、配信待ちの期限が切れました。 |
| `unknown` | 送信後に結果を確認できなかったか、配信許可が2分で期限切れになりました。新しい通知を送る前にサイドチャットを確認してください。 |

投稿前に失敗した通知が再試行を待つ間も、ほかのチャットには配信できます。すでに Muse に届いた可能性があれば `unknown` として保留します。受付応答が失われた際の二重投稿を防ぐためです。[Gadget SDK の投稿経路](https://github.com/facebookincubator/muse-gadget-sdk/blob/e17081a45941415d483642dbe21c2a2e6ef85a13/linux/src/musegadget/link_client.py)

通知の宛先は、受付時のペアリング・VM・セッション ID で決まります。ペアリングや VM の設定変更で配信が保留された場合は、期限内に元の設定へ戻すと配信を再開します。新しくペアリングしたら設定画面から宛先を登録してください。

## 認証情報の暗号鍵を復元する

Worker は Muse の端末トークンと Bluesky のセッションを AES-256-GCM で暗号化して保存します。`CREDENTIAL_ENCRYPTION_KEY` をパスワードマネージャーに控え、同じ Worker を再デプロイするときは元の鍵を使ってください。`get_setup_status` で `credentialStorageReady` が `false` の場合は、Worker のシークレットを確認し、控えておいた鍵を復元してください。元の鍵を紛失した場合、その鍵で暗号化した情報は復号できません。新しいストレージを使う Worker をデプロイし、新しく認証した端末情報で初回設定を行ってください。

## 端末認証を更新する

失効したペアリングは、同じ Worker URL をペアリング画面に入力し、**Replace existing pairing** を選んで認可してから、サイドチャットを登録し直します。通知元とコネクタには同じ URL を使えます。配信待ちの通知は元のペアリングに紐づきます。Cloudflare に Muse の3つのシークレットを設定していて SDK トークンだけが誤っている場合は、その値を訂正して再デプロイします。3つのシークレットを使う構成から新しいペアリングに切り替える場合は、Worker が保存済みの認証情報を読み込めることを確認し、3つをまとめて削除して再デプロイしてから再認証します。 ターミナルから行う場合は `npm run pair -- --replace` を使います。

Worker は標準の端末 API `api.muse.ai` と暗号化された Link ゲートウェイ `hatch.metaaivm.com` を使用します。`MUSE_VM_ID` を指定した場合、登録時はその VM だけを検索します。その VM が端末に貸与されていることを確認してください。指定しない場合、既定の VM があれば最初に確認し、その後はチャットが見つかるまで他の貸与済み VM を検索します。登録済みの名前を選ぶと、Worker はその名前に紐づけて保存した VM でチャットを確認します。チャットを検索し直すには、設定画面で同じ名前とセッション ID を再登録してください。`MUSE_VM_ID` を変更すると、別の登録先一覧に切り替わります。既存の登録先は移行されません。[Gadget SDK の端末 API](https://github.com/facebookincubator/muse-gadget-sdk/blob/e17081a45941415d483642dbe21c2a2e6ef85a13/linux/src/musegadget/muse_api.py)

## Webhook の送信仕様

`POST /v1/hooks/custom` に `HOOK_TOKEN` を Bearer トークンとして送ります。設定画面で一時停止やフィルターを設定するときの送信元名は `custom` です。

| 入力 | 処理 |
| --- | --- |
| `application/json` または `+json` | JSON の構文を検証し、整数や空白を含めて原文を届けます。 |
| `text/plain` または Content-Type なし | テキストを届けます。 |
| `application/x-www-form-urlencoded` | 重複するフィールドを保持するため、名前と値の組の配列に変換します。 |
| `X-Event-Type` | フィルターで照合する種別です。省略時は `notification` です。送信元・種別は小文字英数字で始まる1〜64文字で、残りには `_` と `-` も使えます。 |
| `Idempotency-Key` | 送信元内で一意のイベント識別子です。空白を除く印字可能な ASCII 文字で最大128文字です。省略すると POST ごとに新規受付になります。 |

本文と変換後のテキストはそれぞれ最大32 KiB です。本文には Muse へ渡す情報だけを含めてください。新しいイベントを受け付けた時点で、Worker はそのとき選択されていた投稿先を記録します。

サービス別のエンドポイントでは、リクエスト本文の上限は 512 KiB、取り出した通知テキストの上限は 1 件あたり 32 KiB です。応答にはサービス固有の形式を使います。設定画面で一時停止や絞り込みを指定する際は URL にある送信元名（例 `telegram`）とイベント種別（例 `edited_message`）を使います。[サービス別の設定](../README.ja.md#サービスを直接接続する)

受付は送信元ごとに直近60秒で10件までです。超過時は HTTP `429` と `Retry-After: 60` を返します。配信の許可は全送信元を合わせて60秒に3回、同時に1件までです。再試行もこの枠を使います。重複判定と受付 ID の参照期間は受付から7日間です。期限の反映と履歴の削除は次のストア操作時に行います。しきい値は `src/store.ts` にあります。

## MCP ツール

| ツール | 引数 | 権限 |
| --- | --- | --- |
| `begin_muse_pairing` | ノード ID とサインイン手順、または保存済みペアリングの直近の検証結果を返します。認証コマンドは再認証時に `replace: true` を指定します。 | 管理 |
| `create_browser_setup_link` | `sessionId`（通知先のサイドチャット ID）。1回限り、10分間有効な Gadget 認証リンクを発行します。認証済み Worker では先にリセットが必要です。 | 管理 |
| `create_settings_link` | 1回限りの `/v1/setup/settings` リンクを発行します。ブラウザで通知先の登録・選択、通知元の停止やフィルターを設定できます。リンクと設定セッションは10分で期限切れになります。 | 管理 |
| `get_setup_status` | Worker 内の設定から `deviceConfigured`、`credentialStorageReady`、`active`、`ready` を返します。`CIRCUIT_BREAKER` の設定が不正な場合は `ready: false` と `reason: invalid_circuit_breaker` を返します。 | 閲覧 |
| `send_test_notification` | `requestId`（UUID）。選択中の投稿先に固定文のテスト通知を登録し、受付 ID を返します。通知元は `museknock-test`、イベント種別は `test` です。 | 管理 |
| `list_side_chats` | MuseKnock の登録名とセッション ID の一覧、選択中の投稿先を返します。 | 閲覧 |
| `list_sources` | なし。受領履歴または配信ルールのある送信元を返します。 | 読み取り |
| `get_delivery_status` | `id`（受付 ID）。本文は含みません。 | 読み取り |
| `get_delivery_breaker` | 全体の残り枠と通知元別の試行数を返します。 | 読み取り |
| `rearm_delivery_breaker` | `expectedGeneration`。いずれかの上限に達し、送信中の試行が終了した後で両方の枠をリセットします。 | 復旧 |

設定リンクは短時間有効な権限付き URL です。他人に共有せず、自分の Worker の URL であることを確かめて、ブラウザで自分で設定してください。開いた後は HTTP-only Cookie と同一オリジンのフォーム送信を使います。登録名は前後の空白を除いて1〜64文字で、大文字と小文字を区別します。先頭は Unicode の文字または数字、以降は文字・数字・結合文字・半角スペース・ピリオド・アンダースコア・ハイフンを使えます。セッション ID は大文字と小文字を区別し、1〜64文字の半角英数字とハイフンが使えます。登録・切替時は投稿せずに Muse に問い合わせ、指定したセッションの存在を確認します。既存のサイドチャットのセッション ID を指定してください。ペアリングを読み込めない場合や投稿先が未設定の場合、認証済みの通知リクエストは HTTP `503` を返します。

Webhook や MCP のトークンを更新するときは、Cloudflare で該当する Worker シークレットを変更してデプロイします。その値を使う送信元やコネクタにも新しいトークンを設定してください。 Telegram の受信用シークレットを MCP や汎用 Webhook にも使っていた場合は、両方を別々の新しい値に変更し、Telegram にも `setWebhook` で新しい値を登録してください。

## CLI でセットアップする場合

Node.js 22.12 以降で `npm ci` と `npm run setup` を実行すると、ローカル用の Worker シークレットが `.dev.vars` に生成されます。既存の Worker には元の暗号鍵を使ってください。`npx wrangler login` と `npm run deploy:local` の後、MCP でペアリング状態を確認します。

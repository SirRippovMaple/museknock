# Operate and customize MuseKnock

**English** · [日本語](operations.ja.md) · [简体中文](operations.zh-CN.md)

## Authorize a device

For first-time setup, ask Muse to use the Cloudflare connector from the destination side chat. [Setup request and browser authorization](../README.md#quick-start)

**If browser authorization fails**, authorize the deployed Worker over Bluetooth.

1. On a Bluetooth-enabled Mac with Node.js 22.12 or later and uv installed, open `Pair MuseKnock.command` from the downloaded repository. Enter the same Worker URL, admin token and Gadget SDK token on the local pairing page, then select **Start pairing**.
2. Using a BLE reader such as nRF Connect on your iPhone, connect to the gadget shown on the Mac. Open the indicated service and characteristic and send the displayed verification value using **Write with response**. Disconnect the reader once the Mac shows **Phone verified**.
3. In the Muse iPhone app, open **Settings → Devices** and enable **Allow community devices**. Under **Add Device → Muse Gadget**, select the same gadget, then choose **Use current connection** from the Wi-Fi list.
4. When the Mac shows **Pairing complete**, ask Muse for a settings link. Register and select the destination side chat, then confirm a test notification arrives there.

If you already have a valid pairing for this Worker, you can use the Cloudflare dashboard. Under **Settings → Variables and Secrets**, add its matching `MUSE_NODE_ID`, `MUSE_SDK_TOKEN` and `MUSE_REFRESH_TOKEN` as secrets and deploy them together. Call `begin_muse_pairing` through the admin connector. When it returns `configured`, continue with side chat registration.

The command gets the node ID from `begin_muse_pairing` and sends the node ID, SDK token and device refresh token to the Worker. The Worker encrypts them with `CREDENTIAL_ENCRYPTION_KEY`. After authorization, request a settings link from Muse and register the existing side chat in your browser.

When the Worker imports credentials from the authorization command, it refreshes them with Muse before activating them. For a saved pairing, `begin_muse_pairing` reports the last refresh result. `unverified` means the Worker has yet to confirm the credentials. `verified` means a refresh succeeded. `rejected` means Muse refused the credentials.

## Trace a notification

Ask Muse to check the delivery status for the receipt ID. You can also repeat the original webhook with the same `Idempotency-Key` before setting up the connector.

| State | What it means |
| --- | --- |
| `queued` | Waiting for a Worker delivery attempt. Check the saved pairing, device authorization, and VM lease. If Muse returns HTTP 429 for the post, the Worker keeps the body and retries within the delivery budget and expiry window. |
| `sending` | The Worker has claimed this event and is connecting or posting. |
| `sent` | Muse acknowledged the post. Open the side chat selected when the Worker accepted the notification. |
| `suppressed` | The Worker stopped delivery. A source rule, a retracted message, or the circuit breaker can suppress a queued event. `message_retracted` means Slack or X deleted the message, or LINE withdrew it, before delivery. For a breaker decision, check the receipt's `reason`. `source_open` means this source reached its limit. `circuit_open` means the combined attempt count reached the global limit. The Worker checks that the chat exists immediately before posting. A `side_chat_missing` receipt means Muse returned 404. Select an existing chat on the settings page to resume new deliveries. Previously suppressed notifications stay suppressed. |
| `expired` | The notification waited for one hour after receipt. Its delivery window has closed. |
| `unknown` | The Worker could not confirm the outcome after a possible send, or the two-minute delivery authorization expired. Check the side chat before sending another notification. |

If a delivery fails before submission, other chats can still receive notifications while that delivery waits for a retry. If the post may already have reached Muse, the Worker records `unknown` and leaves the decision to you. This avoids duplicating a post when its acknowledgement is lost. [Gadget SDK chat transport](https://github.com/facebookincubator/muse-gadget-sdk/blob/e17081a45941415d483642dbe21c2a2e6ef85a13/linux/src/musegadget/link_client.py)

Each receipt keeps its device pairing, VM and session ID. If you change the pairing or VM configuration, restore it before expiry to resume waiting deliveries. Register the destination on the settings page for each new pairing.

## Recover the credential encryption key

The Worker encrypts saved Muse device tokens and Bluesky sessions with AES-256-GCM. Keep `CREDENTIAL_ENCRYPTION_KEY` in your password manager. Use the same key for each deployment of this Worker. If `get_setup_status` reports `credentialStorageReady: false`, check the Worker secret and restore the original value from your backup. A replacement key cannot open records encrypted with the lost key. If the original key is unavailable, deploy a new Worker with fresh storage and perform the initial setup with a newly authorized pairing.

## Renew device authorization

To replace a revoked pairing, open the pairing page for the same Worker URL and select **Replace existing pairing**, then register the side chat again. Existing senders and connectors keep their URLs. Pending deliveries retain their original pairing. If you configured the three Muse secrets in Cloudflare, correct an incorrect SDK token there and redeploy. To switch from those secrets to a new pairing, first check that the Worker can open its saved credentials, then remove all three Muse secrets together, redeploy and run the replacement command. For a terminal session, run `npm run pair -- --replace`.

The Worker uses the standard device API at `api.muse.ai` and the encrypted Link gateway at `hatch.metaaivm.com`. If `MUSE_VM_ID` is set, registration searches only that VM. Check that the device has a lease for it. Otherwise, registration checks the default VM first, if there is one, then searches the other leased VMs until it finds the chat. When you select a registered name, the Worker checks the VM saved for that name. To search again for a chat, register the same name and session ID on the settings page. Changing `MUSE_VM_ID` switches to a separate set of chat registrations. It does not move existing registrations. [Gadget SDK device API](https://github.com/facebookincubator/muse-gadget-sdk/blob/e17081a45941415d483642dbe21c2a2e6ef85a13/linux/src/musegadget/muse_api.py)

## Send a webhook

Send `POST /v1/hooks/custom` with `HOOK_TOKEN` as the Bearer token. Use `custom` as the source name when changing pause and filter rules on the settings page.

| Input | Behavior |
| --- | --- |
| `application/json` or a `+json` subtype | Checks JSON syntax and delivers the original text, preserving integer values and whitespace. |
| `text/plain` or no Content-Type | Delivers the text as received. |
| `application/x-www-form-urlencoded` | Converts fields to an array of name/value pairs to preserve repeated field names. |
| `X-Event-Type` | Event type used by filters. Defaults to `notification`. Source names and event types are 1 to 64 characters. Start with a lowercase ASCII letter or digit. Subsequent characters can also include `_` and `-`. |
| `Idempotency-Key` | Unique event identifier within a source. Use up to 128 printable ASCII characters, excluding spaces. Omit the key to treat each POST as a new event. |

The request body and the decoded text may each be up to 32 KiB. Include only the information you intend to send to Muse. The Worker records the active destination when accepting each new event.

The built-in service endpoints accept request bodies up to 512 KiB. Each resulting notification can contain up to 32 KiB of text. They reply in the format the service expects. On the settings page, use the source name from the URL (for example, `telegram`) and the event type (for example, `edited_message`) to pause or filter notifications. [Service setup](../README.md#connect-a-service-directly)

Each source can submit 10 new events per rolling 60 seconds. Excess requests receive HTTP `429` and `Retry-After: 60`. Across all sources, the store authorizes up to three delivery attempts per rolling 60 seconds, one at a time. Retries count toward this limit. Receipt lookup and deduplication cover seven days from receipt. The next store operation applies expiry and removes old history. The limits are defined in `src/store.ts`.

## MCP tools

| Tool | Arguments and result | Access |
| --- | --- | --- |
| `begin_muse_pairing` | Returns the node ID and private sign-in steps, or the last verification result for a saved pairing. The authorization command uses `replace: true` to request replacement. | Admin |
| `create_browser_setup_link` | `sessionId` (destination side chat ID). Issues a one-use Gadget authorization link valid for ten minutes. Reset an already paired Worker first. | Admin |
| `create_settings_link` | Returns a one-use link to `/v1/setup/settings`. Open it in a browser to register or select chats and change source rules. The link and browser session expire after ten minutes. | Admin |
| `get_setup_status` | Returns `deviceConfigured`, `credentialStorageReady`, `active`, and `ready` from local configuration. An invalid `CIRCUIT_BREAKER` setting returns `ready: false` and `reason: invalid_circuit_breaker`. | Read |
| `send_test_notification` | `requestId` (UUID). Enqueues a fixed test notification for the active chat and returns its receipt. The source is `museknock-test` and the event type is `test`. | Admin |
| `list_side_chats` | Lists locally registered names and session IDs, and identifies the active destination. | Read |
| `list_sources` | No arguments. Lists sources with receipt history or delivery rules. | Read |
| `get_delivery_status` | `id` (receipt ID). Returns delivery metadata without the event body. | Read |
| `get_delivery_breaker` | Returns the global budget and attempts used by each source. | Read |
| `rearm_delivery_breaker` | `expectedGeneration`. Resets both budgets once a limit is reached and all in-flight sends finish. | Recovery |

The settings link is a temporary capability. Keep it private, open it only on your Worker URL, and submit changes yourself in the browser. The page requires a same-origin form submission and uses an HTTP-only cookie after you open the link. Registration names are case-sensitive, with 1 to 64 characters after trimming. Start with a Unicode letter or number. You may then use letters, numbers, combining marks, spaces, periods, underscores, and hyphens. Session IDs are case-sensitive and accept 1–64 ASCII letters, digits or hyphens. Registration and selection verify that the session exists on Muse before changing the destination. Use the ID of the existing side chat. An authenticated notification returns HTTP `503` until the Worker can load the pairing and has an active destination.

To rotate webhook or MCP tokens, update the corresponding Worker secrets in Cloudflare and deploy the changes. Update the sender or connector that uses each token. If your Telegram webhook secret was also used as an MCP or custom webhook token, rotate both to independent values and register the new Telegram secret with `setWebhook`.

## Optional CLI setup

With Node.js 22.12 or later, run `npm ci` and `npm run setup` in this repository to generate local Worker secrets in `.dev.vars`. Use the original encryption key for an existing Worker. Run `npx wrangler login` and `npm run deploy:local`, then check the pairing through MCP.

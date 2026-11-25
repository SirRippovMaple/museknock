# MuseKnock 运维与自定义指南

[English](operations.md) · [日本語](operations.ja.md) · **简体中文**

## 首次授权设备

首次设置时，请在目标侧边对话中让 Muse 使用 Cloudflare 连接器完成准备工作。[请求示例和浏览器授权步骤](../README.zh-CN.md#快速开始)

**如果浏览器授权失败**，请通过蓝牙授权已部署的 Worker。

1. 在支持蓝牙的 Mac 上安装 Node.js 22.12 或更高版本和 uv，打开下载的仓库中的 `Pair MuseKnock.command`。在本地配对页面输入同一个 Worker 的网址、管理令牌和 Gadget SDK 令牌，选择 **Start pairing**。
2. 在 iPhone 上使用 nRF Connect 等 BLE 读取工具连接 Mac 显示的 Gadget。打开指定的服务和特征，通过 **Write with response** 写入页面显示的一次性验证值。Mac 显示 **Phone verified** 后断开读取工具的连接。
3. 在 iPhone 上打开 Muse 的 **Settings → Devices**，启用 **Allow community devices**。在 **Add Device → Muse Gadget** 中选择同一个 Gadget，然后在 Wi-Fi 列表中选择 **Use current connection**。
4. Mac 显示 **Pairing complete** 后，请 Muse 生成设置链接，注册并选择目标侧边对话，确认该对话收到测试通知。

如果已有供此 Worker 使用的有效配对，可在 Cloudflare 的 **Settings → Variables and Secrets** 中将同一配对的 `MUSE_NODE_ID`、`MUSE_SDK_TOKEN` 和 `MUSE_REFRESH_TOKEN` 一起设为密钥并部署。通过管理 MCP 调用 `begin_muse_pairing`，返回 `configured` 后即可注册侧边对话。

命令通过 `begin_muse_pairing` 获取节点 ID，然后将节点 ID、SDK 令牌和设备刷新令牌发送给 Worker。Worker 使用 `CREDENTIAL_ENCRYPTION_KEY` 加密保存这些凭据。授权后，请 Muse 生成设置链接，再通过浏览器注册已有的侧边对话。

Worker 会先向 Muse 刷新授权命令提交的凭据，再启用配对。对于已保存的配对，`begin_muse_pairing` 返回上次刷新结果。`unverified` 表示尚未验证，`verified` 表示刷新成功，`rejected` 表示 Muse 拒绝了凭据。

## 排查未收到的通知

请 Muse 按回执 ID 查询投递状态。即使尚未配置连接器，也可以用原来的 `Idempotency-Key` 重发 Webhook，查看该通知的状态。

| 状态 | 含义与排查方法 |
| --- | --- |
| `queued` | 正在等待 Worker 投递。请检查保存的配对信息、设备授权和设备的 VM 租约。 如果 Muse 对投递返回 HTTP 429，Worker 会保留正文，在投递次数和有效期限制内重试。 |
| `sending` | Worker 已领取事件，正在连接或发送。 |
| `sent` | Muse 已确认接收。请打开 Worker 收到通知时选中的目标对话。 |
| `suppressed` | 来源规则、消息撤回或熔断器等都可能阻止投递。`message_retracted` 表示投递前 Slack 或 X 已删除原帖，或 LINE 已撤回消息。查看回执中的 `reason`，`source_open` 表示该来源已达到上限，`circuit_open` 表示已达到全局上限。 Worker 在每次发送前确认对话是否存在。回执中的 `side_chat_missing` 表示 Muse 返回了 404。在设置页面选择现有对话后即可恢复新通知的投递。已被抑制的通知不会重发。 |
| `expired` | 通知已排队一小时，超过投递期限。 |
| `unknown` | 消息可能已经发送，但 Worker 未能确认结果，或者两分钟的投递许可已经过期。发送新通知前请先查看侧边对话。 |

如果通知在提交前发送失败，Worker 在等待重试期间仍可向其他对话投递通知。如果消息可能已到达 Muse，Worker 会记录为 `unknown`，由你决定是否重发，以免因确认响应丢失而重复投递。[Gadget SDK 消息传输协议](https://github.com/facebookincubator/muse-gadget-sdk/blob/e17081a45941415d483642dbe21c2a2e6ef85a13/linux/src/musegadget/link_client.py)

每条通知都保留接收时的设备配对、VM 和会话 ID。如果更改设备配对或 VM 配置，请在过期前恢复原配置以继续投递。设备重新配对后，在设置页面注册目标对话。

## 恢复凭据加密密钥

Worker 使用 AES-256-GCM 加密保存的 Muse 设备令牌和 Bluesky 会话。请在密码管理器中备份 `CREDENTIAL_ENCRYPTION_KEY`。重新部署同一个 Worker 时请使用原密钥。如果 `get_setup_status` 返回的 `credentialStorageReady` 为 `false`，请检查 Worker 的密钥配置，并从备份中恢复原值。如果丢失原密钥，已加密的记录将无法解密。请部署使用新存储的 Worker，用重新授权的设备凭据完成首次配置。

## 更新设备授权

配对失效时，在配对页面输入同一 Worker 地址并选中 **Replace existing pairing**，然后重新注册侧边对话。事件来源和连接器继续使用原地址，待投递的通知仍属于原配对。如果在 Cloudflare 设置了三个 Muse 密钥，而只有 SDK 令牌有误，请直接更正并重新部署。如需将此配置切换为新配对，请先确认 Worker 能读取已保存的凭据，再同时移除三个 Muse 密钥，重新部署并运行替换命令。 也可在终端运行 `npm run pair -- --replace`。

Worker 使用标准设备 API `api.muse.ai` 和加密的 Link 网关 `hatch.metaaivm.com`。如果设置了 `MUSE_VM_ID`，注册时只在指定的 VM 上查找对话。请确认该 VM 已分配给设备。如果未设置，注册时会先检查默认 VM（如果有），再依次检查其他已分配给设备的 VM，直到找到对话。选择已注册的名称时，Worker 会在为该名称保存的 VM 上查找对话。如需重新查找对话，请在设置页面使用相同的名称和会话 ID 重新注册。更改 `MUSE_VM_ID` 会切换到另一组对话注册记录，不会迁移现有记录。[Gadget SDK 设备 API](https://github.com/facebookincubator/muse-gadget-sdk/blob/e17081a45941415d483642dbe21c2a2e6ef85a13/linux/src/musegadget/muse_api.py)

## 发送 Webhook

向 `POST /v1/hooks/custom` 发送请求，将 `HOOK_TOKEN` 用作 Bearer 令牌。在设置页面暂停或筛选这些通知时，来源名称为 `custom`。

| 输入 | 处理方式 |
| --- | --- |
| `application/json` 或以 `+json` 结尾的子类型 | 验证 JSON 语法并投递原文，保留整数值和空白字符。 |
| `text/plain` 或无 Content-Type | 原样投递文本。 |
| `application/x-www-form-urlencoded` | 转换为名称与值的键值对数组，以保留重复字段。 |
| `X-Event-Type` | 过滤规则使用的事件类型，默认为 `notification`。来源名称和事件类型均为 1 至 64 个字符，以小写 ASCII 字母或数字开头，后续字符还可以包含 `_` 和 `-`。 |
| `Idempotency-Key` | 同一来源内的唯一事件标识符，最多 128 个可打印的 ASCII 字符，不含空格。省略时，每个 POST 都会作为新事件处理。 |

请求正文和解码后的文本各自最多为 32 KiB。正文只应包含希望交给 Muse 的信息。Worker 接收新事件时会保存当时选中的目标会话。

服务专用接口接受的请求正文最大为 512 KiB，提取的每条通知文本最大为 32 KiB。接口按各服务要求的格式响应。在设置页面暂停或筛选通知时，可使用 URL 中的来源名称（如 `telegram`）和事件类型（如 `edited_message`）。[服务设置](../README.zh-CN.md#直接连接服务)

每个来源在滚动的 60 秒内最多提交 10 个新事件。超出限制时返回 HTTP `429` 和 `Retry-After: 60`。所有来源合计每 60 秒最多获得 3 次投递许可，同时只处理一条。重试也占用配额。自收到事件起，去重和回执查询的有效期为 7 天。下次访问存储时会更新过期状态并删除旧记录。限额定义在 `src/store.ts` 中。

## MCP 工具

| 工具 | 参数与结果 | 权限 |
| --- | --- | --- |
| `begin_muse_pairing` | 返回节点 ID 和登录步骤，或已保存配对的最近验证结果。授权命令在更换配对时使用 `replace: true`。 | 管理员 |
| `create_browser_setup_link` | `sessionId`（目标侧边对话 ID）。生成十分钟内有效、只能使用一次的 Gadget 授权链接。已配对的 Worker 需要先重置。 | 管理员 |
| `create_settings_link` | 生成一次性 `/v1/setup/settings` 链接。通过浏览器注册或选择对话，以及修改来源的暂停和过滤规则。链接和浏览器会话在十分钟后过期。 | 管理员 |
| `get_setup_status` | 根据 Worker 中的配置返回 `deviceConfigured`、`credentialStorageReady`、`active` 和 `ready`。如果 `CIRCUIT_BREAKER` 配置无效，则返回 `ready: false` 和 `reason: invalid_circuit_breaker`。 | 只读 |
| `send_test_notification` | `requestId`（UUID）。向当前目标对话排入一条固定内容的测试通知，返回回执。来源为 `museknock-test`，事件类型为 `test`。 | 管理 |
| `list_side_chats` | 列出在 MuseKnock 中注册的名称、会话 ID 和当前目标。 | 只读 |
| `list_sources` | 无参数。列出有接收记录或投递规则的来源。 | 只读 |
| `get_delivery_status` | `id`（回执 ID）。返回投递信息，不含正文。 | 只读 |
| `get_delivery_breaker` | 返回全局剩余额度和各来源的尝试次数。 | 只读 |
| `rearm_delivery_breaker` | `expectedGeneration`。达到任一上限且所有在途尝试结束后，重置全局和各来源的额度。 | 恢复 |

设置链接是短期有效的授权 URL。不要分享链接，请确认是您自己的 Worker 地址并亲自在浏览器中提交设置。打开后页面使用 HTTP-only Cookie 和同源表单提交。注册名区分大小写，去除首尾空格后长度为 1 至 64 个字符。首位使用 Unicode 字母或数字，之后还允许组合标记、空格、英文句点、下划线和连字符。会话 ID 区分大小写，允许使用 1 至 64 个 ASCII 字母、数字或连字符。注册或切换目标时，Worker 会先向 Muse 查询会话是否存在，查询过程不会发送消息。要继续原有对话，请使用该侧边对话的会话 ID。Worker 无法加载配对信息或尚未选定目标对话时，已通过身份验证的通知请求将收到 HTTP `503`。

轮换 Webhook 或 MCP 令牌时，在 Cloudflare 更新对应的 Worker 密钥并部署，再更新使用该令牌的发送端或连接器。 如果曾将 Telegram 的 Webhook 密钥用于 MCP 或通用 Webhook，请分别为两者生成新值，并通过 `setWebhook` 向 Telegram 注册新的密钥。

## 可选的 CLI 配置

使用 Node.js 22.12 或更高版本，在本仓库中运行 `npm ci` 和 `npm run setup`，在 `.dev.vars` 中生成本地 Worker 密钥。已有 Worker 需要使用原来的加密密钥。运行 `npx wrangler login` 和 `npm run deploy:local`，然后通过 MCP 检查配对状态。

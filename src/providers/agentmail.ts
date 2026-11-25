import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { parseJson, type ProviderDelivery } from '../provider.ts'
import type { WorkerEnv } from '../webhook.ts'

// AgentMail delivers webhooks through Svix. Each request carries svix-id,
// svix-timestamp and svix-signature headers; the signature is a base64
// HMAC-SHA256 over `${svix-id}.${svix-timestamp}.${raw body}` keyed with the
// base64-decoded bytes of the webhook's `whsec_` signing secret.

const address = z.union([
  z.string(),
  z.object({ name: z.string().optional(), email: z.string().optional() }),
])

const payload = z.object({
  event_id: z.string().regex(/^[!-~]{1,128}$/),
  event_type: z.string().min(1),
  message: z
    .object({
      message_id: z.string().optional(),
      inbox_id: z.string().optional(),
      from: address.optional().catch(undefined),
      subject: z.string().optional().catch(undefined),
      text: z.string().optional().catch(undefined),
      extracted_text: z.string().optional().catch(undefined),
    })
    .optional(),
})

function decodeBase64(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    const binary = atob(value)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

function formatAddress(value: z.infer<typeof address> | undefined): string | undefined {
  if (!value) return undefined
  if (typeof value === 'string') return value
  if (value.name && value.email) return `${value.name} <${value.email}>`
  return value.email ?? value.name
}

export async function agentmail(
  request: Request,
  env: WorkerEnv['Bindings'],
): Promise<ProviderDelivery> {
  const configured = env.AGENTMAIL_WEBHOOK_SECRET
  if (!configured) {
    throw new HTTPException(503, { message: 'Configure AGENTMAIL_WEBHOOK_SECRET first' })
  }
  const keyBytes = decodeBase64(configured.replace(/^whsec_/, ''))
  if (!keyBytes) {
    throw new HTTPException(503, { message: 'AGENTMAIL_WEBHOOK_SECRET is not valid base64' })
  }

  const id = request.headers.get('svix-id') ?? ''
  const timestamp = request.headers.get('svix-timestamp') ?? ''
  const signatures = (request.headers.get('svix-signature') ?? '')
    .split(' ')
    .map((part) => /^v1,(.+)$/.exec(part)?.[1])
    .filter((part): part is string => part !== undefined)
  if (
    !/^[!-~]{1,128}$/.test(id) ||
    !/^\d{1,12}$/.test(timestamp) ||
    Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > 300 ||
    !signatures.length
  ) {
    throw new HTTPException(401, { message: 'Invalid Svix signature or timestamp' })
  }

  const body = await request.arrayBuffer()
  const signed = new TextEncoder().encode(`${id}.${timestamp}.`)
  const signedBody = new Uint8Array(signed.length + body.byteLength)
  signedBody.set(signed)
  signedBody.set(new Uint8Array(body), signed.length)
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  let verified = false
  for (const signature of signatures) {
    const digest = decodeBase64(signature)
    if (digest && (await crypto.subtle.verify('HMAC', key, digest, signedBody))) {
      verified = true
      break
    }
  }
  if (!verified) throw new HTTPException(401, { message: 'Invalid Svix signature' })

  const parsed = payload.safeParse(parseJson(body))
  if (!parsed.success) throw new HTTPException(400, { message: 'Invalid AgentMail payload' })
  const response = new Response(null)
  if (parsed.data.event_type !== 'message.received' || !parsed.data.message) return { response }

  const message = parsed.data.message
  if (env.AGENTMAIL_INBOX_ID && message.inbox_id && message.inbox_id !== env.AGENTMAIL_INBOX_ID) {
    return { response }
  }
  const from = formatAddress(message.from)
  const snippet = (message.text ?? message.extracted_text ?? '').trim().slice(0, 1_000)
  const lines = [
    `New email for ${message.inbox_id ?? 'an AgentMail inbox'}`,
    ...(from ? [`From: ${from}`] : []),
    `Subject: ${message.subject ?? '(no subject)'}`,
    ...(snippet ? ['', snippet] : []),
  ]
  return {
    events: [{ key: parsed.data.event_id, type: 'message_received', text: lines.join('\n') }],
    response,
  }
}

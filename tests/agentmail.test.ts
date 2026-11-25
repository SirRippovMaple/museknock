import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { test } from 'node:test'
import { startConfiguredWorker, startWorker, waitForAssertion } from './worker.ts'

const keyBytes = Buffer.from('agentmail-test-key-bytes-for-hmac!!')
const secret = 'whsec_' + keyBytes.toString('base64')
const inboxId = 'sirrippovtheagent@agentmail.to'

function post(origin: URL, body: string, options: { id?: string; timestamp?: string; signed?: string } = {}) {
  const id = options.id ?? 'msg_test_1'
  const timestamp = options.timestamp ?? String(Math.floor(Date.now() / 1000))
  const signature = createHmac('sha256', keyBytes)
    .update(`${id}.${timestamp}.${options.signed ?? body}`)
    .digest('base64')
  return fetch(new URL('/v1/hooks/agentmail', origin), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'svix-id': id,
      'svix-timestamp': timestamp,
      'svix-signature': `v1,${signature}`,
    },
    body,
  })
}

const received = JSON.stringify({
  event_id: 'evt_test_1',
  event_type: 'message.received',
  message: {
    message_id: 'msg_1',
    inbox_id: inboxId,
    from: 'Kit <matthew-1198@agentmail.to>',
    subject: 'Hello from Kit',
    text: 'A short body worth notifying about.',
  },
})

test('AgentMail rejects bad Svix signatures and stale timestamps before parsing', async (t) => {
  const worker = await startWorker(undefined, {
    AGENTMAIL_WEBHOOK_SECRET: secret,
    AGENTMAIL_INBOX_ID: inboxId,
  })
  t.after(() => worker.close())
  assert.equal((await post(worker.url, received, { signed: received + ' ' })).status, 401)
  assert.equal(
    (await post(worker.url, received, { timestamp: String(Math.floor(Date.now() / 1000) - 3_600) })).status,
    401,
  )
  assert.equal((await post(worker.url, '{')).status, 400)
  // A valid signature reaches the delivery layer (503: no destination chat yet).
  assert.equal((await post(worker.url, received)).status, 503)
})

test('AgentMail queues message.received for the configured inbox only', async (t) => {
  const worker = await startConfiguredWorker(undefined, {
    AGENTMAIL_WEBHOOK_SECRET: secret,
    AGENTMAIL_INBOX_ID: inboxId,
  })
  t.after(() => worker.close())
  assert.equal((await post(worker.url, received)).status, 200)
  await waitForAssertion(async () => {
    const events = await worker.storedEvents()
    assert.equal(events.length, 1)
    assert.equal(events[0].key, 'evt_test_1')
    assert.equal(events[0].type, 'message_received')
    assert.match(events[0].text, /New email for sirrippovtheagent@agentmail\.to/)
    assert.match(events[0].text, /From: Kit <matthew-1198@agentmail\.to>/)
    assert.match(events[0].text, /Subject: Hello from Kit/)
    assert.match(events[0].text, /A short body worth notifying about\./)
  })
  // Other inboxes and other event types are acknowledged without queueing.
  const otherInbox = JSON.stringify({
    event_id: 'evt_test_2',
    event_type: 'message.received',
    message: { inbox_id: 'someone-else@agentmail.to', subject: 'Not yours' },
  })
  assert.equal((await post(worker.url, otherInbox, { id: 'msg_test_2' })).status, 200)
  const sent = JSON.stringify({ event_id: 'evt_test_3', event_type: 'message.sent', message: { inbox_id: inboxId } })
  assert.equal((await post(worker.url, sent, { id: 'msg_test_3' })).status, 200)
  assert.equal((await worker.storedEvents()).length, 1)
})

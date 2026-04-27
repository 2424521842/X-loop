import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { createApiTestContext } from './helpers/api.js'

let ctx
let User
let Message

async function createUser(attrs = {}) {
  return User.create({
    email: attrs.email || `user-${Date.now()}@student.xjtlu.edu.cn`,
    nickName: attrs.nickName || 'TestUser',
    avatarUrl: attrs.avatarUrl || '',
    emailVerified: true,
    ...attrs
  })
}

function conversationId(a, b) {
  return [String(a), String(b)].sort().join('_')
}

describe('messages API', () => {
  beforeAll(async () => {
    ctx = await createApiTestContext()
    User = ctx.models.User
    Message = ctx.models.Message
  })

  beforeEach(() => ctx.clear())

  it('POST /api/messages writes correct conversationId (sorted)', async () => {
    const a = await createUser({ email: 'a@student.xjtlu.edu.cn' })
    const b = await createUser({ email: 'b@student.xjtlu.edu.cn' })

    const res = await ctx.request
      .post('/api/messages')
      .set('Authorization', `Bearer ${ctx.tokenFor(a)}`)
      .send({ toUserId: String(b._id), content: '你好' })

    expect(res.status).toBe(200)
    expect(res.body.data.conversationId).toBe(conversationId(a._id, b._id))
  })

  it('GET conversations aggregates unread count correctly', async () => {
    const me = await createUser({ email: 'me@student.xjtlu.edu.cn' })
    const other = await createUser({ email: 'other@student.xjtlu.edu.cn', nickName: 'Other' })
    const third = await createUser({ email: 'third@student.xjtlu.edu.cn' })

    await Message.create({ conversationId: conversationId(me._id, other._id), fromUserId: other._id, toUserId: me._id, content: '1' })
    await Message.create({ conversationId: conversationId(me._id, other._id), fromUserId: other._id, toUserId: me._id, content: '2' })
    await Message.create({ conversationId: conversationId(me._id, other._id), fromUserId: me._id, toUserId: other._id, content: '3' })
    await Message.create({ conversationId: conversationId(me._id, third._id), fromUserId: third._id, toUserId: me._id, content: '4' })

    const res = await ctx.request
      .get('/api/messages/conversations')
      .set('Authorization', `Bearer ${ctx.tokenFor(me)}`)

    expect(res.status).toBe(200)
    const item = res.body.data.items.find(entry => entry.otherUserId === String(other._id))
    expect(item.unread).toBe(2)
    expect(item.otherUserNick).toBe('Other')
  })

  it('GET /:userId returns messages, since cursor works', async () => {
    const me = await createUser({ email: 'me@student.xjtlu.edu.cn' })
    const other = await createUser({ email: 'other@student.xjtlu.edu.cn' })
    const cid = conversationId(me._id, other._id)
    const first = await Message.create({ conversationId: cid, fromUserId: me._id, toUserId: other._id, content: 'first' })
    const second = await Message.create({ conversationId: cid, fromUserId: other._id, toUserId: me._id, content: 'second' })

    const allRes = await ctx.request
      .get(`/api/messages/${other._id}`)
      .set('Authorization', `Bearer ${ctx.tokenFor(me)}`)

    expect(allRes.status).toBe(200)
    expect(allRes.body.data.messages.map(item => item.content)).toEqual(['first', 'second'])

    const third = await Message.create({ conversationId: cid, fromUserId: other._id, toUserId: me._id, content: 'third' })
    const sinceRes = await ctx.request
      .get(`/api/messages/${other._id}?since=${second._id}`)
      .set('Authorization', `Bearer ${ctx.tokenFor(me)}`)

    expect(first).toBeTruthy()
    expect(third).toBeTruthy()
    expect(sinceRes.status).toBe(200)
    expect(sinceRes.body.data.messages.map(item => item.content)).toEqual(['third'])
  })

  it("Other party's messages to me are marked read after fetch", async () => {
    const me = await createUser({ email: 'me@student.xjtlu.edu.cn' })
    const other = await createUser({ email: 'other@student.xjtlu.edu.cn' })
    const message = await Message.create({
      conversationId: conversationId(me._id, other._id),
      fromUserId: other._id,
      toUserId: me._id,
      content: 'unread',
      read: false
    })

    const res = await ctx.request
      .get(`/api/messages/${other._id}`)
      .set('Authorization', `Bearer ${ctx.tokenFor(me)}`)

    expect(res.status).toBe(200)
    expect(message.read).toBe(true)
  })

  it('Cross-conversation messages do not bleed into each other', async () => {
    const me = await createUser({ email: 'me@student.xjtlu.edu.cn' })
    const other = await createUser({ email: 'other@student.xjtlu.edu.cn' })
    const third = await createUser({ email: 'third@student.xjtlu.edu.cn' })
    await Message.create({ conversationId: conversationId(me._id, other._id), fromUserId: me._id, toUserId: other._id, content: 'only other' })
    await Message.create({ conversationId: conversationId(me._id, third._id), fromUserId: third._id, toUserId: me._id, content: 'third message' })

    const res = await ctx.request
      .get(`/api/messages/${other._id}`)
      .set('Authorization', `Bearer ${ctx.tokenFor(me)}`)

    expect(res.status).toBe(200)
    expect(res.body.data.messages).toHaveLength(1)
    expect(res.body.data.messages[0].content).toBe('only other')
  })

  it('Content filter blocks message', async () => {
    const me = await createUser({ email: 'me@student.xjtlu.edu.cn' })
    const other = await createUser({ email: 'other@student.xjtlu.edu.cn' })

    const res = await ctx.request
      .post('/api/messages')
      .set('Authorization', `Bearer ${ctx.tokenFor(me)}`)
      .send({ toUserId: String(other._id), content: '破解工具' })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe(-1)
  })
})

import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { createApiTestContext } from './helpers/api.js'

let ctx
let User
let Product
let Order
let Message

async function createUser(attrs = {}) {
  return User.create({
    email: attrs.email || `user-${Date.now()}@student.xjtlu.edu.cn`,
    nickName: attrs.nickName || 'TestUser',
    emailVerified: true,
    ...attrs
  })
}

async function createProductFor(seller, attrs = {}) {
  return Product.create({
    sellerId: seller._id,
    title: attrs.title || '测试商品',
    price: attrs.price === undefined ? 100 : attrs.price,
    category: attrs.category || '图书',
    status: attrs.status || 'on_sale',
    ...attrs
  })
}

describe('orders API', () => {
  beforeAll(async () => {
    ctx = await createApiTestContext()
    User = ctx.models.User
    Product = ctx.models.Product
    Order = ctx.models.Order
    Message = ctx.models.Message
  })

  beforeEach(() => ctx.clear())

  it('POST /api/orders creates pending reservation invite without reserving product', async () => {
    const seller = await createUser({ email: 'seller@student.xjtlu.edu.cn' })
    const buyer = await createUser({ email: 'buyer@student.xjtlu.edu.cn' })
    const product = await createProductFor(seller, { price: 88 })

    const res = await ctx.request
      .post('/api/orders')
      .set('Authorization', `Bearer ${ctx.tokenFor(buyer)}`)
      .send({ productId: String(product._id) })

    expect(res.status).toBe(200)
    expect(res.body.data.price).toBe(88)
    expect(res.body.data.status).toBe('pending')
    expect(product.status).toBe('on_sale')
    const invite = await Message.findOne({ orderId: res.body.data.id, type: 'reservation' })
    expect(invite.content).toBe('发起了预定邀请')
  })

  it('Cannot buy own product', async () => {
    const seller = await createUser()
    const product = await createProductFor(seller)

    const res = await ctx.request
      .post('/api/orders')
      .set('Authorization', `Bearer ${ctx.tokenFor(seller)}`)
      .send({ productId: String(product._id) })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe(-1)
  })

  it('pending→confirmed (seller), then confirmed→completed → product becomes sold', async () => {
    const seller = await createUser({ email: 'seller@student.xjtlu.edu.cn' })
    const buyer = await createUser({ email: 'buyer@student.xjtlu.edu.cn' })
    const product = await createProductFor(seller)

    const orderRes = await ctx.request
      .post('/api/orders')
      .set('Authorization', `Bearer ${ctx.tokenFor(buyer)}`)
      .send({ productId: String(product._id) })
    const orderId = orderRes.body.data.id

    const confirmRes = await ctx.request
      .patch(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${ctx.tokenFor(seller)}`)
      .send({ status: 'confirmed' })

    expect(confirmRes.status).toBe(200)
    expect(confirmRes.body.data.status).toBe('confirmed')
    expect(product.status).toBe('reserved')
    expect(String(product.reservedOrderId)).toBe(orderId)

    const completeRes = await ctx.request
      .patch(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${ctx.tokenFor(buyer)}`)
      .send({ status: 'completed' })

    expect(completeRes.status).toBe(200)
    expect(completeRes.body.data.status).toBe('completed')
    expect(product.status).toBe('sold')
    expect(product.reservedOrderId).toBe(null)
  })

  it('seller rejects pending reservation invite without changing product status', async () => {
    const seller = await createUser({ email: 'seller@student.xjtlu.edu.cn' })
    const buyer = await createUser({ email: 'buyer@student.xjtlu.edu.cn' })
    const product = await createProductFor(seller)
    const orderRes = await ctx.request
      .post('/api/orders')
      .set('Authorization', `Bearer ${ctx.tokenFor(buyer)}`)
      .send({ productId: String(product._id) })
    const orderId = orderRes.body.data.id

    const res = await ctx.request
      .patch(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${ctx.tokenFor(seller)}`)
      .send({ status: 'cancelled' })

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('cancelled')
    expect(res.body.data.cancelReason).toBe('seller_rejected')
    expect(product.status).toBe('on_sale')
  })

  it('accepting one reservation invalidates other pending invites', async () => {
    const seller = await createUser({ email: 'seller@student.xjtlu.edu.cn' })
    const buyerA = await createUser({ email: 'buyer-a@student.xjtlu.edu.cn' })
    const buyerB = await createUser({ email: 'buyer-b@student.xjtlu.edu.cn' })
    const product = await createProductFor(seller)

    const inviteA = await ctx.request
      .post('/api/orders')
      .set('Authorization', `Bearer ${ctx.tokenFor(buyerA)}`)
      .send({ productId: String(product._id) })
    const inviteB = await ctx.request
      .post('/api/orders')
      .set('Authorization', `Bearer ${ctx.tokenFor(buyerB)}`)
      .send({ productId: String(product._id) })

    const confirmRes = await ctx.request
      .patch(`/api/orders/${inviteA.body.data.id}`)
      .set('Authorization', `Bearer ${ctx.tokenFor(seller)}`)
      .send({ status: 'confirmed' })

    expect(confirmRes.status).toBe(200)
    const otherOrder = await Order.findById(inviteB.body.data.id)
    expect(otherOrder.status).toBe('cancelled')
    expect(otherOrder.cancelReason).toBe('product_reserved_elsewhere')
  })

  it('Non-participant PATCH rejected (403)', async () => {
    const seller = await createUser({ email: 'seller@student.xjtlu.edu.cn' })
    const buyer = await createUser({ email: 'buyer@student.xjtlu.edu.cn' })
    const outsider = await createUser({ email: 'outsider@student.xjtlu.edu.cn' })
    const product = await createProductFor(seller)
    const order = await Order.create({ productId: product._id, buyerId: buyer._id, sellerId: seller._id, price: product.price })

    const res = await ctx.request
      .patch(`/api/orders/${order._id}`)
      .set('Authorization', `Bearer ${ctx.tokenFor(outsider)}`)
      .send({ status: 'confirmed' })

    expect(res.status).toBe(403)
    expect(res.body.code).toBe(-1)
  })

  it('Cannot order non-on_sale product', async () => {
    const seller = await createUser({ email: 'seller@student.xjtlu.edu.cn' })
    const buyer = await createUser({ email: 'buyer@student.xjtlu.edu.cn' })
    const product = await createProductFor(seller, { status: 'reserved' })

    const res = await ctx.request
      .post('/api/orders')
      .set('Authorization', `Bearer ${ctx.tokenFor(buyer)}`)
      .send({ productId: String(product._id) })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe(-1)
  })
})

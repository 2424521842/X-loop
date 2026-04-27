import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { createApiTestContext } from './helpers/api.js'

let ctx
let User
let Product
let Order

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
  })

  beforeEach(() => ctx.clear())

  it('POST /api/orders succeeds, product.status becomes reserved', async () => {
    const seller = await createUser({ email: 'seller@student.xjtlu.edu.cn' })
    const buyer = await createUser({ email: 'buyer@student.xjtlu.edu.cn' })
    const product = await createProductFor(seller, { price: 88 })

    const res = await ctx.request
      .post('/api/orders')
      .set('Authorization', `Bearer ${ctx.tokenFor(buyer)}`)
      .send({ productId: String(product._id) })

    expect(res.status).toBe(200)
    expect(res.body.data.price).toBe(88)
    expect(product.status).toBe('reserved')
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

    const completeRes = await ctx.request
      .patch(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${ctx.tokenFor(buyer)}`)
      .send({ status: 'completed' })

    expect(completeRes.status).toBe(200)
    expect(completeRes.body.data.status).toBe('completed')
    expect(product.status).toBe('sold')
  })

  it('pending→cancelled → product returns to on_sale', async () => {
    const seller = await createUser({ email: 'seller@student.xjtlu.edu.cn' })
    const buyer = await createUser({ email: 'buyer@student.xjtlu.edu.cn' })
    const product = await createProductFor(seller)
    const order = await Order.create({
      productId: product._id,
      buyerId: buyer._id,
      sellerId: seller._id,
      price: product.price,
      status: 'pending'
    })
    product.status = 'reserved'

    const res = await ctx.request
      .patch(`/api/orders/${order._id}`)
      .set('Authorization', `Bearer ${ctx.tokenFor(buyer)}`)
      .send({ status: 'cancelled' })

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('cancelled')
    expect(product.status).toBe('on_sale')
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

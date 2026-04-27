import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { createApiTestContext } from './helpers/api.js'

let ctx
let User
let Product
let Order
let Review

async function createUser(attrs = {}) {
  return User.create({
    email: attrs.email || `user-${Date.now()}@student.xjtlu.edu.cn`,
    nickName: attrs.nickName || 'TestUser',
    emailVerified: true,
    ...attrs
  })
}

async function createCompletedOrder({ sellerCredit = 80, status = 'completed' } = {}) {
  const seller = await createUser({ email: `seller-${ctx.objectId()}@student.xjtlu.edu.cn`, credit: sellerCredit })
  const buyer = await createUser({ email: `buyer-${ctx.objectId()}@student.xjtlu.edu.cn` })
  const product = await Product.create({ sellerId: seller._id, title: '商品', price: 100, category: '图书', status: 'sold' })
  const order = await Order.create({
    productId: product._id,
    buyerId: buyer._id,
    sellerId: seller._id,
    price: product.price,
    status
  })
  return { seller, buyer, product, order }
}

describe('reviews API', () => {
  beforeAll(async () => {
    ctx = await createApiTestContext()
    User = ctx.models.User
    Product = ctx.models.Product
    Order = ctx.models.Order
    Review = ctx.models.Review
  })

  beforeEach(() => ctx.clear())

  it('Can review completed order', async () => {
    const { buyer, order } = await createCompletedOrder()

    const res = await ctx.request
      .post('/api/reviews')
      .set('Authorization', `Bearer ${ctx.tokenFor(buyer)}`)
      .send({ orderId: String(order._id), rating: 5, content: '交易顺利' })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.rating).toBe(5)
    expect(await Review.findOne({ orderId: order._id })).toBeTruthy()
  })

  it('Rejected if order not completed', async () => {
    const { buyer, order } = await createCompletedOrder({ status: 'pending' })

    const res = await ctx.request
      .post('/api/reviews')
      .set('Authorization', `Bearer ${ctx.tokenFor(buyer)}`)
      .send({ orderId: String(order._id), rating: 5, content: '还没完成' })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe(-1)
  })

  it('Duplicate review rejected', async () => {
    const { buyer, order } = await createCompletedOrder()
    await ctx.request
      .post('/api/reviews')
      .set('Authorization', `Bearer ${ctx.tokenFor(buyer)}`)
      .send({ orderId: String(order._id), rating: 5, content: '第一次' })

    const res = await ctx.request
      .post('/api/reviews')
      .set('Authorization', `Bearer ${ctx.tokenFor(buyer)}`)
      .send({ orderId: String(order._id), rating: 4, content: '第二次' })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe(-1)
  })

  it('Credit delta correct (rating 5 → +2, rating 1 → -5)', async () => {
    const first = await createCompletedOrder({ sellerCredit: 80 })
    await ctx.request
      .post('/api/reviews')
      .set('Authorization', `Bearer ${ctx.tokenFor(first.buyer)}`)
      .send({ orderId: String(first.order._id), rating: 5, content: '很好' })
    expect(first.seller.credit).toBe(82)

    const second = await createCompletedOrder({ sellerCredit: 80 })
    await ctx.request
      .post('/api/reviews')
      .set('Authorization', `Bearer ${ctx.tokenFor(second.buyer)}`)
      .send({ orderId: String(second.order._id), rating: 1, content: '不好' })
    expect(second.seller.credit).toBe(75)
  })
})

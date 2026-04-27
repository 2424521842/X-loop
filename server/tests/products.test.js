import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { createApiTestContext } from './helpers/api.js'

let ctx
let User
let Product

async function createUser(attrs = {}) {
  return User.create({
    email: attrs.email || `user-${Date.now()}@student.xjtlu.edu.cn`,
    nickName: attrs.nickName || 'TestUser',
    emailVerified: true,
    ...attrs
  })
}

describe('products API', () => {
  beforeAll(async () => {
    ctx = await createApiTestContext()
    User = ctx.models.User
    Product = ctx.models.Product
  })

  beforeEach(() => ctx.clear())

  it('POST /api/products creates product', async () => {
    const seller = await createUser({ email: 'seller@student.xjtlu.edu.cn' })
    const res = await ctx.request
      .post('/api/products')
      .set('Authorization', `Bearer ${ctx.tokenFor(seller)}`)
      .send({
        title: '二手台灯',
        description: '宿舍使用正常',
        images: ['https://example.com/lamp.jpg'],
        price: 35,
        category: '生活用品'
      })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.title).toBe('二手台灯')
    expect(res.body.data.status).toBe('on_sale')
    expect(res.body.data.sellerId).toBe(String(seller._id))
  })

  it('GET /api/products lists on_sale products', async () => {
    const seller = await createUser()
    await Product.create({ sellerId: seller._id, title: '在售商品', price: 10, category: '图书', status: 'on_sale' })
    await Product.create({ sellerId: seller._id, title: '已售商品', price: 20, category: '图书', status: 'sold' })

    const res = await ctx.request.get('/api/products')

    expect(res.status).toBe(200)
    expect(res.body.data.items).toHaveLength(1)
    expect(res.body.data.items[0].title).toBe('在售商品')
  })

  it('GET /api/products/search?q= returns matching results', async () => {
    const seller = await createUser()
    await Product.create({ sellerId: seller._id, title: 'MacBook Air', description: 'M2 版本', price: 6000, category: '电子产品' })
    await Product.create({ sellerId: seller._id, title: '自行车', description: '九成新', price: 300, category: '交通' })

    const res = await ctx.request.get('/api/products/search?q=macbook')

    expect(res.status).toBe(200)
    expect(res.body.data.items).toHaveLength(1)
    expect(res.body.data.items[0].title).toBe('MacBook Air')
  })

  it('GET /api/products/:id increments viewCount', async () => {
    const seller = await createUser({ nickName: 'Seller' })
    const product = await Product.create({ sellerId: seller._id, title: '显示器', price: 500, category: '电子产品' })

    const res = await ctx.request.get(`/api/products/${product._id}`)

    expect(res.status).toBe(200)
    expect(res.body.data.viewCount).toBe(1)
    expect(product.viewCount).toBe(1)
    expect(res.body.data.seller.nickName).toBe('Seller')
  })

  it('PATCH /api/products/:id rejected for non-owner', async () => {
    const seller = await createUser({ email: 'owner@student.xjtlu.edu.cn' })
    const other = await createUser({ email: 'other@student.xjtlu.edu.cn' })
    const product = await Product.create({ sellerId: seller._id, title: '键盘', price: 100, category: '电子产品' })

    const res = await ctx.request
      .patch(`/api/products/${product._id}`)
      .set('Authorization', `Bearer ${ctx.tokenFor(other)}`)
      .send({ price: 80 })

    expect(res.status).toBe(403)
    expect(res.body.code).toBe(-1)
  })

  it('POST /api/products blocked by content filter', async () => {
    const seller = await createUser()
    const res = await ctx.request
      .post('/api/products')
      .set('Authorization', `Bearer ${ctx.tokenFor(seller)}`)
      .send({
        title: '破解软件',
        price: 10,
        category: '电子产品'
      })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe(-1)
  })
})

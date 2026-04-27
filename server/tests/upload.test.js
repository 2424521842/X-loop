import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { createApiTestContext } from './helpers/api.js'

let ctx
let User

describe('upload API', () => {
  beforeAll(async () => {
    ctx = await createApiTestContext()
    User = ctx.models.User
  })

  beforeEach(() => ctx.clear())

  it('Unauthenticated → 401', async () => {
    const res = await ctx.request
      .post('/api/upload/sign')
      .send({ folder: 'products' })

    expect(res.status).toBe(401)
    expect(res.body.code).toBe(-1)
  })

  it('Authenticated → returns cloudName and uploadPreset', async () => {
    const user = await User.create({
      email: 'upload@student.xjtlu.edu.cn',
      nickName: 'Uploader',
      emailVerified: true
    })

    const res = await ctx.request
      .post('/api/upload/sign')
      .set('Authorization', `Bearer ${ctx.tokenFor(user)}`)
      .send({ folder: 'products' })

    expect(res.status).toBe(200)
    expect(res.body.data.cloudName).toBe('test-cloud')
    expect(res.body.data.uploadPreset).toBe('test-preset')
    expect(res.body.data.folder).toBe('products')
  })
})

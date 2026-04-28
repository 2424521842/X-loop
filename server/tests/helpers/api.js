import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { EventEmitter } from 'node:events'
import { PassThrough, Readable } from 'node:stream'

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-vitest'
process.env.EMAIL_DEV_MODE = 'true'
process.env.EMAIL_CODE_SALT = 'test-salt'
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud'
process.env.CLOUDINARY_UPLOAD_PRESET = 'test-preset'

export function createLocalRequest(target) {
  return {
    get: path => new LocalRequest(target, 'GET', path),
    post: path => new LocalRequest(target, 'POST', path),
    patch: path => new LocalRequest(target, 'PATCH', path)
  }
}

class LocalRequest {
  constructor(target, method, path) {
    this.target = target
    this.method = method
    this.path = path
    this.headers = {}
    this.body = undefined
    this.promise = null
  }

  set(name, value) {
    if (typeof name === 'object') {
      Object.entries(name).forEach(([key, item]) => this.set(key, item))
      return this
    }
    this.headers[name.toLowerCase()] = value
    return this
  }

  send(body) {
    this.body = body
    return this
  }

  then(onFulfilled, onRejected) {
    return this.execute().then(onFulfilled, onRejected)
  }

  catch(onRejected) {
    return this.execute().catch(onRejected)
  }

  execute() {
    if (!this.promise) {
      this.promise = dispatchLocalRequest(this.target, this.method, this.path, this.headers, this.body)
    }
    return this.promise
  }
}

function dispatchLocalRequest(target, method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? '' : JSON.stringify(body)
    const req = new Readable({
      read() {
        this.push(payload)
        this.push(null)
      }
    })
    req.method = method
    req.url = path
    req.headers = {
      host: '127.0.0.1',
      ...headers
    }
    if (payload) {
      req.headers['content-type'] = req.headers['content-type'] || 'application/json'
      req.headers['content-length'] = Buffer.byteLength(payload)
    }
    const socket = new PassThrough()
    socket.remoteAddress = '127.0.0.1'
    req.socket = socket
    req.connection = req.socket

    const chunks = []
    const res = new EventEmitter()
    res.statusCode = 200
    res.headersSent = false
    res.locals = {}
    res.headers = {}
    res.setHeader = (name, value) => {
      res.headers[name.toLowerCase()] = value
    }
    res.getHeader = name => res.headers[name.toLowerCase()]
    res.getHeaders = () => ({ ...res.headers })
    res.removeHeader = name => {
      delete res.headers[name.toLowerCase()]
    }
    res.writeHead = (statusCode, headerMap = {}) => {
      res.statusCode = statusCode
      Object.entries(headerMap).forEach(([name, value]) => res.setHeader(name, value))
    }
    res.write = chunk => {
      if (chunk) chunks.push(Buffer.from(chunk))
    }
    res.end = chunk => {
      if (chunk) chunks.push(Buffer.from(chunk))
      res.headersSent = true
      const text = Buffer.concat(chunks).toString()
      let parsedBody = {}
      try {
        parsedBody = text ? JSON.parse(text) : {}
      } catch (err) {
        parsedBody = text
      }
      resolve({
        status: res.statusCode,
        statusCode: res.statusCode,
        headers: res.headers,
        text,
        body: parsedBody
      })
    }

    try {
      target.handle(req, res, reject)
    } catch (err) {
      reject(err)
    }
  })
}

function clonePlain(value) {
  if (value instanceof Date) return new Date(value)
  if (Array.isArray(value)) return value.map(item => clonePlain(item))
  if (value && typeof value === 'object') {
    if (value._bsontype) return value
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== 'save' && key !== 'populate')
        .map(([key, item]) => [key, clonePlain(item)])
    )
  }
  return value
}

function attachDoc(data, stores, modelName) {
  Object.defineProperty(data, 'toObject', {
    enumerable: false,
    value() {
      return clonePlain(data)
    }
  })
  Object.defineProperty(data, 'save', {
    enumerable: false,
    async value() {
      data.updatedAt = new Date()
      return data
    }
  })
  if (modelName === 'Product') {
    Object.defineProperty(data, 'populate', {
      enumerable: false,
      async value(path) {
        if (path === 'sellerId') {
          const seller = stores.users.find(item => sameId(item._id, data.sellerId))
          if (seller) data.sellerId = seller
        }
        return data
      }
    })
  }
  return data
}

function now() {
  return new Date()
}

function createDoc(modelName, data, stores) {
  const createdAt = data.createdAt || now()
  const base = {
    _id: data._id || new mongoose.Types.ObjectId(),
    createdAt,
    updatedAt: data.updatedAt || createdAt
  }

  if (modelName === 'User') {
    return attachDoc({
      ...base,
      email: String(data.email || '').trim().toLowerCase(),
      nickName: data.nickName || '',
      avatarUrl: data.avatarUrl || '',
      campus: data.campus || '',
      credit: data.credit === undefined ? 100 : data.credit,
      status: data.status || 'active',
      emailVerified: !!data.emailVerified,
      emailVerifiedAt: data.emailVerifiedAt || null
    }, stores, modelName)
  }

  if (modelName === 'Product') {
    return attachDoc({
      ...base,
      sellerId: data.sellerId,
      title: data.title,
      description: data.description || '',
      images: data.images || [],
      price: data.price,
      category: data.category,
      campus: data.campus || '',
      status: data.status || 'on_sale',
      reservedOrderId: data.reservedOrderId || null,
      viewCount: data.viewCount || 0
    }, stores, modelName)
  }

  if (modelName === 'Order') {
    return attachDoc({
      ...base,
      productId: data.productId,
      buyerId: data.buyerId,
      sellerId: data.sellerId,
      status: data.status || 'pending',
      cancelReason: data.cancelReason || '',
      buyerReviewed: !!data.buyerReviewed,
      sellerReviewed: !!data.sellerReviewed,
      price: data.price
    }, stores, modelName)
  }

  if (modelName === 'Review') {
    return attachDoc({
      ...base,
      orderId: data.orderId,
      fromUserId: data.fromUserId,
      toUserId: data.toUserId,
      rating: data.rating,
      content: data.content || ''
    }, stores, modelName)
  }

  if (modelName === 'Message') {
    return attachDoc({
      ...base,
      conversationId: data.conversationId,
      fromUserId: data.fromUserId,
      toUserId: data.toUserId,
      productId: data.productId || null,
      orderId: data.orderId || null,
      content: data.content,
      type: data.type || 'text',
      read: data.read === undefined ? false : data.read
    }, stores, modelName)
  }

  return attachDoc(base, stores, modelName)
}

function sameId(a, b) {
  return String(a) === String(b)
}

function getByPath(target, path) {
  return path.split('.').reduce((current, part) => current && current[part], target)
}

function setByPath(target, path, value) {
  const parts = path.split('.')
  const last = parts.pop()
  const parent = parts.reduce((current, part) => {
    if (!current[part] || typeof current[part] !== 'object') current[part] = {}
    return current[part]
  }, target)
  parent[last] = value
}

function matchesQuery(doc, query = {}) {
  return Object.entries(query).every(([key, expected]) => {
    if (key === '$or') {
      return expected.some(item => matchesQuery(doc, item))
    }

    const actual = getByPath(doc, key)
    if (expected instanceof RegExp) {
      return expected.test(String(actual || ''))
    }
    if (expected && typeof expected === 'object' && !(expected instanceof Date) && !expected._bsontype) {
      if (expected.$gt !== undefined) {
        return String(actual) > String(expected.$gt)
      }
      if (expected.$gte !== undefined) {
        return actual >= expected.$gte
      }
      if (expected.$in !== undefined) {
        return expected.$in.some(item => sameId(actual, item))
      }
      if (expected.$ne !== undefined) {
        return !sameId(actual, expected.$ne)
      }
    }
    return sameId(actual, expected)
  })
}

function applyUpdate(doc, update) {
  if (!doc || !update) return

  const operatorUpdate = Object.keys(update).some(key => key.startsWith('$'))
  if (!operatorUpdate) {
    Object.entries(update).forEach(([key, value]) => setByPath(doc, key, value))
  }
  if (update.$set) {
    Object.entries(update.$set).forEach(([key, value]) => setByPath(doc, key, value))
  }
  if (update.$inc) {
    Object.entries(update.$inc).forEach(([key, value]) => {
      setByPath(doc, key, (getByPath(doc, key) || 0) + value)
    })
  }
  if (update.$unset) {
    Object.keys(update.$unset).forEach((key) => setByPath(doc, key, null))
  }
  doc.updatedAt = now()
}

class LocalQuery {
  constructor(records, query, stores, modelName) {
    this.records = records
    this.query = query
    this.stores = stores
    this.modelName = modelName
    this.sortSpec = null
    this.skipCount = 0
    this.limitCount = null
    this.populateSpec = []
  }

  sort(spec) {
    this.sortSpec = spec
    return this
  }

  skip(count) {
    this.skipCount = count
    return this
  }

  limit(count) {
    this.limitCount = count
    return this
  }

  populate(spec) {
    this.populateSpec.push(spec)
    return this
  }

  exec() {
    let result = this.records.filter(item => matchesQuery(item, this.query))

    if (this.sortSpec) {
      const [[field, direction]] = Object.entries(this.sortSpec)
      result = result.slice().sort((a, b) => {
        const left = getByPath(a, field)
        const right = getByPath(b, field)
        if (left < right) return -1 * direction
        if (left > right) return 1 * direction
        return 0
      })
    }

    if (this.skipCount) {
      result = result.slice(this.skipCount)
    }
    if (this.limitCount !== null) {
      result = result.slice(0, this.limitCount)
    }

    if (this.populateSpec.length) {
      result = result.map(item => this.populateSpec.reduce((doc, spec) => {
        return populateDoc(doc, spec, this.stores, this.modelName)
      }, item))
    }

    return result
  }

  then(onFulfilled, onRejected) {
    return Promise.resolve(this.exec()).then(onFulfilled, onRejected)
  }

  catch(onRejected) {
    return Promise.resolve(this.exec()).catch(onRejected)
  }
}

function populateDoc(doc, spec, stores, modelName) {
  const path = typeof spec === 'string' ? spec : spec.path
  const copy = attachDoc(clonePlain(doc), stores, modelName)

  if (path === 'productId') {
    const product = stores.products.find(item => sameId(item._id, doc.productId))
    if (product) copy.productId = clonePlain(product)
  }
  if (path === 'fromUserId') {
    const user = stores.users.find(item => sameId(item._id, doc.fromUserId))
    if (user) copy.fromUserId = clonePlain(user)
  }
  if (path === 'buyerId') {
    const user = stores.users.find(item => sameId(item._id, doc.buyerId))
    if (user) copy.buyerId = clonePlain(user)
  }
  if (path === 'sellerId') {
    const user = stores.users.find(item => sameId(item._id, doc.sellerId))
    if (user) copy.sellerId = clonePlain(user)
  }
  if (path === 'orderId') {
    const order = stores.orders.find(item => sameId(item._id, doc.orderId))
    if (order) copy.orderId = clonePlain(order)
  }

  return copy
}

function installModel(Model, records, stores, modelName) {
  Model.create = async (data) => {
    const doc = createDoc(modelName, data, stores)
    records.push(doc)
    return doc
  }
  Model.find = (query = {}) => new LocalQuery(records, query, stores, modelName)
  Model.findOne = async (query = {}) => records.find(item => matchesQuery(item, query)) || null
  Model.findById = async (id) => records.find(item => sameId(item._id, id)) || null
  Model.findOneAndUpdate = async (query, update) => {
    const doc = records.find(item => matchesQuery(item, query))
    applyUpdate(doc, update)
    return doc || null
  }
  Model.findByIdAndUpdate = async (id, update) => {
    const doc = records.find(item => sameId(item._id, id))
    applyUpdate(doc, update)
    return doc || null
  }
  Model.updateMany = async (query, update) => {
    const matched = records.filter(item => matchesQuery(item, query))
    matched.forEach(item => applyUpdate(item, update))
    return { matchedCount: matched.length, modifiedCount: matched.length }
  }
  Model.deleteMany = async () => {
    records.splice(0, records.length)
  }
}

function installMessageAggregate(Message, stores) {
  Message.aggregate = async (pipeline) => {
    const me = pipeline[0].$match.$or[0].fromUserId
    const relevant = stores.messages
      .filter(item => sameId(item.fromUserId, me) || sameId(item.toUserId, me))
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)

    const grouped = new Map()
    for (const message of relevant) {
      if (!grouped.has(message.conversationId)) {
        grouped.set(message.conversationId, {
          latest: message,
          unread: 0
        })
      }
      if (sameId(message.toUserId, me) && message.read === false) {
        grouped.get(message.conversationId).unread += 1
      }
    }

    return Array.from(grouped.entries())
      .map(([conversationId, group]) => {
        const otherUserId = sameId(group.latest.fromUserId, me) ? group.latest.toUserId : group.latest.fromUserId
        const otherUser = stores.users.find(item => sameId(item._id, otherUserId))
        return {
          conversationId,
          otherUser: {
            id: String(otherUserId),
            nickName: otherUser ? otherUser.nickName : '',
            avatarUrl: otherUser ? otherUser.avatarUrl : ''
          },
          lastMessage: {
            id: String(group.latest._id),
            content: group.latest.content,
            type: group.latest.type,
            createdAt: group.latest.createdAt,
            fromUserId: String(group.latest.fromUserId)
          },
          productId: group.latest.productId ? String(group.latest.productId) : null,
          unread: group.unread
        }
      })
      .sort((a, b) => b.lastMessage.createdAt - a.lastMessage.createdAt)
  }
}

export async function createApiTestContext() {
  const appMod = await import('../../src/app.js')
  const User = (await import('../../src/models/User.js')).default
  const Product = (await import('../../src/models/Product.js')).default
  const Order = (await import('../../src/models/Order.js')).default
  const Review = (await import('../../src/models/Review.js')).default
  const Message = (await import('../../src/models/Message.js')).default

  const stores = {
    users: [],
    products: [],
    orders: [],
    reviews: [],
    messages: []
  }

  installModel(User, stores.users, stores, 'User')
  installModel(Product, stores.products, stores, 'Product')
  installModel(Order, stores.orders, stores, 'Order')
  installModel(Review, stores.reviews, stores, 'Review')
  installModel(Message, stores.messages, stores, 'Message')
  installMessageAggregate(Message, stores)

  function clear() {
    Object.values(stores).forEach(records => records.splice(0, records.length))
  }

  function tokenFor(user) {
    return jwt.sign({ userId: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '1d' })
  }

  return {
    app: appMod.default,
    request: createLocalRequest(appMod.default),
    stores,
    models: { User, Product, Order, Review, Message },
    clear,
    tokenFor,
    objectId: () => new mongoose.Types.ObjectId()
  }
}

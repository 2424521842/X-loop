/**
 * 商品控制器
 */
const mongoose = require('mongoose')
const Product = require('../models/Product')
const { success, fail } = require('../utils/response')
const { sanitizeUserPublic } = require('../utils/sanitize')
const { containsBlockedKeyword } = require('../utils/content-filter')

const PRODUCT_STATUSES = ['on_sale', 'reserved', 'sold', 'off_shelf']

function parsePagination(query) {
  const page = Math.max(parseInt(query.page, 10) || 0, 0)
  const pageSize = Math.min(Math.max(parseInt(query.pageSize, 10) || 20, 1), 100)
  return { page, pageSize }
}

function serializeProduct(product) {
  const item = product && typeof product.toObject === 'function' ? product.toObject() : product
  if (!item) return null

  const result = {
    id: String(item._id),
    sellerId: item.sellerId && item.sellerId._id ? String(item.sellerId._id) : String(item.sellerId || ''),
    title: item.title || '',
    description: item.description || '',
    images: item.images || [],
    price: item.price,
    category: item.category || '',
    status: item.status || 'on_sale',
    viewCount: item.viewCount || 0,
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null
  }

  if (item.sellerId && item.sellerId._id) {
    result.seller = sanitizeUserPublic(item.sellerId)
  }

  return result
}

function invalidObjectId(res) {
  return res.status(400).json(fail('无效的 id'))
}

/**
 * GET /api/products
 * 商品列表，默认只返回在售商品
 */
async function listProducts(req, res, next) {
  try {
    const { page, pageSize } = parsePagination(req.query)
    const query = {
      status: req.query.status || 'on_sale'
    }

    if (!PRODUCT_STATUSES.includes(query.status)) {
      return res.status(400).json(fail('无效的商品状态'))
    }

    if (req.query.category) {
      query.category = String(req.query.category).trim()
    }

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(page * pageSize)
      .limit(pageSize)

    return res.json(success({
      items: products.map(serializeProduct),
      page,
      pageSize
    }))
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/products/search?q=
 * 按标题和描述搜索在售商品
 */
async function searchProducts(req, res, next) {
  try {
    const q = String(req.query.q || '').trim()
    if (!q) {
      return res.json(success({ items: [] }))
    }

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const products = await Product.find({
      status: 'on_sale',
      $or: [
        { title: regex },
        { description: regex }
      ]
    }).sort({ createdAt: -1 })

    return res.json(success({ items: products.map(serializeProduct) }))
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/products/mine
 * 当前用户发布的全部商品
 */
async function listMyProducts(req, res, next) {
  try {
    const products = await Product.find({ sellerId: req.user.id })
      .sort({ createdAt: -1 })

    return res.json(success({ items: products.map(serializeProduct) }))
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/products/:id
 * 商品详情，并原子增加浏览量
 */
async function getProductById(req, res, next) {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) {
      return invalidObjectId(res)
    }

    let product = await Product.findByIdAndUpdate(
      id,
      { $inc: { viewCount: 1 } },
      { new: true }
    )

    if (!product) {
      return res.status(404).json(fail('商品不存在'))
    }

    if (typeof product.populate === 'function') {
      product = await product.populate('sellerId')
    }

    return res.json(success(serializeProduct(product)))
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/products
 * 发布商品
 */
async function createProduct(req, res, next) {
  try {
    const title = String(req.body.title || '').trim()
    const description = String(req.body.description || '').trim()
    const category = String(req.body.category || '').trim()
    const price = Number(req.body.price)
    const images = Array.isArray(req.body.images) ? req.body.images.map(String) : []

    if (!title || !category || req.body.price === undefined || Number.isNaN(price) || price < 0) {
      return res.status(400).json(fail('请填写完整的商品信息'))
    }

    if (containsBlockedKeyword(`${title} ${description}`)) {
      return res.status(400).json(fail('内容包含违规词'))
    }

    const product = await Product.create({
      sellerId: req.user.id,
      title,
      description,
      images,
      price,
      category,
      status: 'on_sale'
    })

    return res.json(success(serializeProduct(product)))
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/products/:id
 * 更新本人发布的商品
 */
async function updateProduct(req, res, next) {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) {
      return invalidObjectId(res)
    }

    const product = await Product.findById(id)
    if (!product) {
      return res.status(404).json(fail('商品不存在'))
    }

    if (String(product.sellerId) !== String(req.user.id)) {
      return res.status(403).json(fail('无权修改该商品'))
    }

    const allowedFields = ['title', 'description', 'images', 'price', 'category', 'status']
    let changed = false
    for (const field of allowedFields) {
      if (req.body[field] === undefined) continue

      if (field === 'price') {
        const price = Number(req.body.price)
        if (Number.isNaN(price) || price < 0) {
          return res.status(400).json(fail('价格格式错误'))
        }
        product.price = price
      } else if (field === 'images') {
        product.images = Array.isArray(req.body.images) ? req.body.images.map(String) : []
      } else if (field === 'status') {
        if (!PRODUCT_STATUSES.includes(req.body.status)) {
          return res.status(400).json(fail('无效的商品状态'))
        }
        product.status = req.body.status
      } else {
        product[field] = String(req.body[field]).trim()
      }
      changed = true
    }

    if (!changed) {
      return res.status(400).json(fail('没有可更新的字段'))
    }

    if (containsBlockedKeyword(`${product.title} ${product.description}`)) {
      return res.status(400).json(fail('内容包含违规词'))
    }

    await product.save()
    return res.json(success(serializeProduct(product)))
  } catch (err) {
    next(err)
  }
}

module.exports = {
  listProducts,
  searchProducts,
  listMyProducts,
  getProductById,
  createProduct,
  updateProduct
}

/**
 * 管理端商品控制器
 */
const mongoose = require('mongoose')
const Product = require('../../models/Product')
const User = require('../../models/User')
const Report = require('../../models/Report')
const { success, fail } = require('../../utils/response')
const { logAction } = require('../../utils/admin-log')

function parsePage(query) {
  const page = Math.max(parseInt(query.page, 10) || 0, 0)
  const pageSize = Math.min(Math.max(parseInt(query.pageSize, 10) || 20, 1), 100)
  return { page, pageSize }
}

function invalidId(res) {
  return res.status(400).json(fail('无效的商品ID'))
}

function serializeProduct(product, extra = {}) {
  const p = product && typeof product.toObject === 'function' ? product.toObject() : product
  return {
    id: String(p._id),
    sellerId: p.sellerId && p.sellerId._id ? String(p.sellerId._id) : String(p.sellerId || ''),
    title: p.title || '',
    description: p.description || '',
    images: p.images || [],
    price: p.price,
    category: p.category || '',
    status: p.status || 'on_sale',
    viewCount: p.viewCount || 0,
    adminNote: p.adminNote || '',
    createdAt: p.createdAt || null,
    updatedAt: p.updatedAt || null,
    ...extra
  }
}

async function listProducts(req, res, next) {
  try {
    const { page, pageSize } = parsePage(req.query)
    const keyword = String(req.query.keyword || '').trim()
    const category = String(req.query.category || '').trim()
    const status = String(req.query.status || '').trim()
    const sortByMap = { createTime: 'createdAt', updateTime: 'updatedAt', createdAt: 'createdAt', updatedAt: 'updatedAt', price: 'price', viewCount: 'viewCount' }
    const sortBy = sortByMap[req.query.sortBy] || 'createdAt'
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1
    const query = {}

    if (keyword) query.title = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    if (category) query.category = category
    if (status) query.status = status

    const [total, products] = await Promise.all([
      Product.countDocuments(query),
      Product.find(query).sort({ [sortBy]: sortOrder }).skip(page * pageSize).limit(pageSize)
    ])

    const ids = products.map((p) => p._id)
    const reportCounts = await Report.aggregate([
      { $match: { targetType: 'product', targetId: { $in: ids } } },
      { $group: { _id: '$targetId', count: { $sum: 1 } } }
    ])
    const countMap = new Map(reportCounts.map((item) => [String(item._id), item.count]))

    return res.json(success({
      items: products.map((p) => serializeProduct(p, { reportCount: countMap.get(String(p._id)) || 0 })),
      total,
      page,
      pageSize
    }))
  } catch (err) {
    next(err)
  }
}

async function getProductDetail(req, res, next) {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) return invalidId(res)

    const product = await Product.findById(id)
    if (!product) return res.status(404).json(fail('商品不存在'))

    const [seller, reports] = await Promise.all([
      product.sellerId ? User.findById(product.sellerId).select('nickName avatarUrl credit status') : null,
      Report.find({ targetId: id, targetType: 'product' }).sort({ createdAt: -1 })
    ])

    const sellerData = seller ? {
      id: String(seller._id),
      nickName: seller.nickName || '',
      avatarUrl: seller.avatarUrl || '',
      credit: seller.credit !== undefined ? seller.credit : 100,
      status: seller.status || 'active'
    } : null

    return res.json(success(serializeProduct(product, {
      seller: sellerData,
      reports: reports.map((r) => ({
        id: String(r._id),
        reason: r.reason,
        description: r.description || '',
        status: r.status,
        createdAt: r.createdAt || null
      }))
    })))
  } catch (err) {
    next(err)
  }
}

async function removeProduct(req, res, next) {
  try {
    const { id } = req.params
    const reason = String(req.body.reason || '').trim()
    if (!mongoose.isValidObjectId(id)) return invalidId(res)
    if (!reason) return res.status(400).json(fail('缺少下架原因'))

    const product = await Product.findByIdAndUpdate(id, { $set: { status: 'off_shelf', adminNote: reason } }, { new: true })
    if (!product) return res.status(404).json(fail('商品不存在'))

    await logAction(req, 'remove_product', 'product', id, { reason })
    return res.json(success(null))
  } catch (err) {
    next(err)
  }
}

async function restoreProduct(req, res, next) {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) return invalidId(res)

    const product = await Product.findByIdAndUpdate(id, { $set: { status: 'on_sale', adminNote: '' } }, { new: true })
    if (!product) return res.status(404).json(fail('商品不存在'))

    await logAction(req, 'restore_product', 'product', id, {})
    return res.json(success(null))
  } catch (err) {
    next(err)
  }
}

async function batchRemoveProducts(req, res, next) {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : []
    const reason = String(req.body.reason || '').trim()
    if (ids.length === 0 || ids.some((id) => !mongoose.isValidObjectId(id)) || !reason) {
      return res.status(400).json(fail('缺少参数'))
    }

    await Product.updateMany({ _id: { $in: ids } }, { $set: { status: 'off_shelf', adminNote: reason } })
    await logAction(req, 'batch_remove_products', 'product', ids.join(','), { reason, count: ids.length })
    return res.json(success(null))
  } catch (err) {
    next(err)
  }
}

module.exports = { listProducts, getProductDetail, removeProduct, restoreProduct, batchRemoveProducts, serializeProduct }

/**
 * 管理端订单控制器
 */
const mongoose = require('mongoose')
const Order = require('../../models/Order')
const Product = require('../../models/Product')
const Message = require('../../models/Message')
const { success, fail } = require('../../utils/response')
const { logAction } = require('../../utils/admin-log')

function parsePage(query) {
  const page = Math.max(parseInt(query.page, 10) || 0, 0)
  const pageSize = Math.min(Math.max(parseInt(query.pageSize, 10) || 20, 1), 100)
  return { page, pageSize }
}

function invalidId(res) {
  return res.status(400).json(fail('无效的订单ID'))
}

function pickUser(user) {
  if (!user || !user._id) return null
  return { id: String(user._id), nickName: user.nickName || '', avatarUrl: user.avatarUrl || '' }
}

function serializeOrder(order, extra = {}) {
  const o = order && typeof order.toObject === 'function' ? order.toObject() : order
  return {
    id: String(o._id),
    productId: o.productId && o.productId._id ? String(o.productId._id) : String(o.productId || ''),
    buyerId: o.buyerId && o.buyerId._id ? String(o.buyerId._id) : String(o.buyerId || ''),
    sellerId: o.sellerId && o.sellerId._id ? String(o.sellerId._id) : String(o.sellerId || ''),
    status: o.status || 'pending',
    cancelReason: o.cancelReason || '',
    price: o.price,
    intervened: !!o.intervened,
    interventionReason: o.interventionReason || '',
    interventionTime: o.interventionTime || null,
    resolvedBy: o.resolvedBy || '',
    resolvedTime: o.resolvedTime || null,
    createdAt: o.createdAt || null,
    updatedAt: o.updatedAt || null,
    ...extra
  }
}

async function listOrders(req, res, next) {
  try {
    const { page, pageSize } = parsePage(req.query)
    const query = {}
    if (req.query.status) query.status = req.query.status
    if (req.query.disputeOnly === 'true' || req.query.disputeOnly === true) query.intervened = true

    const [total, orders] = await Promise.all([
      Order.countDocuments(query),
      Order.find(query).populate({ path: 'productId', select: 'title images price' }).sort({ createdAt: -1 }).skip(page * pageSize).limit(pageSize)
    ])

    return res.json(success({
      items: orders.map((order) => serializeOrder(order, {
        productTitle: order.productId && order.productId.title ? order.productId.title : '(已删除)',
        disputeStatus: order.intervened ? (order.resolvedTime ? 'resolved' : 'open') : 'none',
        disputeNote: order.interventionReason || ''
      })),
      total,
      page,
      pageSize
    }))
  } catch (err) {
    next(err)
  }
}

async function getOrderDetail(req, res, next) {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) return invalidId(res)

    const order = await Order.findById(id)
      .populate({ path: 'buyerId', select: 'nickName avatarUrl' })
      .populate({ path: 'sellerId', select: 'nickName avatarUrl' })
      .populate({ path: 'productId', select: 'title images price' })
    if (!order) return res.status(404).json(fail('订单不存在'))

    const buyerId = order.buyerId && order.buyerId._id ? order.buyerId._id : order.buyerId
    const sellerId = order.sellerId && order.sellerId._id ? order.sellerId._id : order.sellerId
    const messages = await Message.find({
      $or: [
        { fromUserId: buyerId, toUserId: sellerId },
        { fromUserId: sellerId, toUserId: buyerId }
      ]
    }).sort({ createdAt: 1 }).limit(50)

    return res.json(success(serializeOrder(order, {
      buyer: pickUser(order.buyerId),
      seller: pickUser(order.sellerId),
      product: order.productId && order.productId._id ? {
        id: String(order.productId._id),
        title: order.productId.title || '',
        images: order.productId.images || [],
        price: order.productId.price
      } : null,
      messages: messages.map((m) => ({
        id: String(m._id),
        fromUserId: String(m.fromUserId),
        toUserId: String(m.toUserId),
        content: m.content || '',
        type: m.type || 'text',
        read: !!m.read,
        createdAt: m.createdAt || null
      })),
      disputeStatus: order.intervened ? (order.resolvedTime ? 'resolved' : 'open') : 'none',
      disputeNote: order.interventionReason || ''
    })))
  } catch (err) {
    next(err)
  }
}

async function interveneOrder(req, res, next) {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) return invalidId(res)

    const note = String(req.body.note || '').trim()
    const order = await Order.findByIdAndUpdate(
      id,
      { $set: { intervened: true, interventionReason: note, interventionTime: new Date(), resolvedBy: '', resolvedTime: null } },
      { new: true }
    )
    if (!order) return res.status(404).json(fail('订单不存在'))

    await logAction(req, 'intervene_order', 'order', id, { note })
    return res.json(success(null))
  } catch (err) {
    next(err)
  }
}

async function resolveOrder(req, res, next) {
  try {
    const { id } = req.params
    const resolution = String(req.body.resolution || '').trim()
    const note = String(req.body.note || '').trim()
    if (!mongoose.isValidObjectId(id)) return invalidId(res)
    if (!resolution) return res.status(400).json(fail('缺少参数'))

    const update = {
      intervened: true,
      interventionReason: note,
      resolvedBy: req.admin.username,
      resolvedTime: new Date()
    }
    if (resolution === 'force_refund') update.status = 'cancelled'
    if (resolution === 'force_complete') update.status = 'completed'

    const order = await Order.findByIdAndUpdate(id, { $set: update }, { new: true })
    if (!order) return res.status(404).json(fail('订单不存在'))

    if (resolution === 'force_refund') {
      await Product.findByIdAndUpdate(order.productId, {
        $set: { status: 'on_sale' },
        $unset: { reservedOrderId: '' }
      })
    }
    if (resolution === 'force_complete') {
      await Product.findByIdAndUpdate(order.productId, {
        $set: { status: 'sold' },
        $unset: { reservedOrderId: '' }
      })
    }

    await logAction(req, 'resolve_dispute', 'order', id, { resolution, note })
    return res.json(success(null))
  } catch (err) {
    next(err)
  }
}

module.exports = { listOrders, getOrderDetail, interveneOrder, resolveOrder }

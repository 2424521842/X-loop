/**
 * 订单控制器
 */
const mongoose = require('mongoose')
const Product = require('../models/Product')
const Order = require('../models/Order')
const Message = require('../models/Message')
const { success, fail } = require('../utils/response')

const ORDER_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled']
const ACTIVE_ORDER_STATUSES = ['pending', 'confirmed']

function getConversationId(a, b) {
  return [String(a), String(b)].sort().join('_')
}

function invalidObjectId(res) {
  return res.status(400).json(fail('无效的 id'))
}

function pickUser(field) {
  if (!field || !field._id) return null
  return {
    id: String(field._id),
    nickName: field.nickName || '',
    avatarUrl: field.avatarUrl || ''
  }
}

function serializeOrder(order, viewerId) {
  const item = order && typeof order.toObject === 'function' ? order.toObject() : order
  if (!item) return null

  const buyerIdStr = item.buyerId && item.buyerId._id ? String(item.buyerId._id) : String(item.buyerId || '')
  const sellerIdStr = item.sellerId && item.sellerId._id ? String(item.sellerId._id) : String(item.sellerId || '')

  const result = {
    id: String(item._id),
    productId: item.productId && item.productId._id ? String(item.productId._id) : String(item.productId || ''),
    buyerId: buyerIdStr,
    sellerId: sellerIdStr,
    status: item.status || 'pending',
    cancelReason: item.cancelReason || '',
    price: item.price,
    buyerReviewed: !!item.buyerReviewed,
    sellerReviewed: !!item.sellerReviewed,
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null
  }

  if (item.productId && item.productId._id) {
    result.product = {
      id: String(item.productId._id),
      title: item.productId.title || '',
      image: Array.isArray(item.productId.images) ? item.productId.images[0] || '' : '',
      price: item.productId.price
    }
  }

  const buyer = pickUser(item.buyerId)
  const seller = pickUser(item.sellerId)
  if (buyer) result.buyer = buyer
  if (seller) result.seller = seller

  if (viewerId) {
    if (String(viewerId) === buyerIdStr && seller) {
      result.counterpart = seller
    } else if (String(viewerId) === sellerIdStr && buyer) {
      result.counterpart = buyer
    }
  }

  return result
}

/**
 * POST /api/orders
 * 发起预定邀请，卖家同意前不锁定商品
 */
async function createOrder(req, res, next) {
  try {
    const { productId } = req.body
    if (!mongoose.isValidObjectId(productId)) {
      return invalidObjectId(res)
    }

    const product = await Product.findById(productId)
    if (!product) {
      return res.status(404).json(fail('商品不存在'))
    }
    if (product.status !== 'on_sale') {
      return res.status(400).json(fail('商品当前不可预定'))
    }
    if (String(product.sellerId) === String(req.user.id)) {
      return res.status(400).json(fail('不能购买自己发布的商品'))
    }

    const existing = await Order.findOne({
      productId: product._id,
      buyerId: req.user.id,
      status: { $in: ACTIVE_ORDER_STATUSES }
    })
    if (existing) {
      return res.status(400).json(fail('您已发起过该商品的预定邀请'))
    }

    const order = await Order.create({
      productId: product._id,
      buyerId: req.user.id,
      sellerId: product.sellerId,
      price: product.price
    })

    await createReservationMessage({
      order,
      fromUserId: req.user.id,
      toUserId: product.sellerId,
      content: '发起了预定邀请'
    })

    return res.json(success(serializeOrder(order, req.user.id)))
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/orders?role=buyer|seller&status=
 * 当前用户订单列表
 */
async function listOrders(req, res, next) {
  try {
    const role = req.query.role === 'seller' ? 'seller' : 'buyer'
    const query = role === 'seller'
      ? { sellerId: req.user.id }
      : { buyerId: req.user.id }

    if (req.query.status) {
      if (!ORDER_STATUSES.includes(req.query.status)) {
        return res.status(400).json(fail('无效的订单状态'))
      }
      query.status = req.query.status
    }

    const orders = await Order.find(query)
      .populate({ path: 'productId', select: 'title images price' })
      .populate({ path: 'buyerId', select: 'nickName avatarUrl' })
      .populate({ path: 'sellerId', select: 'nickName avatarUrl' })
      .sort({ createdAt: -1 })

    return res.json(success({ items: orders.map((o) => serializeOrder(o, req.user.id)) }))
  } catch (err) {
    next(err)
  }
}

function canTransition(order, nextStatus, userId) {
  const isBuyer = String(order.buyerId) === String(userId)
  const isSeller = String(order.sellerId) === String(userId)

  if (!isBuyer && !isSeller) {
    return { ok: false, status: 403, message: '无权操作该订单' }
  }

  if (order.status === 'completed' || order.status === 'cancelled') {
    return { ok: false, status: 400, message: '订单已结束，不能继续修改' }
  }

  if (order.status === 'pending' && nextStatus === 'confirmed' && isSeller) {
    return { ok: true }
  }

  if (order.status === 'confirmed' && nextStatus === 'completed' && (isBuyer || isSeller)) {
    return { ok: true }
  }

  if (order.status === 'pending' && nextStatus === 'cancelled' && (isBuyer || isSeller)) {
    return { ok: true }
  }

  return { ok: false, status: 400, message: '不允许的订单状态流转' }
}

async function createReservationMessage({ order, fromUserId, toUserId, content }) {
  return Message.create({
    conversationId: getConversationId(fromUserId, toUserId),
    fromUserId,
    toUserId,
    productId: order.productId,
    orderId: order._id,
    type: 'reservation',
    content
  })
}

async function invalidateOtherPendingOrders(order) {
  const otherPendingOrders = await Order.find({
    productId: order.productId,
    status: 'pending',
    _id: { $ne: order._id }
  })

  if (!otherPendingOrders.length) return

  await Order.updateMany(
    {
      productId: order.productId,
      status: 'pending',
      _id: { $ne: order._id }
    },
    { $set: { status: 'cancelled', cancelReason: 'product_reserved_elsewhere' } }
  )

  await Promise.all(otherPendingOrders.map((pendingOrder) => createReservationMessage({
    order: pendingOrder,
    fromUserId: order.sellerId,
    toUserId: pendingOrder.buyerId,
    content: '商品已被其他买家预订，预定邀请已失效'
  })))
}

/**
 * PATCH /api/orders/:id
 * 订单状态流转
 */
async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params
    const nextStatus = req.body.status
    if (!mongoose.isValidObjectId(id)) {
      return invalidObjectId(res)
    }
    if (!ORDER_STATUSES.includes(nextStatus)) {
      return res.status(400).json(fail('无效的订单状态'))
    }

    const order = await Order.findById(id)
    if (!order) {
      return res.status(404).json(fail('订单不存在'))
    }

    const transition = canTransition(order, nextStatus, req.user.id)
    if (!transition.ok) {
      return res.status(transition.status).json(fail(transition.message))
    }

    const isBuyer = String(order.buyerId) === String(req.user.id)

    if (nextStatus === 'confirmed') {
      const lockedProduct = await Product.findOneAndUpdate(
        { _id: order.productId, status: 'on_sale' },
        { $set: { status: 'reserved', reservedOrderId: order._id } },
        { new: true }
      )

      if (!lockedProduct) {
        order.status = 'cancelled'
        order.cancelReason = 'product_reserved_elsewhere'
        await order.save()
        await createReservationMessage({
          order,
          fromUserId: order.sellerId,
          toUserId: order.buyerId,
          content: '商品当前不可预订，预定邀请已失效'
        })
        return res.status(400).json(fail('商品已被预订或不可交易'))
      }

      order.status = 'confirmed'
      order.cancelReason = ''
      await order.save()
      await createReservationMessage({
        order,
        fromUserId: order.sellerId,
        toUserId: order.buyerId,
        content: '卖家已同意预定'
      })
      await invalidateOtherPendingOrders(order)
      return res.json(success(serializeOrder(order, req.user.id)))
    }

    if (nextStatus === 'cancelled') {
      order.status = 'cancelled'
      order.cancelReason = isBuyer ? 'buyer_cancelled' : 'seller_rejected'
      await order.save()
      await createReservationMessage({
        order,
        fromUserId: req.user.id,
        toUserId: isBuyer ? order.sellerId : order.buyerId,
        content: isBuyer ? '买家已取消预定邀请' : '卖家已拒绝预定邀请'
      })
      return res.json(success(serializeOrder(order, req.user.id)))
    }

    if (nextStatus === 'completed') {
      order.status = 'completed'
      await order.save()
      await Product.findByIdAndUpdate(order.productId, {
        $set: { status: 'sold' },
        $unset: { reservedOrderId: '' }
      })
      return res.json(success(serializeOrder(order, req.user.id)))
    }

    return res.json(success(serializeOrder(order, req.user.id)))
  } catch (err) {
    next(err)
  }
}

module.exports = { createOrder, listOrders, updateOrderStatus }

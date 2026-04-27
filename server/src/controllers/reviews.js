/**
 * 评价控制器
 */
const mongoose = require('mongoose')
const Order = require('../models/Order')
const Review = require('../models/Review')
const User = require('../models/User')
const { success, fail } = require('../utils/response')
const { containsBlockedKeyword } = require('../utils/content-filter')

const CREDIT_DELTA = {
  5: 2,
  4: 1,
  3: 0,
  2: -2,
  1: -5
}

function invalidObjectId(res) {
  return res.status(400).json(fail('无效的 id'))
}

function serializeReview(review) {
  const item = review && typeof review.toObject === 'function' ? review.toObject() : review
  if (!item) return null

  const result = {
    id: String(item._id),
    orderId: String(item.orderId || ''),
    fromUserId: item.fromUserId && item.fromUserId._id ? String(item.fromUserId._id) : String(item.fromUserId || ''),
    toUserId: String(item.toUserId || ''),
    rating: item.rating,
    content: item.content || '',
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null
  }

  if (item.fromUserId && item.fromUserId._id) {
    result.fromUser = {
      id: String(item.fromUserId._id),
      nickName: item.fromUserId.nickName || '',
      avatarUrl: item.fromUserId.avatarUrl || ''
    }
  }

  return result
}

/**
 * POST /api/reviews
 * 为已完成订单创建评价，并更新对方信誉分
 */
async function createReview(req, res, next) {
  try {
    const { orderId } = req.body
    const rating = Number(req.body.rating)
    const content = String(req.body.content || '').trim()

    if (!mongoose.isValidObjectId(orderId)) {
      return invalidObjectId(res)
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json(fail('rating 必须为 1-5 的整数'))
    }
    if (containsBlockedKeyword(content)) {
      return res.status(400).json(fail('内容包含违规词'))
    }

    const order = await Order.findById(orderId)
    if (!order) {
      return res.status(404).json(fail('订单不存在'))
    }
    if (order.status !== 'completed') {
      return res.status(400).json(fail('订单完成后才能评价'))
    }

    const isBuyer = String(order.buyerId) === String(req.user.id)
    const isSeller = String(order.sellerId) === String(req.user.id)
    if (!isBuyer && !isSeller) {
      return res.status(403).json(fail('无权评价该订单'))
    }

    const exists = await Review.findOne({ orderId, fromUserId: req.user.id })
    if (exists) {
      return res.status(400).json(fail('已评价该订单'))
    }

    const toUserId = isBuyer ? order.sellerId : order.buyerId
    const review = await Review.create({
      orderId,
      fromUserId: req.user.id,
      toUserId,
      rating,
      content
    })

    if (isBuyer) {
      order.buyerReviewed = true
    } else {
      order.sellerReviewed = true
    }
    await order.save()

    const toUser = await User.findById(toUserId)
    if (toUser) {
      toUser.credit = Math.max(0, Math.min(100, (toUser.credit === undefined ? 100 : toUser.credit) + CREDIT_DELTA[rating]))
      await toUser.save()
    }

    return res.json(success(serializeReview(review)))
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/reviews/user/:id
 * 某个用户收到的评价
 */
async function listUserReviews(req, res, next) {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) {
      return invalidObjectId(res)
    }

    const reviews = await Review.find({ toUserId: id })
      .populate({ path: 'fromUserId', select: 'nickName avatarUrl' })
      .sort({ createdAt: -1 })

    const items = reviews.map(serializeReview)
    const count = items.length
    const avgRating = count
      ? Number((items.reduce((sum, r) => sum + (r.rating || 0), 0) / count).toFixed(2))
      : 0

    return res.json(success({ items, count, avgRating }))
  } catch (err) {
    next(err)
  }
}

module.exports = { createReview, listUserReviews }

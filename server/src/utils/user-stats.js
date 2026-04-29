/**
 * 当前用户个人中心统计口径
 */
const mongoose = require('mongoose')
const Product = require('../models/Product')
const Order = require('../models/Order')

const EFFECTIVE_ORDER_STATUSES = ['pending', 'confirmed', 'completed']
const EMPTY_STATS = {
  productCount: 0,
  soldCount: 0,
  boughtCount: 0
}

async function getUserStats(userId) {
  if (!userId || mongoose.connection.readyState !== 1) {
    return { ...EMPTY_STATS }
  }

  const [productCount, soldCount, boughtCount] = await Promise.all([
    Product.countDocuments({ sellerId: userId }),
    Order.countDocuments({
      sellerId: userId,
      status: { $in: EFFECTIVE_ORDER_STATUSES }
    }),
    Order.countDocuments({
      buyerId: userId,
      status: { $in: EFFECTIVE_ORDER_STATUSES }
    })
  ])

  return { productCount, soldCount, boughtCount }
}

async function withUserStats(userData, userId) {
  return {
    ...userData,
    ...await getUserStats(userId || userData?.id)
  }
}

module.exports = { getUserStats, withUserStats, EFFECTIVE_ORDER_STATUSES }

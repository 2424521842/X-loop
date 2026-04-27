/**
 * 管理端用户控制器
 */
const mongoose = require('mongoose')
const User = require('../../models/User')
const Product = require('../../models/Product')
const Order = require('../../models/Order')
const Report = require('../../models/Report')
const { success, fail } = require('../../utils/response')
const { logAction } = require('../../utils/admin-log')

function parsePage(query) {
  const page = Math.max(parseInt(query.page, 10) || 0, 0)
  const pageSize = Math.min(Math.max(parseInt(query.pageSize, 10) || 20, 1), 100)
  return { page, pageSize }
}

function invalidId(res) {
  return res.status(400).json(fail('无效的用户ID'))
}

function serializeUser(user, extra = {}) {
  const u = user && typeof user.toObject === 'function' ? user.toObject() : user
  return {
    id: String(u._id),
    email: u.email || '',
    nickName: u.nickName || '',
    avatarUrl: u.avatarUrl || '',
    campus: u.campus || '',
    credit: u.credit !== undefined ? u.credit : 100,
    status: u.status || 'active',
    emailVerified: !!u.emailVerified,
    banReason: u.banReason || '',
    banTime: u.banTime || null,
    createdAt: u.createdAt || null,
    updatedAt: u.updatedAt || null,
    ...extra
  }
}

async function listUsers(req, res, next) {
  try {
    const { page, pageSize } = parsePage(req.query)
    const keyword = String(req.query.keyword || '').trim()
    const status = String(req.query.status || '').trim()
    const query = {}

    if (status) query.status = status
    if (keyword) {
      const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      query.$or = [{ nickName: regex }, { email: regex }]
    }

    const [total, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query).sort({ createdAt: -1 }).skip(page * pageSize).limit(pageSize)
    ])

    return res.json(success({ items: users.map((u) => serializeUser(u)), total, page, pageSize }))
  } catch (err) {
    next(err)
  }
}

async function getUserDetail(req, res, next) {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) return invalidId(res)

    const user = await User.findById(id)
    if (!user) return res.status(404).json(fail('用户不存在'))

    const objectId = new mongoose.Types.ObjectId(id)
    const [productCount, orderCount, reportCount] = await Promise.all([
      Product.countDocuments({ sellerId: id }),
      Order.countDocuments({ $or: [{ buyerId: objectId }, { sellerId: objectId }] }),
      Report.countDocuments({ targetId: objectId, targetType: 'user' })
    ])

    return res.json(success(serializeUser(user, { productCount, orderCount, reportCount })))
  } catch (err) {
    next(err)
  }
}

async function banUser(req, res, next) {
  try {
    const { id } = req.params
    const reason = String(req.body.reason || '').trim()
    if (!mongoose.isValidObjectId(id)) return invalidId(res)
    if (!reason) return res.status(400).json(fail('缺少封禁原因'))

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { status: 'banned', banReason: reason, banTime: new Date() } },
      { new: true }
    )
    if (!user) return res.status(404).json(fail('用户不存在'))

    await logAction(req, 'ban_user', 'user', id, { reason })
    return res.json(success(null))
  } catch (err) {
    next(err)
  }
}

async function unbanUser(req, res, next) {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) return invalidId(res)

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { status: 'active', banReason: '', banTime: null } },
      { new: true }
    )
    if (!user) return res.status(404).json(fail('用户不存在'))

    await logAction(req, 'unban_user', 'user', id, {})
    return res.json(success(null))
  } catch (err) {
    next(err)
  }
}

async function adjustCredit(req, res, next) {
  try {
    const { id } = req.params
    const credit = Number(req.body.credit)
    const reason = String(req.body.reason || '').trim()
    if (!mongoose.isValidObjectId(id)) return invalidId(res)
    if (req.body.credit === undefined || Number.isNaN(credit) || !reason) {
      return res.status(400).json(fail('缺少参数'))
    }

    const user = await User.findById(id)
    if (!user) return res.status(404).json(fail('用户不存在'))

    const oldCredit = user.credit !== undefined ? user.credit : 100
    user.credit = credit
    await user.save()

    await logAction(req, 'adjust_credit', 'user', id, { oldCredit, newCredit: credit, reason })
    return res.json(success(null))
  } catch (err) {
    next(err)
  }
}

module.exports = { listUsers, getUserDetail, banUser, unbanUser, adjustCredit, serializeUser }

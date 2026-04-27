/**
 * 用户控制器
 * PATCH /api/users/me — 更新个人资料
 * GET  /api/users/:id — 查看他人公开资料
 */
const User = require('../models/User')
const mongoose = require('mongoose')
const { success, fail } = require('../utils/response')
const { sanitizeUserSelf, sanitizeUserPublic } = require('../utils/sanitize')

/**
 * PATCH /api/users/me
 * 更新当前用户资料，允许更新：nickName / avatarUrl / campus
 */
async function updateMe(req, res, next) {
  try {
    const userId = req.user.id
    const { nickName, avatarUrl, campus } = req.body

    // 构造 $set 更新对象（只更新传入的字段）
    const setFields = {}

    if (nickName !== undefined) {
      setFields.nickName = String(nickName).trim()
    }
    if (avatarUrl !== undefined) {
      setFields.avatarUrl = String(avatarUrl).trim()
    }
    if (campus !== undefined) {
      // campus 只允许 'sip' 或 'tc'
      if (!['sip', 'tc'].includes(campus)) {
        return res.status(400).json(fail('campus 仅允许填写 sip 或 tc'))
      }
      setFields.campus = campus
    }
    if (Object.keys(setFields).length === 0) {
      return res.status(400).json(fail('没有可更新的字段'))
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: setFields },
      { new: true, runValidators: true }
    )

    if (!updatedUser) {
      return res.status(404).json(fail('用户不存在'))
    }

    return res.json(success(sanitizeUserSelf(updatedUser)))
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/users/:id
 * 查看他人公开资料（不含 email）
 */
async function getUserById(req, res, next) {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json(fail('无效的 id'))
    }

    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json(fail('用户不存在'))
    }
    return res.json(success(sanitizeUserPublic(user)))
  } catch (err) {
    next(err)
  }
}

module.exports = { updateMe, getUserById }

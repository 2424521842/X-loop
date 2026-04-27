/**
 * 用户路由
 * PATCH /api/users/me   — 更新个人资料（需鉴权）
 * GET   /api/users/:id  — 查看他人公开资料
 */
const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/auth')
const { updateMe, getUserById } = require('../controllers/users')

// 更新当前用户资料
router.patch('/me', authMiddleware, updateMe)

// 查看他人公开资料（公开，不需鉴权）
router.get('/:id', getUserById)

module.exports = router

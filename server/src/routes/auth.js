/**
 * 认证路由
 * POST /api/auth/email-code — 发送验证码
 * POST /api/auth/verify    — 校验验证码，签发 JWT
 * GET  /api/auth/me        — 获取当前用户（需鉴权）
 */
const express = require('express')
const router = express.Router()
const { emailCodeLimiter } = require('../middleware/rate-limit')
const authMiddleware = require('../middleware/auth')
const { sendCode, verifyCode, getMe } = require('../controllers/auth')

// 发送验证码（IP 限流 10次/分钟）
router.post('/email-code', emailCodeLimiter, sendCode)

// 校验验证码
router.post('/verify', verifyCode)

// 获取当前用户信息（需 JWT）
router.get('/me', authMiddleware, getMe)

module.exports = router

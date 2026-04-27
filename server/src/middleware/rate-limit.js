/**
 * IP 限流中间件
 * 给 /api/auth/email-code 接口加 10 次/分钟的 IP 限制
 */
const rateLimit = require('express-rate-limit')
const { fail } = require('../utils/response')

const emailCodeLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 分钟窗口
  max: 10,               // 最多 10 次
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(fail('请求过于频繁，请稍后再试'))
  }
})

module.exports = { emailCodeLimiter }

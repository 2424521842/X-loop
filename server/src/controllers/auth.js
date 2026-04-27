/**
 * 认证控制器
 * 处理邮箱验证码发送、校验，以及获取当前用户信息
 */
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const EmailCode = require('../models/EmailCode')
const User = require('../models/User')
const { sendEmail } = require('../services/email')
const { success, fail } = require('../utils/response')
const { sanitizeUserSelf } = require('../utils/sanitize')

// 验证码有效期（毫秒）
const CODE_TTL_MS = 5 * 60 * 1000
// 重发间隔（毫秒）
const RESEND_INTERVAL_MS = 60 * 1000
// 最大错误次数
const MAX_ATTEMPTS = 5

/**
 * 校验 XJTLU 邮箱格式
 */
function isSchoolEmail(email) {
  return /^[a-z0-9._%+-]+@(student\.)?xjtlu\.edu\.cn$/.test(email)
}

/**
 * 生成 6 位数字验证码
 */
function createCode() {
  return String(crypto.randomInt(100000, 1000000))
}

/**
 * 计算验证码哈希：SHA256(email:code:salt)
 * 注意：新版本去掉了 openid，盐值优先从 EMAIL_CODE_SALT 环境变量读取
 */
function hashCode(email, code) {
  const salt = process.env.EMAIL_CODE_SALT || process.env.EMAIL_SALT || process.env.SES_SECRET_KEY || 'x-loop-email-code'
  return crypto
    .createHash('sha256')
    .update(`${email}:${code}:${salt}`)
    .digest('hex')
}

/**
 * timing-safe 字符串比较，防止时序攻击
 */
function safeCompare(a, b) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}

/**
 * POST /api/auth/email-code
 * 发送 6 位验证码到 XJTLU 邮箱
 */
async function sendCode(req, res, next) {
  try {
    const email = String(req.body.email || '').trim().toLowerCase()

    if (!isSchoolEmail(email)) {
      return res.status(400).json(fail('请使用西浦教育邮箱（@xjtlu.edu.cn 或 @student.xjtlu.edu.cn）'))
    }

    // 检查 1 分钟内是否已发送过
    const recentCode = await EmailCode.findOne({
      email,
      used: false,
      status: 'sent',
      createdAt: { $gte: new Date(Date.now() - RESEND_INTERVAL_MS) }
    }).sort({ createdAt: -1 })

    if (recentCode) {
      return res.status(429).json(fail('验证码发送过于频繁，请稍后再试'))
    }

    // 生成验证码并哈希
    const codeValue = createCode()
    const codeHash = hashCode(email, codeValue)
    const expiresAt = new Date(Date.now() + CODE_TTL_MS)

    // 写入数据库
    const record = await EmailCode.create({
      email,
      codeHash,
      used: false,
      status: 'pending',
      attempts: 0,
      expiresAt
    })

    // 发送邮件
    try {
      const response = await sendEmail(email, codeValue)
      await EmailCode.findByIdAndUpdate(record._id, {
        status: 'sent',
        messageId: response.MessageId || ''
      })
    } catch (emailErr) {
      await EmailCode.findByIdAndUpdate(record._id, {
        status: 'failed',
        failReason: emailErr.message,
        used: true
      })
      throw emailErr
    }

    return res.json(success({
      email,
      expireIn: Math.floor(CODE_TTL_MS / 1000),
      resendAfter: Math.floor(RESEND_INTERVAL_MS / 1000)
    }))
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/auth/verify
 * 校验验证码，登录或注册，签发 JWT
 */
async function verifyCode(req, res, next) {
  try {
    const email = String(req.body.email || '').trim().toLowerCase()
    const inputCode = String(req.body.code || '').replace(/\D/g, '').slice(0, 6)

    if (!isSchoolEmail(email) || inputCode.length !== 6) {
      return res.status(400).json(fail('参数不完整或格式错误'))
    }

    // 先查是否有已锁定的最新记录（给出更明确的错误提示）
    const lockedRecord = await EmailCode.findOne({
      email,
      status: 'locked'
    }).sort({ createdAt: -1 })

    // 查找最新的有效验证码（未使用且状态为 sent）
    const record = await EmailCode.findOne({
      email,
      used: false,
      status: 'sent'
    }).sort({ createdAt: -1 })

    if (!record) {
      // 如果找到已锁定的记录，给出更具体的提示
      if (lockedRecord) {
        return res.status(400).json(fail('验证码错误次数过多，请重新获取'))
      }
      return res.status(400).json(fail('请先获取验证码'))
    }

    // 检查是否已过期
    if (record.expiresAt <= new Date()) {
      await EmailCode.findByIdAndUpdate(record._id, { used: true, status: 'expired' })
      return res.status(400).json(fail('验证码已过期，请重新获取'))
    }

    // 检查错误次数是否已达上限
    if (record.attempts >= MAX_ATTEMPTS) {
      await EmailCode.findByIdAndUpdate(record._id, { used: true, status: 'locked' })
      return res.status(400).json(fail('验证码错误次数过多，请重新获取'))
    }

    // timing-safe 比较
    const expectedHash = hashCode(email, inputCode)
    if (!safeCompare(expectedHash, record.codeHash)) {
      const newAttempts = record.attempts + 1
      if (newAttempts >= MAX_ATTEMPTS) {
        // 达到上限，锁定
        await EmailCode.findByIdAndUpdate(record._id, {
          $inc: { attempts: 1 },
          used: true,
          status: 'locked'
        })
        return res.status(400).json(fail('验证码错误次数过多，请重新获取'))
      }
      await EmailCode.findByIdAndUpdate(record._id, { $inc: { attempts: 1 } })
      return res.status(400).json(fail('验证码不正确'))
    }

    // 标记验证码已使用
    await EmailCode.findByIdAndUpdate(record._id, { used: true, status: 'verified' })

    const existingUser = await User.findOne({ email })
    if (existingUser && existingUser.status === 'banned') {
      return res.status(403).json(fail('您的账号已被封禁，无法登录'))
    }

    // 邮箱即身份：upsert 用户
    const now = new Date()
    const user = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          emailVerified: true,
          emailVerifiedAt: now
        },
        $setOnInsert: {
          email,
          credit: 100,
          status: 'active',
          campus: ''
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    // 签发 JWT（30 天有效）
    const token = jwt.sign(
      { userId: String(user._id) },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    return res.json(success({
      token,
      user: sanitizeUserSelf(user)
    }))
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/auth/me
 * 获取当前登录用户信息（需 Bearer token）
 */
async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json(fail('用户不存在'))
    }
    return res.json(success(sanitizeUserSelf(user)))
  } catch (err) {
    next(err)
  }
}

module.exports = { sendCode, verifyCode, getMe }

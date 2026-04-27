/**
 * 邮箱验证码记录模型
 * expiresAt 设 TTL 索引，到期自动清理
 */
const mongoose = require('mongoose')

const emailCodeSchema = new mongoose.Schema({
  // 目标邮箱
  email: { type: String, required: true, index: true, lowercase: true, trim: true },
  // SHA256(email:code:salt) 哈希值
  codeHash: { type: String, required: true },
  // 是否已使用
  used: { type: Boolean, default: false },
  // 状态：pending=已创建未发送 / sent=已发送 / verified=验证通过 / failed=发送失败 / expired=已过期 / locked=错误次数过多
  status: {
    type: String,
    enum: ['pending', 'sent', 'verified', 'failed', 'expired', 'locked'],
    default: 'pending'
  },
  // 错误尝试次数
  attempts: { type: Number, default: 0 },
  // 过期时间（TTL 索引，到期后 MongoDB 自动删除文档）
  expiresAt: { type: Date, required: true },
  // SES 返回的消息 ID
  messageId: { type: String, default: '' },
  // 发送失败原因
  failReason: { type: String, default: '' }
}, {
  collection: 'email_codes',
  timestamps: true
})

// TTL 索引：文档到期后自动删除（expireAfterSeconds=0 表示到达 expiresAt 时间点即删）
emailCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// 防止测试环境多次 import 报 OverwriteModelError
module.exports = mongoose.models.EmailCode || mongoose.model('EmailCode', emailCodeSchema)

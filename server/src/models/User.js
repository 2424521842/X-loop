/**
 * 用户数据模型
 * 邮箱即身份，验证码登录后自动创建账号
 */
const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  // 学校邮箱，唯一标识
  email: {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true
  },
  // 昵称
  nickName: { type: String, default: '' },
  // 头像 URL（Cloudinary）
  avatarUrl: { type: String, default: '' },
  // 校区：空字符串=未填写，sip=独墅湖校区（苏州），tc=太仓校区
  campus: {
    type: String,
    enum: ['', 'sip', 'tc'],
    default: ''
  },
  // 信誉分
  credit: { type: Number, default: 100 },
  // 账号状态
  status: {
    type: String,
    enum: ['active', 'banned'],
    default: 'active'
  },
  // 邮箱是否已验证
  emailVerified: { type: Boolean, default: false },
  // 邮箱验证时间
  emailVerifiedAt: { type: Date, default: null }
}, {
  timestamps: true  // 自动管理 createdAt / updatedAt
})

// 防止测试环境多次 import 报 OverwriteModelError
module.exports = mongoose.models.User || mongoose.model('User', userSchema)

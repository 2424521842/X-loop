/**
 * 管理员账号模型
 */
const mongoose = require('mongoose')

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  // bcrypt 哈希后的密码
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['super_admin', 'content_moderator', 'customer_service', 'data_analyst'],
    required: true,
    index: true
  },
  name: {
    type: String,
    default: '',
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'disabled'],
    default: 'active',
    index: true
  },
  lastLoginAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
})

module.exports = mongoose.models.Admin || mongoose.model('Admin', adminSchema)

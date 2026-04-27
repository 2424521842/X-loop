/**
 * 管理端审计日志模型
 */
const mongoose = require('mongoose')

const adminLogSchema = new mongoose.Schema({
  adminUsername: {
    type: String,
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    index: true
  },
  targetType: {
    type: String,
    required: true,
    index: true
  },
  targetId: {
    type: String,
    default: ''
  },
  detail: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ip: {
    type: String,
    default: ''
  }
}, {
  collection: 'admin_logs',
  timestamps: true
})

adminLogSchema.index({ createdAt: -1 })

module.exports = mongoose.models.AdminLog || mongoose.model('AdminLog', adminLogSchema)

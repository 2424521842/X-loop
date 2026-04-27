/**
 * 举报模型
 */
const mongoose = require('mongoose')

const reportSchema = new mongoose.Schema({
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  targetType: {
    type: String,
    enum: ['user', 'product'],
    required: true,
    index: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'claimed', 'resolved', 'rejected'],
    default: 'pending',
    index: true
  },
  claimedBy: {
    type: String,
    default: ''
  },
  claimedAt: {
    type: Date,
    default: null
  },
  resolvedBy: {
    type: String,
    default: ''
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  action: {
    type: String,
    enum: ['none', 'warn', 'remove_product', 'ban_user'],
    default: 'none'
  },
  actionDetail: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
})

module.exports = mongoose.models.Report || mongoose.model('Report', reportSchema)

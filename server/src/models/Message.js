/**
 * 站内消息数据模型
 */
const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  toUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null,
    index: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000,
    trim: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'reservation'],
    default: 'text'
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
})

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema)

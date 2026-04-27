/**
 * 评价数据模型
 */
const mongoose = require('mongoose')

const reviewSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    unique: true
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
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  content: {
    type: String,
    maxlength: 500,
    default: '',
    trim: true
  }
}, {
  timestamps: true
})

module.exports = mongoose.models.Review || mongoose.model('Review', reviewSchema)

/**
 * 订单数据模型
 */
const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  // 下单时的商品价格快照
  price: {
    type: Number,
    required: true
  },
  // 买卖双方是否已对该订单评价
  buyerReviewed: {
    type: Boolean,
    default: false
  },
  sellerReviewed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema)

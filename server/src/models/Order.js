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
  cancelReason: {
    type: String,
    enum: ['', 'seller_rejected', 'buyer_cancelled', 'product_reserved_elsewhere'],
    default: ''
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
  },
  // 管理端是否已介入纠纷
  intervened: {
    type: Boolean,
    default: false,
    index: true
  },
  interventionReason: {
    type: String,
    default: ''
  },
  interventionTime: {
    type: Date,
    default: null
  },
  resolvedBy: {
    type: String,
    default: ''
  },
  resolvedTime: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
})

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema)

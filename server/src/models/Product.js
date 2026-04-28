/**
 * 商品数据模型
 */
const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100,
    trim: true
  },
  description: {
    type: String,
    maxlength: 2000,
    default: '',
    trim: true
  },
  images: {
    type: [String],
    default: []
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['on_sale', 'reserved', 'sold', 'off_shelf'],
    default: 'on_sale',
    index: true
  },
  reservedOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null,
    index: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  // 管理端下架/恢复备注
  adminNote: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
})

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema)

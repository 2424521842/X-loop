/**
 * MongoDB 连接管理（Mongoose）
 */
const mongoose = require('mongoose')

/**
 * 连接数据库
 * @returns {Promise<void>}
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('MONGODB_URI 环境变量未设置')
  }

  await mongoose.connect(uri)
  console.log('MongoDB 连接成功:', uri.split('@').pop() || uri)
}

module.exports = { connectDB }

/**
 * X-Loop 网页版后端入口
 * Express 应用骨架：cors / json / 路由 / 错误处理
 */
require('dotenv').config()

// 启动时检查必需环境变量
if (!process.env.JWT_SECRET) {
  console.error('错误：JWT_SECRET 环境变量未设置，服务无法启动')
  process.exit(1)
}

const express = require('express')
const cors = require('cors')
const { connectDB } = require('./utils/db')
const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/users')
const productsRoutes = require('./routes/products')
const ordersRoutes = require('./routes/orders')
const reviewsRoutes = require('./routes/reviews')
const messagesRoutes = require('./routes/messages')
const uploadRoutes = require('./routes/upload')
const errorHandler = require('./middleware/error-handler')
const { success } = require('./utils/response')

const app = express()

// 跨域支持
app.use(cors())

// JSON 请求体解析
app.use(express.json())

// 健康检查
app.get('/health', (req, res) => {
  res.json(success({ status: 'ok', time: new Date().toISOString() }))
})

// API 路由
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/products', productsRoutes)
app.use('/api/orders', ordersRoutes)
app.use('/api/reviews', reviewsRoutes)
app.use('/api/messages', messagesRoutes)
app.use('/api/upload', uploadRoutes)

// 404 处理
app.use((req, res) => {
  res.status(404).json({ code: -1, message: '接口不存在', data: null })
})

// 全局错误处理（必须放在最后）
app.use(errorHandler)

// 启动服务器（仅在直接运行时连接 DB，测试时由测试文件控制）
if (require.main === module) {
  const PORT = process.env.PORT || 3000
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`X-Loop 服务已启动，监听端口 ${PORT}`)
      })
    })
    .catch(err => {
      console.error('数据库连接失败:', err)
      process.exit(1)
    })
}

module.exports = app
module.exports.app = app

/**
 * 全局错误处理中间件
 * 捕获所有未处理的错误，返回统一格式
 */
const { fail } = require('../utils/response')

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('未捕获错误:', err)

  const statusCode = err.statusCode || err.status || 500
  const message = err.message || '服务器内部错误'

  return res.status(statusCode).json(fail(message))
}

module.exports = errorHandler

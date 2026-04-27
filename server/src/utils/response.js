/**
 * 统一响应构造器
 * 所有接口返回格式：{ code, message, data }
 */

/**
 * 成功响应
 * @param {*} data - 返回数据
 * @param {string} message - 提示信息
 */
function success(data, message = 'success') {
  return { code: 0, message, data: data !== undefined ? data : null }
}

/**
 * 失败响应
 * @param {string} message - 错误信息
 * @param {number} code - 错误码，默认 -1
 */
function fail(message, code = -1) {
  return { code, message, data: null }
}

module.exports = { success, fail }

import { ElMessage } from 'element-plus'

/**
 * 调用管理端云函数（通过 Express 代理 → 微信服务端 API）
 * @param {string} funcName - 云函数名称 (如 'admin-login')
 * @param {object} data - 请求数据 (含 action 和 data 字段)
 * @returns {Promise} 解析后的 data 字段
 */
export async function callAdminApi(funcName, data = {}) {
  // 将 JWT token 注入请求数据
  const token = localStorage.getItem('admin_token')
  const payload = token ? { ...data, token } : data

  try {
    const res = await fetch(`/api/${funcName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const result = await res.json()
    if (result.code !== 0) {
      ElMessage.error(result.message || '请求失败')
      if (result.message && result.message.includes('令牌已过期')) {
        localStorage.removeItem('admin_token')
        window.location.href = '/login'
      }
      return Promise.reject(new Error(result.message))
    }
    return result.data
  } catch (err) {
    ElMessage.error('网络异常，请重试')
    return Promise.reject(err)
  }
}

import cloudbase from '@cloudbase/js-sdk'
import { ElMessage } from 'element-plus'

// 云开发环境 ID - 部署时替换为实际环境 ID
const ENV_ID = import.meta.env.VITE_CLOUD_ENV_ID || 'your-cloud-env-id'

// 初始化 CloudBase
const app = cloudbase.init({ env: ENV_ID })

// 匿名登录（admin-web 不需要微信用户身份，JWT 自行管理）
let loginPromise = null
async function ensureLogin() {
  if (!loginPromise) {
    loginPromise = app.auth().anonymousAuthProvider().signIn()
  }
  return loginPromise
}

/**
 * 调用管理端云函数
 * @param {string} funcName - 云函数名称 (如 'admin-login')
 * @param {object} data - 请求数据 (含 action 和 data 字段)
 * @returns {Promise} 解析后的 data 字段
 */
export async function callAdminApi(funcName, data = {}) {
  await ensureLogin()

  // 将 JWT token 注入请求数据
  const token = localStorage.getItem('admin_token')
  const payload = token ? { ...data, token } : data

  try {
    const res = await app.callFunction({
      name: funcName,
      data: payload
    })

    const result = res.result
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

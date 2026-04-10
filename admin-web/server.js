import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(express.json())

// 配置（部署时通过环境变量设置）
const APPID = process.env.WX_APPID
const APPSECRET = process.env.WX_APPSECRET
const ENV_ID = process.env.CLOUD_ENV_ID

if (!APPID || !APPSECRET || !ENV_ID) {
  console.error('缺少环境变量: WX_APPID, WX_APPSECRET, CLOUD_ENV_ID')
  process.exit(1)
}

// access_token 缓存
let tokenCache = { token: '', expireAt: 0 }

// 获取 access_token
async function getAccessToken() {
  if (tokenCache.token && Date.now() < tokenCache.expireAt) {
    return tokenCache.token
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${APPSECRET}`
  const res = await fetch(url)
  const data = await res.json()

  if (data.errcode) {
    throw new Error(`获取 access_token 失败: ${data.errmsg}`)
  }

  tokenCache = {
    token: data.access_token,
    expireAt: Date.now() + (data.expires_in - 300) * 1000
  }
  return data.access_token
}

// 调用云函数
app.post('/api/:funcName', async (req, res) => {
  try {
    const { funcName } = req.params
    const accessToken = await getAccessToken()

    const url = `https://api.weixin.qq.com/tcb/invokecloudfunction?access_token=${accessToken}&env=${ENV_ID}&name=${funcName}`
    const wxRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    })
    const wxData = await wxRes.json()

    if (wxData.errcode && wxData.errcode !== 0) {
      return res.json({ code: -1, message: wxData.errmsg, data: null })
    }

    // 微信 API 返回的 resp_data 是字符串格式的 JSON
    const result = JSON.parse(wxData.resp_data)
    res.json(result)
  } catch (err) {
    console.error('调用云函数失败:', err)
    res.json({ code: -1, message: err.message, data: null })
  }
})

// 静态文件服务
app.use(express.static(join(__dirname, 'dist')))

// SPA 路由回退
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`管理后台运行在 http://localhost:${PORT}`)
})

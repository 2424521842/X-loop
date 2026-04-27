/**
 * 邮件服务 —— 腾讯云 SES 直 HTTPS 调用
 * 移植自旧版邮箱验证码发送逻辑，去掉微信云开发 SDK 依赖
 *
 * 环境变量：
 *   EMAIL_DEV_MODE=true  → 不发真实邮件，只打印验证码（本地开发 / 免费冒烟用）
 *   SES_SECRET_ID / SES_SECRET_KEY / SES_REGION / SES_ENDPOINT
 *   SES_SENDER / SES_TEMPLATE_ID / SES_SUBJECT / SES_REPLY_TO
 */
const https = require('https')
const crypto = require('crypto')

function getEnv(name, fallback = '') {
  return process.env[name] || fallback
}

/**
 * 将 Unix 时间戳转为 UTC 日期字符串 YYYY-MM-DD
 */
function getDate(timestamp) {
  const date = new Date(timestamp * 1000)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function hashSha256(message) {
  return crypto.createHash('sha256').update(message).digest('hex')
}

function hmacSha256(message, secret, encoding) {
  const hmac = crypto.createHmac('sha256', secret).update(message)
  return encoding ? hmac.digest(encoding) : hmac.digest()
}

function normalizeEndpoint(endpoint) {
  return endpoint.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

/**
 * 发起腾讯云 API 请求（TC3-HMAC-SHA256 签名）
 */
function requestTencentCloud(endpoint, action, payloadObject) {
  const secretId = getEnv('SES_SECRET_ID')
  const secretKey = getEnv('SES_SECRET_KEY')
  const region = getEnv('SES_REGION', 'ap-guangzhou')
  const service = 'ses'
  const version = '2020-10-02'

  if (!secretId || !secretKey) {
    return Promise.reject(new Error('邮件服务密钥未配置'))
  }

  const host = normalizeEndpoint(endpoint)
  const payload = JSON.stringify(payloadObject)
  const timestamp = Math.floor(Date.now() / 1000)
  const date = getDate(timestamp)

  // 构造规范请求
  const canonicalRequest = [
    'POST',
    '/',
    '',
    `content-type:application/json; charset=utf-8\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`,
    'content-type;host;x-tc-action',
    hashSha256(payload)
  ].join('\n')

  // 构造待签名字符串
  const credentialScope = `${date}/${service}/tc3_request`
  const stringToSign = [
    'TC3-HMAC-SHA256',
    timestamp,
    credentialScope,
    hashSha256(canonicalRequest)
  ].join('\n')

  // 计算签名
  const secretDate = hmacSha256(date, `TC3${secretKey}`)
  const secretService = hmacSha256(service, secretDate)
  const secretSigning = hmacSha256('tc3_request', secretService)
  const signature = hmacSha256(stringToSign, secretSigning, 'hex')
  const authorization = [
    'TC3-HMAC-SHA256',
    `Credential=${secretId}/${credentialScope},`,
    'SignedHeaders=content-type;host;x-tc-action,',
    `Signature=${signature}`
  ].join(' ')

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: host,
      path: '/',
      method: 'POST',
      timeout: 10000,
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json; charset=utf-8',
        Host: host,
        'X-TC-Action': action,
        'X-TC-Timestamp': String(timestamp),
        'X-TC-Version': version,
        'X-TC-Region': region
      }
    }, (res) => {
      let body = ''
      res.on('data', chunk => { body += chunk })
      res.on('end', () => {
        let json
        try {
          json = JSON.parse(body)
        } catch (err) {
          reject(new Error('邮件服务返回解析失败'))
          return
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`邮件服务请求失败: ${res.statusCode}`))
          return
        }

        if (json.Response && json.Response.Error) {
          reject(new Error(json.Response.Error.Message || json.Response.Error.Code || '邮件发送失败'))
          return
        }

        resolve(json.Response || {})
      })
    })

    req.on('timeout', () => req.destroy(new Error('邮件服务请求超时')))
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

/**
 * 发送验证码邮件
 * @param {string} email - 目标邮箱
 * @param {string} code - 6 位数字验证码
 * @returns {Promise<object>} SES 响应（含 MessageId）
 */
async function sendEmail(email, code) {
  // 开发模式：不发真实邮件，只打印
  if (getEnv('EMAIL_DEV_MODE') === 'true') {
    console.log(`[EMAIL_DEV_MODE] 验证码 → ${email} : ${code}`)
    return { MessageId: 'dev-mode-no-send' }
  }

  const sender = getEnv('SES_SENDER')
  const templateId = Number(getEnv('SES_TEMPLATE_ID'))
  const endpoint = getEnv('SES_ENDPOINT', 'ses.tencentcloudapi.com')
  const subject = getEnv('SES_SUBJECT', 'X-Loop 校园邮箱验证码')
  const replyTo = getEnv('SES_REPLY_TO', sender)

  if (!sender) {
    throw new Error('发件地址未配置（SES_SENDER）')
  }
  if (!templateId || Number.isNaN(templateId)) {
    throw new Error('邮件模板未配置（SES_TEMPLATE_ID）')
  }

  const payloadObj = {
    FromEmailAddress: sender,
    Destination: [email],
    Subject: subject,
    ReplyToAddresses: replyTo,
    TriggerType: 1,
    Template: {
      TemplateID: templateId,
      TemplateData: JSON.stringify({
        code,
        minutes: 5,
        appName: 'X-Loop'
      })
    }
  }

  return requestTencentCloud(endpoint, 'SendEmail', payloadObj)
}

module.exports = {
  requestTencentCloud,
  sendEmail,
  sendVerificationEmail: sendEmail
}

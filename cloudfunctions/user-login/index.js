const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 查找用户
    const { data: users } = await db.collection('users')
      .where({ openid })
      .limit(1)
      .get()

    let userInfo

    if (users.length === 0) {
      // 新用户，创建记录
      userInfo = {
        openid,
        nickName: '',
        avatarUrl: '',
        credit: 100,
        status: 'active',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
      await db.collection('users').add({ data: userInfo })
    } else {
      userInfo = users[0]

      // 检查用户是否被封禁
      if (userInfo.status === 'banned') {
        return { code: -1, message: '您的账号已被封禁，原因: ' + (userInfo.banReason || '违规操作'), data: null }
      }
    }

    return {
      code: 0,
      message: 'success',
      data: { openid, userInfo }
    }
  } catch (err) {
    return { code: -1, message: err.message, data: null }
  }
}

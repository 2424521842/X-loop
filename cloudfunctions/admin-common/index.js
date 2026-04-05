// admin-common 是工具模块，不作为独立云函数调用
// 其他 admin-* 云函数通过相对路径引用本模块
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async () => {
  return { code: -1, message: 'admin-common 不可直接调用', data: null }
}

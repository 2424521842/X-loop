const cloud = require('wx-server-sdk')
const { verifyAdmin } = require('admin-common/auth')
const { logAction } = require('admin-common/logger')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  try {
    const { action, token, data: reqData } = event || {}

    switch (action) {
      case 'list': {
        verifyAdmin(token, ['products'])
        const {
          page = 0,
          pageSize = 20,
          keyword = '',
          category = '',
          status = '',
          sortBy = 'createTime',
          sortOrder = 'desc'
        } = reqData || {}

        const conditions = {}
        if (keyword) conditions.title = db.RegExp({ regexp: keyword, options: 'i' })
        if (category) conditions.category = category
        if (status) conditions.status = status

        let query = db.collection('products')
        if (Object.keys(conditions).length > 0) query = query.where(conditions)

        const { total } = await query.count()
        const { data: products } = await query
          .orderBy(sortBy, sortOrder)
          .skip(page * pageSize)
          .limit(pageSize)
          .get()

        return { code: 0, message: 'success', data: { list: products, total, page, pageSize } }
      }

      case 'detail': {
        verifyAdmin(token, ['products'])
        const { id } = reqData || {}
        if (!id) return { code: -1, message: '缺少商品ID', data: null }

        const { data: product } = await db.collection('products').doc(id).get()

        // 获取卖家信息
        let seller = null
        if (product.sellerOpenid) {
          const { data: sellers } = await db.collection('users').where({ openid: product.sellerOpenid }).limit(1).get()
          if (sellers.length > 0) {
            seller = {
              nickName: sellers[0].nickName,
              avatarUrl: sellers[0].avatarUrl,
              credit: sellers[0].credit,
              status: sellers[0].status
            }
          }
        }

        // 获取举报记录
        const { data: reports } = await db.collection('reports')
          .where({ targetId: id, targetType: 'product' })
          .orderBy('createTime', 'desc')
          .get()

        return { code: 0, message: 'success', data: { ...product, seller, reports } }
      }

      case 'remove': {
        const admin = verifyAdmin(token, ['products:write'])
        const { id, reason } = reqData || {}
        if (!id || !reason) return { code: -1, message: '缺少参数', data: null }

        await db.collection('products').doc(id).update({
          data: { status: 'off_shelf', adminNote: reason, updateTime: db.serverDate() }
        })
        await logAction(db, admin.username, 'remove_product', 'product', id, { reason })
        return { code: 0, message: 'success', data: null }
      }

      case 'restore': {
        const admin = verifyAdmin(token, ['products:write'])
        const { id } = reqData || {}
        if (!id) return { code: -1, message: '缺少商品ID', data: null }

        await db.collection('products').doc(id).update({
          data: { status: 'on_sale', adminNote: _.remove(), updateTime: db.serverDate() }
        })
        await logAction(db, admin.username, 'restore_product', 'product', id, {})
        return { code: 0, message: 'success', data: null }
      }

      case 'batch-remove': {
        const admin = verifyAdmin(token, ['products:write'])
        const { ids, reason } = reqData || {}
        if (!ids || ids.length === 0 || !reason) return { code: -1, message: '缺少参数', data: null }

        for (const id of ids) {
          await db.collection('products').doc(id).update({
            data: { status: 'off_shelf', adminNote: reason, updateTime: db.serverDate() }
          })
        }
        await logAction(db, admin.username, 'batch_remove_products', 'product', ids.join(','), {
          reason,
          count: ids.length
        })
        return { code: 0, message: 'success', data: null }
      }

      default:
        return { code: -1, message: '未知操作: ' + action, data: null }
    }
  } catch (err) {
    return { code: -1, message: err.message, data: null }
  }
}

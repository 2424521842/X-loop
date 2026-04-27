/**
 * 管理端系统设置控制器
 */
const bcrypt = require('bcryptjs')
const mongoose = require('mongoose')
const Admin = require('../../models/Admin')
const AdminLog = require('../../models/AdminLog')
const Product = require('../../models/Product')
const { success, fail } = require('../../utils/response')
const { logAction } = require('../../utils/admin-log')
const { serializeAdmin } = require('./auth')
const { CATEGORY_NAMES } = require('./stats')

const ROLE_VALUES = ['super_admin', 'content_moderator', 'customer_service', 'data_analyst']

function parsePage(query) {
  const page = Math.max(parseInt(query.page, 10) || 0, 0)
  const pageSize = Math.min(Math.max(parseInt(query.pageSize, 10) || 20, 1), 100)
  return { page, pageSize }
}

function categoryCollection() {
  return mongoose.connection.collection('categories')
}

async function ensureDefaultCategories() {
  const collection = categoryCollection()
  await collection.createIndex({ id: 1 }, { unique: true })
  for (const [id, name] of Object.entries(CATEGORY_NAMES)) {
    await collection.updateOne({ id }, { $setOnInsert: { id, name, createdAt: new Date(), updatedAt: new Date() } }, { upsert: true })
  }
}

async function listAdmins(req, res, next) {
  try {
    const admins = await Admin.find().sort({ createdAt: -1 })
    return res.json(success({ items: admins.map(serializeAdmin), total: admins.length, page: 0, pageSize: admins.length }))
  } catch (err) {
    next(err)
  }
}

async function createAdmin(req, res, next) {
  try {
    const username = String(req.body.username || '').trim()
    const password = String(req.body.password || '')
    const name = String(req.body.name || req.body.displayName || '').trim()
    const role = String(req.body.role || '').trim()

    if (!username || !password || !name || !ROLE_VALUES.includes(role)) {
      return res.status(400).json(fail('请填写完整管理员信息'))
    }
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json(fail('用户名长度需在 3-20 个字符之间'))
    }
    if (password.length < 8) {
      return res.status(400).json(fail('密码长度不能少于 8 个字符'))
    }

    const exists = await Admin.findOne({ username })
    if (exists) return res.status(400).json(fail('用户名已存在'))

    const admin = await Admin.create({ username, password: await bcrypt.hash(password, 10), name, role, status: 'active' })
    await logAction(req, 'create_admin', 'admin', admin._id, { username, role })
    return res.json(success(serializeAdmin(admin)))
  } catch (err) {
    next(err)
  }
}

async function updateAdmin(req, res, next) {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) return res.status(400).json(fail('无效的管理员ID'))

    const admin = await Admin.findById(id)
    if (!admin) return res.status(404).json(fail('管理员不存在'))

    if (req.body.name !== undefined || req.body.displayName !== undefined) admin.name = String(req.body.name || req.body.displayName || '').trim()
    if (req.body.role !== undefined) {
      if (!ROLE_VALUES.includes(req.body.role)) return res.status(400).json(fail('无效的角色'))
      admin.role = req.body.role
    }
    if (req.body.status !== undefined) {
      if (!['active', 'disabled'].includes(req.body.status)) return res.status(400).json(fail('无效的状态'))
      admin.status = req.body.status
    }
    if (req.body.password) {
      const password = String(req.body.password)
      if (password.length < 8) return res.status(400).json(fail('密码长度不能少于 8 个字符'))
      admin.password = await bcrypt.hash(password, 10)
    }
    await admin.save()

    await logAction(req, 'update_admin', 'admin', id, { username: admin.username })
    return res.json(success(serializeAdmin(admin)))
  } catch (err) {
    next(err)
  }
}

async function deleteAdmin(req, res, next) {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) return res.status(400).json(fail('无效的管理员ID'))

    const admin = await Admin.findById(id)
    if (!admin) return res.status(404).json(fail('管理员不存在'))
    if (admin.username === req.admin.username) return res.status(400).json(fail('不能删除当前登录账号'))

    await Admin.deleteOne({ _id: id })
    await logAction(req, 'delete_admin', 'admin', id, { username: admin.username })
    return res.json(success(null))
  } catch (err) {
    next(err)
  }
}

async function listLogs(req, res, next) {
  try {
    const { page, pageSize } = parsePage(req.query)
    const query = {}
    if (req.query.username) query.adminUsername = String(req.query.username).trim()
    if (req.query.action) query.action = String(req.query.action).trim()

    const [total, logs] = await Promise.all([
      AdminLog.countDocuments(query),
      AdminLog.find(query).sort({ createdAt: -1 }).skip(page * pageSize).limit(pageSize)
    ])

    return res.json(success({
      items: logs.map((log) => ({
        id: String(log._id),
        adminUsername: log.adminUsername,
        username: log.adminUsername,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        detail: log.detail || {},
        ip: log.ip || '',
        createdAt: log.createdAt || null,
        updatedAt: log.updatedAt || null
      })),
      total,
      page,
      pageSize
    }))
  } catch (err) {
    next(err)
  }
}

async function listCategories(req, res, next) {
  try {
    await ensureDefaultCategories()
    const docs = await categoryCollection().find().sort({ id: 1 }).toArray()
    const counts = await Product.aggregate([
      { $match: { status: 'on_sale' } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ])
    const countMap = new Map(counts.map((item) => [item._id, item.count]))
    return res.json(success({
      items: docs.map((doc) => ({
        id: doc.id,
        category: doc.id,
        name: doc.name,
        count: countMap.get(doc.id) || 0,
        createdAt: doc.createdAt || null,
        updatedAt: doc.updatedAt || null
      })),
      total: docs.length,
      page: 0,
      pageSize: docs.length
    }))
  } catch (err) {
    next(err)
  }
}

async function createCategory(req, res, next) {
  try {
    const id = String(req.body.id || req.body.category || '').trim()
    const name = String(req.body.name || '').trim()
    if (!id || !name) return res.status(400).json(fail('请填写完整分类信息'))

    await categoryCollection().createIndex({ id: 1 }, { unique: true })
    const result = await categoryCollection().insertOne({ id, name, createdAt: new Date(), updatedAt: new Date() })
    await logAction(req, 'create_category', 'category', id, { name })
    return res.json(success({ id, category: id, name, mongoId: String(result.insertedId) }))
  } catch (err) {
    if (err.code === 11000) return res.status(400).json(fail('分类ID已存在'))
    next(err)
  }
}

async function updateCategory(req, res, next) {
  try {
    const id = String(req.params.id || '').trim()
    const name = String(req.body.name || '').trim()
    if (!id || !name) return res.status(400).json(fail('请填写分类名称'))

    const result = await categoryCollection().findOneAndUpdate(
      { id },
      { $set: { name, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )
    if (!result.value) return res.status(404).json(fail('分类不存在'))

    await logAction(req, 'update_category', 'category', id, { name })
    return res.json(success({ id, category: id, name }))
  } catch (err) {
    next(err)
  }
}

async function deleteCategory(req, res, next) {
  try {
    const id = String(req.params.id || '').trim()
    if (!id) return res.status(400).json(fail('缺少分类ID'))

    const inUse = await Product.exists({ category: id })
    if (inUse) return res.status(400).json(fail('该分类下已有商品，不能删除'))

    const result = await categoryCollection().deleteOne({ id })
    if (!result.deletedCount) return res.status(404).json(fail('分类不存在'))

    await logAction(req, 'delete_category', 'category', id, {})
    return res.json(success(null))
  } catch (err) {
    next(err)
  }
}

module.exports = {
  listAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  listLogs,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory
}

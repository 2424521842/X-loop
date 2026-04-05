# X-Loop Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready admin management web application for X-Loop, enabling platform operations including content moderation, user management, order dispute resolution, and data analytics.

**Architecture:** Vue 3 SPA with Element Plus UI deployed on WeChat Cloud static hosting. Backend uses WeChat Cloud Functions exposed via HTTP triggers, sharing the same cloud database as the mini program. JWT-based auth with RBAC, independent from mini program user system.

**Tech Stack:** Vue 3, Element Plus, Pinia, Vue Router, ECharts, Axios, Vite (frontend); WeChat Cloud Functions with jsonwebtoken + bcryptjs (backend)

---

## File Structure

### Cloud Functions (new)

```
cloudfunctions/
├── admin-common/           # Shared auth + logging utilities
│   ├── index.js            # Empty placeholder (not a callable function)
│   ├── auth.js             # JWT verify + role check
│   ├── logger.js           # Audit log writer
│   └── package.json        # jsonwebtoken, bcryptjs
├── admin-login/
│   ├── index.js            # Admin login, returns JWT
│   └── package.json        # jsonwebtoken, bcryptjs, wx-server-sdk
├── admin-users/
│   ├── index.js            # User list/detail/ban/unban/adjust-credit
│   └── package.json        # jsonwebtoken, wx-server-sdk
├── admin-products/
│   ├── index.js            # Product list/detail/remove/restore/batch-remove
│   └── package.json        # jsonwebtoken, wx-server-sdk
├── admin-orders/
│   ├── index.js            # Order list/detail/intervene/resolve
│   └── package.json        # jsonwebtoken, wx-server-sdk
├── admin-reports/
│   ├── index.js            # Report list/detail/claim/resolve
│   └── package.json        # jsonwebtoken, wx-server-sdk
└── admin-stats/
    ├── index.js            # Overview/trend/distribution stats
    └── package.json        # jsonwebtoken, wx-server-sdk
```

### Admin Web Frontend (new)

```
admin-web/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.js             # App entry, Element Plus setup
│   ├── App.vue             # Root component with router-view
│   ├── api/
│   │   ├── request.js      # Axios instance with JWT interceptor
│   │   ├── auth.js         # Login API
│   │   ├── users.js        # User management APIs
│   │   ├── products.js     # Product management APIs
│   │   ├── orders.js       # Order management APIs
│   │   ├── reports.js      # Report management APIs
│   │   └── stats.js        # Statistics APIs
│   ├── router/
│   │   └── index.js        # Routes + permission guards
│   ├── stores/
│   │   └── auth.js         # Pinia auth store (token, role, user info)
│   ├── utils/
│   │   └── permission.js   # Role-permission mapping
│   ├── components/
│   │   └── layout/
│   │       ├── AppLayout.vue    # Sidebar + header + main content
│   │       ├── Sidebar.vue      # Collapsible nav, role-filtered menus
│   │       └── Header.vue       # Breadcrumb + user info + logout
│   └── views/
│       ├── login/
│       │   └── LoginView.vue
│       ├── dashboard/
│       │   └── DashboardView.vue
│       ├── users/
│       │   ├── UserList.vue
│       │   └── UserDetail.vue
│       ├── products/
│       │   ├── ProductList.vue
│       │   └── ProductDetail.vue
│       ├── reports/
│       │   ├── ReportList.vue
│       │   └── ReportDetail.vue
│       ├── orders/
│       │   ├── OrderList.vue
│       │   └── OrderDetail.vue
│       └── system/
│           ├── AdminList.vue
│           ├── AdminLogs.vue
│           └── Categories.vue
```

### Mini Program (modify)

```
cloudfunctions/
├── user-login/index.js      # Add banned user check
├── product-create/index.js   # Add banned user check
└── product-update/index.js   # Add banned user check
```

---

## Task 1: Admin Common Utilities (auth + logger)

**Files:**
- Create: `cloudfunctions/admin-common/auth.js`
- Create: `cloudfunctions/admin-common/logger.js`
- Create: `cloudfunctions/admin-common/package.json`
- Create: `cloudfunctions/admin-common/index.js`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "admin-common",
  "version": "1.0.0",
  "dependencies": {
    "wx-server-sdk": "~2.6.3",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3"
  }
}
```

- [ ] **Step 2: Create auth.js**

```javascript
const jwt = require('jsonwebtoken')

// JWT 密钥 - 部署时通过云函数环境变量覆盖
const JWT_SECRET = process.env.JWT_SECRET || 'xloop-admin-secret-key-change-in-production'

// 角色权限映射
const ROLE_PERMISSIONS = {
  super_admin: ['dashboard', 'users', 'users:write', 'products', 'products:write', 'orders', 'orders:write', 'reports', 'reports:write', 'system'],
  content_moderator: ['dashboard', 'users', 'users:write', 'products', 'products:write', 'reports', 'reports:write'],
  customer_service: ['dashboard', 'users', 'orders', 'orders:write', 'products'],
  data_analyst: ['dashboard']
}

/**
 * 签发 JWT token
 * @param {object} payload - { username, role }
 * @returns {string} token
 */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })
}

/**
 * 验证 JWT token 并检查角色权限
 * @param {string} token - JWT token
 * @param {string[]} requiredPermissions - 需要的权限列表
 * @returns {object} { username, role }
 * @throws {Error} 鉴权失败时抛出错误
 */
function verifyAdmin(token, requiredPermissions = []) {
  if (!token) {
    throw new Error('未提供认证令牌')
  }

  // 去掉 Bearer 前缀
  const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token

  let decoded
  try {
    decoded = jwt.verify(actualToken, JWT_SECRET)
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new Error('令牌已过期，请重新登录')
    }
    throw new Error('无效的认证令牌')
  }

  const { username, role } = decoded
  if (!username || !role) {
    throw new Error('无效的令牌内容')
  }

  // 检查权限
  const userPermissions = ROLE_PERMISSIONS[role] || []
  for (const perm of requiredPermissions) {
    if (!userPermissions.includes(perm)) {
      throw new Error('权限不足')
    }
  }

  return { username, role }
}

module.exports = { signToken, verifyAdmin, JWT_SECRET, ROLE_PERMISSIONS }
```

- [ ] **Step 3: Create logger.js**

```javascript
/**
 * 审计日志写入
 * @param {object} db - 云数据库实例
 * @param {string} username - 操作人
 * @param {string} action - 操作类型
 * @param {string} targetType - 目标类型 (user/product/order/report)
 * @param {string} targetId - 目标ID
 * @param {object} detail - 操作详情
 */
async function logAction(db, username, action, targetType, targetId, detail = {}) {
  try {
    await db.collection('admin_logs').add({
      data: {
        username,
        action,
        targetType,
        targetId,
        detail,
        createTime: db.serverDate()
      }
    })
  } catch (err) {
    console.error('写入审计日志失败:', err)
    // 日志写入失败不影响主流程
  }
}

module.exports = { logAction }
```

- [ ] **Step 4: Create placeholder index.js**

```javascript
// admin-common 是工具模块，不作为独立云函数调用
// 其他 admin-* 云函数通过相对路径引用本模块
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async () => {
  return { code: -1, message: 'admin-common 不可直接调用', data: null }
}
```

- [ ] **Step 5: Install dependencies and commit**

```bash
cd cloudfunctions/admin-common && npm install
git add cloudfunctions/admin-common/
git commit -m "feat: add admin-common auth and logger utilities"
```

---

## Task 2: Admin Login Cloud Function

**Files:**
- Create: `cloudfunctions/admin-login/index.js`
- Create: `cloudfunctions/admin-login/package.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "admin-login",
  "version": "1.0.0",
  "dependencies": {
    "wx-server-sdk": "~2.6.3",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3"
  }
}
```

- [ ] **Step 2: Create index.js**

```javascript
const cloud = require('wx-server-sdk')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// JWT 密钥
const JWT_SECRET = process.env.JWT_SECRET || 'xloop-admin-secret-key-change-in-production'

exports.main = async (event) => {
  try {
    const { username, password } = event

    // 参数校验
    if (!username || !password) {
      return { code: -1, message: '请输入用户名和密码', data: null }
    }

    // 查找管理员
    const { data: admins } = await db.collection('admins')
      .where({ username })
      .limit(1)
      .get()

    if (admins.length === 0) {
      return { code: -1, message: '用户名或密码错误', data: null }
    }

    const admin = admins[0]

    // 检查账号状态
    if (admin.status !== 'active') {
      return { code: -1, message: '账号已被禁用', data: null }
    }

    // 验证密码
    const isMatch = await bcrypt.compare(password, admin.passwordHash)
    if (!isMatch) {
      return { code: -1, message: '用户名或密码错误', data: null }
    }

    // 签发 JWT
    const token = jwt.sign(
      { username: admin.username, role: admin.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    // 更新最后登录时间
    await db.collection('admins').doc(admin._id).update({
      data: { lastLoginTime: db.serverDate() }
    })

    return {
      code: 0,
      message: 'success',
      data: {
        token,
        role: admin.role,
        displayName: admin.displayName,
        username: admin.username
      }
    }
  } catch (err) {
    return { code: -1, message: err.message, data: null }
  }
}
```

- [ ] **Step 3: Install dependencies and commit**

```bash
cd cloudfunctions/admin-login && npm install
git add cloudfunctions/admin-login/
git commit -m "feat: add admin-login cloud function with JWT auth"
```

---

## Task 3: Admin Users Cloud Function

**Files:**
- Create: `cloudfunctions/admin-users/index.js`
- Create: `cloudfunctions/admin-users/package.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "admin-users",
  "version": "1.0.0",
  "dependencies": {
    "wx-server-sdk": "~2.6.3",
    "jsonwebtoken": "^9.0.0"
  }
}
```

- [ ] **Step 2: Create index.js**

```javascript
const cloud = require('wx-server-sdk')
const jwt = require('jsonwebtoken')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const JWT_SECRET = process.env.JWT_SECRET || 'xloop-admin-secret-key-change-in-production'

// 角色权限映射
const ROLE_PERMISSIONS = {
  super_admin: ['users', 'users:write'],
  content_moderator: ['users', 'users:write'],
  customer_service: ['users'],
  data_analyst: []
}

function verifyToken(token, requiredPerm) {
  if (!token) throw new Error('未提供认证令牌')
  const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token
  const decoded = jwt.verify(actualToken, JWT_SECRET)
  const perms = ROLE_PERMISSIONS[decoded.role] || []
  if (requiredPerm && !perms.includes(requiredPerm)) {
    throw new Error('权限不足')
  }
  return decoded
}

async function logAction(username, action, targetType, targetId, detail) {
  try {
    await db.collection('admin_logs').add({
      data: { username, action, targetType, targetId, detail, createTime: db.serverDate() }
    })
  } catch (err) {
    console.error('写入审计日志失败:', err)
  }
}

exports.main = async (event) => {
  try {
    const { action, token, data: reqData } = event

    switch (action) {
      case 'list': {
        const admin = verifyToken(token, 'users')
        const { page = 0, pageSize = 20, keyword = '', status = '' } = reqData || {}
        let query = db.collection('users')
        const conditions = {}
        if (status) conditions.status = status
        if (keyword) {
          conditions.nickName = db.RegExp({ regexp: keyword, options: 'i' })
        }
        if (Object.keys(conditions).length > 0) {
          query = query.where(conditions)
        }
        const { total } = await query.count()
        const { data: users } = await query
          .orderBy('createTime', 'desc')
          .skip(page * pageSize)
          .limit(pageSize)
          .get()
        return { code: 0, message: 'success', data: { list: users, total, page, pageSize } }
      }

      case 'detail': {
        verifyToken(token, 'users')
        const { openid } = reqData
        if (!openid) return { code: -1, message: '缺少 openid', data: null }

        const { data: users } = await db.collection('users').where({ openid }).limit(1).get()
        if (users.length === 0) return { code: -1, message: '用户不存在', data: null }

        // 获取用户的商品、订单数量
        const { total: productCount } = await db.collection('products').where({ sellerOpenid: openid }).count()
        const { total: orderCount } = await db.collection('orders').where(_.or([
          { buyerOpenid: openid },
          { sellerOpenid: openid }
        ])).count()
        const { total: reportCount } = await db.collection('reports').where({ targetId: openid, targetType: 'user' }).count()

        return {
          code: 0, message: 'success',
          data: { ...users[0], productCount, orderCount, reportCount }
        }
      }

      case 'ban': {
        const admin = verifyToken(token, 'users:write')
        const { openid, reason } = reqData
        if (!openid || !reason) return { code: -1, message: '缺少参数', data: null }

        await db.collection('users').where({ openid }).update({
          data: { status: 'banned', banReason: reason, banTime: db.serverDate(), updateTime: db.serverDate() }
        })
        await logAction(admin.username, 'ban_user', 'user', openid, { reason })
        return { code: 0, message: 'success', data: null }
      }

      case 'unban': {
        const admin = verifyToken(token, 'users:write')
        const { openid } = reqData
        if (!openid) return { code: -1, message: '缺少 openid', data: null }

        await db.collection('users').where({ openid }).update({
          data: { status: 'active', banReason: _.remove(), banTime: _.remove(), updateTime: db.serverDate() }
        })
        await logAction(admin.username, 'unban_user', 'user', openid, {})
        return { code: 0, message: 'success', data: null }
      }

      case 'adjust-credit': {
        const admin = verifyToken(token, 'users:write')
        const { openid, credit, reason } = reqData
        if (!openid || credit === undefined || !reason) return { code: -1, message: '缺少参数', data: null }

        // 获取旧信誉分
        const { data: users } = await db.collection('users').where({ openid }).limit(1).get()
        const oldCredit = users.length > 0 ? (users[0].credit || 100) : 100

        await db.collection('users').where({ openid }).update({
          data: { credit: Number(credit), updateTime: db.serverDate() }
        })
        await logAction(admin.username, 'adjust_credit', 'user', openid, { oldCredit, newCredit: Number(credit), reason })
        return { code: 0, message: 'success', data: null }
      }

      default:
        return { code: -1, message: '未知操作: ' + action, data: null }
    }
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return { code: -1, message: '令牌已过期，请重新登录', data: null }
    }
    return { code: -1, message: err.message, data: null }
  }
}
```

- [ ] **Step 3: Install dependencies and commit**

```bash
cd cloudfunctions/admin-users && npm install
git add cloudfunctions/admin-users/
git commit -m "feat: add admin-users cloud function (list/detail/ban/unban/credit)"
```

---

## Task 4: Admin Products Cloud Function

**Files:**
- Create: `cloudfunctions/admin-products/index.js`
- Create: `cloudfunctions/admin-products/package.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "admin-products",
  "version": "1.0.0",
  "dependencies": {
    "wx-server-sdk": "~2.6.3",
    "jsonwebtoken": "^9.0.0"
  }
}
```

- [ ] **Step 2: Create index.js**

```javascript
const cloud = require('wx-server-sdk')
const jwt = require('jsonwebtoken')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const JWT_SECRET = process.env.JWT_SECRET || 'xloop-admin-secret-key-change-in-production'

const ROLE_PERMISSIONS = {
  super_admin: ['products', 'products:write'],
  content_moderator: ['products', 'products:write'],
  customer_service: ['products'],
  data_analyst: []
}

function verifyToken(token, requiredPerm) {
  if (!token) throw new Error('未提供认证令牌')
  const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token
  const decoded = jwt.verify(actualToken, JWT_SECRET)
  const perms = ROLE_PERMISSIONS[decoded.role] || []
  if (requiredPerm && !perms.includes(requiredPerm)) throw new Error('权限不足')
  return decoded
}

async function logAction(username, action, targetType, targetId, detail) {
  try {
    await db.collection('admin_logs').add({
      data: { username, action, targetType, targetId, detail, createTime: db.serverDate() }
    })
  } catch (err) {
    console.error('写入审计日志失败:', err)
  }
}

exports.main = async (event) => {
  try {
    const { action, token, data: reqData } = event

    switch (action) {
      case 'list': {
        verifyToken(token, 'products')
        const { page = 0, pageSize = 20, keyword = '', category = '', status = '', sortBy = 'createTime', sortOrder = 'desc' } = reqData || {}

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
        verifyToken(token, 'products')
        const { id } = reqData
        if (!id) return { code: -1, message: '缺少商品ID', data: null }

        const { data: product } = await db.collection('products').doc(id).get()

        // 获取卖家信息
        let seller = null
        if (product.sellerOpenid) {
          const { data: sellers } = await db.collection('users').where({ openid: product.sellerOpenid }).limit(1).get()
          if (sellers.length > 0) seller = { nickName: sellers[0].nickName, avatarUrl: sellers[0].avatarUrl, credit: sellers[0].credit, status: sellers[0].status }
        }

        // 获取举报记录
        const { data: reports } = await db.collection('reports').where({ targetId: id, targetType: 'product' }).orderBy('createTime', 'desc').get()

        return { code: 0, message: 'success', data: { ...product, seller, reports } }
      }

      case 'remove': {
        const admin = verifyToken(token, 'products:write')
        const { id, reason } = reqData
        if (!id || !reason) return { code: -1, message: '缺少参数', data: null }

        await db.collection('products').doc(id).update({
          data: { status: 'off_shelf', adminNote: reason, updateTime: db.serverDate() }
        })
        await logAction(admin.username, 'remove_product', 'product', id, { reason })
        return { code: 0, message: 'success', data: null }
      }

      case 'restore': {
        const admin = verifyToken(token, 'products:write')
        const { id } = reqData
        if (!id) return { code: -1, message: '缺少商品ID', data: null }

        await db.collection('products').doc(id).update({
          data: { status: 'on_sale', adminNote: _.remove(), updateTime: db.serverDate() }
        })
        await logAction(admin.username, 'restore_product', 'product', id, {})
        return { code: 0, message: 'success', data: null }
      }

      case 'batch-remove': {
        const admin = verifyToken(token, 'products:write')
        const { ids, reason } = reqData
        if (!ids || ids.length === 0 || !reason) return { code: -1, message: '缺少参数', data: null }

        for (const id of ids) {
          await db.collection('products').doc(id).update({
            data: { status: 'off_shelf', adminNote: reason, updateTime: db.serverDate() }
          })
        }
        await logAction(admin.username, 'batch_remove_products', 'product', ids.join(','), { reason, count: ids.length })
        return { code: 0, message: 'success', data: null }
      }

      default:
        return { code: -1, message: '未知操作: ' + action, data: null }
    }
  } catch (err) {
    if (err.name === 'TokenExpiredError') return { code: -1, message: '令牌已过期，请重新登录', data: null }
    return { code: -1, message: err.message, data: null }
  }
}
```

- [ ] **Step 3: Install dependencies and commit**

```bash
cd cloudfunctions/admin-products && npm install
git add cloudfunctions/admin-products/
git commit -m "feat: add admin-products cloud function (list/detail/remove/restore/batch)"
```

---

## Task 5: Admin Orders Cloud Function

**Files:**
- Create: `cloudfunctions/admin-orders/index.js`
- Create: `cloudfunctions/admin-orders/package.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "admin-orders",
  "version": "1.0.0",
  "dependencies": {
    "wx-server-sdk": "~2.6.3",
    "jsonwebtoken": "^9.0.0"
  }
}
```

- [ ] **Step 2: Create index.js**

```javascript
const cloud = require('wx-server-sdk')
const jwt = require('jsonwebtoken')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const JWT_SECRET = process.env.JWT_SECRET || 'xloop-admin-secret-key-change-in-production'

const ROLE_PERMISSIONS = {
  super_admin: ['orders', 'orders:write'],
  customer_service: ['orders', 'orders:write'],
  content_moderator: [],
  data_analyst: []
}

function verifyToken(token, requiredPerm) {
  if (!token) throw new Error('未提供认证令牌')
  const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token
  const decoded = jwt.verify(actualToken, JWT_SECRET)
  const perms = ROLE_PERMISSIONS[decoded.role] || []
  if (requiredPerm && !perms.includes(requiredPerm)) throw new Error('权限不足')
  return decoded
}

async function logAction(username, action, targetType, targetId, detail) {
  try {
    await db.collection('admin_logs').add({
      data: { username, action, targetType, targetId, detail, createTime: db.serverDate() }
    })
  } catch (err) {
    console.error('写入审计日志失败:', err)
  }
}

exports.main = async (event) => {
  try {
    const { action, token, data: reqData } = event

    switch (action) {
      case 'list': {
        verifyToken(token, 'orders')
        const { page = 0, pageSize = 20, status = '', disputeOnly = false } = reqData || {}

        const conditions = {}
        if (status) conditions.status = status
        if (disputeOnly) conditions.disputeStatus = 'open'

        let query = db.collection('orders')
        if (Object.keys(conditions).length > 0) query = query.where(conditions)

        const { total } = await query.count()
        const { data: orders } = await query
          .orderBy('createTime', 'desc')
          .skip(page * pageSize)
          .limit(pageSize)
          .get()

        // 批量获取商品标题
        for (const order of orders) {
          if (order.productId) {
            try {
              const { data: product } = await db.collection('products').doc(order.productId).get()
              order.productTitle = product.title
            } catch (e) {
              order.productTitle = '(已删除)'
            }
          }
        }

        return { code: 0, message: 'success', data: { list: orders, total, page, pageSize } }
      }

      case 'detail': {
        verifyToken(token, 'orders')
        const { id } = reqData
        if (!id) return { code: -1, message: '缺少订单ID', data: null }

        const { data: order } = await db.collection('orders').doc(id).get()

        // 获取买家信息
        let buyer = null
        if (order.buyerOpenid) {
          const { data: buyers } = await db.collection('users').where({ openid: order.buyerOpenid }).limit(1).get()
          if (buyers.length > 0) buyer = { nickName: buyers[0].nickName, avatarUrl: buyers[0].avatarUrl }
        }

        // 获取卖家信息
        let seller = null
        if (order.sellerOpenid) {
          const { data: sellers } = await db.collection('users').where({ openid: order.sellerOpenid }).limit(1).get()
          if (sellers.length > 0) seller = { nickName: sellers[0].nickName, avatarUrl: sellers[0].avatarUrl }
        }

        // 获取商品信息
        let product = null
        if (order.productId) {
          try {
            const { data: p } = await db.collection('products').doc(order.productId).get()
            product = { title: p.title, images: p.images, price: p.price }
          } catch (e) {}
        }

        // 获取相关聊天记录
        const { data: messages } = await db.collection('messages')
          .where(_.or([
            { fromOpenid: order.buyerOpenid, toOpenid: order.sellerOpenid },
            { fromOpenid: order.sellerOpenid, toOpenid: order.buyerOpenid }
          ]))
          .orderBy('createTime', 'asc')
          .limit(50)
          .get()

        return { code: 0, message: 'success', data: { ...order, buyer, seller, product, messages } }
      }

      case 'intervene': {
        const admin = verifyToken(token, 'orders:write')
        const { id, note } = reqData
        if (!id) return { code: -1, message: '缺少订单ID', data: null }

        await db.collection('orders').doc(id).update({
          data: { disputeStatus: 'open', disputeNote: note || '', handlerUsername: admin.username, updateTime: db.serverDate() }
        })
        await logAction(admin.username, 'intervene_order', 'order', id, { note })
        return { code: 0, message: 'success', data: null }
      }

      case 'resolve': {
        const admin = verifyToken(token, 'orders:write')
        const { id, resolution, note } = reqData
        if (!id || !resolution) return { code: -1, message: '缺少参数', data: null }

        const updateData = {
          disputeStatus: 'resolved',
          disputeNote: note || '',
          handlerUsername: admin.username,
          updateTime: db.serverDate()
        }

        // 根据裁决更新订单状态
        if (resolution === 'force_refund') {
          updateData.status = 'cancelled'
        } else if (resolution === 'force_complete') {
          updateData.status = 'completed'
        }

        await db.collection('orders').doc(id).update({ data: updateData })
        await logAction(admin.username, 'resolve_dispute', 'order', id, { resolution, note })
        return { code: 0, message: 'success', data: null }
      }

      default:
        return { code: -1, message: '未知操作: ' + action, data: null }
    }
  } catch (err) {
    if (err.name === 'TokenExpiredError') return { code: -1, message: '令牌已过期，请重新登录', data: null }
    return { code: -1, message: err.message, data: null }
  }
}
```

- [ ] **Step 3: Install dependencies and commit**

```bash
cd cloudfunctions/admin-orders && npm install
git add cloudfunctions/admin-orders/
git commit -m "feat: add admin-orders cloud function (list/detail/intervene/resolve)"
```

---

## Task 6: Admin Reports Cloud Function

**Files:**
- Create: `cloudfunctions/admin-reports/index.js`
- Create: `cloudfunctions/admin-reports/package.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "admin-reports",
  "version": "1.0.0",
  "dependencies": {
    "wx-server-sdk": "~2.6.3",
    "jsonwebtoken": "^9.0.0"
  }
}
```

- [ ] **Step 2: Create index.js**

```javascript
const cloud = require('wx-server-sdk')
const jwt = require('jsonwebtoken')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const JWT_SECRET = process.env.JWT_SECRET || 'xloop-admin-secret-key-change-in-production'

const ROLE_PERMISSIONS = {
  super_admin: ['reports', 'reports:write'],
  content_moderator: ['reports', 'reports:write'],
  customer_service: [],
  data_analyst: []
}

function verifyToken(token, requiredPerm) {
  if (!token) throw new Error('未提供认证令牌')
  const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token
  const decoded = jwt.verify(actualToken, JWT_SECRET)
  const perms = ROLE_PERMISSIONS[decoded.role] || []
  if (requiredPerm && !perms.includes(requiredPerm)) throw new Error('权限不足')
  return decoded
}

async function logAction(username, action, targetType, targetId, detail) {
  try {
    await db.collection('admin_logs').add({
      data: { username, action, targetType, targetId, detail, createTime: db.serverDate() }
    })
  } catch (err) {
    console.error('写入审计日志失败:', err)
  }
}

exports.main = async (event) => {
  try {
    const { action, token, data: reqData } = event

    switch (action) {
      case 'list': {
        verifyToken(token, 'reports')
        const { page = 0, pageSize = 20, status = '' } = reqData || {}

        let query = db.collection('reports')
        if (status) query = query.where({ status })

        const { total } = await query.count()
        const { data: reports } = await query
          .orderBy('createTime', 'desc')
          .skip(page * pageSize)
          .limit(pageSize)
          .get()

        return { code: 0, message: 'success', data: { list: reports, total, page, pageSize } }
      }

      case 'detail': {
        verifyToken(token, 'reports')
        const { id } = reqData
        if (!id) return { code: -1, message: '缺少举报ID', data: null }

        const { data: report } = await db.collection('reports').doc(id).get()

        // 获取被举报对象信息
        let target = null
        if (report.targetType === 'product') {
          try {
            const { data: p } = await db.collection('products').doc(report.targetId).get()
            target = { title: p.title, images: p.images, status: p.status, sellerOpenid: p.sellerOpenid }
          } catch (e) {}
        } else if (report.targetType === 'user') {
          const { data: users } = await db.collection('users').where({ openid: report.targetId }).limit(1).get()
          if (users.length > 0) target = { nickName: users[0].nickName, status: users[0].status }
        }

        // 获取举报人信息
        let reporter = null
        if (report.reporterOpenid) {
          const { data: users } = await db.collection('users').where({ openid: report.reporterOpenid }).limit(1).get()
          if (users.length > 0) reporter = { nickName: users[0].nickName }
        }

        // 聚合同一对象的其他举报
        const { data: relatedReports } = await db.collection('reports')
          .where({ targetId: report.targetId, targetType: report.targetType, _id: _.neq(id) })
          .orderBy('createTime', 'desc')
          .limit(10)
          .get()

        return { code: 0, message: 'success', data: { ...report, target, reporter, relatedReports } }
      }

      case 'claim': {
        const admin = verifyToken(token, 'reports:write')
        const { id } = reqData
        if (!id) return { code: -1, message: '缺少举报ID', data: null }

        await db.collection('reports').doc(id).update({
          data: { status: 'processing', handlerUsername: admin.username }
        })
        return { code: 0, message: 'success', data: null }
      }

      case 'resolve': {
        const admin = verifyToken(token, 'reports:write')
        const { id, result, handleAction } = reqData
        if (!id || !result) return { code: -1, message: '缺少参数', data: null }

        // 更新举报状态
        const reportUpdate = {
          status: handleAction === 'reject' ? 'rejected' : 'resolved',
          handleResult: result,
          handlerUsername: admin.username,
          handleTime: db.serverDate()
        }
        await db.collection('reports').doc(id).update({ data: reportUpdate })

        // 如果需要，执行关联操作（下架商品/封禁用户）
        const { data: report } = await db.collection('reports').doc(id).get()
        if (handleAction === 'remove_product' && report.targetType === 'product') {
          await db.collection('products').doc(report.targetId).update({
            data: { status: 'off_shelf', adminNote: '因举报下架: ' + result, updateTime: db.serverDate() }
          })
          await logAction(admin.username, 'remove_product', 'product', report.targetId, { reason: result, fromReport: id })
        } else if (handleAction === 'ban_user' && report.targetType === 'user') {
          await db.collection('users').where({ openid: report.targetId }).update({
            data: { status: 'banned', banReason: '因举报封禁: ' + result, banTime: db.serverDate(), updateTime: db.serverDate() }
          })
          await logAction(admin.username, 'ban_user', 'user', report.targetId, { reason: result, fromReport: id })
        }

        await logAction(admin.username, 'resolve_report', 'report', id, { result, handleAction })
        return { code: 0, message: 'success', data: null }
      }

      default:
        return { code: -1, message: '未知操作: ' + action, data: null }
    }
  } catch (err) {
    if (err.name === 'TokenExpiredError') return { code: -1, message: '令牌已过期，请重新登录', data: null }
    return { code: -1, message: err.message, data: null }
  }
}
```

- [ ] **Step 3: Install dependencies and commit**

```bash
cd cloudfunctions/admin-reports && npm install
git add cloudfunctions/admin-reports/
git commit -m "feat: add admin-reports cloud function (list/detail/claim/resolve)"
```

---

## Task 7: Admin Stats Cloud Function

**Files:**
- Create: `cloudfunctions/admin-stats/index.js`
- Create: `cloudfunctions/admin-stats/package.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "admin-stats",
  "version": "1.0.0",
  "dependencies": {
    "wx-server-sdk": "~2.6.3",
    "jsonwebtoken": "^9.0.0"
  }
}
```

- [ ] **Step 2: Create index.js**

```javascript
const cloud = require('wx-server-sdk')
const jwt = require('jsonwebtoken')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const JWT_SECRET = process.env.JWT_SECRET || 'xloop-admin-secret-key-change-in-production'

function verifyToken(token) {
  if (!token) throw new Error('未提供认证令牌')
  const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token
  return jwt.verify(actualToken, JWT_SECRET)
}

// 获取今日零点的 Date 对象
function getTodayStart() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

// 获取 N 天前零点的 Date 对象
function getDaysAgo(n) {
  const d = getTodayStart()
  d.setDate(d.getDate() - n)
  return d
}

exports.main = async (event) => {
  try {
    const { action, token, data: reqData } = event
    verifyToken(token)

    switch (action) {
      case 'overview': {
        const todayStart = getTodayStart()

        // 总数统计
        const { total: totalUsers } = await db.collection('users').count()
        const { total: totalProducts } = await db.collection('products').where({ status: 'on_sale' }).count()
        const { total: totalOrders } = await db.collection('orders').count()
        const { total: pendingReports } = await db.collection('reports').where({ status: 'pending' }).count()
        const { total: openDisputes } = await db.collection('orders').where({ disputeStatus: 'open' }).count()

        // 今日新增
        const { total: todayUsers } = await db.collection('users').where({ createTime: _.gte(todayStart) }).count()
        const { total: todayProducts } = await db.collection('products').where({ createTime: _.gte(todayStart) }).count()
        const { total: todayOrders } = await db.collection('orders').where({ createTime: _.gte(todayStart) }).count()

        return {
          code: 0, message: 'success',
          data: {
            totalUsers, todayUsers,
            totalProducts, todayProducts,
            totalOrders, todayOrders,
            pendingReports, openDisputes
          }
        }
      }

      case 'trend': {
        const { type = 'users', days = 7 } = reqData || {}
        const collectionName = type === 'users' ? 'users' : type === 'products' ? 'products' : 'orders'

        const result = []
        for (let i = days - 1; i >= 0; i--) {
          const dayStart = getDaysAgo(i)
          const dayEnd = getDaysAgo(i - 1)
          const { total: count } = await db.collection(collectionName)
            .where({ createTime: _.gte(dayStart).and(_.lt(dayEnd)) })
            .count()

          const m = (dayStart.getMonth() + 1).toString().padStart(2, '0')
          const d = dayStart.getDate().toString().padStart(2, '0')
          result.push({ date: `${m}-${d}`, count })
        }

        return { code: 0, message: 'success', data: result }
      }

      case 'distribution': {
        const categories = ['textbook', 'electronics', 'clothing', 'daily', 'food', 'stationery', 'sports', 'other']
        const categoryNames = { textbook: '教材书籍', electronics: '电子产品', clothing: '服饰鞋包', daily: '生活用品', food: '食品零食', stationery: '文具办公', sports: '运动户外', other: '其他' }

        const result = []
        for (const cat of categories) {
          const { total: count } = await db.collection('products').where({ category: cat, status: 'on_sale' }).count()
          result.push({ category: cat, name: categoryNames[cat], count })
        }

        return { code: 0, message: 'success', data: result }
      }

      default:
        return { code: -1, message: '未知操作: ' + action, data: null }
    }
  } catch (err) {
    if (err.name === 'TokenExpiredError') return { code: -1, message: '令牌已过期，请重新登录', data: null }
    return { code: -1, message: err.message, data: null }
  }
}
```

- [ ] **Step 3: Install dependencies and commit**

```bash
cd cloudfunctions/admin-stats && npm install
git add cloudfunctions/admin-stats/
git commit -m "feat: add admin-stats cloud function (overview/trend/distribution)"
```

---

## Task 8: Modify Existing Cloud Functions for Banned User Check

**Files:**
- Modify: `cloudfunctions/user-login/index.js`
- Modify: `cloudfunctions/product-create/index.js`
- Modify: `cloudfunctions/product-update/index.js`

- [ ] **Step 1: Update user-login to set default status and check banned**

In `cloudfunctions/user-login/index.js`, after finding an existing user, add a banned check. When creating a new user, add `status: 'active'`.

In the section where existing user is found, add before returning:
```javascript
// 检查用户是否被封禁
if (user.status === 'banned') {
  return { code: -1, message: '您的账号已被封禁，原因: ' + (user.banReason || '违规操作'), data: null }
}
```

In the section where new user is created, add `status: 'active'` to the data object:
```javascript
status: 'active',
```

- [ ] **Step 2: Update product-create to check banned user**

In `cloudfunctions/product-create/index.js`, after getting the openid and before creating the product, add:
```javascript
// 检查用户是否被封禁
const { data: userList } = await db.collection('users').where({ openid }).limit(1).get()
if (userList.length > 0 && userList[0].status === 'banned') {
  return { code: -1, message: '您的账号已被封禁，无法发布商品', data: null }
}
```

- [ ] **Step 3: Update product-update to check banned user**

In `cloudfunctions/product-update/index.js`, after getting the openid and before updating, add:
```javascript
// 检查用户是否被封禁
const { data: userList } = await db.collection('users').where({ openid }).limit(1).get()
if (userList.length > 0 && userList[0].status === 'banned') {
  return { code: -1, message: '您的账号已被封禁，无法操作', data: null }
}
```

- [ ] **Step 4: Commit**

```bash
git add cloudfunctions/user-login/ cloudfunctions/product-create/ cloudfunctions/product-update/
git commit -m "feat: add banned user checks to existing cloud functions"
```

---

## Task 9: Admin Web — Project Scaffold + Login Page

**Files:**
- Create: `admin-web/package.json`
- Create: `admin-web/vite.config.js`
- Create: `admin-web/index.html`
- Create: `admin-web/src/main.js`
- Create: `admin-web/src/App.vue`
- Create: `admin-web/src/api/request.js`
- Create: `admin-web/src/api/auth.js`
- Create: `admin-web/src/stores/auth.js`
- Create: `admin-web/src/router/index.js`
- Create: `admin-web/src/utils/permission.js`
- Create: `admin-web/src/views/login/LoginView.vue`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "xloop-admin",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.3.0",
    "pinia": "^2.1.0",
    "element-plus": "^2.7.0",
    "axios": "^1.7.0",
    "echarts": "^5.5.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create vite.config.js**

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000
  }
})
```

- [ ] **Step 3: Create index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>X-Loop 管理后台</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: Create src/main.js**

```javascript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })
app.mount('#app')
```

- [ ] **Step 5: Create src/App.vue**

```vue
<template>
  <router-view />
</template>
```

- [ ] **Step 6: Create src/utils/permission.js**

```javascript
export const ROLE_MENUS = {
  super_admin: ['dashboard', 'users', 'products', 'reports', 'orders', 'system'],
  content_moderator: ['dashboard', 'users', 'products', 'reports'],
  customer_service: ['dashboard', 'users', 'products', 'orders'],
  data_analyst: ['dashboard']
}

export const ROLE_LABELS = {
  super_admin: '超级管理员',
  content_moderator: '内容审核员',
  customer_service: '客服',
  data_analyst: '数据分析师'
}

export function hasMenu(role, menu) {
  return (ROLE_MENUS[role] || []).includes(menu)
}
```

- [ ] **Step 7: Create src/api/request.js**

```javascript
import axios from 'axios'
import { ElMessage } from 'element-plus'

// 云函数 HTTP 触发器的基础 URL - 部署后替换为实际地址
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://your-cloud-env.service.tcloudbase.com'

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 30000
})

// 请求拦截器：添加 token
request.interceptors.request.use(config => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：统一错误处理
request.interceptors.response.use(
  response => {
    const res = response.data
    if (res.code !== 0) {
      ElMessage.error(res.message || '请求失败')
      if (res.message && res.message.includes('令牌已过期')) {
        localStorage.removeItem('admin_token')
        window.location.href = '/login'
      }
      return Promise.reject(new Error(res.message))
    }
    return res.data
  },
  error => {
    ElMessage.error('网络异常，请重试')
    return Promise.reject(error)
  }
)

/**
 * 调用管理端云函数
 * @param {string} funcName - 云函数名称 (如 'admin-login')
 * @param {object} data - 请求数据 (含 action 和 data 字段)
 */
export function callAdminApi(funcName, data = {}) {
  const token = localStorage.getItem('admin_token')
  return request.post(`/${funcName}`, { ...data, token })
}

export default request
```

- [ ] **Step 8: Create src/api/auth.js**

```javascript
import { callAdminApi } from './request'

export function login(username, password) {
  return callAdminApi('admin-login', { username, password })
}
```

- [ ] **Step 9: Create src/stores/auth.js**

```javascript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { hasMenu } from '../utils/permission'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('admin_token') || '')
  const role = ref(localStorage.getItem('admin_role') || '')
  const displayName = ref(localStorage.getItem('admin_displayName') || '')
  const username = ref(localStorage.getItem('admin_username') || '')

  const isLoggedIn = computed(() => !!token.value)

  function setAuth(data) {
    token.value = data.token
    role.value = data.role
    displayName.value = data.displayName
    username.value = data.username
    localStorage.setItem('admin_token', data.token)
    localStorage.setItem('admin_role', data.role)
    localStorage.setItem('admin_displayName', data.displayName)
    localStorage.setItem('admin_username', data.username)
  }

  function logout() {
    token.value = ''
    role.value = ''
    displayName.value = ''
    username.value = ''
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_role')
    localStorage.removeItem('admin_displayName')
    localStorage.removeItem('admin_username')
  }

  function canAccess(menu) {
    return hasMenu(role.value, menu)
  }

  return { token, role, displayName, username, isLoggedIn, setAuth, logout, canAccess }
})
```

- [ ] **Step 10: Create src/router/index.js**

```javascript
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/LoginView.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    component: () => import('../components/layout/AppLayout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('../views/dashboard/DashboardView.vue'), meta: { menu: 'dashboard', title: '数据看板' } },
      { path: 'users', name: 'UserList', component: () => import('../views/users/UserList.vue'), meta: { menu: 'users', title: '用户管理' } },
      { path: 'users/:openid', name: 'UserDetail', component: () => import('../views/users/UserDetail.vue'), meta: { menu: 'users', title: '用户详情' } },
      { path: 'products', name: 'ProductList', component: () => import('../views/products/ProductList.vue'), meta: { menu: 'products', title: '商品管理' } },
      { path: 'products/:id', name: 'ProductDetail', component: () => import('../views/products/ProductDetail.vue'), meta: { menu: 'products', title: '商品详情' } },
      { path: 'reports', name: 'ReportList', component: () => import('../views/reports/ReportList.vue'), meta: { menu: 'reports', title: '举报处理' } },
      { path: 'reports/:id', name: 'ReportDetail', component: () => import('../views/reports/ReportDetail.vue'), meta: { menu: 'reports', title: '举报详情' } },
      { path: 'orders', name: 'OrderList', component: () => import('../views/orders/OrderList.vue'), meta: { menu: 'orders', title: '订单管理' } },
      { path: 'orders/:id', name: 'OrderDetail', component: () => import('../views/orders/OrderDetail.vue'), meta: { menu: 'orders', title: '订单详情' } },
      { path: 'system/admins', name: 'AdminList', component: () => import('../views/system/AdminList.vue'), meta: { menu: 'system', title: '管理员管理' } },
      { path: 'system/logs', name: 'AdminLogs', component: () => import('../views/system/AdminLogs.vue'), meta: { menu: 'system', title: '操作日志' } },
      { path: 'system/categories', name: 'Categories', component: () => import('../views/system/Categories.vue'), meta: { menu: 'system', title: '分类管理' } }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  if (to.meta.public) return next()

  const token = localStorage.getItem('admin_token')
  if (!token) return next('/login')

  // 权限检查由页面组件自行处理（菜单已按角色过滤）
  next()
})

export default router
```

- [ ] **Step 11: Create src/views/login/LoginView.vue**

```vue
<template>
  <div class="login-container">
    <div class="login-card">
      <h1 class="login-title">X-Loop 管理后台</h1>
      <p class="login-subtitle">XJTLU 校园二手交易平台</p>
      <el-form ref="formRef" :model="form" :rules="rules" @keyup.enter="handleLogin">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名" prefix-icon="User" size="large" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" prefix-icon="Lock" size="large" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" style="width: 100%" :loading="loading" @click="handleLogin">登 录</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { login } from '../../api/auth'
import { ElMessage } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref()
const loading = ref(false)

const form = reactive({ username: '', password: '' })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function handleLogin() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const data = await login(form.username, form.password)
    authStore.setAuth(data)
    ElMessage.success('登录成功')
    router.push('/dashboard')
  } catch (err) {
    // 错误已在 request.js 中处理
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #010544 0%, #CE57C1 100%);
}
.login-card {
  width: 400px;
  padding: 40px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
.login-title {
  text-align: center;
  font-size: 24px;
  color: #010544;
  margin: 0 0 8px 0;
}
.login-subtitle {
  text-align: center;
  color: #999;
  font-size: 14px;
  margin: 0 0 32px 0;
}
</style>
```

- [ ] **Step 12: Install dependencies and commit**

```bash
cd admin-web && npm install
git add admin-web/
git commit -m "feat: scaffold admin-web with Vue 3, login page, router, auth store"
```

---

## Task 10: Admin Web — Layout Components

**Files:**
- Create: `admin-web/src/components/layout/AppLayout.vue`
- Create: `admin-web/src/components/layout/Sidebar.vue`
- Create: `admin-web/src/components/layout/Header.vue`

- [ ] **Step 1: Create Sidebar.vue**

```vue
<template>
  <el-aside :width="collapsed ? '64px' : '220px'" class="sidebar">
    <div class="logo">
      <span v-if="!collapsed">X-Loop Admin</span>
      <span v-else>X</span>
    </div>
    <el-menu :default-active="activeMenu" :collapse="collapsed" router background-color="#010544" text-color="#ccc" active-text-color="#CE57C1">
      <el-menu-item v-if="canAccess('dashboard')" index="/dashboard">
        <el-icon><DataAnalysis /></el-icon>
        <template #title>数据看板</template>
      </el-menu-item>
      <el-menu-item v-if="canAccess('users')" index="/users">
        <el-icon><User /></el-icon>
        <template #title>用户管理</template>
      </el-menu-item>
      <el-menu-item v-if="canAccess('products')" index="/products">
        <el-icon><Goods /></el-icon>
        <template #title>商品管理</template>
      </el-menu-item>
      <el-menu-item v-if="canAccess('reports')" index="/reports">
        <el-icon><Warning /></el-icon>
        <template #title>举报处理</template>
      </el-menu-item>
      <el-menu-item v-if="canAccess('orders')" index="/orders">
        <el-icon><List /></el-icon>
        <template #title>订单管理</template>
      </el-menu-item>
      <el-sub-menu v-if="canAccess('system')" index="system">
        <template #title>
          <el-icon><Setting /></el-icon>
          <span>系统管理</span>
        </template>
        <el-menu-item index="/system/admins">管理员管理</el-menu-item>
        <el-menu-item index="/system/logs">操作日志</el-menu-item>
        <el-menu-item index="/system/categories">分类管理</el-menu-item>
      </el-sub-menu>
    </el-menu>
  </el-aside>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { DataAnalysis, User, Goods, Warning, List, Setting } from '@element-plus/icons-vue'

defineProps({ collapsed: Boolean })

const route = useRoute()
const authStore = useAuthStore()

const activeMenu = computed(() => '/' + route.path.split('/').filter(Boolean).slice(0, 1).join('/'))
const canAccess = (menu) => authStore.canAccess(menu)
</script>

<style scoped>
.sidebar {
  background: #010544;
  transition: width 0.3s;
  overflow: hidden;
}
.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
</style>
```

- [ ] **Step 2: Create Header.vue**

```vue
<template>
  <el-header class="header">
    <div class="header-left">
      <el-icon class="collapse-btn" @click="$emit('toggle-collapse')"><Fold /></el-icon>
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item v-if="route.meta.title">{{ route.meta.title }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    <div class="header-right">
      <span class="user-info">{{ authStore.displayName }} ({{ roleLabel }})</span>
      <el-button text @click="handleLogout">退出</el-button>
    </div>
  </el-header>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { Fold } from '@element-plus/icons-vue'
import { ROLE_LABELS } from '../../utils/permission'

defineEmits(['toggle-collapse'])

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const roleLabel = computed(() => ROLE_LABELS[authStore.role] || authStore.role)

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #eee;
  padding: 0 20px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.collapse-btn {
  font-size: 20px;
  cursor: pointer;
}
.user-info {
  color: #666;
  font-size: 14px;
}
</style>
```

- [ ] **Step 3: Create AppLayout.vue**

```vue
<template>
  <el-container class="app-layout">
    <Sidebar :collapsed="collapsed" />
    <el-container>
      <Header @toggle-collapse="collapsed = !collapsed" />
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref } from 'vue'
import Sidebar from './Sidebar.vue'
import Header from './Header.vue'

const collapsed = ref(false)
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
}
.main-content {
  background: #f5f5f5;
  padding: 20px;
}
</style>
```

- [ ] **Step 4: Commit**

```bash
cd admin-web && git add src/components/
git commit -m "feat: add admin layout components (sidebar, header, app layout)"
```

---

## Task 11: Admin Web — Dashboard Page

**Files:**
- Create: `admin-web/src/api/stats.js`
- Create: `admin-web/src/views/dashboard/DashboardView.vue`

- [ ] **Step 1: Create src/api/stats.js**

```javascript
import { callAdminApi } from './request'

export function getOverview() {
  return callAdminApi('admin-stats', { action: 'overview' })
}

export function getTrend(type, days) {
  return callAdminApi('admin-stats', { action: 'trend', data: { type, days } })
}

export function getDistribution() {
  return callAdminApi('admin-stats', { action: 'distribution' })
}
```

- [ ] **Step 2: Create DashboardView.vue**

```vue
<template>
  <div>
    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stat-cards">
      <el-col :span="6" v-for="card in statCards" :key="card.label">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-value">{{ card.value }}</div>
            <div class="stat-label">{{ card.label }}</div>
            <div class="stat-sub" v-if="card.sub">{{ card.sub }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="16" style="margin-top: 16px;">
      <el-col :span="12">
        <el-card header="用户增长趋势">
          <div ref="userChartRef" style="height: 300px;"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card header="交易量趋势">
          <div ref="orderChartRef" style="height: 300px;"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 16px;">
      <el-col :span="12">
        <el-card header="商品分类分布">
          <div ref="categoryChartRef" style="height: 300px;"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import * as echarts from 'echarts'
import { getOverview, getTrend, getDistribution } from '../../api/stats'

const userChartRef = ref()
const orderChartRef = ref()
const categoryChartRef = ref()

const statCards = reactive([
  { label: '总用户数', value: 0, sub: '' },
  { label: '在售商品', value: 0, sub: '' },
  { label: '总订单数', value: 0, sub: '' },
  { label: '待处理', value: 0, sub: '' }
])

function initLineChart(el, dates, counts, color) {
  const chart = echarts.init(el)
  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value', minInterval: 1 },
    series: [{ type: 'line', data: counts, smooth: true, itemStyle: { color }, areaStyle: { color: color + '20' } }]
  })
}

function initPieChart(el, data) {
  const chart = echarts.init(el)
  chart.setOption({
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: data.map(d => ({ name: d.name, value: d.count })),
      emphasis: { itemStyle: { shadowBlur: 10 } }
    }]
  })
}

onMounted(async () => {
  try {
    const overview = await getOverview()
    statCards[0].value = overview.totalUsers
    statCards[0].sub = `今日 +${overview.todayUsers}`
    statCards[1].value = overview.totalProducts
    statCards[1].sub = `今日 +${overview.todayProducts}`
    statCards[2].value = overview.totalOrders
    statCards[2].sub = `今日 +${overview.todayOrders}`
    statCards[3].value = overview.pendingReports + overview.openDisputes
    statCards[3].sub = `举报 ${overview.pendingReports} / 纠纷 ${overview.openDisputes}`
  } catch (e) {}

  try {
    const userTrend = await getTrend('users', 7)
    initLineChart(userChartRef.value, userTrend.map(d => d.date), userTrend.map(d => d.count), '#010544')
  } catch (e) {}

  try {
    const orderTrend = await getTrend('orders', 7)
    initLineChart(orderChartRef.value, orderTrend.map(d => d.date), orderTrend.map(d => d.count), '#CE57C1')
  } catch (e) {}

  try {
    const dist = await getDistribution()
    initPieChart(categoryChartRef.value, dist)
  } catch (e) {}
})
</script>

<style scoped>
.stat-cards { margin-bottom: 16px; }
.stat-card { text-align: center; padding: 10px 0; }
.stat-value { font-size: 32px; font-weight: bold; color: #010544; }
.stat-label { color: #999; font-size: 14px; margin-top: 4px; }
.stat-sub { color: #CE57C1; font-size: 12px; margin-top: 4px; }
</style>
```

- [ ] **Step 3: Commit**

```bash
cd admin-web && git add src/api/stats.js src/views/dashboard/
git commit -m "feat: add dashboard page with stats cards and charts"
```

---

## Task 12: Admin Web — User Management Pages

**Files:**
- Create: `admin-web/src/api/users.js`
- Create: `admin-web/src/views/users/UserList.vue`
- Create: `admin-web/src/views/users/UserDetail.vue`

- [ ] **Step 1: Create src/api/users.js**

```javascript
import { callAdminApi } from './request'

export function getUserList(params) {
  return callAdminApi('admin-users', { action: 'list', data: params })
}

export function getUserDetail(openid) {
  return callAdminApi('admin-users', { action: 'detail', data: { openid } })
}

export function banUser(openid, reason) {
  return callAdminApi('admin-users', { action: 'ban', data: { openid, reason } })
}

export function unbanUser(openid) {
  return callAdminApi('admin-users', { action: 'unban', data: { openid } })
}

export function adjustCredit(openid, credit, reason) {
  return callAdminApi('admin-users', { action: 'adjust-credit', data: { openid, credit, reason } })
}
```

- [ ] **Step 2: Create UserList.vue**

```vue
<template>
  <div>
    <!-- 搜索栏 -->
    <el-card style="margin-bottom: 16px;">
      <el-form inline>
        <el-form-item label="搜索">
          <el-input v-model="query.keyword" placeholder="昵称" clearable @keyup.enter="fetchData" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" clearable placeholder="全部">
            <el-option label="正常" value="active" />
            <el-option label="封禁" value="banned" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchData">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 用户列表 -->
    <el-card>
      <el-table :data="users" v-loading="loading" stripe>
        <el-table-column prop="nickName" label="昵称" min-width="120" />
        <el-table-column prop="openid" label="OpenID" min-width="200" show-overflow-tooltip />
        <el-table-column prop="credit" label="信誉分" width="80" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'banned' ? 'danger' : 'success'" size="small">
              {{ row.status === 'banned' ? '封禁' : '正常' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="注册时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="$router.push(`/users/${row.openid}`)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination style="margin-top: 16px; justify-content: flex-end;" background layout="total, prev, pager, next"
        :total="total" :page-size="query.pageSize" v-model:current-page="currentPage" @current-change="handlePageChange" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { getUserList } from '../../api/users'

const loading = ref(false)
const users = ref([])
const total = ref(0)
const currentPage = ref(1)
const query = reactive({ keyword: '', status: '', pageSize: 20 })

function formatDate(d) {
  if (!d) return '-'
  const date = new Date(d)
  return date.toLocaleString('zh-CN')
}

async function fetchData() {
  loading.value = true
  try {
    const res = await getUserList({ ...query, page: currentPage.value - 1 })
    users.value = res.list
    total.value = res.total
  } catch (e) {} finally {
    loading.value = false
  }
}

function handlePageChange(page) {
  currentPage.value = page
  fetchData()
}

onMounted(fetchData)
</script>
```

- [ ] **Step 3: Create UserDetail.vue**

```vue
<template>
  <div v-loading="loading">
    <el-page-header @back="$router.back()" content="用户详情" style="margin-bottom: 16px;" />

    <!-- 用户基本信息 -->
    <el-card style="margin-bottom: 16px;">
      <el-descriptions :column="3" border>
        <el-descriptions-item label="昵称">{{ user.nickName }}</el-descriptions-item>
        <el-descriptions-item label="OpenID">{{ user.openid }}</el-descriptions-item>
        <el-descriptions-item label="信誉分">
          {{ user.credit || 100 }}
          <el-button v-if="authStore.canAccess('users')" type="primary" link size="small" @click="showCreditDialog = true" style="margin-left: 8px;">调整</el-button>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="user.status === 'banned' ? 'danger' : 'success'">{{ user.status === 'banned' ? '封禁' : '正常' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="发布商品数">{{ user.productCount }}</el-descriptions-item>
        <el-descriptions-item label="订单数">{{ user.orderCount }}</el-descriptions-item>
        <el-descriptions-item label="被举报次数">{{ user.reportCount }}</el-descriptions-item>
        <el-descriptions-item label="注册时间">{{ formatDate(user.createTime) }}</el-descriptions-item>
        <el-descriptions-item v-if="user.banReason" label="封禁原因">{{ user.banReason }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 操作按钮 -->
    <el-card v-if="authStore.canAccess('users')">
      <el-button v-if="user.status !== 'banned'" type="danger" @click="showBanDialog = true">封禁用户</el-button>
      <el-button v-else type="success" @click="handleUnban">解除封禁</el-button>
    </el-card>

    <!-- 封禁对话框 -->
    <el-dialog v-model="showBanDialog" title="封禁用户" width="400px">
      <el-input v-model="banReason" type="textarea" :rows="3" placeholder="请输入封禁原因（必填）" />
      <template #footer>
        <el-button @click="showBanDialog = false">取消</el-button>
        <el-button type="danger" :disabled="!banReason.trim()" @click="handleBan">确认封禁</el-button>
      </template>
    </el-dialog>

    <!-- 信誉分调整对话框 -->
    <el-dialog v-model="showCreditDialog" title="调整信誉分" width="400px">
      <el-form>
        <el-form-item label="新信誉分">
          <el-input-number v-model="newCredit" :min="0" :max="200" />
        </el-form-item>
        <el-form-item label="调整原因">
          <el-input v-model="creditReason" type="textarea" :rows="2" placeholder="请输入原因（必填）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreditDialog = false">取消</el-button>
        <el-button type="primary" :disabled="!creditReason.trim()" @click="handleAdjustCredit">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { getUserDetail, banUser, unbanUser, adjustCredit } from '../../api/users'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const authStore = useAuthStore()
const loading = ref(true)
const user = ref({})

const showBanDialog = ref(false)
const banReason = ref('')
const showCreditDialog = ref(false)
const newCredit = ref(100)
const creditReason = ref('')

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN')
}

async function fetchData() {
  loading.value = true
  try {
    user.value = await getUserDetail(route.params.openid)
    newCredit.value = user.value.credit || 100
  } catch (e) {} finally {
    loading.value = false
  }
}

async function handleBan() {
  await banUser(user.value.openid, banReason.value)
  ElMessage.success('已封禁')
  showBanDialog.value = false
  banReason.value = ''
  fetchData()
}

async function handleUnban() {
  await ElMessageBox.confirm('确定解除该用户的封禁？', '提示')
  await unbanUser(user.value.openid)
  ElMessage.success('已解封')
  fetchData()
}

async function handleAdjustCredit() {
  await adjustCredit(user.value.openid, newCredit.value, creditReason.value)
  ElMessage.success('信誉分已调整')
  showCreditDialog.value = false
  creditReason.value = ''
  fetchData()
}

onMounted(fetchData)
</script>
```

- [ ] **Step 4: Commit**

```bash
cd admin-web && git add src/api/users.js src/views/users/
git commit -m "feat: add user management pages (list + detail with ban/credit)"
```

---

## Task 13: Admin Web — Product Management Pages

**Files:**
- Create: `admin-web/src/api/products.js`
- Create: `admin-web/src/views/products/ProductList.vue`
- Create: `admin-web/src/views/products/ProductDetail.vue`

- [ ] **Step 1: Create src/api/products.js**

```javascript
import { callAdminApi } from './request'

export function getProductList(params) {
  return callAdminApi('admin-products', { action: 'list', data: params })
}

export function getProductDetail(id) {
  return callAdminApi('admin-products', { action: 'detail', data: { id } })
}

export function removeProduct(id, reason) {
  return callAdminApi('admin-products', { action: 'remove', data: { id, reason } })
}

export function restoreProduct(id) {
  return callAdminApi('admin-products', { action: 'restore', data: { id } })
}

export function batchRemoveProducts(ids, reason) {
  return callAdminApi('admin-products', { action: 'batch-remove', data: { ids, reason } })
}
```

- [ ] **Step 2: Create ProductList.vue**

```vue
<template>
  <div>
    <el-card style="margin-bottom: 16px;">
      <el-form inline>
        <el-form-item label="搜索">
          <el-input v-model="query.keyword" placeholder="商品标题" clearable @keyup.enter="fetchData" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="query.category" clearable placeholder="全部">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" clearable placeholder="全部">
            <el-option label="在售" value="on_sale" />
            <el-option label="已预订" value="reserved" />
            <el-option label="已售出" value="sold" />
            <el-option label="已下架" value="off_shelf" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchData">查询</el-button>
          <el-button type="danger" :disabled="selectedIds.length === 0" @click="showBatchDialog = true">批量下架</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card>
      <el-table :data="products" v-loading="loading" stripe @selection-change="handleSelection">
        <el-table-column type="selection" width="50" />
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="price" label="价格" width="100">
          <template #default="{ row }">¥{{ row.price }}</template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="100" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="viewCount" label="浏览" width="70" />
        <el-table-column prop="reportCount" label="举报" width="70" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="$router.push(`/products/${row._id}`)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination style="margin-top: 16px; justify-content: flex-end;" background layout="total, prev, pager, next"
        :total="total" :page-size="query.pageSize" v-model:current-page="currentPage" @current-change="handlePageChange" />
    </el-card>

    <!-- 批量下架对话框 -->
    <el-dialog v-model="showBatchDialog" title="批量下架" width="400px">
      <p>将下架 {{ selectedIds.length }} 件商品</p>
      <el-input v-model="batchReason" type="textarea" :rows="3" placeholder="下架原因（必填）" />
      <template #footer>
        <el-button @click="showBatchDialog = false">取消</el-button>
        <el-button type="danger" :disabled="!batchReason.trim()" @click="handleBatchRemove">确认下架</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getProductList, batchRemoveProducts } from '../../api/products'
import { ElMessage } from 'element-plus'

const categories = [
  { id: 'textbook', name: '教材书籍' }, { id: 'electronics', name: '电子产品' },
  { id: 'clothing', name: '服饰鞋包' }, { id: 'daily', name: '生活用品' },
  { id: 'food', name: '食品零食' }, { id: 'stationery', name: '文具办公' },
  { id: 'sports', name: '运动户外' }, { id: 'other', name: '其他' }
]

const loading = ref(false)
const products = ref([])
const total = ref(0)
const currentPage = ref(1)
const selectedIds = ref([])
const showBatchDialog = ref(false)
const batchReason = ref('')
const query = reactive({ keyword: '', category: '', status: '', pageSize: 20 })

const statusText = (s) => ({ on_sale: '在售', reserved: '已预订', sold: '已售出', off_shelf: '已下架' }[s] || s)
const statusType = (s) => ({ on_sale: 'success', reserved: 'warning', sold: 'info', off_shelf: 'danger' }[s] || '')

async function fetchData() {
  loading.value = true
  try {
    const res = await getProductList({ ...query, page: currentPage.value - 1 })
    products.value = res.list
    total.value = res.total
  } catch (e) {} finally { loading.value = false }
}

function handleSelection(rows) { selectedIds.value = rows.map(r => r._id) }
function handlePageChange(page) { currentPage.value = page; fetchData() }

async function handleBatchRemove() {
  await batchRemoveProducts(selectedIds.value, batchReason.value)
  ElMessage.success('已批量下架')
  showBatchDialog.value = false
  batchReason.value = ''
  fetchData()
}

onMounted(fetchData)
</script>
```

- [ ] **Step 3: Create ProductDetail.vue**

```vue
<template>
  <div v-loading="loading">
    <el-page-header @back="$router.back()" content="商品详情" style="margin-bottom: 16px;" />

    <el-row :gutter="16">
      <el-col :span="16">
        <el-card style="margin-bottom: 16px;">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="标题" :span="2">{{ product.title }}</el-descriptions-item>
            <el-descriptions-item label="价格">¥{{ product.price }}</el-descriptions-item>
            <el-descriptions-item label="分类">{{ product.category }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="product.status === 'off_shelf' ? 'danger' : 'success'">{{ product.status }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="浏览次数">{{ product.viewCount }}</el-descriptions-item>
            <el-descriptions-item label="描述" :span="2">{{ product.description }}</el-descriptions-item>
            <el-descriptions-item v-if="product.adminNote" label="管理员备注" :span="2">
              <span style="color: red;">{{ product.adminNote }}</span>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 商品图片 -->
        <el-card v-if="product.images && product.images.length" style="margin-bottom: 16px;">
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <el-image v-for="(img, i) in product.images" :key="i" :src="img" style="width: 150px; height: 150px;" fit="cover" :preview-src-list="product.images" />
          </div>
        </el-card>

        <!-- 操作 -->
        <el-card>
          <el-button v-if="product.status !== 'off_shelf'" type="danger" @click="showRemoveDialog = true">强制下架</el-button>
          <el-button v-else type="success" @click="handleRestore">恢复上架</el-button>
        </el-card>
      </el-col>

      <el-col :span="8">
        <!-- 卖家信息 -->
        <el-card header="卖家信息" style="margin-bottom: 16px;">
          <p>昵称: {{ product.seller?.nickName || '-' }}</p>
          <p>信誉分: {{ product.seller?.credit || '-' }}</p>
          <p>状态: <el-tag size="small" :type="product.seller?.status === 'banned' ? 'danger' : 'success'">{{ product.seller?.status === 'banned' ? '封禁' : '正常' }}</el-tag></p>
        </el-card>

        <!-- 举报记录 -->
        <el-card header="举报记录">
          <el-empty v-if="!product.reports || product.reports.length === 0" description="暂无举报" />
          <div v-for="r in product.reports" :key="r._id" style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #eee;">
            <div>原因: {{ r.reason }}</div>
            <div style="color: #999; font-size: 12px;">{{ r.description }}</div>
            <el-tag size="small">{{ r.status }}</el-tag>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 下架对话框 -->
    <el-dialog v-model="showRemoveDialog" title="强制下架" width="400px">
      <el-input v-model="removeReason" type="textarea" :rows="3" placeholder="下架原因（必填）" />
      <template #footer>
        <el-button @click="showRemoveDialog = false">取消</el-button>
        <el-button type="danger" :disabled="!removeReason.trim()" @click="handleRemove">确认下架</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getProductDetail, removeProduct, restoreProduct } from '../../api/products'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const loading = ref(true)
const product = ref({})
const showRemoveDialog = ref(false)
const removeReason = ref('')

async function fetchData() {
  loading.value = true
  try { product.value = await getProductDetail(route.params.id) }
  catch (e) {} finally { loading.value = false }
}

async function handleRemove() {
  await removeProduct(product.value._id, removeReason.value)
  ElMessage.success('已下架')
  showRemoveDialog.value = false
  removeReason.value = ''
  fetchData()
}

async function handleRestore() {
  await ElMessageBox.confirm('确定恢复该商品上架？', '提示')
  await restoreProduct(product.value._id)
  ElMessage.success('已恢复上架')
  fetchData()
}

onMounted(fetchData)
</script>
```

- [ ] **Step 4: Commit**

```bash
cd admin-web && git add src/api/products.js src/views/products/
git commit -m "feat: add product management pages (list + detail with remove/restore)"
```

---

## Task 14: Admin Web — Report Management Pages

**Files:**
- Create: `admin-web/src/api/reports.js`
- Create: `admin-web/src/views/reports/ReportList.vue`
- Create: `admin-web/src/views/reports/ReportDetail.vue`

- [ ] **Step 1: Create src/api/reports.js**

```javascript
import { callAdminApi } from './request'

export function getReportList(params) {
  return callAdminApi('admin-reports', { action: 'list', data: params })
}

export function getReportDetail(id) {
  return callAdminApi('admin-reports', { action: 'detail', data: { id } })
}

export function claimReport(id) {
  return callAdminApi('admin-reports', { action: 'claim', data: { id } })
}

export function resolveReport(id, result, handleAction) {
  return callAdminApi('admin-reports', { action: 'resolve', data: { id, result, handleAction } })
}
```

- [ ] **Step 2: Create ReportList.vue**

```vue
<template>
  <div>
    <el-card>
      <el-tabs v-model="activeTab" @tab-change="fetchData">
        <el-tab-pane label="待处理" name="pending" />
        <el-tab-pane label="处理中" name="processing" />
        <el-tab-pane label="已完结" name="resolved" />
      </el-tabs>

      <el-table :data="reports" v-loading="loading" stripe>
        <el-table-column prop="targetType" label="类型" width="80">
          <template #default="{ row }">{{ { product: '商品', user: '用户', message: '消息' }[row.targetType] }}</template>
        </el-table-column>
        <el-table-column prop="reason" label="原因" width="120" />
        <el-table-column prop="description" label="说明" min-width="200" show-overflow-tooltip />
        <el-table-column prop="handlerUsername" label="处理人" width="100" />
        <el-table-column label="时间" width="160">
          <template #default="{ row }">{{ new Date(row.createTime).toLocaleString('zh-CN') }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="$router.push(`/reports/${row._id}`)">处理</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination style="margin-top: 16px; justify-content: flex-end;" background layout="total, prev, pager, next"
        :total="total" :page-size="pageSize" v-model:current-page="currentPage" @current-change="handlePageChange" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getReportList } from '../../api/reports'

const loading = ref(false)
const reports = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = 20
const activeTab = ref('pending')

async function fetchData() {
  loading.value = true
  try {
    const res = await getReportList({ status: activeTab.value, page: currentPage.value - 1, pageSize })
    reports.value = res.list
    total.value = res.total
  } catch (e) {} finally { loading.value = false }
}

function handlePageChange(page) { currentPage.value = page; fetchData() }

onMounted(fetchData)
</script>
```

- [ ] **Step 3: Create ReportDetail.vue**

```vue
<template>
  <div v-loading="loading">
    <el-page-header @back="$router.back()" content="举报详情" style="margin-bottom: 16px;" />

    <el-row :gutter="16">
      <el-col :span="16">
        <el-card style="margin-bottom: 16px;">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="举报类型">{{ { product: '商品', user: '用户', message: '消息' }[report.targetType] }}</el-descriptions-item>
            <el-descriptions-item label="原因">{{ report.reason }}</el-descriptions-item>
            <el-descriptions-item label="状态"><el-tag>{{ report.status }}</el-tag></el-descriptions-item>
            <el-descriptions-item label="举报人">{{ report.reporter?.nickName || report.reporterOpenid }}</el-descriptions-item>
            <el-descriptions-item label="说明" :span="2">{{ report.description || '-' }}</el-descriptions-item>
            <el-descriptions-item v-if="report.handleResult" label="处理结果" :span="2">{{ report.handleResult }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 被举报对象信息 -->
        <el-card header="被举报对象" style="margin-bottom: 16px;">
          <div v-if="report.targetType === 'product' && report.target">
            <p>商品标题: {{ report.target.title }}</p>
            <p>状态: <el-tag size="small">{{ report.target.status }}</el-tag></p>
            <div v-if="report.target.images" style="display: flex; gap: 8px; margin-top: 8px;">
              <el-image v-for="(img, i) in report.target.images" :key="i" :src="img" style="width: 100px; height: 100px;" fit="cover" />
            </div>
          </div>
          <div v-else-if="report.targetType === 'user' && report.target">
            <p>用户昵称: {{ report.target.nickName }}</p>
            <p>状态: <el-tag size="small" :type="report.target.status === 'banned' ? 'danger' : 'success'">{{ report.target.status }}</el-tag></p>
          </div>
        </el-card>

        <!-- 处理操作 -->
        <el-card v-if="report.status === 'pending' || report.status === 'processing'">
          <el-button v-if="report.status === 'pending'" type="warning" @click="handleClaim">认领</el-button>
          <el-button type="danger" @click="openResolve('remove_product')" v-if="report.targetType === 'product'">下架商品</el-button>
          <el-button type="danger" @click="openResolve('ban_user')" v-if="report.targetType === 'user'">封禁用户</el-button>
          <el-button @click="openResolve('reject')">驳回举报</el-button>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card header="同对象其他举报">
          <el-empty v-if="!report.relatedReports || report.relatedReports.length === 0" description="无其他举报" />
          <div v-for="r in report.relatedReports" :key="r._id" style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #eee;">
            <div>{{ r.reason }} - {{ r.description }}</div>
            <el-tag size="small">{{ r.status }}</el-tag>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 处理对话框 -->
    <el-dialog v-model="showResolveDialog" title="处理举报" width="400px">
      <p>操作: {{ resolveActionText }}</p>
      <el-input v-model="resolveResult" type="textarea" :rows="3" placeholder="处理说明（必填）" />
      <template #footer>
        <el-button @click="showResolveDialog = false">取消</el-button>
        <el-button type="primary" :disabled="!resolveResult.trim()" @click="handleResolve">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getReportDetail, claimReport, resolveReport } from '../../api/reports'
import { ElMessage } from 'element-plus'

const route = useRoute()
const loading = ref(true)
const report = ref({})
const showResolveDialog = ref(false)
const resolveAction = ref('')
const resolveResult = ref('')

const resolveActionText = computed(() => ({
  remove_product: '下架商品',
  ban_user: '封禁用户',
  reject: '驳回举报'
}[resolveAction.value] || ''))

async function fetchData() {
  loading.value = true
  try { report.value = await getReportDetail(route.params.id) }
  catch (e) {} finally { loading.value = false }
}

async function handleClaim() {
  await claimReport(route.params.id)
  ElMessage.success('已认领')
  fetchData()
}

function openResolve(action) {
  resolveAction.value = action
  showResolveDialog.value = true
}

async function handleResolve() {
  await resolveReport(route.params.id, resolveResult.value, resolveAction.value)
  ElMessage.success('已处理')
  showResolveDialog.value = false
  resolveResult.value = ''
  fetchData()
}

onMounted(fetchData)
</script>
```

- [ ] **Step 4: Commit**

```bash
cd admin-web && git add src/api/reports.js src/views/reports/
git commit -m "feat: add report management pages (list + detail with claim/resolve)"
```

---

## Task 15: Admin Web — Order Management Pages

**Files:**
- Create: `admin-web/src/api/orders.js`
- Create: `admin-web/src/views/orders/OrderList.vue`
- Create: `admin-web/src/views/orders/OrderDetail.vue`

- [ ] **Step 1: Create src/api/orders.js**

```javascript
import { callAdminApi } from './request'

export function getOrderList(params) {
  return callAdminApi('admin-orders', { action: 'list', data: params })
}

export function getOrderDetail(id) {
  return callAdminApi('admin-orders', { action: 'detail', data: { id } })
}

export function interveneOrder(id, note) {
  return callAdminApi('admin-orders', { action: 'intervene', data: { id, note } })
}

export function resolveOrder(id, resolution, note) {
  return callAdminApi('admin-orders', { action: 'resolve', data: { id, resolution, note } })
}
```

- [ ] **Step 2: Create OrderList.vue**

```vue
<template>
  <div>
    <el-card>
      <el-form inline style="margin-bottom: 16px;">
        <el-form-item label="状态">
          <el-select v-model="query.status" clearable placeholder="全部">
            <el-option label="待确认" value="pending" />
            <el-option label="已确认" value="confirmed" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="query.disputeOnly">仅显示纠纷</el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchData">查询</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="orders" v-loading="loading" stripe>
        <el-table-column prop="_id" label="订单号" width="220" show-overflow-tooltip />
        <el-table-column prop="productTitle" label="商品" min-width="180" show-overflow-tooltip />
        <el-table-column prop="price" label="价格" width="100">
          <template #default="{ row }">¥{{ row.price }}</template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="纠纷" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.disputeStatus === 'open'" type="danger" size="small">纠纷中</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="160">
          <template #default="{ row }">{{ new Date(row.createTime).toLocaleString('zh-CN') }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="$router.push(`/orders/${row._id}`)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination style="margin-top: 16px; justify-content: flex-end;" background layout="total, prev, pager, next"
        :total="total" :page-size="pageSize" v-model:current-page="currentPage" @current-change="handlePageChange" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getOrderList } from '../../api/orders'

const loading = ref(false)
const orders = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = 20
const query = reactive({ status: '', disputeOnly: false })

const statusText = (s) => ({ pending: '待确认', confirmed: '已确认', completed: '已完成', cancelled: '已取消' }[s] || s)

async function fetchData() {
  loading.value = true
  try {
    const res = await getOrderList({ ...query, page: currentPage.value - 1, pageSize })
    orders.value = res.list
    total.value = res.total
  } catch (e) {} finally { loading.value = false }
}

function handlePageChange(page) { currentPage.value = page; fetchData() }
onMounted(fetchData)
</script>
```

- [ ] **Step 3: Create OrderDetail.vue**

```vue
<template>
  <div v-loading="loading">
    <el-page-header @back="$router.back()" content="订单详情" style="margin-bottom: 16px;" />

    <el-row :gutter="16">
      <el-col :span="16">
        <!-- 订单信息 -->
        <el-card style="margin-bottom: 16px;">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="订单号">{{ order._id }}</el-descriptions-item>
            <el-descriptions-item label="价格">¥{{ order.price }}</el-descriptions-item>
            <el-descriptions-item label="状态"><el-tag>{{ order.status }}</el-tag></el-descriptions-item>
            <el-descriptions-item label="纠纷">
              <el-tag v-if="order.disputeStatus === 'open'" type="danger">纠纷中</el-tag>
              <el-tag v-else-if="order.disputeStatus === 'resolved'" type="info">已解决</el-tag>
              <span v-else>无</span>
            </el-descriptions-item>
            <el-descriptions-item v-if="order.disputeNote" label="纠纷备注" :span="2">{{ order.disputeNote }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 商品信息 -->
        <el-card v-if="order.product" header="商品信息" style="margin-bottom: 16px;">
          <p>{{ order.product.title }} - ¥{{ order.product.price }}</p>
          <div v-if="order.product.images" style="display: flex; gap: 8px;">
            <el-image v-for="(img, i) in order.product.images" :key="i" :src="img" style="width: 80px; height: 80px;" fit="cover" />
          </div>
        </el-card>

        <!-- 操作 -->
        <el-card>
          <el-button v-if="!order.disputeStatus || order.disputeStatus === 'none'" type="warning" @click="showInterveneDialog = true">标记纠纷</el-button>
          <template v-if="order.disputeStatus === 'open'">
            <el-button type="danger" @click="openResolve('force_refund')">强制退款</el-button>
            <el-button type="success" @click="openResolve('force_complete')">强制完成</el-button>
          </template>
        </el-card>
      </el-col>

      <el-col :span="8">
        <!-- 买卖双方 -->
        <el-card header="买家" style="margin-bottom: 16px;">
          <p>{{ order.buyer?.nickName || '-' }}</p>
        </el-card>
        <el-card header="卖家" style="margin-bottom: 16px;">
          <p>{{ order.seller?.nickName || '-' }}</p>
        </el-card>

        <!-- 聊天记录 -->
        <el-card header="聊天记录">
          <el-empty v-if="!order.messages || order.messages.length === 0" description="无聊天记录" />
          <div class="chat-messages">
            <div v-for="msg in order.messages" :key="msg._id" class="chat-msg">
              <span class="chat-sender">{{ msg.fromOpenid === order.buyerOpenid ? '买家' : '卖家' }}:</span>
              <span>{{ msg.content }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 标记纠纷对话框 -->
    <el-dialog v-model="showInterveneDialog" title="标记纠纷" width="400px">
      <el-input v-model="interveneNote" type="textarea" :rows="3" placeholder="备注说明" />
      <template #footer>
        <el-button @click="showInterveneDialog = false">取消</el-button>
        <el-button type="warning" @click="handleIntervene">确认标记</el-button>
      </template>
    </el-dialog>

    <!-- 裁决对话框 -->
    <el-dialog v-model="showResolveDialog" title="纠纷裁决" width="400px">
      <p>操作: {{ resolveType === 'force_refund' ? '强制退款' : '强制完成' }}</p>
      <el-input v-model="resolveNote" type="textarea" :rows="3" placeholder="裁决说明（必填）" />
      <template #footer>
        <el-button @click="showResolveDialog = false">取消</el-button>
        <el-button type="primary" :disabled="!resolveNote.trim()" @click="handleResolve">确认裁决</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getOrderDetail, interveneOrder, resolveOrder } from '../../api/orders'
import { ElMessage } from 'element-plus'

const route = useRoute()
const loading = ref(true)
const order = ref({})

const showInterveneDialog = ref(false)
const interveneNote = ref('')
const showResolveDialog = ref(false)
const resolveType = ref('')
const resolveNote = ref('')

async function fetchData() {
  loading.value = true
  try { order.value = await getOrderDetail(route.params.id) }
  catch (e) {} finally { loading.value = false }
}

async function handleIntervene() {
  await interveneOrder(route.params.id, interveneNote.value)
  ElMessage.success('已标记纠纷')
  showInterveneDialog.value = false
  interveneNote.value = ''
  fetchData()
}

function openResolve(type) {
  resolveType.value = type
  showResolveDialog.value = true
}

async function handleResolve() {
  await resolveOrder(route.params.id, resolveType.value, resolveNote.value)
  ElMessage.success('已裁决')
  showResolveDialog.value = false
  resolveNote.value = ''
  fetchData()
}

onMounted(fetchData)
</script>

<style scoped>
.chat-messages { max-height: 400px; overflow-y: auto; }
.chat-msg { margin-bottom: 8px; font-size: 13px; }
.chat-sender { font-weight: bold; margin-right: 4px; }
</style>
```

- [ ] **Step 4: Commit**

```bash
cd admin-web && git add src/api/orders.js src/views/orders/
git commit -m "feat: add order management pages (list + detail with dispute handling)"
```

---

## Task 16: Admin Web — System Management Pages

**Files:**
- Create: `admin-web/src/views/system/AdminList.vue`
- Create: `admin-web/src/views/system/AdminLogs.vue`
- Create: `admin-web/src/views/system/Categories.vue`

- [ ] **Step 1: Create AdminList.vue**

```vue
<template>
  <div>
    <el-card>
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
        <h3 style="margin: 0;">管理员列表</h3>
        <el-button type="primary" @click="showAddDialog = true">新增管理员</el-button>
      </div>
      <el-table :data="admins" v-loading="loading" stripe>
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column prop="displayName" label="名称" width="150" />
        <el-table-column prop="role" label="角色" width="150">
          <template #default="{ row }">{{ roleLabels[row.role] || row.role }}</template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">{{ row.status === 'active' ? '正常' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最后登录" width="160">
          <template #default="{ row }">{{ row.lastLoginTime ? new Date(row.lastLoginTime).toLocaleString('zh-CN') : '-' }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增管理员对话框 -->
    <el-dialog v-model="showAddDialog" title="新增管理员" width="450px">
      <el-form :model="newAdmin" label-width="80px">
        <el-form-item label="用户名"><el-input v-model="newAdmin.username" /></el-form-item>
        <el-form-item label="密码"><el-input v-model="newAdmin.password" type="password" /></el-form-item>
        <el-form-item label="名称"><el-input v-model="newAdmin.displayName" /></el-form-item>
        <el-form-item label="角色">
          <el-select v-model="newAdmin.role">
            <el-option v-for="(label, key) in roleLabels" :key="key" :label="label" :value="key" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAdd">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { callAdminApi } from '../../api/request'
import { ROLE_LABELS } from '../../utils/permission'
import { ElMessage } from 'element-plus'

const roleLabels = ROLE_LABELS
const loading = ref(false)
const admins = ref([])
const showAddDialog = ref(false)
const newAdmin = reactive({ username: '', password: '', displayName: '', role: 'content_moderator' })

async function fetchData() {
  loading.value = true
  try {
    const res = await callAdminApi('admin-users', { action: 'admin-list' })
    admins.value = res.list || []
  } catch (e) {} finally { loading.value = false }
}

async function handleAdd() {
  if (!newAdmin.username || !newAdmin.password || !newAdmin.displayName) {
    ElMessage.warning('请填写完整信息')
    return
  }
  await callAdminApi('admin-login', { action: 'create-admin', ...newAdmin })
  ElMessage.success('已创建')
  showAddDialog.value = false
  Object.assign(newAdmin, { username: '', password: '', displayName: '', role: 'content_moderator' })
  fetchData()
}

onMounted(fetchData)
</script>
```

- [ ] **Step 2: Create AdminLogs.vue**

```vue
<template>
  <div>
    <el-card>
      <el-form inline style="margin-bottom: 16px;">
        <el-form-item label="操作人">
          <el-input v-model="query.username" clearable placeholder="用户名" />
        </el-form-item>
        <el-form-item label="操作类型">
          <el-select v-model="query.action" clearable placeholder="全部">
            <el-option label="封禁用户" value="ban_user" />
            <el-option label="解封用户" value="unban_user" />
            <el-option label="下架商品" value="remove_product" />
            <el-option label="恢复商品" value="restore_product" />
            <el-option label="处理举报" value="resolve_report" />
            <el-option label="调整信誉分" value="adjust_credit" />
            <el-option label="纠纷介入" value="intervene_order" />
            <el-option label="纠纷裁决" value="resolve_dispute" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchData">查询</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="logs" v-loading="loading" stripe>
        <el-table-column prop="username" label="操作人" width="120" />
        <el-table-column prop="action" label="操作类型" width="120" />
        <el-table-column prop="targetType" label="目标类型" width="80" />
        <el-table-column prop="targetId" label="目标ID" min-width="200" show-overflow-tooltip />
        <el-table-column label="详情" min-width="200">
          <template #default="{ row }">{{ JSON.stringify(row.detail) }}</template>
        </el-table-column>
        <el-table-column label="时间" width="160">
          <template #default="{ row }">{{ new Date(row.createTime).toLocaleString('zh-CN') }}</template>
        </el-table-column>
      </el-table>
      <el-pagination style="margin-top: 16px; justify-content: flex-end;" background layout="total, prev, pager, next"
        :total="total" :page-size="pageSize" v-model:current-page="currentPage" @current-change="handlePageChange" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { callAdminApi } from '../../api/request'

const loading = ref(false)
const logs = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = 20
const query = reactive({ username: '', action: '' })

async function fetchData() {
  loading.value = true
  try {
    const res = await callAdminApi('admin-stats', { action: 'logs', data: { ...query, page: currentPage.value - 1, pageSize } })
    logs.value = res.list || []
    total.value = res.total || 0
  } catch (e) {} finally { loading.value = false }
}

function handlePageChange(page) { currentPage.value = page; fetchData() }
onMounted(fetchData)
</script>
```

- [ ] **Step 3: Create Categories.vue**

```vue
<template>
  <div>
    <el-card>
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
        <h3 style="margin: 0;">分类管理</h3>
        <el-button type="primary" @click="showAddDialog = true">新增分类</el-button>
      </div>
      <el-table :data="categories" stripe>
        <el-table-column prop="id" label="分类ID" width="150" />
        <el-table-column prop="name" label="分类名称" width="200" />
        <el-table-column prop="productCount" label="商品数" width="100" />
      </el-table>
    </el-card>

    <el-dialog v-model="showAddDialog" title="新增分类" width="400px">
      <el-form :model="newCategory" label-width="80px">
        <el-form-item label="ID"><el-input v-model="newCategory.id" placeholder="英文标识 如 beauty" /></el-form-item>
        <el-form-item label="名称"><el-input v-model="newCategory.name" placeholder="中文名称 如 美妆护肤" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAdd">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { callAdminApi } from '../../api/request'
import { ElMessage } from 'element-plus'

const categories = ref([])
const showAddDialog = ref(false)
const newCategory = reactive({ id: '', name: '' })

async function fetchData() {
  try {
    const res = await callAdminApi('admin-stats', { action: 'distribution' })
    categories.value = res || []
  } catch (e) {}
}

async function handleAdd() {
  if (!newCategory.id || !newCategory.name) {
    ElMessage.warning('请填写完整')
    return
  }
  // 分类管理后续通过独立云函数实现，当前仅展示
  ElMessage.info('分类数据当前由代码配置管理，后续版本支持动态管理')
  showAddDialog.value = false
}

onMounted(fetchData)
</script>
```

- [ ] **Step 4: Commit**

```bash
cd admin-web && git add src/views/system/
git commit -m "feat: add system management pages (admin list, logs, categories)"
```

---

## Task 17: Create Database Collections and Seed Admin Account

This task is performed manually in WeChat DevTools cloud console.

- [ ] **Step 1: Create new collections in cloud database**

In WeChat DevTools → Cloud Development Console → Database:
1. Create collection `admins`
2. Create collection `reports`
3. Create collection `admin_logs`

- [ ] **Step 2: Add existing collection fields**

No schema migration needed — WeChat Cloud DB is schemaless. The new fields (`status`, `banReason`, `banTime` for users; `reportCount`, `adminNote` for products; `disputeStatus`, `disputeNote`, `handlerUsername` for orders) will be added dynamically when admin operations occur.

- [ ] **Step 3: Seed the initial super admin account**

Run in cloud console or via a temporary cloud function:

```javascript
const bcrypt = require('bcryptjs')
const passwordHash = bcrypt.hashSync('your-secure-password', 10)

// Insert into admins collection:
{
  username: 'admin',
  passwordHash: passwordHash,
  role: 'super_admin',
  displayName: '超级管理员',
  status: 'active',
  createTime: new Date()
}
```

- [ ] **Step 4: Deploy all admin cloud functions**

In WeChat DevTools, right-click each `admin-*` folder and select "Upload and Deploy: Cloud Install Dependencies":
1. admin-common
2. admin-login
3. admin-users
4. admin-products
5. admin-orders
6. admin-reports
7. admin-stats

- [ ] **Step 5: Enable HTTP triggers for admin cloud functions**

In Cloud Development Console → Cloud Functions → each admin function → Trigger → Add HTTP Trigger.

---

## Task 18: Build and Deploy Admin Web

- [ ] **Step 1: Create .env.production with cloud function base URL**

Create `admin-web/.env.production`:
```
VITE_API_BASE_URL=https://your-cloud-env.service.tcloudbase.com
```

Replace `your-cloud-env` with the actual cloud environment domain from the HTTP trigger URLs.

- [ ] **Step 2: Build the admin web**

```bash
cd admin-web && npm run build
```

- [ ] **Step 3: Deploy to WeChat Cloud static hosting**

In WeChat DevTools → Cloud Development Console → Static Website Hosting → Upload the `admin-web/dist/` folder.

- [ ] **Step 4: Verify deployment**

Open the static hosting URL in browser, verify login page loads, login with the seeded admin account, and navigate through all pages.

- [ ] **Step 5: Final commit**

```bash
git add admin-web/.env.production
git commit -m "chore: add production env config for admin web deployment"
```

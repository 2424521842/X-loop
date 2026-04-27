/**
 * 管理端 REST API 路由
 */
const express = require('express')
const router = express.Router()
const { requireAdmin, requirePerm } = require('../middleware/admin-auth')
const auth = require('../controllers/admin/auth')
const users = require('../controllers/admin/users')
const products = require('../controllers/admin/products')
const orders = require('../controllers/admin/orders')
const reports = require('../controllers/admin/reports')
const stats = require('../controllers/admin/stats')
const system = require('../controllers/admin/system')

router.post('/login', auth.login)

router.use(requireAdmin)

router.get('/users', requirePerm('users'), users.listUsers)
router.get('/users/:id', requirePerm('users'), users.getUserDetail)
router.post('/users/:id/ban', requirePerm('users:write'), users.banUser)
router.post('/users/:id/unban', requirePerm('users:write'), users.unbanUser)
router.post('/users/:id/credit', requirePerm('users:write'), users.adjustCredit)

router.get('/products', requirePerm('products'), products.listProducts)
router.get('/products/:id', requirePerm('products'), products.getProductDetail)
router.post('/products/:id/remove', requirePerm('products:write'), products.removeProduct)
router.post('/products/:id/restore', requirePerm('products:write'), products.restoreProduct)
router.post('/products/batch-remove', requirePerm('products:write'), products.batchRemoveProducts)

router.get('/orders', requirePerm('orders'), orders.listOrders)
router.get('/orders/:id', requirePerm('orders'), orders.getOrderDetail)
router.post('/orders/:id/intervene', requirePerm('orders:write'), orders.interveneOrder)
router.post('/orders/:id/resolve', requirePerm('orders:write'), orders.resolveOrder)

router.get('/reports', requirePerm('reports'), reports.listReports)
router.get('/reports/:id', requirePerm('reports'), reports.getReportDetail)
router.post('/reports/:id/claim', requirePerm('reports:write'), reports.claimReport)
router.post('/reports/:id/resolve', requirePerm('reports:write'), reports.resolveReport)

router.get('/stats/overview', requirePerm('dashboard'), stats.overview)
router.get('/stats/trend', requirePerm('dashboard'), stats.trend)
router.get('/stats/distribution', requirePerm('dashboard'), stats.distribution)

router.get('/admins', requirePerm('system'), system.listAdmins)
router.post('/admins', requirePerm('system'), system.createAdmin)
router.patch('/admins/:id', requirePerm('system'), system.updateAdmin)
router.delete('/admins/:id', requirePerm('system'), system.deleteAdmin)
router.get('/logs', requirePerm('system'), system.listLogs)
router.get('/categories', requirePerm('system'), system.listCategories)
router.post('/categories', requirePerm('system'), system.createCategory)
router.patch('/categories/:id', requirePerm('system'), system.updateCategory)
router.delete('/categories/:id', requirePerm('system'), system.deleteCategory)

module.exports = router

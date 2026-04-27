/**
 * 管理端举报控制器
 */
const mongoose = require('mongoose')
const Report = require('../../models/Report')
const User = require('../../models/User')
const Product = require('../../models/Product')
const { success, fail } = require('../../utils/response')
const { logAction } = require('../../utils/admin-log')

function parsePage(query) {
  const page = Math.max(parseInt(query.page, 10) || 0, 0)
  const pageSize = Math.min(Math.max(parseInt(query.pageSize, 10) || 20, 1), 100)
  return { page, pageSize }
}

function invalidId(res) {
  return res.status(400).json(fail('无效的举报ID'))
}

function normalizeStatus(status) {
  return status === 'processing' ? 'claimed' : status
}

function serializeReport(report, extra = {}) {
  const r = report && typeof report.toObject === 'function' ? report.toObject() : report
  return {
    id: String(r._id),
    reporterId: String(r.reporterId || ''),
    targetType: r.targetType,
    targetId: String(r.targetId || ''),
    reason: r.reason || '',
    description: r.description || '',
    status: r.status || 'pending',
    claimedBy: r.claimedBy || '',
    handlerUsername: r.claimedBy || r.resolvedBy || '',
    claimedAt: r.claimedAt || null,
    resolvedBy: r.resolvedBy || '',
    resolvedAt: r.resolvedAt || null,
    action: r.action || 'none',
    actionDetail: r.actionDetail || {},
    handleResult: r.actionDetail && r.actionDetail.result ? r.actionDetail.result : '',
    createdAt: r.createdAt || null,
    updatedAt: r.updatedAt || null,
    ...extra
  }
}

async function listReports(req, res, next) {
  try {
    const { page, pageSize } = parsePage(req.query)
    const status = normalizeStatus(String(req.query.status || '').trim())
    const query = {}
    if (status) query.status = status

    const [total, reports] = await Promise.all([
      Report.countDocuments(query),
      Report.find(query).sort({ createdAt: -1 }).skip(page * pageSize).limit(pageSize)
    ])

    return res.json(success({ items: reports.map((r) => serializeReport(r)), total, page, pageSize }))
  } catch (err) {
    next(err)
  }
}

async function getReportDetail(req, res, next) {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) return invalidId(res)

    const report = await Report.findById(id)
    if (!report) return res.status(404).json(fail('举报不存在'))

    const [reporter, relatedReports] = await Promise.all([
      report.reporterId ? User.findById(report.reporterId).select('nickName avatarUrl') : null,
      Report.find({ targetId: report.targetId, targetType: report.targetType, _id: { $ne: report._id } }).sort({ createdAt: -1 }).limit(10)
    ])

    let target = null
    if (report.targetType === 'product') {
      const product = await Product.findById(report.targetId).select('title images status sellerId')
      if (product) {
        target = {
          id: String(product._id),
          title: product.title || '',
          images: product.images || [],
          status: product.status || 'on_sale',
          sellerId: String(product.sellerId || '')
        }
      }
    } else if (report.targetType === 'user') {
      const user = await User.findById(report.targetId).select('nickName avatarUrl status')
      if (user) target = { id: String(user._id), nickName: user.nickName || '', avatarUrl: user.avatarUrl || '', status: user.status || 'active' }
    }

    return res.json(success(serializeReport(report, {
      reporter: reporter ? { id: String(reporter._id), nickName: reporter.nickName || '', avatarUrl: reporter.avatarUrl || '' } : null,
      target,
      relatedReports: relatedReports.map((r) => serializeReport(r))
    })))
  } catch (err) {
    next(err)
  }
}

async function claimReport(req, res, next) {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) return invalidId(res)

    const report = await Report.findById(id)
    if (!report) return res.status(404).json(fail('举报不存在'))
    if (report.status !== 'pending') return res.status(400).json(fail('该举报当前状态不可认领'))

    report.status = 'claimed'
    report.claimedBy = req.admin.username
    report.claimedAt = new Date()
    await report.save()

    await logAction(req, 'claim_report', 'report', id, {})
    return res.json(success(null))
  } catch (err) {
    next(err)
  }
}

async function resolveReport(req, res, next) {
  try {
    const { id } = req.params
    const result = String(req.body.result || '').trim()
    const handleAction = String(req.body.handleAction || req.body.action || 'none').trim()
    if (!mongoose.isValidObjectId(id)) return invalidId(res)
    if (!result) return res.status(400).json(fail('缺少参数'))

    const report = await Report.findById(id)
    if (!report) return res.status(404).json(fail('举报不存在'))

    const finalStatus = handleAction === 'reject' ? 'rejected' : 'resolved'
    const action = handleAction === 'reject' ? 'none' : (handleAction || 'none')
    report.status = finalStatus
    report.resolvedBy = req.admin.username
    report.resolvedAt = new Date()
    report.action = ['warn', 'remove_product', 'ban_user'].includes(action) ? action : 'none'
    report.actionDetail = { result, handleAction }
    await report.save()

    if (handleAction === 'remove_product' && report.targetType === 'product') {
      await Product.findByIdAndUpdate(report.targetId, {
        $set: { status: 'off_shelf', adminNote: `因举报下架: ${result}` }
      })
      await logAction(req, 'remove_product', 'product', report.targetId, { reason: result, fromReport: id })
    } else if (handleAction === 'ban_user' && report.targetType === 'user') {
      await User.findByIdAndUpdate(report.targetId, {
        $set: { status: 'banned', banReason: `因举报封禁: ${result}`, banTime: new Date() }
      })
      await logAction(req, 'ban_user', 'user', report.targetId, { reason: result, fromReport: id })
    }

    await logAction(req, 'resolve_report', 'report', id, { result, handleAction })
    return res.json(success(null))
  } catch (err) {
    next(err)
  }
}

module.exports = { listReports, getReportDetail, claimReport, resolveReport }

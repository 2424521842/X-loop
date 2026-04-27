/**
 * 站内消息控制器
 */
const mongoose = require('mongoose')
const User = require('../models/User')
const Message = require('../models/Message')
const { success, fail } = require('../utils/response')
const { containsBlockedKeyword } = require('../utils/content-filter')

function getConversationId(a, b) {
  return [String(a), String(b)].sort().join('_')
}

function invalidObjectId(res) {
  return res.status(400).json(fail('无效的 id'))
}

function serializeMessage(message) {
  const item = message && typeof message.toObject === 'function' ? message.toObject() : message
  if (!item) return null

  return {
    id: String(item._id),
    conversationId: item.conversationId,
    fromUserId: String(item.fromUserId || ''),
    toUserId: String(item.toUserId || ''),
    productId: item.productId ? String(item.productId) : null,
    content: item.content || '',
    type: item.type || 'text',
    read: !!item.read,
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null
  }
}

/**
 * POST /api/messages
 * 发送一条站内消息
 */
async function createMessage(req, res, next) {
  try {
    const toUserId = req.body.toUserId
    const productId = req.body.productId
    const content = String(req.body.content || '').trim()
    const type = req.body.type || 'text'

    if (!mongoose.isValidObjectId(toUserId) || (productId && !mongoose.isValidObjectId(productId))) {
      return invalidObjectId(res)
    }
    if (!content) {
      return res.status(400).json(fail('消息内容不能为空'))
    }
    if (!['text', 'image'].includes(type)) {
      return res.status(400).json(fail('无效的消息类型'))
    }
    if (containsBlockedKeyword(content)) {
      return res.status(400).json(fail('内容包含违规词'))
    }

    const targetUser = await User.findById(toUserId)
    if (!targetUser) {
      return res.status(404).json(fail('用户不存在'))
    }

    const message = await Message.create({
      conversationId: getConversationId(req.user.id, toUserId),
      fromUserId: req.user.id,
      toUserId,
      productId: productId || null,
      content,
      type
    })

    return res.json(success(serializeMessage(message)))
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/messages/conversations
 * 会话列表：最新消息 + 未读数 + 对方资料
 */
async function listConversations(req, res, next) {
  try {
    const me = new mongoose.Types.ObjectId(req.user.id)
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { fromUserId: me },
            { toUserId: me }
          ]
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$conversationId',
          latest: { $first: '$$ROOT' },
          unread: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$toUserId', me] },
                    { $eq: ['$read', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $addFields: {
          otherUserId: {
            $cond: [
              { $eq: ['$latest.fromUserId', me] },
              '$latest.toUserId',
              '$latest.fromUserId'
            ]
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'otherUserId',
          foreignField: '_id',
          as: 'otherUser'
        }
      },
      {
        $unwind: {
          path: '$otherUser',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 0,
          conversationId: '$_id',
          unread: 1,
          otherUser: {
            id: { $toString: '$otherUserId' },
            nickName: { $ifNull: ['$otherUser.nickName', ''] },
            avatarUrl: { $ifNull: ['$otherUser.avatarUrl', ''] }
          },
          lastMessage: {
            id: { $toString: '$latest._id' },
            content: '$latest.content',
            type: '$latest.type',
            createdAt: '$latest.createdAt',
            fromUserId: { $toString: '$latest.fromUserId' }
          },
          productId: {
            $cond: [
              { $ifNull: ['$latest.productId', false] },
              { $toString: '$latest.productId' },
              null
            ]
          }
        }
      },
      { $sort: { 'lastMessage.createdAt': -1 } }
    ])

    return res.json(success({ items: conversations }))
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/messages/:userId?since=<msgId>
 * 拉取一对一会话消息，并把对方发给我的消息标记为已读
 */
async function listMessagesWithUser(req, res, next) {
  try {
    const { userId } = req.params
    const { since } = req.query
    if (!mongoose.isValidObjectId(userId) || (since && !mongoose.isValidObjectId(since))) {
      return invalidObjectId(res)
    }

    const conversationId = getConversationId(req.user.id, userId)
    await Message.updateMany(
      {
        conversationId,
        fromUserId: userId,
        toUserId: req.user.id,
        read: false
      },
      { $set: { read: true } }
    )

    const query = { conversationId }
    if (since) {
      query._id = { $gt: new mongoose.Types.ObjectId(since) }
    }

    let messagesQuery = Message.find(query).sort(since ? { _id: 1 } : { _id: -1 })
    if (!since) {
      messagesQuery = messagesQuery.limit(50)
    }

    let messages = await messagesQuery
    if (!since) {
      messages = messages.reverse()
    }

    return res.json(success({ items: messages.map(serializeMessage) }))
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getConversationId,
  createMessage,
  listConversations,
  listMessagesWithUser
}

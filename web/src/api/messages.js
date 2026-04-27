import http from './http'

export function sendMessage(payload) {
  return http.post('/messages', payload)
}

export function getConversations(params = {}) {
  return http.get('/messages/conversations', { params })
}

export function getMessages(userId, params = {}) {
  return http.get(`/messages/${userId}`, { params })
}

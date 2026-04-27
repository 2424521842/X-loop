import http from './http'

export function sendCode(email) {
  return http.post('/auth/email-code', { email })
}

export function verifyCode(email, code) {
  return http.post('/auth/verify', { email, code })
}

export function getMe() {
  return http.get('/auth/me')
}

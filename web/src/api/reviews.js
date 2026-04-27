import http from './http'

export function createReview(payload) {
  return http.post('/reviews', payload)
}

export function getUserReviews(id, params = {}) {
  return http.get(`/reviews/user/${id}`, { params })
}

import request from './request'

export function getOverview() {
  return request.get('/stats/overview')
}

export function getTrend(type, days) {
  return request.get('/stats/trend', { params: { type, days } })
}

export function getDistribution() {
  return request.get('/stats/distribution')
}

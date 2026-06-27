import axios from 'axios'
import { useAppStore } from '@/store'

const api = axios.create({ baseURL: '/api' })

api.interceptors.response.use(
  res => res,
  err => {
    try {
      const store = useAppStore()
      const msg   = err.response?.data?.error || err.message || 'Request failed'
      store.notify(msg, 'error')
    } catch {}
    return Promise.reject(err)
  }
)

export const playersAPI = {
  getAll:  ()        => api.get('/players'),
  get:     (id)      => api.get(`/players/${id}`),
  create:  (data)    => api.post('/players', data),
  update:  (id,data) => api.put(`/players/${id}`, data),
  remove:  (id)      => api.delete(`/players/${id}`),
}

export const gamesAPI = {
  getAll:        (params)    => api.get('/games', { params }),
  get:           (id)        => api.get(`/games/${id}`),
  create:        (data)      => api.post('/games', data),
  update:        (id,data)   => api.put(`/games/${id}`, data),
  remove:        (id)        => api.delete(`/games/${id}`),
  complete:      (id)        => api.post(`/games/${id}/complete`),
  leaderboard:   (id)        => api.get(`/games/${id}/leaderboard`),
  rounds:        (id)        => api.get(`/games/${id}/rounds`),
  addRound:      (id, data)  => api.post(`/games/${id}/rounds`, data),
}

export const roundsAPI = {
  get:    (id) => api.get(`/rounds/${id}`),
  remove: (id) => api.delete(`/rounds/${id}`),
}

export const leaderboardAPI = {
  overall: () => api.get('/leaderboard'),
  stats:   () => api.get('/leaderboard/stats'),
}

export const scoringAPI = {
  calculate: (data) => api.post('/scoring/calculate', data),
}

export default api

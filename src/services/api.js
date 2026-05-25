import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api/v1',
})

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nlu_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('nlu_token')
      localStorage.removeItem('nlu_role')
      window.location.href = '/auth/login'
    }
    return Promise.reject(err)
  }
)

export default api
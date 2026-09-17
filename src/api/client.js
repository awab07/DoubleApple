import axios from 'axios'

// Calls the backend directly (no same-origin proxy trick — that relied on
// vercel.json rewrites, which only exist on Vercel and are a no-op on
// Hostinger, silently 404ing every API call there). The refreshToken cookie
// is cross-site as a result, so the backend sets it with
// `sameSite: "none", secure: true` in production to make sure it's still
// sent. Override with VITE_API_URL at build time if the backend URL changes.
const API_URL = import.meta.env.VITE_API_URL || 'https://portal.triplebuzzsmokeshop.com'

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
})

let accessToken = null
let onTokenChange = null

export function setAccessToken(token) {
  accessToken = token
}

export function onAccessTokenChange(handler) {
  onTokenChange = handler
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

let refreshPromise = null

function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/Api/refresh-token')
      .then((res) => res.data.accessToken)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response?.status
    const expired = error.response?.data?.expired

    if (status === 401 && expired && original && !original._retried) {
      original._retried = true
      try {
        const newToken = await refreshAccessToken()
        accessToken = newToken
        if (onTokenChange) onTokenChange(newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch (refreshError) {
        accessToken = null
        if (onTokenChange) onTokenChange(null)
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export { refreshAccessToken }
export default api

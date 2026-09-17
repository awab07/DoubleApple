import axios from 'axios'

// Calls the backend directly. Hostinger's static hosting for this site
// doesn't execute a custom Node server (confirmed: server.js never actually
// runs there, despite deploying successfully — it's Jamstack/static-only),
// so the same-origin proxy trick vercel.json/server.js relied on isn't
// available here. Login itself works this way; persistence across a reload
// still needs a same-site backend domain or non-cookie token storage.
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

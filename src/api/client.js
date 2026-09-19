import axios from 'axios'

// Calls the API through api.doubleapplesmokeshop.com — a subdomain of this
// site, so the backend's refresh-token cookie is same-site with
// doubleapplesmokeshop.com and the browser keeps sending it. Calling the
// shared backend on portal.triplebuzzsmokeshop.com directly made that cookie
// cross-site, so the login session was lost on every reload. (Hostinger's
// static hosting for this site can't run a same-origin proxy, hence the
// subdomain; it forwards to the same shared backend.)
const API_URL =
  import.meta.env.VITE_API_URL || 'https://api.doubleapplesmokeshop.com/api/public/proxy'

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

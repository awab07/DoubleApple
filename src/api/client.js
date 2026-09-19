import axios from 'axios'

// Always same-origin: this app's own server (see server.js) proxies /Api,
// /Product, /Order etc. straight through to the real backend, so the
// browser only ever talks to this origin. That's what makes the backend's
// refreshToken cookie first-party instead of a cross-site cookie that
// Safari/Chrome silently drop — the same trick vercel.json's rewrites did
// on Vercel, just run by our own Node server here on Hostinger instead.
// Requires the Hostinger hosting for this domain to actually run
// `node server.js` (a Node.js app), not serve dist/ as a static site —
// see server.js for details.
const api = axios.create({
  baseURL: '',
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

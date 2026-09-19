import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

const BACKEND_URL = process.env.BACKEND_URL || 'https://portal.triplebuzzsmokeshop.com'

// Proxies API calls straight through to the shared backend server-to-server,
// so the browser only ever talks to this app's own origin
// (doubleapplesmokeshop.com). That's what makes the backend's refreshToken
// cookie first-party instead of a cross-site cookie Safari/Chrome silently
// drop — the same trick vercel.json's rewrites did on Vercel, just run by
// this server instead of Vercel's edge network.
const PROXIED_PATHS = [
  '/Api',
  '/Product',
  '/Order',
  '/Address',
  '/Wishlist',
  '/Review',
  '/Blog',
  '/Newsletter',
  '/Coupon',
]

app.use(
  createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    // pathFilter (not mounting via app.use(path, ...)) so the full request
    // path reaches the backend unmodified — app.use(path, mw) would have
    // Express strip the matched prefix before the proxy ever sees it.
    pathFilter: PROXIED_PATHS,
  })
)

app.use(express.static(path.join(__dirname, 'dist')))

// SPA fallback — anything not matched above or by a static file is a client
// route, so let index.html/React Router handle it. Express 5's router
// rejects a bare '*' pattern (path-to-regexp v8), so this is unpatterned
// catch-all middleware instead.
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`))

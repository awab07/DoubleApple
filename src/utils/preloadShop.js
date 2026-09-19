// Warms the first page of every Shop category ahead of time. Picking a
// category on /shop or /collections/:slug otherwise starts a fresh request
// (and only then starts downloading the product photos), so the grid sits on
// "Loading products…" for a beat. Here each category's first page — one Shop
// page worth of products, plus the unfiltered "All" view — is fetched in the
// background at idle, its photos are pulled into the browser cache, and
// Shop.jsx paints from the result instantly while its own request revalidates.

import { getProducts } from '../api/products'
import { CATEGORY_ORDER, CATEGORY_REAL_NAME } from '../data/categories'

// Shop's default page size (its `perPage` state) — the only size preloaded.
export const SHOP_FIRST_PAGE_LIMIT = 9
const CONCURRENCY = 3

const ALL = '__all__'
const pending = new Map() // real category name (or ALL) -> Promise<data>
const resolved = new Map() // real category name (or ALL) -> data, once settled

function keyFor(category) {
  return category ?? ALL
}

function loadFirstPage(category) {
  const key = keyFor(category)
  if (!pending.has(key)) {
    const promise = getProducts({ page: 1, limit: SHOP_FIRST_PAGE_LIMIT, category })
      .then((data) => {
        for (const p of data.products || []) {
          const src = p.image?.[0]?.url
          if (src) new Image().src = src
        }
        resolved.set(key, data)
        return data
      })
      .catch((err) => {
        // Let the next call retry instead of caching the failure.
        pending.delete(key)
        throw err
      })
    pending.set(key, promise)
  }
  return pending.get(key)
}

// The already-loaded first page for a real category name (undefined = All),
// or null if it hasn't finished loading yet.
export function getPreloadedShopFirstPage(category) {
  return resolved.get(keyFor(category)) ?? null
}

// Hover/focus safety net for a single category link: loads just that one now
// instead of waiting for the idle pass to reach it.
export function preloadShopCategory(uiCategory) {
  loadFirstPage(uiCategory ? CATEGORY_REAL_NAME[uiCategory] : undefined).catch(() => {})
}

let started = false

// Call once at app boot. Runs at idle, a few requests at a time, so it never
// competes with the page the visitor actually landed on.
export function preloadShopFirstPages() {
  if (started || typeof window === 'undefined') return
  started = true

  const queue = [undefined, ...CATEGORY_ORDER.map((cat) => CATEGORY_REAL_NAME[cat])]

  const worker = async () => {
    while (queue.length > 0) {
      await loadFirstPage(queue.shift()).catch(() => {})
    }
  }

  const start = () => {
    for (let i = 0; i < CONCURRENCY; i++) worker()
  }
  if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 3000 })
  else setTimeout(start, 1500)
}

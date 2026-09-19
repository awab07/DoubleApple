// Everything the home page renders that comes from the backend: Collections'
// one-representative-product-per-category strip and the three CategoryShowcase
// sections (Kratom / Disposable Hookah / Hookah Pot). Each of those normally
// fires its own getProducts() call on mount; this warms all of them up front
// (app boot, or a hover over a link to "/") and caches the promise per
// (category, limit) pair so whichever component mounts afterward reuses the
// already-in-flight/settled request instead of firing a second, redundant one.
//
// That alone still leaves a real gap on every full page load/reload: the
// in-memory cache is empty again (fresh module scope), so the very first
// paint has nothing to show until the network round-trip completes. To close
// that gap, every resolved response is also persisted to localStorage, and
// getCachedHomeCategoryProducts() below reads it back synchronously — so a
// component can seed its initial state with last-known-good data on the very
// first render, then silently swap in the fresh response once it lands. On a
// brand new browser (nothing cached yet) there's still a real network wait;
// every visit after that renders instantly from cache while quietly
// revalidating in the background.

import { getProducts } from '../api/products'
import { CATEGORY_ORDER, CATEGORY_REAL_NAME } from '../data/categories'

const CATEGORY_SHOWCASE_SECTIONS = [
  { category: 'Kratom', limit: 6 },
  { category: 'Disposable Hookah', limit: 6 },
  { category: 'Hookah Pot', limit: 6 },
]

// v2: v1 held results fetched newest-first, whose first product per category
// could have no photo — drop those so returning visitors don't briefly render
// a broken tile from their saved copy.
const STORAGE_KEY = 'da_home_preload_v2'

const cache = new Map() // key -> Promise<data>
const resolvedCache = new Map() // key -> last-resolved data (for synchronous reads)

function keyFor(category, limit) {
  const realCategory = CATEGORY_REAL_NAME[category]
  return `${realCategory}::${limit}`
}

function loadPersistedCache() {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    for (const [key, data] of Object.entries(parsed)) {
      resolvedCache.set(key, data)
    }
  } catch {
    // Corrupt JSON or storage unavailable (private browsing, disabled, etc.)
    // — just skip the warm cache, everything still works via the network.
  }
}
loadPersistedCache()

function persistCache() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(resolvedCache)))
  } catch {
    // Storage full/disabled — no warm cache next visit, not fatal.
  }
}

// Synchronous read for a component's initial render — last-known-good data
// from a prior visit (localStorage) or an already-settled fetch this session,
// or null if neither exists yet.
export function getCachedHomeCategoryProducts(category, limit) {
  return resolvedCache.get(keyFor(category, limit)) ?? null
}

// Used by Collections.jsx and CategoryShowcase.jsx directly, not just by the
// preloader below, so both ever call getProducts() through this one cache.
export function getHomeCategoryProducts(category, limit) {
  const key = keyFor(category, limit)
  let promise = cache.get(key)
  if (!promise) {
    promise = getProducts({ category: CATEGORY_REAL_NAME[category], limit, imagesFirst: true })
      .then((data) => {
        resolvedCache.set(key, data)
        persistCache()
        return data
      })
      .catch((err) => {
        cache.delete(key)
        throw err
      })
    cache.set(key, promise)
  }
  return promise
}

// Call as early as possible: on app boot, and again on hover/focus of any
// link to "/" as a cheap safety net for whichever page the user started on.
// Cheap to call repeatedly — getHomeCategoryProducts already dedupes via the
// cache above, so a repeat call is just a handful of Map lookups.
export function preloadHomePage() {
  for (const category of CATEGORY_ORDER) {
    getHomeCategoryProducts(category, 1)
  }
  for (const { category, limit } of CATEGORY_SHOWCASE_SECTIONS) {
    getHomeCategoryProducts(category, limit)
  }
}

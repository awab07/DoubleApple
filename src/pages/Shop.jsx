import { useEffect, useState } from 'react'
import { useSearchParams, useParams } from 'react-router-dom'
import { ChevronDownIcon } from '../components/Icons'
import ProductCard from '../components/ProductCard'
import VisitUs from '../components/VisitUs'
import { getProducts } from '../api/products'
import {
  CATEGORY_ORDER as CATEGORIES,
  CATEGORY_REAL_NAME,
  CATEGORY_PAGE_COPY,
  DEFAULT_SHOP_PAGE_COPY,
  SLUG_TO_CATEGORY,
} from '../data/categories'

const RATINGS = [5, 4, 3, 2, 1]

// Every real category currently tops out at a few hundred items (Vapes,
// the largest, is ~250), so one request per selected category at this limit
// reliably gets everything in one shot when merging multiple categories —
// no per-category pagination needed for that path.
const CATEGORY_FETCH_LIMIT = 300

export default function Shop() {
  const [searchParams] = useSearchParams()
  const { slug } = useParams()
  // Support both /collections/:slug and /shop?category=X
  const categoryFromSlug = slug ? SLUG_TO_CATEGORY[slug] : null
  const initialCategory = categoryFromSlug || searchParams.get('category')
  const [selectedCategories, setSelectedCategories] = useState(
    initialCategory && CATEGORIES.includes(initialCategory) ? [initialCategory] : []
  )
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sortBy, setSortBy] = useState('latest')
  const [perPage, setPerPage] = useState(9)
  const [page, setPage] = useState(1)
  const [openFilters, setOpenFilters] = useState(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    return { category: !isMobile, rating: !isMobile, price: !isMobile }
  })

  const toggleFilterSection = (key) => {
    setOpenFilters((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const [products, setProducts] = useState([])
  const [hasNextPage, setHasNextPage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [relatedProducts, setRelatedProducts] = useState([])

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
    setPage(1)
  }

  // Shop stays mounted across in-app navigation to /shop (same route, just
  // different query params), so a category picked earlier wouldn't
  // otherwise clear when the user lands here again via a plain "/shop" link
  // — resync the filter from the URL on every navigation, not just the
  // first one.
  useEffect(() => {
    const catFromSlug = slug ? SLUG_TO_CATEGORY[slug] : null
    const cat = catFromSlug || searchParams.get('category')
    setSelectedCategories(cat && CATEGORIES.includes(cat) ? [cat] : [])
    setSearchQuery(searchParams.get('search') || '')
    setPage(1)
  }, [searchParams, slug])

  // A single selected category queries the backend directly with true
  // server-side pagination (fast, efficient). More than one category can't
  // be expressed in a single request — the backend's category filter is an
  // exact single-value match — so that case fetches each selected category
  // directly in parallel instead (still a real backend query per category,
  // just merged + paginated client-side afterward, same pattern used to fix
  // this same problem on Triple Buzz's Shop page).
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    if (selectedCategories.length > 1) {
      Promise.all(
        selectedCategories.map((cat) =>
          getProducts({
            limit: CATEGORY_FETCH_LIMIT,
            category: CATEGORY_REAL_NAME[cat],
            search: searchQuery || undefined,
          }).catch(() => ({ products: [] }))
        )
      )
        .then((results) => {
          if (cancelled) return
          const seen = new Set()
          let merged = []
          for (const data of results) {
            for (const p of data.products || []) {
              if (!seen.has(p._id)) {
                seen.add(p._id)
                merged.push(p)
              }
            }
          }

          merged = merged.filter((p) => {
            const price = p.finalPrice ?? p.price
            const aboveMin = !minPrice || price >= parseFloat(minPrice)
            const belowMax = !maxPrice || price <= parseFloat(maxPrice)
            return aboveMin && belowMax
          })

          if (sortBy === 'price-asc') {
            merged = [...merged].sort((a, b) => (a.finalPrice ?? a.price) - (b.finalPrice ?? b.price))
          } else if (sortBy === 'price-desc') {
            merged = [...merged].sort((a, b) => (b.finalPrice ?? b.price) - (a.finalPrice ?? a.price))
          }

          setHasNextPage(merged.length > page * perPage)
          setProducts(merged.slice((page - 1) * perPage, page * perPage))
        })
        .catch(() => {
          if (!cancelled) setError('Could not load products right now. Please try again shortly.')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
      return () => {
        cancelled = true
      }
    }

    getProducts({
      page,
      limit: perPage,
      category: selectedCategories.length === 1 ? CATEGORY_REAL_NAME[selectedCategories[0]] : undefined,
      search: searchQuery || undefined,
    })
      .then((data) => {
        if (cancelled) return
        let list = data.products || []

        // Backend doesn't return a total/totalPages count, so infer whether another
        // page exists from whether this page came back full.
        setHasNextPage(list.length === perPage)

        // client-side: price range and name search (category is already applied
        // server-side above when exactly one is selected, or not at all here)
        const q = searchQuery.trim().toLowerCase()
        list = list.filter((p) => {
          const price = p.finalPrice ?? p.price
          const aboveMin = !minPrice || price >= parseFloat(minPrice)
          const belowMax = !maxPrice || price <= parseFloat(maxPrice)
          const matchesQuery = !q || p.name?.toLowerCase().includes(q)
          return aboveMin && belowMax && matchesQuery
        })

        if (sortBy === 'price-asc') {
          list = [...list].sort((a, b) => (a.finalPrice ?? a.price) - (b.finalPrice ?? b.price))
        } else if (sortBy === 'price-desc') {
          list = [...list].sort((a, b) => (b.finalPrice ?? b.price) - (a.finalPrice ?? a.price))
        }

        setProducts(list)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load products right now. Please try again shortly.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [page, perPage, selectedCategories, minPrice, maxPrice, sortBy, searchQuery])

  useEffect(() => {
    getProducts({ page: 1, limit: 6 })
      .then((data) => setRelatedProducts(data.products || []))
      .catch(() => setRelatedProducts([]))
  }, [])

  const pageCopy =
    selectedCategories.length === 1
      ? CATEGORY_PAGE_COPY[selectedCategories[0]] || DEFAULT_SHOP_PAGE_COPY
      : DEFAULT_SHOP_PAGE_COPY

  return (
    <>
      <section className="mx-auto max-w-[1280px] px-5 pt-10 lg:px-10">
        <h1 className="text-2xl font-bold leading-tight text-[#1a1a17] sm:text-[28px]">
          {pageCopy.title} <span className="font-normal text-[#9a988e]">&ndash;</span> {pageCopy.subtitle}
        </h1>
        <p className="mt-1.5 text-sm text-[#7a7a72]">
          {products.length} product{products.length === 1 ? '' : 's'}
        </p>
      </section>

      <section className="mx-auto max-w-[1280px] px-5 py-10 lg:px-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
          <aside>
            <div className="border-b border-black/10 pb-6">
              <button
                type="button"
                onClick={() => toggleFilterSection('category')}
                aria-expanded={openFilters.category}
                className="mb-3 flex w-full items-center justify-between text-sm font-bold text-[#1a1a17]"
              >
                Category
                <ChevronDownIcon
                  className={`h-4 w-4 transition-transform ${openFilters.category ? 'rotate-180' : ''}`}
                />
              </button>
              {openFilters.category && (
                <>
                  <label className="flex items-center gap-2 py-1 text-sm text-[#4a4a43]">
                    <input
                      type="checkbox"
                      checked={selectedCategories.length === 0}
                      onChange={() => setSelectedCategories([])}
                      className="h-4 w-4 accent-[#3c6e35]"
                    />
                    All
                  </label>
                  {CATEGORIES.map((cat) => (
                    <label key={cat} className="flex items-center gap-2 py-1 text-sm text-[#4a4a43]">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat)}
                        onChange={() => toggleCategory(cat)}
                        className="h-4 w-4 accent-[#3c6e35]"
                      />
                      {cat}
                    </label>
                  ))}
                </>
              )}
            </div>

            <div className="border-b border-black/10 py-6">
              <button
                type="button"
                onClick={() => toggleFilterSection('rating')}
                aria-expanded={openFilters.rating}
                className="mb-3 flex w-full items-center justify-between text-sm font-bold text-[#1a1a17]"
              >
                Rating
                <ChevronDownIcon
                  className={`h-4 w-4 transition-transform ${openFilters.rating ? 'rotate-180' : ''}`}
                />
              </button>
              {openFilters.rating && (
                <>
                  <label className="flex items-center gap-2 py-1 text-sm text-[#4a4a43]">
                    <input type="checkbox" defaultChecked className="h-4 w-4 accent-[#3c6e35]" />
                    All
                  </label>
                  {RATINGS.map((r) => (
                    <label key={r} className="flex items-center gap-2 py-1 text-sm text-[#4a4a43]">
                      <input type="checkbox" className="h-4 w-4 accent-[#3c6e35]" />
                      {r} {r === 1 ? 'Star' : 'Stars'}
                    </label>
                  ))}
                </>
              )}
            </div>

            <div className="py-6">
              <button
                type="button"
                onClick={() => toggleFilterSection('price')}
                aria-expanded={openFilters.price}
                className="mb-3 flex w-full items-center justify-between text-sm font-bold text-[#1a1a17]"
              >
                Price
                <ChevronDownIcon
                  className={`h-4 w-4 transition-transform ${openFilters.price ? 'rotate-180' : ''}`}
                />
              </button>
              {openFilters.price && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 rounded-md border border-black/15 px-3 py-2">
                    <span className="text-sm text-[#4a4a43]">$</span>
                    <input
                      type="number"
                      placeholder="Min Price"
                      value={minPrice}
                      onChange={(e) => {
                        setMinPrice(e.target.value)
                        setPage(1)
                      }}
                      className="w-full text-sm text-[#1a1a17] outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 rounded-md border border-black/15 px-3 py-2">
                    <span className="text-sm text-[#4a4a43]">$</span>
                    <input
                      type="number"
                      placeholder="Max Price"
                      value={maxPrice}
                      onChange={(e) => {
                        setMaxPrice(e.target.value)
                        setPage(1)
                      }}
                      className="w-full text-sm text-[#1a1a17] outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </aside>

          <div>
            <div className="mb-6 flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#1a1a17]">Sort by</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-md border border-black/15 px-3 py-1.5 text-sm text-[#1a1a17] focus:outline-none"
                >
                  <option value="latest">Latest</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#1a1a17]">Show</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value))
                    setPage(1)
                  }}
                  className="rounded-md border border-black/15 px-3 py-1.5 text-sm text-[#1a1a17] focus:outline-none"
                >
                  <option value={6}>6</option>
                  <option value={9}>9</option>
                  <option value={12}>12</option>
                </select>
              </div>
            </div>

            {loading ? (
              <p className="py-16 text-center text-sm text-[#7a7a72]">Loading products&hellip;</p>
            ) : error ? (
              <p className="py-16 text-center text-sm text-red-500">{error}</p>
            ) : products.length === 0 ? (
              <p className="py-16 text-center text-sm text-[#7a7a72]">
                No products match your filters.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((p) => (
                  <ProductCard key={p._id} product={p} />
                ))}
              </div>
            )}

            {(page > 1 || hasNextPage) && (
              <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-[#4a4a43]">Page {page}</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => {
                      setPage((p) => Math.max(1, p - 1))
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className="flex items-center gap-1.5 rounded-md border border-black/15 px-4 py-2 text-sm font-semibold text-[#1a1a17] transition hover:bg-black/[0.02] disabled:opacity-40"
                  >
                    &larr; Previous
                  </button>
                  <button
                    type="button"
                    disabled={!hasNextPage}
                    onClick={() => {
                      setPage((p) => p + 1)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className="flex items-center gap-1.5 rounded-md border border-black/15 px-4 py-2 text-sm font-semibold text-[#1a1a17] transition hover:bg-black/[0.02] disabled:opacity-40"
                  >
                    Next &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] border-t border-black/10 px-5 py-10 lg:px-10">
        <h2 className="text-xl font-bold text-[#1a1a17]">
          {pageCopy.title} <span className="font-normal text-[#9a988e]">&ndash;</span> {pageCopy.subtitle}
        </h2>
        <div className="mt-4 flex flex-col gap-4 text-sm leading-relaxed text-[#4a4a43]">
          {pageCopy.description.map((paragraph, i) => (
            <p key={i} dangerouslySetInnerHTML={{ __html: paragraph }} />
          ))}
        </div>
      </section>

      {relatedProducts.length > 0 && (
        <section className="mx-auto max-w-[1280px] border-t border-black/10 px-5 py-10 lg:px-10">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#1a1a17]">Related Products</h2>
            <a href="#" className="text-sm font-semibold text-[#3c6e35] hover:underline">
              View all
            </a>
          </div>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}

      <VisitUs />
    </>
  )
}

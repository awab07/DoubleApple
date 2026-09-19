import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProductCard from './ProductCard'
import { getHomeCategoryProducts, getCachedHomeCategoryProducts } from '../utils/preloadHome'
import { CATEGORY_SLUG } from '../data/categories'
import { preloadShopCategory } from '../utils/preloadShop'

// A homepage strip for one category — same idea as showing off a curated
// aisle in-store. Pulls real synced products for that category and hides
// itself entirely if there aren't any yet, rather than showing an empty
// section.
export default function CategoryShowcase({ category, limit = 6 }) {
  // Last-known-good data from a prior visit (or an already-settled fetch this
  // session) seeds the first render directly — so a background revalidation
  // never blanks the section back out to a loading state.
  const [products, setProducts] = useState(
    () => getCachedHomeCategoryProducts(category, limit)?.products || []
  )
  const [loading, setLoading] = useState(
    () => getCachedHomeCategoryProducts(category, limit) === null
  )

  useEffect(() => {
    let cancelled = false
    getHomeCategoryProducts(category, limit)
      .then((data) => {
        if (!cancelled) setProducts(data.products || [])
      })
      .catch(() => {
        // A failed revalidation shouldn't drop products that were already
        // showing from cache — fall back to the last-known-good list.
        if (!cancelled) setProducts(getCachedHomeCategoryProducts(category, limit)?.products || [])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [category, limit])

  if (!loading && products.length === 0) return null

  return (
    <section className="mx-auto max-w-[1280px] px-5 py-7 lg:px-10">
      <div className="mb-4 flex items-end justify-between border-b border-black/10 pb-2">
        <h2 className="text-[15px] font-bold text-[#1a1a17] sm:text-lg">{category}</h2>
        <Link
          to={`/collections/${CATEGORY_SLUG[category]}`}
          onMouseEnter={() => preloadShopCategory(category)}
          onFocus={() => preloadShopCategory(category)}
          onTouchStart={() => preloadShopCategory(category)}
          className="text-xs font-semibold uppercase tracking-wide text-[#3c6e35] hover:underline"
        >
          View all
        </Link>
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-[#7a7a72]">Loading&hellip;</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {products.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      )}
    </section>
  )
}

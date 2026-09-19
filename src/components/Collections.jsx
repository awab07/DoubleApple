import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getHomeCategoryProducts, getCachedHomeCategoryProducts } from '../utils/preloadHome'
import { CATEGORY_ORDER, CATEGORY_SLUG } from '../data/categories'
import { getImageForCategory } from '../data/productImages'

function buildItems(entries) {
  return entries
    .filter((r) => r.product)
    .map(({ cat, product }) => ({
      category: cat,
      // A category's representative product can still lack a photo (POS items
      // without an upload) — fall back to the local category image, same as
      // ProductCard, rather than rendering an <img> with no src.
      image: product.image?.[0]?.url || getImageForCategory(product.category),
    }))
}

// Seeded once at module scope (not per-mount) — cheap Map lookups, and every
// Collections instance in the same session sees the same last-known-good data.
const initialItems = buildItems(
  CATEGORY_ORDER.map((cat) => ({
    cat,
    product: getCachedHomeCategoryProducts(cat, 1)?.products?.[0] || null,
  }))
)

export default function Collections() {
  const navigate = useNavigate()
  const [items, setItems] = useState(initialItems)
  // Only show the loading state when there's nothing cached to show yet — a
  // background revalidation should never blank an already-populated section.
  const [loading, setLoading] = useState(initialItems.length === 0)

  useEffect(() => {
    let cancelled = false
    Promise.all(
      CATEGORY_ORDER.map((cat) =>
        getHomeCategoryProducts(cat, 1)
          .then((data) => ({ cat, product: data.products?.[0] || null }))
          .catch(() => ({
            cat,
            // A failed revalidation shouldn't drop a tile that was already
            // showing from cache — fall back to the last-known-good product.
            product: getCachedHomeCategoryProducts(cat, 1)?.products?.[0] || null,
          }))
      )
    ).then((results) => {
      if (cancelled) return
      setItems(buildItems(results))
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section id="collections" className="mx-auto max-w-[1280px] px-5 py-7 lg:px-10">
      <div className="mb-2.5 flex items-end justify-between border-b border-black/10 pb-2">
        <h2 className="text-[15px] font-bold text-[#1a1a17] sm:text-lg">Premium collections</h2>
        <a
          href="/shop"
          className="text-xs font-semibold uppercase tracking-wide text-[#3c6e35] hover:underline"
        >
          View all categories
        </a>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-[#7a7a72]">Loading collections&hellip;</p>
      ) : (
        <div className="grid grid-cols-2 divide-x divide-y divide-black/10 border border-black/10 sm:grid-cols-4">
          {items.map((item) => (
            <a
              key={item.category}
              href={`/collections/${CATEGORY_SLUG[item.category]}`}
              className="group block p-1.5"
            >
              <div className="flex aspect-[3/2] w-full items-center justify-center rounded-sm bg-[#f2f1ec] p-2">
                <img
                  src={item.image}
                  alt={item.category}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="pt-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-[11px] font-bold text-[#1a1a17]">{item.category}</p>
                  <span
                    className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-[#3c6e35] transition group-hover:underline"
                    onClick={() => navigate(`/collections/${CATEGORY_SLUG[item.category]}`)}
                  >
                    Shop
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  )
}

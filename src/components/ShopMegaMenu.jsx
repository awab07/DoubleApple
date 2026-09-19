import { Link } from 'react-router-dom'
import { ArrowRightIcon } from './Icons'
import { REFILL_POD_PRODUCTS, slugify } from '../data/products'
import { CATEGORY_ORDER, CATEGORY_SLUG } from '../data/categories'
import { preloadShopCategory } from '../utils/preloadShop'

const MENU_COLUMNS = [
  {
    title: 'Disposables',
    links: [
      { label: 'All Vapes', category: 'Vapes' },
      { label: 'Disposable Hookah', category: 'Disposable Hookah' },
      { label: 'Shisha', category: 'Shisha' },
      { label: 'Flower', category: 'Flower' },
      { label: 'Ash Catcher', category: 'Ash Catcher' },
    ],
  },
  {
    title: 'Pods Refills',
    links: [
      { label: 'Refill Pods', category: 'Refill Pods' },
      { label: 'Coils / Pods', category: 'Coils / Pods' },
      { label: 'Hookah Pot', category: 'Hookah Pot' },
    ],
  },
  {
    title: 'Shop by Brand',
    links: [
      { label: 'Lost Mary' },
      { label: 'Foger / Fogger' },
      { label: 'OPMS' },
      { label: 'Kream' },
      { label: "Half Bak'd" },
    ],
  },
  {
    // Generated straight from the site's full category list, so every real
    // category always has a link here even if it isn't also featured in one
    // of the curated columns above.
    title: 'By Category',
    links: [...CATEGORY_ORDER.map((cat) => ({ label: cat, category: cat })), { label: 'All Products' }],
  },
]

const FEATURED_PRODUCT = REFILL_POD_PRODUCTS[0]

export default function ShopMegaMenu({ onNavigate }) {
  return (
    <div className="absolute left-1/2 top-full z-50 w-[min(1000px,92vw)] -translate-x-1/2 rounded-b-xl bg-white p-8 shadow-2xl">
      <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
        {MENU_COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="border-b border-black/10 pb-3 text-xs font-bold uppercase tracking-wide text-[#3c6e35]">
              {col.title}
            </p>
            <ul className="mt-3 flex flex-col gap-2.5">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.category ? `/collections/${CATEGORY_SLUG[link.category]}` : '/shop'}
                    onClick={onNavigate}
                    onMouseEnter={() => preloadShopCategory(link.category)}
                    className="text-sm font-bold text-[#1a1a17] hover:text-[#3c6e35]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#9a988e]">New This Week</p>
          <Link
            to={`/products/${slugify(FEATURED_PRODUCT.name)}`}
            onClick={onNavigate}
            className="mt-3 block overflow-hidden rounded-lg bg-[#f2f1ec]"
          >
            <img
              src={FEATURED_PRODUCT.image}
              alt={FEATURED_PRODUCT.name}
              className="aspect-square w-full object-contain p-3"
            />
          </Link>
          <p className="mt-3 text-sm font-bold leading-snug text-[#1a1a17]">{FEATURED_PRODUCT.name}</p>
          <Link
            to={`/products/${slugify(FEATURED_PRODUCT.name)}`}
            onClick={onNavigate}
            className="mt-3 flex items-center justify-center gap-2 rounded-md bg-[#3CA43C] px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#2f8a30]"
          >
            Shop the Menu
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

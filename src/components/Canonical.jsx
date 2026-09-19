import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Production origin — hard-coded on purpose so the canonical never picks up
// www./preview/localhost hosts. Matches the URLs in index.html's JSON-LD.
const SITE_URL = 'https://doubleapplesmokeshop.com'

// Keeps a single <link rel="canonical"> in <head> in sync with the current
// route. Query strings and hashes are dropped (filters, tracking params) and
// trailing slashes are normalised so each page has exactly one canonical URL.
export default function Canonical() {
  const { pathname } = useLocation()

  useEffect(() => {
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
    let link = document.head.querySelector('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.setAttribute('rel', 'canonical')
      document.head.appendChild(link)
    }
    link.setAttribute('href', `${SITE_URL}${path}`)
  }, [pathname])

  return null
}

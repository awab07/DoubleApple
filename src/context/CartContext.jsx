import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getImageForCategory } from '../data/productImages'

const CartContext = createContext(null)
const STORAGE_KEY = 'double-apple-cart'

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // ignore storage errors (private browsing, quota, etc.)
    }
  }, [items])

  const addItem = (product, qty = 1) => {
    const id = product._id
    setItems((prev) => {
      const existing = prev.find((i) => i._id === id)
      if (existing) {
        return prev.map((i) => (i._id === id ? { ...i, qty: i.qty + qty } : i))
      }
      return [
        ...prev,
        {
          _id: id,
          name: product.name,
          price: product.finalPrice ?? product.price,
          image: product.image?.[0]?.url || getImageForCategory(product.category),
          category: product.category,
          qty,
        },
      ]
    })
    setIsOpen(true)
  }

  const removeItem = (id) => {
    setItems((prev) => prev.filter((i) => i._id !== id))
  }

  const updateQty = (id, qty) => {
    if (qty < 1) {
      removeItem(id)
      return
    }
    setItems((prev) => prev.map((i) => (i._id === id ? { ...i, qty } : i)))
  }

  const clearCart = () => setItems([])

  const count = useMemo(() => items.length, [items])
  const totalQty = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items])
  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + parseFloat(i.price) * i.qty, 0),
    [items]
  )
  const openCart = () => setIsOpen(true)
  const closeCart = () => setIsOpen(false)
  const toggleCart = () => setIsOpen((v) => !v)

  const value = {
    items,
    addItem,
    removeItem,
    updateQty,
    clearCart,
    count,
    totalQty,
    subtotal,
    isOpen,
    openCart,
    closeCart,
    toggleCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}

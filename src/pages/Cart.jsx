import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { getAddresses, createAddress } from '../api/addresses'
import { chargeAuthorizeNetOrder } from '../api/orders'
import { getProducts } from '../api/products'
import { validateCoupon } from '../api/coupons'
import { getImageForCategory } from '../data/productImages'
import { slugify } from '../data/products'
import ProductCard from '../components/ProductCard'
import VisitUs from '../components/VisitUs'
import CardPaymentForm from '../components/CardPaymentForm'
import PayPalCheckoutButton from '../components/PayPalCheckoutButton'
import PaymentIcons, { AuthorizeNetIcon, PayPalIcon } from '../components/PaymentIcons'

function MinusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
      <path d="M5 12h14" strokeLinecap="round" />
    </svg>
  )
}

function PlusIconSmall() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path
        d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-9 0 1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Add another entry here to plug in a new payment provider — its collapsed
// pill shows up in the row automatically and its panel renders on expand.
const PAYMENT_GATEWAYS = [
  { id: 'authorize', label: 'Card', icon: AuthorizeNetIcon },
  { id: 'paypal', label: 'PayPal', icon: PayPalIcon },
]

const EMPTY_ADDRESS_FORM = { street: '', city: '', province: '', postalCode: '', country: '' }
const EMPTY_GUEST_FORM = { firstName: '', lastName: '', email: '', phone: '' }

export default function Cart() {
  const { items, updateQty, removeItem, subtotal, clearCart } = useCart()
  const { isAuthenticated, user } = useAuth()

  const [savedAddresses, setSavedAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [addingAddress, setAddingAddress] = useState(false)
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS_FORM)
  const [savingAddress, setSavingAddress] = useState(false)

  const [guestForm, setGuestForm] = useState(EMPTY_GUEST_FORM)

  // Prefill the optional email field shown to signed-in shoppers — it's
  // never sent to the backend (buildOrderPayload omits guestInfo once
  // isAuthenticated), since the order confirmation email already goes to
  // this account's profile address regardless of what's typed here.
  useEffect(() => {
    if (isAuthenticated && user?.email) {
      setGuestForm((f) => (f.email ? f : { ...f, email: user.email }))
    }
  }, [isAuthenticated, user])

  const [showCoupon, setShowCoupon] = useState(false)
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null) // { code, discountType, value }
  const [couponError, setCouponError] = useState('')
  const [couponBusy, setCouponBusy] = useState(false)

  const [notes, setNotes] = useState({})
  const [notingId, setNotingId] = useState(null)

  const [activeGateway, setActiveGateway] = useState('authorize') // which provider's panel is expanded
  const cardFormRef = useRef(null)

  const [placedOrder, setPlacedOrder] = useState(null)
  const [placing, setPlacing] = useState(false)
  const [placeError, setPlaceError] = useState('')

  const [relatedProducts, setRelatedProducts] = useState([])

  useEffect(() => {
    if (!isAuthenticated) {
      setSavedAddresses([])
      setSelectedAddressId(null)
      setAddingAddress(true)
      return
    }
    getAddresses()
      .then((data) => {
        const list = data.addresses || []
        setSavedAddresses(list)
        setAddingAddress(list.length === 0)
        if (list.length > 0) setSelectedAddressId(list[0]._id)
      })
      .catch(() => {})
  }, [isAuthenticated])

  useEffect(() => {
    getProducts({ limit: 8 })
      .then((data) => {
        const cartIds = new Set(items.map((i) => i._id))
        setRelatedProducts((data.products || []).filter((p) => !cartIds.has(p._id)).slice(0, 6))
      })
      .catch(() => setRelatedProducts([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const itemCount = items.reduce((s, i) => s + i.qty, 0)
  const rawDiscount = appliedCoupon
    ? appliedCoupon.discountType === 'percentage'
      ? (subtotal * appliedCoupon.value) / 100
      : appliedCoupon.value
    : 0
  const discount = Math.round(Math.min(rawDiscount, subtotal) * 100) / 100
  const grandTotal = subtotal - discount

  const selectedAddress = savedAddresses.find((a) => a._id === selectedAddressId) || null
  const shippingAddress = !isAuthenticated ? addressForm : addingAddress ? addressForm : selectedAddress

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase()
    if (!code) return
    setCouponBusy(true)
    setCouponError('')
    try {
      const data = await validateCoupon(code, preDiscountTotal, 'doubleapple')
      setAppliedCoupon({ code: data.code, discountType: data.discountType, value: data.value })
    } catch (err) {
      setCouponError(err.response?.data?.message || 'That code isn’t valid.')
      setAppliedCoupon(null)
    } finally {
      setCouponBusy(false)
    }
  }

  const saveNewAddress = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) {
      // Guests have nowhere to save to — addressForm already drives
      // shippingAddress directly, so just keep the form open as-is.
      return
    }
    setSavingAddress(true)
    try {
      const { address } = await createAddress(addressForm)
      setSavedAddresses((prev) => [address, ...prev])
      setSelectedAddressId(address._id)
      setAddingAddress(false)
      setAddressForm(EMPTY_ADDRESS_FORM)
    } catch (err) {
      setPlaceError(err.response?.data?.message || 'Could not save that address.')
    } finally {
      setSavingAddress(false)
    }
  }

  // Shared by the card submit flow and the PayPal button's createOrder
  // callback — validates the address/guest fields and shapes the payload the
  // backend expects. Returns null (after setting placeError) when invalid.
  const buildOrderPayload = () => {
    if (!shippingAddress?.street || !shippingAddress?.city || !shippingAddress?.province || !shippingAddress?.country) {
      setPlaceError('Please provide a complete shipping address.')
      return null
    }
    if (!isAuthenticated) {
      if (!guestForm.firstName || !guestForm.lastName || !guestForm.email || !guestForm.phone) {
        setPlaceError('Please fill in your contact details to check out as a guest.')
        return null
      }
    }

    setPlaceError('')
    return {
      items: items.map((i) => ({ productId: i._id, quantity: i.qty })),
      shippingAddress: {
        street: shippingAddress.street,
        city: shippingAddress.city,
        province: shippingAddress.province,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country,
      },
      guestInfo: isAuthenticated ? undefined : guestForm,
      site: 'doubleapple',
      couponCode: appliedCoupon ? appliedCoupon.code : undefined,
    }
  }

  const handleOrderPlaced = (order) => {
    // order.totalAmount already has any coupon discount applied server-side
    // (see OrderController.prepareOrder) — don't subtract `discount` again
    // here, or a coupon gets applied twice on this confirmation screen.
    setPlacedOrder({ order, discount, grandTotal: order.totalAmount })
    clearCart()
  }

  const placeOrder = async () => {
    const payload = buildOrderPayload()
    if (!payload) return
    const {
      items: orderItems,
      shippingAddress: orderShippingAddress,
      guestInfo: orderGuestInfo,
      site: orderSite,
      couponCode: orderCouponCode,
    } = payload

    setPlacing(true)
    try {
      let opaqueData
      try {
        opaqueData = await cardFormRef.current.tokenize()
      } catch (tokenizeErr) {
        setPlaceError(tokenizeErr.message || 'Could not process your card. Please check the details and try again.')
        return
      }
      const { order } = await chargeAuthorizeNetOrder({
        items: orderItems,
        shippingAddress: orderShippingAddress,
        guestInfo: orderGuestInfo,
        opaqueData,
        site: orderSite,
        couponCode: orderCouponCode,
      })
      handleOrderPlaced(order)
    } catch (err) {
      setPlaceError(err.response?.data?.message || 'Could not place your order. Please try again.')
    } finally {
      setPlacing(false)
    }
  }

  if (placedOrder) {
    const { order } = placedOrder
    const dateLabel = new Date(order.createdAt).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    const addr = order.shippingAddress

    return (
      <>
        <section className="mx-auto max-w-[640px] px-5 py-16 lg:px-10">
          <div className="rounded-xl border border-black/10 bg-white p-8 shadow-sm">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border-2 border-[#3CA43C] text-[#3CA43C]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-7 w-7">
                <path d="M5 12.5l4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="mt-4 text-center text-2xl font-bold text-[#1a1a17]">Thanks for Your Order!</h1>
            <p className="mt-1 text-center text-xs text-[#9a988e]">Order #{order._id}</p>

            <div className="mt-6 border-t border-black/10 pt-4">
              <p className="text-sm font-bold text-[#1a1a17]">Transaction Date</p>
              <p className="mt-1 text-sm text-[#4a4a43]">{dateLabel}</p>
            </div>

            <div className="mt-4 border-t border-black/10 pt-4">
              <p className="text-sm font-bold text-[#1a1a17]">Payment Method</p>
              <p className="mt-1 text-sm text-[#4a4a43]">{order.paymentMethod}</p>
            </div>

            <div className="mt-4 border-t border-black/10 pt-4">
              <p className="text-sm font-bold text-[#1a1a17]">Shipping To</p>
              <p className="mt-1 text-sm text-[#4a4a43]">
                {addr.street}, {addr.city}, {addr.province} {addr.postalCode}
              </p>
            </div>

            <h2 className="mt-6 border-t border-black/10 pt-4 text-sm font-bold text-[#1a1a17]">
              Your Order
            </h2>
            <div className="mt-3 flex flex-col gap-3">
              {order.items.map((item) => (
                <div
                  key={item._id}
                  className="flex items-start gap-4 rounded-lg border border-black/10 p-4"
                >
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-md bg-[#f2f1ec] p-2">
                    <img
                      src={item.product?.image?.[0]?.url || getImageForCategory(item.product?.category)}
                      alt={item.product?.name}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold uppercase tracking-wide text-[#1a1a17] underline">
                      {item.product?.name}
                    </p>
                    <span className="mt-1 inline-block rounded-md bg-[#eef4e9] px-2 py-0.5 text-[11px] font-semibold text-[#3c6e35]">
                      {item.product?.category}
                    </span>
                    <p className="mt-2 text-sm font-bold text-[#1a1a17]">${item.price}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-[#7a7a72]">x{item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-2 border-t border-black/10 pt-4 text-sm text-[#4a4a43]">
              <div className="flex items-center justify-between">
                <span>
                  Total Product Price ({order.totalItems} Item{order.totalItems === 1 ? '' : 's'})
                </span>
                <span className="font-semibold text-[#1a1a17]">${order.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total Shipping Price</span>
                <span className="font-semibold text-[#3CA43C]">Free</span>
              </div>
            </div>

            {placedOrder.discount > 0 && (
              <div className="mt-3 flex items-center justify-between text-sm text-[#3CA43C]">
                <span>Discount</span>
                <span className="font-semibold">-${placedOrder.discount.toFixed(2)}</span>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-4">
              <span className="text-sm font-bold text-[#1a1a17]">Grand total</span>
              <span className="text-2xl font-extrabold text-[#1a1a17]">
                ${placedOrder.grandTotal.toFixed(2)}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-bold text-[#1a1a17]">Status</span>
              <span className="rounded-full bg-[#eef4e9] px-3 py-1 text-xs font-bold text-[#3c6e35]">
                {order.status || 'pending'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="mt-6 w-full rounded-md border border-[#3CA43C] px-6 py-3 text-sm font-bold uppercase tracking-wide text-[#3CA43C] transition hover:bg-[#eef4e9]"
            >
              Print Invoice
            </button>
            <Link
              to="/shop"
              className="mt-3 block w-full rounded-md bg-[#3CA43C] px-6 py-3 text-center text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#2f8a30]"
            >
              Continue Shopping
            </Link>
          </div>
        </section>

        <VisitUs />
      </>
    )
  }

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-[640px] px-5 py-24 text-center lg:px-10">
        <h1 className="text-2xl font-bold text-[#1a1a17]">Your cart is empty</h1>
        <p className="mt-2 text-sm text-[#7a7a72]">
          Looks like you haven&rsquo;t added anything yet.
        </p>
        <Link
          to="/shop"
          className="mt-6 inline-block rounded-md bg-[#3CA43C] px-6 py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#2f8a30]"
        >
          Browse the Shop
        </Link>
      </section>
    )
  }

  return (
    <>
      <section className="mx-auto max-w-[1280px] px-5 pt-6 lg:px-10">
        <nav className="flex items-center gap-2 text-xs text-[#7a7a72]">
          <Link to="/" className="hover:text-[#3c6e35]">Home</Link>
          <span>&rsaquo;</span>
          <Link to="/shop" className="hover:text-[#3c6e35]">Shop</Link>
          <span>&rsaquo;</span>
          <span className="font-semibold text-[#1a1a17]">Checkout</span>
        </nav>
      </section>

      <section className="mx-auto max-w-[1280px] px-5 py-6 lg:px-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
          <div>
            <h1 className="text-2xl font-bold text-[#1a1a17]">Your Order</h1>

            <div className="mt-4 flex flex-col gap-4">
              {items.map((item) => (
                <div key={item._id} className="rounded-xl border border-black/10 p-5">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="grid h-20 w-20 shrink-0 place-items-center rounded-md bg-[#f2f1ec] p-2">
                      <img src={item.image} alt={item.name} className="h-full w-full object-contain" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/products/${slugify(item.name)}`}
                        state={{ id: item._id }}
                        className="text-sm font-bold uppercase tracking-wide text-[#1a1a17] underline hover:text-[#3c6e35]"
                      >
                        {item.name}
                      </Link>
                      <div>
                        <span className="mt-1 inline-block rounded-md bg-[#eef4e9] px-2.5 py-1 text-[11px] font-semibold text-[#3c6e35]">
                          {item.category}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        <p className="text-lg font-extrabold text-[#1a1a17]">${item.price}</p>
                        <button
                          type="button"
                          onClick={() => setNotingId(notingId === item._id ? null : item._id)}
                          className="text-xs font-semibold text-[#3CA43C] hover:underline"
                        >
                          Write Note
                        </button>
                        <button
                          type="button"
                          aria-label="Remove item"
                          onClick={() => removeItem(item._id)}
                          className="text-[#9a988e] hover:text-red-500"
                        >
                          <TrashIcon />
                        </button>
                      </div>

                      {notingId === item._id && (
                        <textarea
                          autoFocus
                          rows={2}
                          value={notes[item._id] || ''}
                          onChange={(e) => setNotes((n) => ({ ...n, [item._id]: e.target.value }))}
                          placeholder="Add a note for this item…"
                          className="mt-3 w-full rounded-md border border-black/15 px-3 py-2 text-sm text-[#1a1a17] outline-none focus:ring-2 focus:ring-[#3CA43C]/40"
                        />
                      )}
                    </div>

                    <div className="flex shrink-0 items-center rounded-md border border-black/15">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => updateQty(item._id, item.qty - 1)}
                        className="grid h-9 w-9 place-items-center text-[#4a4a43] hover:bg-black/5"
                      >
                        <MinusIcon />
                      </button>
                      <span className="w-9 text-center text-sm font-semibold text-[#1a1a17]">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => updateQty(item._id, item.qty + 1)}
                        className="grid h-9 w-9 place-items-center text-[#4a4a43] hover:bg-black/5"
                      >
                        <PlusIconSmall />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!isAuthenticated ? (
              <>
                <h2 className="mt-10 text-xl font-bold text-[#1a1a17]">Contact Details</h2>
                <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-black/10 p-5 sm:grid-cols-2">
                  <input
                    placeholder="First Name"
                    value={guestForm.firstName}
                    onChange={(e) => setGuestForm((f) => ({ ...f, firstName: e.target.value }))}
                    className="rounded-md border border-black/15 px-3 py-2 text-sm text-[#1a1a17] outline-none focus:ring-2 focus:ring-[#3CA43C]/40"
                  />
                  <input
                    placeholder="Last Name"
                    value={guestForm.lastName}
                    onChange={(e) => setGuestForm((f) => ({ ...f, lastName: e.target.value }))}
                    className="rounded-md border border-black/15 px-3 py-2 text-sm text-[#1a1a17] outline-none focus:ring-2 focus:ring-[#3CA43C]/40"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={guestForm.email}
                    onChange={(e) => setGuestForm((f) => ({ ...f, email: e.target.value }))}
                    className="rounded-md border border-black/15 px-3 py-2 text-sm text-[#1a1a17] outline-none focus:ring-2 focus:ring-[#3CA43C]/40"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={guestForm.phone}
                    onChange={(e) => setGuestForm((f) => ({ ...f, phone: e.target.value }))}
                    className="rounded-md border border-black/15 px-3 py-2 text-sm text-[#1a1a17] outline-none focus:ring-2 focus:ring-[#3CA43C]/40"
                  />
                  <p className="text-xs text-[#7a7a72] sm:col-span-2">
                    <Link to="/sign-in" className="font-semibold text-[#3c6e35] hover:underline">
                      Sign in
                    </Link>{' '}
                    to save this address for next time.
                  </p>
                </div>
              </>
            ) : (
              <>
                <h2 className="mt-10 text-xl font-bold text-[#1a1a17]">Contact Details</h2>
                <div className="mt-4 rounded-xl border border-black/10 p-5">
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    value={guestForm.email}
                    onChange={(e) => setGuestForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full max-w-sm rounded-md border border-black/15 px-3 py-2 text-sm text-[#1a1a17] outline-none focus:ring-2 focus:ring-[#3CA43C]/40"
                  />
                  <p className="mt-2 text-xs text-[#7a7a72]">
                    Optional &mdash; we already have your email from your profile and will send your order confirmation there.
                  </p>
                </div>
              </>
            )}

            <h2 className="mt-10 text-xl font-bold text-[#1a1a17]">Shipping Address</h2>
            <div className="mt-4 rounded-xl border border-black/10 p-5">
              {isAuthenticated && savedAddresses.length > 0 && !addingAddress && (
                <div className="flex flex-col gap-3">
                  {savedAddresses.map((a) => (
                    <label
                      key={a._id}
                      className={`flex items-start gap-3 rounded-md border px-4 py-3 ${
                        selectedAddressId === a._id ? 'border-[#3CA43C] bg-[#eef4e9]' : 'border-black/15'
                      }`}
                    >
                      <input
                        type="radio"
                        name="saved-address"
                        checked={selectedAddressId === a._id}
                        onChange={() => setSelectedAddressId(a._id)}
                        className="mt-0.5 h-4 w-4 accent-[#3CA43C]"
                      />
                      <span className="text-sm text-[#1a1a17]">
                        {a.street}, {a.city}, {a.province} {a.postalCode}, {a.country}
                      </span>
                    </label>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAddingAddress(true)}
                    className="self-start text-xs font-semibold text-[#3CA43C] hover:underline"
                  >
                    + Add a new address
                  </button>
                </div>
              )}

              {addingAddress && (
                <form onSubmit={saveNewAddress} className="flex flex-col gap-3">
                  <input
                    required
                    placeholder="Street address"
                    value={addressForm.street}
                    onChange={(e) => setAddressForm((f) => ({ ...f, street: e.target.value }))}
                    className="rounded-md border border-black/15 px-3 py-2 text-sm text-[#1a1a17] outline-none focus:ring-2 focus:ring-[#3CA43C]/40"
                  />
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <p className="mb-1 text-xs text-[#7a7a72]">Country</p>
                      <input
                        required
                        value={addressForm.country}
                        onChange={(e) => setAddressForm((f) => ({ ...f, country: e.target.value }))}
                        className="w-full rounded-md border border-black/15 px-3 py-2 text-sm text-[#1a1a17] outline-none focus:ring-2 focus:ring-[#3CA43C]/40"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-[#7a7a72]">Province</p>
                      <input
                        required
                        value={addressForm.province}
                        onChange={(e) => setAddressForm((f) => ({ ...f, province: e.target.value }))}
                        className="w-full rounded-md border border-black/15 px-3 py-2 text-sm text-[#1a1a17] outline-none focus:ring-2 focus:ring-[#3CA43C]/40"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-[#7a7a72]">City</p>
                      <input
                        required
                        value={addressForm.city}
                        onChange={(e) => setAddressForm((f) => ({ ...f, city: e.target.value }))}
                        className="w-full rounded-md border border-black/15 px-3 py-2 text-sm text-[#1a1a17] outline-none focus:ring-2 focus:ring-[#3CA43C]/40"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-[#7a7a72]">Postal Code</p>
                      <input
                        value={addressForm.postalCode}
                        onChange={(e) => setAddressForm((f) => ({ ...f, postalCode: e.target.value }))}
                        className="w-full rounded-md border border-black/15 px-3 py-2 text-sm text-[#1a1a17] outline-none focus:ring-2 focus:ring-[#3CA43C]/40"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={savingAddress}
                      className="self-start rounded-md bg-[#3CA43C] px-5 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-[#2f8a30] disabled:opacity-60"
                    >
                      {isAuthenticated
                        ? savingAddress
                          ? 'Saving…'
                          : 'Save Address'
                        : 'Use This Address'}
                    </button>
                    {savedAddresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAddingAddress(false)}
                        className="text-xs font-semibold text-[#7a7a72] hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>

            <h2 className="mt-10 text-xl font-bold text-[#1a1a17]">Payment Method</h2>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {PAYMENT_GATEWAYS.map((gw) => {
                const Icon = gw.icon
                const isOpen = activeGateway === gw.id
                return (
                  <button
                    key={gw.id}
                    type="button"
                    onClick={() => setActiveGateway(isOpen ? null : gw.id)}
                    className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition ${
                      isOpen
                        ? 'border-[#3CA43C] bg-[#eef4e9] text-[#3c6e35]'
                        : 'border-black/15 text-[#4a4a43] hover:bg-black/5'
                    }`}
                  >
                    <span className="scale-[0.8]">
                      <Icon />
                    </span>
                    {gw.label}
                    <ChevronIcon
                      className={`h-3 w-3 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                )
              })}
            </div>

            {activeGateway === 'authorize' && <CardPaymentForm ref={cardFormRef} />}
            {activeGateway === 'paypal' && (
              <PayPalCheckoutButton
                getOrderPayload={buildOrderPayload}
                onApproved={handleOrderPlaced}
                onError={setPlaceError}
              />
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl border border-black/10 p-5">
              {!showCoupon ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowCoupon(true)}
                    className="w-full rounded-md border border-[#3CA43C] py-2.5 text-sm font-bold uppercase tracking-wide text-[#3CA43C] hover:bg-[#eef4e9]"
                  >
                    Apply Coupon
                  </button>
                  <p className="my-3 text-center text-xs text-[#9a988e]">or</p>
                  <p className="text-center text-sm text-[#4a4a43]">
                    Get 10% Discount on First Order
                  </p>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter Code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      className="w-full rounded-md border border-black/15 px-3 py-2 text-sm text-[#1a1a17] outline-none focus:ring-2 focus:ring-[#3CA43C]/40"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponBusy}
                      className="shrink-0 rounded-md border border-[#3CA43C] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#3CA43C] hover:bg-[#eef4e9] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {couponBusy ? 'Checking…' : 'Apply'}
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-xs font-medium text-red-600">{couponError}</p>
                  )}
                  {appliedCoupon && (
                    <p className="text-xs font-medium text-[#3c6e35]">
                      Code {appliedCoupon.code} applied &mdash;{' '}
                      {appliedCoupon.discountType === 'percentage'
                        ? `${appliedCoupon.value}%`
                        : `$${appliedCoupon.value}`}{' '}
                      off
                    </p>
                  )}
                </div>
              )}

              <div className="mt-5 border-t border-black/10 pt-4">
                <p className="text-sm font-bold text-[#1a1a17]">Total Product</p>
                <div className="mt-3 flex flex-col gap-2 text-sm text-[#4a4a43]">
                  <div className="flex items-center justify-between">
                    <span>
                      Total Product Price ({itemCount} Item{itemCount === 1 ? '' : 's'})
                    </span>
                    <span className="font-semibold text-[#1a1a17]">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total Shipping Price</span>
                    <span className="font-semibold text-[#3CA43C]">Free</span>
                  </div>
                </div>

                {discount > 0 && (
                  <div className="mt-3 flex items-center justify-between text-sm text-[#3CA43C]">
                    <span>Discount</span>
                    <span className="font-semibold">-${discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-4">
                  <span className="text-sm font-bold text-[#1a1a17]">Grand total</span>
                  <span className="text-2xl font-extrabold text-[#1a1a17]">
                    ${grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {placeError && (
                <p className="mt-3 text-xs font-medium text-red-600">{placeError}</p>
              )}

              {activeGateway === 'authorize' && (
                <button
                  type="button"
                  onClick={placeOrder}
                  disabled={placing}
                  className="mt-5 w-full rounded-md bg-[#3CA43C] px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#2f8a30] disabled:opacity-60"
                >
                  {placing ? 'Placing Order…' : 'Pay & Place Order'}
                </button>
              )}
              <p className="mt-2 text-center text-xs text-[#7a7a72]">
                {activeGateway === 'paypal'
                  ? 'Use the PayPal button above to complete your payment.'
                  : activeGateway === 'authorize'
                    ? 'Your card will be charged immediately.'
                    : 'Choose a payment provider above to continue.'}
              </p>
              <div className="mt-4">
                <PaymentIcons />
              </div>
            </div>
          </aside>
        </div>
      </section>

      {relatedProducts.length > 0 && (
        <section className="mx-auto max-w-[1280px] border-t border-black/10 px-5 py-10 lg:px-10">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#1a1a17]">Related Products</h2>
            <Link to="/shop" className="text-sm font-semibold text-[#3c6e35] hover:underline">
              View all
            </Link>
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

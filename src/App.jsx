import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ScrollToTop from './components/ScrollToTop'
import Canonical from './components/Canonical'
import Home from './pages/Home'
import CreateAccount from './pages/CreateAccount'
import SignIn from './pages/SignIn'
import VerifyOtp from './pages/VerifyOtp'
import Shop from './pages/Shop'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import AboutUs from './pages/AboutUs'
import ContactUs from './pages/ContactUs'
import Blog from './pages/Blog'
import BlogDetail from './pages/BlogDetail'
import Profile from './pages/Profile'
import Wishlist from './pages/Wishlist'
import FAQPage from './pages/FAQPage'
import PrivacyPolicy from './pages/PrivacyPolicy'
import ReturnPolicy from './pages/ReturnPolicy'
import ShippingPolicy from './pages/ShippingPolicy'
import TermsOfService from './pages/TermsOfService'
import RefundPolicy from './pages/RefundPolicy'

function App() {
  return (
    <>
      <ScrollToTop />
      <Canonical />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/create-account" element={<CreateAccount />} />
          <Route path="/create-account/verify" element={<VerifyOtp />} />
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/collections/:slug" element={<Shop />} />
          <Route path="/products/:slug" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/contact-us" element={<ContactUs />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogDetail />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/return-policy" element={<ReturnPolicy />} />
          <Route path="/shipping-policy" element={<ShippingPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/wishlist" element={<Wishlist />} />
        </Route>
      </Routes>
    </>
  )
}

export default App

import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import CustomerCartPanel from '@/components/CustomerCartPanel';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  EyeOff,
  MapPin,
  Menu,
  ShieldCheck,
  ShoppingBasket,
  ShoppingCart,
  Sparkles,
  Store,
  Truck,
  X,
} from 'lucide-react';

const NAV_LINKS = [
  { label: 'Products', href: '/products' },
  { label: 'Cart', href: '/cart' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Track Order', href: '/track-orders' },
  { label: 'Sign in', href: '/login' },
];

const TRUST_POINTS = [
  { title: 'Fresh Daily Stock', icon: Sparkles },
  { title: 'Fast Local Delivery', icon: Truck },
  { title: 'Clean & Safe Packaging', icon: ShieldCheck },
  { title: 'Pickup Available', icon: Store },
];

const ORDER_STEPS = [
  {
    title: 'Browse Products',
    description: 'Customers can browse live products and categories loaded directly from your database.',
    icon: ShoppingBasket,
  },
  {
    title: 'Add to Cart',
    description: 'Anyone can add items to the cart before creating an account.',
    icon: CheckCircle2,
  },
  {
    title: 'Create Account To Confirm',
    description: 'At checkout we collect full name, phone, email, region or city, district or area, address, delivery or pickup, pickup time, and password.',
    icon: ShieldCheck,
  },
  {
    title: 'Receive Your Order',
    description: 'Orders are saved to the system after account creation and checkout confirmation.',
    icon: Clock3,
  },
];

const REASONS = [
  {
    title: 'Live Inventory Categories',
    description: 'The homepage now reads categories from the database instead of hardcoded sample content.',
    icon: Sparkles,
  },
  {
    title: 'Real Product Listings',
    description: 'Featured products on the landing page come from the products and product_prices tables.',
    icon: ShoppingBasket,
  },
  {
    title: 'Guest Cart Support',
    description: 'Visitors can browse and add items to cart before signup, making ordering feel easier.',
    icon: Store,
  },
  {
    title: 'Checkout With Delivery Or Pickup',
    description: 'Customers choose delivery or pickup during confirmation and can set a pickup time when needed.',
    icon: Truck,
  },
];

const FOOTER_LINKS = [
  { label: 'Products', href: '/products' },
  { label: 'Categories', href: '#categories' },
  { label: 'Cart', href: '/cart' },
  { label: 'Promotions', href: '/promotions' },
];

function formatCurrency(value) {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function SectionHeading({ eyebrow, title, description, center = false }) {
  return (
    <div className={center ? 'text-center max-w-3xl mx-auto' : 'max-w-2xl'}>
      <span className="inline-flex items-center rounded-full border border-[#7a1f28]/15 bg-[#7a1f28]/8 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-[#7a1f28]">
        {eyebrow}
      </span>
      <h2 className="mt-5 text-3xl font-black tracking-tight text-[#241816] sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-[#6f5d57]">
        {description}
      </p>
    </div>
  );
}

function FlashBanner({ flash }) {
  if (!flash?.success && !flash?.error) {
    return null;
  }

  const isError = Boolean(flash.error);

  return (
    <div className={`mx-auto mt-6 max-w-7xl rounded-2xl border px-5 py-4 text-sm font-medium ${
      isError
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
    }`}>
      {flash.error || flash.success}
    </div>
  );
}

function SmartLink({ href, className, children, onClick }) {
  if (href?.startsWith('#')) {
    return (
      <a href={href} className={className} onClick={onClick}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

function GuestCheckoutModal({
  open,
  onClose,
  cart,
}) {
  if (!open) {
    return null;
  }

  const hasItems = (cart?.count || 0) > 0;

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-[#1A1A1A]/65 p-4 backdrop-blur-sm">
      <div className="my-auto max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white shadow-[0_35px_90px_rgba(36,24,22,0.3)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#eadfd4] px-6 py-5 sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7a1f28]">Customer Confirmation</p>
            <h2 className="mt-2 text-2xl font-black text-[#241816]">Login before confirming order</h2>
            <p className="mt-2 text-sm leading-7 text-[#6f5d57]">
              To confirm your order, log in with your existing account first. If you do not have an account yet, sign up and then continue to checkout.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-[#eadfd4] p-2 text-[#6f5d57] transition hover:text-[#241816]">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="p-6 sm:p-8">
            <div className="rounded-2xl border border-[#eadfd4] bg-[#fcf6f0] p-5 text-sm leading-7 text-[#6f5d57]">
              Your cart stays saved. After you log in, you can complete the order using your account details and delivery location.
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                href="/login"
                className={`inline-flex items-center justify-center rounded-xl bg-[#7a1f28] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#651820] ${!hasItems ? 'pointer-events-none bg-[#c8b1ab]' : ''}`}
              >
                Login To Continue
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-xl border border-[#eadfd4] px-5 py-3 text-sm font-bold text-[#241816]"
              >
                Sign Up First
              </Link>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-xl border border-[#eadfd4] px-5 py-3 text-sm font-bold text-[#241816]"
            >
              Cancel
            </button>
          </div>

          <div className="bg-[#2f1d19] p-6 text-white sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e8d6cf]">Order Summary</p>
            <h3 className="mt-2 text-2xl font-black">Cart items</h3>

            <div className="mt-6 space-y-4">
              {cart?.items?.length ? cart.items.map((item) => (
                <div key={item.line_id} className="rounded-[1.4rem] bg-white/8 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black">{item.name}</p>
                      <p className="mt-1 text-sm text-[#e8d6cf]">{item.category} • Qty {item.quantity}</p>
                    </div>
                    <span className="text-sm font-bold">{formatCurrency(item.subtotal)}</span>
                  </div>
                </div>
              )) : (
                <div className="rounded-[1.4rem] border border-dashed border-white/20 p-5 text-sm text-[#f2e6e0]">
                  Add products to your cart first before confirming the order.
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
              <div className="flex items-center justify-between text-sm text-[#e8d6cf]">
                <span>Total Items</span>
                <span>{cart?.count || 0}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xl font-black">
                <span>Subtotal</span>
                <span>{formatCurrency(cart?.subtotal || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home({ categories = [], products = [], cart, activeCategory = null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [guestCheckoutOpen, setGuestCheckoutOpen] = useState(false);
  const { flash, auth } = usePage().props;

  const openGuestCheckout = () => {
    if ((cart?.count || 0) === 0) {
      return;
    }

    setGuestCheckoutOpen(true);
  };

  const closeGuestCheckout = () => {
    setGuestCheckoutOpen(false);
  };

  const showCartPanel = false;

  return (
    <div className="min-h-screen bg-[#f7f2ea] text-[#241816]">
      <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top_left,_rgba(122,31,40,0.16),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(143,91,58,0.22),_transparent_35%),linear-gradient(180deg,_#fffaf4_0%,_#f7f2ea_100%)]" />

      <nav className="sticky top-0 z-50 border-b border-[#e8ddd2]/80 bg-[#fffaf4]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3b241d] shadow-[0_14px_30px_rgba(36,24,22,0.18)]">
              <img src="/images/amani_brew_mark.png" alt="Amani Brew logo" className="h-9 w-9 object-contain" />
            </div>
            <div>
              <p className="text-lg font-black tracking-wide text-[#241816]">AmaniBrew</p>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#7a1f28]">Fresh Meat Store</p>
            </div>
          </a>

          <div className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
              <SmartLink key={link.label} href={link.href} className="text-sm font-semibold text-[#4d3a35] transition hover:text-[#7a1f28]">
                {link.label}
              </SmartLink>
            ))}
            {auth?.user ? (
              <Link href="/checkout" className="rounded-full bg-[#7a1f28] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(122,31,40,0.18)] transition hover:bg-[#651820]">
                Order now
              </Link>
            ) : (
              <button
                type="button"
                onClick={openGuestCheckout}
                className="rounded-full bg-[#7a1f28] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(122,31,40,0.18)] transition hover:bg-[#651820]"
              >
                Order now
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex rounded-full border border-[#3b241d]/10 bg-white p-3 text-[#241816] lg:hidden"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-[#e8ddd2] bg-[#fffaf4] px-6 py-4 lg:hidden">
            <div className="space-y-3">
              {NAV_LINKS.map((link) => (
                <SmartLink
                  key={link.label}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-2xl px-4 py-3 text-sm font-semibold text-[#4d3a35] transition hover:bg-[#f3e7dc] hover:text-[#7a1f28]"
                >
                  {link.label}
                </SmartLink>
              ))}
              {auth?.user ? (
                <Link
                  href="/checkout"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-2xl bg-[#7a1f28] px-4 py-3 text-center text-sm font-semibold text-white"
                >
                  Order now
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    openGuestCheckout();
                  }}
                  className="block w-full rounded-2xl bg-[#7a1f28] px-4 py-3 text-center text-sm font-semibold text-white"
                >
                  Order now
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      <FlashBanner flash={flash} />
      <GuestCheckoutModal
        open={guestCheckoutOpen}
        onClose={closeGuestCheckout}
        cart={cart}
      />

      <main className={showCartPanel ? 'xl:pr-[22rem]' : ''}>
        <section className="mx-auto max-w-7xl px-6 pt-8">
          <div className="overflow-hidden rounded-[2.5rem] bg-[linear-gradient(135deg,#7a1f28_0%,#3b241d_100%)] p-8 text-white shadow-[0_28px_70px_rgba(59,36,29,0.24)] sm:p-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#f1d3c6]">Ready to order</p>
                <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                  Browse products, build your cart, then create your account to confirm the order.
                </h2>
                <p className="mt-5 max-w-2xl text-base leading-8 text-[#f5ded5]">
                  Customers can add items to cart first. During checkout we collect full name, phone, email, region or city, district or area, address, delivery or pickup, pickup time, and password before the order is confirmed.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row lg:flex-col">
                <a
                  href="#products"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-sm font-bold text-[#7a1f28] transition hover:bg-[#fff1ea]"
                >
                  Browse Products
                </a>
                {auth?.user ? (
                  <Link
                    href="/checkout"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-7 py-4 text-sm font-bold text-white transition hover:bg-white/10"
                  >
                    Order now
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={openGuestCheckout}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-7 py-4 text-sm font-bold text-white transition hover:bg-white/10"
                  >
                    Order now
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-16 pt-10 sm:pt-16 lg:pb-20">
          <div className="grid items-start gap-10 lg:grid-cols-[1.08fr_0.92fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#7a1f28]/15 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#7a1f28] shadow-sm">
                <ShieldCheck size={14} />
                Live products from your database
              </span>
              <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[1.02] tracking-tight text-[#241816] sm:text-6xl">
                Fresh premium meat delivered to your door or prepared for pickup.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#6f5d57]">
                Browse real categories and products from the system, add items to cart, and confirm your order through a guided account-creation checkout flow.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <a
                  href="#products"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#7a1f28] px-7 py-4 text-sm font-bold text-white shadow-[0_18px_35px_rgba(122,31,40,0.25)] transition hover:bg-[#651820]"
                >
                  Shop Products
                  <ArrowRight size={16} />
                </a>
                <a
                  href="#categories"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#3b241d]/15 bg-white px-7 py-4 text-sm font-bold text-[#241816] transition hover:border-[#7a1f28]/25 hover:text-[#7a1f28]"
                >
                  View Categories
                  <ChevronRight size={16} />
                </a>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {[
                  { value: `${categories.length}`, label: 'Live categories' },
                  { value: `${products.length}`, label: 'Live products' },
                  { value: `${cart?.count || 0}`, label: 'Items in cart' },
                ].map((item) => (
                  <div key={item.label} className="rounded-3xl border border-[#eadfd4] bg-white/90 p-5 shadow-sm">
                    <p className="text-2xl font-black text-[#241816]">{item.value}</p>
                    <p className="mt-1 text-sm text-[#6f5d57]">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div id="cart" className="rounded-[2rem] border border-[#eadfd4] bg-white p-6 shadow-[0_30px_80px_rgba(59,36,29,0.12)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7a1f28]">Cart Summary</p>
                  <h3 className="mt-2 text-2xl font-black text-[#241816]">Your order cart</h3>
                </div>
                <div className="rounded-2xl bg-[#f8efe7] px-4 py-3 text-center">
                  <p className="text-sm font-bold text-[#7a1f28]">{cart?.count || 0}</p>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[#8d746b]">Items</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {cart?.items?.length ? cart.items.map((item) => (
                  <div key={item.line_id} className="rounded-[1.5rem] border border-[#eadfd4] bg-[#fbf6f1] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-black text-[#241816]">{item.name}</p>
                        <p className="mt-1 text-sm text-[#6f5d57]">{item.category} • Qty {item.quantity}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => window.location.href = '#products'}
                        className="rounded-full border border-[#e4d6ca] px-3 py-1 text-xs font-bold text-[#7a1f28]"
                      >
                        View
                      </button>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[#7a1f28]">{formatCurrency(item.subtotal)}</p>
                      <Link
                        href={`/cart/items/${item.line_id}`}
                        method="delete"
                        as="button"
                        className="text-sm font-bold text-[#7a1f28] hover:underline"
                      >
                        Remove
                      </Link>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-[1.5rem] border border-dashed border-[#e4d6ca] bg-[#fbf6f1] p-6 text-center">
                    <p className="text-lg font-black text-[#241816]">Your cart is empty</p>
                    <p className="mt-2 text-sm leading-7 text-[#6f5d57]">
                      Browse the live products below and add items to cart before you continue to checkout.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 rounded-[1.5rem] bg-[#2f1d19] p-5 text-white">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-[#e6d4ce]">Subtotal</span>
                  <span className="text-xl font-black">{formatCurrency(cart?.subtotal || 0)}</span>
                </div>
                <p className="mt-3 text-sm leading-7 text-[#f0dfd8]">
                  Guests can build a cart now. Order confirmation happens at checkout after customer account creation.
                </p>
                {auth?.user ? (
                  <Link
                    href="/checkout"
                    className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3.5 text-sm font-bold text-[#7a1f28] transition hover:bg-[#fff1ea]"
                  >
                    Continue To Checkout
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={openGuestCheckout}
                    className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3.5 text-sm font-bold text-[#7a1f28] transition hover:bg-[#fff1ea]"
                  >
                    Create Account To Confirm
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-8">
          <div className="grid gap-4 rounded-[2rem] border border-[#eadfd4] bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4 lg:p-6">
            {TRUST_POINTS.map((point) => {
              const Icon = point.icon;

              return (
                <div key={point.title} className="flex items-center gap-4 rounded-[1.5rem] bg-[#fbf6f1] px-4 py-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7a1f28] text-white shadow-[0_12px_20px_rgba(122,31,40,0.2)]">
                    <Icon size={20} />
                  </div>
                  <p className="text-sm font-bold text-[#241816]">{point.title}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section id="categories" className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
          <SectionHeading
            eyebrow="Shop By Category"
            title="Categories shown here now come directly from the database."
            description="Category cards are image-free as requested, making the storefront cleaner and aligned with your actual category records."
          />

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => (
              <article key={category.id} className="rounded-[1.8rem] border border-[#e9ddd1] bg-[#f4efea] p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(59,36,29,0.1)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9b867f]">Category</p>
                    <h3 className="mt-3 text-2xl font-black text-[#241816]">{category.name}</h3>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#7a1f28]">
                    {category.products_count} items
                  </span>
                </div>
                <p className="mt-4 text-sm leading-7 text-[#7a6660]">{category.description}</p>
                <Link href={`/?category=${category.slug}#products`} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#7a1f28]">
                  View Products
                  <ArrowRight size={15} />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section id="products" className="py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <SectionHeading
                  eyebrow={activeCategory ? 'Filtered Products' : 'Featured Products'}
                  title={activeCategory
                    ? `Showing only ${activeCategory.name} products.`
                    : 'Products on the front page now load from the products table.'}
                  description={activeCategory
                    ? 'Use the category cards to narrow the storefront to the selected category, or clear the filter to see everything again.'
                    : 'These cards are image-free, show real pricing, and let customers add items to cart immediately.'}
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                {activeCategory && (
                  <Link
                    href="/#products"
                    className="inline-flex items-center justify-center rounded-full border border-[#3b241d]/15 bg-white px-5 py-3 text-sm font-bold text-[#241816] transition hover:border-[#7a1f28]/25 hover:text-[#7a1f28]"
                  >
                    Clear Filter
                  </Link>
                )}
                {auth?.user ? (
                  <Link
                    href="/checkout"
                    className="inline-flex items-center justify-center rounded-full bg-[#7a1f28] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#651820]"
                  >
                    View Cart & Checkout
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={openGuestCheckout}
                    className="inline-flex items-center justify-center rounded-full bg-[#7a1f28] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#651820]"
                  >
                    Create Account To Confirm
                  </button>
                )}
              </div>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {products.map((product) => (
                  <article
                    key={product.id}
                    className="overflow-hidden rounded-[2rem] border border-[#e8d8c8] bg-[#f7f0e8] text-[#241816] shadow-[0_10px_24px_rgba(89,58,40,0.08)] transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(89,58,40,0.12)]"
                  >
                    <div className="p-7">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9d8175]">
                        {product.category || product.sku || 'Product'}
                      </p>
                      <h3 className="mt-5 text-[2.1rem] font-black leading-none tracking-[-0.03em] sm:text-[2rem]">
                        {product.name}
                      </h3>
                      <p className="mt-5 min-h-[3.5rem] text-[15px] leading-8 text-[#7a6660]">
                        {product.description || 'Fresh stock ready for your next order.'}
                      </p>
                      <div className="mt-8 flex items-center justify-between gap-3">
                        <span className={`rounded-full px-4 py-1.5 text-sm font-bold ${
                          product.status === 'In Stock'
                            ? 'bg-[#e8f8ef] text-[#175d35]'
                            : product.status === 'Low Stock'
                              ? 'bg-[#fff1d6] text-[#9a5b00]'
                              : 'bg-[#fff0f0] text-[#df1d1d]'
                        }`}>
                          {product.status}
                        </span>
                        <p className="text-[2rem] font-black leading-none text-[#7a1f28]">{formatCurrency(product.price)}</p>
                      </div>
                      <p className="mt-6 text-[11px] uppercase tracking-[0.24em] text-[#9d8175]">
                        Unit: {product.unit || 'item'}
                      </p>
                      <Link
                        href="/cart/items"
                        method="post"
                        data={{ product_id: product.id, quantity: 1 }}
                        as="button"
                        disabled={product.status === 'Out of Stock'}
                        className="mt-7 inline-flex w-full items-center justify-center rounded-[0.85rem] bg-[#563b2a] px-5 py-4 text-[15px] font-bold text-white transition hover:bg-[#472f22] disabled:cursor-not-allowed disabled:bg-[#d8c9c2] disabled:text-[#f6f0eb]"
                      >
                          <ShoppingCart size={16} className="mr-2" />
                          Add To Cart
                      </Link>
                  </div>
                </article>
              ))}
              {!products.length && (
                <div className="md:col-span-2 xl:col-span-4 rounded-[1.8rem] border border-dashed border-[#e9ddd1] bg-[#f4efea] p-10 text-center">
                  <p className="text-2xl font-black text-[#241816]">No products found for this category.</p>
                  <p className="mt-3 text-sm leading-7 text-[#7a6660]">
                    Try another category or clear the filter to view all available products.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-[#fffaf4] py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeading
              eyebrow="How Ordering Works"
              title="Guests can shop first, but checkout confirmation requires a customer account."
              description="This flow lets customers explore freely while still collecting the right details before an order is saved."
              center
            />

            <div className="mt-12 grid gap-6 lg:grid-cols-4">
              {ORDER_STEPS.map((step, index) => {
                const Icon = step.icon;

                return (
                  <article key={step.title} className="rounded-[2rem] border border-[#eadfd4] bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3b241d] text-white">
                        <Icon size={22} />
                      </div>
                      <span className="text-sm font-black text-[#b7a19b]">0{index + 1}</span>
                    </div>
                    <h3 className="mt-6 text-xl font-black text-[#241816]">{step.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#6f5d57]">{step.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="delivery-pickup" className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-[2.2rem] bg-[linear-gradient(180deg,#2f1d19_0%,#231512_100%)] p-8 text-white shadow-[0_26px_70px_rgba(36,24,22,0.2)]">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                <Truck size={24} />
              </div>
              <h3 className="mt-6 text-3xl font-black">Delivery</h3>
              <p className="mt-4 text-sm leading-7 text-[#e8d6cf]">
                Customers entering delivery during checkout provide their location so the order can be prepared for dispatch.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-[#f3e7e1]">
                <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-[#d8b08e]" /> Delivery location is collected during checkout</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-[#d8b08e]" /> Cart stays available before signup</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-[#d8b08e]" /> Order is confirmed only after account creation</li>
              </ul>
            </article>

            <article className="rounded-[2.2rem] border border-[#eadfd4] bg-white p-8 shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7a1f28] text-white">
                <Store size={24} />
              </div>
              <h3 className="mt-6 text-3xl font-black text-[#241816]">Pickup</h3>
              <p className="mt-4 text-sm leading-7 text-[#6f5d57]">
                Customers choosing pickup select their preferred pickup time at checkout before the order is submitted.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-[#4d3a35]">
                <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-[#7a1f28]" /> Pickup time becomes required when pickup is selected</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-[#7a1f28]" /> Full customer details are stored with the account</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-[#7a1f28]" /> Branch fulfillment is attached to the saved order</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="bg-[#f2e7dc] py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeading
              eyebrow="Why This Flow"
              title="The public storefront is now tied to your database and your real checkout rules."
              description="The homepage focuses on useful actions, and checkout captures exactly the information you asked for."
              center
            />

            <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {REASONS.map((reason) => {
                const Icon = reason.icon;

                return (
                  <article key={reason.title} className="rounded-[2rem] bg-white p-6 shadow-sm">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7a1f28]/8 text-[#7a1f28]">
                      <Icon size={22} />
                    </div>
                    <h3 className="mt-6 text-xl font-black text-[#241816]">{reason.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#6f5d57]">{reason.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#eadfd4] bg-[#fffaf4]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[1.1fr_0.75fr_0.75fr_0.9fr]">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3b241d]">
                <img src="/images/amani_brew_mark.png" alt="Amani Brew logo" className="h-9 w-9 object-contain" />
              </div>
              <div>
                <p className="text-lg font-black text-[#241816]">AmaniBrew</p>
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#7a1f28]">Premium meat ordering</p>
              </div>
            </div>
            <p className="mt-5 max-w-md text-sm leading-7 text-[#6f5d57]">
              Browse live categories and products, add items to a guest cart, and confirm the order through customer account creation.
            </p>
          </div>

          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#241816]">Quick Links</p>
            <div className="mt-5 space-y-3">
              {FOOTER_LINKS.map((link) => (
                <SmartLink key={link.label} href={link.href} className="block text-sm font-medium text-[#6f5d57] transition hover:text-[#7a1f28]">
                  {link.label}
                </SmartLink>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#241816]">Account</p>
            <div className="mt-5 space-y-3 text-sm text-[#6f5d57]">
              <Link href="/login" className="block font-medium transition hover:text-[#7a1f28]">Staff Login</Link>
              {!auth?.user && (
                <Link href="/register" className="block font-medium transition hover:text-[#7a1f28]">Customer Signup</Link>
              )}
              {auth?.user ? (
                <Link href="/checkout" className="block font-medium transition hover:text-[#7a1f28]">Order now</Link>
              ) : (
                <button
                  type="button"
                  onClick={openGuestCheckout}
                  className="block text-left font-medium transition hover:text-[#7a1f28]"
                >
                  Order now
                </button>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#241816]">Contact & Hours</p>
            <div className="mt-5 space-y-4 text-sm text-[#6f5d57]">
              <p className="flex items-start gap-3">
                <MapPin size={16} className="mt-1 shrink-0 text-[#7a1f28]" />
                Dar es Salaam, Tanzania
              </p>
              <p className="flex items-start gap-3">
                <Clock3 size={16} className="mt-1 shrink-0 text-[#7a1f28]" />
                Mon - Sat, 7:00 AM - 7:00 PM
              </p>
              <p className="flex items-start gap-3">
                <Truck size={16} className="mt-1 shrink-0 text-[#7a1f28]" />
                Delivery and pickup available
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { MapPin, ShoppingCart, Tag, UserRound } from 'lucide-react';
import CustomerCartPanel from '@/components/CustomerCartPanel';

function navClass(active) {
  return active
    ? 'text-[var(--color-brand-dark)] font-semibold'
    : 'text-[var(--color-sys-text-secondary)] hover:text-[var(--color-brand-dark)]';
}

export default function StoreLayout({ children, title, subtitle, showLiveCart = true }) {
  const { auth, cart = { line_count: 0 } } = usePage().props;
  const currentUrl = usePage().url;
  const isCustomer = auth?.user?.role_key === 'customer';
  const showCustomerSession = Boolean(isCustomer);
  const showCartPanel = showLiveCart && showCustomerSession && (cart?.line_count || 0) > 0;
  const brandHref = isCustomer ? '/customer/home' : '/';
  const navItems = isCustomer
    ? [
        { label: 'Home', href: '/customer/home', active: currentUrl.startsWith('/customer/home') },
        { label: 'Products', href: '/products', active: currentUrl.startsWith('/products') },
        { label: 'Packs', href: '/customer/home#packs', active: currentUrl.startsWith('/customer/home') },
        { label: 'Promotion', href: '/customer/home#promotions', active: currentUrl.startsWith('/customer/home') },
        { label: 'My Orders', href: '/my-orders', active: currentUrl.startsWith('/my-orders') || currentUrl.startsWith('/track-orders') },
        { label: 'Profile', href: '/profile', active: currentUrl.startsWith('/profile') },
      ]
    : [
        { label: 'Home', href: '/', active: currentUrl === '/' },
        { label: 'Products', href: '/#products', active: currentUrl === '/' },
        { label: 'Signup', href: '/register', active: currentUrl.startsWith('/register') },
      ];

  return (
    <div className="min-h-screen bg-[#f6f1e8] text-[var(--color-sys-text-primary)]">
      <header className="border-b border-[var(--color-sys-border)] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
          <Link href={brandHref} className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[var(--color-brand-dark)]">
              <img src="/images/amani_brew_mark.png" alt="Amani Brew logo" className="h-9 w-9 object-contain" />
            </div>
            <div>
              <p className="text-lg font-bold">AmaniBrew</p>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-sys-text-secondary)]">Fresh ordering</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <a key={item.label} href={item.href} className={navClass(item.active)}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/cart" className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--color-sys-border)] bg-white text-[var(--color-brand-dark)]">
              <ShoppingCart size={18} />
              {cart?.line_count > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#a42828] px-1 text-[10px] font-bold text-white">
                  {cart.line_count}
                </span>
              )}
            </Link>
            {showCustomerSession ? (
              <>
                <Link href="/profile" className="hidden rounded-2xl bg-[var(--color-brand-dark)] px-4 py-3 text-sm font-semibold text-white sm:inline-flex">
                  <UserRound size={16} className="mr-2" />
                  My account
                </Link>
                <Link
                  href="/logout"
                  method="post"
                  as="button"
                  className="hidden rounded-2xl border border-[var(--color-sys-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--color-sys-text-primary)] lg:inline-flex"
                >
                  Logout
                </Link>
              </>
            ) : (
              <Link href="/login" className="hidden rounded-2xl bg-[var(--color-brand-dark)] px-4 py-3 text-sm font-semibold text-white sm:inline-flex">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {showLiveCart && <CustomerCartPanel />}

      <main className={`mx-auto max-w-7xl px-6 py-8 ${showCartPanel ? 'xl:pr-[22rem]' : ''}`}>
        {(title || subtitle) && (
          <section className="mb-8 rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-[var(--color-sys-border)]">
            {title && <h1 className="text-3xl font-black tracking-tight">{title}</h1>}
            {subtitle && <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--color-sys-text-secondary)]">{subtitle}</p>}
            <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-sys-text-secondary)]">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#f3ede3] px-4 py-2"><MapPin size={14} /> Delivery and pickup ready</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#f3ede3] px-4 py-2"><Tag size={14} /> Built for fast ordering</span>
            </div>
          </section>
        )}
        {children}
      </main>
    </div>
  );
}

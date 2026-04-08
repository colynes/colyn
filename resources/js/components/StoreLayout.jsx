import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { MapPin, Menu, ShoppingCart, Tag, UserRound, X } from 'lucide-react';
import CustomerCartPanel from '@/components/CustomerCartPanel';
import NotificationBell from '@/components/NotificationBell';
import NotificationRealtimeBridge from '@/components/NotificationRealtimeBridge';

function navClass(active) {
  return active
    ? 'text-[var(--color-brand-dark)] font-semibold'
    : 'text-[var(--color-sys-text-secondary)] hover:text-[var(--color-brand-dark)]';
}

function SmartNavLink({ item, onClick }) {
  if (item.href.startsWith('#')) {
    return (
      <a href={item.href} onClick={onClick} className={`${navClass(item.active)} text-[0.95rem]`}>
        {item.label}
      </a>
    );
  }

  return (
    <Link href={item.href} onClick={onClick} className={`${navClass(item.active)} text-[0.95rem]`}>
      {item.label}
    </Link>
  );
}

export default function StoreLayout({ children, title, subtitle, showLiveCart = true }) {
  const { auth, cart = { line_count: 0 } } = usePage().props;
  const currentUrl = usePage().url;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAuthenticated = Boolean(auth?.user);
  const isCustomer = auth?.user?.role_key === 'customer';
  const isBackoffice = isAuthenticated && !isCustomer;
  const brandHref = isCustomer ? '/customer/home' : '/';
  const navItems = isCustomer
    ? [
        { label: 'Home', href: '/customer/home', active: currentUrl === '/customer/home' },
        { label: 'Products', href: '/products', active: currentUrl.startsWith('/products') },
        { label: 'Packs', href: '/packs', active: currentUrl.startsWith('/packs') },
        { label: 'Promotion', href: '/promotions', active: currentUrl.startsWith('/promotions') },
        { label: 'My Orders', href: '/my-orders', active: currentUrl.startsWith('/my-orders') || currentUrl.startsWith('/track-orders') },
        { label: 'Profile', href: '/profile', active: currentUrl.startsWith('/profile') },
      ]
    : isBackoffice
      ? [
          { label: 'Store Home', href: '/', active: currentUrl === '/' },
          { label: 'Products', href: '/products', active: currentUrl.startsWith('/products') },
          { label: 'Packs', href: '/packs', active: currentUrl.startsWith('/packs') },
          { label: 'Promotion', href: '/promotions', active: currentUrl.startsWith('/promotions') },
          { label: 'Dashboard', href: '/dashboard', active: currentUrl.startsWith('/dashboard') },
        ]
      : [
          { label: 'Home', href: '/', active: currentUrl === '/' },
          { label: 'Products', href: '/#products', active: currentUrl === '/' },
          { label: 'Packs', href: '/packs', active: currentUrl.startsWith('/packs') },
          { label: 'Promotion', href: '/promotions', active: currentUrl.startsWith('/promotions') },
          { label: 'Signup', href: '/register', active: currentUrl.startsWith('/register') },
        ];

  return (
    <div className="min-h-screen bg-[#f6f1e8] text-[var(--color-sys-text-primary)]">
      <NotificationRealtimeBridge />

      <header className="sticky top-0 z-[80] border-b border-[var(--color-sys-border)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[92rem] items-center justify-between gap-4 px-6 py-5 lg:grid lg:grid-cols-[auto_1fr_auto] lg:gap-6 lg:py-6">
          <Link href={brandHref} className="flex items-center gap-3 self-center">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[var(--color-brand-dark)] shadow-sm">
              <img src="/images/amani_brew_mark.png" alt="Amani Brew logo" className="h-9 w-9 object-contain" />
            </div>
            <div>
              <p className="text-[1.05rem] font-black tracking-[-0.02em]">AmaniBrew</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.28em] text-[var(--color-sys-text-secondary)]">Fresh ordering</p>
            </div>
          </Link>

          <nav className="hidden items-center justify-center gap-8 md:flex">
            {navItems.map((item) => (
              <SmartNavLink key={item.label} item={item} />
            ))}
          </nav>

          <div className="flex items-center justify-end gap-3">
            {isAuthenticated && <NotificationBell className="hidden sm:block" />}
            <Link href="/cart" className="relative hidden h-11 w-11 items-center justify-center rounded-2xl border border-[var(--color-sys-border)] bg-white text-[var(--color-brand-dark)] shadow-sm sm:inline-flex">
              <ShoppingCart size={18} />
              {cart?.line_count > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#a42828] px-1 text-[10px] font-bold text-white">
                  {cart.line_count}
                </span>
              )}
            </Link>
            {isAuthenticated ? (
              <>
                {isCustomer ? (
                  <Link
                    href="/profile"
                    className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-brand-dark)] text-white shadow-sm transition hover:bg-[#4a3527] sm:inline-flex"
                    aria-label="Open profile"
                  >
                    <UserRound size={18} />
                  </Link>
                ) : (
                  <Link
                    href="/dashboard"
                    className="hidden rounded-2xl bg-[var(--color-brand-dark)] px-5 py-3 text-sm font-semibold text-white shadow-sm sm:inline-flex"
                  >
                    <UserRound size={16} className="mr-2" />
                    Dashboard
                  </Link>
                )}
                <Link
                  href="/logout"
                  method="post"
                  as="button"
                  className="hidden rounded-2xl border border-[#efb1b1] bg-[#fff5f5] px-5 py-3 text-sm font-semibold text-[#b42318] transition hover:bg-[#ffe9e9] lg:inline-flex"
                >
                  Logout
                </Link>
              </>
            ) : (
              <Link href="/login" className="hidden rounded-2xl bg-[var(--color-brand-dark)] px-5 py-3 text-sm font-semibold text-white shadow-sm sm:inline-flex">
                Sign in
              </Link>
            )}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--color-sys-border)] bg-white text-[var(--color-brand-dark)] shadow-sm md:hidden"
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {sidebarOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 bg-[#1a1a1a]/45 backdrop-blur-sm"
            aria-label="Close navigation overlay"
          />
          <aside className="absolute right-0 top-0 flex h-full w-[20rem] max-w-[88vw] flex-col bg-white shadow-[0_24px_80px_rgba(44,30,22,0.22)]">
            <div className="flex items-center justify-between border-b border-[var(--color-sys-border)] px-5 py-5">
              <div>
                <p className="text-lg font-black text-[var(--color-sys-text-primary)]">Navigation</p>
                <p className="mt-1 text-xs uppercase tracking-[0.24em] text-[var(--color-sys-text-secondary)]">Amani Brew</p>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-sys-border)] text-[var(--color-sys-text-secondary)]"
                aria-label="Close navigation menu"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <nav className="space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`block rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      item.active
                        ? 'bg-[#f3ede3] text-[var(--color-brand-dark)]'
                        : 'text-[var(--color-sys-text-secondary)] hover:bg-[#faf5ef] hover:text-[var(--color-brand-dark)]'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-6 space-y-3 border-t border-[var(--color-sys-border)] pt-5">
                {isAuthenticated && (
                  <div className="pb-1">
                    <NotificationBell compact className="w-full" />
                  </div>
                )}
                {isAuthenticated ? (
                  <>
                    <Link
                      href={isCustomer ? '/profile' : '/dashboard'}
                      onClick={() => setSidebarOpen(false)}
                      className="inline-flex w-full items-center justify-center rounded-2xl bg-[var(--color-brand-dark)] px-4 py-3 text-sm font-semibold text-white"
                    >
                      <UserRound size={16} className="mr-2" />
                      {isCustomer ? 'Profile' : 'Dashboard'}
                    </Link>
                    <Link
                      href="/logout"
                      method="post"
                      as="button"
                      onClick={() => setSidebarOpen(false)}
                      className="inline-flex w-full items-center justify-center rounded-2xl border border-[#efb1b1] bg-[#fff5f5] px-4 py-3 text-sm font-semibold text-[#b42318]"
                    >
                      Logout
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setSidebarOpen(false)}
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-[var(--color-brand-dark)] px-4 py-3 text-sm font-semibold text-white"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {showLiveCart && <CustomerCartPanel />}

      <main className="mx-auto max-w-[92rem] px-6 py-8">
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

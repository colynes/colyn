import React, { useEffect, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { AlertTriangle, MapPin, Menu, ShoppingCart, Tag, UserRound, X } from 'lucide-react';
import CustomerCartPanel from '@/components/CustomerCartPanel';
import CustomerFooter from '@/components/customer/CustomerFooter';
import NotificationBell from '@/components/NotificationBell';
import PushNotificationBridge from '@/components/PushNotificationBridge';
import NotificationRealtimeBridge from '@/components/NotificationRealtimeBridge';
import Button from '@/components/ui/Button';
import { useI18n } from '@/lib/i18n';
import { logoutCurrentBrowser } from '@/lib/logout';

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

function StoreFlashModal({ message, onClose }) {
  if (!message) {
    return null;
  }

  const isLimitedStock = String(message).toLowerCase().startsWith('only ');

  return (
    <div className="fixed inset-0 z-[130] flex items-start justify-center overflow-y-auto px-4 py-6">
      <button
        type="button"
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-label="Close message"
      />

      <div className="relative my-auto max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl transition-all">
        <div className="absolute right-4 top-4">
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-500 focus:outline-none">
            <X size={20} />
          </button>
        </div>

        <div className="sm:flex sm:items-start">
          <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 sm:mx-0 sm:h-10 sm:w-10">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
            <h3 className="text-lg font-semibold leading-6 text-gray-900">
              {isLimitedStock ? 'Limited Stock' : 'Action Needed'}
            </h3>
            <div className="mt-2">
              <p className="text-sm leading-6 text-gray-500">
                {message}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 sm:mt-5 sm:flex sm:flex-row-reverse">
          <Button
            variant="primary"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function StoreLayout({ children, title, subtitle, showLiveCart = true, showFlashAlert = true }) {
  const { auth, cart = { line_count: 0 }, flash } = usePage().props;
  const currentUrl = usePage().url;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [visibleFlash, setVisibleFlash] = useState(null);
  const { t } = useI18n();
  const isAuthenticated = Boolean(auth?.user);
  const isCustomer = auth?.user?.role_key === 'customer';
  const isBackoffice = isAuthenticated && !isCustomer;
  const brandHref = isCustomer ? '/customer/home' : '/';
  const handleLogout = () => logoutCurrentBrowser();
  const navItems = isCustomer
    ? [
        { label: t('ui.store.nav.home', 'Home'), href: '/customer/home', active: currentUrl === '/customer/home' },
        { label: t('ui.store.nav.products', 'Products'), href: '/products', active: currentUrl.startsWith('/products') },
        { label: t('ui.store.nav.packs', 'Packs'), href: '/packs', active: currentUrl.startsWith('/packs') },
        { label: t('ui.store.nav.promotions', 'Promotions'), href: '/promotions', active: currentUrl.startsWith('/promotions') },
        { label: t('ui.store.nav.my_orders', 'My Orders'), href: '/my-orders', active: currentUrl.startsWith('/my-orders') || currentUrl.startsWith('/track-orders') },
        { label: t('ui.store.nav.my_subscriptions', 'My Subscriptions'), href: '/my-subscriptions', active: currentUrl.startsWith('/my-subscriptions') },
        { label: t('ui.store.nav.profile', 'Profile'), href: '/profile', active: currentUrl.startsWith('/profile') },
      ]
    : isBackoffice
      ? [
          { label: t('ui.store.nav.store_home', 'Store Home'), href: '/', active: currentUrl === '/' },
          { label: t('ui.store.nav.products', 'Products'), href: '/products', active: currentUrl.startsWith('/products') },
          { label: t('ui.store.nav.packs', 'Packs'), href: '/packs', active: currentUrl.startsWith('/packs') },
          { label: t('ui.store.nav.promotions', 'Promotions'), href: '/promotions', active: currentUrl.startsWith('/promotions') },
          { label: t('ui.store.nav.dashboard', 'Dashboard'), href: '/dashboard', active: currentUrl.startsWith('/dashboard') },
        ]
      : [
          { label: t('ui.store.nav.home', 'Home'), href: '/', active: currentUrl === '/' },
          { label: t('ui.store.nav.products', 'Products'), href: '/#products', active: currentUrl === '/' },
          { label: t('ui.store.nav.packs', 'Packs'), href: '/packs', active: currentUrl.startsWith('/packs') },
          { label: t('ui.store.nav.promotions', 'Promotions'), href: '/promotions', active: currentUrl.startsWith('/promotions') },
          { label: t('ui.store.nav.sign_up', 'Sign up'), href: '/register', active: currentUrl.startsWith('/register') },
        ];

  useEffect(() => {
    const message = flash?.error || '';

    setVisibleFlash(message ? { message } : null);
  }, [flash?.error]);

  const closeFlashModal = () => {
    setVisibleFlash(null);
    router.reload({
      preserveScroll: true,
      preserveState: false,
    });
  };

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#f6f1e8] text-[var(--color-sys-text-primary)]">
      <NotificationRealtimeBridge />
      <PushNotificationBridge />

      <header className="fixed inset-x-0 top-0 z-[80] border-b border-[var(--color-sys-border)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[92rem] items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:grid lg:grid-cols-[auto_1fr_auto] lg:gap-6 lg:py-6">
          <Link href={brandHref} className="flex min-w-0 items-center gap-3 self-center">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[var(--color-brand-dark)] shadow-sm">
              <img src="/images/amani_brew_mark.png" alt="Amani Brew logo" className="h-9 w-9 object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-[1.05rem] font-black tracking-[-0.02em]">AmaniBrew</p>
              <p className="mt-1 truncate text-[11px] uppercase tracking-[0.24em] text-[var(--color-sys-text-secondary)] sm:tracking-[0.28em]">{t('ui.store.brand_tagline', 'Fresh ordering')}</p>
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
                    aria-label={t('ui.store.actions.profile', 'Profile')}
                  >
                    <UserRound size={18} />
                  </Link>
                ) : (
                  <Link
                    href="/dashboard"
                    className="hidden rounded-2xl bg-[var(--color-brand-dark)] px-5 py-3 text-sm font-semibold text-white shadow-sm sm:inline-flex"
                  >
                    <UserRound size={16} className="mr-2" />
                    {t('ui.store.actions.dashboard', 'Dashboard')}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="hidden rounded-2xl border border-[#efb1b1] bg-[#fff5f5] px-5 py-3 text-sm font-semibold text-[#b42318] transition hover:bg-[#ffe9e9] lg:inline-flex"
                >
                  {t('ui.store.actions.logout', 'Logout')}
                </button>
              </>
            ) : (
              <Link href="/login" className="hidden rounded-2xl bg-[var(--color-brand-dark)] px-5 py-3 text-sm font-semibold text-white shadow-sm sm:inline-flex">
                {t('ui.store.actions.sign_in', 'Sign in')}
              </Link>
            )}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--color-sys-border)] bg-white text-[var(--color-brand-dark)] shadow-sm md:hidden"
              aria-label={t('ui.store.mobile.open_navigation_menu', 'Open navigation menu')}
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
            aria-label={t('ui.store.mobile.close_navigation_overlay', 'Close navigation overlay')}
          />
          <aside className="absolute right-0 top-0 flex h-full w-[20rem] max-w-[88vw] flex-col bg-white shadow-[0_24px_80px_rgba(44,30,22,0.22)]">
            <div className="flex items-center justify-between border-b border-[var(--color-sys-border)] px-5 py-5">
              <div>
                <p className="text-lg font-black text-[var(--color-sys-text-primary)]">{t('ui.store.mobile.navigation', 'Navigation')}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.24em] text-[var(--color-sys-text-secondary)]">Amani Brew</p>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-sys-border)] text-[var(--color-sys-text-secondary)]"
                aria-label={t('ui.store.mobile.close_navigation_menu', 'Close navigation menu')}
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
                      {isCustomer ? t('ui.store.actions.profile', 'Profile') : t('ui.store.actions.dashboard', 'Dashboard')}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setSidebarOpen(false);
                        handleLogout();
                      }}
                      className="inline-flex w-full items-center justify-center rounded-2xl border border-[#efb1b1] bg-[#fff5f5] px-4 py-3 text-sm font-semibold text-[#b42318]"
                    >
                      {t('ui.store.actions.logout', 'Logout')}
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setSidebarOpen(false)}
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-[var(--color-brand-dark)] px-4 py-3 text-sm font-semibold text-white"
                  >
                    {t('ui.store.actions.sign_in', 'Sign in')}
                  </Link>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {showLiveCart && <CustomerCartPanel />}

      {showFlashAlert && visibleFlash && (
        <StoreFlashModal
          message={visibleFlash.message}
          onClose={closeFlashModal}
        />
      )}

      <main className="mx-auto flex-1 w-full max-w-[92rem] px-4 pb-8 pt-28 sm:px-6 sm:pb-8 sm:pt-32">
        {(title || subtitle) && (
          <section className="mb-8 rounded-[2rem] bg-white p-6 text-center shadow-sm ring-1 ring-[var(--color-sys-border)] sm:p-8 sm:text-left">
            {title && <h1 className="text-3xl font-black tracking-tight">{title}</h1>}
            {subtitle && <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--color-sys-text-secondary)] sm:mx-0">{subtitle}</p>}
            <div className="mt-5 flex flex-wrap justify-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-sys-text-secondary)] sm:justify-start">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#f3ede3] px-4 py-2"><MapPin size={14} /> {t('ui.store.hero.delivery_pickup_ready', 'Delivery and pickup ready')}</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#f3ede3] px-4 py-2"><Tag size={14} /> {t('ui.store.hero.fast_ordering', 'Built for fast ordering')}</span>
            </div>
          </section>
        )}
        {children}
      </main>

      {isCustomer && <CustomerFooter />}
    </div>
  );
}




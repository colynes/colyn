import React, { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import StoreLayout from '@/components/StoreLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import { logoutCurrentBrowser } from '@/lib/logout';

const money = (value) => new Intl.NumberFormat('en-TZ', {
  style: 'currency',
  currency: 'TZS',
  maximumFractionDigits: 0,
}).format(value || 0);

function SignInCheckoutModal({ open, onClose, hasActiveSession }) {
  if (!open) {
    return null;
  }

  const handleSignInClick = () => {
    if (hasActiveSession) {
      logoutCurrentBrowser({
        onFinish: () => {
          window.location.href = '/login';
        },
      });
      return;
    }

    window.location.href = '/login';
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#1a1a1a]/65 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[2rem] bg-white shadow-[0_35px_90px_rgba(36,24,22,0.3)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#eadfd4] px-6 py-5 sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7a1f28]">Sign In Required</p>
            <h2 className="mt-2 text-2xl font-black text-[#241816]">Sign in to complete your order</h2>
            <p className="mt-2 text-sm leading-7 text-[#6f5d57]">
              In order to complete the order, please sign in first. After signing in, you can continue with checkout and finish your order.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#eadfd4] p-2 text-[#6f5d57] transition hover:text-[#241816]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-6 sm:px-8">
          <button
            type="button"
            onClick={handleSignInClick}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-[var(--color-brand-dark)] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#2c1d14]"
          >
            Sign in
          </button>

          <button
            type="button"
            onClick={onClose}
            className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-[#eadfd4] px-5 py-3 text-sm font-semibold text-[#241816] transition hover:bg-[#f8f3ee]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Cart({ cart }) {
  const { auth } = usePage().props;
  const items = cart?.items || [];
  const [signInPromptOpen, setSignInPromptOpen] = useState(false);
  const isSignedInCustomer = auth?.user?.role_key === 'customer';

  const updateQuantity = (lineId, quantity) => {
    if (quantity <= 0) {
      router.delete(`/cart/items/${lineId}`, { preserveScroll: true });
      return;
    }

    router.patch(`/cart/items/${lineId}`, { quantity }, { preserveScroll: true });
  };

  return (
    <StoreLayout
      title="Your Cart"
      subtitle="Review quantities, keep the basket flexible, and move straight into the richer checkout flow when you're ready."
      showLiveCart={false}
    >
      <SignInCheckoutModal
        open={signInPromptOpen}
        onClose={() => setSignInPromptOpen(false)}
        hasActiveSession={Boolean(auth?.user)}
      />

      <div className="grid gap-8 lg:grid-cols-[1.4fr,0.7fr]">
        <section className="space-y-4">
          {items.length > 0 ? items.map((item) => (
            <Card key={item.line_id} className="rounded-[1.75rem] border-none shadow-sm">
              <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--color-sys-text-secondary)]">{item.category} • {item.unit}</p>
                  <h2 className="mt-2 text-2xl font-black">{item.name}</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--color-sys-text-secondary)]">{item.description}</p>
                  <p className="mt-3 text-sm font-semibold text-[var(--color-brand-dark)]">{money(item.price)} each</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center rounded-2xl border border-[var(--color-sys-border)] bg-[#f7f1e8] p-1">
                    <button onClick={() => updateQuantity(item.line_id, item.quantity - 1)} className="rounded-xl p-3 text-[var(--color-brand-dark)]">
                      <Minus size={16} />
                    </button>
                    <span className="min-w-12 text-center text-sm font-bold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.line_id, item.quantity + 1)} className="rounded-xl p-3 text-[var(--color-brand-dark)]">
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-sys-text-secondary)]">Line total</p>
                    <p className="mt-1 text-xl font-black">{money(item.subtotal)}</p>
                  </div>
                  <button onClick={() => router.delete(`/cart/items/${item.line_id}`, { preserveScroll: true })} className="rounded-2xl border border-red-200 p-3 text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              </CardContent>
            </Card>
          )) : (
            <Card className="rounded-[1.75rem] border-none shadow-sm">
              <CardContent className="p-10 text-center">
                <h2 className="text-2xl font-black">Your cart is empty</h2>
                <p className="mt-3 text-sm text-[var(--color-sys-text-secondary)]">Add items first, then come back here to review the order before checkout.</p>
                <Link href="/products" className="mt-6 inline-flex rounded-2xl bg-[var(--color-brand-dark)] px-5 py-3 text-sm font-semibold text-white">
                  Browse items
                </Link>
              </CardContent>
            </Card>
          )}
        </section>

        <aside className="space-y-6 lg:pt-2">
          <section className="space-y-4 text-[var(--color-brand-dark)]">
            <h2 className="text-xl font-black">Order Summary</h2>
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-sys-text-secondary)]">Line items</span>
                <span className="font-bold">{cart?.line_count || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-sys-text-secondary)]">Units in cart</span>
                <span className="font-bold">{cart?.count || 0}</span>
              </div>
              <div className="border-t border-[var(--color-sys-border)] pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-sys-text-secondary)]">Subtotal</span>
                  <span className="text-2xl font-black">{money(cart?.subtotal || 0)}</span>
                </div>
              </div>
            </div>
          </section>

          <div className="space-y-3">
            <Link
              href="/products"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-[var(--color-brand-dark)] px-4 py-3 text-sm font-semibold text-[var(--color-brand-dark)] transition hover:bg-[var(--color-brand-dark)] hover:text-white"
            >
              Add more items
            </Link>
            {isSignedInCustomer ? (
              <Link
                href="/checkout"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-[var(--color-brand-dark)] px-5 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#2c1d14]"
              >
                Continue to checkout
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setSignInPromptOpen(true)}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-[var(--color-brand-dark)] px-5 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#2c1d14]"
              >
                Continue to checkout
              </button>
            )}
          </div>
        </aside>
      </div>
    </StoreLayout>
  );
}

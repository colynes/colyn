import React, { useMemo, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { ShoppingCart, X } from 'lucide-react';
import PackCard from '@/components/customer/PackCard';
import { useI18n } from '@/lib/i18n';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function PackDetailModal({ pack, onClose, onAddToCart }) {
  const { t } = useI18n();
  const joinedProducts = useMemo(
    () => (pack?.items?.length
      ? pack.items.map((item) => item.product_name).filter(Boolean).join(' + ')
      : ''),
    [pack],
  );

  if (!pack) {
    return null;
  }

  const isAvailable = Boolean(pack.is_available);

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-[#1a1a1a]/60 p-4 backdrop-blur-sm">
      <div className="my-auto w-full max-w-3xl rounded-[2rem] bg-white shadow-[0_30px_80px_rgba(44,30,22,0.22)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-sys-border)] px-6 py-5 sm:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-sys-text-secondary)]">{t('frontend.packs_section.pack_label', 'Amani Brew Pack')}</p>
            <h3 className="mt-2 text-3xl font-black text-[var(--color-sys-text-primary)]">{pack.name}</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--color-sys-text-secondary)]">{pack.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--color-sys-border)] p-2 text-[var(--color-sys-text-secondary)] transition hover:text-[var(--color-sys-text-primary)]"
            aria-label={t('frontend.packs_section.close', 'Close pack details')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <div className="rounded-[1.5rem] bg-[#f6f1e8] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-sys-text-secondary)]">{t('frontend.packs_section.products_in_pack', 'Products In This Pack')}</p>
              <p className="mt-3 text-lg font-black leading-8 text-[var(--color-brand-dark)]">
                {joinedProducts || t('frontend.packs_section.empty_products', 'Pack products will appear here once assigned.')}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-[var(--color-sys-border)] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-sys-text-secondary)]">{t('frontend.packs_section.pack_includes', 'Pack Includes')}</p>
              <div className="mt-4 space-y-3">
                {pack.items?.length > 0 ? pack.items.map((item, index) => (
                  <div key={`${item.product_name}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl bg-[#f9f5ef] px-4 py-3">
                    <span className="font-semibold text-[var(--color-sys-text-primary)]">{item.product_name}</span>
                    <span className="text-sm font-bold text-[var(--color-brand-dark)]">{item.quantity} {item.unit || t('frontend.common.item', 'item')}</span>
                  </div>
                )) : (
                  <p className="text-sm text-[var(--color-sys-text-secondary)]">{t('frontend.packs_section.empty_assigned', 'No products have been assigned to this pack yet.')}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[1.5rem] bg-[#efe5d7] p-5 text-[var(--color-brand-dark)]">
              <p className="text-xs font-bold uppercase tracking-[0.2em]">{t('frontend.common.price', 'Price')}</p>
              <p className="mt-2 text-3xl font-black">{formatCurrency(pack.price)}</p>
            </div>

            <div className={`rounded-[1.5rem] border p-5 ${
              isAvailable ? 'border-emerald-100 bg-[#edf7ef] text-[#21643b]' : 'border-red-100 bg-red-50 text-red-600'
            }`}>
              <p className="text-xs font-bold uppercase tracking-[0.2em]">
                {pack.availability_label || (isAvailable ? t('frontend.common.status.available', 'Available') : t('frontend.common.status.out_of_stock', 'Out of Stock'))}
              </p>
              {!isAvailable && pack.availability_message ? (
                <p className="mt-3 text-sm leading-7">
                  {pack.availability_message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/cart"
                className="inline-flex items-center justify-center rounded-2xl border border-[var(--color-sys-border)] px-4 py-3 text-sm font-semibold text-[var(--color-sys-text-primary)]"
              >
                {t('frontend.common.view_cart', 'View Cart')}
              </Link>
              <button
                type="button"
                onClick={() => onAddToCart?.(pack.id)}
                disabled={!isAvailable}
                className="inline-flex items-center justify-center rounded-2xl bg-[var(--color-brand-dark)] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#c8b1ab]"
              >
                <ShoppingCart size={16} className="mr-2" />
                {isAvailable ? t('frontend.common.add_to_cart', 'Add To Cart') : t('frontend.common.status.out_of_stock', 'Out Of Stock')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PacksSection({ packs = [] }) {
  const { t } = useI18n();
  const [activePack, setActivePack] = useState(null);

  const addPackToCart = (packId, options = {}) => {
    router.post('/cart/items', { item_type: 'pack', item_id: packId, quantity: 1 }, { preserveScroll: true });

    if (options.closeOnComplete) {
      setActivePack(null);
    }
  };

  return (
    <section id="packs" className="space-y-5">
      <PackDetailModal
        pack={activePack}
        onClose={() => setActivePack(null)}
        onAddToCart={(packId) => addPackToCart(packId, { closeOnComplete: true })}
      />

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7a1f28]">{t('frontend.packs_section.eyebrow', 'Packs')}</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-sys-text-primary)]">{t('frontend.packs_section.title', 'Text-first bundles for faster ordering')}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-sys-text-secondary)]">
          {t('frontend.packs_section.description', 'Amani Brew packs are presented without images so customers can focus on the offer details, the value, and the price in TZS.')}
        </p>
      </div>
      {packs.length > 0 ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {packs.map((pack) => (
            <PackCard
              key={pack.id}
              pack={pack}
              onView={setActivePack}
              onAddToCart={addPackToCart}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[1.9rem] border border-dashed border-[var(--color-sys-border)] bg-white p-8 text-sm text-[var(--color-sys-text-secondary)]">
          {t('frontend.packs_section.empty', 'No packs are available at the moment.')}
        </div>
      )}
    </section>
  );
}

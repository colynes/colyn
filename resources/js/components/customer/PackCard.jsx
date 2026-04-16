import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function PackCard({ pack, onView, onAddToCart }) {
  const { t } = useI18n();
  const joinedProducts = pack.items?.length
    ? pack.items.map((item) => item.product_name).filter(Boolean).join(' + ')
    : '';
  const isAvailable = Boolean(pack.is_available);

  return (
    <article className="relative rounded-[1.9rem] border border-[var(--color-sys-border)] bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-sys-text-secondary)]">{t('frontend.packs_section.pack_label', 'Amani Brew Pack')}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h3 className="text-2xl font-black text-[var(--color-sys-text-primary)]">{pack.name}</h3>
            {pack.is_new ? (
              <span className="inline-flex rounded-full bg-[#b42318] px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-white">
                {t('frontend.common.new', 'New')}
              </span>
            ) : null}
          </div>
        </div>
        <div className="rounded-2xl bg-[#efe5d7] px-4 py-3 text-right">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-sys-text-secondary)]">{t('frontend.common.price', 'Price')}</p>
          <p className="mt-1 text-xl font-black text-[var(--color-brand-dark)]">{formatCurrency(pack.price)}</p>
        </div>
      </div>
      {joinedProducts ? (
        <p className="mt-4 text-sm font-semibold leading-7 text-[var(--color-brand-dark)]">
          {joinedProducts}
        </p>
      ) : null}
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${
          isAvailable ? 'bg-[#edf7ef] text-[#21643b]' : 'bg-red-50 text-red-600'
        }`}>
          {pack.availability_label || (isAvailable ? t('frontend.common.status.available', 'Available') : t('frontend.common.status.out_of_stock', 'Out of Stock'))}
        </span>
      </div>
      {!isAvailable && pack.availability_message ? (
        <p className="mt-3 text-sm leading-7 text-red-600">
          {pack.availability_message}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onView?.(pack)}
          className="inline-flex items-center justify-center rounded-2xl border border-[var(--color-sys-border)] px-4 py-3 text-sm font-semibold text-[var(--color-sys-text-primary)]"
        >
          {t('frontend.common.view_pack', 'View Pack')}
        </button>
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
    </article>
  );
}

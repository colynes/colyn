import React from 'react';
import { router } from '@inertiajs/react';
import { Plus } from 'lucide-react';

export default function PromotionCard({ promotion }) {
  const addPromotionToCart = () => {
    if (promotion.is_closed) {
      return;
    }

    router.post('/cart/items', { item_type: 'promotion', item_id: promotion.id, quantity: 1 }, { preserveScroll: true });
  };

  return (
    <article className={`relative overflow-hidden rounded-[2rem] px-6 py-6 text-white shadow-[0_20px_50px_rgba(59,36,29,0.16)] ${
      promotion.is_closed
        ? 'bg-[linear-gradient(135deg,#6e625b_0%,#4a3d37_100%)]'
        : 'bg-[linear-gradient(135deg,#772328_0%,#542b22_100%)]'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <span className={`rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] ${
          promotion.is_closed ? 'bg-white/10 text-[#f5e8dd]' : 'bg-white/10 text-[#ffe1d2]'
        }`}>
          {promotion.is_closed ? (promotion.status_label || 'Promotion Closed') : (promotion.discount_label || 'Special offer')}
        </span>
        {promotion.ends_at && (
          <span className="pt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#f3d9cf]">
            {promotion.is_closed ? `Closed ${promotion.ends_at}` : `Until ${promotion.ends_at}`}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={addPromotionToCart}
        disabled={promotion.is_closed}
        aria-label={`Add ${promotion.title} to cart`}
        className="absolute right-6 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#5b2b23] shadow-[0_10px_25px_rgba(17,12,10,0.18)] transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:bg-white/60 disabled:text-[#8e7b73]"
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>

      <div className="mt-6 max-w-[78%] pr-2">
        <h3 className="text-[1.8rem] font-black leading-tight tracking-[-0.03em]">{promotion.title}</h3>
        <p className="mt-4 text-[15px] leading-7 text-[#fde8df]">
          {promotion.description}
        </p>
      </div>

      <div className="mt-7 flex items-end justify-between gap-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#f1d8cf]">
          {promotion.is_closed
            ? 'Promotion closed for customers'
            : promotion.starts_at
              ? `Started ${promotion.starts_at}`
              : 'Active now'}
        </p>
      </div>
    </article>
  );
}

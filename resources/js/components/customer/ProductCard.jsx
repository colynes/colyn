import React from 'react';
import { router } from '@inertiajs/react';
import { ShoppingCart } from 'lucide-react';
import Button from '@/components/ui/Button';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function ProductCard({ product }) {
  const addToCart = () => {
    router.post('/cart/items', { product_id: product.id, quantity: 1 }, { preserveScroll: true });
  };

  return (
    <article className="flex h-full flex-col rounded-[1.6rem] border border-[#e8d8c8] bg-[#f7f0e8] p-5 shadow-[0_10px_24px_rgba(89,58,40,0.08)] transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(89,58,40,0.12)]">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9d8175]">
          {product.category || product.sku || 'Product'}
        </p>

        <h3 className="mt-4 text-[1.2rem] font-black leading-[1.02] tracking-[-0.03em] text-[#241816] sm:text-[1.3rem]">
          {product.name}
        </h3>

        <p className="mt-4 min-h-[4.75rem] text-[14px] leading-7 text-[#7a6660]">
          {product.description || 'Fresh stock ready for your next order.'}
        </p>
      </div>

      <div className="mt-auto">
        <div className="mt-6 flex items-center justify-between gap-3">
          <span className={`inline-flex min-h-[3.25rem] items-center rounded-full px-4 py-1 text-[13px] font-bold ${
            product.status === 'In Stock'
              ? 'bg-[#e8f8ef] text-[#175d35]'
              : product.status === 'Low Stock'
                ? 'bg-[#fff1d6] text-[#9a5b00]'
                : 'bg-[#fff0f0] text-[#df1d1d]'
          }`}>
            {product.status}
          </span>

          <p className="text-right text-[1.2rem] font-black leading-tight text-[#7a1f28] sm:text-[1.35rem]">
            {formatCurrency(product.price)}
          </p>
        </div>

        <p className="mt-5 text-[10px] uppercase tracking-[0.22em] text-[#9d8175]">
          Unit: {product.unit || 'item'}
        </p>

        <Button
          onClick={addToCart}
          disabled={product.status === 'Out of Stock'}
          className="mt-5 inline-flex w-full items-center justify-center rounded-[0.9rem] bg-[#563b2a] px-4 py-3 text-[14px] font-bold text-white hover:bg-[#472f22] disabled:bg-[#d8c9c2] disabled:text-[#f6f0eb]"
        >
          <ShoppingCart size={16} className="mr-2" />
          Add To Cart
        </Button>
      </div>
    </article>
  );
}

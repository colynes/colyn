import React from 'react';
import { Link } from '@inertiajs/react';
import ProductCard from '@/components/customer/ProductCard';
import { useI18n } from '@/lib/i18n';

export default function ProductsSection({ products = [] }) {
  const { t } = useI18n();

  return (
    <section id="products" className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7a1f28]">{t('frontend.products_section.eyebrow', 'Products')}</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-sys-text-primary)]">{t('frontend.products_section.title', 'Browse fresh products')}</h2>
        </div>
        <Link
          href="/products"
          className="inline-flex items-center justify-center rounded-full border border-[#d9cabd] bg-white px-5 py-3 text-sm font-bold text-[#563b2a] transition hover:border-[#c5b19e] hover:bg-[#f7f0e8]"
        >
          {t('frontend.products_section.view_all', 'Browse full catalog')}
        </Link>
      </div>
      {products.length > 0 ? (
        <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="rounded-[1.9rem] border border-dashed border-[var(--color-sys-border)] bg-white p-8 text-sm text-[var(--color-sys-text-secondary)]">
          {t('frontend.products_section.empty', 'No products are visible right now.')}
        </div>
      )}
    </section>
  );
}

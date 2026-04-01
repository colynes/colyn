import React from 'react';
import ProductCard from '@/components/customer/ProductCard';

export default function ProductsSection({ products = [] }) {
  return (
    <section id="products" className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7a1f28]">Products</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-sys-text-primary)]">Browse fresh products</h2>
      </div>
      {products.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="rounded-[1.9rem] border border-dashed border-[var(--color-sys-border)] bg-white p-8 text-sm text-[var(--color-sys-text-secondary)]">
          No products are visible right now.
        </div>
      )}
    </section>
  );
}

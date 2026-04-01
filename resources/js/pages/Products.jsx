import React from 'react';
import { Link, router } from '@inertiajs/react';
import StoreLayout from '@/components/StoreLayout';
import PromotionCard from '@/components/customer/PromotionCard';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Search, ShoppingCart } from 'lucide-react';

const money = (value) => new Intl.NumberFormat('en-TZ', {
  style: 'currency',
  currency: 'TZS',
  maximumFractionDigits: 0,
}).format(value || 0);

export default function Products({ categories = [], products, filters = {}, activeCategory, featuredPromotions = [], packs = [] }) {
  const rows = products?.data || [];
  const visibleSection = filters.section || null;
  const showPromotions = !visibleSection || visibleSection === 'promotions';
  const showPacks = !visibleSection || visibleSection === 'packs';
  const showProducts = !visibleSection || visibleSection === 'products';
  const productCartButtonClass = 'bg-[#922330] text-white transition hover:bg-[#7d1e29]';
  const packCartButtonClass = 'bg-[#7a1f28] text-white transition hover:bg-[#651820]';

  const submitSearch = (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    router.get('/products', {
      search: data.get('search') || undefined,
      category: data.get('category') || undefined,
    }, { preserveState: true, replace: true });
  };

  const addToCart = (itemType, itemId) => {
    router.post('/cart/items', { item_type: itemType, item_id: itemId, quantity: 1 }, { preserveScroll: true });
  };

  return (
    <StoreLayout
      title={activeCategory ? `${activeCategory.name} Collection` : 'Browse Fresh Products'}
      subtitle="Discover premium cuts, everyday essentials, and fast-order bundles styled for the richer shopping flow from the new design."
    >
      <div className="space-y-6">
        <aside>
          <Card className="rounded-[1.75rem] border-none shadow-sm">
            <CardContent className="p-6">
              <h2 className="text-lg font-bold">Browse Filters</h2>
              <form onSubmit={submitSearch} className="mt-5 space-y-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-sys-text-secondary)]" />
                  <Input name="search" defaultValue={filters.search || ''} placeholder="Search products" className="pl-10 h-11 rounded-xl" />
                </div>
                <select name="category" defaultValue={filters.category || ''} className="h-11 w-full rounded-xl border border-[var(--color-sys-border)] bg-white px-4 text-sm outline-none">
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.slug}>{category.name}</option>
                  ))}
                </select>
                <input type="hidden" name="section" value={filters.section || ''} />
                <Button type="submit" className="w-full rounded-xl py-3 font-semibold">Apply Filters</Button>
              </form>
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-6">
          {showPromotions && featuredPromotions.length > 0 && (
            <section id="promotions" className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9b867f]">Promotions</p>
                  <h2 className="mt-1 text-2xl font-black text-[#241816]">Current offers for customers</h2>
                </div>
                {visibleSection !== 'promotions' && (
                  <Link href="/products?section=promotions" className="text-sm font-bold text-[#7a1f28]">
                    View all
                  </Link>
                )}
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
              {featuredPromotions.map((promotion) => (
                <PromotionCard
                  key={promotion.id}
                  promotion={{
                    ...promotion,
                    ends_at: promotion.expires_at || null,
                    starts_at: promotion.starts_at || null,
                    is_closed: Boolean(promotion.is_closed),
                  }}
                />
              ))}
              </div>
            </section>
          )}

          {showPacks && packs.length > 0 && (
            <section id="packs" className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9b867f]">Packs</p>
                  <h2 className="mt-1 text-2xl font-black text-[#241816]">Available bundle packs</h2>
                </div>
                {visibleSection !== 'packs' && (
                  <Link href="/products?section=packs" className="text-sm font-bold text-[#7a1f28]">
                    View all
                  </Link>
                )}
              </div>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {packs.map((pack) => (
                  <article
                    key={pack.id}
                    className="overflow-hidden rounded-[1.8rem] border border-[#e9ddd1] bg-[#f4efea] text-[#241816] shadow-sm transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(59,36,29,0.1)]"
                  >
                    <div className="p-6">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9b867f]">Pack</p>
                      <h3 className="mt-3 text-2xl font-black">{pack.name}</h3>
                      <p className="mt-3 text-sm leading-7 text-[#7a6660]">{pack.description}</p>
                      <div className="mt-5 flex items-center justify-between gap-3">
                        <span className="rounded-full bg-[#edf7ef] px-3 py-1 text-xs font-bold text-[#21643b]">
                          Available
                        </span>
                        <p className="text-lg font-black text-[#7a1f28]">{money(pack.price)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addToCart('pack', pack.id)}
                        className={`mt-6 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-bold ${packCartButtonClass}`}
                      >
                        <ShoppingCart size={16} className="mr-2" />
                        Add To Cart
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {showProducts && (
          <section id="products" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9b867f]">Products</p>
                <h2 className="mt-1 text-2xl font-black text-[#241816]">
                  {activeCategory ? `${activeCategory.name} products` : 'Browse all products'}
                </h2>
              </div>
              {visibleSection !== 'products' && (
                <Link href="/products?section=products" className="text-sm font-bold text-[#7a1f28]">
                  View all
                </Link>
              )}
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {rows.map((product) => (
              <article
                key={product.id}
                className="overflow-hidden rounded-[1.8rem] border border-[#e9ddd1] bg-[#f4efea] text-[#241816] shadow-sm transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(59,36,29,0.1)]"
              >
                <div className="p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9b867f]">
                    {product.category || product.sku || 'Product'}
                  </p>
                  <h3 className="mt-3 text-2xl font-black">{product.name}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#7a6660]">
                    {product.description || 'Fresh stock ready for your next order.'}
                  </p>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                      product.status === 'In Stock'
                        ? 'bg-[#edf7ef] text-[#21643b]'
                        : product.status === 'Low Stock'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-50 text-red-600'
                    }`}>
                      {product.status}
                    </span>
                    <p className="text-lg font-black text-[#7a1f28]">{money(product.price)}</p>
                  </div>
                  <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[#9b867f]">
                    Unit: {product.unit || 'item'}
                  </p>
                  <Button
                    onClick={() => addToCart('product', product.id)}
                    disabled={product.status === 'Out of Stock'}
                    className={`mt-6 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:bg-[#c8b1ab] ${productCartButtonClass}`}
                  >
                    <ShoppingCart size={16} className="mr-2" />
                    Add To Cart
                  </Button>
                </div>
              </article>
            ))}
            </div>
          </section>
          )}

          {showProducts && rows.length === 0 && (
            <div className="rounded-[1.75rem] bg-white p-10 text-center text-[var(--color-sys-text-secondary)] shadow-sm">
              No products matched the current search.
            </div>
          )}
        </div>
      </div>
    </StoreLayout>
  );
}

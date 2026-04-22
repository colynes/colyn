import React from 'react';
import { Link, router } from '@inertiajs/react';
import StoreLayout from '@/components/StoreLayout';
import PromotionCard from '@/components/customer/PromotionCard';
import PacksSection from '@/components/customer/PacksSection';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Search, ShoppingCart } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const money = (value) => new Intl.NumberFormat('en-TZ', {
  style: 'currency',
  currency: 'TZS',
  maximumFractionDigits: 0,
}).format(value || 0);

function translateProductStatus(status, t) {
  switch (String(status || '').toLowerCase()) {
    case 'in stock':
      return t('frontend.common.status.in_stock', 'In Stock');
    case 'low stock':
      return t('frontend.common.status.low_stock', 'Low Stock');
    case 'out of stock':
      return t('frontend.common.status.out_of_stock', 'Out of Stock');
    default:
      return status;
  }
}

export default function Products({ categories = [], products, filters = {}, activeCategory, featuredPromotions = [], packs = [] }) {
  const { t, tp } = useI18n();
  const rows = Array.isArray(products) ? products : (products?.data || []);
  const hasProductFilters = Boolean((filters.search || '').trim() || (filters.category || '').trim() || activeCategory);
  const visibleSection = hasProductFilters ? 'products' : (filters.section || null);
  const showPromotions = !hasProductFilters && (!visibleSection || visibleSection === 'promotions');
  const showPacks = !hasProductFilters && (!visibleSection || visibleSection === 'packs');
  const showProducts = hasProductFilters || !visibleSection || visibleSection === 'products';
  const productCartButtonClass = 'bg-[#922330] text-white transition hover:bg-[#7d1e29]';

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
      title={activeCategory
        ? tp('frontend.products.title_category', ':category Collection', { category: activeCategory.name })
        : t('frontend.products.title_default', 'Browse Fresh Products')}
      subtitle={t('frontend.products.subtitle', 'Discover premium cuts, everyday essentials, and fast-order bundles styled for the richer shopping flow from the new design.')}
    >
      <div className="space-y-6">
        <aside>
          <Card className="rounded-[1.75rem] border-none shadow-sm">
            <CardContent className="p-6">
              <h2 className="text-lg font-bold">{t('frontend.products.browse_filters', 'Browse Filters')}</h2>
              <form onSubmit={submitSearch} className="mt-5 space-y-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-sys-text-secondary)]" />
                  <Input name="search" defaultValue={filters.search || ''} placeholder={t('frontend.common.search_products', 'Search products')} className="pl-10 h-11 rounded-xl" />
                </div>
                <select name="category" defaultValue={filters.category || ''} className="h-11 w-full rounded-xl border border-[var(--color-sys-border)] bg-white px-4 text-sm outline-none">
                  <option value="">{t('frontend.common.all_categories', 'All categories')}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.slug}>{category.name}</option>
                  ))}
                </select>
                <input type="hidden" name="section" value={filters.section || ''} />
                <Button type="submit" className="w-full rounded-xl py-3 font-semibold">{t('frontend.common.apply_filters', 'Apply Filters')}</Button>
              </form>
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-6">
          {showPromotions && featuredPromotions.length > 0 && (
            <section id="promotions" className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9b867f]">{t('frontend.products.promotions_eyebrow', 'Promotions')}</p>
                  <h2 className="mt-1 text-2xl font-black text-[#241816]">{t('frontend.products.promotions_title', 'Current offers for customers')}</h2>
                </div>
                {visibleSection !== 'promotions' && (
                  <Link href="/products?section=promotions" className="text-sm font-bold text-[#7a1f28]">
                    {t('frontend.common.view_all', 'View all')}
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
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9b867f]">{t('frontend.products.packs_eyebrow', 'Packs')}</p>
                  <h2 className="mt-1 text-2xl font-black text-[#241816]">{t('frontend.products.packs_title', 'Available bundle packs')}</h2>
                </div>
                {visibleSection !== 'packs' && (
                  <Link href="/products?section=packs" className="text-sm font-bold text-[#7a1f28]">
                    {t('frontend.common.view_all', 'View all')}
                  </Link>
                )}
              </div>
              <PacksSection packs={packs} />
            </section>
          )}

          {showProducts && (
            <section id="products" className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9b867f]">{t('frontend.products.products_eyebrow', 'Products')}</p>
                  <h2 className="mt-1 text-2xl font-black text-[#241816]">
                    {activeCategory
                      ? tp('frontend.products.products_title_category', ':category products', { category: activeCategory.name })
                      : t('frontend.products.products_title_default', 'Browse all products')}
                  </h2>
                </div>
                {visibleSection !== 'products' && (
                  <Link href="/products?section=products" className="text-sm font-bold text-[#7a1f28]">
                    {t('frontend.common.view_all', 'View all')}
                  </Link>
                )}
              </div>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {rows.map((product) => {
                  const statusLabel = translateProductStatus(product.status, t);

                  return (
                    <article
                      key={product.id}
                      className="overflow-hidden rounded-[1.8rem] border border-[#e9ddd1] bg-[#f4efea] text-[#241816] shadow-sm transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(59,36,29,0.1)]"
                    >
                      <div className="p-6">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9b867f]">
                          {product.category || product.sku || t('frontend.common.product', 'Product')}
                        </p>
                        <h3 className="mt-3 text-2xl font-black">{product.name}</h3>
                        <p className="mt-3 text-sm leading-7 text-[#7a6660]">
                          {product.description || t('frontend.products.fallback_description', 'Fresh stock ready for your next order.')}
                        </p>
                        <div className="mt-5 flex items-center justify-between gap-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                            product.status === 'In Stock'
                              ? 'bg-[#edf7ef] text-[#21643b]'
                              : product.status === 'Low Stock'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-50 text-red-600'
                          }`}>
                            {statusLabel}
                          </span>
                          <p className="text-lg font-black text-[#7a1f28]">{money(product.price)}</p>
                        </div>
                        <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[#9b867f]">
                          {tp('frontend.common.labels.unit_value', 'Unit: :unit', { unit: product.unit || t('frontend.common.item', 'item') })}
                        </p>
                        <Button
                          onClick={() => addToCart('product', product.id)}
                          disabled={product.status === 'Out of Stock'}
                          className={`mt-6 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:bg-[#c8b1ab] ${productCartButtonClass}`}
                        >
                          <ShoppingCart size={16} className="mr-2" />
                          {t('frontend.common.add_to_cart', 'Add To Cart')}
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {showProducts && rows.length === 0 && (
            <div className="rounded-[1.75rem] bg-white p-10 text-center text-[var(--color-sys-text-secondary)] shadow-sm">
              {t('frontend.products.empty', 'No products matched the current search.')}
            </div>
          )}
        </div>
      </div>
    </StoreLayout>
  );
}

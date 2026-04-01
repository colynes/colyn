import React, { useEffect, useMemo, useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/Card';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Box, Pencil, Plus, Search, Trash2, X } from 'lucide-react';

const money = (value) => `Tzs ${new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 }).format(value || 0)}`;

function PackModal({ pack, products = [], onClose }) {
  const isEditing = Boolean(pack?.id);
  const blankItem = { product_id: '', quantity: '1' };
  const form = useForm({
    name: pack?.name || '',
    comes_with: pack?.comes_with || '',
    price: pack?.price || '',
    is_active: pack?.is_active ?? true,
    items: pack?.items?.length
      ? pack.items.map((item) => ({
          product_id: String(item.product_id || ''),
          quantity: String(item.quantity || '1'),
        }))
      : [{ ...blankItem }],
  });

  useEffect(() => {
    form.setData({
      name: pack?.name || '',
      comes_with: pack?.comes_with || '',
      price: pack?.price || '',
      is_active: pack?.is_active ?? true,
      items: pack?.items?.length
        ? pack.items.map((item) => ({
            product_id: String(item.product_id || ''),
            quantity: String(item.quantity || '1'),
          }))
        : [{ ...blankItem }],
    });
  }, [pack]);

  if (!pack) {
    return null;
  }

  const submit = (event) => {
    event.preventDefault();

    const options = {
      preserveScroll: true,
      onSuccess: () => onClose(),
    };

    if (isEditing) {
      form.put(`/dashboard/packs/${pack.id}`, options);
      return;
    }

    form.post('/dashboard/packs', options);
  };

  const updateItem = (index, field, value) => {
    form.setData('items', form.data.items.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  };

  const addItemRow = () => {
    form.setData('items', [...form.data.items, { ...blankItem }]);
  };

  const removeItemRow = (index) => {
    form.setData('items', form.data.items.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-6">
      <div className="my-auto max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-[1.75rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between px-8 py-8">
          <div>
            <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-[#3a2513]">
              {isEditing ? 'Edit Pack' : 'Add New Pack'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#6d5036] transition hover:bg-[#f3ede5]"
            aria-label="Close pack modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 px-8 pb-8">
          <div>
            <label className="mb-2 block text-[1rem] font-semibold text-[#3a2513]">Pack Name</label>
            <input
              type="text"
              value={form.data.name}
              onChange={(e) => form.setData('name', e.target.value)}
              placeholder="e.g., Family Pack"
              className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none transition placeholder:text-[#b09983] focus:border-[#b69066]"
            />
            {form.errors.name ? <p className="mt-2 text-xs text-red-500">{form.errors.name}</p> : null}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <label className="block text-[1rem] font-semibold text-[#3a2513]">Add Product</label>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-2 rounded-xl border border-[#d9c4a9] bg-white px-4 py-2 text-sm font-semibold text-[#4f3118]"
              >
                <Plus className="h-4 w-4" />
                Add Another
              </button>
            </div>

            <div className="space-y-3">
              {form.data.items.map((item, index) => (
                <div key={`pack-item-${index}`} className="grid gap-3 rounded-xl border border-[#eadbca] bg-[#fbf7f2] p-4 md:grid-cols-[minmax(0,1fr)_140px_56px]">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#5b3b20]">Product</label>
                    <select
                      value={item.product_id}
                      onChange={(event) => updateItem(index, 'product_id', event.target.value)}
                      className="h-12 w-full rounded-xl border border-[#dcccba] bg-white px-4 text-sm text-[#3a2513] outline-none"
                    >
                      <option value="">Select product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>{product.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#5b3b20]">Quantity</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantity}
                      onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                      className="h-12 w-full rounded-xl border border-[#dcccba] bg-white px-4 text-sm text-[#3a2513] outline-none"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeItemRow(index)}
                      disabled={form.data.items.length === 1}
                      className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#e6d3c3] bg-white text-[#8a6342] disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Remove product row"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {form.errors.items ? <p className="text-xs text-red-500">{form.errors.items}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-[1rem] font-semibold text-[#3a2513]">Comes With</label>
            <textarea
              value={form.data.comes_with}
              onChange={(e) => form.setData('comes_with', e.target.value)}
              placeholder="Enter what comes with this pack"
              rows="4"
              className="w-full rounded-xl border border-[#dcccba] bg-white px-5 py-4 text-[1rem] text-[#3a2513] outline-none transition placeholder:text-[#b09983] focus:border-[#b69066]"
            />
            {form.errors.comes_with ? <p className="mt-2 text-xs text-red-500">{form.errors.comes_with}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-[1rem] font-semibold text-[#3a2513]">Price (TZS)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.data.price}
              onChange={(e) => form.setData('price', e.target.value)}
              placeholder="Enter pack price"
              className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none transition placeholder:text-[#b09983] focus:border-[#b69066]"
            />
            {form.errors.price ? <p className="mt-2 text-xs text-red-500">{form.errors.price}</p> : null}
          </div>

          <label className="flex items-center gap-3 rounded-xl bg-[#f4eee5] px-4 py-3 text-sm font-medium text-[#4f3118]">
            <input type="checkbox" checked={form.data.is_active} onChange={(e) => form.setData('is_active', e.target.checked)} />
            Show this pack to customers
          </label>

          <div className="grid gap-3 pt-1 md:grid-cols-2">
            <button
              type="button"
              onClick={onClose}
              className="h-14 rounded-xl border border-[#d9c4a9] bg-white text-[1rem] font-semibold text-[#4f3118]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={form.processing}
              className="h-14 rounded-xl bg-[#4f3118] text-[1rem] font-semibold text-white transition hover:bg-[#402612]"
            >
              {form.processing ? 'Saving...' : isEditing ? 'Save Pack' : 'Add Pack'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PacksAdmin({ auth, packs, filters = {}, products = [], packFeatureReady = true }) {
  const rows = packs?.data || [];
  const [activePack, setActivePack] = useState(null);
  const [deletingPack, setDeletingPack] = useState(null);

  const hasFilters = useMemo(
    () => Boolean((filters.search || '').trim()),
    [filters.search],
  );

  const deletePack = (pack) => {
    router.delete(`/dashboard/packs/${pack.id}`, {
      preserveScroll: true,
    });
  };

  return (
    <AppLayout user={auth?.user}>
      {packFeatureReady ? <PackModal pack={activePack} products={products} onClose={() => setActivePack(null)} /> : null}
      <ConfirmModal
        isOpen={Boolean(deletingPack)}
        onClose={() => setDeletingPack(null)}
        onConfirm={() => deletingPack ? deletePack(deletingPack) : null}
        title="Delete Pack"
        message={deletingPack ? `You are deleting the pack "${deletingPack.name}". This action cannot be undone.` : ''}
        confirmText="Delete"
        type="danger"
      />

      <div className="space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[2.45rem] font-semibold tracking-[-0.04em] text-[#3a2513]">Packs</h1>
            <p className="mt-2 text-[0.95rem] text-[#73563a]">Create and publish packs with included products, quantities, and customer-facing notes</p>
          </div>

          <button
            type="button"
            onClick={() => packFeatureReady ? setActivePack({}) : null}
            disabled={!packFeatureReady}
            className="inline-flex items-center gap-3 self-start rounded-[1.05rem] bg-[#4f3118] px-6 py-3.5 text-[1.05rem] font-semibold text-white transition hover:bg-[#402612] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-5 w-5" strokeWidth={2.25} />
            Add Pack
          </button>
        </div>

        {!packFeatureReady ? (
          <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            Run <span className="font-semibold">php artisan migrate</span> to enable the new pack items and comes-with fields.
          </div>
        ) : null}

        <form method="get" action="/dashboard/packs" className="flex items-center gap-4">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#866748]" strokeWidth={2} />
            <input
              type="text"
              name="search"
              defaultValue={filters.search || ''}
              placeholder="Search packs..."
              className="h-14 w-full rounded-[1.05rem] border border-[#dcccba] bg-white pl-14 pr-4 text-[1rem] text-[#3a2513] outline-none transition placeholder:text-[#b09983] focus:border-[#b69066]"
            />
          </div>
        </form>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {rows.length > 0 ? rows.map((pack) => (
            <Card key={pack.id} className="rounded-[1.45rem] border border-[#e0d1bf] bg-white shadow-none">
              <CardContent className="p-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="icon-surface-sm bg-[#efebe6] text-[#4f3118]">
                    <Box className="h-7 w-7" />
                  </div>

                  <div className="flex items-center gap-4 text-[#4f3118]">
                    <button
                      type="button"
                      onClick={() => setActivePack(pack)}
                      className="transition hover:text-[#2f1c0d]"
                      aria-label={`Edit ${pack.name}`}
                    >
                      <Pencil className="h-5 w-5" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingPack(pack)}
                      className="transition hover:text-red-600"
                      aria-label={`Delete ${pack.name}`}
                    >
                      <Trash2 className="h-5 w-5 text-red-500" strokeWidth={2} />
                    </button>
                  </div>
                </div>

                <div className="mt-7">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-[1.25rem] font-semibold text-[#352314]">{pack.name}</h2>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${pack.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {pack.is_active ? 'Published' : 'Hidden'}
                    </span>
                  </div>
                  <div className="mt-3 min-h-[4.5rem] space-y-2 text-[0.95rem] text-[#5f4328]">
                    <p>{pack.comes_with || 'No "comes with" text added yet.'}</p>
                    {pack.items?.length > 0 ? (
                      <p className="text-sm text-[#7b5d3d]">
                        {pack.items.map((item) => `${item.quantity} x ${item.product_name}`).join(', ')}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-8 flex items-end justify-between gap-4">
                  <p className="text-[1.15rem] font-semibold text-[#4f3118]">{money(pack.price)}</p>
                  <p className="text-[0.95rem] text-[#7b5d3d]">Added: {pack.created_at || 'N/A'}</p>
                </div>
              </CardContent>
            </Card>
          )) : (
            <Card className="rounded-[1.45rem] border border-[#e0d1bf] bg-white shadow-none md:col-span-2 xl:col-span-3">
              <CardContent className="px-8 py-16 text-center">
                <p className="text-lg font-medium text-[#4d3218]">No packs found.</p>
                <p className="mt-2 text-sm text-[#7a5c3e]">Create a pack and publish it for customers to see.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {hasFilters ? (
          <div className="flex justify-end">
            <Link href="/dashboard/packs" className="text-sm font-semibold text-[#4f3118]">
              Clear filters
            </Link>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}

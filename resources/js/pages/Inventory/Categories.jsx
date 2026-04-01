import React, { useEffect, useMemo, useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/Card';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Pencil, Plus, Search, Tag, Trash2, X } from 'lucide-react';

function CategoryModal({ category, onClose }) {
  const isEditing = Boolean(category?.id);
  const form = useForm({
    name: category?.name || '',
    description: category?.description || '',
    is_active: category?.is_active ?? true,
  });

  useEffect(() => {
    form.setData({
      name: category?.name || '',
      description: category?.description || '',
      is_active: category?.is_active ?? true,
    });
  }, [category]);

  if (!category) {
    return null;
  }

  const submit = (event) => {
    event.preventDefault();

    const options = {
      preserveScroll: true,
      onSuccess: () => onClose(),
    };

    if (isEditing) {
      form.put(`/inventory/categories/${category.id}`, options);
      return;
    }

    form.post('/inventory/categories', options);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-6">
      <div className="my-auto max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-[1.75rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between px-8 py-8">
          <div>
            <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-[#3a2513]">
              {isEditing ? 'Edit Category' : 'Add New Category'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#6d5036] transition hover:bg-[#f3ede5]"
            aria-label="Close category modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 px-8 pb-8">
          <div>
            <label className="mb-2 block text-[1rem] font-semibold text-[#3a2513]">Category Name</label>
            <input
              type="text"
              value={form.data.name}
              onChange={(e) => form.setData('name', e.target.value)}
              placeholder="e.g., Beef, Chicken, Eggs"
              className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none transition placeholder:text-[#b09983] focus:border-[#b69066]"
            />
            {form.errors.name ? <p className="mt-2 text-xs text-red-500">{form.errors.name}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-[1rem] font-semibold text-[#3a2513]">Description</label>
            <textarea
              value={form.data.description}
              onChange={(e) => form.setData('description', e.target.value)}
              placeholder="Enter category description"
              rows="5"
              className="w-full rounded-xl border border-[#dcccba] bg-white px-5 py-4 text-[1rem] text-[#3a2513] outline-none transition placeholder:text-[#b09983] focus:border-[#b69066]"
            />
            {form.errors.description ? <p className="mt-2 text-xs text-red-500">{form.errors.description}</p> : null}
          </div>

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
              {form.processing ? 'Saving...' : isEditing ? 'Save Category' : 'Add Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Categories({ auth, categories, filters = {} }) {
  const rows = categories?.data || [];
  const [activeCategory, setActiveCategory] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);

  const hasFilters = useMemo(
    () => Boolean((filters.search || '').trim()),
    [filters.search],
  );

  const deleteCategory = (category) => {
    router.delete(`/inventory/categories/${category.id}`, {
      preserveScroll: true,
    });
  };

  return (
    <AppLayout user={auth?.user}>
      <CategoryModal category={activeCategory} onClose={() => setActiveCategory(null)} />
      <ConfirmModal
        isOpen={Boolean(deletingCategory)}
        onClose={() => setDeletingCategory(null)}
        onConfirm={() => deletingCategory ? deleteCategory(deletingCategory) : null}
        title="Delete Category"
        message={deletingCategory ? `You are deleting the category "${deletingCategory.name}". This action cannot be undone.` : ''}
        confirmText="Delete"
        type="danger"
      />

      <div className="space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[2.45rem] font-semibold tracking-[-0.04em] text-[#3a2513]">Product Categories</h1>
            <p className="mt-2 text-[0.95rem] text-[#73563a]">Manage product categories</p>
          </div>

          <button
            type="button"
            onClick={() => setActiveCategory({})}
            className="inline-flex items-center gap-3 self-start rounded-[1.05rem] bg-[#4f3118] px-6 py-3.5 text-[1.05rem] font-semibold text-white transition hover:bg-[#402612]"
          >
            <Plus className="h-5 w-5" strokeWidth={2.25} />
            Add Category
          </button>
        </div>

        <form method="get" action="/inventory/categories" className="flex items-center gap-4">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#866748]" strokeWidth={2} />
            <input
              type="text"
              name="search"
              defaultValue={filters.search || ''}
              placeholder="Search categories..."
              className="h-14 w-full rounded-[1.05rem] border border-[#dcccba] bg-white pl-14 pr-4 text-[1rem] text-[#3a2513] outline-none transition placeholder:text-[#b09983] focus:border-[#b69066]"
            />
          </div>
        </form>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {rows.length > 0 ? rows.map((category) => (
            <Card key={category.id} className="rounded-[1.45rem] border border-[#e0d1bf] bg-white shadow-none">
              <CardContent className="p-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="icon-surface-sm bg-[#efebe6] text-[#4f3118]">
                    <Tag className="h-7 w-7" />
                  </div>

                  <div className="flex items-center gap-4 text-[#4f3118]">
                    <button
                      type="button"
                      onClick={() => setActiveCategory(category)}
                      className="transition hover:text-[#2f1c0d]"
                      aria-label={`Edit ${category.name}`}
                    >
                      <Pencil className="h-5 w-5" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingCategory(category)}
                      className="transition hover:text-red-600"
                      aria-label={`Delete ${category.name}`}
                    >
                      <Trash2 className="h-5 w-5 text-red-500" strokeWidth={2} />
                    </button>
                  </div>
                </div>

                <div className="mt-7">
                  <h2 className="text-[1.25rem] font-semibold text-[#352314]">{category.name}</h2>
                  <p className="mt-3 min-h-[3.2rem] text-[1rem] text-[#5f4328]">
                    {category.description || 'No category description added yet.'}
                  </p>
                </div>

                <div className="mt-8 flex items-end justify-between gap-4">
                  <p className="text-[1.05rem] font-medium text-[#4f3118]">
                    {category.products_count} {category.products_count === 1 ? 'product' : 'products'}
                  </p>
                  <p className="text-[0.95rem] text-[#7b5d3d]">
                    Added: {category.created_at || 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )) : (
            <Card className="rounded-[1.45rem] border border-[#e0d1bf] bg-white shadow-none md:col-span-2 xl:col-span-3">
              <CardContent className="px-8 py-16 text-center">
                <p className="text-lg font-medium text-[#4d3218]">No categories found.</p>
                <p className="mt-2 text-sm text-[#7a5c3e]">Try another search or add a new category.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {hasFilters ? (
          <div className="flex justify-end">
            <Link href="/inventory/categories" className="text-sm font-semibold text-[#4f3118]">
              Clear filters
            </Link>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}

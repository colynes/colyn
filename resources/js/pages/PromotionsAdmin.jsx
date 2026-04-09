import React, { useEffect, useMemo, useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/Card';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { BadgePercent, Pencil, Plus, Search, Trash2, X } from 'lucide-react';

const statusTone = {
  Active: 'bg-emerald-100 text-emerald-700',
  Scheduled: 'bg-blue-100 text-blue-700',
  'Promotion Closed': 'bg-amber-100 text-amber-700',
  Inactive: 'bg-slate-100 text-slate-600',
};

function PromotionFormModal({ open, mode, promotion, onClose }) {
  const form = useForm({
    title: '',
    description: '',
    discount_label: '',
    cta_text: 'Order now',
    starts_at: '',
    ends_at: '',
    is_active: true,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.setData({
      title: promotion?.title || '',
      description: promotion?.description || '',
      discount_label: promotion?.discount_label || '',
      cta_text: promotion?.cta_text || 'Order now',
      starts_at: promotion?.starts_at || '',
      ends_at: promotion?.ends_at || '',
      is_active: promotion?.is_active ?? true,
    });
  }, [open, promotion]);

  if (!open) {
    return null;
  }

  const submit = (event) => {
    event.preventDefault();

    const options = {
      preserveScroll: true,
      onSuccess: () => onClose(),
    };

    if (mode === 'edit' && promotion) {
      form.put(`/dashboard/promotions/${promotion.id}`, options);
      return;
    }

    form.post('/dashboard/promotions', options);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-6">
      <div className="my-auto max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-[1.75rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between px-7 py-6">
          <div>
            <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-[#3a2513]">
              {mode === 'edit' ? 'Edit Promotion' : 'Add New Promotion'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#6d5036] transition hover:bg-[#f3ede5]"
            aria-label="Close promotion modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 px-7 pb-7">
          <Input
            label="Promotion Title"
            value={form.data.title}
            onChange={(event) => form.setData('title', event.target.value)}
            placeholder="Enter promotion title"
            error={form.errors.title}
            className="h-14"
          />

          <div>
            <label className="mb-2 block text-[1rem] font-semibold text-[#3a2513]">Description</label>
            <textarea
              value={form.data.description}
              onChange={(event) => form.setData('description', event.target.value)}
              placeholder="Enter promotion description"
              rows={4}
              className="w-full rounded-xl border border-[#dcccba] bg-white px-5 py-4 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
            />
            {form.errors.description ? <p className="mt-2 text-xs text-red-500">{form.errors.description}</p> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Discount Label"
              value={form.data.discount_label}
              onChange={(event) => form.setData('discount_label', event.target.value)}
              placeholder="e.g. 10% Off"
              error={form.errors.discount_label}
              className="h-14"
            />
            <Input
              label="CTA Text"
              value={form.data.cta_text}
              onChange={(event) => form.setData('cta_text', event.target.value)}
              placeholder="Order now"
              error={form.errors.cta_text}
              className="h-14"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              type="date"
              label="Start Date"
              value={form.data.starts_at}
              onChange={(event) => form.setData('starts_at', event.target.value)}
              error={form.errors.starts_at}
              className="h-14"
            />
            <Input
              type="date"
              label="End Date"
              value={form.data.ends_at}
              onChange={(event) => form.setData('ends_at', event.target.value)}
              error={form.errors.ends_at}
              className="h-14"
            />
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-[#dcccba] bg-[#faf6f1] px-4 py-4 text-[1rem] font-medium text-[#3a2513]">
            <input
              type="checkbox"
              checked={form.data.is_active}
              onChange={(event) => form.setData('is_active', event.target.checked)}
              className="h-4 w-4"
            />
            Set promotion as active
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
              {form.processing ? 'Saving...' : mode === 'edit' ? 'Save Promotion' : 'Create Promotion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PromotionsAdmin({ auth, promotions, filters = {} }) {
  const rows = promotions?.data || [];
  const [modalMode, setModalMode] = useState('create');
  const [selectedPromotion, setSelectedPromotion] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingPromotion, setDeletingPromotion] = useState(null);

  const hasFilters = useMemo(
    () => Boolean((filters.search || '').trim()),
    [filters.search],
  );

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedPromotion(null);
    setModalOpen(true);
  };

  const openEditModal = (promotion) => {
    setModalMode('edit');
    setSelectedPromotion(promotion);
    setModalOpen(true);
  };

  return (
    <AppLayout user={auth?.user}>
      <PromotionFormModal
        open={modalOpen}
        mode={modalMode}
        promotion={selectedPromotion}
        onClose={() => setModalOpen(false)}
      />

      <ConfirmModal
        isOpen={Boolean(deletingPromotion)}
        onClose={() => setDeletingPromotion(null)}
        onConfirm={() => {
          if (deletingPromotion) {
            router.delete(`/dashboard/promotions/${deletingPromotion.id}`, {
              preserveScroll: true,
            });
          }
        }}
        title="Delete Promotion"
        message={deletingPromotion ? `You are deleting promotion ${deletingPromotion.title}. This action cannot be undone.` : ''}
        confirmText="Delete"
        type="danger"
      />

        <div className="space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[2.45rem] font-semibold tracking-[-0.04em] text-[#3a2513]">Promotions</h1>
            <p className="mt-2 text-[0.95rem] text-[#73563a]">Create, schedule, and publish offers for customers</p>
          </div>

          <Button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-3 self-start rounded-[1.05rem] bg-[#4f3118] px-6 py-3.5 text-[1.05rem] font-semibold text-white transition hover:bg-[#402612]"
          >
            <Plus className="h-5 w-5" strokeWidth={2.25} />
            Add Promotion
          </Button>
        </div>

        <form method="get" action="/dashboard/promotions" className="flex items-center gap-4">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#866748]" strokeWidth={2} />
            <input
              type="text"
              name="search"
              defaultValue={filters.search || ''}
              placeholder="Search promotions..."
              className="h-14 w-full rounded-[1.05rem] border border-[#dcccba] bg-white pl-14 pr-4 text-[1rem] text-[#3a2513] outline-none transition placeholder:text-[#b09983] focus:border-[#b69066]"
            />
          </div>
        </form>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {rows.length > 0 ? rows.map((promotion) => (
            <Card key={promotion.id} className="rounded-[1.45rem] border border-[#e0d1bf] bg-white shadow-none">
              <CardContent className="relative p-7">
                <div className="flex items-start gap-4">
                  <div className="icon-surface-sm bg-[#efebe6] text-[#4f3118]">
                    <BadgePercent className="h-7 w-7" />
                  </div>
                </div>

                <div className="absolute right-[0.3cm] top-[0.3cm] flex items-center gap-4 text-[#4f3118]">
                  <button
                    type="button"
                    onClick={() => openEditModal(promotion)}
                    className="transition hover:text-[#2f1c0d]"
                    aria-label={`Edit ${promotion.title}`}
                  >
                    <Pencil className="h-5 w-5" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingPromotion(promotion)}
                    className="transition hover:text-red-600"
                    aria-label={`Delete ${promotion.title}`}
                  >
                    <Trash2 className="h-5 w-5 text-red-500" strokeWidth={2} />
                  </button>
                </div>

                <div className="mt-7">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-[1.25rem] font-semibold text-[#352314]">{promotion.title}</h2>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusTone[promotion.status] || 'bg-slate-100 text-slate-700'}`}>
                      {promotion.status}
                    </span>
                  </div>
                  <p className="mt-3 min-h-[4.5rem] text-[1rem] text-[#5f4328]">
                    {promotion.description || 'No description added for this promotion.'}
                  </p>
                  <p className="mt-4 text-[1rem] font-medium text-[#4f3118]">
                    {promotion.discount_label || 'No discount label'}
                  </p>
                </div>

                <div className="mt-8 flex items-end justify-between gap-4">
                  <p className="text-[0.95rem] text-[#7b5d3d]">
                    {promotion.starts_at || 'No start'} {promotion.ends_at ? `- ${promotion.ends_at}` : ''}
                  </p>
                  <p className="text-[0.95rem] text-[#7b5d3d]">{promotion.creator || 'System'}</p>
                </div>
              </CardContent>
            </Card>
          )) : (
            <Card className="rounded-[1.45rem] border border-[#e0d1bf] bg-white shadow-none md:col-span-2 xl:col-span-3">
              <CardContent className="px-8 py-16 text-center">
                <p className="text-lg font-medium text-[#4d3218]">No promotions found.</p>
                <p className="mt-2 text-sm text-[#7a5c3e]">Create a promotion and publish it for customers to see.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {hasFilters ? (
          <div className="flex justify-end">
            <Link href="/dashboard/promotions" className="text-sm font-semibold text-[#4f3118]">
              Clear search
            </Link>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}

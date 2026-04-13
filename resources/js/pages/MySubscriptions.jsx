import React, { useEffect, useMemo, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import StoreLayout from '@/components/StoreLayout';
import { Card, CardContent } from '@/components/ui/Card';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { toast } from 'sonner';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  PauseCircle,
  PlayCircle,
  Plus,
  Repeat2,
  SkipForward,
  Tag,
  Truck,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';

const dayOptions = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const tabOptions = [
  { key: 'requests', label: 'Requests' },
  { key: 'active', label: 'Active Subscriptions' },
  { key: 'upcoming', label: 'Upcoming Deliveries' },
];

const requestStatusTone = {
  pending_review: 'bg-amber-100 text-amber-700',
  quoted: 'bg-sky-100 text-sky-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
  expired: 'bg-slate-200 text-slate-700',
};

const subscriptionStatusTone = {
  active: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-rose-100 text-rose-700',
};

const frequencyOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'custom', label: 'Custom days' },
];

function money(value) {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function quantityLabel(quantity, unit) {
  const amount = new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 2 }).format(quantity || 0);
  return `${amount} ${unit || 'pcs'}`;
}

function buildInitialForm(customerMeta = {}) {
  return {
    items: [],
    frequency: 'weekly',
    delivery_days: ['Mon'],
    start_date: new Date().toISOString().slice(0, 10),
    delivery_address: customerMeta?.default_delivery_address || '',
    notes: '',
    offered_price: '',
    draft_item_type: 'product',
    draft_item_id: '',
    draft_quantity: '1',
  };
}

function SummaryCard({ label, value, helper, icon: Icon }) {
  return (
    <Card className="rounded-[1.75rem] border-[#eadfce] bg-white shadow-sm">
      <CardContent className="px-[0.4cm] pb-[0.35cm] pt-[0.45cm]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">{label}</p>
            <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#321e11]">{value}</p>
            {helper ? <p className="mt-2 text-sm text-[#7d6247]">{helper}</p> : null}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4ede3] text-[#6b4829]">
            <Icon size={20} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ title, description, action }) {
  return (
    <Card className="rounded-[1.75rem] border-dashed border-[#dfcfbb] bg-[#fffdf9] shadow-none">
      <CardContent className="flex flex-col items-center justify-center px-[0.5cm] pb-[0.55cm] pt-[0.8cm] text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f3eadf] text-[#6b4829]">
          <FileText size={24} />
        </div>
        <h3 className="mt-5 text-xl font-bold text-[#352214]">{title}</h3>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#80674d]">{description}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ toneMap, value, label }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneMap[value] || 'bg-slate-100 text-slate-700'}`}>
      {label}
    </span>
  );
}
function RequestFormModal({ open, onClose, form, setForm, products, packs, errors, submitting, onSubmit }) {
  if (!open) {
    return null;
  }

  const catalog = form.draft_item_type === 'pack' ? packs : products;
  const itemError = Object.keys(errors || {}).find((key) => key.startsWith('items'));
  const canConfigureDays = ['weekly', 'custom'].includes(form.frequency);

  const addItem = () => {
    const quantity = Number(form.draft_quantity || 0);
    const selected = catalog.find((item) => String(item.id) === String(form.draft_item_id));

    if (!selected || quantity <= 0) {
      return;
    }

    const idField = form.draft_item_type === 'pack' ? 'pack_id' : 'product_id';
    const existingIndex = form.items.findIndex((item) => item.item_type === form.draft_item_type && String(item[idField]) === String(selected.id));
    const nextItem = {
      item_type: form.draft_item_type,
      product_id: form.draft_item_type === 'product' ? selected.id : null,
      pack_id: form.draft_item_type === 'pack' ? selected.id : null,
      name: selected.name,
      quantity,
      unit: form.draft_item_type === 'pack' ? 'pack' : selected.unit,
      price: selected.price,
    };

    setForm((current) => {
      const nextItems = [...current.items];

      if (existingIndex >= 0) {
        nextItems[existingIndex] = {
          ...nextItems[existingIndex],
          quantity: Number(nextItems[existingIndex].quantity || 0) + quantity,
        };
      } else {
        nextItems.push(nextItem);
      }

      return {
        ...current,
        items: nextItems,
        draft_item_id: '',
        draft_quantity: '1',
      };
    });
  };

  const removeItem = (index) => {
    setForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const toggleDay = (day) => {
    setForm((current) => ({
      ...current,
      delivery_days: current.delivery_days.includes(day)
        ? current.delivery_days.filter((item) => item !== day)
        : [...current.delivery_days, day],
    }));
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-6">
      <div className="my-auto w-full max-w-[72rem] overflow-hidden rounded-[2rem] bg-white shadow-[0_28px_90px_rgba(38,24,14,0.26)]">
        <div className="flex items-start justify-between border-b border-[#eadfce] px-6 py-6 md:px-8">
          <div>
            <h2 className="text-[2rem] font-black tracking-[-0.04em] text-[#3a2513]">New Subscription Request</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7d6247]">
              Submit your preferred price. Our team will review and send you a quote within 24 hours.
            </p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#6d5036] transition hover:bg-[#f3ede5]" aria-label="Close subscription request form">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-6 px-6 py-6 md:px-8">
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6 rounded-[1.75rem] border border-[#eadfce] bg-[#fffaf3] p-5">
              <div>
                <p className="text-lg font-bold text-[#3a2513]">Request items</p>
                <p className="mt-1 text-sm text-[#7d6247]">Choose products or packs and the quantity you want delivered.</p>
                <div className="mt-5 grid gap-3 md:grid-cols-[160px_minmax(0,1fr)_150px_auto]">
                  <select value={form.draft_item_type} onChange={(event) => setForm((current) => ({ ...current, draft_item_type: event.target.value, draft_item_id: '' }))} className="h-12 rounded-xl border border-[#dcccba] bg-white px-4 text-sm text-[#3a2513] outline-none focus:border-[#b69066]">
                    <option value="product">Product</option>
                    <option value="pack">Pack</option>
                  </select>
                  <select value={form.draft_item_id} onChange={(event) => setForm((current) => ({ ...current, draft_item_id: event.target.value }))} className="h-12 rounded-xl border border-[#dcccba] bg-white px-4 text-sm text-[#3a2513] outline-none focus:border-[#b69066]">
                    <option value="">Select {form.draft_item_type}</option>
                    {catalog.map((item) => (
                      <option key={`${form.draft_item_type}-${item.id}`} value={item.id}>{item.name} - {money(item.price)}</option>
                    ))}
                  </select>
                  <input type="number" min="0.01" step="0.01" value={form.draft_quantity} onChange={(event) => setForm((current) => ({ ...current, draft_quantity: event.target.value }))} className="h-12 rounded-xl border border-[#dcccba] bg-white px-4 text-sm text-[#3a2513] outline-none focus:border-[#b69066]" placeholder="Quantity" />
                  <button type="button" onClick={addItem} className="inline-flex h-12 items-center justify-center rounded-xl bg-[#4f3118] px-4 text-sm font-semibold text-white transition hover:bg-[#3f2513]">Add item</button>
                </div>
                {itemError ? <p className="mt-3 text-sm font-medium text-rose-600">{errors[itemError]}</p> : null}
              </div>

              <div className="space-y-3">
                {form.items.length > 0 ? form.items.map((item, index) => (
                  <div key={`${item.item_type}-${item.product_id || item.pack_id}-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#eadfce] bg-white px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-[#362214]">{item.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#8b7255]">{item.item_type === 'pack' ? 'Pack' : 'Product'} - {quantityLabel(item.quantity, item.unit)}</p>
                    </div>
                    <button type="button" onClick={() => removeItem(index)} className="inline-flex items-center rounded-full border border-[#f2c8c8] bg-[#fff5f5] px-3 py-1 text-xs font-semibold text-[#b42318]">Remove</button>
                  </div>
                )) : <div className="rounded-2xl border border-dashed border-[#dcc8b0] bg-white px-4 py-8 text-center text-sm text-[#80674d]">No items added yet.</div>}
              </div>
            </div>

            <div className="space-y-6 rounded-[1.75rem] border border-[#eadfce] bg-white p-5">
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#3a2513]">Frequency</label>
                  <select value={form.frequency} onChange={(event) => setForm((current) => ({ ...current, frequency: event.target.value, delivery_days: event.target.value === 'weekly' ? ['Mon'] : event.target.value === 'custom' ? current.delivery_days : [] }))} className="h-12 w-full rounded-xl border border-[#dcccba] bg-white px-4 text-sm text-[#3a2513] outline-none focus:border-[#b69066]">
                    {frequencyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  {errors.frequency ? <p className="mt-2 text-sm text-rose-600">{errors.frequency}</p> : null}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#3a2513]">Start date</label>
                  <input type="date" value={form.start_date} onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))} className="h-12 w-full rounded-xl border border-[#dcccba] bg-white px-4 text-sm text-[#3a2513] outline-none focus:border-[#b69066]" />
                  {errors.start_date ? <p className="mt-2 text-sm text-rose-600">{errors.start_date}</p> : null}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#3a2513]">Offered price</label>
                  <input type="number" min="0" step="0.01" value={form.offered_price} onChange={(event) => setForm((current) => ({ ...current, offered_price: event.target.value }))} className="h-12 w-full rounded-xl border border-[#dcccba] bg-white px-4 text-sm text-[#3a2513] outline-none focus:border-[#b69066]" placeholder="Enter your preferred price" />
                  {errors.offered_price ? <p className="mt-2 text-sm text-rose-600">{errors.offered_price}</p> : null}
                </div>
              </div>

              {canConfigureDays ? (
                <div>
                  <label className="mb-3 block text-sm font-semibold text-[#3a2513]">Delivery days</label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7 xl:grid-cols-4">
                    {dayOptions.map((day) => (
                      <button key={day} type="button" onClick={() => toggleDay(day)} className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${form.delivery_days.includes(day) ? 'border-[#4f3118] bg-[#4f3118] text-white' : 'border-[#dcccba] bg-white text-[#4f3118]'}`}>
                        {day}
                      </button>
                    ))}
                  </div>
                  {errors.delivery_days ? <p className="mt-2 text-sm text-rose-600">{errors.delivery_days}</p> : null}
                </div>
              ) : <div className="rounded-2xl border border-[#eadfce] bg-[#faf4eb] px-4 py-3 text-sm text-[#7d6247]">{form.frequency === 'daily' && 'Deliveries will be scheduled every day.'}{form.frequency === 'weekdays' && 'Deliveries will run Monday to Friday.'}{form.frequency === 'weekends' && 'Deliveries will run on Saturday and Sunday.'}</div>}

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#3a2513]">Delivery address</label>
                <textarea rows={4} value={form.delivery_address} onChange={(event) => setForm((current) => ({ ...current, delivery_address: event.target.value }))} className="w-full rounded-2xl border border-[#dcccba] bg-white px-4 py-3 text-sm text-[#3a2513] outline-none focus:border-[#b69066]" placeholder="Enter the address where deliveries should arrive" />
                {errors.delivery_address ? <p className="mt-2 text-sm text-rose-600">{errors.delivery_address}</p> : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#3a2513]">Notes</label>
                <textarea rows={4} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="w-full rounded-2xl border border-[#dcccba] bg-white px-4 py-3 text-sm text-[#3a2513] outline-none focus:border-[#b69066]" placeholder="Share any preferred timing, packaging, or delivery instructions" />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-[#eadfce] pt-6 md:flex-row md:justify-end">
            <button type="button" onClick={onClose} className="inline-flex h-12 items-center justify-center rounded-xl border border-[#d9c4a9] bg-white px-5 text-sm font-semibold text-[#4f3118]">Cancel</button>
            <button type="submit" disabled={submitting} className="inline-flex h-12 items-center justify-center rounded-xl bg-[#4f3118] px-5 text-sm font-semibold text-white transition hover:bg-[#3f2513] disabled:cursor-not-allowed disabled:opacity-70">{submitting ? 'Submitting...' : 'Submit Request'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
function RequestCard({ request, onAccept, onReject, onOpenSubscription, processingKey }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const requestTitle = request.items.map((item) => item.name).slice(0, 2).join(' + ') || 'Subscription request';
  const acceptedSubscription = request.subscription;
  const acceptedPrice = acceptedSubscription?.agreed_price ?? request.quoted_price ?? request.offered_price;
  const nextDeliveryLabel = acceptedSubscription?.next_delivery_label || acceptedSubscription?.start_date_label || request.start_date_label || 'To be scheduled';

  if (request.status === 'accepted') {
    return (
      <Card className="rounded-[1.75rem] border-[#eadfce] bg-white shadow-sm">
        <CardContent className="px-[0.4cm] pb-[0.35cm] pt-[0.45cm]">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">{request.request_number}</p>
                <StatusBadge toneMap={requestStatusTone} value={request.status} label={request.status_label} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {acceptedSubscription ? (
                <button
                  type="button"
                  onClick={() => onOpenSubscription(acceptedSubscription.id)}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[#1f6f55] px-4 text-sm font-semibold text-white"
                >
                  Open Subscription
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setDetailsOpen((current) => !current)}
                aria-expanded={detailsOpen}
                aria-label={detailsOpen ? 'Hide subscription request details' : 'Show subscription request details'}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d9c4a9] bg-white px-4 text-sm font-semibold text-[#4f3118]"
              >
                Details
                <ChevronDown className={`h-4 w-4 transition ${detailsOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-[#eadfce] bg-[#fffaf3] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">Accepted package</p>
                <h4 className="mt-2 text-xl font-black tracking-[-0.03em] text-[#352214]">
                  {acceptedSubscription?.name || requestTitle}
                </h4>
              </div>

              <div className="rounded-[1.25rem] border border-[#eadfce] bg-white px-5 py-4 text-right lg:min-w-[15rem]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">Accepted price</p>
                <p className="mt-2 text-2xl font-black text-[#1f6f55]">{money(acceptedPrice)}</p>
                <p className="mt-3 text-sm text-[#7d6247]">Next delivery: {nextDeliveryLabel}</p>
              </div>
            </div>
          </div>

          {detailsOpen ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <div className="rounded-2xl bg-[#faf7f1] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">Schedule</p>
                  <dl className="mt-3 space-y-3 text-sm text-[#624731]">
                    <div>
                      <dt className="font-semibold text-[#352214]">Frequency</dt>
                      <dd className="mt-1">{acceptedSubscription?.frequency || request.frequency}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#352214]">Delivery days</dt>
                      <dd className="mt-1">{acceptedSubscription?.delivery_days_label || request.delivery_days_label}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#352214]">Start date</dt>
                      <dd className="mt-1">{acceptedSubscription?.start_date_label || request.start_date_label || 'To be confirmed'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-2xl bg-[#faf7f1] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">Items</p>
                  <div className="mt-3 space-y-2">
                    {request.items.map((item) => (
                      <div key={item.id} className="rounded-2xl bg-white px-4 py-3">
                        <p className="text-sm font-semibold text-[#352214]">{item.name}</p>
                        <p className="mt-1 text-sm text-[#7d6247]">{quantityLabel(item.quantity, item.unit)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-[#faf7f1] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">Service details</p>
                <dl className="mt-3 space-y-3 text-sm text-[#624731]">
                  <div>
                    <dt className="font-semibold text-[#352214]">Submitted</dt>
                    <dd className="mt-1">{request.submitted_date_label}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#352214]">Offered price</dt>
                    <dd className="mt-1">{money(request.offered_price)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#352214]">Quoted price</dt>
                    <dd className="mt-1">{request.quoted_price !== null ? money(request.quoted_price) : 'Pending quote'}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#352214]">Delivery address</dt>
                    <dd className="mt-1 leading-6">{acceptedSubscription?.delivery_address || request.delivery_address || 'No address saved.'}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#352214]">Notes</dt>
                    <dd className="mt-1 leading-6">{acceptedSubscription?.notes || request.notes || 'No extra notes saved for this request.'}</dd>
                  </div>
                </dl>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[1.75rem] border-[#eadfce] bg-white shadow-sm">
      <CardContent className="px-[0.4cm] pb-[0.35cm] pt-[0.45cm]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">{request.request_number}</p>
              <StatusBadge toneMap={requestStatusTone} value={request.status} label={request.status_label} />
            </div>
            <h3 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[#352214]">{requestTitle}</h3>
            <p className="mt-2 text-sm text-[#7d6247]">Submitted on {request.submitted_date_label}</p>
          </div>
          <div className="rounded-[1.25rem] bg-[#faf4eb] px-5 py-4 text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">Offered price</p>
            <p className="mt-2 text-xl font-black text-[#352214]">{money(request.offered_price)}</p>
            {request.quoted_price !== null ? <><p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">Quoted price</p><p className="mt-2 text-lg font-bold text-[#1f6f55]">{money(request.quoted_price)}</p></> : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl bg-[#faf7f1] p-4"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">Frequency</p><p className="mt-2 text-sm font-semibold text-[#352214]">{request.frequency}</p><p className="mt-1 text-sm text-[#7d6247]">{request.delivery_days_label}</p></div>
          <div className="rounded-2xl bg-[#faf7f1] p-4"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">Start date</p><p className="mt-2 text-sm font-semibold text-[#352214]">{request.start_date_label || 'To be confirmed'}</p><p className="mt-1 text-sm text-[#7d6247]">Delivery address provided</p></div>
          <div className="rounded-2xl bg-[#faf7f1] p-4"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">Items</p><div className="mt-2 space-y-1 text-sm text-[#352214]">{request.items.map((item) => <p key={item.id}>{item.name} - {quantityLabel(item.quantity, item.unit)}</p>)}</div></div>
        </div>

        {request.status === 'pending_review' ? <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">Waiting for review. Our team is checking your request and will send a quote soon.</div> : null}

        {request.status === 'quoted' ? (
          <div className="mt-6 rounded-[1.5rem] border border-sky-200 bg-sky-50 px-5 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Quote from admin</p>
                <p className="mt-2 text-lg font-black text-[#2c2d41]">{money(request.quoted_price)}</p>
                {request.quoted_message ? <p className="mt-3 max-w-2xl text-sm leading-6 text-[#45607d]">{request.quoted_message}</p> : null}
                {request.quote_valid_until_label ? <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Valid until {request.quote_valid_until_label}</p> : null}
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => onReject(request)} disabled={processingKey === `reject-${request.id}`} className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d9c4a9] bg-white px-4 text-sm font-semibold text-[#4f3118] disabled:opacity-60">Reject Quote</button>
                <button type="button" onClick={() => onAccept(request.id)} disabled={processingKey === `accept-${request.id}`} className="inline-flex h-11 items-center justify-center rounded-xl bg-[#1f6f55] px-4 text-sm font-semibold text-white transition hover:bg-[#195b46] disabled:opacity-60">{processingKey === `accept-${request.id}` ? 'Accepting...' : 'Accept Quote'}</button>
              </div>
            </div>
          </div>
        ) : null}

        {request.status === 'accepted' ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="font-semibold">Quote accepted successfully.</p><p className="mt-1">Your active subscription is ready and future deliveries will appear in your dashboard.</p></div>{request.subscription ? <button type="button" onClick={() => onOpenSubscription(request.subscription.id)} className="inline-flex h-10 items-center justify-center rounded-xl bg-[#1f6f55] px-4 text-sm font-semibold text-white">Open Subscription</button> : null}</div></div> : null}
        {request.status === 'rejected' ? <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700"><p className="font-semibold">Request closed.</p><p className="mt-1">{request.rejection_reason || request.response_message || 'This request was rejected.'}</p></div> : null}
        {request.status === 'expired' ? <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">This quote expired before it was accepted. Submit a fresh request if you still want this delivery plan.</div> : null}
      </CardContent>
    </Card>
  );
}

function SubscriptionCard({ subscription, expanded, onToggleExpand, onAction, processingKey }) {
  return (
    <Card className="rounded-[1.75rem] border-[#eadfce] bg-white shadow-sm transition">
      <CardContent className="px-[0.4cm] pb-[0.35cm] pt-[0.45cm]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge toneMap={subscriptionStatusTone} value={subscription.status} label={subscription.status_label} />
            </div>
            <h3 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[#352214]">{subscription.name}</h3>
          </div>

          <div className="rounded-[1.25rem] bg-[#faf4eb] px-5 py-4 text-right lg:min-w-[16rem]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">Agreed price</p>
            <p className="mt-2 text-2xl font-black text-[#1f6f55]">{money(subscription.agreed_price)}</p>
            <p className="mt-3 text-sm text-[#7d6247]">Next delivery: {subscription.next_delivery_label || 'Not scheduled'}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => onToggleExpand(subscription.id)} className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d9c4a9] bg-white px-4 text-sm font-semibold text-[#4f3118]">{expanded ? 'Hide details' : 'View details'}</button>
          {subscription.can_pause ? <button type="button" onClick={() => onAction('pause', subscription)} disabled={processingKey === `pause-${subscription.id}`} className="inline-flex h-11 items-center justify-center rounded-xl bg-[#f3eadf] px-4 text-sm font-semibold text-[#4f3118] disabled:opacity-60"><PauseCircle size={16} className="mr-2" />Pause</button> : null}
          {subscription.can_resume ? <button type="button" onClick={() => onAction('resume', subscription)} disabled={processingKey === `resume-${subscription.id}`} className="inline-flex h-11 items-center justify-center rounded-xl bg-[#1f6f55] px-4 text-sm font-semibold text-white disabled:opacity-60"><PlayCircle size={16} className="mr-2" />Resume</button> : null}
          {subscription.can_skip_next_delivery ? <button type="button" onClick={() => onAction('skip', subscription)} disabled={processingKey === `skip-${subscription.id}`} className="inline-flex h-11 items-center justify-center rounded-xl bg-[#fff4dc] px-4 text-sm font-semibold text-[#8c5b00] disabled:opacity-60"><SkipForward size={16} className="mr-2" />Skip next delivery</button> : null}
          {subscription.can_cancel ? <button type="button" onClick={() => onAction('cancel', subscription)} disabled={processingKey === `cancel-${subscription.id}`} className="inline-flex h-11 items-center justify-center rounded-xl bg-[#fff5f5] px-4 text-sm font-semibold text-[#b42318] disabled:opacity-60"><XCircle size={16} className="mr-2" />Cancel</button> : null}
        </div>

        {expanded ? <div className="mt-6 space-y-4"><div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4"><div className="rounded-2xl bg-[#faf7f1] p-4"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">Frequency</p><p className="mt-2 text-sm font-semibold text-[#352214]">{subscription.frequency}</p><p className="mt-1 text-sm text-[#7d6247]">{subscription.delivery_days_label}</p></div><div className="rounded-2xl bg-[#faf7f1] p-4"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">Next delivery</p><p className="mt-2 text-lg font-bold text-[#352214]">{subscription.next_delivery_label || 'Not scheduled'}</p></div><div className="rounded-2xl bg-[#faf7f1] p-4"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">Estimated weekly cost</p><p className="mt-2 text-lg font-bold text-[#352214]">{money(subscription.estimated_weekly_cost)}</p><p className="mt-2 text-sm text-[#7d6247]">{subscription.estimated_weekly_deliveries} deliveries expected in the next 7 days.</p></div><div className="rounded-2xl bg-[#faf7f1] p-4"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">Estimated monthly cost</p><p className="mt-2 text-lg font-bold text-[#352214]">{money(subscription.estimated_monthly_cost)}</p><p className="mt-2 text-sm text-[#7d6247]">{subscription.estimated_monthly_deliveries} deliveries expected in the next 30 days.</p></div></div><div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]"><div className="rounded-[1.5rem] border border-[#eadfce] bg-[#fffaf3] p-5"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b7255]">Subscription details</p><div className="mt-4 rounded-2xl bg-white px-4 py-4"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">Next 3 deliveries</p><div className="mt-3 flex flex-wrap gap-2">{subscription.upcoming_dates.length > 0 ? subscription.upcoming_dates.map((date) => <span key={date.date} className="inline-flex rounded-full bg-[#f3eadf] px-3 py-1 text-xs font-semibold text-[#4f3118]">{date.label}</span>) : <span className="text-sm text-[#7d6247]">No upcoming deliveries scheduled.</span>}</div></div><div className="mt-4 space-y-3">{subscription.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3"><div><p className="text-sm font-semibold text-[#352214]">{item.name}</p><p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#8b7255]">{item.item_type === 'pack' ? 'Pack' : 'Product'}</p></div><div className="text-right"><p className="text-sm font-semibold text-[#352214]">{quantityLabel(item.quantity, item.unit)}</p><p className="mt-1 text-xs text-[#7d6247]">{money(item.line_total)}</p></div></div>)}</div></div><div className="rounded-[1.5rem] border border-[#eadfce] bg-white p-5"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b7255]">Service notes</p><dl className="mt-4 space-y-4 text-sm text-[#624731]"><div><dt className="font-semibold text-[#352214]">Start date</dt><dd className="mt-1">{subscription.start_date_label || 'Not set'}</dd></div><div><dt className="font-semibold text-[#352214]">Delivery address</dt><dd className="mt-1 leading-6">{subscription.delivery_address || 'No address saved.'}</dd></div><div><dt className="font-semibold text-[#352214]">Notes</dt><dd className="mt-1 leading-6">{subscription.notes || 'No extra notes saved for this subscription.'}</dd></div>{subscription.request ? <div><dt className="font-semibold text-[#352214]">Created from request</dt><dd className="mt-1">{subscription.request.request_number}</dd></div> : null}</dl></div></div></div> : null}
      </CardContent>
    </Card>
  );
}

function DeliveryTimeline({ deliveries }) {
  if (deliveries.length === 0) {
    return <EmptyState title="No upcoming deliveries" description="Once you accept a quote and your subscription is active, the next deliveries will appear here in timeline order." />;
  }

  return (
    <div className="space-y-4">
      {deliveries.map((delivery) => (
        <Card key={delivery.id} className="rounded-[1.75rem] border-[#eadfce] bg-white shadow-sm">
          <CardContent className="px-[0.4cm] pb-[0.35cm] pt-[0.45cm]">
            <div className="grid gap-5 lg:grid-cols-[180px_1fr_auto] lg:items-center">
              <div className="rounded-[1.25rem] bg-[#faf4eb] px-4 py-4"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">Delivery date</p><p className="mt-2 text-lg font-bold text-[#352214]">{delivery.delivery_date_label}</p></div>
              <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8b7255]">Subscription</p><h3 className="mt-2 text-xl font-black tracking-[-0.03em] text-[#352214]">{delivery.subscription_name}</h3><div className="mt-3 flex flex-wrap gap-2">{delivery.items.map((item, index) => <span key={`${delivery.id}-${item.name}-${index}`} className="inline-flex rounded-full bg-[#f3eadf] px-3 py-1 text-xs font-semibold text-[#4f3118]">{item.name} - {quantityLabel(item.quantity, item.unit)}</span>)}</div></div>
              <div className="rounded-[1.25rem] bg-[#f3fbf7] px-4 py-4 text-right"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1f6f55]">Value</p><p className="mt-2 text-lg font-bold text-[#1f6f55]">{money(delivery.total_value)}</p></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
export default function MySubscriptions({ subscriptionRequests = [], activeSubscriptions = [], upcomingDeliveries = [], catalog = { products: [], packs: [] }, customerMeta = {}, summary = {}, initialTab = 'requests' }) {
  const { flash } = usePage().props;
  const [activeTab, setActiveTab] = useState(initialTab || 'requests');
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestForm, setRequestForm] = useState(buildInitialForm(customerMeta));
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [processingKey, setProcessingKey] = useState('');
  const [expandedSubscriptionId, setExpandedSubscriptionId] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const flashToastKeyRef = useRef('');

  const counts = useMemo(() => ({ requests: subscriptionRequests.length, active: activeSubscriptions.length, upcoming: upcomingDeliveries.length }), [subscriptionRequests.length, activeSubscriptions.length, upcomingDeliveries.length]);
  const reloadSubscriptionData = () => new Promise((resolve) => router.reload({ only: ['subscriptionRequests', 'activeSubscriptions', 'upcomingDeliveries', 'summary', 'notifications'], preserveScroll: true, onFinish: () => resolve() }));
  const closeRequestModal = () => { setRequestModalOpen(false); setRequestForm(buildInitialForm(customerMeta)); setFormErrors({}); };

  useEffect(() => {
    const type = flash?.error ? 'error' : flash?.success ? 'success' : null;
    const message = flash?.error || flash?.success;

    if (!type || !message) {
      return;
    }

    const nextKey = `${type}:${message}`;

    if (flashToastKeyRef.current === nextKey) {
      return;
    }

    flashToastKeyRef.current = nextKey;

    if (type === 'error') {
      toast.error(message, { duration: 3500 });
      return;
    }

    toast.success(message, { duration: 3500 });
  }, [flash?.error, flash?.success]);

  const submitRequest = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormErrors({});

    const payload = {
      items: requestForm.items.map((item) => ({ item_type: item.item_type, product_id: item.product_id, pack_id: item.pack_id, quantity: Number(item.quantity || 0) })),
      frequency: requestForm.frequency,
      delivery_days: ['weekly', 'custom'].includes(requestForm.frequency) ? requestForm.delivery_days : [],
      start_date: requestForm.start_date,
      delivery_address: requestForm.delivery_address,
      notes: requestForm.notes,
      offered_price: Number(requestForm.offered_price || 0),
    };

    try {
      const response = await window.axios.post('/my-subscriptions/requests', payload);
      await reloadSubscriptionData();
      closeRequestModal();
      setActiveTab('requests');
    } catch (error) {
      if (error.response?.status === 422) {
        setFormErrors(error.response.data?.errors || {});
      } else {
        toast.error(error.response?.data?.message || 'We could not submit your subscription request. Please try again.', { duration: 3500 });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptQuote = async (requestId) => {
    setProcessingKey(`accept-${requestId}`);
    try {
      const response = await window.axios.post(`/my-subscriptions/requests/${requestId}/accept-quote`);
      await reloadSubscriptionData();
      setActiveTab('active');
    } catch (error) {
      toast.error(error.response?.data?.message || 'We could not accept this quote right now.', { duration: 3500 });
    } finally {
      setProcessingKey('');
    }
  };

  const confirmRejectQuote = (request) => setConfirmState({ title: 'Reject Quote?', message: `This will close ${request.request_number}. You can always create a new subscription request later.`, confirmText: 'Reject Quote', type: 'danger', onConfirm: async () => {
    setProcessingKey(`reject-${request.id}`);
    try { const response = await window.axios.post(`/my-subscriptions/requests/${request.id}/reject-quote`, { response_message: 'Quote rejected by customer.' }); await reloadSubscriptionData(); setActiveTab('requests'); toast.success(response.data?.message || 'Quote rejected successfully.', { duration: 3500 }); }
    catch (error) { toast.error(error.response?.data?.message || 'We could not reject this quote right now.', { duration: 3500 }); }
    finally { setProcessingKey(''); }
  } });

  const handleSubscriptionAction = (action, subscription) => {
    const config = {
      pause: { path: `/my-subscriptions/${subscription.id}/pause`, method: 'patch', success: 'Subscription paused successfully.' },
      resume: { path: `/my-subscriptions/${subscription.id}/resume`, method: 'patch', success: 'Subscription resumed successfully.' },
      skip: { path: `/my-subscriptions/${subscription.id}/skip-next-delivery`, method: 'patch', success: 'Next delivery skipped successfully.', confirm: { title: 'Skip Next Delivery?', message: `We will move the next scheduled delivery for ${subscription.name} forward to the following valid delivery date.`, confirmText: 'Skip Delivery', type: 'warning' } },
      cancel: { path: `/my-subscriptions/${subscription.id}/cancel`, method: 'patch', success: 'Subscription cancelled successfully.', confirm: { title: 'Cancel Subscription?', message: `This will stop future deliveries for ${subscription.name}. Existing history will remain visible.`, confirmText: 'Cancel Subscription', type: 'danger' } },
    }[action];

    const run = async () => {
      setProcessingKey(`${action}-${subscription.id}`);
      try {
        const response = await window.axios[config.method](config.path);
        await reloadSubscriptionData();
        setActiveTab(action === 'skip' ? 'upcoming' : 'active');
        toast.success(response.data?.message || config.success, { duration: 3500 });
      } catch (error) {
        toast.error(error.response?.data?.message || 'We could not update that subscription right now.', { duration: 3500 });
      } finally {
        setProcessingKey('');
      }
    };

    if (config.confirm) {
      setConfirmState({ ...config.confirm, onConfirm: run });
      return;
    }

    run();
  };

  const openSubscriptionFromRequest = (subscriptionId) => { setActiveTab('active'); setExpandedSubscriptionId(subscriptionId); };

  return (
    <StoreLayout title="My Subscriptions" subtitle="Create delivery requests, review admin quotes, and manage your recurring deliveries from one place.">
      <RequestFormModal open={requestModalOpen} onClose={closeRequestModal} form={requestForm} setForm={setRequestForm} products={catalog.products || []} packs={catalog.packs || []} errors={formErrors} submitting={submitting} onSubmit={submitRequest} />
      <ConfirmModal isOpen={Boolean(confirmState)} onClose={() => setConfirmState(null)} onConfirm={() => confirmState?.onConfirm?.()} title={confirmState?.title} message={confirmState?.message} confirmText={confirmState?.confirmText} type={confirmState?.type || 'warning'} />

      <div className="space-y-8">
        <section className="grid gap-4 lg:grid-cols-4">
          <SummaryCard label="Pending Requests" value={summary?.pending_requests ?? 0} helper="Requests waiting for admin review" icon={Clock3} />
          <SummaryCard label="Quoted Requests" value={summary?.quoted_requests ?? 0} helper="Quotes waiting for your decision" icon={Tag} />
          <SummaryCard label="Active Subscriptions" value={summary?.active_subscriptions ?? 0} helper="Recurring plans currently live" icon={Repeat2} />
          <SummaryCard label="Next Delivery" value={summary?.next_delivery?.delivery_date ? summary.next_delivery.delivery_date_label : 'No delivery'} helper={summary?.next_delivery?.subscription_name || 'Accept a quote to schedule deliveries'} icon={Truck} />
        </section>

        <section className="rounded-[2rem] border border-[#eadfce] bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2 rounded-[1.25rem] bg-[#f4ede3] p-2">{tabOptions.map((tab) => <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`inline-flex items-center rounded-[1rem] px-4 py-2.5 text-sm font-semibold transition ${activeTab === tab.key ? 'bg-[#4f3118] text-white shadow-sm' : 'text-[#6b4a2b] hover:bg-white'}`}>{tab.label}<span className={`ml-2 inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[11px] ${activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-white text-[#6b4a2b]'}`}>{counts[tab.key]}</span></button>)}</div>
            <button type="button" onClick={() => { setRequestModalOpen(true); setFormErrors({}); }} className="inline-flex items-center justify-center rounded-[1.05rem] bg-[#4f3118] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3f2513]"><Plus size={18} className="mr-2" />New Subscription Request</button>
          </div>
        </section>

        {activeTab === 'requests' ? <section className="space-y-5">{subscriptionRequests.length > 0 ? subscriptionRequests.map((request) => <RequestCard key={request.id} request={request} onAccept={handleAcceptQuote} onReject={confirmRejectQuote} onOpenSubscription={openSubscriptionFromRequest} processingKey={processingKey} />) : <EmptyState title="No subscription requests yet" description="Start a subscription request with your preferred products, delivery days, and offered price. Once the team responds with a quote, you can accept it here and the subscription will move into your active plans." action={<button type="button" onClick={() => setRequestModalOpen(true)} className="inline-flex items-center justify-center rounded-xl bg-[#4f3118] px-5 py-3 text-sm font-semibold text-white"><Plus size={18} className="mr-2" />Create your first request</button>} />}</section> : null}

        {activeTab === 'active' ? <section className="space-y-5">{activeSubscriptions.length > 0 ? activeSubscriptions.map((subscription) => <SubscriptionCard key={subscription.id} subscription={subscription} expanded={expandedSubscriptionId === subscription.id} onToggleExpand={(subscriptionId) => setExpandedSubscriptionId((current) => current === subscriptionId ? null : subscriptionId)} onAction={handleSubscriptionAction} processingKey={processingKey} />) : <EmptyState title="No active subscriptions yet" description="Accepted quotes will move here automatically. You will be able to pause, resume, cancel, and skip upcoming deliveries from this tab." />}</section> : null}

        {activeTab === 'upcoming' ? <section><DeliveryTimeline deliveries={upcomingDeliveries} /></section> : null}

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-[1.75rem] border-[#eadfce] bg-white shadow-sm"><CardContent className="px-[0.4cm] pb-[0.35cm] pt-[0.45cm]"><div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f4ede3] text-[#6b4829]"><CalendarDays size={18} /></div><div className="flex min-h-[3.5rem] flex-col justify-center"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8b7255]">Request process</p><p className="mt-1 text-sm text-[#7d6247]">Submit your preferred items, schedule, and price.</p></div></div></CardContent></Card>
          <Card className="rounded-[1.75rem] border-[#eadfce] bg-white shadow-sm"><CardContent className="px-[0.4cm] pb-[0.35cm] pt-[0.45cm]"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4ede3] text-[#6b4829]"><CheckCircle2 size={18} /></div><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8b7255]">Quote approval</p><p className="mt-1 text-sm text-[#7d6247]">Review the admin quote, accept it, or reject it from the Requests tab.</p></div></div></CardContent></Card>
          <Card className="rounded-[1.75rem] border-[#eadfce] bg-white shadow-sm"><CardContent className="px-[0.4cm] pb-[0.35cm] pt-[0.45cm]"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4ede3] text-[#6b4829]"><Wallet size={18} /></div><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8b7255]">Recurring planning</p><p className="mt-1 text-sm text-[#7d6247]">See the next deliveries and the estimated cost before the next billing cycle.</p></div></div></CardContent></Card>
        </section>
      </div>
    </StoreLayout>
  );
}







import React, { useEffect, useMemo, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import StoreLayout from '@/components/StoreLayout';
import { Card, CardContent } from '@/components/ui/Card';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { formatCurrency, formatDate, formatNumber, useI18n } from '@/lib/i18n';
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

const TOAST_DURATION_MS = 5000;
const dayOptions = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const tabKeys = ['requests', 'active', 'upcoming'];

const requestStatusTone = {
  pending_review: 'bg-amber-100 text-amber-700',
  quoted: 'bg-sky-100 text-sky-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
  expired: 'bg-slate-200 text-slate-700',
};

const subscriptionStatusTone = {
  pending: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
  expiring_soon: 'bg-orange-100 text-orange-700',
  expired: 'bg-rose-100 text-rose-700',
  paused: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-rose-100 text-rose-700',
};

const frequencyOptionValues = ['daily', 'weekly', 'weekdays', 'weekends', 'custom'];

function money(value, locale = 'en') {
  return formatCurrency(value || 0, locale);
}

function quantityLabel(quantity, unit, locale = 'en') {
  const amount = formatNumber(quantity || 0, locale, { maximumFractionDigits: 2 });
  return `${amount} ${unit || 'pcs'}`;
}

function shortDate(value, locale = 'en') {
  return value ? formatDate(value, locale, { day: '2-digit', month: 'short', year: 'numeric' }) : '';
}

function shortDateWithWeekday(value, locale = 'en') {
  return value ? formatDate(value, locale, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : '';
}

function translateRequestStatus(status, t) {
  switch (String(status || '').toLowerCase()) {
    case 'pending_review':
      return t('ui.store.subscriptions.status.request.pending_review', 'Pending Review');
    case 'quoted':
      return t('ui.store.subscriptions.status.request.quoted', 'Quoted');
    case 'accepted':
      return t('ui.store.subscriptions.status.request.accepted', 'Accepted');
    case 'rejected':
      return t('ui.store.subscriptions.status.request.rejected', 'Rejected');
    case 'expired':
      return t('ui.store.subscriptions.status.request.expired', 'Expired');
    default:
      return status || t('ui.store.subscriptions.request.subscription_request', 'Subscription request');
  }
}

function translateSubscriptionStatus(status, t) {
  switch (String(status || '').toLowerCase()) {
    case 'pending':
      return t('ui.store.subscriptions.status.subscription.pending', 'Pending');
    case 'active':
      return t('ui.store.subscriptions.status.subscription.active', 'Active');
    case 'expiring_soon':
      return t('ui.store.subscriptions.status.subscription.expiring_soon', 'Expiring Soon');
    case 'expired':
      return t('ui.store.subscriptions.status.subscription.expired', 'Expired');
    case 'paused':
      return t('ui.store.subscriptions.status.subscription.paused', 'Paused');
    case 'cancelled':
      return t('ui.store.subscriptions.status.subscription.cancelled', 'Cancelled');
    default:
      return status || t('ui.store.subscriptions.status.subscription.active', 'Active');
  }
}

function translateFrequency(value, t) {
  const normalized = String(value || '').toLowerCase().trim();

  switch (normalized) {
    case 'daily':
      return t('ui.store.subscriptions.frequency.daily', 'Daily');
    case 'weekly':
      return t('ui.store.subscriptions.frequency.weekly', 'Weekly');
    case 'weekdays':
      return t('ui.store.subscriptions.frequency.weekdays', 'Weekdays');
    case 'weekdays only':
      return t('ui.store.subscriptions.frequency.weekdays_only', 'Weekdays only');
    case 'weekends':
      return t('ui.store.subscriptions.frequency.weekends', 'Weekends');
    case 'weekends only':
      return t('ui.store.subscriptions.frequency.weekends_only', 'Weekends only');
    case 'custom':
      return t('ui.store.subscriptions.frequency.custom', 'Custom days');
    default:
      return value || t('ui.store.subscriptions.frequency.custom', 'Custom days');
  }
}

function translateDeliveryDaysLabel(label, t) {
  const normalized = String(label || '').toLowerCase().trim();

  switch (normalized) {
    case 'every day':
      return t('ui.store.subscriptions.schedule.every_day', 'Every day');
    case 'mon-fri':
      return t('ui.store.subscriptions.schedule.mon_fri', 'Mon-Fri');
    case 'sat-sun':
      return t('ui.store.subscriptions.schedule.sat_sun', 'Sat-Sun');
    case 'flexible schedule':
      return t('ui.store.subscriptions.schedule.flexible', 'Flexible schedule');
    default:
      return label || t('ui.store.subscriptions.schedule.flexible', 'Flexible schedule');
  }
}

function translateItemType(value, t) {
  return String(value || '').toLowerCase() === 'pack'
    ? t('ui.store.subscriptions.item_types.pack', 'Pack')
    : t('ui.store.subscriptions.item_types.product', 'Product');
}

function toDateInput(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(value.getTime())) {
    return '';
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function addMonthsNoOverflow(dateString, months = 1) {
  const date = dateString ? new Date(`${dateString}T00:00:00`) : new Date();

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const day = date.getDate();
  const target = new Date(date);

  target.setDate(1);
  target.setMonth(target.getMonth() + months);

  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));

  return toDateInput(target);
}

function buildInitialForm(customerMeta = {}) {
  const startDate = toDateInput();

  return {
    items: [],
    resubmitted_from_request_id: null,
    frequency: 'weekly',
    delivery_days: ['Mon'],
    start_date: startDate,
    end_date: addMonthsNoOverflow(startDate, 1),
    delivery_address: customerMeta?.default_delivery_address || '',
    notes: '',
    offered_price: '',
    draft_item_type: 'product',
    draft_item_id: '',
    draft_quantity: '1',
  };
}

function buildPrefilledFormFromRequest(request, customerMeta = {}) {
  const baseForm = buildInitialForm(customerMeta);
  const todayDate = toDateInput();
  const startDate = request?.start_date && request.start_date >= todayDate
    ? request.start_date
    : baseForm.start_date;
  const endDate = request?.end_date && request.end_date >= startDate
    ? request.end_date
    : addMonthsNoOverflow(startDate, 1);

  return {
    ...baseForm,
    items: (request?.items || []).map((item) => ({
      item_type: item.item_type,
      product_id: item.product_id ?? null,
      pack_id: item.pack_id ?? null,
      name: item.name,
      quantity: String(item.quantity ?? 1),
      unit: item.unit,
      price: item.price ?? 0,
    })),
    resubmitted_from_request_id: request?.id ?? null,
    frequency: request?.frequency || baseForm.frequency,
    delivery_days: Array.isArray(request?.delivery_days)
      ? [...request.delivery_days]
      : [...baseForm.delivery_days],
    start_date: startDate,
    end_date: endDate,
    delivery_address: request?.delivery_address || baseForm.delivery_address,
    notes: request?.notes || '',
    offered_price: request?.offered_price ?? '',
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
function RequestFormModal({ open, onClose, form, setForm, products, packs, errors, submitting, onSubmit, title = 'New Subscription Request', description = 'Submit your preferred price. Our team will review and send you a quote within 24 hours.', submitLabel = 'Submit Request' }) {
  const { t, locale } = useI18n();

  if (!open) {
    return null;
  }

  const catalog = form.draft_item_type === 'pack' ? packs : products;
  const itemError = Object.keys(errors || {}).find((key) => key.startsWith('items'));
  const canConfigureDays = ['weekly', 'custom'].includes(form.frequency);
  const todayInput = toDateInput();
  const frequencyOptions = frequencyOptionValues.map((value) => ({
    value,
    label: translateFrequency(value, t),
  }));

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
            <h2 className="text-[2rem] font-black tracking-[-0.04em] text-[#3a2513]">{title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7d6247]">{description}</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#6d5036] transition hover:bg-[#f3ede5]" aria-label={t('ui.store.subscriptions.request_form.close', 'Close subscription request form')}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-6 px-6 py-6 md:px-8">
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6 rounded-[1.75rem] border border-[#eadfce] bg-[#fffaf3] p-5">
              <div>
                <p className="text-lg font-bold text-[#3a2513]">{t('ui.store.subscriptions.request_form.request_items_title', 'Request items')}</p>
                <p className="mt-1 text-sm text-[#7d6247]">{t('ui.store.subscriptions.request_form.request_items_description', 'Choose products or packs and the quantity you want delivered.')}</p>
                <div className="mt-5 grid gap-3 md:grid-cols-[160px_minmax(0,1fr)_150px_auto]">
                  <select value={form.draft_item_type} onChange={(event) => setForm((current) => ({ ...current, draft_item_type: event.target.value, draft_item_id: '' }))} className="h-12 rounded-xl border border-[#dcccba] bg-white px-4 text-sm text-[#3a2513] outline-none focus:border-[#b69066]">
                    <option value="product">{t('ui.store.subscriptions.item_types.product', 'Product')}</option>
                    <option value="pack">{t('ui.store.subscriptions.item_types.pack', 'Pack')}</option>
                  </select>
                  <select value={form.draft_item_id} onChange={(event) => setForm((current) => ({ ...current, draft_item_id: event.target.value }))} className="h-12 rounded-xl border border-[#dcccba] bg-white px-4 text-sm text-[#3a2513] outline-none focus:border-[#b69066]">
                    <option value="">
                      {form.draft_item_type === 'pack'
                        ? t('ui.store.subscriptions.request_form.select_pack', 'Select pack')
                        : t('ui.store.subscriptions.request_form.select_product', 'Select product')}
                    </option>
                    {catalog.map((item) => (
                      <option key={`${form.draft_item_type}-${item.id}`} value={item.id}>{item.name} - {money(item.price, locale)}</option>
                    ))}
                  </select>
                  <input type="number" min="0.01" step="0.01" value={form.draft_quantity} onChange={(event) => setForm((current) => ({ ...current, draft_quantity: event.target.value }))} className="h-12 rounded-xl border border-[#dcccba] bg-white px-4 text-sm text-[#3a2513] outline-none focus:border-[#b69066]" placeholder={t('ui.store.subscriptions.request_form.quantity_placeholder', 'Quantity')} />
                  <button type="button" onClick={addItem} className="inline-flex h-12 items-center justify-center rounded-xl bg-[#4f3118] px-4 text-sm font-semibold text-white transition hover:bg-[#3f2513]">{t('ui.store.subscriptions.actions.add_item', 'Add item')}</button>
                </div>
                {itemError ? <p className="mt-3 text-sm font-medium text-rose-600">{errors[itemError]}</p> : null}
              </div>

              <div className="space-y-3">
                {form.items.length > 0 ? form.items.map((item, index) => (
                  <div key={`${item.item_type}-${item.product_id || item.pack_id}-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#eadfce] bg-white px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-[#362214]">{item.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#8b7255]">{translateItemType(item.item_type, t)} - {quantityLabel(item.quantity, item.unit, locale)}</p>
                    </div>
                    <button type="button" onClick={() => removeItem(index)} className="inline-flex items-center rounded-full border border-[#f2c8c8] bg-[#fff5f5] px-3 py-1 text-xs font-semibold text-[#b42318]">{t('ui.store.subscriptions.actions.remove', 'Remove')}</button>
                  </div>
                )) : <div className="rounded-2xl border border-dashed border-[#dcc8b0] bg-white px-4 py-8 text-center text-sm text-[#80674d]">{t('ui.store.subscriptions.request_form.no_items', 'No items added yet.')}</div>}
              </div>
            </div>

            <div className="space-y-6 rounded-[1.75rem] border border-[#eadfce] bg-white p-5">
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#3a2513]">{t('ui.store.subscriptions.fields.frequency', 'Frequency')}</label>
                  <select value={form.frequency} onChange={(event) => setForm((current) => ({ ...current, frequency: event.target.value, delivery_days: event.target.value === 'weekly' ? ['Mon'] : event.target.value === 'custom' ? current.delivery_days : [] }))} className="h-12 w-full rounded-xl border border-[#dcccba] bg-white px-4 text-sm text-[#3a2513] outline-none focus:border-[#b69066]">
                    {frequencyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  {errors.frequency ? <p className="mt-2 text-sm text-rose-600">{errors.frequency}</p> : null}
                </div>
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#3a2513]">{t('ui.store.subscriptions.fields.start_date', 'Start date')}</label>
                    <input
                      type="date"
                      required
                      min={todayInput}
                      value={form.start_date}
                      onChange={(event) => {
                        const startDate = event.target.value;

                        setForm((current) => ({
                          ...current,
                          start_date: startDate,
                          end_date: !current.end_date || current.end_date < startDate
                            ? addMonthsNoOverflow(startDate, 1)
                            : current.end_date,
                        }));
                      }}
                      className="h-12 w-full rounded-xl border border-[#dcccba] bg-white px-4 text-sm text-[#3a2513] outline-none focus:border-[#b69066]"
                    />
                    {errors.start_date ? <p className="mt-2 text-sm text-rose-600">{errors.start_date}</p> : null}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#3a2513]">{t('ui.store.subscriptions.fields.end_date', 'End date')}</label>
                    <input
                      type="date"
                      required
                      min={form.start_date}
                      value={form.end_date}
                      onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))}
                      className="h-12 w-full rounded-xl border border-[#dcccba] bg-white px-4 text-sm text-[#3a2513] outline-none focus:border-[#b69066]"
                    />
                    {errors.end_date ? <p className="mt-2 text-sm text-rose-600">{errors.end_date}</p> : null}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#3a2513]">{t('ui.store.subscriptions.fields.offered_price', 'Offered price')}</label>
                  <input type="number" min="0" step="0.01" value={form.offered_price} onChange={(event) => setForm((current) => ({ ...current, offered_price: event.target.value }))} className="h-12 w-full rounded-xl border border-[#dcccba] bg-white px-4 text-sm text-[#3a2513] outline-none focus:border-[#b69066]" placeholder={t('ui.store.subscriptions.request_form.offered_price_placeholder', 'Enter your preferred price')} />
                  {errors.offered_price ? <p className="mt-2 text-sm text-rose-600">{errors.offered_price}</p> : null}
                </div>
              </div>

              {canConfigureDays ? (
                <div>
                  <label className="mb-3 block text-sm font-semibold text-[#3a2513]">{t('ui.store.subscriptions.fields.delivery_days', 'Delivery days')}</label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7 xl:grid-cols-4">
                    {dayOptions.map((day) => (
                      <button key={day} type="button" onClick={() => toggleDay(day)} className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${form.delivery_days.includes(day) ? 'border-[#4f3118] bg-[#4f3118] text-white' : 'border-[#dcccba] bg-white text-[#4f3118]'}`}>
                        {day}
                      </button>
                    ))}
                  </div>
                  {errors.delivery_days ? <p className="mt-2 text-sm text-rose-600">{errors.delivery_days}</p> : null}
                </div>
              ) : <div className="rounded-2xl border border-[#eadfce] bg-[#faf4eb] px-4 py-3 text-sm text-[#7d6247]">{form.frequency === 'daily' && t('ui.store.subscriptions.request_form.schedule_help.daily', 'Deliveries will be scheduled every day.')}{form.frequency === 'weekdays' && t('ui.store.subscriptions.request_form.schedule_help.weekdays', 'Deliveries will run Monday to Friday.')}{form.frequency === 'weekends' && t('ui.store.subscriptions.request_form.schedule_help.weekends', 'Deliveries will run on Saturday and Sunday.')}</div>}

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#3a2513]">{t('ui.store.subscriptions.fields.delivery_address', 'Delivery address')}</label>
                <textarea rows={4} value={form.delivery_address} onChange={(event) => setForm((current) => ({ ...current, delivery_address: event.target.value }))} className="w-full rounded-2xl border border-[#dcccba] bg-white px-4 py-3 text-sm text-[#3a2513] outline-none focus:border-[#b69066]" placeholder={t('ui.store.subscriptions.request_form.delivery_address_placeholder', 'Enter the address where deliveries should arrive')} />
                {errors.delivery_address ? <p className="mt-2 text-sm text-rose-600">{errors.delivery_address}</p> : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#3a2513]">{t('ui.store.subscriptions.fields.notes', 'Notes')}</label>
                <textarea rows={4} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="w-full rounded-2xl border border-[#dcccba] bg-white px-4 py-3 text-sm text-[#3a2513] outline-none focus:border-[#b69066]" placeholder={t('ui.store.subscriptions.request_form.notes_placeholder', 'Share any preferred timing, packaging, or delivery instructions')} />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-[#eadfce] pt-6 md:flex-row md:justify-end">
            <button type="button" onClick={onClose} className="inline-flex h-12 items-center justify-center rounded-xl border border-[#d9c4a9] bg-white px-5 text-sm font-semibold text-[#4f3118]">{t('ui.store.subscriptions.actions.cancel', 'Cancel')}</button>
            <button type="submit" disabled={submitting} className="inline-flex h-12 items-center justify-center rounded-xl bg-[#4f3118] px-5 text-sm font-semibold text-white transition hover:bg-[#3f2513] disabled:cursor-not-allowed disabled:opacity-70">{submitting ? t('ui.store.subscriptions.actions.submitting', 'Submitting...') : submitLabel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
function RequestCard({ request, onAccept, onReject, onOpenSubscription, onSendNewOffer, processingKey }) {
  const { t, tp, locale } = useI18n();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const requestTitle = request.items.map((item) => item.name).slice(0, 2).join(' + ') || t('ui.store.subscriptions.request.subscription_request', 'Subscription request');
  const acceptedSubscription = request.subscription;
  const acceptedPrice = acceptedSubscription?.agreed_price ?? request.quoted_price ?? request.offered_price;
  const nextDeliveryLabel = acceptedSubscription?.next_delivery_date
    ? shortDateWithWeekday(acceptedSubscription.next_delivery_date, locale)
    : acceptedSubscription?.start_date
      ? shortDate(acceptedSubscription.start_date, locale)
      : request.start_date
        ? shortDate(request.start_date, locale)
        : t('ui.store.subscriptions.request.to_be_scheduled', 'To be scheduled');

  if (request.status === 'accepted') {
    return (
      <Card className="rounded-[1.75rem] border-[#eadfce] bg-white shadow-sm">
        <CardContent className="px-[0.4cm] pb-[0.35cm] pt-[0.45cm]">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">{request.request_number}</p>
              <StatusBadge toneMap={requestStatusTone} value={request.status} label={translateRequestStatus(request.status, t)} />
            </div>
          </div>

            <div className="flex flex-wrap items-center gap-3">
              {acceptedSubscription ? (
                <button
                  type="button"
                  onClick={() => onOpenSubscription(acceptedSubscription.id)}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[#1f6f55] px-4 text-sm font-semibold text-white"
                >
                  {t('ui.store.subscriptions.actions.open_subscription', 'Open Subscription')}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setDetailsOpen((current) => !current)}
                aria-expanded={detailsOpen}
                aria-label={detailsOpen
                  ? t('ui.store.subscriptions.request.hide_details_aria', 'Hide subscription request details')
                  : t('ui.store.subscriptions.request.show_details_aria', 'Show subscription request details')}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d9c4a9] bg-white px-4 text-sm font-semibold text-[#4f3118]"
              >
                {t('ui.store.subscriptions.actions.details', 'Details')}
                <ChevronDown className={`h-4 w-4 transition ${detailsOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-[#eadfce] bg-[#fffaf3] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">{t('ui.store.subscriptions.request.accepted_package', 'Accepted package')}</p>
                <h4 className="mt-2 text-xl font-black tracking-[-0.03em] text-[#352214]">
                  {acceptedSubscription?.name || requestTitle}
                </h4>
              </div>

              <div className="rounded-[1.25rem] border border-[#eadfce] bg-white px-5 py-4 text-right lg:min-w-[15rem]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">{t('ui.store.subscriptions.request.accepted_price', 'Accepted price')}</p>
                <p className="mt-2 text-2xl font-black text-[#1f6f55]">{money(acceptedPrice, locale)}</p>
                <p className="mt-3 text-sm text-[#7d6247]">{tp('ui.store.subscriptions.request.next_delivery_value', 'Next delivery: :date', { date: nextDeliveryLabel })}</p>
              </div>
            </div>
          </div>

          {detailsOpen ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <div className="rounded-2xl bg-[#faf7f1] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">{t('ui.store.subscriptions.request.schedule', 'Schedule')}</p>
                  <dl className="mt-3 space-y-3 text-sm text-[#624731]">
                    <div>
                      <dt className="font-semibold text-[#352214]">{t('ui.store.subscriptions.fields.frequency', 'Frequency')}</dt>
                      <dd className="mt-1">{translateFrequency(acceptedSubscription?.frequency || request.frequency, t)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#352214]">{t('ui.store.subscriptions.fields.delivery_days', 'Delivery days')}</dt>
                      <dd className="mt-1">{translateDeliveryDaysLabel(acceptedSubscription?.delivery_days_label || request.delivery_days_label, t)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#352214]">{t('ui.store.subscriptions.fields.start_date', 'Start date')}</dt>
                      <dd className="mt-1">{acceptedSubscription?.start_date ? shortDate(acceptedSubscription.start_date, locale) : request.start_date ? shortDate(request.start_date, locale) : t('ui.store.subscriptions.request.to_be_confirmed', 'To be confirmed')}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#352214]">{t('ui.store.subscriptions.fields.end_date', 'End date')}</dt>
                      <dd className="mt-1">{acceptedSubscription?.end_date ? shortDate(acceptedSubscription.end_date, locale) : request.end_date ? shortDate(request.end_date, locale) : t('ui.store.subscriptions.request.to_be_confirmed', 'To be confirmed')}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-2xl bg-[#faf7f1] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">{t('ui.store.subscriptions.request.items', 'Items')}</p>
                  <div className="mt-3 space-y-2">
                    {request.items.map((item) => (
                      <div key={item.id} className="rounded-2xl bg-white px-4 py-3">
                        <p className="text-sm font-semibold text-[#352214]">{item.name}</p>
                        <p className="mt-1 text-sm text-[#7d6247]">{quantityLabel(item.quantity, item.unit, locale)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-[#faf7f1] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">{t('ui.store.subscriptions.request.service_details', 'Service details')}</p>
                <dl className="mt-3 space-y-3 text-sm text-[#624731]">
                  <div>
                    <dt className="font-semibold text-[#352214]">{t('ui.store.subscriptions.request.submitted', 'Submitted')}</dt>
                    <dd className="mt-1">{request.submitted_date ? shortDate(request.submitted_date, locale) : request.submitted_date_label}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#352214]">{t('ui.store.subscriptions.fields.offered_price', 'Offered price')}</dt>
                    <dd className="mt-1">{money(request.offered_price, locale)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#352214]">{t('ui.store.subscriptions.request.quoted_price', 'Quoted price')}</dt>
                    <dd className="mt-1">{request.quoted_price !== null ? money(request.quoted_price, locale) : t('ui.store.subscriptions.request.pending_quote', 'Pending quote')}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#352214]">{t('ui.store.subscriptions.fields.delivery_address', 'Delivery address')}</dt>
                    <dd className="mt-1 leading-6">{acceptedSubscription?.delivery_address || request.delivery_address || t('ui.store.subscriptions.request.no_address_saved', 'No address saved.')}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#352214]">{t('ui.store.subscriptions.fields.notes', 'Notes')}</dt>
                    <dd className="mt-1 leading-6">{acceptedSubscription?.notes || request.notes || t('ui.store.subscriptions.request.no_request_notes', 'No extra notes saved for this request.')}</dd>
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
              <StatusBadge toneMap={requestStatusTone} value={request.status} label={translateRequestStatus(request.status, t)} />
            </div>
            <h3 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[#352214]">{requestTitle}</h3>
            <p className="mt-2 text-sm text-[#7d6247]">{tp('ui.store.subscriptions.request.submitted_on', 'Submitted on :date', { date: request.submitted_date ? shortDate(request.submitted_date, locale) : request.submitted_date_label })}</p>
          </div>
          <div className="rounded-[1.25rem] bg-[#faf4eb] px-5 py-4 text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">{t('ui.store.subscriptions.fields.offered_price', 'Offered price')}</p>
            <p className="mt-2 text-xl font-black text-[#352214]">{money(request.offered_price, locale)}</p>
            {request.quoted_price !== null ? <><p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">{t('ui.store.subscriptions.request.quoted_price', 'Quoted price')}</p><p className="mt-2 text-lg font-bold text-[#1f6f55]">{money(request.quoted_price, locale)}</p></> : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          <div className="rounded-2xl bg-[#faf7f1] p-4"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">{t('ui.store.subscriptions.fields.frequency', 'Frequency')}</p><p className="mt-2 text-sm font-semibold text-[#352214]">{translateFrequency(request.frequency, t)}</p><p className="mt-1 text-sm text-[#7d6247]">{translateDeliveryDaysLabel(request.delivery_days_label, t)}</p></div>
          <div className="rounded-2xl bg-[#faf7f1] p-4"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">{t('ui.store.subscriptions.fields.start_date', 'Start date')}</p><p className="mt-2 text-sm font-semibold text-[#352214]">{request.start_date ? shortDate(request.start_date, locale) : t('ui.store.subscriptions.request.to_be_confirmed', 'To be confirmed')}</p><p className="mt-1 text-sm text-[#7d6247]">{t('ui.store.subscriptions.request.delivery_address_provided', 'Delivery address provided')}</p></div>
          <div className="rounded-2xl bg-[#faf7f1] p-4"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">{t('ui.store.subscriptions.fields.end_date', 'End date')}</p><p className="mt-2 text-sm font-semibold text-[#352214]">{request.end_date ? shortDate(request.end_date, locale) : t('ui.store.subscriptions.request.to_be_confirmed', 'To be confirmed')}</p><p className="mt-1 text-sm text-[#7d6247]">{t('ui.store.subscriptions.request.subscription_period_end', 'Subscription period end')}</p></div>
          <div className="rounded-2xl bg-[#faf7f1] p-4"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">{t('ui.store.subscriptions.request.items', 'Items')}</p><div className="mt-2 space-y-1 text-sm text-[#352214]">{request.items.map((item) => <p key={item.id}>{item.name} - {quantityLabel(item.quantity, item.unit, locale)}</p>)}</div></div>
        </div>

        {request.status === 'pending_review' ? <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">{t('ui.store.subscriptions.request.waiting_review', 'Waiting for review. Our team is checking your request and will send a quote soon.')}</div> : null}

        {request.status === 'quoted' ? (
          <div className="mt-6 rounded-[1.5rem] border border-sky-200 bg-sky-50 px-5 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">{t('ui.store.subscriptions.request.quote_from_admin', 'Quote from admin')}</p>
                <p className="mt-2 text-lg font-black text-[#2c2d41]">{money(request.quoted_price, locale)}</p>
                {request.quoted_message ? <p className="mt-3 max-w-2xl text-sm leading-6 text-[#45607d]">{request.quoted_message}</p> : null}
                {request.quote_valid_until ? <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">{tp('ui.store.subscriptions.request.valid_until', 'Valid until :date', { date: shortDate(request.quote_valid_until, locale) })}</p> : null}
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => onReject(request)} disabled={processingKey === `reject-${request.id}`} className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d9c4a9] bg-white px-4 text-sm font-semibold text-[#4f3118] disabled:opacity-60">{t('ui.store.subscriptions.actions.reject_quote', 'Reject Quote')}</button>
                <button type="button" onClick={() => onAccept(request.id)} disabled={processingKey === `accept-${request.id}`} className="inline-flex h-11 items-center justify-center rounded-xl bg-[#1f6f55] px-4 text-sm font-semibold text-white transition hover:bg-[#195b46] disabled:opacity-60">{processingKey === `accept-${request.id}` ? t('ui.store.subscriptions.actions.accepting', 'Accepting...') : t('ui.store.subscriptions.actions.accept_quote', 'Accept Quote')}</button>
              </div>
            </div>
          </div>
        ) : null}

        {request.status === 'accepted' ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="font-semibold">{t('ui.store.subscriptions.request.accepted_success_title', 'Quote accepted successfully.')}</p><p className="mt-1">{t('ui.store.subscriptions.request.accepted_success_description', 'Your active subscription is ready and future deliveries will appear in your dashboard.')}</p></div>{request.subscription ? <button type="button" onClick={() => onOpenSubscription(request.subscription.id)} className="inline-flex h-10 items-center justify-center rounded-xl bg-[#1f6f55] px-4 text-sm font-semibold text-white">{t('ui.store.subscriptions.actions.open_subscription', 'Open Subscription')}</button> : null}</div></div> : null}
        {request.status === 'rejected' ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold">{t('ui.store.subscriptions.request.rejected_title', 'Request closed.')}</p>
                <p className="mt-1">{request.rejection_reason || request.response_message || t('ui.store.subscriptions.request.rejected_description_default', 'This request was rejected.')}</p>
              </div>
              <button
                type="button"
                onClick={() => onSendNewOffer(request)}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-[#4f3118] px-4 text-sm font-semibold text-white transition hover:bg-[#3f2513]"
              >
                {t('ui.store.subscriptions.actions.send_new_offer', 'Send New Offer')}
              </button>
            </div>
          </div>
        ) : null}
        {request.status === 'expired' ? <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">{t('ui.store.subscriptions.request.expired_quote', 'This quote expired before it was accepted. Submit a fresh request if you still want this delivery plan.')}</div> : null}
      </CardContent>
    </Card>
  );
}

function SubscriptionCard({ subscription, expanded, onToggleExpand, onAction, processingKey }) {
  const { t, tp, locale } = useI18n();

  return (
    <Card className="rounded-[1.75rem] border-[#eadfce] bg-white shadow-sm transition">
      <CardContent className="px-[0.4cm] pb-[0.35cm] pt-[0.45cm]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge toneMap={subscriptionStatusTone} value={subscription.status} label={translateSubscriptionStatus(subscription.status, t)} />
            </div>
            <h3 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[#352214]">{subscription.name}</h3>
          </div>

          <div className="rounded-[1.25rem] bg-[#faf4eb] px-5 py-4 text-right lg:min-w-[16rem]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">{t('ui.store.subscriptions.subscription.agreed_price', 'Agreed price')}</p>
            <p className="mt-2 text-2xl font-black text-[#1f6f55]">{money(subscription.agreed_price, locale)}</p>
            <p className="mt-3 text-sm text-[#7d6247]">{tp('ui.store.subscriptions.subscription.next_delivery_value', 'Next delivery: :date', { date: subscription.next_delivery_date ? shortDateWithWeekday(subscription.next_delivery_date, locale) : t('ui.store.subscriptions.subscription.not_scheduled', 'Not scheduled') })}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => onToggleExpand(subscription.id)} className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d9c4a9] bg-white px-4 text-sm font-semibold text-[#4f3118]">{expanded ? t('ui.store.subscriptions.actions.hide_details', 'Hide details') : t('ui.store.subscriptions.actions.view_details', 'View details')}</button>
          {subscription.can_pause ? <button type="button" onClick={() => onAction('pause', subscription)} disabled={processingKey === `pause-${subscription.id}`} className="inline-flex h-11 items-center justify-center rounded-xl bg-[#f3eadf] px-4 text-sm font-semibold text-[#4f3118] disabled:opacity-60"><PauseCircle size={16} className="mr-2" />{t('ui.store.subscriptions.actions.pause', 'Pause')}</button> : null}
          {subscription.can_resume ? <button type="button" onClick={() => onAction('resume', subscription)} disabled={processingKey === `resume-${subscription.id}`} className="inline-flex h-11 items-center justify-center rounded-xl bg-[#1f6f55] px-4 text-sm font-semibold text-white disabled:opacity-60"><PlayCircle size={16} className="mr-2" />{t('ui.store.subscriptions.actions.resume', 'Resume')}</button> : null}
          {subscription.can_skip_next_delivery ? <button type="button" onClick={() => onAction('skip', subscription)} disabled={processingKey === `skip-${subscription.id}`} className="inline-flex h-11 items-center justify-center rounded-xl bg-[#fff4dc] px-4 text-sm font-semibold text-[#8c5b00] disabled:opacity-60"><SkipForward size={16} className="mr-2" />{t('ui.store.subscriptions.actions.skip_next_delivery', 'Skip next delivery')}</button> : null}
          {subscription.can_cancel ? <button type="button" onClick={() => onAction('cancel', subscription)} disabled={processingKey === `cancel-${subscription.id}`} className="inline-flex h-11 items-center justify-center rounded-xl bg-[#fff5f5] px-4 text-sm font-semibold text-[#b42318] disabled:opacity-60"><XCircle size={16} className="mr-2" />{t('ui.store.subscriptions.actions.cancel_subscription', 'Cancel')}</button> : null}
        </div>

        {expanded ? <div className="mt-6 space-y-4"><div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4"><div className="rounded-2xl bg-[#faf7f1] p-4"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">{t('ui.store.subscriptions.fields.frequency', 'Frequency')}</p><p className="mt-2 text-sm font-semibold text-[#352214]">{translateFrequency(subscription.frequency, t)}</p><p className="mt-1 text-sm text-[#7d6247]">{translateDeliveryDaysLabel(subscription.delivery_days_label, t)}</p></div><div className="rounded-2xl bg-[#faf7f1] p-4"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">{t('ui.store.subscriptions.subscription.next_delivery', 'Next delivery')}</p><p className="mt-2 text-lg font-bold text-[#352214]">{subscription.next_delivery_date ? shortDateWithWeekday(subscription.next_delivery_date, locale) : t('ui.store.subscriptions.subscription.not_scheduled', 'Not scheduled')}</p></div><div className="rounded-2xl bg-[#faf7f1] p-4"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">{t('ui.store.subscriptions.subscription.estimated_weekly_cost', 'Estimated weekly cost')}</p><p className="mt-2 text-lg font-bold text-[#352214]">{money(subscription.estimated_weekly_cost, locale)}</p><p className="mt-2 text-sm text-[#7d6247]">{tp('ui.store.subscriptions.subscription.weekly_deliveries_expected', ':count deliveries expected in the next 7 days.', { count: formatNumber(subscription.estimated_weekly_deliveries, locale) })}</p></div><div className="rounded-2xl bg-[#faf7f1] p-4"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">{t('ui.store.subscriptions.subscription.estimated_monthly_cost', 'Estimated monthly cost')}</p><p className="mt-2 text-lg font-bold text-[#352214]">{money(subscription.estimated_monthly_cost, locale)}</p><p className="mt-2 text-sm text-[#7d6247]">{tp('ui.store.subscriptions.subscription.monthly_deliveries_expected', ':count deliveries expected in the next 30 days.', { count: formatNumber(subscription.estimated_monthly_deliveries, locale) })}</p></div></div><div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]"><div className="rounded-[1.5rem] border border-[#eadfce] bg-[#fffaf3] p-5"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b7255]">{t('ui.store.subscriptions.subscription.details', 'Subscription details')}</p><div className="mt-4 rounded-2xl bg-white px-4 py-4"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">{t('ui.store.subscriptions.subscription.next_three_deliveries', 'Next 3 deliveries')}</p><div className="mt-3 flex flex-wrap gap-2">{subscription.upcoming_dates.length > 0 ? subscription.upcoming_dates.map((date) => <span key={date.date} className="inline-flex rounded-full bg-[#f3eadf] px-3 py-1 text-xs font-semibold text-[#4f3118]">{shortDateWithWeekday(date.date, locale)}</span>) : <span className="text-sm text-[#7d6247]">{t('ui.store.subscriptions.subscription.no_upcoming_deliveries', 'No upcoming deliveries scheduled.')}</span>}</div></div><div className="mt-4 space-y-3">{subscription.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3"><div><p className="text-sm font-semibold text-[#352214]">{item.name}</p><p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#8b7255]">{translateItemType(item.item_type, t)}</p></div><div className="text-right"><p className="text-sm font-semibold text-[#352214]">{quantityLabel(item.quantity, item.unit, locale)}</p><p className="mt-1 text-xs text-[#7d6247]">{money(item.line_total, locale)}</p></div></div>)}</div></div><div className="rounded-[1.5rem] border border-[#eadfce] bg-white p-5"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b7255]">{t('ui.store.subscriptions.subscription.service_notes', 'Service notes')}</p><dl className="mt-4 space-y-4 text-sm text-[#624731]"><div><dt className="font-semibold text-[#352214]">{t('ui.store.subscriptions.fields.start_date', 'Start date')}</dt><dd className="mt-1">{subscription.start_date ? shortDate(subscription.start_date, locale) : t('ui.store.subscriptions.subscription.not_set', 'Not set')}</dd></div><div><dt className="font-semibold text-[#352214]">{t('ui.store.subscriptions.fields.end_date', 'End date')}</dt><dd className="mt-1">{subscription.end_date ? shortDate(subscription.end_date, locale) : t('ui.store.subscriptions.subscription.not_set', 'Not set')}</dd></div><div><dt className="font-semibold text-[#352214]">{t('ui.store.subscriptions.fields.delivery_address', 'Delivery address')}</dt><dd className="mt-1 leading-6">{subscription.delivery_address || t('ui.store.subscriptions.request.no_address_saved', 'No address saved.')}</dd></div><div><dt className="font-semibold text-[#352214]">{t('ui.store.subscriptions.fields.notes', 'Notes')}</dt><dd className="mt-1 leading-6">{subscription.notes || t('ui.store.subscriptions.subscription.no_notes', 'No extra notes saved for this subscription.')}</dd></div>{subscription.request ? <div><dt className="font-semibold text-[#352214]">{t('ui.store.subscriptions.subscription.created_from_request', 'Created from request')}</dt><dd className="mt-1">{subscription.request.request_number}</dd></div> : null}</dl></div></div></div> : null}
      </CardContent>
    </Card>
  );
}

function DeliveryTimeline({ deliveries }) {
  const { t, locale } = useI18n();

  if (deliveries.length === 0) {
    return <EmptyState title={t('ui.store.subscriptions.empty.no_deliveries_title', 'No upcoming deliveries')} description={t('ui.store.subscriptions.empty.no_deliveries_description', 'Once you accept a quote and your subscription is active, the next deliveries will appear here in timeline order.')} />;
  }

  return (
    <div className="space-y-4">
      {deliveries.map((delivery) => (
        <Card key={delivery.id} className="rounded-[1.75rem] border-[#eadfce] bg-white shadow-sm">
          <CardContent className="px-[0.4cm] pb-[0.35cm] pt-[0.45cm]">
            <div className="grid gap-5 lg:grid-cols-[180px_1fr_auto] lg:items-center">
              <div className="rounded-[1.25rem] bg-[#faf4eb] px-4 py-4"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7255]">{t('ui.store.subscriptions.timeline.delivery_date', 'Delivery date')}</p><p className="mt-2 text-lg font-bold text-[#352214]">{delivery.delivery_date ? shortDateWithWeekday(delivery.delivery_date, locale) : delivery.delivery_date_label}</p></div>
              <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8b7255]">{t('ui.store.subscriptions.timeline.subscription', 'Subscription')}</p><h3 className="mt-2 text-xl font-black tracking-[-0.03em] text-[#352214]">{delivery.subscription_name}</h3><div className="mt-3 flex flex-wrap gap-2">{delivery.items.map((item, index) => <span key={`${delivery.id}-${item.name}-${index}`} className="inline-flex rounded-full bg-[#f3eadf] px-3 py-1 text-xs font-semibold text-[#4f3118]">{item.name} - {quantityLabel(item.quantity, item.unit, locale)}</span>)}</div></div>
              <div className="rounded-[1.25rem] bg-[#f3fbf7] px-4 py-4 text-right"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1f6f55]">{t('ui.store.subscriptions.timeline.value', 'Value')}</p><p className="mt-2 text-lg font-bold text-[#1f6f55]">{money(delivery.total_value, locale)}</p></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
export default function MySubscriptions({ subscriptionRequests = [], activeSubscriptions = [], upcomingDeliveries = [], catalog = { products: [], packs: [] }, customerMeta = {}, summary = {}, initialTab = 'requests' }) {
  const { flash } = usePage().props;
  const { t, tp, locale } = useI18n();
  const [activeTab, setActiveTab] = useState(initialTab || 'requests');
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestForm, setRequestForm] = useState(buildInitialForm(customerMeta));
  const [requestModalMode, setRequestModalMode] = useState('new');
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [processingKey, setProcessingKey] = useState('');
  const [expandedSubscriptionId, setExpandedSubscriptionId] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const flashToastKeyRef = useRef('');
  const tabOptions = useMemo(() => ([
    { key: 'requests', label: t('ui.store.subscriptions.tabs.requests', 'Requests') },
    { key: 'active', label: t('ui.store.subscriptions.tabs.active', 'Subscriptions') },
    { key: 'upcoming', label: t('ui.store.subscriptions.tabs.upcoming', 'Upcoming Deliveries') },
  ]), [t]);

  const counts = useMemo(() => ({ requests: subscriptionRequests.length, active: activeSubscriptions.length, upcoming: upcomingDeliveries.length }), [subscriptionRequests.length, activeSubscriptions.length, upcomingDeliveries.length]);
  const reloadSubscriptionData = () => new Promise((resolve) => router.reload({ only: ['subscriptionRequests', 'activeSubscriptions', 'upcomingDeliveries', 'summary', 'notifications'], preserveScroll: true, onFinish: () => resolve() }));
  const closeRequestModal = () => {
    setRequestModalOpen(false);
    setRequestModalMode('new');
    setRequestForm(buildInitialForm(customerMeta));
    setFormErrors({});
  };
  const openNewRequestModal = () => {
    setRequestModalMode('new');
    setRequestForm(buildInitialForm(customerMeta));
    setFormErrors({});
    setRequestModalOpen(true);
  };
  const openSendOfferModal = (request) => {
    setRequestModalMode('resend');
    setRequestForm(buildPrefilledFormFromRequest(request, customerMeta));
    setFormErrors({});
    setRequestModalOpen(true);
  };

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
      toast.error(message, { duration: TOAST_DURATION_MS });
      return;
    }

    toast.success(message, { duration: TOAST_DURATION_MS });
  }, [flash?.error, flash?.success]);

  const submitRequest = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormErrors({});

    const payload = {
      items: requestForm.items.map((item) => ({ item_type: item.item_type, product_id: item.product_id, pack_id: item.pack_id, quantity: Number(item.quantity || 0) })),
      resubmitted_from_request_id: requestForm.resubmitted_from_request_id,
      frequency: requestForm.frequency,
      delivery_days: ['weekly', 'custom'].includes(requestForm.frequency) ? requestForm.delivery_days : [],
      start_date: requestForm.start_date,
      end_date: requestForm.end_date,
      delivery_address: requestForm.delivery_address,
      notes: requestForm.notes,
      offered_price: Number(requestForm.offered_price || 0),
    };

    try {
      await window.axios.post('/my-subscriptions/requests', payload);
      await reloadSubscriptionData();
      closeRequestModal();
      setActiveTab('requests');
    } catch (error) {
      if (error.response?.status === 422) {
        setFormErrors(error.response.data?.errors || {});
      } else {
        toast.error(error.response?.data?.message || t('ui.store.subscriptions.messages.submit_error', 'We could not submit your subscription request. Please try again.'), { duration: TOAST_DURATION_MS });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptQuote = async (requestId) => {
    setProcessingKey(`accept-${requestId}`);
    try {
      await window.axios.post(`/my-subscriptions/requests/${requestId}/accept-quote`);
      await reloadSubscriptionData();
      setActiveTab('active');
    } catch (error) {
      toast.error(error.response?.data?.message || t('ui.store.subscriptions.messages.accept_error', 'We could not accept this quote right now.'), { duration: TOAST_DURATION_MS });
    } finally {
      setProcessingKey('');
    }
  };

  const confirmRejectQuote = (request) => setConfirmState({ title: t('ui.store.subscriptions.confirm.reject_title', 'Reject Quote?'), message: tp('ui.store.subscriptions.confirm.reject_message', 'This will close :request. You can always create a new subscription request later.', { request: request.request_number }), confirmText: t('ui.store.subscriptions.confirm.reject_confirm', 'Reject Quote'), type: 'danger', onConfirm: async () => {
    setProcessingKey(`reject-${request.id}`);
    try { const response = await window.axios.post(`/my-subscriptions/requests/${request.id}/reject-quote`, { response_message: t('ui.store.subscriptions.messages.quote_rejected_by_customer', 'Quote rejected by customer.') }); await reloadSubscriptionData(); setActiveTab('requests'); toast.success(response.data?.message || t('ui.store.subscriptions.messages.reject_success', 'Quote rejected successfully.'), { duration: TOAST_DURATION_MS }); }
    catch (error) { toast.error(error.response?.data?.message || t('ui.store.subscriptions.messages.reject_error', 'We could not reject this quote right now.'), { duration: TOAST_DURATION_MS }); }
    finally { setProcessingKey(''); }
  } });

  const handleSubscriptionAction = (action, subscription) => {
    const config = {
      pause: { path: `/my-subscriptions/${subscription.id}/pause`, method: 'patch', success: t('ui.store.subscriptions.messages.pause_success', 'Subscription paused successfully.') },
      resume: { path: `/my-subscriptions/${subscription.id}/resume`, method: 'patch', success: t('ui.store.subscriptions.messages.resume_success', 'Subscription resumed successfully.') },
      skip: { path: `/my-subscriptions/${subscription.id}/skip-next-delivery`, method: 'patch', success: t('ui.store.subscriptions.messages.skip_success', 'Next delivery skipped successfully.'), confirm: { title: t('ui.store.subscriptions.confirm.skip_title', 'Skip Next Delivery?'), message: tp('ui.store.subscriptions.confirm.skip_message', 'We will move the next scheduled delivery for :subscription forward to the following valid delivery date.', { subscription: subscription.name }), confirmText: t('ui.store.subscriptions.confirm.skip_confirm', 'Skip Delivery'), type: 'warning' } },
      cancel: { path: `/my-subscriptions/${subscription.id}/cancel`, method: 'patch', success: t('ui.store.subscriptions.messages.cancel_success', 'Subscription cancelled successfully.'), confirm: { title: t('ui.store.subscriptions.confirm.cancel_title', 'Cancel Subscription?'), message: tp('ui.store.subscriptions.confirm.cancel_message', 'This will stop future deliveries for :subscription. Existing history will remain visible.', { subscription: subscription.name }), confirmText: t('ui.store.subscriptions.confirm.cancel_confirm', 'Cancel Subscription'), type: 'danger' } },
    }[action];

    const run = async () => {
      setProcessingKey(`${action}-${subscription.id}`);
      try {
        const response = await window.axios[config.method](config.path);
        await reloadSubscriptionData();
        setActiveTab(action === 'skip' ? 'upcoming' : 'active');
        toast.success(response.data?.message || config.success, { duration: TOAST_DURATION_MS });
      } catch (error) {
        toast.error(error.response?.data?.message || t('ui.store.subscriptions.messages.update_error', 'We could not update that subscription right now.'), { duration: TOAST_DURATION_MS });
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
  const requestModalTitle = requestModalMode === 'resend' ? t('ui.store.subscriptions.actions.send_new_offer', 'Send New Offer') : t('ui.store.subscriptions.actions.new_request', 'New Subscription Request');
  const requestModalDescription = requestModalMode === 'resend'
    ? t('ui.store.subscriptions.request_form.resend_description', 'We filled in your previous request so you can adjust the items, dates, and offer before sending it back to the back office team.')
    : t('ui.store.subscriptions.request_form.new_description', 'Choose your preferred items, delivery period, and offer. Our team will review the request and send you a quote within 24 hours.');
  const requestModalSubmitLabel = requestModalMode === 'resend' ? t('ui.store.subscriptions.actions.send_offer', 'Send Offer') : t('ui.store.subscriptions.actions.submit_request', 'Submit Request');

  return (
    <StoreLayout title={t('ui.store.subscriptions.title', 'My Subscriptions')} subtitle={t('ui.store.subscriptions.subtitle', 'Create delivery requests, review admin quotes, and manage your recurring deliveries from one place.')}>
      <RequestFormModal open={requestModalOpen} onClose={closeRequestModal} form={requestForm} setForm={setRequestForm} products={catalog.products || []} packs={catalog.packs || []} errors={formErrors} submitting={submitting} onSubmit={submitRequest} title={requestModalTitle} description={requestModalDescription} submitLabel={requestModalSubmitLabel} />
      <ConfirmModal isOpen={Boolean(confirmState)} onClose={() => setConfirmState(null)} onConfirm={() => confirmState?.onConfirm?.()} title={confirmState?.title} message={confirmState?.message} confirmText={confirmState?.confirmText} type={confirmState?.type || 'warning'} />

      <div className="space-y-8">
        <section className="grid gap-4 lg:grid-cols-4">
          <SummaryCard label={t('ui.store.subscriptions.summary.pending_requests_label', 'Pending Requests')} value={summary?.pending_requests ?? 0} helper={t('ui.store.subscriptions.summary.pending_requests_helper', 'Requests waiting for admin review')} icon={Clock3} />
          <SummaryCard label={t('ui.store.subscriptions.summary.quoted_requests_label', 'Quoted Requests')} value={summary?.quoted_requests ?? 0} helper={t('ui.store.subscriptions.summary.quoted_requests_helper', 'Quotes waiting for your decision')} icon={Tag} />
          <SummaryCard label={t('ui.store.subscriptions.summary.active_subscriptions_label', 'Active Subscriptions')} value={summary?.active_subscriptions ?? 0} helper={t('ui.store.subscriptions.summary.active_subscriptions_helper', 'Recurring plans currently live')} icon={Repeat2} />
          <SummaryCard label={t('ui.store.subscriptions.summary.next_delivery_label', 'Next Delivery')} value={summary?.next_delivery?.delivery_date ? shortDateWithWeekday(summary.next_delivery.delivery_date, locale) : t('ui.store.subscriptions.summary.no_delivery', 'No delivery')} helper={summary?.next_delivery?.subscription_name || t('ui.store.subscriptions.summary.next_delivery_helper', 'Accept a quote to schedule deliveries')} icon={Truck} />
        </section>

        <section className="rounded-[2rem] border border-[#eadfce] bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2 rounded-[1.25rem] bg-[#f4ede3] p-2">{tabOptions.map((tab) => <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`inline-flex items-center rounded-[1rem] px-4 py-2.5 text-sm font-semibold transition ${activeTab === tab.key ? 'bg-[#4f3118] text-white shadow-sm' : 'text-[#6b4a2b] hover:bg-white'}`}>{tab.label}<span className={`ml-2 inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[11px] ${activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-white text-[#6b4a2b]'}`}>{counts[tab.key]}</span></button>)}</div>
            <button type="button" onClick={openNewRequestModal} className="inline-flex items-center justify-center rounded-[1.05rem] bg-[#4f3118] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3f2513]"><Plus size={18} className="mr-2" />{t('ui.store.subscriptions.actions.new_request', 'New Subscription Request')}</button>
          </div>
        </section>

        {activeTab === 'requests' ? <section className="space-y-5">{subscriptionRequests.length > 0 ? subscriptionRequests.map((request) => <RequestCard key={request.id} request={request} onAccept={handleAcceptQuote} onReject={confirmRejectQuote} onOpenSubscription={openSubscriptionFromRequest} onSendNewOffer={openSendOfferModal} processingKey={processingKey} />) : <EmptyState title={t('ui.store.subscriptions.empty.no_requests_title', 'No subscription requests yet')} description={t('ui.store.subscriptions.empty.no_requests_description', 'Start a subscription request with your preferred products, delivery days, start date, end date, and offer. Once the team responds with a quote, you can accept it here and the subscription will move into your active plans.')} action={<button type="button" onClick={openNewRequestModal} className="inline-flex items-center justify-center rounded-xl bg-[#4f3118] px-5 py-3 text-sm font-semibold text-white"><Plus size={18} className="mr-2" />{t('ui.store.subscriptions.actions.create_first_request', 'Create your first request')}</button>} />}</section> : null}

        {activeTab === 'active' ? <section className="space-y-5">{activeSubscriptions.length > 0 ? activeSubscriptions.map((subscription) => <SubscriptionCard key={subscription.id} subscription={subscription} expanded={expandedSubscriptionId === subscription.id} onToggleExpand={(subscriptionId) => setExpandedSubscriptionId((current) => current === subscriptionId ? null : subscriptionId)} onAction={handleSubscriptionAction} processingKey={processingKey} />) : <EmptyState title={t('ui.store.subscriptions.empty.no_subscriptions_title', 'No subscriptions yet')} description={t('ui.store.subscriptions.empty.no_subscriptions_description', 'Accepted quotes will move here automatically. Paid subscriptions can be paused, resumed, cancelled, and skipped from this tab.')} />}</section> : null}

        {activeTab === 'upcoming' ? <section><DeliveryTimeline deliveries={upcomingDeliveries} /></section> : null}

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-[1.75rem] border-[#eadfce] bg-white shadow-sm"><CardContent className="px-[0.4cm] pb-[0.35cm] pt-[0.45cm]"><div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f4ede3] text-[#6b4829]"><CalendarDays size={18} /></div><div className="flex min-h-[3.5rem] flex-col justify-center"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8b7255]">{t('ui.store.subscriptions.info.request_process_title', 'Request process')}</p><p className="mt-1 text-sm text-[#7d6247]">{t('ui.store.subscriptions.info.request_process_description', 'Submit your preferred items, delivery schedule, and service dates.')}</p></div></div></CardContent></Card>
          <Card className="rounded-[1.75rem] border-[#eadfce] bg-white shadow-sm"><CardContent className="px-[0.4cm] pb-[0.35cm] pt-[0.45cm]"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4ede3] text-[#6b4829]"><CheckCircle2 size={18} /></div><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8b7255]">{t('ui.store.subscriptions.info.quote_approval_title', 'Quote approval')}</p><p className="mt-1 text-sm text-[#7d6247]">{t('ui.store.subscriptions.info.quote_approval_description', 'Review the admin quote, accept it, or reject it from the Requests tab.')}</p></div></div></CardContent></Card>
          <Card className="rounded-[1.75rem] border-[#eadfce] bg-white shadow-sm"><CardContent className="px-[0.4cm] pb-[0.35cm] pt-[0.45cm]"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4ede3] text-[#6b4829]"><Wallet size={18} /></div><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8b7255]">{t('ui.store.subscriptions.info.recurring_planning_title', 'Recurring planning')}</p><p className="mt-1 text-sm text-[#7d6247]">{t('ui.store.subscriptions.info.recurring_planning_description', 'See the next deliveries and the estimated cost before the next billing cycle.')}</p></div></div></CardContent></Card>
        </section>
      </div>
    </StoreLayout>
  );
}







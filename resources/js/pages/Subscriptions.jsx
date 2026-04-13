import React, { useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import BackofficePagination from '@/components/backoffice/BackofficePagination';
import BackofficePerPageControl from '@/components/backoffice/BackofficePerPageControl';
import { Card, CardContent } from '@/components/ui/Card';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { CalendarDays, Pencil, Plus, Search, Trash2, X } from 'lucide-react';

const frequencyTone = {
  Daily: 'bg-[#efebe6] text-[#5f4328]',
  Weekly: 'bg-[#efebe6] text-[#5f4328]',
  Custom: 'bg-[#efebe6] text-[#5f4328]',
  'Twice Weekly': 'bg-[#efebe6] text-[#5f4328]',
  'Weekdays only': 'bg-[#efebe6] text-[#5f4328]',
  'Weekends only': 'bg-[#efebe6] text-[#5f4328]',
};

const statusTone = {
  Active: 'bg-emerald-100 text-emerald-700',
  Paused: 'bg-amber-100 text-amber-700',
  Inactive: 'bg-slate-100 text-slate-600',
};

const requestStatusTone = {
  pending_review: 'bg-amber-100 text-amber-700',
  quoted: 'bg-sky-100 text-sky-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
  expired: 'bg-slate-100 text-slate-700',
};

const seedTemplates = [
  {
    frequency: 'Weekly',
    delivery_days: ['Friday'],
    products: ['Premium Ribeye - 2kg', 'Ground Beef - 3kg', 'Chicken Breast - 2kg'],
    value: 95500,
    next_delivery: '2026-02-28',
    status: 'Active',
  },
  {
    frequency: 'Custom',
    delivery_days: ['First Saturday'],
    products: ['Mixed Pack - 10kg', 'Sausages - 2kg'],
    value: 180000,
    next_delivery: '2026-03-01',
    status: 'Active',
  },
  {
    frequency: 'Twice Weekly',
    delivery_days: ['Tuesday', 'Thursday'],
    products: ['Pork Chops - 2kg', 'Bacon - 1kg'],
    value: 78900,
    next_delivery: '2026-02-27',
    status: 'Active',
  },
  {
    frequency: 'Daily',
    delivery_days: ['Weekdays'],
    products: ['Mixed Pack - 5kg'],
    value: 450000,
    next_delivery: '2026-02-27',
    status: 'Active',
  },
];

const weekdayOptions = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const dayAbbreviationMap = {
  Monday: 'Mon',
  Mon: 'Mon',
  Tuesday: 'Tue',
  Tue: 'Tue',
  Wednesday: 'Wed',
  Wed: 'Wed',
  Thursday: 'Thu',
  Thu: 'Thu',
  Friday: 'Fri',
  Fri: 'Fri',
  Saturday: 'Sat',
  Sat: 'Sat',
  Sunday: 'Sun',
  Sun: 'Sun',
  Weekdays: 'Mon-Fri',
  'Weekdays only': 'Mon-Fri',
  Weekends: 'Sat-Sun',
  'Weekends only': 'Sat-Sun',
  'First Saturday': 'Sat',
};

function abbreviateDeliveryDay(value) {
  const key = String(value || '').trim();
  return dayAbbreviationMap[key] || key;
}

function normalizeDeliveryDays(days = []) {
  return Array.from(
    new Set(
      (Array.isArray(days) ? days : [])
        .map((day) => abbreviateDeliveryDay(day))
        .filter(Boolean),
    ),
  );
}

function money(value) {
  return `Tsh ${new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 }).format(value || 0)}`;
}

function normalizePhone(value) {
  return value || '+255 700 000 000';
}

function productLabel(product) {
  return `${product.name} - ${new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 2 }).format(product.quantity)} ${product.unit || 'pcs'}`;
}

function quantityLabel(quantity, unit) {
  return `${new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 2 }).format(quantity || 0)} ${unit || 'pcs'}`;
}

function requestItemsPreview(items = []) {
  const normalizedItems = Array.isArray(items) ? items : [];

  if (normalizedItems.length === 0) {
    return 'No items listed';
  }

  const topItems = normalizedItems
    .slice(0, 2)
    .map((item) => `${item.name} (${quantityLabel(item.quantity, item.unit)})`);
  const moreCount = normalizedItems.length - topItems.length;

  return moreCount > 0 ? `${topItems.join(', ')} +${moreCount} more` : topItems.join(', ');
}

function buildInitialSubscriptions(customers = []) {
  return customers.slice(0, Math.max(customers.length, 4)).map((customer, index) => {
    const template = seedTemplates[index % seedTemplates.length];

    return {
      id: customer.id ?? `seed-${index + 1}`,
      customer_id: customer.id ?? null,
      customer_name: customer.full_name,
      phone: normalizePhone(customer.phone),
      email: customer.email || '',
      frequency: template.frequency,
      delivery_days: normalizeDeliveryDays(template.delivery_days),
      products: template.products.map((product, productIndex) => ({
        id: `seed-product-${index + 1}-${productIndex + 1}`,
        product_id: null,
        name: product,
        quantity: 1,
        unit: 'pack',
        unit_price: 0,
        total_price: 0,
        label: product,
      })),
      value: template.value,
      next_delivery: template.next_delivery,
      status: template.status,
    };
  });
}

function SubscriptionModal({ subscription, customers, products, onClose, onSave }) {
  const isEditing = Boolean(subscription?.id);
  if (!subscription) {
    return null;
  }

  const buildForm = (currentSubscription) => ({
    customer_id: currentSubscription?.customer_id || '',
    customer_name: currentSubscription?.customer_name || '',
    phone: currentSubscription?.phone || '',
    email: currentSubscription?.email || '',
    frequency: currentSubscription?.frequency || 'Daily',
    delivery_days: normalizeDeliveryDays(currentSubscription?.delivery_days || []),
    products: currentSubscription?.products || [],
    selected_product_id: '',
    selected_quantity: '1',
    start_date: currentSubscription?.next_delivery || '',
    status: currentSubscription?.status || 'Active',
    value: currentSubscription?.value ? String(currentSubscription.value) : '',
  });

  const [form, setForm] = useState(() => buildForm(subscription));

  useEffect(() => {
    setForm(buildForm(subscription));
  }, [subscription]);

  const toggleDay = (day) => {
    setForm((current) => ({
      ...current,
      delivery_days: current.delivery_days.includes(day)
        ? current.delivery_days.filter((item) => item !== day)
        : [...current.delivery_days, day],
    }));
  };

  const applyCustomer = (customerId) => {
    const selectedCustomer = customers.find((customer) => String(customer.id) === String(customerId));

    setForm((current) => ({
      ...current,
      customer_id: customerId,
      customer_name: selectedCustomer?.full_name || current.customer_name,
      phone: selectedCustomer?.phone || current.phone,
      email: selectedCustomer?.email || current.email,
    }));
  };

  const addProduct = () => {
    const selectedProduct = products.find((product) => String(product.id) === String(form.selected_product_id));
    const quantity = Number(form.selected_quantity || 0);

    if (!selectedProduct || quantity <= 0) {
      return;
    }

    const nextProduct = {
      id: `line-${Date.now()}`,
      product_id: selectedProduct.id,
      name: selectedProduct.name,
      quantity,
      unit: selectedProduct.unit || 'pcs',
      label: `${selectedProduct.name} - ${new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 2 }).format(quantity)} ${selectedProduct.unit || 'pcs'}`,
    };

    setForm((current) => ({
      ...current,
      products: [...current.products, nextProduct],
      selected_product_id: '',
      selected_quantity: '1',
    }));
  };

  const removeProduct = (productId) => {
    setForm((current) => ({
      ...current,
      products: current.products.filter((item) => item.id !== productId),
    }));
  };

  const submit = (event) => {
    event.preventDefault();

    onSave({
      ...subscription,
      ...form,
      phone: normalizePhone(form.phone),
      delivery_days: normalizeDeliveryDays(form.delivery_days),
      value: Number(form.value || 0),
      next_delivery: form.start_date || subscription?.next_delivery || '',
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-6">
      <div className="my-auto max-h-[90vh] w-full max-w-[960px] overflow-y-auto rounded-[1.75rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between px-8 py-7">
          <div>
            <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-[#3a2513]">
              {isEditing ? 'Edit Subscription' : 'Create New Subscription'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#6d5036] transition hover:bg-[#f3ede5]"
            aria-label="Close subscription modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-6 px-8 pb-8">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-[1rem] font-semibold text-[#3a2513]">Select Customer</label>
              <select
                value={form.customer_id}
                onChange={(event) => applyCustomer(event.target.value)}
                className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
              >
                <option value="">Choose customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-[1rem] font-semibold text-[#3a2513]">Customer Name</label>
              <input
                type="text"
                value={form.customer_name}
                onChange={(event) => setForm((current) => ({ ...current, customer_name: event.target.value }))}
                placeholder="Enter customer name"
                className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
              />
            </div>
            <div>
              <label className="mb-2 block text-[1rem] font-semibold text-[#3a2513]">Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="+255 712 345 678"
                className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
              />
            </div>
            <div>
              <label className="mb-2 block text-[1rem] font-semibold text-[#3a2513]">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="customer@email.com"
                className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
              />
            </div>
            <div>
              <label className="mb-2 block text-[1rem] font-semibold text-[#3a2513]">Frequency</label>
              <select
                value={form.frequency}
                onChange={(event) => setForm((current) => ({ ...current, frequency: event.target.value }))}
                className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
              >
                {['Daily', 'Weekly', 'Twice Weekly', 'Custom', 'Weekdays only', 'Weekends only'].map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[1rem] font-semibold text-[#3a2513]">Subscription Value (Tsh)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.value}
              onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
              placeholder="Enter agreed subscription amount"
              className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
            />
          </div>

          <div>
            <label className="mb-3 block text-[1rem] font-semibold text-[#3a2513]">Delivery Days</label>
            <div className="grid gap-3 md:grid-cols-4">
              {weekdayOptions.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`h-12 rounded-xl border text-[1rem] font-semibold transition ${
                    form.delivery_days.includes(day)
                      ? 'border-[#4f3118] bg-[#4f3118] text-white'
                      : 'border-[#dcccba] bg-white text-[#4f3118]'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-4">
              <label className="text-[1rem] font-semibold text-[#3a2513]">Products</label>
              <button
                type="button"
                onClick={addProduct}
                className="text-[1rem] font-semibold text-[#8a5a2d]"
              >
                + Add Product
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
                <select
                  value={form.selected_product_id}
                  onChange={(event) => setForm((current) => ({ ...current, selected_product_id: event.target.value }))}
                  className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
                >
                  <option value="">Choose product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.selected_quantity}
                  onChange={(event) => setForm((current) => ({ ...current, selected_quantity: event.target.value }))}
                  placeholder="Quantity"
                  className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
                />
              </div>
              {form.products.length > 0 ? (
                <div className="space-y-2">
                  {form.products.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => removeProduct(product.id)}
                      className="flex w-full items-center justify-between rounded-xl bg-[#f3ede5] px-4 py-3 text-left text-sm font-medium text-[#4f3118]"
                    >
                      <span>{product.label || productLabel(product)}</span>
                      <span className="text-[#8a5a2d]">Remove</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[1rem] font-semibold text-[#3a2513]">Start Date</label>
            <input
              type="date"
              value={form.start_date}
              onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))}
              className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={onClose}
              className="h-14 rounded-xl border border-[#d9c4a9] bg-white text-[1rem] font-semibold text-[#4f3118]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-14 rounded-xl bg-[#4f3118] text-[1rem] font-semibold text-white transition hover:bg-[#402612]"
            >
              {isEditing ? 'Save Subscription' : 'Create Subscription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuoteRequestModal({ requestItem, form, setForm, submitting, onClose, onSubmit }) {
  if (!requestItem) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-6">
      <div className="my-auto w-full max-w-[720px] overflow-hidden rounded-[1.75rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between px-8 py-7">
          <div>
            <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-[#3a2513]">Send Quote</h2>
            <p className="mt-1 text-sm text-[#73563a]">
              {requestItem.request_number} • {requestItem.customer_name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#6d5036] transition hover:bg-[#f3ede5]"
            aria-label="Close quote modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-6 px-8 pb-8">
          <div className="rounded-xl border border-[#eadcca] bg-[#faf5ee] px-5 py-4">
            <p className="text-sm font-semibold text-[#4f3118]">Client offered: {money(requestItem.offered_price)}</p>
            <p className="mt-2 text-sm text-[#6f5238]">{requestItemsPreview(requestItem.items)}</p>
          </div>

          <div>
            <label className="mb-2 block text-[1rem] font-semibold text-[#3a2513]">Quoted Price (Tsh)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={form.quoted_price}
              onChange={(event) => setForm((current) => ({ ...current, quoted_price: event.target.value }))}
              className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
              placeholder="Enter the final quoted amount"
            />
          </div>

          <div>
            <label className="mb-2 block text-[1rem] font-semibold text-[#3a2513]">Quote Valid Until</label>
            <input
              type="date"
              value={form.quote_valid_until}
              onChange={(event) => setForm((current) => ({ ...current, quote_valid_until: event.target.value }))}
              className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
            />
          </div>

          <div>
            <label className="mb-2 block text-[1rem] font-semibold text-[#3a2513]">Message to Client</label>
            <textarea
              value={form.quoted_message}
              onChange={(event) => setForm((current) => ({ ...current, quoted_message: event.target.value }))}
              rows={4}
              className="w-full rounded-xl border border-[#dcccba] bg-white px-5 py-4 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
              placeholder="Optional note for the client"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={onClose}
              className="h-14 rounded-xl border border-[#d9c4a9] bg-white text-[1rem] font-semibold text-[#4f3118]"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-14 rounded-xl bg-[#4f3118] text-[1rem] font-semibold text-white transition hover:bg-[#402612] disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? 'Sending quote...' : 'Send Quote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Subscriptions({ auth, customers = [], products = [], subscriptions = [], subscriptionRequests = [], perPageOptions = [50, 100, 250, 500] }) {
  const productChoices = products;
  const subscriptionsRows = useMemo(() => subscriptions, [subscriptions]);
  const subscriptionRequestRows = useMemo(() => subscriptionRequests, [subscriptionRequests]);
  const hasSubscriptionRequests = subscriptionRequestRows.length > 0;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [perPage, setPerPage] = useState(perPageOptions[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [deletingSubscription, setDeletingSubscription] = useState(null);
  const [activeQuoteRequest, setActiveQuoteRequest] = useState(null);
  const [quoteForm, setQuoteForm] = useState({
    quoted_price: '',
    quoted_message: '',
    quote_valid_until: '',
  });
  const [quotingRequest, setQuotingRequest] = useState(false);

  const filteredRows = useMemo(() => {
    return subscriptionsRows.filter((subscription) => {
      const matchesSearch = !search.trim() || [
        subscription.customer_name,
        subscription.phone,
        subscription.frequency,
        subscription.delivery_days.join(', '),
      ].join(' ').toLowerCase().includes(search.trim().toLowerCase());

      const matchesStatus = !statusFilter || subscription.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, subscriptionsRows]);

  const filteredRequestRows = useMemo(() => {
    const needle = search.trim().toLowerCase();

    if (!needle) {
      return subscriptionRequestRows;
    }

    return subscriptionRequestRows.filter((requestItem) => {
      const requestText = [
        requestItem.request_number,
        requestItem.customer_name,
        requestItem.phone,
        requestItem.email,
        requestItem.frequency,
        requestItem.status_label,
        requestItem.delivery_days_label,
        (requestItem.items || []).map((item) => item.name).join(' '),
      ].join(' ').toLowerCase();

      return requestText.includes(needle);
    });
  }, [search, subscriptionRequestRows]);

  const visibleRows = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredRows.slice(start, start + perPage);
  }, [currentPage, filteredRows, perPage]);

  const totalPages = useMemo(() => {
    const pages = Math.ceil(filteredRows.length / perPage);
    return Math.max(1, pages || 1);
  }, [filteredRows.length, perPage]);
  const from = filteredRows.length === 0 ? 0 : ((currentPage - 1) * perPage) + 1;
  const to = filteredRows.length === 0 ? 0 : Math.min(currentPage * perPage, filteredRows.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, perPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const saveSubscription = (payload) => {
    const options = {
      preserveScroll: true,
      preserveState: false,
      onSuccess: () => setActiveSubscription(null),
    };

    if (payload.id) {
      router.put(`/fat-clients/subscriptions/${payload.id}`, payload, options);
      return;
    }

    router.post('/fat-clients/subscriptions', payload, options);
  };

  const openQuoteModal = (requestItem) => {
    setActiveQuoteRequest(requestItem);
    setQuoteForm({
      quoted_price: requestItem.quoted_price ?? requestItem.offered_price ?? '',
      quoted_message: requestItem.quoted_message || '',
      quote_valid_until: requestItem.quote_valid_until || '',
    });
  };

  const submitQuote = (event) => {
    event.preventDefault();

    if (!activeQuoteRequest) {
      return;
    }

    setQuotingRequest(true);

    router.patch(`/fat-clients/subscription-requests/${activeQuoteRequest.id}/quote`, {
      quoted_price: quoteForm.quoted_price,
      quoted_message: quoteForm.quoted_message || null,
      quote_valid_until: quoteForm.quote_valid_until || null,
    }, {
      preserveScroll: true,
      preserveState: false,
      onSuccess: () => setActiveQuoteRequest(null),
      onFinish: () => setQuotingRequest(false),
    });
  };

  return (
    <AppLayout user={auth?.user}>
      <SubscriptionModal
        subscription={activeSubscription}
        customers={customers}
        products={productChoices}
        onClose={() => setActiveSubscription(null)}
        onSave={saveSubscription}
      />

      <QuoteRequestModal
        requestItem={activeQuoteRequest}
        form={quoteForm}
        setForm={setQuoteForm}
        submitting={quotingRequest}
        onClose={() => setActiveQuoteRequest(null)}
        onSubmit={submitQuote}
      />

      <ConfirmModal
        isOpen={Boolean(deletingSubscription)}
        onClose={() => setDeletingSubscription(null)}
        onConfirm={() => {
          if (deletingSubscription) {
            router.delete(`/fat-clients/subscriptions/${deletingSubscription.id}`, {
              preserveScroll: true,
              preserveState: false,
              onSuccess: () => setDeletingSubscription(null),
            });
          }
        }}
        title="Delete Subscription"
        message={deletingSubscription ? `You are deleting the subscription for ${deletingSubscription.customer_name}. This action cannot be undone.` : ''}
        confirmText="Delete"
        type="danger"
      />

      <div className="space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[2.45rem] font-semibold tracking-[-0.04em] text-[#3a2513]">Subscriptions</h1>
            <p className="mt-2 text-[0.95rem] text-[#73563a]">Manage customer subscriptions and delivery schedules</p>
          </div>

          <button
            type="button"
            onClick={() => setActiveSubscription({})}
            className="inline-flex items-center gap-3 self-start rounded-[1.05rem] bg-[#4f3118] px-6 py-3.5 text-[1.05rem] font-semibold text-white transition hover:bg-[#402612]"
          >
            <Plus className="h-5 w-5" strokeWidth={2.25} />
            New Subscription
          </button>
        </div>

        <div className="flex items-center gap-4 overflow-x-auto">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#866748]" strokeWidth={2} />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search subscriptions..."
              className="h-14 w-full rounded-[1.05rem] border border-[#dcccba] bg-white pl-14 pr-4 text-[1rem] text-[#3a2513] outline-none transition placeholder:text-[#b09983] focus:border-[#b69066]"
            />
          </div>

          <div className="flex h-14 w-[52px] shrink-0 items-center justify-center rounded-[1.05rem] border border-[#dcccba] bg-white text-[#7a5b3d]">
            <CalendarDays className="h-5 w-5" strokeWidth={2} />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-14 w-[170px] shrink-0 rounded-[1.05rem] border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
          >
            <option value="">All</option>
            <option value="Active">Active</option>
            <option value="Paused">Paused</option>
            <option value="Inactive">Inactive</option>
          </select>

          <BackofficePerPageControl
            options={perPageOptions}
            value={perPage}
            name="subscriptions_per_page"
            onChange={(event) => setPerPage(Number(event.target.value))}
          />
        </div>

        {hasSubscriptionRequests ? (
          <Card className="overflow-hidden rounded-[1.35rem] border border-[#e0d1bf] bg-white shadow-none">
            <CardContent className="p-0">
              <div className="border-b border-[#eadcca] bg-[#f7efe4] px-8 py-5">
                <h2 className="text-[1.2rem] font-semibold text-[#3a2513]">Subscription Requests</h2>
                <p className="mt-1 text-sm text-[#6f5238]">
                  {filteredRequestRows.length} request{filteredRequestRows.length === 1 ? '' : 's'} currently visible
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-[#ede1cf]">
                    <tr>
                      {['Request', 'Client', 'Schedule', 'Items', 'Pricing', 'Status', 'Action'].map((header) => (
                        <th key={header} className="px-8 py-5 text-[1rem] font-semibold text-[#2f2115]">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequestRows.length > 0 ? filteredRequestRows.map((requestItem, index) => (
                      <tr key={requestItem.id} className={`${index !== filteredRequestRows.length - 1 ? 'border-b border-[#eadcca]' : ''} bg-white`}>
                        <td className="px-8 py-6">
                          <p className="text-[1.02rem] font-semibold text-[#352314]">{requestItem.request_number}</p>
                          <p className="mt-1 text-[0.92rem] text-[#6f5238]">{requestItem.submitted_date_label || 'N/A'}</p>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-[1.02rem] font-semibold text-[#352314]">{requestItem.customer_name}</p>
                          <p className="mt-1 text-[0.92rem] text-[#6f5238]">{requestItem.phone || 'No phone'}</p>
                          <p className="mt-1 text-[0.86rem] text-[#8a6d4d]">{requestItem.email || 'No email'}</p>
                        </td>
                        <td className="px-8 py-6 text-[0.95rem] text-[#5f4328]">
                          <p className="font-semibold">{requestItem.frequency}</p>
                          <p className="mt-1">{requestItem.delivery_days_label}</p>
                          <p className="mt-1 text-[0.85rem] text-[#8a6d4d]">Start: {requestItem.start_date_label || 'N/A'}</p>
                        </td>
                        <td className="px-8 py-6 text-[0.95rem] text-[#5f4328]">
                          {requestItemsPreview(requestItem.items)}
                        </td>
                        <td className="px-8 py-6 text-[0.95rem] text-[#5f4328]">
                          <p>Offered: <span className="font-semibold text-[#352314]">{money(requestItem.offered_price)}</span></p>
                          <p className="mt-1">Quoted: <span className="font-semibold text-[#352314]">{requestItem.quoted_price !== null ? money(requestItem.quoted_price) : 'Pending'}</span></p>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`inline-flex rounded-full px-4 py-2 text-[0.9rem] font-medium ${requestStatusTone[requestItem.status] || 'bg-slate-100 text-slate-700'}`}>
                            {requestItem.status_label}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          {requestItem.can_quote ? (
                            <button
                              type="button"
                              onClick={() => openQuoteModal(requestItem)}
                              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#4f3118] px-4 text-sm font-semibold text-white transition hover:bg-[#402612]"
                            >
                              {requestItem.status === 'quoted' ? 'Update Quote' : 'Send Quote'}
                            </button>
                          ) : requestItem.status === 'rejected' ? (
                            <div className="max-w-[16rem] text-sm text-rose-700">
                              <p className="font-semibold">Rejected by customer</p>
                              <p className="mt-1 text-[#8f4b4b]">
                                {requestItem.rejection_reason || requestItem.response_message || 'This request was rejected.'}
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-[#7a5c3e]">No action available</span>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={7} className="px-8 py-12 text-center">
                          <p className="text-lg font-medium text-[#4d3218]">No matching subscription requests.</p>
                          <p className="mt-2 text-sm text-[#7a5c3e]">Try another search term.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="overflow-hidden rounded-[1.35rem] border border-[#e0d1bf] bg-white shadow-none">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-[#ede1cf]">
                  <tr>
                    {['Customer', 'Frequency', 'Delivery Days', 'Products', 'Value', 'Next Delivery', 'Status', 'Actions'].map((header) => (
                      <th key={header} className="px-8 py-5 text-[1rem] font-semibold text-[#2f2115]">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.length > 0 ? visibleRows.map((subscription, index) => (
                    <tr key={subscription.id} className={`${index !== visibleRows.length - 1 ? 'border-b border-[#eadcca]' : ''} bg-white`}>
                      <td className="px-8 py-6">
                        <p className="text-[1.05rem] font-semibold text-[#352314]">{subscription.customer_name}</p>
                        <p className="mt-1 text-[0.95rem] text-[#6f5238]">{subscription.phone}</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`inline-flex rounded-full px-4 py-2 text-[1rem] font-medium ${frequencyTone[subscription.frequency] || 'bg-[#efebe6] text-[#5f4328]'}`}>
                          {subscription.frequency}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-[1.05rem] text-[#5f4328]">{normalizeDeliveryDays(subscription.delivery_days).join(', ')}</td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          {subscription.products.map((product) => (
                            <p key={product.id} className="text-[0.98rem] text-[#5f4328]">{product.label || productLabel(product)}</p>
                          ))}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-[1.1rem] font-semibold text-[#352314]">{money(subscription.value)}</td>
                      <td className="px-8 py-6 text-[1.05rem] text-[#5f4328]">{subscription.next_delivery || 'N/A'}</td>
                      <td className="px-8 py-6">
                        <span className={`inline-flex rounded-full px-4 py-2 text-[1rem] font-medium ${statusTone[subscription.status] || 'bg-slate-100 text-slate-700'}`}>
                          {subscription.status}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-5 text-[#4f3118]">
                          <button
                            type="button"
                            onClick={() => setActiveSubscription(subscription)}
                            className="transition hover:text-[#2f1c0d]"
                            aria-label={`Edit subscription for ${subscription.customer_name}`}
                          >
                            <Pencil className="h-5 w-5" strokeWidth={2} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingSubscription(subscription)}
                            className="transition hover:text-red-600"
                            aria-label={`Delete subscription for ${subscription.customer_name}`}
                          >
                            <Trash2 className="h-5 w-5 text-red-500" strokeWidth={2} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={8} className="px-8 py-12 text-center">
                        <p className="text-lg font-medium text-[#4d3218]">No subscriptions found.</p>
                        <p className="mt-2 text-sm text-[#7a5c3e]">Create a subscription or try another search.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <BackofficePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredRows.length}
          from={from}
          to={to}
        />
      </div>
    </AppLayout>
  );
}

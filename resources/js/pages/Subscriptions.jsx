import React, { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/Card';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { CalendarDays, Pencil, Plus, Search, Trash2, X } from 'lucide-react';

const frequencyTone = {
  Daily: 'bg-[#efebe6] text-[#5f4328]',
  Weekly: 'bg-[#efebe6] text-[#5f4328]',
  Monthly: 'bg-[#efebe6] text-[#5f4328]',
  'Twice Weekly': 'bg-[#efebe6] text-[#5f4328]',
};

const statusTone = {
  Active: 'bg-emerald-100 text-emerald-700',
  Paused: 'bg-amber-100 text-amber-700',
  Inactive: 'bg-slate-100 text-slate-600',
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
    frequency: 'Monthly',
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

function money(value) {
  return `Tsh ${new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 }).format(value || 0)}`;
}

function normalizePhone(value) {
  return value || '+255 700 000 000';
}

function productLabel(product) {
  return `${product.name} - ${new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 2 }).format(product.quantity)} ${product.unit || 'pcs'}`;
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
      delivery_days: template.delivery_days,
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
    delivery_days: currentSubscription?.delivery_days || [],
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
                {['Daily', 'Weekly', 'Twice Weekly', 'Monthly'].map((option) => (
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

export default function Subscriptions({ auth, customers = [], products = [] }) {
  const productChoices = products;
  const [subscriptions, setSubscriptions] = useState(() => buildInitialSubscriptions(customers));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [deletingSubscription, setDeletingSubscription] = useState(null);

  const filteredRows = useMemo(() => {
    return subscriptions.filter((subscription) => {
      const matchesSearch = !search.trim() || [
        subscription.customer_name,
        subscription.phone,
        subscription.frequency,
        subscription.delivery_days.join(', '),
      ].join(' ').toLowerCase().includes(search.trim().toLowerCase());

      const matchesStatus = !statusFilter || subscription.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, subscriptions]);

  const saveSubscription = (payload) => {
    setSubscriptions((current) => {
      if (payload.id && current.some((item) => item.id === payload.id)) {
        return current.map((item) => item.id === payload.id ? {
          ...item,
          ...payload,
          value: payload.value || item.value,
        } : item);
      }

      return [
        {
          ...payload,
          id: `local-${Date.now()}`,
          status: payload.status || 'Active',
          value: Number(payload.value || 0),
        },
        ...current,
      ];
    });

    setActiveSubscription(null);
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

      <ConfirmModal
        isOpen={Boolean(deletingSubscription)}
        onClose={() => setDeletingSubscription(null)}
        onConfirm={() => {
          if (deletingSubscription) {
            setSubscriptions((current) => current.filter((item) => item.id !== deletingSubscription.id));
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
        </div>

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
                  {filteredRows.length > 0 ? filteredRows.map((subscription, index) => (
                    <tr key={subscription.id} className={`${index !== filteredRows.length - 1 ? 'border-b border-[#eadcca]' : ''} bg-white`}>
                      <td className="px-8 py-6">
                        <p className="text-[1.05rem] font-semibold text-[#352314]">{subscription.customer_name}</p>
                        <p className="mt-1 text-[0.95rem] text-[#6f5238]">{subscription.phone}</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`inline-flex rounded-full px-4 py-2 text-[1rem] font-medium ${frequencyTone[subscription.frequency] || 'bg-[#efebe6] text-[#5f4328]'}`}>
                          {subscription.frequency}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-[1.05rem] text-[#5f4328]">{subscription.delivery_days.join(', ')}</td>
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
      </div>
    </AppLayout>
  );
}

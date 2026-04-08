import React, { useEffect, useMemo, useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import BackofficePagination from '@/components/backoffice/BackofficePagination';
import BackofficePerPageControl from '@/components/backoffice/BackofficePerPageControl';
import { Card, CardContent } from '@/components/ui/Card';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Check, Eye, Filter, Pencil, Plus, Search, X } from 'lucide-react';

const money = (value) => `Tzs ${new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 }).format(value || 0)}`;

const formatPayment = (value) => {
  if (!value) {
    return 'N/A';
  }

  return String(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const displayOrderNumber = (value) => String(value || '').replace(/^ORD-?/i, '');

const statusStyles = {
  delivered: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-orange-100 text-orange-700',
  dispatched: 'bg-violet-100 text-violet-700',
  cancelled: 'bg-rose-100 text-rose-700',
};

const fulfillmentStyles = {
  pickup: 'bg-amber-100 text-amber-700',
  delivery: 'bg-sky-100 text-sky-700',
};

const formatFulfillmentMethod = (value) => {
  const normalized = String(value || '').toLowerCase();

  if (normalized === 'pickup') {
    return 'Pickup';
  }

  if (normalized === 'delivery') {
    return 'Delivery';
  }

  return 'N/A';
};

const formatStatusLabel = (value) => {
  const normalized = String(value || '').toLowerCase();

  if (normalized === 'delivered' || normalized === 'completed') {
    return 'Completed';
  }

  if (!normalized) {
    return 'N/A';
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

function OrdersViewModal({ order, onClose }) {
  if (!order) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-6">
      <div className="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#eadcca] px-6 py-5">
          <div>
            <h2 className="text-[1.9rem] font-semibold tracking-[-0.03em] text-[#3a2513]">Order Details</h2>
            <p className="mt-1 text-base text-[#76593d]">{displayOrderNumber(order.order_number)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#6d5036] transition hover:bg-[#f3ede5]"
            aria-label="Close order details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-4 px-6 py-6 md:grid-cols-2">
          <div className="rounded-2xl bg-[#f7f1e8] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c6c4a]">Customer</p>
            <p className="mt-2 text-lg font-semibold text-[#3a2513]">{order.customer}</p>
          </div>
          <div className="rounded-2xl bg-[#f7f1e8] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c6c4a]">Date</p>
            <p className="mt-2 text-lg font-semibold text-[#3a2513]">{order.date}</p>
          </div>
          <div className="rounded-2xl bg-[#f7f1e8] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c6c4a]">Items</p>
            <p className="mt-2 text-lg font-semibold text-[#3a2513]">{order.items} items</p>
          </div>
          <div className="rounded-2xl bg-[#f7f1e8] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c6c4a]">Total</p>
            <p className="mt-2 text-lg font-semibold text-[#3a2513]">{money(order.total)}</p>
          </div>
          <div className="rounded-2xl bg-[#f7f1e8] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c6c4a]">Payment</p>
            <p className="mt-2 text-lg font-semibold text-[#3a2513]">{formatPayment(order.payment)}</p>
          </div>
          <div className="rounded-2xl bg-[#f7f1e8] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c6c4a]">Status</p>
            <p className="mt-2">
              <span className={`inline-flex rounded-full px-4 py-1.5 text-sm font-medium capitalize ${statusStyles[String(order.status).toLowerCase()] || 'bg-slate-100 text-slate-700'}`}>
                {formatStatusLabel(order.status)}
              </span>
            </p>
          </div>
          <div className="rounded-2xl bg-[#f7f1e8] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c6c4a]">Fulfillment</p>
            <p className="mt-2">
              <span className={`inline-flex rounded-full px-4 py-1.5 text-sm font-medium ${fulfillmentStyles[String(order.fulfillment_method).toLowerCase()] || 'bg-slate-100 text-slate-700'}`}>
                {formatFulfillmentMethod(order.fulfillment_method)}
              </span>
            </p>
          </div>
          <div className="rounded-2xl bg-[#f7f1e8] p-4 md:col-span-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c6c4a]">Location</p>
            <p className="mt-2 text-lg font-semibold text-[#3a2513]">{order.location || 'No location recorded'}</p>
          </div>
          <div className="rounded-2xl bg-[#f7f1e8] p-4 md:col-span-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c6c4a]">Tracking</p>
            <p className="mt-2 text-lg font-semibold text-[#3a2513]">{order.tracking_number || 'Awaiting dispatch'}</p>
          </div>
          <div className="rounded-2xl bg-[#f7f1e8] p-4 md:col-span-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c6c4a]">Items Ordered</p>
            <div className="mt-3 space-y-3">
              {(order.line_items || []).length > 0 ? order.line_items.map((item) => (
                <div key={item.id} className="rounded-2xl bg-white px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-[#3a2513]">{item.name}</p>
                      <p className="mt-1 text-sm text-[#76593d]">
                        Qty {item.quantity}{item.unit ? ` • ${String(item.unit).toUpperCase()}` : ''}
                      </p>
                      {item.description ? (
                        <p className="mt-1 text-sm text-[#8c6c4a]">{item.description}</p>
                      ) : null}
                    </div>
                    <p className="text-sm font-semibold text-[#3a2513]">{money(item.subtotal)}</p>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-[#76593d]">No item details available for this order.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrdersEditModal({ order, onClose }) {
  const form = useForm({
    status: order?.status || 'pending',
    payment_method: order?.payment || '',
    delivery_region: order?.delivery_region || '',
    delivery_area: order?.delivery_area || '',
    notes: order?.notes || '',
  });

  React.useEffect(() => {
    form.setData({
      status: order?.status || 'pending',
      payment_method: order?.payment || '',
      delivery_region: order?.delivery_region || '',
      delivery_area: order?.delivery_area || '',
      notes: order?.notes || '',
    });
  }, [order]);

  if (!order) {
    return null;
  }

  const submit = (event) => {
    event.preventDefault();
    form.put(`/orders/${order.id}`, {
      preserveScroll: true,
      onSuccess: () => onClose(),
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-6">
      <div className="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#eadcca] px-6 py-5">
          <div>
            <h2 className="text-[1.9rem] font-semibold tracking-[-0.03em] text-[#3a2513]">Edit Order</h2>
            <p className="mt-1 text-base text-[#76593d]">{displayOrderNumber(order.order_number)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#6d5036] transition hover:bg-[#f3ede5]"
            aria-label="Close order editor"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Status</label>
              <select
                value={form.data.status}
                onChange={(e) => form.setData('status', e.target.value)}
                className="h-12 w-full rounded-xl border border-[var(--color-sys-border)] bg-white px-4 text-sm outline-none"
              >
                {['pending', 'dispatched'].map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Payment Method</label>
              <input
                type="text"
                value={form.data.payment_method}
                onChange={(e) => form.setData('payment_method', e.target.value)}
                className="h-12 w-full rounded-xl border border-[var(--color-sys-border)] bg-white px-4 text-sm outline-none"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Delivery Region</label>
              <input
                type="text"
                value={form.data.delivery_region}
                onChange={(e) => form.setData('delivery_region', e.target.value)}
                className="h-12 w-full rounded-xl border border-[var(--color-sys-border)] bg-white px-4 text-sm outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Delivery Area</label>
              <input
                type="text"
                value={form.data.delivery_area}
                onChange={(e) => form.setData('delivery_area', e.target.value)}
                className="h-12 w-full rounded-xl border border-[var(--color-sys-border)] bg-white px-4 text-sm outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Notes</label>
            <textarea
              value={form.data.notes}
              onChange={(e) => form.setData('notes', e.target.value)}
              rows="4"
              className="w-full rounded-xl border border-[var(--color-sys-border)] bg-white px-4 py-3 text-sm outline-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-[#d9c4a9] py-3 text-sm font-semibold text-[#4f3118]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={form.processing}
              className="flex-1 rounded-2xl bg-[#4f3118] py-3 text-sm font-semibold text-white"
            >
              {form.processing ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Orders({ auth, orders, filters = {}, perPageOptions = [50, 100, 250, 500] }) {
  const rows = orders?.data || [];
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [pickupOrderToComplete, setPickupOrderToComplete] = useState(null);

  const hasFilters = useMemo(
    () => Boolean((filters.search || '').trim() || (filters.status || '').trim()),
    [filters.search, filters.status],
  );

  useEffect(() => {
    const handleIncomingNotification = (event) => {
      const notification = event.detail;

      if (String(notification?.kind || '').toLowerCase() !== 'new_order') {
        return;
      }

      router.reload({
        only: ['orders', 'filters'],
        preserveScroll: true,
        preserveState: true,
      });
    };

    window.addEventListener('app:notification-received', handleIncomingNotification);

    return () => {
      window.removeEventListener('app:notification-received', handleIncomingNotification);
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      router.reload({
        only: ['orders', 'filters', 'summary'],
        preserveScroll: true,
        preserveState: true,
      });
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, []);

  const submitPickupCompletion = () => {
    if (!pickupOrderToComplete) {
      return;
    }

    router.patch(`/orders/${pickupOrderToComplete.id}/complete-pickup`, {}, {
      preserveScroll: true,
      onSuccess: () => setPickupOrderToComplete(null),
    });
  };

  return (
    <AppLayout user={auth?.user}>
      <OrdersViewModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      <OrdersEditModal order={editingOrder} onClose={() => setEditingOrder(null)} />
      <ConfirmModal
        isOpen={Boolean(pickupOrderToComplete)}
        title="Complete Pickup Order"
        message={
          pickupOrderToComplete
            ? `Mark order ${displayOrderNumber(pickupOrderToComplete.order_number)} as collected and completed?`
            : ''
        }
        confirmText="Mark Completed"
        cancelText="Cancel"
        onConfirm={submitPickupCompletion}
        onClose={() => setPickupOrderToComplete(null)}
        type="primary"
      />

      <div className="space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[2.45rem] font-semibold tracking-[-0.04em] text-[#3a2513]">Orders Management</h1>
            <p className="mt-2 text-[0.95rem] text-[#73563a]">Track and manage customer orders</p>
          </div>

          <Link
            href="/create-order"
            className="inline-flex items-center gap-3 self-start rounded-[1.05rem] bg-[#4f3118] px-6 py-3.5 text-[1.05rem] font-semibold text-white transition hover:bg-[#402612]"
          >
            <Plus className="h-5 w-5" strokeWidth={2.25} />
            New Order
          </Link>
        </div>

        <form method="get" action="/orders" className="flex items-center gap-4 overflow-x-auto">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#866748]" strokeWidth={2} />
            <input
              type="text"
              name="search"
              defaultValue={filters.search || ''}
              placeholder="Search orders or customers..."
              className="h-14 w-full rounded-[1.05rem] border border-[#dcccba] bg-white pl-14 pr-4 text-[1rem] text-[#3a2513] outline-none transition placeholder:text-[#b09983] focus:border-[#b69066]"
            />
          </div>

          <button
            type="submit"
            className="flex h-14 w-[52px] shrink-0 items-center justify-center rounded-[1.05rem] border border-[#dcccba] bg-white text-[#7a5b3d] transition hover:bg-[#faf6f1]"
            aria-label="Apply order filters"
          >
            <Filter className="h-6 w-6" strokeWidth={2} />
          </button>

          <select
            name="status"
            defaultValue={filters.status || ''}
            className="h-14 w-[165px] shrink-0 rounded-[1.05rem] border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="dispatched">Dispatched</option>
            <option value="delivered">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <BackofficePerPageControl
            options={perPageOptions}
            value={filters.per_page || perPageOptions[0]}
            onChange={(event) => router.get('/orders', {
              search: filters.search || '',
              status: filters.status || '',
              per_page: event.target.value,
            }, { preserveScroll: true, preserveState: true })}
          />
        </form>

        <Card className="overflow-hidden rounded-[1.35rem] border border-[#e0d1bf] bg-white shadow-none">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-[#ede1cf]">
                  <tr>
                    {['Order ID', 'Customer', 'Type', 'Items', 'Total', 'Payment', 'Status', 'Actions'].map((header) => (
                      <th
                        key={header}
                        className="px-8 py-5 text-[1rem] font-semibold text-[#2f2115]"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length > 0 ? rows.map((order, index) => {
                    const statusKey = String(order.status || '').toLowerCase();
                    const canCompletePickup = String(order.fulfillment_method || '').toLowerCase() === 'pickup'
                      && !['delivered', 'completed', 'cancelled'].includes(statusKey);

                    return (
                      <tr
                        key={order.id}
                        className={`${index !== rows.length - 1 ? 'border-b border-[#eadcca]' : ''} bg-white`}
                      >
                        <td className="px-8 py-7 text-[1.05rem] font-medium text-[#352314]">{displayOrderNumber(order.order_number)}</td>
                        <td className="px-8 py-7 text-[1.05rem] text-[#352314]">{order.customer}</td>
                        <td className="px-8 py-7">
                          <span className={`inline-flex rounded-full px-4 py-2 text-[0.95rem] font-medium ${fulfillmentStyles[String(order.fulfillment_method).toLowerCase()] || 'bg-slate-100 text-slate-700'}`}>
                            {formatFulfillmentMethod(order.fulfillment_method)}
                          </span>
                        </td>
                        <td className="px-8 py-7 text-[1.05rem] text-[#5f4328]">{order.items} items</td>
                        <td className="px-8 py-7 text-[1.05rem] font-medium text-[#352314]">{money(order.total)}</td>
                        <td className="px-8 py-7 text-[1.05rem] text-[#5f4328]">{formatPayment(order.payment)}</td>
                        <td className="px-8 py-7">
                          <span className={`inline-flex rounded-full px-4 py-2 text-[1rem] font-medium capitalize ${statusStyles[statusKey] || 'bg-slate-100 text-slate-700'}`}>
                            {formatStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="px-8 py-7">
                          <div className="flex items-center gap-5 text-[#4f3118]">
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(order)}
                              className="transition hover:text-[#2f1c0d]"
                              aria-label={`View ${displayOrderNumber(order.order_number)}`}
                            >
                              <Eye className="h-5 w-5" strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingOrder(order)}
                              className="transition hover:text-[#2f1c0d]"
                              aria-label={`Edit ${displayOrderNumber(order.order_number)}`}
                            >
                              <Pencil className="h-5 w-5" strokeWidth={2} />
                            </button>
                            {canCompletePickup ? (
                              <button
                                type="button"
                                onClick={() => setPickupOrderToComplete(order)}
                                className="transition hover:text-emerald-700"
                                aria-label={`Mark ${displayOrderNumber(order.order_number)} as collected`}
                                title="Mark pickup as collected"
                              >
                                <Check className="h-5 w-5" strokeWidth={2.5} />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={8} className="px-8 py-12 text-center">
                        <p className="text-lg font-medium text-[#4d3218]">No orders found.</p>
                        <p className="mt-2 text-sm text-[#7a5c3e]">Try another search or status filter.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {hasFilters ? (
          <div className="flex justify-end">
            <Link href="/orders" className="text-sm font-semibold text-[#4f3118]">
              Clear filters
            </Link>
          </div>
        ) : null}

        <BackofficePagination links={orders?.links} />
      </div>
    </AppLayout>
  );
}

import React from 'react';
import { router } from '@inertiajs/react';
import StoreLayout from '@/components/StoreLayout';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Inbox, Search } from 'lucide-react';

const money = (value) => new Intl.NumberFormat('en-TZ', {
  style: 'currency',
  currency: 'TZS',
  maximumFractionDigits: 0,
}).format(value || 0);

export default function OrderTracking({ orders = [], filters = {} }) {
  const completedStatuses = ['delivered', 'cancelled'];
  const openOrders = orders.filter((order) => !completedStatuses.includes(order.status));
  const completedOrders = orders.filter((order) => completedStatuses.includes(order.status));
  const activeOrder = openOrders[0] || null;

  const statusBadgeClass = (status) => {
    switch (status) {
      case 'cancelled':
        return 'bg-red-100 text-red-600';
      case 'delivered':
        return 'bg-green-100 text-green-600';
      case 'pending':
        return 'bg-yellow-100 text-yellow-600';
      case 'dispatched':
        return 'bg-blue-100 text-blue-600';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  };

  const searchOrder = (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    router.get('/track-orders', { order: data.get('order') || undefined }, { preserveState: true, replace: true });
  };

  const cancelOrder = (orderId) => {
    router.patch(`/my-orders/${orderId}/cancel`, {}, { preserveScroll: true });
  };

  const confirmDelivery = (orderId) => {
    router.patch(`/my-orders/${orderId}/deliver`, {}, { preserveScroll: true });
  };

  return (
    <StoreLayout
      title="Track Orders"
      subtitle="Follow live order, payment, and delivery states from the real order records instead of a mock timeline."
    >
      <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
        <Card className="rounded-[1.75rem] border-none shadow-sm">
          <CardContent className="p-6">
            <h2 className="text-xl font-black">Tracking Timeline</h2>
            {activeOrder ? (
              <>
                <div className="mt-5 rounded-[1.5rem] bg-[var(--color-brand-dark)] p-5 text-white">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">{activeOrder.display_order_number || activeOrder.order_number}</p>
                      <p className="mt-2 text-2xl font-black capitalize">{activeOrder.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white/70">Total</p>
                      <p className="text-2xl font-black">{money(activeOrder.total)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  {activeOrder.timeline.map((step, index) => (
                    <div key={step.label} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`h-4 w-4 rounded-full ${step.completed ? 'bg-emerald-500' : 'bg-[#d7cab7]'}`} />
                        {index < activeOrder.timeline.length - 1 && <div className="mt-2 h-full w-px bg-[#d7cab7]" />}
                      </div>
                      <div className="pb-5">
                        <p className="text-base font-bold">{step.label}</p>
                        <p className="mt-1 text-sm leading-6 text-[var(--color-sys-text-secondary)]">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-[#f4eee5] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-sys-text-secondary)]">Payment</p>
                    <p className="mt-2 text-sm font-semibold capitalize">
                      {activeOrder.payment ? `${activeOrder.payment.status} via ${activeOrder.payment.method.replaceAll('_', ' ')}` : 'Pending'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#f4eee5] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-sys-text-secondary)]">Delivery</p>
                    <p className="mt-2 text-sm font-semibold capitalize">
                      {activeOrder.delivery ? `${activeOrder.delivery.status} (${activeOrder.delivery.tracking_number || activeOrder.delivery.number})` : 'Not assigned'}
                    </p>
                  </div>
                </div>

                {(activeOrder.can_cancel || activeOrder.can_mark_delivered) && (
                  <div className="mt-6 flex flex-wrap gap-3">
                    {activeOrder.can_cancel && (
                      <Button
                        type="button"
                        onClick={() => cancelOrder(activeOrder.id)}
                        className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700"
                      >
                        Cancel Order
                      </Button>
                    )}
                    {activeOrder.can_mark_delivered && (
                      <Button
                        type="button"
                        onClick={() => confirmDelivery(activeOrder.id)}
                        className="rounded-xl px-5 py-3 font-semibold"
                      >
                        Confirm Delivery
                      </Button>
                    )}
                  </div>
                )}

                {activeOrder.location && (
                  <div className="mt-4 rounded-2xl bg-[#f4eee5] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-sys-text-secondary)]">Saved Location</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-sys-text-primary)]">
                      {[activeOrder.location.region_city, activeOrder.location.district_area].filter(Boolean).join(', ')}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[var(--color-sys-text-secondary)]">{activeOrder.location.delivery_address}</p>
                    {activeOrder.location.landmark && (
                      <p className="mt-1 text-sm text-[var(--color-sys-text-secondary)]">Landmark: {activeOrder.location.landmark}</p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="mt-5 text-sm text-[var(--color-sys-text-secondary)]">
                {completedOrders.length > 0
                  ? 'No active orders to track right now. Completed and cancelled orders are listed in Completed Orders.'
                  : 'Search for an order to see the live timeline.'}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="rounded-[1.75rem] border-none shadow-sm">
            <CardContent className="p-6">
              <h2 className="text-xl font-black">Find an Order</h2>
              <form onSubmit={searchOrder} className="mt-5 flex gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-sys-text-secondary)]" />
                  <Input name="order" defaultValue={filters.order || ''} placeholder="Order number or tracking code" className="pl-10 h-11 rounded-xl" />
                </div>
                <Button type="submit" className="rounded-xl px-5">Search</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold">Open Orders</h2>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${openOrders.length > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                  {openOrders.length > 0 ? `${openOrders.length} Active` : '0'}
                </span>
              </div>
              <div className="mt-5 space-y-4">
                {openOrders.length > 0 ? openOrders.map((order) => (
                  <div key={order.id} className="rounded-xl border border-[#eadfce] bg-[#f4eee5] p-4 transition hover:shadow-md">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-sys-text-secondary)]">{order.display_order_number || order.order_number}</p>
                        <div className="mt-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusBadgeClass(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-[var(--color-brand-dark)]">{money(order.total)}</p>
                        <p className="mt-2 text-xs text-[var(--color-sys-text-secondary)]">{order.created_at}</p>
                      </div>
                    </div>

                    {order.items?.length > 0 && (
                      <div className="mt-4 space-y-2 border-t border-[#e5d8c5] pt-4">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                            <p className="min-w-0 flex-1 font-medium text-[var(--color-sys-text-primary)]">{item.name}</p>
                            <p className="shrink-0 text-[var(--color-sys-text-secondary)]">{item.quantity} pcs</p>
                            <p className="shrink-0 font-semibold text-[var(--color-brand-dark)]">{money(item.subtotal)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center rounded-xl bg-[#f8f4ed] px-4 py-8 text-center">
                    <Inbox size={22} className="text-[var(--color-sys-text-secondary)]" />
                    <p className="mt-3 text-sm text-[var(--color-sys-text-secondary)]">No open orders right now.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold">Completed Orders</h2>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${completedOrders.length > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {completedOrders.length > 0 ? `${completedOrders.length} Orders` : '0'}
                </span>
              </div>
              <div className="mt-5 space-y-4">
                {completedOrders.length > 0 ? completedOrders.map((order) => (
                  <div key={order.id} className="rounded-xl border border-[#eadfce] bg-[#f8f4ed] p-4 transition hover:shadow-md">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-sys-text-secondary)]">{order.display_order_number || order.order_number}</p>
                        <div className="mt-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusBadgeClass(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-[var(--color-brand-dark)]">{money(order.total)}</p>
                        <p className="mt-2 text-xs text-[var(--color-sys-text-secondary)]">{order.created_at}</p>
                      </div>
                    </div>

                    {order.items?.length > 0 && (
                      <div className="mt-4 space-y-2 border-t border-[#e5d8c5] pt-4">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                            <p className="min-w-0 flex-1 font-medium text-[var(--color-sys-text-primary)]">{item.name}</p>
                            <p className="shrink-0 text-[var(--color-sys-text-secondary)]">{item.quantity} pcs</p>
                            <p className="shrink-0 font-semibold text-[var(--color-brand-dark)]">{money(item.subtotal)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center rounded-xl bg-[#f8f4ed] px-4 py-8 text-center">
                    <Inbox size={22} className="text-[var(--color-sys-text-secondary)]" />
                    <p className="mt-3 text-sm text-[var(--color-sys-text-secondary)]">
                      {orders.length > 0 ? 'No completed orders yet.' : 'No orders matched that search.'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </StoreLayout>
  );
}

import React from 'react';
import { router } from '@inertiajs/react';
import StoreLayout from '@/components/StoreLayout';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Search } from 'lucide-react';

const money = (value) => new Intl.NumberFormat('en-TZ', {
  style: 'currency',
  currency: 'TZS',
  maximumFractionDigits: 0,
}).format(value || 0);

export default function OrderTracking({ orders = [], filters = {} }) {
  const activeOrder = orders[0] || null;

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
      <div className="grid gap-8 lg:grid-cols-[0.9fr,1.1fr]">
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
              <h2 className="text-xl font-black">Matching Orders</h2>
              <div className="mt-5 space-y-4">
                {orders.length > 0 ? orders.map((order) => (
                  <div key={order.id} className="rounded-2xl bg-[#f4eee5] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-sys-text-secondary)]">{order.order_number}</p>
                        <p className="mt-2 text-sm font-semibold capitalize">{order.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black">{money(order.total)}</p>
                        <p className="text-xs text-[var(--color-sys-text-secondary)]">{order.created_at}</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-[var(--color-sys-text-secondary)]">No orders matched that search.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[1.75rem] border-none shadow-sm">
          <CardContent className="p-6">
            <h2 className="text-xl font-black">Tracking Timeline</h2>
            {activeOrder ? (
              <>
                <div className="mt-5 rounded-[1.5rem] bg-[var(--color-brand-dark)] p-5 text-white">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">{activeOrder.order_number}</p>
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
              <p className="mt-5 text-sm text-[var(--color-sys-text-secondary)]">Search for an order to see the live timeline.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </StoreLayout>
  );
}

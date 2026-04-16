import React from 'react';
import { router } from '@inertiajs/react';
import StoreLayout from '@/components/StoreLayout';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Inbox, Search } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const money = (value) => new Intl.NumberFormat('en-TZ', {
  style: 'currency',
  currency: 'TZS',
  maximumFractionDigits: 0,
}).format(value || 0);

export default function OrderTracking({ orders = [], filters = {} }) {
  const { t, tp } = useI18n();
  const completedStatuses = ['delivered', 'cancelled'];
  const openOrders = orders.filter((order) => !completedStatuses.includes(order.status));
  const completedOrders = orders.filter((order) => completedStatuses.includes(order.status));
  const activeOrder = openOrders[0] || null;

  const formatStatusLabel = (status) => {
    const normalized = String(status || '').toLowerCase();

    if (normalized === 'delivered' || normalized === 'completed') {
      return t('frontend.common.status.completed', 'Completed');
    }

    if (normalized === 'cancelled' || normalized === 'canceled') {
      return t('frontend.common.status.cancelled', 'Cancelled');
    }

    if (normalized === 'dispatched') {
      return t('frontend.common.status.dispatched', 'Dispatched');
    }

    if (['pending', 'processing', 'preparing', 'confirmed'].includes(normalized)) {
      return t('frontend.common.status.pending', 'Pending');
    }

    if (!normalized) {
      return t('frontend.common.status.na', 'N/A');
    }

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  const formatPaymentStatusLabel = (status) => {
    const normalized = String(status || '').toLowerCase();

    if (normalized === 'paid') {
      return t('frontend.common.status.paid', 'Paid');
    }

    if (normalized === 'cancelled' || normalized === 'canceled') {
      return t('frontend.common.status.cancelled', 'Cancelled');
    }

    if (normalized === 'pending') {
      return t('frontend.common.status.pending', 'Pending');
    }

    if (!normalized) {
      return t('frontend.common.status.pending', 'Pending');
    }

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  const formatPaymentMethodLabel = (method) => {
    const normalized = String(method || '').toLowerCase();

    if (!normalized) {
      return t('frontend.order_tracking.payment_methods.pending_payment', 'Pending Payment');
    }

    switch (normalized) {
      case 'bank':
        return t('frontend.order_tracking.payment_methods.bank', 'Bank');
      case 'cash':
        return t('frontend.order_tracking.payment_methods.cash', 'Cash');
      case 'lipa_no':
        return t('frontend.order_tracking.payment_methods.lipa_no', 'Lipa Namba');
      case 'pending payment':
        return t('frontend.order_tracking.payment_methods.pending_payment', 'Pending Payment');
      default:
        return normalized
          .split('_')
          .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
          .join(' ');
    }
  };

  const formatDeliveryStatusLabel = (status) => {
    const normalized = String(status || '').toLowerCase();

    if (normalized === 'delivered') {
      return t('frontend.common.status.completed', 'Completed');
    }

    if (normalized === 'cancelled' || normalized === 'canceled') {
      return t('frontend.common.status.cancelled', 'Cancelled');
    }

    if (normalized === 'dispatched' || normalized === 'in_transit' || normalized === 'ready_for_pickup') {
      return t('frontend.common.status.dispatched', 'Dispatched');
    }

    if (!normalized || normalized === 'pending') {
      return t('frontend.common.status.pending', 'Pending');
    }

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  const formatFulfillmentMethod = (value) => {
    const normalized = String(value || '').toLowerCase();

    if (normalized === 'pickup') {
      return t('frontend.common.status.pickup', 'Pickup');
    }

    if (normalized === 'delivery') {
      return t('frontend.common.status.delivery', 'Delivery');
    }

    return t('frontend.common.status.na', 'N/A');
  };

  const fulfillmentBadgeClass = (value) => {
    switch (String(value || '').toLowerCase()) {
      case 'pickup':
        return 'bg-amber-100 text-amber-700';
      case 'delivery':
        return 'bg-sky-100 text-sky-700';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  };

  const buildTimeline = (order) => {
    if (!order) {
      return [];
    }

    const normalizedOrderStatus = String(order.status || '').toLowerCase();
    const deliveryStatus = String(order.delivery?.status || '').toLowerCase();

    return [
      {
        label: t('frontend.order_tracking.timeline.order_pending.label', 'Order pending'),
        description: t('frontend.order_tracking.timeline.order_pending.description', 'Your order has been placed and is waiting for dispatch.'),
        completed: true,
      },
      {
        label: t('frontend.order_tracking.timeline.payment_status.label', 'Payment status'),
        description: order.payment
          ? tp('frontend.order_tracking.payment_summary', ':status via :method', {
            status: formatPaymentStatusLabel(order.payment.status),
            method: formatPaymentMethodLabel(order.payment.method),
          })
          : t('frontend.order_tracking.timeline.payment_status.awaiting', 'Awaiting payment confirmation.'),
        completed: Boolean(order.payment),
      },
      {
        label: t('frontend.order_tracking.timeline.order_dispatched.label', 'Order dispatched'),
        description: ['dispatched', 'delivered', 'completed'].includes(normalizedOrderStatus)
          ? t('frontend.order_tracking.timeline.order_dispatched.in_progress', 'The order is on the way with the delivery person.')
          : (['cancelled', 'canceled'].includes(normalizedOrderStatus)
            ? t('frontend.order_tracking.timeline.order_dispatched.cancelled', 'The order was cancelled before dispatch.')
            : t('frontend.order_tracking.timeline.order_dispatched.waiting', 'Waiting to be dispatched.')),
        completed: ['dispatched', 'delivered', 'completed'].includes(normalizedOrderStatus),
      },
      {
        label: t('frontend.order_tracking.timeline.delivery_progress.label', 'Delivery progress'),
        description: order.delivery
          ? tp('frontend.order_tracking.timeline.delivery_progress.current_status', 'Current delivery status: :status.', {
            status: formatDeliveryStatusLabel(deliveryStatus),
          })
          : (normalizedOrderStatus === 'dispatched'
            ? t('frontend.order_tracking.timeline.delivery_progress.dispatched', 'Delivery has been dispatched.')
            : t('frontend.order_tracking.timeline.delivery_progress.waiting', 'Delivery details will appear here once assigned.')),
        completed: ['dispatched', 'delivered', 'completed'].includes(normalizedOrderStatus),
      },
      {
        label: ['cancelled', 'canceled'].includes(normalizedOrderStatus)
          ? t('frontend.order_tracking.timeline.final.cancelled_label', 'Order cancelled')
          : t('frontend.order_tracking.timeline.final.delivered_label', 'Order delivered'),
        description: ['delivered', 'completed'].includes(normalizedOrderStatus)
          ? t('frontend.order_tracking.timeline.final.delivered_description', 'Order delivered successfully.')
          : (['cancelled', 'canceled'].includes(normalizedOrderStatus)
            ? t('frontend.order_tracking.timeline.final.cancelled_description', 'This order was cancelled.')
            : t('frontend.order_tracking.timeline.final.waiting_description', 'Waiting for final delivery confirmation.')),
        completed: ['delivered', 'completed', 'cancelled', 'canceled'].includes(normalizedOrderStatus),
      },
    ];
  };

  const activeTimeline = buildTimeline(activeOrder);

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
      title={t('frontend.order_tracking.title', 'Track Orders')}
      subtitle={t('frontend.order_tracking.subtitle', 'Follow live order, payment, and delivery states from the real order records instead of a mock timeline.')}
    >
      <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
        <Card className="rounded-[1.75rem] border-none shadow-sm">
          <CardContent className="p-6">
            <h2 className="text-xl font-black">{t('frontend.order_tracking.tracking_timeline', 'Tracking Timeline')}</h2>
            {activeOrder ? (
              <>
                <div className="mt-5 rounded-[1.5rem] bg-[var(--color-brand-dark)] p-5 text-white">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">{activeOrder.display_order_number || activeOrder.order_number}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass(activeOrder.status)}`}>
                          {formatStatusLabel(activeOrder.status)}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${fulfillmentBadgeClass(activeOrder.location?.fulfillment_method)}`}>
                          {formatFulfillmentMethod(activeOrder.location?.fulfillment_method)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white/70">{t('frontend.common.labels.total', 'Total')}</p>
                      <p className="text-2xl font-black">{money(activeOrder.total)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  {activeTimeline.map((step, index) => (
                    <div key={step.label} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`h-4 w-4 rounded-full ${step.completed ? 'bg-emerald-500' : 'bg-[#d7cab7]'}`} />
                        {index < activeTimeline.length - 1 && <div className="mt-2 h-full w-px bg-[#d7cab7]" />}
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
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-sys-text-secondary)]">{t('frontend.common.labels.payment', 'Payment')}</p>
                    <p className="mt-2 text-sm font-semibold capitalize">
                      {activeOrder.payment
                        ? tp('frontend.order_tracking.payment_summary', ':status via :method', {
                          status: formatPaymentStatusLabel(activeOrder.payment.status),
                          method: formatPaymentMethodLabel(activeOrder.payment.method),
                        })
                        : t('frontend.common.status.pending', 'Pending')}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#f4eee5] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-sys-text-secondary)]">{t('frontend.common.labels.delivery', 'Delivery')}</p>
                    <p className="mt-2 text-sm font-semibold capitalize">
                      {activeOrder.delivery
                        ? tp('frontend.order_tracking.delivery_summary', ':status (:number)', {
                          status: formatDeliveryStatusLabel(activeOrder.delivery.status),
                          number: activeOrder.delivery.tracking_number || activeOrder.delivery.number,
                        })
                        : t('frontend.common.status.not_assigned', 'Not assigned')}
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
                        {t('frontend.order_tracking.actions.cancel_order', 'Cancel Order')}
                      </Button>
                    )}
                    {activeOrder.can_mark_delivered && (
                      <Button
                        type="button"
                        onClick={() => confirmDelivery(activeOrder.id)}
                        className="rounded-xl px-5 py-3 font-semibold"
                      >
                        {t('frontend.order_tracking.actions.confirm_delivery', 'Confirm Delivery')}
                      </Button>
                    )}
                  </div>
                )}

                {activeOrder.location && (
                  <div className="mt-4 rounded-2xl bg-[#f4eee5] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-sys-text-secondary)]">{t('frontend.common.labels.saved_location', 'Saved Location')}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-sys-text-primary)]">
                      {[activeOrder.location.region_city, activeOrder.location.district_area].filter(Boolean).join(', ')}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[var(--color-sys-text-secondary)]">{activeOrder.location.delivery_address}</p>
                    {activeOrder.location.landmark && (
                      <p className="mt-1 text-sm text-[var(--color-sys-text-secondary)]">{tp('frontend.common.labels.landmark', 'Landmark: :landmark', { landmark: activeOrder.location.landmark })}</p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="mt-5 text-sm text-[var(--color-sys-text-secondary)]">
                {completedOrders.length > 0
                  ? t('frontend.order_tracking.no_active_orders', 'No active orders to track right now. Completed and cancelled orders are listed in Completed Orders.')
                  : t('frontend.order_tracking.search_hint', 'Search for an order to see the live timeline.')}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="rounded-[1.75rem] border-none shadow-sm">
            <CardContent className="p-6">
              <h2 className="text-xl font-black">{t('frontend.order_tracking.find_order', 'Find an Order')}</h2>
              <form onSubmit={searchOrder} className="mt-5 flex gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-sys-text-secondary)]" />
                  <Input name="order" defaultValue={filters.order || ''} placeholder={t('frontend.order_tracking.search_placeholder', 'Order number or tracking code')} className="pl-10 h-11 rounded-xl" />
                </div>
                <Button type="submit" className="rounded-xl px-5">{t('frontend.order_tracking.actions.search', 'Search')}</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold">{t('frontend.order_tracking.open_orders', 'Open Orders')}</h2>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${openOrders.length > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                  {openOrders.length > 0 ? tp('frontend.order_tracking.active_count', ':count Active', { count: openOrders.length }) : '0'}
                </span>
              </div>
              <div className="mt-5 space-y-4">
                {openOrders.length > 0 ? openOrders.map((order) => (
                  <div key={order.id} className="rounded-xl border border-[#eadfce] bg-[#f4eee5] p-4 transition hover:shadow-md">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-sys-text-secondary)]">{order.display_order_number || order.order_number}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusBadgeClass(order.status)}`}>
                            {formatStatusLabel(order.status)}
                          </span>
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${fulfillmentBadgeClass(order.location?.fulfillment_method)}`}>
                            {formatFulfillmentMethod(order.location?.fulfillment_method)}
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
                            <p className="shrink-0 text-[var(--color-sys-text-secondary)]">{tp('frontend.order_tracking.item_quantity', ':quantity pcs', { quantity: item.quantity })}</p>
                            <p className="shrink-0 font-semibold text-[var(--color-brand-dark)]">{money(item.subtotal)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center rounded-xl bg-[#f8f4ed] px-4 py-8 text-center">
                    <Inbox size={22} className="text-[var(--color-sys-text-secondary)]" />
                    <p className="mt-3 text-sm text-[var(--color-sys-text-secondary)]">{t('frontend.order_tracking.open_empty', 'No open orders right now.')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold">{t('frontend.order_tracking.completed_orders', 'Completed Orders')}</h2>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${completedOrders.length > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {completedOrders.length > 0 ? tp('frontend.order_tracking.completed_count', ':count Orders', { count: completedOrders.length }) : '0'}
                </span>
              </div>
              <div className="mt-5 space-y-4">
                {completedOrders.length > 0 ? completedOrders.map((order) => (
                  <div key={order.id} className="rounded-xl border border-[#eadfce] bg-[#f8f4ed] p-4 transition hover:shadow-md">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-sys-text-secondary)]">{order.display_order_number || order.order_number}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusBadgeClass(order.status)}`}>
                            {formatStatusLabel(order.status)}
                          </span>
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${fulfillmentBadgeClass(order.location?.fulfillment_method)}`}>
                            {formatFulfillmentMethod(order.location?.fulfillment_method)}
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
                            <p className="shrink-0 text-[var(--color-sys-text-secondary)]">{tp('frontend.order_tracking.item_quantity', ':quantity pcs', { quantity: item.quantity })}</p>
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
                      {orders.length > 0
                        ? t('frontend.order_tracking.completed_empty', 'No completed orders yet.')
                        : t('frontend.order_tracking.search_empty', 'No orders matched that search.')}
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

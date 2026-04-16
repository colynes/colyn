import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import StoreLayout from '@/components/StoreLayout';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Card, CardContent } from '@/components/ui/Card';
import ProfileCard from '@/components/customer/ProfileCard';
import EditProfileDialog from '@/components/customer/EditProfileDialog';
import { useI18n } from '@/lib/i18n';

const money = (value) => new Intl.NumberFormat('en-TZ', {
  style: 'currency',
  currency: 'TZS',
  maximumFractionDigits: 0,
}).format(value || 0);

export default function Profile({ profileMeta, orders = [] }) {
  const { t } = useI18n();
  const { auth, flash } = usePage().props;
  const [dialogOpen, setDialogOpen] = useState(false);
  const user = auth?.user;

  const cancelOrder = (orderId) => {
    router.patch(`/my-orders/${orderId}/cancel`, {}, { preserveScroll: true });
  };

  const confirmDelivery = (orderId) => {
    router.patch(`/my-orders/${orderId}/deliver`, {}, { preserveScroll: true });
  };

  return (
    <StoreLayout
      title={t('frontend.profile.title', 'Your Profile')}
      subtitle={t('frontend.profile.subtitle', 'View your personal details, update them anytime, and quickly jump back into your order activity.')}
    >
      <EditProfileDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={user}
        address={user?.address || profileMeta?.default_address?.address_line1 || ''}
      />

      <div className="space-y-8">
        {flash?.success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {flash.success}
          </div>
        )}

        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>

        <ProfileCard user={user} onEdit={() => setDialogOpen(true)} />

        <div className="grid gap-8">
          <Card className="rounded-2xl border border-gray-100 bg-white shadow-md">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-gray-800">{t('frontend.profile.recent_orders', 'Recent Orders')}</h2>
              <div className="mt-5 space-y-4">
                {orders.length > 0 ? orders.map((order) => (
                  <div key={order.id} className="rounded-2xl bg-gray-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">{order.display_order_number || order.order_number}</p>
                        <p className="mt-2 text-sm font-semibold capitalize text-gray-800">{order.status}</p>
                      </div>
                      <p className="text-lg font-black text-gray-800">{money(order.total)}</p>
                    </div>
                    {(order.can_cancel || order.can_mark_delivered) && (
                      <div className="mt-4 flex flex-wrap gap-3">
                        {order.can_cancel && (
                          <button
                            type="button"
                            onClick={() => cancelOrder(order.id)}
                            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
                          >
                            {t('frontend.profile.actions.cancel_order', 'Cancel Order')}
                          </button>
                        )}
                        {order.can_mark_delivered && (
                          <button
                            type="button"
                            onClick={() => confirmDelivery(order.id)}
                            className="rounded-xl bg-[var(--color-brand-dark)] px-4 py-2 text-sm font-semibold text-white"
                          >
                            {t('frontend.profile.actions.confirm_delivery', 'Confirm Delivery')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )) : (
                  <p className="text-sm text-gray-500">{t('frontend.profile.no_previous_orders', 'No previous orders yet.')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </StoreLayout>
  );
}

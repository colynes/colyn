import React from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import StoreLayout from '@/components/StoreLayout';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const money = (value) => new Intl.NumberFormat('en-TZ', {
  style: 'currency',
  currency: 'TZS',
  maximumFractionDigits: 0,
}).format(value || 0);

export default function Profile({ profile, orders = [] }) {
  const form = useForm({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    email: profile?.email || '',
    address: profile?.address || profile?.default_address?.address_line1 || '',
    city: profile?.default_address?.city || '',
    postal_code: profile?.default_address?.postal_code || '',
  });

  const submit = (event) => {
    event.preventDefault();
    form.put('/profile', { preserveScroll: true });
  };

  const cancelOrder = (orderId) => {
    router.patch(`/my-orders/${orderId}/cancel`, {}, { preserveScroll: true });
  };

  const confirmDelivery = (orderId) => {
    router.patch(`/my-orders/${orderId}/deliver`, {}, { preserveScroll: true });
  };

  return (
    <StoreLayout
      title="Customer Profile"
      subtitle="Manage contact details, keep the saved location up to date, and quickly jump back into order history or tracking."
    >
      <div className="grid gap-8 lg:grid-cols-[1fr,0.9fr]">
        <Card className="rounded-[1.75rem] border-none shadow-sm">
          <CardContent className="p-6">
            <div>
              <h2 className="text-xl font-black">Profile Details</h2>
              <p className="mt-2 text-sm text-[var(--color-sys-text-secondary)]">Keep checkout-ready customer information synced here.</p>
            </div>

            <form onSubmit={submit} className="mt-6 grid gap-4 md:grid-cols-2">
              <Input label="Full Name" value={form.data.full_name} onChange={(e) => form.setData('full_name', e.target.value)} error={form.errors.full_name} />
              <Input label="Phone" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} error={form.errors.phone} />
              <Input label="Email" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} />
              <Input label="City" value={form.data.city} onChange={(e) => form.setData('city', e.target.value)} error={form.errors.city} />
              <div className="md:col-span-2">
                <Input label="Location / Address" value={form.data.address} onChange={(e) => form.setData('address', e.target.value)} error={form.errors.address} />
              </div>
              <Input label="Postal Code" value={form.data.postal_code} onChange={(e) => form.setData('postal_code', e.target.value)} error={form.errors.postal_code} />
              <div className="flex items-end">
                <Button type="submit" disabled={form.processing} className="w-full rounded-2xl py-3 font-semibold">
                  {form.processing ? 'Saving...' : 'Save profile'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="rounded-[1.75rem] border-none bg-[var(--color-brand-dark)] text-white shadow-sm">
            <CardContent className="p-6">
              <h2 className="text-xl font-black">Account Status</h2>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Customer state</span>
                  <span className="font-bold capitalize">{profile?.status || 'active'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Saved orders</span>
                  <span className="font-bold">{orders.length}</span>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <Link href="/products" className="inline-flex flex-1 items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[var(--color-brand-dark)]">Shop now</Link>
                <Link href="/track-orders" className="inline-flex flex-1 items-center justify-center rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-white">Track orders</Link>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-none shadow-sm">
            <CardContent className="p-6">
              <h2 className="text-xl font-black">Recent Orders</h2>
              <div className="mt-5 space-y-4">
                {orders.length > 0 ? orders.map((order) => (
                  <div key={order.id} className="rounded-2xl bg-[#f4eee5] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-sys-text-secondary)]">{order.order_number}</p>
                        <p className="mt-2 text-sm font-semibold capitalize">{order.status}</p>
                      </div>
                      <p className="text-lg font-black">{money(order.total)}</p>
                    </div>
                    {(order.can_cancel || order.can_mark_delivered) && (
                      <div className="mt-4 flex flex-wrap gap-3">
                        {order.can_cancel && (
                          <button
                            type="button"
                            onClick={() => cancelOrder(order.id)}
                            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
                          >
                            Cancel Order
                          </button>
                        )}
                        {order.can_mark_delivered && (
                          <button
                            type="button"
                            onClick={() => confirmDelivery(order.id)}
                            className="rounded-xl bg-[var(--color-brand-dark)] px-4 py-2 text-sm font-semibold text-white"
                          >
                            Confirm Delivery
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )) : (
                  <p className="text-sm text-[var(--color-sys-text-secondary)]">No previous orders yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </StoreLayout>
  );
}

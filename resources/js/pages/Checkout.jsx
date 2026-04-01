import React, { useState } from 'react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { Eye, EyeOff } from 'lucide-react';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function Checkout({ cart, customer }) {
  const { auth, flash } = usePage().props;
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const isGuest = !auth?.user;

  const { data, setData, post, processing, errors } = useForm({
    full_name: customer?.full_name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    region_city: customer?.region_city || '',
    district_area: customer?.district_area || '',
    delivery_address: customer?.delivery_address || '',
    landmark: customer?.landmark || '',
    fulfillment_method: 'delivery',
    pickup_time: '',
    password: '',
    password_confirmation: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    post('/checkout');
  };

  return (
    <div className="min-h-screen bg-[#f7f2ea] px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a1f28]">Checkout</p>
            <h1 className="mt-2 text-4xl font-black text-[#241816]">Confirm your order</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#6f5d57]">
              {isGuest
                ? 'Create your customer account while confirming the order. We will collect your details, location, delivery or pickup choice, pickup time if needed, and your password.'
                : 'Review your details below and confirm the order. Delivery or pickup information is required before submission.'}
            </p>
          </div>
          <Link href="/" className="inline-flex items-center justify-center rounded-full border border-[#3b241d]/15 bg-white px-5 py-3 text-sm font-bold text-[#241816]">
            Back To Store
          </Link>
        </div>

        {(flash?.success || flash?.error) && (
          <div className={`mt-6 rounded-2xl border px-5 py-4 text-sm font-medium ${
            flash.error
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}>
            {flash.error || flash.success}
          </div>
        )}

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] bg-white p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-[#241816]">{isGuest ? 'Customer account details' : 'Customer details'}</h2>
                <p className="mt-2 text-sm text-[#6f5d57]">
                  Full name, phone, email, and location are required to confirm the order.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#241816]">Full Name</label>
                <input
                  type="text"
                  value={data.full_name}
                  onChange={(e) => setData('full_name', e.target.value)}
                  className="w-full rounded-xl border border-[#e8ddd2] bg-[#f8f3ee] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#cdad7d]"
                />
                {errors.full_name && <div className="mt-1 text-xs text-red-500">{errors.full_name}</div>}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#241816]">Phone</label>
                  <input
                    type="text"
                    value={data.phone}
                    onChange={(e) => setData('phone', e.target.value)}
                    className="w-full rounded-xl border border-[#e8ddd2] bg-[#f8f3ee] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#cdad7d]"
                  />
                  {errors.phone && <div className="mt-1 text-xs text-red-500">{errors.phone}</div>}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#241816]">Email</label>
                  <input
                    type="email"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    className="w-full rounded-xl border border-[#e8ddd2] bg-[#f8f3ee] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#cdad7d]"
                  />
                  {errors.email && <div className="mt-1 text-xs text-red-500">{errors.email}</div>}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black text-[#241816]">Delivery location</h3>
                <p className="mt-2 text-sm text-[#6f5d57]">
                  Location is required every time an order is confirmed.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#241816]">Region / City</label>
                  <input
                    type="text"
                    value={data.region_city}
                    onChange={(e) => setData('region_city', e.target.value)}
                    className="w-full rounded-xl border border-[#e8ddd2] bg-[#f8f3ee] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#cdad7d]"
                  />
                  {errors.region_city && <div className="mt-1 text-xs text-red-500">{errors.region_city}</div>}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#241816]">District / Area</label>
                  <input
                    type="text"
                    value={data.district_area}
                    onChange={(e) => setData('district_area', e.target.value)}
                    className="w-full rounded-xl border border-[#e8ddd2] bg-[#f8f3ee] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#cdad7d]"
                  />
                  {errors.district_area && <div className="mt-1 text-xs text-red-500">{errors.district_area}</div>}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#241816]">Full Delivery Address / Street Description</label>
                <textarea
                  rows={4}
                  value={data.delivery_address}
                  onChange={(e) => setData('delivery_address', e.target.value)}
                  className="w-full rounded-xl border border-[#e8ddd2] bg-[#f8f3ee] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#cdad7d] resize-none"
                />
                {errors.delivery_address && <div className="mt-1 text-xs text-red-500">{errors.delivery_address}</div>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#241816]">Landmark (Optional)</label>
                <input
                  type="text"
                  value={data.landmark}
                  onChange={(e) => setData('landmark', e.target.value)}
                  className="w-full rounded-xl border border-[#e8ddd2] bg-[#f8f3ee] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#cdad7d]"
                />
                {errors.landmark && <div className="mt-1 text-xs text-red-500">{errors.landmark}</div>}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#241816]">Delivery Or Pickup</label>
                  <select
                    value={data.fulfillment_method}
                    onChange={(e) => setData('fulfillment_method', e.target.value)}
                    className="w-full rounded-xl border border-[#e8ddd2] bg-[#f8f3ee] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#cdad7d]"
                  >
                    <option value="delivery">Delivery</option>
                    <option value="pickup">Pickup</option>
                  </select>
                  {errors.fulfillment_method && <div className="mt-1 text-xs text-red-500">{errors.fulfillment_method}</div>}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#241816]">Pickup Time</label>
                  <input
                    type="text"
                    value={data.pickup_time}
                    onChange={(e) => setData('pickup_time', e.target.value)}
                    placeholder="Required if pickup is selected"
                    className="w-full rounded-xl border border-[#e8ddd2] bg-[#f8f3ee] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#cdad7d]"
                  />
                  {errors.pickup_time && <div className="mt-1 text-xs text-red-500">{errors.pickup_time}</div>}
                </div>
              </div>

              {isGuest && (
                <>
                  <div className="border-t border-[#efe5da] pt-6">
                    <h3 className="text-xl font-black text-[#241816]">Create your password</h3>
                    <p className="mt-2 text-sm text-[#6f5d57]">
                      Your account is created while you confirm this order.
                    </p>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[#241816]">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={data.password}
                          onChange={(e) => setData('password', e.target.value)}
                          className="w-full rounded-xl border border-[#e8ddd2] bg-[#f8f3ee] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#cdad7d]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((value) => !value)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {errors.password && <div className="mt-1 text-xs text-red-500">{errors.password}</div>}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[#241816]">Confirm Password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={data.password_confirmation}
                          onChange={(e) => setData('password_confirmation', e.target.value)}
                          className="w-full rounded-xl border border-[#e8ddd2] bg-[#f8f3ee] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#cdad7d]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((value) => !value)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={processing}
                className="w-full rounded-xl bg-[#3b241d] py-3.5 text-sm font-bold text-white transition hover:bg-[#241816] disabled:opacity-50"
              >
                {processing ? 'Confirming Order...' : 'Confirm Order'}
              </button>
            </form>
          </div>

          <div className="rounded-[2rem] bg-[#2f1d19] p-8 text-white shadow-[0_26px_70px_rgba(36,24,22,0.18)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#e8d6cf]">Order Summary</p>
            <h2 className="mt-3 text-3xl font-black">Cart items</h2>

            <div className="mt-6 space-y-4">
              {cart?.items?.map((item) => (
                <div key={item.line_id} className="rounded-[1.4rem] bg-white/8 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black">{item.name}</p>
                      <p className="mt-1 text-sm text-[#e8d6cf]">{item.category} • Qty {item.quantity}</p>
                    </div>
                    <span className="text-sm font-bold">{formatCurrency(item.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
              <div className="flex items-center justify-between text-sm text-[#e8d6cf]">
                <span>Total Items</span>
                <span>{cart?.count || 0}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xl font-black">
                <span>Subtotal</span>
                <span>{formatCurrency(cart?.subtotal || 0)}</span>
              </div>
            </div>

            <p className="mt-6 text-sm leading-7 text-[#f2e6e0]">
              {isGuest
                ? 'Your customer account will be created automatically as part of this confirmation step.'
                : 'Your customer profile will be used to complete this order.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

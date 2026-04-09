import React, { useEffect, useMemo, useState } from 'react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { Eye, EyeOff } from 'lucide-react';
import DeliveryLocationSelector from '@/components/customer/DeliveryLocationSelector';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function Checkout({ cart, customer, pickupHours, formData, deliverySchedule, pickupSchedule }) {
  const { auth, flash } = usePage().props;
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const isGuest = !auth?.user;
  const pickupAvailable = pickupHours?.available ?? false;
  const pickupMinTime = pickupHours?.min_time || null;
  const pickupCloseTime = pickupHours?.close_time || null;

  const { data, setData, post, processing, errors } = useForm({
    full_name: formData?.full_name ?? customer?.full_name ?? '',
    phone: formData?.phone ?? customer?.phone ?? '',
    email: formData?.email ?? customer?.email ?? '',
    region_city: formData?.region_city ?? customer?.region_city ?? '',
    district_area: formData?.district_area ?? customer?.district_area ?? '',
    delivery_address: formData?.delivery_address ?? customer?.delivery_address ?? '',
    delivery_latitude: formData?.delivery_latitude ?? customer?.delivery_latitude ?? '',
    delivery_longitude: formData?.delivery_longitude ?? customer?.delivery_longitude ?? '',
    delivery_notes: formData?.delivery_notes ?? customer?.delivery_notes ?? '',
    fulfillment_method: formData?.fulfillment_method ?? 'delivery',
    pickup_time: formData?.pickup_time ?? '',
    password: '',
    password_confirmation: '',
  });

  const timeChoices = useMemo(() => {
    if (!pickupMinTime || !pickupCloseTime) {
      return { hours: [], minutesByHour: {} };
    }

    const [minHour, minMinute] = pickupMinTime.split(':').map(Number);
    const [closeHour, closeMinute] = pickupCloseTime.split(':').map(Number);
    const minutesByHour = {};
    const hours = [];

    let currentHour = minHour;
    let currentMinute = minMinute;

    while (currentHour < closeHour || (currentHour === closeHour && currentMinute <= closeMinute)) {
      if (!minutesByHour[currentHour]) {
        minutesByHour[currentHour] = [];
        hours.push(currentHour);
      }

      minutesByHour[currentHour].push(currentMinute);
      currentMinute += 1;

      if (currentMinute >= 60) {
        currentHour += 1;
        currentMinute = 0;
      }
    }

    return { hours, minutesByHour };
  }, [pickupMinTime, pickupCloseTime]);

  const selectedPickupHour = data.pickup_time ? Number(data.pickup_time.split(':')[0]) : null;
  const selectedPickupMinute = data.pickup_time ? Number(data.pickup_time.split(':')[1]) : null;

  useEffect(() => {
    if (data.fulfillment_method !== 'pickup') {
      if (data.pickup_time) {
        setData('pickup_time', '');
      }
      return;
    }

    if (!pickupAvailable) {
      setData('pickup_time', '');
      return;
    }

    if (!data.pickup_time && pickupHours?.min_time) {
      setData('pickup_time', pickupHours.min_time);
    }
  }, [data.fulfillment_method, pickupAvailable, pickupHours?.min_time]);

  const handlePickupHourChange = (hourValue) => {
    if (!hourValue) {
      setData('pickup_time', '');
      return;
    }

    const hour = Number(hourValue);
    const availableMinutes = timeChoices.minutesByHour[hour] || [];
    const minute = availableMinutes.includes(selectedPickupMinute) ? selectedPickupMinute : availableMinutes[0];

    if (minute == null) {
      setData('pickup_time', '');
      return;
    }

    setData('pickup_time', `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  };

  const handlePickupMinuteChange = (minuteValue) => {
    if (selectedPickupHour == null || !minuteValue) {
      setData('pickup_time', '');
      return;
    }

    setData('pickup_time', `${String(selectedPickupHour).padStart(2, '0')}:${String(Number(minuteValue)).padStart(2, '0')}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    post('/checkout');
  };

  const deliveryLocationValid = Boolean(
    String(data.delivery_address || '').trim(),
  );

  const canSubmit = data.fulfillment_method === 'delivery'
    ? deliveryLocationValid && !processing
    : !processing;

  const hasTopLevelError = Boolean(
    flash?.error ||
    errors.pickup_time ||
    errors.delivery_address ||
    errors.delivery_latitude ||
    errors.delivery_longitude ||
    errors.full_name ||
    errors.phone ||
    errors.email ||
    errors.password
  );

  const pickupWindowLabel = pickupAvailable
    ? `Choose a pickup time for ${pickupSchedule?.scheduled_date_label || 'today'} from ${pickupHours?.min_time} until ${pickupHours?.close_time}.`
    : `Pickup is currently unavailable. Working hours are ${pickupHours?.open_time} to ${pickupHours?.close_time}.`;

  return (
    <div className="min-h-screen bg-[#f7f2ea] px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a1f28]">Checkout</p>
            <h1 className="mt-2 text-4xl font-black text-[#241816]">Confirm your order</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#6f5d57]">
              {isGuest
                ? 'Create your customer account while confirming the order. We will collect your details, delivery or pickup choice, precise delivery location when needed, pickup time if needed, and your password.'
                : 'Review your details below and confirm the order. Delivery orders require a confirmed location before submission.'}
            </p>
          </div>
          <Link href="/" className="inline-flex items-center justify-center rounded-full border border-[#3b241d]/15 bg-white px-5 py-3 text-sm font-bold text-[#241816]">
            Back To Store
          </Link>
        </div>

        {(flash?.success || flash?.error || hasTopLevelError) && (
          <div className={`mt-6 rounded-2xl border px-5 py-4 text-sm font-medium ${
            flash.error || hasTopLevelError
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}>
            {flash.error
              || errors.pickup_time
              || errors.delivery_address
              || errors.delivery_latitude
              || errors.delivery_longitude
              || errors.full_name
              || errors.phone
              || errors.email
              || errors.password
              || flash.success}
          </div>
        )}

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] bg-white p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-[#241816]">{isGuest ? 'Customer account details' : 'Customer details'}</h2>
                <p className="mt-2 text-sm text-[#6f5d57]">
                  Full name, phone, and email are required. Delivery orders also need a valid selected location.
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

              <div className="grid gap-5 md:grid-cols-3">
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

                {data.fulfillment_method === 'pickup' ? (
                  <>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[#241816]">Hour</label>
                      <select
                        value={selectedPickupHour ?? ''}
                        onChange={(e) => handlePickupHourChange(e.target.value)}
                        disabled={!pickupAvailable}
                        className="w-full rounded-xl border border-[#e8ddd2] bg-[#f8f3ee] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#cdad7d] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {!timeChoices.hours.length && <option value="">No hours available</option>}
                        {timeChoices.hours.map((hour) => (
                          <option key={hour} value={hour}>
                            {String(hour).padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[#241816]">Minutes</label>
                      <select
                        value={selectedPickupMinute ?? ''}
                        onChange={(e) => handlePickupMinuteChange(e.target.value)}
                        disabled={!pickupAvailable || selectedPickupHour == null}
                        className="w-full rounded-xl border border-[#e8ddd2] bg-[#f8f3ee] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#cdad7d] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {selectedPickupHour == null && <option value="">Select hour first</option>}
                        {(timeChoices.minutesByHour[selectedPickupHour] || []).map((minute) => (
                          <option key={minute} value={minute}>
                            {String(minute).padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : null}
              </div>

              {data.fulfillment_method === 'delivery' ? (
                <>
                  <div className="rounded-2xl border border-[#eadfce] bg-[#fbf7f1] p-5">
                    <p className="text-sm font-semibold text-[#241816]">
                      Delivery schedule: {deliverySchedule?.scheduled_date_label || 'Today'}
                    </p>
                    <p className="mt-2 text-xs text-[#6f5d57]">
                      {deliverySchedule?.after_closing_hours
                        ? `Orders placed after ${deliverySchedule?.close_time} are scheduled for next-day delivery.`
                        : `Orders placed before ${deliverySchedule?.close_time} are scheduled for same-day delivery where possible.`}
                    </p>
                    <p className="mt-3 text-xs text-[#6f5d57]">
                      Manual address entry is active right now while Google Maps is turned off.
                    </p>
                  </div>
                  <DeliveryLocationSelector
                    visible
                    data={data}
                    setData={setData}
                    errors={errors}
                  />
                </>
              ) : null}

              {data.fulfillment_method === 'pickup' ? (
                <div className="rounded-2xl border border-[#eadfce] bg-[#fbf7f1] p-5">
                  <p className="text-sm font-semibold text-[#241816]">
                    Pickup schedule: {pickupSchedule?.scheduled_date_label || 'Today'}
                  </p>
                  <p className="mt-2 text-xs text-[#6f5d57]">
                    {pickupSchedule?.after_closing_hours
                      ? `Orders placed after ${pickupSchedule?.close_time} are scheduled for next-day pickup.`
                      : `Orders placed before ${pickupSchedule?.close_time} can be picked up the same day during working hours.`}
                  </p>
                  <p className="mt-3 text-xs text-[#6f5d57]">{pickupWindowLabel}</p>
                  {!pickupAvailable ? (
                    <div className="mt-3 rounded-xl border border-[#e8ddd2] bg-white px-4 py-3 text-sm text-[#6f5d57]">
                      No pickup times are available right now.
                    </div>
                  ) : null}
                  {errors.pickup_time && <div className="mt-2 text-xs text-red-500">{errors.pickup_time}</div>}
                </div>
              ) : null}

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
                disabled={!canSubmit}
                className="w-full rounded-xl bg-[#3b241d] py-3.5 text-sm font-bold text-white transition hover:bg-[#241816] disabled:opacity-50"
              >
                {processing ? 'Confirming Order...' : 'Confirm Order'}
              </button>
              {data.fulfillment_method === 'delivery' && !deliveryLocationValid ? (
                <p className="text-xs text-[#7d6a5f]">
                  Enter your delivery address before confirming a delivery order.
                </p>
              ) : null}
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

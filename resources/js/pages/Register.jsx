import React, { useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import { Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { data, setData, post, processing, errors } = useForm({
    full_name: '',
    phone: '',
    email: '',
    address: '',
    password: '',
    password_confirmation: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    post('/register');
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #3B2A1E 0%, #5C3D2E 40%, #8C6F53 100%)' }}>
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-14 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 80%, #CDAD7D 0%, transparent 50%), radial-gradient(circle at 80% 20%, #C8A97E 0%, transparent 50%)'
        }} />

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-16">
            <div className="bg-[#CDAD7D] p-2 rounded-xl">
              <img src="/images/amani_brew_mark.png" alt="Amani Brew" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-wide">Amani Brew</h1>
              <p className="text-sm text-amber-200 font-light">Customer Registration</p>
            </div>
          </div>

          <div className="space-y-6 max-w-md">
            <h2 className="text-4xl font-bold leading-tight">Create your customer account and start ordering fresh meat.</h2>
            <p className="text-amber-100/80 text-base leading-relaxed">
              Self-registration is for customers only. Staff accounts are created by the administrator inside the system.
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { value: 'Fast', label: 'Signup Process' },
              { value: 'Delivery', label: 'Or Pickup' },
              { value: 'Fresh', label: 'Daily Stock' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-extrabold text-[#CDAD7D]">{stat.value}</p>
                <p className="text-xs text-amber-200 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-200/60 text-center">© 2026 Amani Brew. All rights reserved.</p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center bg-[#F9F5EC] p-6">
        <div className="w-full max-w-xl">
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="bg-[var(--color-brand-dark)] p-2 rounded-xl">
              <img src="/images/amani_brew_mark.png" alt="Amani Brew" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <p className="font-bold text-xl text-[var(--color-brand-dark)]">Amani Brew</p>
              <p className="text-xs text-[var(--color-brand-tan)]">Customer Registration</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-10">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[var(--color-sys-text-primary)]">Create customer account</h2>
              <p className="text-sm text-[var(--color-sys-text-secondary)] mt-1.5">
                Enter your details below. Customers who sign up on their own are registered as customers automatically.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[var(--color-sys-text-primary)] mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={data.full_name}
                  onChange={(e) => setData('full_name', e.target.value)}
                  placeholder="Enter your full name"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-[var(--color-sys-border)] bg-[var(--color-sys-bg)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand-tan)] placeholder:text-gray-400 transition"
                />
                {errors.full_name && <div className="text-red-500 text-xs mt-1">{errors.full_name}</div>}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-sys-text-primary)] mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    value={data.phone}
                    onChange={(e) => setData('phone', e.target.value)}
                    placeholder="+255 7XX XXX XXX"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[var(--color-sys-border)] bg-[var(--color-sys-bg)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand-tan)] placeholder:text-gray-400 transition"
                  />
                  {errors.phone && <div className="text-red-500 text-xs mt-1">{errors.phone}</div>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-sys-text-primary)] mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    placeholder="Enter your email address"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[var(--color-sys-border)] bg-[var(--color-sys-bg)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand-tan)] placeholder:text-gray-400 transition"
                  />
                  {errors.email && <div className="text-red-500 text-xs mt-1">{errors.email}</div>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-sys-text-primary)] mb-1.5">Address</label>
                <textarea
                  value={data.address}
                  onChange={(e) => setData('address', e.target.value)}
                  placeholder="Enter your address"
                  required
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--color-sys-border)] bg-[var(--color-sys-bg)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand-tan)] placeholder:text-gray-400 transition resize-none"
                />
                {errors.address && <div className="text-red-500 text-xs mt-1">{errors.address}</div>}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-sys-text-primary)] mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={data.password}
                      onChange={(e) => setData('password', e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-[var(--color-sys-border)] bg-[var(--color-sys-bg)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand-tan)] placeholder:text-gray-400 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 outline-none"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && <div className="text-red-500 text-xs mt-1">{errors.password}</div>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-sys-text-primary)] mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={data.password_confirmation}
                      onChange={(e) => setData('password_confirmation', e.target.value)}
                      placeholder="Confirm your password"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-[var(--color-sys-border)] bg-[var(--color-sys-bg)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand-tan)] placeholder:text-gray-400 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 outline-none"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={processing}
                className="w-full py-3 bg-[var(--color-brand-dark)] text-white rounded-xl font-semibold text-sm hover:bg-[#2c1d14] transition-colors mt-2 disabled:opacity-50"
              >
                {processing ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[var(--color-sys-text-secondary)]">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-[var(--color-brand-dark)] hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { Eye, EyeOff } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function Login() {
  const { flash, formData } = usePage().props;
  const { t } = useI18n();
  const [showPassword, setShowPassword] = useState(false);
  const { data, setData, post, processing, errors } = useForm({
    email: formData?.email || '',
    password: '',
    remember: Boolean(formData?.remember),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    post('/login');
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #3B2A1E 0%, #5C3D2E 40%, #8C6F53 100%)' }}>
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-14 text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 80%, #CDAD7D 0%, transparent 50%), radial-gradient(circle at 80% 20%, #C8A97E 0%, transparent 50%)',
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-16">
            <div className="bg-[#CDAD7D] p-2 rounded-xl">
              <img src="/images/amani_brew_mark.png" alt="Amani Brew" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-wide">Amani Brew</h1>
              <p className="text-sm text-amber-200 font-light">{t('ui.login.brand_tagline', 'Premium Butchery')}</p>
            </div>
          </div>

          <div className="space-y-6 max-w-sm">
            <h2 className="text-4xl font-bold leading-tight">{t('ui.login.headline', 'Where Quality Meets Tradition')}</h2>
            <p className="text-amber-100/80 text-base leading-relaxed">
              {t('ui.login.description', 'From farm to table, we deliver the finest cuts of meat with a commitment to excellence, freshness, and sustainability.')}
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { value: '500+', label: t('ui.login.stats.happy_clients', 'Happy Clients') },
              { value: '15+', label: t('ui.login.stats.years_experience', 'Years Experience') },
              { value: '50+', label: t('ui.login.stats.premium_cuts', 'Premium Cuts') },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-extrabold text-[#CDAD7D]">{stat.value}</p>
                <p className="text-xs text-amber-200 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-200/60 text-center">{t('ui.login.copyright', '© 2026 Amani Brew. All rights reserved.')}</p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center bg-[#F9F5EC] p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="bg-[var(--color-brand-dark)] p-2 rounded-xl">
              <img src="/images/amani_brew_mark.png" alt="Amani Brew" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <p className="font-bold text-xl text-[var(--color-brand-dark)]">Amani Brew</p>
              <p className="text-xs text-[var(--color-brand-tan)]">{t('ui.login.brand_tagline', 'Premium Butchery')}</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-10">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[var(--color-sys-text-primary)]">{t('ui.login.title', 'Welcome back')}</h2>
              <p className="mt-1.5 text-sm text-[var(--color-sys-text-secondary)]">
                {t('ui.login.subtitle', 'Staff and customers use this same sign-in page. Your role decides where you go after login.')}
              </p>
            </div>

            {(flash?.success || flash?.error) && (
              <div
                className={`mb-6 rounded-2xl border px-4 py-3 text-sm font-medium ${
                  flash.error
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}
              >
                {flash.error || flash.success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[var(--color-sys-text-primary)] mb-1.5">{t('ui.login.email_label', 'Email Address')}</label>
                <input
                  type="email"
                  name="email"
                  value={data.email}
                  onChange={(e) => setData('email', e.target.value)}
                  placeholder={t('ui.login.email_placeholder', 'Enter your email address')}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-[var(--color-sys-border)] bg-[var(--color-sys-bg)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand-tan)] placeholder:text-gray-400 transition"
                />
                {errors.email && <div className="text-red-500 text-xs mt-1">{errors.email}</div>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-sys-text-primary)] mb-1.5">{t('ui.login.password_label', 'Password')}</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    placeholder={t('ui.login.password_placeholder', 'Enter your password')}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[var(--color-sys-border)] bg-[var(--color-sys-bg)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand-tan)] placeholder:text-gray-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <div className="text-red-500 text-xs mt-1">{errors.password}</div>}
              </div>

              <div className="flex items-center justify-end">
                <label className="mr-auto inline-flex items-center gap-2 text-sm text-[var(--color-sys-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={data.remember}
                    onChange={(e) => setData('remember', e.target.checked)}
                    className="h-4 w-4 rounded border border-[var(--color-sys-border)] text-[var(--color-brand-dark)] focus:ring-[var(--color-brand-tan)]"
                  />
                  <span>{t('ui.login.remember_me', 'Remember me')}</span>
                </label>
                <Link href="/forgot-password" className="text-sm font-medium text-[var(--color-brand-tan)] hover:underline">
                  {t('ui.login.forgot_password', 'Forgot password?')}
                </Link>
              </div>

              <button
                type="submit"
                disabled={processing}
                className="w-full py-3 bg-[var(--color-brand-dark)] text-white rounded-xl font-semibold text-sm hover:bg-[#2c1d14] transition-colors mt-2 disabled:opacity-50"
              >
                {processing ? t('ui.login.signing_in', 'Signing In...') : t('ui.login.sign_in', 'Sign In')}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[var(--color-sys-text-secondary)]">
              {t('ui.login.new_customer', 'New customer?')}{' '}
              <Link href="/register" className="font-semibold text-[var(--color-brand-dark)] hover:underline">
                {t('ui.login.create_account', 'Create a customer account')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

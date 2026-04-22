import React from 'react';
import { Link, useForm, usePage } from '@inertiajs/react';
import AutoDismissAlert from '@/components/ui/AutoDismissAlert';
import { useI18n } from '@/lib/i18n';

export default function ForgotPassword() {
  const { t } = useI18n();
  const { flash, formData } = usePage().props;
  const { data, setData, post, processing, errors } = useForm({
    email: formData?.email || '',
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    post('/forgot-password');
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
              <p className="text-sm text-amber-200 font-light">{t('frontend.forgot_password.brand_tagline', 'Password Recovery')}</p>
            </div>
          </div>

          <div className="space-y-6 max-w-sm">
            <h2 className="text-4xl font-bold leading-tight">
              {t('frontend.forgot_password.hero_title', 'Reset your password securely by email.')}
            </h2>
            <p className="text-amber-100/80 text-base leading-relaxed">
              {t('frontend.forgot_password.hero_description', 'Enter the email linked to your account and we will send you a secure password reset link.')}
            </p>
          </div>
        </div>

        <p className="relative z-10 text-xs text-amber-200/60 text-center">
          {t('frontend.forgot_password.copyright', '© 2026 Amani Brew. All rights reserved.')}
        </p>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center bg-[#F9F5EC] p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="bg-[var(--color-brand-dark)] p-2 rounded-xl">
              <img src="/images/amani_brew_mark.png" alt="Amani Brew" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <p className="font-bold text-xl text-[var(--color-brand-dark)]">Amani Brew</p>
              <p className="text-xs text-[var(--color-brand-tan)]">{t('frontend.forgot_password.brand_tagline', 'Password Recovery')}</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-10">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[var(--color-sys-text-primary)]">
                {t('frontend.forgot_password.title', 'Forgot password')}
              </h2>
              <p className="mt-1.5 text-sm text-[var(--color-sys-text-secondary)]">
                {t('frontend.forgot_password.subtitle', 'We will email you a reset link if the account exists.')}
              </p>
            </div>

            <AutoDismissAlert
              message={flash?.error || flash?.success}
              type={flash?.error ? 'error' : 'success'}
              className="mb-6 px-4 py-3"
            />

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[var(--color-sys-text-primary)] mb-1.5">
                  {t('frontend.forgot_password.email_label', 'Email Address')}
                </label>
                <input
                  type="email"
                  value={data.email}
                  onChange={(event) => setData('email', event.target.value)}
                  placeholder={t('frontend.forgot_password.email_placeholder', 'Enter your account email')}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-[var(--color-sys-border)] bg-[var(--color-sys-bg)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand-tan)] placeholder:text-gray-400 transition"
                />
                {errors.email && <div className="text-red-500 text-xs mt-1">{errors.email}</div>}
              </div>

              <button
                type="submit"
                disabled={processing}
                className="w-full py-3 bg-[var(--color-brand-dark)] text-white rounded-xl font-semibold text-sm hover:bg-[#2c1d14] transition-colors disabled:opacity-50"
              >
                {processing
                  ? t('frontend.forgot_password.actions.sending', 'Sending Reset Link...')
                  : t('frontend.forgot_password.actions.send_reset_link', 'Send Reset Link')}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[var(--color-sys-text-secondary)]">
              {t('frontend.forgot_password.footer.remembered_password', 'Remembered your password?')}{' '}
              <Link href="/login" className="font-semibold text-[var(--color-brand-dark)] hover:underline">
                {t('frontend.forgot_password.actions.back_to_sign_in', 'Back to sign in')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { LoaderCircle, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useI18n } from '@/lib/i18n';

export default function EditProfileDialog({ open, onOpenChange, user, address = '' }) {
  const { t } = useI18n();
  const form = useForm({
    full_name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    city: user?.city || '',
    country: user?.country || '',
    address: address || '',
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.setData({
      full_name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      city: user?.city || '',
      country: user?.country || '',
      address: address || '',
    });
  }, [open, user, address]);

  const submit = (event) => {
    event.preventDefault();
    form.transform((data) => ({
      ...data,
      _method: 'put',
    })).post('/profile/update', {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: () => onOpenChange(false),
    });
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{t('frontend.edit_profile.title', 'Edit Profile')}</h2>
            <p className="mt-1 text-sm text-gray-500">{t('frontend.edit_profile.subtitle', 'Update your personal details.')}</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
            aria-label={t('frontend.edit_profile.close', 'Close edit profile dialog')}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label={t('frontend.edit_profile.fields.full_name', 'Full Name')} value={form.data.full_name} onChange={(e) => form.setData('full_name', e.target.value)} error={form.errors.full_name} className="h-11 rounded-xl" />
            <Input label={t('frontend.edit_profile.fields.email', 'Email')} type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} className="h-11 rounded-xl" />
            <Input label={t('frontend.edit_profile.fields.phone', 'Phone Number')} value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} error={form.errors.phone} className="h-11 rounded-xl" />
            <Input label={t('frontend.edit_profile.fields.city', 'City')} value={form.data.city} onChange={(e) => form.setData('city', e.target.value)} error={form.errors.city} className="h-11 rounded-xl" />
            <Input label={t('frontend.edit_profile.fields.country', 'Country')} value={form.data.country} onChange={(e) => form.setData('country', e.target.value)} error={form.errors.country} className="h-11 rounded-xl" />
            <div className="md:col-span-2">
              <Input label={t('frontend.edit_profile.fields.address', 'Address')} value={form.data.address} onChange={(e) => form.setData('address', e.target.value)} error={form.errors.address} className="h-11 rounded-xl" />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="w-full rounded-xl sm:w-auto" onClick={() => onOpenChange(false)}>
              {t('frontend.common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" className="w-full rounded-xl sm:w-auto" disabled={form.processing}>
              {form.processing ? (
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle size={16} className="animate-spin" />
                  {t('frontend.common.saving', 'Saving...')}
                </span>
              ) : t('frontend.common.save_changes', 'Save Changes')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

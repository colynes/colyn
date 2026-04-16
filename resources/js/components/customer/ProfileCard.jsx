import React from 'react';
import { Mail, MapPin, Pencil, Phone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { useI18n } from '@/lib/i18n';

function initialsFor(name) {
  return (name || 'Customer')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'CU';
}

export default function ProfileCard({ user, onEdit }) {
  const { t } = useI18n();
  const avatarContent = user?.avatar_url ? (
    <img src={user.avatar_url} alt={user.name} className="h-full w-full object-cover" />
  ) : (
    <span>{initialsFor(user?.name)}</span>
  );

  const location = [user?.city, user?.country].filter(Boolean).join(', ') || t('frontend.profile_card.no_location', 'No location added');

  return (
    <Card className="w-full rounded-2xl border border-gray-100 bg-white shadow-md">
      <CardContent className="relative p-6">
        <button
          type="button"
          onClick={onEdit}
          className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
          aria-label={t('frontend.profile_card.edit_profile', 'Edit profile')}
        >
          <Pencil size={16} />
        </button>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-3xl font-black text-gray-700 shadow-sm ring-4 ring-gray-50">
            {avatarContent}
          </div>

          <div className="min-w-0 flex-1 pr-10">
            <p className="-mt-1 text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">{t('frontend.profile_card.profile', 'Profile')}</p>
            <h2 className="mt-1 break-words text-3xl font-black tracking-[-0.03em] text-gray-800">{user?.name || t('frontend.profile_card.customer_name', 'Customer Name')}</h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-2xl bg-gray-50 px-4 py-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm">
                  <Mail size={17} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">{t('frontend.profile_card.labels.email', 'Email')}</p>
                  <p className="mt-1 break-all text-sm font-medium text-gray-800">{user?.email || t('frontend.profile_card.no_email', 'No email added')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-gray-50 px-4 py-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm">
                  <Phone size={17} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">{t('frontend.profile_card.labels.phone', 'Phone')}</p>
                  <p className="mt-1 text-sm font-medium text-gray-800">{user?.phone || t('frontend.profile_card.no_phone', 'No phone added')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-gray-50 px-4 py-3 sm:col-span-2">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm">
                  <MapPin size={17} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">{t('frontend.profile_card.labels.location', 'Location')}</p>
                  <p className="mt-1 text-sm font-medium text-gray-800">{location}</p>
                  <p className="mt-1 text-sm text-gray-500">{user?.address || t('frontend.profile_card.no_address', 'No address added')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import React, { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { ChevronDown, Languages } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const fallbackLocales = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'sw', name: 'Swahili', native: 'Kiswahili' },
];

export default function LanguageSwitcher({ className = '', variant = 'pill' }) {
  const { locale, availableLocales, t } = useI18n();
  const [pendingLocale, setPendingLocale] = useState(null);
  const locales = useMemo(
    () => (availableLocales?.length ? availableLocales : fallbackLocales),
    [availableLocales],
  );

  const switchLocale = (nextLocale) => {
    if (!nextLocale || nextLocale === locale || pendingLocale) {
      return;
    }

    setPendingLocale(nextLocale);

    router.post('/locale', {
      locale: nextLocale,
    }, {
      preserveScroll: true,
      preserveState: true,
      replace: true,
      onFinish: () => setPendingLocale(null),
    });
  };

  if (variant === 'dropdown') {
    return (
      <div
        className={`relative inline-flex items-center gap-3 rounded-full border border-[#e1d5c7] bg-white/95 px-4 py-2.5 shadow-[0_14px_30px_rgba(36,24,22,0.08)] backdrop-blur ${className}`}
      >
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#7a1f28]/8 text-[#7a1f28]"
          aria-hidden="true"
        >
          <Languages className="h-4.5 w-4.5" strokeWidth={2} />
        </span>

        <label className="sr-only" htmlFor="landing-language-switcher">
          {t('ui.language_switcher.label', 'Language')}
        </label>

        <select
          id="landing-language-switcher"
          value={pendingLocale || locale}
          onChange={(event) => switchLocale(event.target.value)}
          disabled={Boolean(pendingLocale)}
          className="appearance-none bg-transparent pr-7 text-sm font-semibold text-[#241816] outline-none disabled:cursor-not-allowed disabled:opacity-70"
          aria-label={t('ui.language_switcher.label', 'Language')}
        >
          {locales.map((item) => {
            const code = item.code || item.value || '';
            const label = item.native || item.name || String(code).toUpperCase();

            return (
              <option key={code} value={code}>
                {label}
              </option>
            );
          })}
        </select>

        <ChevronDown className="pointer-events-none absolute right-4 h-4 w-4 text-[#7a1f28]" />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-[1.2rem] border border-[#6f5642] bg-[#5a4330] p-1.5 shadow-[0_12px_24px_rgba(79,49,24,0.18)] ${className}`}
      role="group"
      aria-label={t('ui.language_switcher.label', 'Language')}
    >
      <span
        className="inline-flex h-11 w-11 items-center justify-center rounded-[0.95rem] bg-white/10 text-[#f3e6d8]"
        aria-hidden="true"
      >
        <Languages className="h-5 w-5" strokeWidth={2} />
      </span>

      <div className="inline-flex items-center gap-1">
        {locales.map((item) => {
          const code = item.code || item.value || '';
          const label = item.native || item.name || String(code).toUpperCase();
          const isActive = code === locale;
          const isPending = pendingLocale === code;

          return (
            <button
              key={code}
              type="button"
              onClick={() => switchLocale(code)}
              disabled={isActive || isPending}
              className={`rounded-[0.95rem] px-4 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? 'bg-[#23170d] text-white shadow-[0_10px_20px_rgba(0,0,0,0.18)]'
                  : 'text-[#f4e8db] hover:bg-white/10'
              } ${isPending ? 'opacity-70' : ''}`}
              aria-pressed={isActive}
              title={item.name || label}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

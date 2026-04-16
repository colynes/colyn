import { usePage } from '@inertiajs/react';

const LOCALE_TAGS = {
  en: 'en-TZ',
  sw: 'sw-TZ',
};

function readPath(source, path) {
  return path.split('.').reduce((value, segment) => {
    if (value && typeof value === 'object' && segment in value) {
      return value[segment];
    }

    return undefined;
  }, source);
}

export function getLocaleTag(locale) {
  return LOCALE_TAGS[locale] || LOCALE_TAGS.en;
}

export function translate(translations, key, fallback = key) {
  const value = readPath(translations, key);

  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  return fallback;
}

export function interpolate(template, replacements = {}) {
  return Object.entries(replacements).reduce((output, [key, value]) => (
    output.replaceAll(`:${key}`, String(value ?? ''))
  ), String(template ?? ''));
}

export function formatNumber(value, locale = 'en', options = {}) {
  return new Intl.NumberFormat(getLocaleTag(locale), options).format(value || 0);
}

export function formatCurrency(value, locale = 'en', currency = 'TZS', options = {}) {
  return new Intl.NumberFormat(getLocaleTag(locale), {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    ...options,
  }).format(value || 0);
}

export function formatDate(value, locale = 'en', options = {}) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat(getLocaleTag(locale), options).format(new Date(value));
}

export function useI18n() {
  const { localization = {} } = usePage().props;
  const locale = localization.current || 'en';
  const translations = localization.translations || {};
  const availableLocales = localization.available || [];

  return {
    locale,
    localeTag: getLocaleTag(locale),
    availableLocales,
    translations,
    t: (key, fallback = key) => translate(translations, key, fallback),
    tp: (key, fallback = key, replacements = {}) => interpolate(
      translate(translations, key, fallback),
      replacements,
    ),
  };
}

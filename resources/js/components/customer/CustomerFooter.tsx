import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import {
  customerFooterBrand,
  customerFooterContactItems,
  customerFooterDeveloperCredit,
  customerFooterLegalLinks,
  customerFooterQuickLinks,
  customerFooterSocialLinks,
  customerFooterSupportLinks,
  type FooterContactItem,
  type FooterLinkItem,
  type FooterSocialLink,
} from '@/config/customerFooter';
import { useI18n } from '@/lib/i18n';
import { formatWorkingHoursLabel } from '@/lib/storeHours';

function isExternalHref(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('tel:');
}

function FooterLink({
  href,
  children,
  className,
  ariaLabel,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  if (isExternalHref(href)) {
    const openSafely = href.startsWith('http://') || href.startsWith('https://');

    return (
      <a
        href={href}
        className={className}
        aria-label={ariaLabel}
        {...(openSafely ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}

function FooterLinkGroup({
  title,
  links,
  t,
}: {
  title: string;
  links: FooterLinkItem[];
  t: (key: string, fallback?: string) => string;
}) {
  return (
    <div>
      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#f3dfca]">{title}</h3>
      <nav className="mt-5" aria-label={title}>
        <ul className="space-y-2.5">
          {links.map((link) => (
            <li key={link.href}>
              <FooterLink
                href={link.href}
                className="group inline-flex items-center gap-2 text-sm font-medium text-[#eaded2] transition hover:text-white focus-visible:text-white"
              >
                <span>{t(link.labelKey, link.fallback)}</span>
                <ArrowRight
                  size={14}
                  className="translate-y-px text-[#d5b08b] opacity-0 transition duration-200 group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:translate-x-0.5 group-focus-visible:opacity-100"
                />
              </FooterLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function ContactItem({
  item,
  t,
  valueOverride,
}: {
  item: FooterContactItem;
  t: (key: string, fallback?: string) => string;
  valueOverride?: string;
}) {
  const Icon = item.icon;
  const label = t(item.labelKey, item.fallbackLabel);
  const value = valueOverride ?? t(item.valueKey, item.fallbackValue);
  const content = (
    <>
      <span className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/8 text-[#f3dfca] ring-1 ring-white/10">
        <Icon size={18} />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d3b59b]">{label}</span>
        <span className="mt-2 block text-sm font-medium leading-6 text-white">{value}</span>
      </span>
    </>
  );

  if (!item.href) {
    return <div className="flex items-start gap-3">{content}</div>;
  }

  return (
    <FooterLink
      href={item.href}
      className="flex items-start gap-3 rounded-[1.35rem] transition hover:bg-white/5 focus-visible:bg-white/5"
      ariaLabel={`${label}: ${value}`}
    >
      {content}
    </FooterLink>
  );
}

function SocialLinkItem({
  item,
  t,
}: {
  item: FooterSocialLink;
  t: (key: string, fallback?: string) => string;
}) {
  const Icon = item.icon;
  const label = t(item.labelKey, item.fallbackLabel);

  return (
    <FooterLink
      href={item.href}
      ariaLabel={label}
      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/8 text-[#f3dfca] ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-white/14 hover:text-white focus-visible:-translate-y-0.5 focus-visible:bg-white/14 focus-visible:text-white"
    >
      <Icon size={18} />
      <span className="sr-only">{label}</span>
    </FooterLink>
  );
}

export default function CustomerFooter() {
  const { pickupHours } = usePage().props as { pickupHours?: { open_time?: string; close_time?: string } };
  const { t, tp, localeTag } = useI18n();
  const currentYear = new Date().getFullYear();
  const workingHoursLabel = formatWorkingHoursLabel({
    pickupHours,
    localeTag,
    daysLabel: t('customer_footer.contact.hours_days', 'Mon - Sat'),
  }) || t('customer_footer.contact.hours_value', 'Mon - Sat, 7:00 AM - 7:00 PM');

  return (
    <footer
      className="mt-10 w-full border-t border-[#4a372c] bg-[linear-gradient(180deg,#38261d_0%,#261812_100%)] text-[#f7efe8]"
      aria-labelledby="customer-footer-heading"
    >
      <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute right-[-4rem] top-[-4rem] h-48 w-48 rounded-full bg-[#cdaa7b]/12 blur-3xl" />
            <div className="absolute bottom-[-5rem] left-[-5rem] h-56 w-56 rounded-full bg-[#7a1f28]/18 blur-3xl" />
          </div>

        <div className="relative mx-auto max-w-[92rem]">
          <div className="grid gap-10 px-6 py-10 sm:px-8 sm:py-12 lg:grid-cols-[1.12fr_0.8fr_0.8fr_1fr] lg:gap-8">
            <section className="max-w-md">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-[#efe3d7] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                  <img
                    src={customerFooterBrand.logoSrc}
                    alt={t('customer_footer.brand.logo_alt', customerFooterBrand.logoAlt)}
                    className="h-10 w-10 object-contain"
                  />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#d8b48a]">
                    {t('customer_footer.brand.kicker', 'Customer ordering')}
                  </p>
                  <h2 id="customer-footer-heading" className="mt-2 text-2xl font-black tracking-[-0.03em] text-white">
                    {customerFooterBrand.name}
                  </h2>
                </div>
              </div>

              <p className="mt-5 text-sm leading-7 text-[#eaded3]">
                {t(
                  'customer_footer.brand.statement',
                  'Amani Brew helps homes and hospitality teams order premium meat with clear pricing, dependable delivery, and smooth pickup planning across Dar es Salaam.',
                )}
              </p>

              {customerFooterSocialLinks.length > 0 ? (
                <div className="mt-6 flex flex-wrap gap-3">
                  {customerFooterSocialLinks.map((item) => (
                    <SocialLinkItem key={item.href} item={item} t={t} />
                  ))}
                </div>
              ) : null}
            </section>

            <FooterLinkGroup
              title={t('customer_footer.sections.quick_links', 'Quick Links')}
              links={customerFooterQuickLinks}
              t={t}
            />

            <FooterLinkGroup
              title={t('customer_footer.sections.support', 'Support & Company')}
              links={customerFooterSupportLinks}
              t={t}
            />

            <section>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#f3dfca]">
                {t('customer_footer.sections.contact', 'Contact Details')}
              </h3>
              <address className="mt-5 space-y-4 not-italic">
                {customerFooterContactItems.map((item) => (
                  <ContactItem
                    key={item.valueKey}
                    item={item}
                    t={t}
                    valueOverride={item.valueKey === 'customer_footer.contact.hours_value' ? workingHoursLabel : undefined}
                  />
                ))}
              </address>
            </section>
          </div>

          <div className="relative flex flex-col gap-4 border-t border-white/10 px-6 py-5 text-sm text-[#d8c8bb] sm:px-8 lg:flex-row lg:items-center lg:justify-between">
            <p className="font-medium">
              {tp(
                'customer_footer.bottom.copyright',
                '© :year Amani Brew. All rights reserved.',
                { year: currentYear },
              )}
            </p>

            <div className="flex flex-wrap items-center gap-4">
              {customerFooterLegalLinks.map((link) => (
                <FooterLink
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center gap-1.5 font-medium text-[#efe4da] transition hover:text-white focus-visible:text-white"
                >
                  <span>{t(link.labelKey, link.fallback)}</span>
                  <ArrowRight size={13} className="opacity-70" />
                </FooterLink>
              ))}

              {customerFooterDeveloperCredit ? (
                <FooterLink
                  href={customerFooterDeveloperCredit.href}
                  className="inline-flex items-center gap-1.5 text-[#d8c8bb] transition hover:text-white focus-visible:text-white"
                >
                  <span>{t('customer_footer.bottom.developer_credit_prefix', 'Built with care by')}</span>
                  <span className="font-semibold">{customerFooterDeveloperCredit.label}</span>
                </FooterLink>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

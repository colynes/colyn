import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Headset,
  HelpCircle,
  Mail,
  MapPin,
  MessageCircle,
  Minus,
  PackageCheck,
  PhoneCall,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UsersRound,
} from 'lucide-react';
import {
  customerFooterContactItems,
  customerFooterQuickLinks,
  customerInfoPages,
} from '@/config/customerFooter';
import StoreLayout from '@/components/StoreLayout';
import { useI18n } from '@/lib/i18n';
import { formatWorkingHoursLabel } from '@/lib/storeHours';

function readPath(source, path) {
  return path.split('.').reduce((value, segment) => {
    if (value && typeof value === 'object' && segment in value) {
      return value[segment];
    }

    return undefined;
  }, source);
}

function SupportContactItem({ item, t, valueOverride }) {
  const Icon = item.icon;
  const label = t(item.labelKey, item.fallbackLabel);
  const value = valueOverride ?? t(item.valueKey, item.fallbackValue);

  if (!item.href) {
    return (
      <div className="flex items-start gap-3 rounded-[1.4rem] bg-white/6 p-4 ring-1 ring-white/8">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#f3dfca]">
          <Icon size={18} />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d3b59b]">{label}</p>
          <p className="mt-2 text-sm font-medium leading-6 text-white">{value}</p>
        </div>
      </div>
    );
  }

  return (
    <a
      href={item.href}
      className="flex items-start gap-3 rounded-[1.4rem] bg-white/6 p-4 ring-1 ring-white/8 transition hover:bg-white/10"
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#f3dfca]">
        <Icon size={18} />
      </span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d3b59b]">{label}</p>
        <p className="mt-2 text-sm font-medium leading-6 text-white">{value}</p>
      </div>
    </a>
  );
}

function HelpfulLinksSection({ pageKey, homeHref, t, centered = false }) {
  const helpfulLinks = [...customerFooterQuickLinks.slice(0, 2), ...Object.values(customerInfoPages)]
    .filter((link) => link.pageKey !== pageKey)
    .slice(0, 6);

  return (
    <div className={centered ? 'px-6 pb-8 pt-2 sm:px-8' : ''}>
      <div className={centered ? 'mx-auto max-w-5xl' : ''}>
        <p className={`text-xs font-semibold uppercase tracking-[0.22em] text-[#7a1f28] ${centered ? 'text-center' : ''}`}>
          {t('info_pages.shared.related_links_title', 'Helpful links')}
        </p>

        <div className={`mt-4 flex flex-wrap gap-3 ${centered ? 'justify-center' : ''}`}>
          {helpfulLinks.map((link) => {
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-2 rounded-[1rem] border border-[var(--color-sys-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-sys-text-primary)] transition-colors hover:bg-[#f9f5ed] whitespace-nowrap"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-brand-dark)] text-white text-xs">
                  <Icon size={12} />
                </span>
                {t(link.labelKey, link.fallback)}
              </Link>
            );
          })}
        </div>

        <div className={`mt-8 flex flex-wrap gap-3 ${centered ? 'justify-center' : ''}`}>
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-2xl bg-[var(--color-brand-dark)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2c1d14]"
          >
            {t('info_pages.shared.browse_products', 'Browse products')}
          </Link>
          <Link
            href={homeHref}
            className="inline-flex items-center justify-center rounded-2xl border border-[var(--color-sys-border)] bg-white px-6 py-3 text-sm font-semibold text-[var(--color-sys-text-primary)] shadow-sm transition hover:bg-[#fffaf4]"
          >
            {t('info_pages.shared.go_home', 'Return home')}
          </Link>
        </div>
      </div>
    </div>
  );
}

function AboutInfoPage({
  pageContent,
  highlights,
  sections,
  homeHref,
  workingHoursLabel,
  t,
}) {
  const heroStats = [
    {
      label: t('info_pages.about.stats.catalog_label', 'Live catalog'),
      value: t('info_pages.about.stats.catalog_value', 'Products, packs, and promos'),
      icon: ShoppingBag,
    },
    {
      label: t('info_pages.about.stats.fulfillment_label', 'Fulfillment'),
      value: t('info_pages.about.stats.fulfillment_value', 'Delivery or pickup'),
      icon: Truck,
    },
    {
      label: t('info_pages.about.stats.care_label', 'Customer care'),
      value: workingHoursLabel,
      icon: Clock3,
    },
  ];

  const imageStories = [
    {
      src: '/images/premium%20cuts.jpeg',
      title: t('info_pages.about.image_story.quality_title', 'Premium cuts'),
      description: t('info_pages.about.image_story.quality_description', 'Focused selection and clear product details before checkout.'),
    },
    {
      src: '/images/delivery.jpeg',
      title: t('info_pages.about.image_story.delivery_title', 'Reliable delivery'),
      description: t('info_pages.about.image_story.delivery_description', 'Order handling built around timing, location, and customer updates.'),
    },
    {
      src: '/images/cold%20chain.jpeg',
      title: t('info_pages.about.image_story.cold_chain_title', 'Fresh handling'),
      description: t('info_pages.about.image_story.cold_chain_description', 'A practical flow from preparation to fulfillment.'),
    },
  ];

  const principles = [
    {
      title: t('info_pages.about.principles.freshness_title', 'Freshness first'),
      description: t('info_pages.about.principles.freshness_description', 'Every shopping flow is built around clear availability, quality handling, and timely fulfillment.'),
      icon: PackageCheck,
    },
    {
      title: t('info_pages.about.principles.trust_title', 'Simple trust'),
      description: t('info_pages.about.principles.trust_description', 'Customers see prices, quantities, delivery choices, and cart totals before confirming the order.'),
      icon: ShieldCheck,
    },
    {
      title: t('info_pages.about.principles.repeat_title', 'Easy repeat orders'),
      description: t('info_pages.about.principles.repeat_description', 'Profiles, order tracking, packs, and subscription requests support customers who order often.'),
      icon: UsersRound,
    },
  ];

  return (
    <StoreLayout showLiveCart={false}>
      <div className="space-y-12">
        <section className="relative min-h-[34rem] overflow-hidden rounded-[2rem] bg-[#241816] text-white shadow-[0_28px_80px_rgba(36,24,22,0.22)]">
          <img
            src="/images/master%20butcher.jpeg"
            alt={t('info_pages.about.hero_image_alt', 'Amani Brew preparation team')}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(36,24,22,0.88)_0%,rgba(36,24,22,0.64)_46%,rgba(36,24,22,0.14)_100%)]" />

          <div className="relative flex min-h-[34rem] flex-col justify-between px-6 py-8 sm:px-10 lg:px-12">
            <div className="flex items-center gap-3">
              <span className="flex h-13 w-13 items-center justify-center rounded-2xl bg-white shadow-lg">
                <img src="/images/amani_brew_mark.png" alt="Amani Brew logo" className="h-10 w-10 object-contain" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#f0d8c2]">{pageContent.eyebrow || 'About Amani Brew'}</p>
                <p className="mt-1 text-xs font-medium text-[#eaded2]">Dar es Salaam, Tanzania</p>
              </div>
            </div>

            <div className="max-w-3xl py-10">
              <h1 className="text-4xl font-black leading-[1.05] sm:text-5xl lg:text-6xl">
                {pageContent.title || 'Fresh ordering built for trust, clarity, and dependable service.'}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[#f4e8dc] sm:text-lg">
                {pageContent.subtitle || pageContent.intro}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#4f3118] transition hover:bg-[#fff4ea]"
                >
                  {t('info_pages.shared.browse_products', 'Browse products')}
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href={homeHref}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/30 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  {t('info_pages.shared.go_home', 'Return home')}
                </Link>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {heroStats.map((stat) => {
                const Icon = stat.icon;

                return (
                  <div key={stat.label} className="flex items-center gap-3 rounded-2xl bg-white/12 px-4 py-4 ring-1 ring-white/15 backdrop-blur">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-[#f3dfca]">
                      <Icon size={19} />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-[#f0d8c2]">{stat.label}</p>
                      <p className="mt-1 text-sm font-bold leading-5 text-white">{stat.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase text-[#7a1f28]">
              {t('info_pages.about.story_eyebrow', 'Our approach')}
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#241816] sm:text-4xl">
              {pageContent.intro || 'Practical quality from cart to doorstep.'}
            </h2>
            <p className="mt-5 text-base leading-8 text-[#6f5d57]">
              {t(
                'info_pages.about.story_description',
                'Amani Brew connects product visibility, order control, pickup planning, and delivery support in one customer flow so every order feels clear before it is confirmed.',
              )}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {(highlights.length ? highlights : principles).slice(0, 3).map((item, index) => {
              const Icon = [CheckCircle2, Truck, UsersRound][index] || CheckCircle2;

              return (
                <article key={item.title} className="rounded-[1.4rem] border border-[#eadfd4] bg-white p-5 shadow-sm">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f5eadb] text-[#7a1f28]">
                    <Icon size={18} />
                  </span>
                  <h3 className="mt-4 text-lg font-black text-[#241816]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#6f5d57]">{item.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          <div className="overflow-hidden rounded-[2rem]">
            <img
              src="/images/afrm%20to%20table.jpeg"
              alt={t('info_pages.about.market_image_alt', 'Fresh Amani Brew products')}
              className="h-full min-h-[28rem] w-full object-cover"
            />
          </div>

          <div className="flex flex-col justify-center rounded-[2rem] bg-[#fffaf4] p-6 ring-1 ring-[#eadfd4] sm:p-8">
            <p className="text-sm font-bold uppercase text-[#7a1f28]">
              {t('info_pages.about.promise_eyebrow', 'What guides us')}
            </p>
            <div className="mt-6 space-y-5">
              {principles.map((principle) => {
                const Icon = principle.icon;

                return (
                  <article key={principle.title} className="flex gap-4">
                    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#3b241d] text-white">
                      <Icon size={20} />
                    </span>
                    <div>
                      <h3 className="text-lg font-black text-[#241816]">{principle.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-[#6f5d57]">{principle.description}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase text-[#7a1f28]">
                {t('info_pages.about.service_eyebrow', 'How service comes together')}
              </p>
              <h2 className="mt-3 text-3xl font-black text-[#241816]">
                {t('info_pages.about.service_title', 'Fresh products, clear orders, dependable fulfillment.')}
              </h2>
            </div>
            <Link href="/delivery-information" className="inline-flex items-center gap-2 text-sm font-bold text-[#7a1f28]">
              {t('customer_footer.links.delivery', 'Delivery Information')}
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-3">
            {imageStories.map((story) => (
              <article key={story.title} className="overflow-hidden rounded-[1.6rem] border border-[#eadfd4] bg-white shadow-sm">
                <img src={story.src} alt={story.title} className="h-52 w-full object-cover" />
                <div className="p-5">
                  <h3 className="text-lg font-black text-[#241816]">{story.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[#6f5d57]">{story.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {sections.length > 0 ? (
          <section className="grid gap-5 lg:grid-cols-3">
            {sections.map((section) => (
              <article key={section.title} className="rounded-[1.5rem] border border-[#eadfd4] bg-[#f7f1e8] p-6">
                <h3 className="text-xl font-black text-[#241816]">{section.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#6f5d57]">{section.description}</p>
              </article>
            ))}
          </section>
        ) : null}

        <section className="grid gap-5 rounded-[2rem] bg-[#2f1d19] p-6 text-white sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-[#f3dfca]">
                <MapPin size={19} />
              </span>
              <p className="text-sm font-bold text-[#d8b48a]">
                {t('customer_footer.contact.location_value', 'Dar es Salaam, Tanzania')}
              </p>
            </div>
            <h2 className="mt-4 text-2xl font-black">
              {t('info_pages.about.cta_title', 'Ready to place your next order?')}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#eaded3]">
              {t('info_pages.about.cta_description', 'Browse products, compare packs, and use your customer account to keep orders and profile details organized.')}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-bold text-[#3b241d] transition hover:bg-[#fff4ea]"
            >
              {t('info_pages.shared.browse_products', 'Browse products')}
            </Link>
            <Link
              href="/contact-us"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              {t('customer_footer.links.contact', 'Contact Us')}
            </Link>
          </div>
        </section>
      </div>
    </StoreLayout>
  );
}

function ContactMethodCard({ item, t, valueOverride }) {
  const Icon = item.icon;
  const label = t(item.labelKey, item.fallbackLabel);
  const value = valueOverride ?? t(item.valueKey, item.fallbackValue);
  const content = (
    <>
      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f5eadb] text-[#7a1f28]">
        <Icon size={20} />
      </span>
      <span>
        <span className="block text-xs font-bold uppercase tracking-[0.2em] text-[#8b6a46]">{label}</span>
        <span className="mt-2 block text-base font-black leading-7 text-[#241816]">{value}</span>
      </span>
    </>
  );

  if (!item.href) {
    return (
      <div className="flex items-start gap-4 rounded-[1.5rem] border border-[#eadfd4] bg-white p-5 shadow-sm">
        {content}
      </div>
    );
  }

  return (
    <a
      href={item.href}
      className="flex items-start gap-4 rounded-[1.5rem] border border-[#eadfd4] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(44,30,22,0.1)]"
    >
      {content}
    </a>
  );
}

function FaqAccordionItem({ question, answer, isOpen, onClick }) {
  return (
    <div className="border-b border-[var(--color-sys-border)] py-6 last:border-0">
      <button
        type="button"
        onClick={onClick}
        className="group flex w-full items-center justify-between gap-4 text-left"
      >
        <h3 className="text-lg font-semibold text-[var(--color-sys-text-primary)] transition-colors group-hover:text-[var(--color-brand-dark)]">
          {question}
        </h3>
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
            isOpen
              ? 'border-[var(--color-brand-dark)] bg-[var(--color-brand-dark)] text-white'
              : 'border-[var(--color-sys-text-secondary)] text-[var(--color-sys-text-secondary)] group-hover:border-[var(--color-brand-dark)] group-hover:text-[var(--color-brand-dark)]'
          }`}
        >
          {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </span>
      </button>
      <div className={`mt-4 overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <p className="text-base leading-relaxed text-[var(--color-sys-text-secondary)]">{answer}</p>
      </div>
    </div>
  );
}

function FaqHelpCenterPage({
  pageContent,
  sections,
  homeHref,
  t,
}) {
  const [openKey, setOpenKey] = useState('Orders-0');
  const [searchTerm, setSearchTerm] = useState('');
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const groupedSections = sections.reduce((groups, section) => {
    const groupTitle = section.group || t('info_pages.faqs.default_group', 'General');
    const existingGroup = groups.find((group) => group.title === groupTitle);

    if (existingGroup) {
      existingGroup.items.push(section);
    } else {
      groups.push({ title: groupTitle, items: [section] });
    }

    return groups;
  }, []);
  const filteredGroups = groupedSections
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!normalizedSearch) {
          return true;
        }

        return [item.title, item.description, group.title]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <StoreLayout showLiveCart={false}>
      <section className="rounded-[2rem] bg-[var(--color-sys-bg)] px-4 py-12 text-center ring-1 ring-[var(--color-sys-border)] lg:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-brand-light-tan)] text-[var(--color-brand-dark)]">
            <HelpCircle className="h-8 w-8" />
          </div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-dark)]">
            {pageContent.eyebrow || t('customer_footer.links.faqs', 'FAQs')}
          </p>
          <h1 className="mb-4 text-4xl font-extrabold text-[var(--color-sys-text-primary)] sm:text-5xl">
            {t('info_pages.faqs.help_title_prefix', 'Frequently Asked Questions')}{' '}
            <span className="text-[var(--color-brand-dark)]">{t('info_pages.faqs.help_title_accent', '(FAQs)')}</span>
          </h1>
          <p className="mb-8 text-lg text-[var(--color-sys-text-secondary)]">
            {pageContent.subtitle || t('info_pages.faqs.help_subtitle', 'Everything you need to know about Amani Brew.')}
          </p>
          <div className="relative mx-auto mt-8 max-w-2xl">
            <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
              <Search className="h-5 w-5 text-[var(--color-sys-text-secondary)]" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t('info_pages.faqs.search_placeholder', 'Search questions or keywords...')}
              className="h-14 w-full rounded-2xl border border-[var(--color-sys-border)] bg-[var(--color-sys-card)] pl-12 pr-4 text-lg text-[var(--color-sys-text-primary)] shadow-sm outline-none transition placeholder:text-[var(--color-sys-text-secondary)] focus:border-[var(--color-brand-tan)] focus:ring-4 focus:ring-[var(--color-brand-light-tan)]"
            />
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-4xl px-4">
          {filteredGroups.length > 0 ? (
            filteredGroups.map((group, groupIndex) => (
              <div key={group.title} className="mb-16 last:mb-0">
                <h2 className="mb-8 flex items-center gap-3 text-xl font-bold uppercase tracking-wider text-[var(--color-brand-dark)]">
                  <span className="h-1.5 w-8 rounded-full bg-[var(--color-brand-tan)]" />
                  {group.title}
                </h2>
                <div className="rounded-2xl border border-[var(--color-sys-border)] bg-[var(--color-sys-card)] p-6 shadow-sm">
                  {group.items.map((item, itemIndex) => {
                    const itemKey = `${group.title}-${groupIndex}-${itemIndex}-${item.title}`;
                    const simpleKey = `${group.title}-${itemIndex}`;
                    const isOpen = openKey === itemKey || openKey === simpleKey;

                    return (
                      <FaqAccordionItem
                        key={item.title}
                        question={item.title}
                        answer={item.description}
                        isOpen={isOpen}
                        onClick={() => setOpenKey(isOpen ? null : itemKey)}
                      />
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center">
              <p className="text-xl text-[var(--color-sys-text-secondary)]">
                {t('info_pages.faqs.no_results', 'No results found for')} "{searchTerm}".
              </p>
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="mt-4 text-sm font-bold text-[var(--color-brand-dark)] hover:text-[var(--color-sys-text-primary)]"
              >
                {t('info_pages.faqs.view_all', 'View all FAQs')}
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="mb-20">
        <div className="mx-auto max-w-4xl px-4">
          <div className="relative overflow-hidden rounded-3xl bg-[var(--color-brand-dark)] p-8 text-center text-white md:p-12">
            <div className="absolute right-0 top-0 p-4 opacity-10">
              <MessageCircle className="h-40 w-40" />
            </div>
            <h2 className="relative z-10 mb-4 text-2xl font-bold sm:text-3xl">
              {t('info_pages.faqs.still_questions_title', 'Still have questions?')}
            </h2>
            <p className="relative z-10 mx-auto mb-10 max-w-lg text-[var(--color-brand-light-tan)]">
              {t('info_pages.faqs.still_questions_description', "Can't find the answer you're looking for? Our support team is here to help.")}
            </p>
            <div className="relative z-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/contact-us"
                className="inline-flex h-14 items-center justify-center rounded-2xl bg-[var(--color-brand-tan)] px-10 text-sm font-bold text-[var(--color-brand-dark)] transition hover:bg-[var(--color-brand-light-tan)]"
              >
                {t('info_pages.faqs.contact_support', 'Contact Support')}
              </Link>
              <Link
                href={homeHref}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-brand-light-tan)] transition hover:text-white"
              >
                {t('info_pages.shared.go_home', 'Return home')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </StoreLayout>
  );
}

function FooterInfoHeroPage({
  pageKey,
  pageContent,
  highlights,
  sections,
  homeHref,
  workingHoursLabel,
  t,
}) {
  const pageConfig = {
    contact: {
      image: '/images/delivery.jpeg',
      icon: Headset,
      eyebrow: t('info_pages.contact.design_eyebrow', 'Customer support'),
      badge: t('customer_footer.links.contact', 'Contact Us'),
      statCards: [
        {
          label: t('customer_footer.contact.phone_label', 'Customer care'),
          value: t('customer_footer.contact.phone_value', '+255 712 345 678'),
          icon: PhoneCall,
        },
        {
          label: t('customer_footer.contact.email_label', 'Email'),
          value: t('customer_footer.contact.email_value', 'info@amanibrew.com'),
          icon: Mail,
        },
        {
          label: t('customer_footer.contact.hours_label', 'Working hours'),
          value: workingHoursLabel,
          icon: Clock3,
        },
      ],
      ctaHref: 'tel:+255712345678',
      ctaLabel: t('info_pages.contact.call_now', 'Call customer care'),
      secondaryHref: 'mailto:info@amanibrew.com',
      secondaryLabel: t('info_pages.contact.email_us', 'Email us'),
    },
    delivery: {
      image: '/images/cold%20chain.jpeg',
      icon: Truck,
      eyebrow: t('info_pages.delivery.design_eyebrow', 'Fulfillment guide'),
      badge: t('customer_footer.links.delivery', 'Delivery Information'),
      statCards: [
        {
          label: t('info_pages.delivery.stats.address_label', 'Delivery'),
          value: t('info_pages.delivery.stats.address_value', 'Address required'),
          icon: MapPin,
        },
        {
          label: t('info_pages.delivery.stats.pickup_label', 'Pickup'),
          value: t('info_pages.delivery.stats.pickup_value', 'Scheduled windows'),
          icon: CalendarClock,
        },
        {
          label: t('info_pages.delivery.stats.tracking_label', 'Tracking'),
          value: t('info_pages.delivery.stats.tracking_value', 'Order updates'),
          icon: ClipboardList,
        },
      ],
      ctaHref: '/products',
      ctaLabel: t('info_pages.shared.browse_products', 'Browse products'),
      secondaryHref: '/contact-us',
      secondaryLabel: t('customer_footer.links.contact', 'Contact Us'),
    },
  }[pageKey] || {};

  return (
    <StoreLayout showLiveCart={false}>
      <div className="space-y-12">
        <section className="grid overflow-hidden rounded-[2rem] bg-[#241816] text-white shadow-[0_28px_80px_rgba(36,24,22,0.2)] lg:grid-cols-[0.92fr_1.08fr]">
          <div className="relative min-h-[23rem] lg:min-h-[36rem]">
            <img
              src={pageConfig.image}
              alt={pageConfig.badge}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(36,24,22,0.08)_0%,rgba(36,24,22,0.62)_100%)]" />
          </div>

          <div className="flex flex-col justify-between p-6 sm:p-8 lg:p-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#d8b48a]">
                {pageContent.eyebrow || pageConfig.badge}
              </p>
              <h1 className="mt-4 text-4xl font-black leading-[1.05] sm:text-5xl">
                {pageContent.title}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[#eaded3]">
                {pageContent.subtitle || pageContent.intro}
              </p>
              {pageContent.intro && pageContent.subtitle ? (
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[#d8c8bb]">
                  {pageContent.intro}
                </p>
              ) : null}
            </div>

            <div className="mt-8 space-y-6">
              <div className="grid gap-3 sm:grid-cols-3">
                {pageConfig.statCards.map((stat) => {
                  const Icon = stat.icon;

                  return (
                    <div key={stat.label} className="rounded-2xl bg-white/8 p-4 ring-1 ring-white/10">
                      <Icon size={18} className="text-[#f3dfca]" />
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#d8b48a]">{stat.label}</p>
                      <p className="mt-2 text-sm font-bold leading-5 text-white">{stat.value}</p>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href={pageConfig.ctaHref}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#4f3118] transition hover:bg-[#fff4ea]"
                >
                  {pageConfig.ctaLabel}
                  <ArrowRight size={16} />
                </a>
                <a
                  href={pageConfig.secondaryHref}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/25 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  {pageConfig.secondaryLabel}
                </a>
              </div>
            </div>
          </div>
        </section>

        {highlights.length > 0 ? (
          <section className="grid gap-5 md:grid-cols-3">
            {highlights.slice(0, 3).map((highlight, index) => {
              const Icon = [CheckCircle2, MessageCircle, ShieldCheck][index] || CheckCircle2;

              return (
                <article key={highlight.title} className="rounded-[1.5rem] border border-[#eadfd4] bg-white p-6 shadow-sm">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5eadb] text-[#7a1f28]">
                    <Icon size={20} />
                  </span>
                  <h2 className="mt-5 text-xl font-black text-[#241816]">{highlight.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-[#6f5d57]">{highlight.description}</p>
                </article>
              );
            })}
          </section>
        ) : null}

        {pageKey === 'contact' ? (
          <section className="grid gap-8 lg:grid-cols-[1.12fr_0.88fr]">
            <div>
              <p className="text-sm font-bold uppercase text-[#7a1f28]">
                {t('info_pages.contact.methods_eyebrow', 'Reach the team')}
              </p>
              <h2 className="mt-3 text-3xl font-black text-[#241816]">
                {t('info_pages.contact.methods_title', 'Choose the channel that fits your request.')}
              </h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {customerFooterContactItems.map((item) => (
                  <ContactMethodCard
                    key={item.valueKey}
                    item={item}
                    t={t}
                    valueOverride={item.valueKey === 'customer_footer.contact.hours_value' ? workingHoursLabel : undefined}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] bg-[#fffaf4] p-6 ring-1 ring-[#eadfd4] sm:p-8">
              <p className="text-sm font-bold uppercase text-[#7a1f28]">
                {t('info_pages.contact.help_eyebrow', 'How to get faster help')}
              </p>
              <div className="mt-5 space-y-4">
                {sections.map((section) => (
                  <article key={section.title} className="rounded-[1.25rem] bg-white p-4 shadow-sm">
                    <h3 className="text-lg font-black text-[#241816]">{section.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-[#6f5d57]">{section.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {pageKey === 'delivery' ? (
          <section className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
            <div className="overflow-hidden rounded-[2rem]">
              <img
                src="/images/afrm%20to%20table.jpeg"
                alt={t('info_pages.delivery.flow_image_alt', 'Amani Brew fulfillment')}
                className="h-full min-h-[30rem] w-full object-cover"
              />
            </div>

            <div>
              <p className="text-sm font-bold uppercase text-[#7a1f28]">
                {t('info_pages.delivery.flow_eyebrow', 'Fulfillment flow')}
              </p>
              <h2 className="mt-3 text-3xl font-black text-[#241816]">
                {t('info_pages.delivery.flow_title', 'What happens before your order reaches you.')}
              </h2>
              <div className="mt-7 space-y-4">
                {sections.map((section, index) => {
                  const Icon = [Truck, CalendarClock, MessageCircle][index] || ClipboardList;

                  return (
                    <article key={section.title} className="rounded-[1.5rem] border border-[#eadfd4] bg-white p-5 shadow-sm">
                      <div className="flex gap-4">
                        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#3b241d] text-white">
                          <Icon size={20} />
                        </span>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8b6a46]">
                            {t('info_pages.delivery.step_label', 'Step')} {index + 1}
                          </p>
                          <h3 className="mt-2 text-xl font-black text-[#241816]">{section.title}</h3>
                          <p className="mt-2 text-sm leading-7 text-[#6f5d57]">{section.description}</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        <HelpfulLinksSection
          pageKey={pageKey}
          homeHref={homeHref}
          t={t}
          centered
        />
      </div>
    </StoreLayout>
  );
}

export default function InfoPage({ pageKey = 'about' }) {
  const { auth, pickupHours } = usePage().props;
  const { t, translations, localeTag } = useI18n();
  const pageMeta = customerInfoPages[pageKey] || customerInfoPages.about;
  const pageContent = readPath(translations, `info_pages.${pageKey}`) || {};
  const highlights = Array.isArray(pageContent.highlights) ? pageContent.highlights : [];
  const sections = Array.isArray(pageContent.sections) ? pageContent.sections : [];
  const homeHref = auth?.user?.role_key === 'customer' ? '/customer/home' : '/';
  const isLegalPage = ['privacy', 'terms'].includes(pageKey);
  const workingHoursLabel = formatWorkingHoursLabel({
    pickupHours,
    localeTag,
    daysLabel: t('customer_footer.contact.hours_days', 'Mon - Sat'),
  }) || t('customer_footer.contact.hours_value', 'Mon - Sat, 7:00 AM - 7:00 PM');

  if (pageKey === 'about') {
    return (
      <AboutInfoPage
        pageContent={pageContent}
        highlights={highlights}
        sections={sections}
        homeHref={homeHref}
        workingHoursLabel={workingHoursLabel}
        t={t}
      />
    );
  }

  if (pageKey === 'faqs') {
    return (
      <FaqHelpCenterPage
        pageContent={pageContent}
        sections={sections}
        homeHref={homeHref}
        t={t}
      />
    );
  }

  if (['contact', 'delivery'].includes(pageKey)) {
    return (
      <FooterInfoHeroPage
        pageKey={pageKey}
        pageContent={pageContent}
        highlights={highlights}
        sections={sections}
        homeHref={homeHref}
        workingHoursLabel={workingHoursLabel}
        t={t}
      />
    );
  }

  return (
    <StoreLayout
      title={pageContent.title || t(pageMeta.labelKey, pageMeta.fallback)}
      subtitle={pageContent.subtitle || ''}
      showLiveCart={false}
    >
      <div className={`grid gap-6 ${isLegalPage ? 'xl:grid-cols-1' : 'xl:grid-cols-[1.25fr_0.75fr]'}`}>
        <section className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-[var(--color-sys-border)]">
          <div className="border-b border-[var(--color-sys-border)] bg-[linear-gradient(135deg,#fbf6ef_0%,#f2e7d9_100%)] px-6 py-6 sm:px-8">
            <p className="text-sm font-semibold text-center text-[#7a1f28] uppercase tracking-[0.22em]">
              {pageContent.eyebrow || t(pageMeta.labelKey, pageMeta.fallback)}
            </p>
            {pageContent.effective_date && (
              <p className="mt-4 text-sm font-semibold text-center text-[#7a1f28] uppercase tracking-[0.22em]">
                {pageContent.effective_date}
              </p>
            )}
            {pageContent.intro ? (
              <p className="mt-6 max-w-2xl mx-auto text-base leading-8 text-center text-[var(--color-sys-text-secondary)]">
                {pageContent.intro}
              </p>
            ) : null}
          </div>

          {highlights.length > 0 && !isLegalPage ? (
            <div className="grid gap-4 px-6 py-6 sm:px-8 lg:grid-cols-3">
              {highlights.map((item) => (
                <article
                  key={item.title}
                  className="rounded-[1.6rem] border border-[var(--color-sys-border)] bg-[#fcf8f2] p-5"
                >
                  <p className="text-base font-black text-[var(--color-sys-text-primary)]">{item.title}</p>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-sys-text-secondary)]">{item.description}</p>
                </article>
              ))}
            </div>
          ) : null}

          <div className="space-y-6 px-6 pb-24 sm:px-8 sm:pb-24">
            {sections.map((section, index) => (
              <article
                key={section.title}
                className={`p-6 ${isLegalPage ? '' : 'rounded-[1.75rem] border border-[var(--color-sys-border)] bg-white'}`}
              >
                <h2 className={`font-black tracking-tight ${isLegalPage ? 'text-2xl text-[var(--color-sys-text-primary)] mb-6' : 'text-xl text-[var(--color-sys-text-primary)]'}`}>
                  {section.title}
                </h2>
                <div className={`text-base leading-8 ${isLegalPage ? 'text-[var(--color-sys-text-secondary)]' : 'text-[var(--color-sys-text-secondary)]'}`}>
                  {section.description}
                </div>
              </article>
            ))}
          </div>
        </section>

        {!isLegalPage && (
          <aside className="space-y-6">
            <section className="rounded-[2rem] bg-[linear-gradient(180deg,#38261d_0%,#261812_100%)] p-6 text-white shadow-[0_22px_70px_rgba(44,30,22,0.18)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d8b48a]">
                {t('info_pages.shared.support_card_eyebrow', 'Customer care')}
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-tight">
                {t('info_pages.shared.support_card_title', 'Need help with an order or account?')}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#eaded3]">
                {t(
                  'info_pages.shared.support_card_description',
                  'Our team can guide you on delivery windows, pickup timing, account access, and general customer support.',
                )}
              </p>

              <div className="mt-6 space-y-3">
                {customerFooterContactItems.map((item) => (
                  <SupportContactItem
                    key={item.valueKey}
                    item={item}
                    t={t}
                    valueOverride={item.valueKey === 'customer_footer.contact.hours_value' ? workingHoursLabel : undefined}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-[var(--color-sys-border)] bg-[#f7f1e8] p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7a1f28]">
                {t('info_pages.shared.related_links_title', 'Helpful links')}
              </p>
              <div className="mt-4 space-y-2">
                {[...customerFooterQuickLinks.slice(0, 2), ...Object.values(customerInfoPages)]
                  .filter((link) => link.pageKey !== pageKey)
                  .slice(0, 5)
                  .map((link) => {
                    const Icon = link.icon;

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center gap-3 rounded-[1.25rem] px-3 py-3 text-sm font-medium text-[var(--color-sys-text-primary)] transition hover:bg-white"
                      >
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[var(--color-brand-dark)] shadow-sm">
                          <Icon size={18} />
                        </span>
                        <span>{t(link.labelKey, link.fallback)}</span>
                      </Link>
                    );
                  })}
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center rounded-2xl bg-[var(--color-brand-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2c1d14]"
                >
                  {t('info_pages.shared.browse_products', 'Browse products')}
                </Link>
                <Link
                  href={homeHref}
                  className="inline-flex items-center justify-center rounded-2xl border border-[var(--color-sys-border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--color-sys-text-primary)] transition hover:bg-[#fffaf4]"
                >
                  {t('info_pages.shared.go_home', 'Return home')}
                </Link>
              </div>
            </section>
          </aside>
        )}
      </div>

      {isLegalPage && (
        <HelpfulLinksSection
          pageKey={pageKey}
          homeHref={homeHref}
          t={t}
          centered
        />
      )}
    </StoreLayout>
  );
}

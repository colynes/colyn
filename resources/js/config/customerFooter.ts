import {
  Clock3,
  FileText,
  Headset,
  HelpCircle,
  Home,
  Info,
  Mail,
  MapPin,
  Package2,
  PhoneCall,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Truck,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

export type InfoPageKey =
  | 'about'
  | 'faqs'
  | 'contact'
  | 'delivery'
  | 'privacy'
  | 'terms';

export interface FooterLinkItem {
  href: string;
  labelKey: string;
  fallback: string;
  icon: LucideIcon;
  pageKey?: InfoPageKey;
}

export interface FooterContactItem {
  href?: string;
  labelKey: string;
  fallbackLabel: string;
  valueKey: string;
  fallbackValue: string;
  icon: LucideIcon;
}

export interface FooterSocialLink {
  href: string;
  labelKey: string;
  fallbackLabel: string;
  icon: LucideIcon;
}

export interface FooterDeveloperCredit {
  href: string;
  label: string;
}

export const customerFooterBrand = {
  name: 'Amani Brew',
  logoSrc: '/images/amani_brew_mark.png',
  logoAlt: 'Amani Brew logo',
};

export const customerInfoPages: Record<InfoPageKey, FooterLinkItem> = {
  about: {
    href: '/about-us',
    labelKey: 'customer_footer.links.about',
    fallback: 'About Us',
    icon: Info,
    pageKey: 'about',
  },
  faqs: {
    href: '/faqs',
    labelKey: 'customer_footer.links.faqs',
    fallback: 'FAQs',
    icon: HelpCircle,
    pageKey: 'faqs',
  },
  contact: {
    href: '/contact-us',
    labelKey: 'customer_footer.links.contact',
    fallback: 'Contact Us',
    icon: Headset,
    pageKey: 'contact',
  },
  delivery: {
    href: '/delivery-information',
    labelKey: 'customer_footer.links.delivery',
    fallback: 'Delivery Information',
    icon: Truck,
    pageKey: 'delivery',
  },
  privacy: {
    href: '/privacy-policy',
    labelKey: 'customer_footer.links.privacy',
    fallback: 'Privacy Policy',
    icon: ShieldCheck,
    pageKey: 'privacy',
  },
  terms: {
    href: '/terms-of-service',
    labelKey: 'customer_footer.links.terms',
    fallback: 'Terms of Service',
    icon: FileText,
    pageKey: 'terms',
  },
};

export const customerFooterQuickLinks: FooterLinkItem[] = [
  {
    href: '/customer/home',
    labelKey: 'customer_footer.links.home',
    fallback: 'Home',
    icon: Home,
  },
  {
    href: '/products',
    labelKey: 'customer_footer.links.products',
    fallback: 'Products',
    icon: ShoppingBag,
  },
  {
    href: '/packs',
    labelKey: 'customer_footer.links.packs',
    fallback: 'Packs',
    icon: Package2,
  },
  {
    href: '/promotions',
    labelKey: 'customer_footer.links.promotions',
    fallback: 'Promotions',
    icon: Tag,
  },
  {
    href: '/my-orders',
    labelKey: 'customer_footer.links.my_orders',
    fallback: 'My Orders',
    icon: FileText,
  },
  {
    href: '/profile',
    labelKey: 'customer_footer.links.profile',
    fallback: 'Profile',
    icon: UserRound,
  },
];

export const customerFooterSupportLinks: FooterLinkItem[] = [
  customerInfoPages.about,
  customerInfoPages.faqs,
  customerInfoPages.contact,
  customerInfoPages.delivery,
  customerInfoPages.privacy,
  customerInfoPages.terms,
];

export const customerFooterLegalLinks: FooterLinkItem[] = [
  customerInfoPages.privacy,
  customerInfoPages.terms,
];

export const customerFooterContactItems: FooterContactItem[] = [
  {
    labelKey: 'customer_footer.contact.location_label',
    fallbackLabel: 'Serving from',
    valueKey: 'customer_footer.contact.location_value',
    fallbackValue: 'Dar es Salaam, Tanzania',
    icon: MapPin,
  },
  {
    href: 'tel:+255712345678',
    labelKey: 'customer_footer.contact.phone_label',
    fallbackLabel: 'Customer care',
    valueKey: 'customer_footer.contact.phone_value',
    fallbackValue: '+255 712 345 678',
    icon: PhoneCall,
  },
  {
    href: 'mailto:info@amanibrew.com',
    labelKey: 'customer_footer.contact.email_label',
    fallbackLabel: 'Email',
    valueKey: 'customer_footer.contact.email_value',
    fallbackValue: 'info@amanibrew.com',
    icon: Mail,
  },
  {
    labelKey: 'customer_footer.contact.hours_label',
    fallbackLabel: 'Working hours',
    valueKey: 'customer_footer.contact.hours_value',
    fallbackValue: 'Mon - Sat, 7:00 AM - 7:00 PM',
    icon: Clock3,
  },
];

export const customerFooterSocialLinks: FooterSocialLink[] = [];

export const customerFooterDeveloperCredit: FooterDeveloperCredit | null = null;

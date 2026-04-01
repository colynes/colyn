import React, { useEffect, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  UsersRound, 
  TrendingUp, 
  FileText, 
  Users, 
  Wallet,
  LogOut,
  X,
  ChevronDown
} from 'lucide-react';

export default function Sidebar({ isOpen, setIsOpen, user }) {
  const { url } = usePage();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Customers', href: '/customers', icon: UsersRound },
    { 
      name: 'Inventory', 
      icon: Package,
      children: [
        { name: 'Categories', href: '/inventory/categories' },
        { name: 'Products', href: '/inventory/products' }
      ]
    },
    { name: 'Orders', href: '/orders', icon: ShoppingCart },
    { name: 'Promotions', href: '/dashboard/promotions', icon: Package },
    { name: 'Packs', href: '/dashboard/packs', icon: Package, role: ['administrator', 'admin', 'manager'] },
    { 
      name: 'Fat Clients', 
      icon: UsersRound,
      children: [
        { name: 'Subscriptions', href: '/fat-clients/subscriptions' },
        { name: 'Billing', href: '/fat-clients/billing' }
      ]
    },
    { name: 'Expenses', href: '/expenses', icon: Wallet },
    { name: 'Sales', href: '/sales', icon: TrendingUp },
    { name: 'Reports', href: '/reports', icon: FileText },
    { name: 'Staff', href: '/users', icon: Users, role: ['administrator', 'admin'] },
  ];

  const checkActive = (href) => url.startsWith(href);
  const userRole = String(user?.role || '').toLowerCase();
  const [openSections, setOpenSections] = useState({});

  useEffect(() => {
    const nextOpenSections = {};

    navItems.forEach((item) => {
      if (item.children) {
        nextOpenSections[item.name] = item.children.some((child) => checkActive(child.href));
      }
    });

    setOpenSections((current) => ({ ...current, ...nextOpenSections }));
  }, [url]);

  const toggleSection = (sectionName) => {
    setOpenSections((current) => ({
      ...current,
      [sectionName]: !current[sectionName],
    }));
  };

  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[var(--color-brand-dark)] text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      
      {/* Brand Header */}
      <div className="flex items-center justify-between h-20 px-5 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="bg-[#CDAD7D] p-2 rounded-xl">
            <img src="/images/amani_brew_mark.png" alt="Amani Brew" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <h1 className="text-[1.35rem] font-bold tracking-wide">Amani Brew</h1>
            <p className="text-[0.9rem] text-amber-200/75 uppercase tracking-tight font-semibold -mt-0.5">Premium Butchery</p>
          </div>
        </Link>
        <button onClick={() => setIsOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
          <X size={24} />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto custom-scrollbar">
        {navItems.map((item, index) => {
          if (item.role && userRole && !item.role.includes(userRole)) return null;

          const isActive = checkActive(item.href || '#');
          const Icon = item.icon;

          if (item.children) {
            const isSectionOpen = Boolean(openSections[item.name]);
            const isSectionActive = item.children.some((c) => checkActive(c.href));

            return (
              <div key={index} className="pb-1">
                <button
                  type="button"
                  onClick={() => toggleSection(item.name)}
                  className={`flex w-full items-center justify-between px-4 py-3 text-[1rem] font-semibold rounded-xl transition-colors ${
                    isSectionActive ? 'text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="flex items-center">
                  <Icon className="mr-3 h-5 w-5 text-gray-400" />
                  {item.name}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isSectionOpen ? 'rotate-180' : ''}`} />
                </button>
                {isSectionOpen ? (
                  <div className="pl-11 space-y-1 mt-1 border-l border-white/10 ml-5">
                    {item.children.map((child, cIdx) => (
                      <Link
                        key={cIdx}
                        href={child.href}
                        className={`block px-3 py-2 text-[0.95rem] rounded-md transition-colors ${
                          checkActive(child.href) 
                            ? 'text-[var(--color-brand-tan)] font-medium' 
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          }

          return (
            <Link
              key={index}
              href={item.href}
              className={`flex items-center px-4 py-3 text-[1rem] font-semibold rounded-xl transition-colors ${
                isActive 
                  ? 'bg-[var(--color-brand-tan)] text-[var(--color-brand-dark)] shadow-sm' 
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-[var(--color-brand-dark)]' : 'text-gray-400'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Section / Footer */}
      <div className="p-4">
        <div className="border border-white/10 rounded-xl p-3 bg-white/5">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Users size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[1rem] font-semibold text-white truncate">
                  {user?.name || 'Admin User'}
                </p>
                <p className="text-[0.9rem] text-gray-400 truncate">
                  {user?.email || 'admin@amanibrew.com'}
                </p>
              </div>
            </div>
            <Link
              href="/logout"
              method="post"
              as="button"
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#B33B3B] hover:bg-[#9E2F2F] text-white rounded-xl text-[1rem] font-bold transition-all duration-200 shadow-lg shadow-[#B33B3B]/10"
            >
              <LogOut size={18} />
              Logout
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

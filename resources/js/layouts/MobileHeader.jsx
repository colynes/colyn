import React from 'react';
import { Menu } from 'lucide-react';
import { Link } from '@inertiajs/react';

export default function MobileHeader({ onMenuClick }) {
  return (
    <div className="lg:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-[var(--color-sys-border)] sticky top-0 z-30">
      <button 
        onClick={onMenuClick}
        className="p-2 -ml-2 text-gray-500 hover:text-gray-700 focus:outline-none"
      >
        <Menu size={24} />
      </button>

      <Link href="/dashboard" className="flex flex-col items-center">
        <span className="text-lg font-bold text-[var(--color-brand-forest)] tracking-wider">Amani Brew</span>
        <span className="text-[9px] text-[var(--color-status-success)] font-medium uppercase tracking-widest leading-none">Premium Butchery</span>
      </Link>
      
      {/* Empty div to balance flex spacing */}
      <div className="w-8"></div>
    </div>
  );
}

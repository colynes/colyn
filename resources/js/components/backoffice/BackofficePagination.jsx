import React from 'react';
import { Link } from '@inertiajs/react';

export default function BackofficePagination({ links = [] }) {
  if (!Array.isArray(links) || links.length <= 3) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {links
        .filter((link) => link.label !== '&laquo; Previous' && link.label !== 'Next &raquo;')
        .map((link) => (
          <Link
            key={`${link.label}-${link.url || 'none'}`}
            href={link.url || '#'}
            preserveScroll
            className={`inline-flex h-11 min-w-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition ${
              link.active
                ? 'bg-[#4f3118] text-white'
                : link.url
                  ? 'border border-[#ddc9b3] bg-white text-[#4f3118] hover:bg-[#f7f1e8]'
                  : 'cursor-not-allowed border border-[#efe3d4] bg-[#fbf8f4] text-[#b8a28b]'
            }`}
            dangerouslySetInnerHTML={{ __html: link.label }}
          />
        ))}
    </div>
  );
}

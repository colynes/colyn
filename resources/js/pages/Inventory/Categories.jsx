import React, { useState } from 'react';
import AppLayout from '@/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Plus, Search, Edit2, Trash2, Tag } from 'lucide-react';

const CATEGORIES = [
  { id: 1, name: 'Beef', description: 'All beef products', count: 12, date: '2025-01-15' },
  { id: 2, name: 'Chicken', description: 'Poultry products', count: 8, date: '2025-01-15' },
  { id: 3, name: 'Pork', description: 'Pork products', count: 6, date: '2025-01-16' },
  { id: 4, name: 'Sausages', description: 'Various sausage types', count: 10, date: '2025-01-16' },
  { id: 5, name: 'Eggs', description: 'Egg and egg products', count: 4, date: '2025-01-20' },
];

export default function Categories({ auth }) {
  const [search, setSearch] = useState('');

  const filtered = CATEGORIES.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout user={auth?.user}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-sys-text-primary)]">Product Categories</h1>
          <p className="text-sm text-[var(--color-sys-text-secondary)] mt-0.5">Manage product categories</p>
        </div>
        <Button variant="primary" className="flex items-center gap-2">
          <Plus size={16} /> Add Category
        </Button>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-xl">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input 
            placeholder="Search categories..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-white" 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((cat) => (
          <Card key={cat.id} className="rounded-2xl border-none shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-[#F5F2EF] p-3 rounded-xl text-[var(--color-brand-dark)]">
                  <Tag size={24} />
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-400 hover:text-[var(--color-brand-dark)] hover:bg-[#F5F2EF] rounded-lg transition-all">
                    <Edit2 size={16} />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-[var(--color-sys-text-primary)] mb-1">{cat.name}</h3>
                <p className="text-sm text-[var(--color-sys-text-secondary)] mb-4">{cat.description}</p>
                
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--color-sys-border)]">
                  <span className="text-xs font-medium text-[var(--color-brand-tan)] uppercase tracking-wider">{cat.count} products</span>
                  <span className="text-[10px] text-gray-400">Added: {cat.date}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-[var(--color-sys-text-secondary)]">
            No categories found matching your search.
          </div>
        )}
      </div>
    </AppLayout>
  );
}

import React, { useState } from 'react';
import AppLayout from '@/layouts/AppLayout';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Plus, Search, Edit2, Trash2, SlidersHorizontal, Package, Tag, ShoppingCart, User } from 'lucide-react';

const PRODUCTS = [
  { id: 1, name: 'Inter-chick Chicken', category: 'Chicken', quantity: '100 kg', buyingPrice: 'Tsh 7,500', sellingPrice: 'Tsh 9,000', supplier: 'Inter-Chick Ltd', contact: '+255 712 345 678' },
  { id: 2, name: 'Premium Ribeye Steak', category: 'Beef', quantity: '50 kg', buyingPrice: 'Tsh 25,000', sellingPrice: 'Tsh 32,000', supplier: 'Prime Beef Co', contact: '+255 713 456 789' },
  { id: 3, name: 'Ground Beef', category: 'Beef', quantity: '80 kg', buyingPrice: 'Tsh 10,000', sellingPrice: 'Tsh 14,000', supplier: 'Prime Beef Co', contact: '+255 713 456 789' },
  { id: 4, name: 'Pork Chops', category: 'Pork', quantity: '45 kg', buyingPrice: 'Tsh 12,000', sellingPrice: 'Tsh 16,000', supplier: 'Heritage Farms', contact: '+255 714 567 890' },
  { id: 5, name: 'Italian Sausages', category: 'Sausages', quantity: '60 kg', buyingPrice: 'Tsh 8,000', sellingPrice: 'Tsh 12,000', supplier: 'Artisan Meats', contact: '+255 715 678 901' },
  { id: 6, name: 'Fresh Eggs', category: 'Eggs', quantity: '200 trays', buyingPrice: 'Tsh 8,000', sellingPrice: 'Tsh 10,000', supplier: 'Poultry Farm Ltd', contact: '+255 716 789 012' },
];

export default function Products({ auth }) {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filtered = PRODUCTS.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout user={auth?.user}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-sys-text-primary)]">Products</h1>
          <p className="text-sm text-[var(--color-sys-text-secondary)] mt-0.5">Manage inventory products</p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus size={16} /> Add Product
        </Button>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xl">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input 
            placeholder="Search products..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-white" 
          />
        </div>
        <div className="flex items-center gap-2 bg-white border border-[var(--color-sys-border)] rounded-lg px-3 cursor-pointer">
          <SlidersHorizontal size={16} className="text-gray-400" />
          <span className="text-sm text-gray-600">All</span>
        </div>
      </div>

      <Card className="rounded-2xl border-none shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-sys-border)] bg-[#F5F2EF]/50">
              {['Product','Category','Quantity','Buying Price','Selling Price','Supplier','Actions'].map(h => (
                <th key={h} className="text-left px-6 py-4 font-bold text-[var(--color-sys-text-primary)] uppercase text-[10px] tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={p.id} className={`border-b border-[var(--color-sys-border)] hover:bg-[#F5F2EF]/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}>
                <td className="px-6 py-5 font-bold text-[var(--color-sys-text-primary)]">{p.name}</td>
                <td className="px-6 py-5">
                  <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">{p.category}</span>
                </td>
                <td className="px-6 py-5 font-medium text-[var(--color-sys-text-secondary)]">{p.quantity}</td>
                <td className="px-6 py-5 font-bold text-[var(--color-sys-text-primary)]">{p.buyingPrice}</td>
                <td className="px-6 py-5 font-bold text-[var(--color-sys-text-primary)]">{p.sellingPrice}</td>
                <td className="px-6 py-5">
                   <div className="flex flex-col">
                      <span className="font-semibold text-[var(--color-sys-text-primary)]">{p.supplier}</span>
                      <span className="text-[10px] text-gray-400 font-medium">{p.contact}</span>
                   </div>
                </td>
                <td className="px-6 py-5 text-gray-400">
                  <div className="flex items-center gap-3">
                    <button className="hover:text-[var(--color-brand-dark)] transition-colors"><Edit2 size={16} /></button>
                    <button className="hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Modal - Create Product */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#1A1A1A]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 pb-4">
              <h2 className="text-2xl font-bold text-[var(--color-sys-text-primary)] mb-6">Add New Product</h2>
              
              <div className="space-y-6">
                <div>
                   <label className="text-xs font-bold text-[var(--color-sys-text-primary)] uppercase tracking-wider mb-2 block">Product Name</label>
                   <Input placeholder="e.g., Inter-chick Chicken" className="bg-[#F9F9F9]" />
                </div>

                <div>
                   <label className="text-xs font-bold text-[var(--color-sys-text-primary)] uppercase tracking-wider mb-2 block">Category</label>
                   <select className="w-full bg-[#F9F9F9] border border-[var(--color-sys-border)] rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand-tan)]">
                     <option>Select category</option>
                     <option>Beef</option>
                     <option>Chicken</option>
                     <option>Pork</option>
                     <option>Sausages</option>
                     <option>Eggs</option>
                   </select>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div>
                     <label className="text-xs font-bold text-[var(--color-sys-text-primary)] uppercase tracking-wider mb-2 block">Quantity</label>
                     <Input placeholder="100" className="bg-[#F9F9F9]" />
                   </div>
                   <div>
                     <label className="text-xs font-bold text-[var(--color-sys-text-primary)] uppercase tracking-wider mb-2 block">Unit</label>
                     <select className="w-full bg-[#F9F9F9] border border-[var(--color-sys-border)] rounded-xl px-4 py-3 text-sm outline-none">
                       <option>kg</option>
                       <option>pieces</option>
                       <option>trays</option>
                       <option>trays</option>
                     </select>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div>
                     <label className="text-xs font-bold text-[var(--color-sys-text-primary)] uppercase tracking-wider mb-2 block">Buying Price (Tsh)</label>
                     <Input placeholder="7500" className="bg-[#F9F9F9]" />
                   </div>
                   <div>
                     <label className="text-xs font-bold text-[var(--color-sys-text-primary)] uppercase tracking-wider mb-2 block">Selling Price (Tsh)</label>
                     <Input placeholder="9000" className="bg-[#F9F9F9]" />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div>
                     <label className="text-xs font-bold text-[var(--color-sys-text-primary)] uppercase tracking-wider mb-2 block">Supplier Name</label>
                     <Input placeholder="Supplier name" className="bg-[#F9F9F9]" />
                   </div>
                   <div>
                     <label className="text-xs font-bold text-[var(--color-sys-text-primary)] uppercase tracking-wider mb-2 block">Supplier Contact</label>
                     <Input placeholder="+255 712 345 678" className="bg-[#F9F9F9]" />
                   </div>
                </div>
              </div>
            </div>

            <div className="p-8 pt-6 border-t border-[var(--color-sys-border)] flex gap-4">
               <Button onClick={() => setIsModalOpen(false)} variant="outline" className="flex-1 py-3 text-sm font-bold uppercase tracking-widest text-gray-500">Cancel</Button>
               <Button className="flex-1 py-3 text-sm font-bold uppercase tracking-widest bg-[var(--color-brand-dark)]">Add Product</Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

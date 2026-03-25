import React, { useState } from 'react';
import AppLayout from '@/layouts/AppLayout';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Plus, Search, SlidersHorizontal, Eye, Printer } from 'lucide-react';

const statusStyles = {
  completed:   'bg-green-100 text-green-700',
  processing:  'bg-blue-100 text-blue-700',
  pending:     'bg-amber-100 text-amber-700',
  cancelled:   'bg-red-100 text-red-700',
  confirmed:   'bg-teal-100 text-teal-700',
  preparing:   'bg-purple-100 text-purple-700',
  delivered:   'bg-emerald-100 text-emerald-700',
};

const ORDERS = [
  { id: 'ORD-1234', customer: 'John Smith',    date: '2026-02-25', items: 5, total: 'Tzs 145,500', payment: 'Credit Card', status: 'completed' },
  { id: 'ORD-1235', customer: 'Sarah Johnson', date: '2026-02-25', items: 3, total: 'Tzs 98,200',  payment: 'Cash',        status: 'processing' },
  { id: 'ORD-1236', customer: 'Mike Davis',    date: '2026-02-24', items: 7, total: 'Tzs 234,800', payment: 'Debit Card',  status: 'pending' },
  { id: 'ORD-1237', customer: 'Emily Brown',   date: '2026-02-24', items: 2, total: 'Tzs 65,400',  payment: 'Credit Card', status: 'completed' },
  { id: 'ORD-1238', customer: 'David Wilson',  date: '2026-02-23', items: 4, total: 'Tzs 178,900', payment: 'Cash',        status: 'completed' },
  { id: 'ORD-1239', customer: 'Lisa Anderson', date: '2026-02-23', items: 6, total: 'Tzs 212,300', payment: 'Credit Card', status: 'processing' },
  { id: 'ORD-1240', customer: 'Robert Taylor', date: '2026-02-22', items: 3, total: 'Tzs 89,700',  payment: 'Cash',        status: 'cancelled' },
];

export default function Orders({ auth }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const filtered = ORDERS.filter(o => {
    const matchSearch = o.customer.toLowerCase().includes(search.toLowerCase()) || o.id.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || o.status === filter.toLowerCase();
    return matchSearch && matchFilter;
  });

  return (
    <AppLayout user={auth?.user}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-sys-text-primary)]">Orders Management</h1>
          <p className="text-sm text-[var(--color-sys-text-secondary)] mt-0.5">Track and manage customer orders</p>
        </div>
        <Button variant="primary" className="flex items-center gap-2">
          <Plus size={16} /> New Order
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-lg">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search orders or customers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-white"
          />
        </div>
        <div className="flex items-center gap-2 bg-white border border-[var(--color-sys-border)] rounded-lg px-3">
          <SlidersHorizontal size={16} className="text-gray-400" />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="bg-transparent text-sm py-2 pr-2 outline-none cursor-pointer"
          >
            {['All','Completed','Processing','Pending','Cancelled','Confirmed','Preparing','Delivered'].map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <Card className="rounded-xl border-none shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-sys-border)] bg-[var(--color-sys-muted)]">
              {['Order ID','Customer','Date','Items','Total','Payment','Status','Actions'].map(h => (
                <th key={h} className="text-left px-5 py-3.5 font-semibold text-[var(--color-sys-text-primary)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o, i) => (
              <tr key={o.id} className={`border-b border-[var(--color-sys-border)] hover:bg-[var(--color-sys-muted)] transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#FDFCFB]'}`}>
                <td className="px-5 py-4 font-medium text-[var(--color-brand-tan)]">{o.id}</td>
                <td className="px-5 py-4 font-semibold text-[var(--color-sys-text-primary)]">{o.customer}</td>
                <td className="px-5 py-4 text-[var(--color-sys-text-secondary)]">{o.date}</td>
                <td className="px-5 py-4 text-[var(--color-sys-text-secondary)]">{o.items} items</td>
                <td className="px-5 py-4 font-semibold text-[var(--color-sys-text-primary)]">{o.total}</td>
                <td className="px-5 py-4 text-[var(--color-sys-text-secondary)]">{o.payment}</td>
                <td className="px-5 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusStyles[o.status]}`}>
                    {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <button className="text-gray-400 hover:text-[var(--color-brand-dark)] transition-colors"><Eye size={17} /></button>
                    <button className="text-gray-400 hover:text-[var(--color-brand-dark)] transition-colors"><Printer size={17} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-[var(--color-sys-text-secondary)]">No orders match your search.</div>
        )}
      </Card>
    </AppLayout>
  );
}

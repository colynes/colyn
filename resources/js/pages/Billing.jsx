import React, { useState } from 'react';
import AppLayout from '@/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Plus, Search, Calendar, Eye, Download, Bell } from 'lucide-react';

const statusStyles = {
  paid:    'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  overdue: 'bg-red-100 text-red-700',
};

const INVOICES = [
  { invoice: 'INV-2026-001', sub: 'SUB-001', customer: 'John Smith',    amount: 'Tsh 95,500',  due: '2026-02-28', status: 'paid',    note: 'Payment received' },
  { invoice: 'INV-2026-002', sub: 'SUB-002', customer: 'Sarah Johnson', amount: 'Tsh 180,000', due: '2026-03-01', status: 'pending', note: 'Due tomorrow – Notify customer' },
  { invoice: 'INV-2026-003', sub: 'SUB-003', customer: 'Mike Davis',    amount: 'Tsh 78,900',  due: '2026-02-25', status: 'overdue', note: 'Due tomorrow – Notify customer' },
  { invoice: 'INV-2026-004', sub: 'SUB-004', customer: 'Emily Brown',   amount: 'Tsh 245,000', due: '2026-03-10', status: 'pending', note: 'Due tomorrow – Notify customer' },
];

export default function Billing({ auth }) {
  const [search, setSearch] = useState('');

  const filtered = INVOICES.filter(i =>
    i.customer.toLowerCase().includes(search.toLowerCase()) ||
    i.invoice.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout user={auth?.user}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-sys-text-primary)]">Billing & Invoices</h1>
          <p className="text-sm text-[var(--color-brand-tan)] mt-0.5">Manage invoices and payment tracking</p>
        </div>
        <Button variant="primary" className="flex items-center gap-2">
          <Plus size={16} /> Create Invoice
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <Card className="rounded-xl border border-[var(--color-sys-border)] shadow-none">
          <CardContent className="p-6">
            <p className="text-sm text-[var(--color-sys-text-secondary)] mb-2">Total Received</p>
            <p className="text-3xl font-bold text-[var(--color-status-success)]">Tsh 95,500</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-[var(--color-sys-border)] shadow-none">
          <CardContent className="p-6">
            <p className="text-sm text-[var(--color-sys-text-secondary)] mb-2">Pending Payments</p>
            <p className="text-3xl font-bold text-[var(--color-brand-tan)]">Tsh 425,000</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-[var(--color-sys-border)] shadow-none">
          <CardContent className="p-6">
            <p className="text-sm text-[var(--color-sys-text-secondary)] mb-2">Overdue Payments</p>
            <p className="text-3xl font-bold text-[var(--color-status-danger)]">Tsh 78,900</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-white" />
        </div>
        <button className="p-2.5 bg-white border border-[var(--color-sys-border)] rounded-lg text-gray-400 hover:text-gray-700">
          <Calendar size={18} />
        </button>
        <select className="bg-white border border-[var(--color-sys-border)] rounded-lg px-3 text-sm outline-none">
          {['All','Paid','Pending','Overdue'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <Card className="rounded-xl border-none shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-sys-border)] bg-[var(--color-sys-muted)]">
              {['Invoice','Customer','Amount','Due Date','Status','Notification','Actions'].map(h => (
                <th key={h} className="text-left px-5 py-3.5 font-semibold text-[var(--color-sys-text-primary)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv, i) => (
              <tr key={inv.invoice} className={`border-b border-[var(--color-sys-border)] hover:bg-[var(--color-sys-muted)] transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#FDFCFB]'}`}>
                <td className="px-5 py-4">
                  <p className="font-semibold text-[var(--color-sys-text-primary)]">{inv.invoice}</p>
                  <p className="text-xs text-[var(--color-sys-text-secondary)]">{inv.sub}</p>
                </td>
                <td className="px-5 py-4 font-medium text-[var(--color-brand-tan)]">{inv.customer}</td>
                <td className="px-5 py-4 font-semibold">{inv.amount}</td>
                <td className="px-5 py-4 text-[var(--color-sys-text-secondary)]">{inv.due}</td>
                <td className="px-5 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusStyles[inv.status]}`}>
                    {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className={`flex items-center gap-1.5 text-xs font-medium ${inv.status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                    <Bell size={13} />
                    {inv.note}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <button className="text-gray-400 hover:text-[var(--color-brand-dark)] transition-colors"><Eye size={17} /></button>
                    <button className="text-gray-400 hover:text-[var(--color-brand-dark)] transition-colors"><Download size={17} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </AppLayout>
  );
}

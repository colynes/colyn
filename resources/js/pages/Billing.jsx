import React from 'react';
import { Link } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Bell, CalendarDays, Download, Eye, Plus, Printer, Search } from 'lucide-react';

const money = (value) => `Tsh ${new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 }).format(value || 0)}`;

const statusTone = {
  paid: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  overdue: 'bg-rose-100 text-rose-600',
  sent: 'bg-blue-100 text-blue-700',
  draft: 'bg-slate-100 text-slate-600',
};

const notificationTone = {
  success: 'text-emerald-600',
  warning: 'text-amber-700',
  danger: 'text-red-500',
};

function SummaryCard({ label, value, tone = 'default' }) {
  const toneClass = tone === 'success'
    ? 'text-emerald-600'
    : tone === 'warning'
      ? 'text-orange-500'
      : tone === 'danger'
        ? 'text-red-500'
        : 'text-[#3a2513]';

  return (
    <Card className="rounded-[1.45rem] border border-[#e0d1bf] bg-white shadow-none">
      <CardContent className="px-7 py-8">
        <p className="text-[1rem] text-[#6f5238]">{label}</p>
        <p className={`mt-4 text-[2.2rem] font-semibold tracking-[-0.03em] ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export default function Billing({ auth, invoices = [], summary = {}, filters = {} }) {
  return (
    <AppLayout user={auth?.user}>
      <div className="space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[2.45rem] font-semibold tracking-[-0.04em] text-[#3a2513]">Billing &amp; Invoices</h1>
            <p className="mt-2 text-[0.95rem] text-[#73563a]">Manage invoices and payment tracking</p>
          </div>

          <Link
            href="/fat-clients/billing/create"
            className="inline-flex items-center gap-3 self-start rounded-[1.05rem] bg-[#4f3118] px-6 py-3.5 text-[1.05rem] font-semibold text-white transition hover:bg-[#402612]"
          >
            <Plus className="h-5 w-5" strokeWidth={2.25} />
            Create Invoice
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <SummaryCard label="Total Received" value={money(summary.total_received)} tone="success" />
          <SummaryCard label="Pending Payments" value={money(summary.pending_payments)} tone="warning" />
          <SummaryCard label="Overdue Payments" value={money(summary.overdue_payments)} tone="danger" />
        </div>

        <form method="get" action="/fat-clients/billing" className="flex items-center gap-4 overflow-x-auto">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#866748]" strokeWidth={2} />
            <input
              type="text"
              name="search"
              defaultValue={filters.search || ''}
              placeholder="Search invoices..."
              className="h-14 w-full rounded-[1.05rem] border border-[#dcccba] bg-white pl-14 pr-4 text-[1rem] text-[#3a2513] outline-none transition placeholder:text-[#b09983] focus:border-[#b69066]"
            />
          </div>

          <div className="flex h-14 w-[52px] shrink-0 items-center justify-center rounded-[1.05rem] border border-[#dcccba] bg-white text-[#7a5b3d]">
            <CalendarDays className="h-5 w-5" strokeWidth={2} />
          </div>

          <select
            name="status"
            defaultValue={filters.status || 'all'}
            className="h-14 w-[170px] shrink-0 rounded-[1.05rem] border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
          >
            <option value="all">All</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="sent">Sent</option>
            <option value="draft">Draft</option>
          </select>
        </form>

        <Card className="overflow-hidden rounded-[1.35rem] border border-[#e0d1bf] bg-white shadow-none">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-[#ede1cf]">
                  <tr>
                    {['Invoice', 'Customer', 'Amount', 'Due Date', 'Status', 'Notification', 'Actions'].map((header) => (
                      <th key={header} className="px-8 py-5 text-[1rem] font-semibold text-[#2f2115]">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.length > 0 ? invoices.map((invoice, index) => (
                    <tr key={invoice.id} className={`${index !== invoices.length - 1 ? 'border-b border-[#eadcca]' : ''} bg-white`}>
                      <td className="px-8 py-6">
                        <p className="text-[1.05rem] font-semibold text-[#352314]">{invoice.invoice_number}</p>
                        <p className="mt-1 text-[0.95rem] text-[#6f5238]">{invoice.sub_reference}</p>
                      </td>
                      <td className="px-8 py-6 text-[1.05rem] text-[#5f4328]">{invoice.customer_name}</td>
                      <td className="px-8 py-6 text-[1.1rem] font-semibold text-[#352314]">{money(invoice.amount)}</td>
                      <td className="px-8 py-6 text-[1.05rem] text-[#5f4328]">{invoice.due_date || 'N/A'}</td>
                      <td className="px-8 py-6">
                        <span className={`inline-flex rounded-full px-4 py-2 text-[1rem] font-medium capitalize ${statusTone[invoice.status] || 'bg-slate-100 text-slate-700'}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className={`flex items-center gap-3 text-[1rem] ${notificationTone[invoice.notification.tone] || 'text-[#5f4328]'}`}>
                          <Bell className="h-4 w-4" />
                          <span>{invoice.notification.text}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-5 text-[#4f3118]">
                          <Link
                            href={`/invoices/${invoice.id}`}
                            className="transition hover:text-[#2f1c0d]"
                            aria-label={`View ${invoice.invoice_number}`}
                          >
                            <Eye className="h-5 w-5" strokeWidth={2} />
                          </Link>
                          <a
                            href={`/invoices/${invoice.id}/download`}
                            className="transition hover:text-[#2f1c0d]"
                            aria-label={`Download ${invoice.invoice_number}`}
                          >
                            <Download className="h-5 w-5" strokeWidth={2} />
                          </a>
                          <a
                            href={`/invoices/${invoice.id}/print`}
                            target="_blank"
                            rel="noreferrer"
                            className="transition hover:text-[#2f1c0d]"
                            aria-label={`Print ${invoice.invoice_number}`}
                          >
                            <Printer className="h-5 w-5" strokeWidth={2} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="px-8 py-12 text-center">
                        <p className="text-lg font-medium text-[#4d3218]">No invoices found.</p>
                        <p className="mt-2 text-sm text-[#7a5c3e]">Create an invoice to start tracking billing records.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

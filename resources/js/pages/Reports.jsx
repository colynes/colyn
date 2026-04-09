import React from 'react';
import AppLayout from '@/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { CalendarDays, DollarSign, Download, FileText, Filter, Printer, ReceiptText, ShoppingCart, Users } from 'lucide-react';

const money = (value) => new Intl.NumberFormat('en-TZ', {
  style: 'currency',
  currency: 'TZS',
  maximumFractionDigits: 0,
}).format(value || 0);

const formatPayment = (value) => String(value || 'N/A')
  .replaceAll('_', ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const statusTone = {
  Paid: 'bg-emerald-100 text-emerald-700',
  Pending: 'bg-amber-100 text-amber-700',
};

function MetricCard({ icon: Icon, value, label, footer, footerClassName = '' }) {
  return (
    <Card className="rounded-[1.45rem] border border-[#e0d1bf] bg-white shadow-none">
      <CardContent className="p-7">
        <div className="icon-surface-sm bg-[#efebe6] text-[#4f3118]">
          <Icon className="h-7 w-7" />
        </div>
        <p className="mt-8 text-[2rem] font-semibold tracking-[-0.03em] text-[#352314]">{value}</p>
        <p className="mt-2 text-[1rem] text-[#73563a]">{label}</p>
        {footer ? <p className={`mt-4 text-sm ${footerClassName}`}>{footer}</p> : null}
      </CardContent>
    </Card>
  );
}

export default function Reports({ auth, overview = {}, filters = {}, results = [], topProducts = [] }) {
  const printPage = () => window.print();
  const params = new URLSearchParams();

  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();
  const csvHref = `/reports/export/csv${query ? `?${query}` : ''}`;
  const pdfHref = `/reports/export/pdf${query ? `?${query}` : ''}`;

  return (
    <AppLayout user={auth?.user}>
      <div className="space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[2.45rem] font-semibold tracking-[-0.04em] text-[#3a2513]">Reports &amp; Analytics</h1>
            <p className="mt-2 text-[0.95rem] text-[#73563a]">Generate and export custom reports</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={csvHref}
              className="inline-flex items-center gap-3 rounded-[1.05rem] border border-[#dcccba] bg-white px-5 py-3 text-[1.05rem] font-semibold text-[#4f3118] transition hover:bg-[#faf6f1]"
            >
              <Download className="h-5 w-5" />
              CSV
            </a>
            <a
              href={pdfHref}
              className="inline-flex items-center gap-3 rounded-[1.05rem] border border-[#dcccba] bg-white px-5 py-3 text-[1.05rem] font-semibold text-[#4f3118] transition hover:bg-[#faf6f1]"
            >
              <FileText className="h-5 w-5" />
              PDF
            </a>
            <button
              type="button"
              onClick={printPage}
              className="inline-flex items-center gap-3 rounded-[1.05rem] bg-[#4f3118] px-5 py-3 text-[1.05rem] font-semibold text-white transition hover:bg-[#402612]"
            >
              <Printer className="h-5 w-5" />
              Print
            </button>
          </div>
        </div>

        <Card className="rounded-[1.45rem] border border-[#e0d1bf] bg-white shadow-none">
          <CardContent className="p-7">
            <div className="flex items-center gap-3">
              <Filter className="h-6 w-6 text-[#6f4b26]" />
              <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-[#3a2513]">Report Filters</h2>
            </div>

            <form method="get" action="/reports" className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div>
                <label className="mb-2 block text-[1rem] font-medium text-[#5f4328]">Date From</label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#866748]" />
                  <input
                    type="date"
                    name="date_from"
                    defaultValue={filters.date_from || ''}
                    className="h-14 w-full rounded-[1.05rem] border border-[#dcccba] bg-white pl-14 pr-4 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[1rem] font-medium text-[#5f4328]">Date To</label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#866748]" />
                  <input
                    type="date"
                    name="date_to"
                    defaultValue={filters.date_to || ''}
                    className="h-14 w-full rounded-[1.05rem] border border-[#dcccba] bg-white pl-14 pr-4 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[1rem] font-medium text-[#5f4328]">Customer Type</label>
                <select
                  name="customer_type"
                  defaultValue={filters.customer_type || ''}
                  className="h-14 w-full rounded-[1.05rem] border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
                >
                  <option value="">All Types</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-[1rem] font-medium text-[#5f4328]">Payment Status</label>
                <select
                  name="payment_status"
                  defaultValue={filters.payment_status || ''}
                  className="h-14 w-full rounded-[1.05rem] border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
                >
                  <option value="">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-[1rem] font-medium text-[#5f4328]">Report Type</label>
                <select
                  name="report_type"
                  defaultValue={filters.report_type || ''}
                  className="h-14 w-full rounded-[1.05rem] border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
                >
                  <option value="">All Transactions</option>
                  <option value="deliveries">Deliveries</option>
                  <option value="pickups">Pickups</option>
                </select>
              </div>

              <div className="md:col-span-2 xl:col-span-5">
                <button
                  type="submit"
                  className="inline-flex items-center gap-3 rounded-[1.05rem] bg-[#4f3118] px-6 py-3 text-[1rem] font-semibold text-white transition hover:bg-[#402612]"
                >
                  <Filter className="h-4 w-4" />
                  Apply Filters
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={DollarSign}
            value={money(overview.total_revenue)}
            label="Total Revenue"
            footer={`Paid: ${money(overview.paid_revenue)}   Pending: ${money(overview.pending_revenue)}`}
            footerClassName="text-[0.95rem] text-[#6b513a]"
          />
          <MetricCard
            icon={ShoppingCart}
            value={new Intl.NumberFormat('en-TZ').format(overview.total_orders || 0)}
            label="Total Orders"
            footer={`Paid: ${overview.paid_orders || 0}   Pending: ${overview.pending_orders || 0}`}
            footerClassName="text-[0.95rem] text-[#6b513a]"
          />
          <MetricCard
            icon={Users}
            value={new Intl.NumberFormat('en-TZ').format(overview.unique_customers || 0)}
            label="Unique Customers"
            footer="In selected period"
            footerClassName="text-[0.95rem] text-[#6b513a]"
          />
          <MetricCard
            icon={ReceiptText}
            value={money(overview.average_order_value)}
            label="Avg. Order Value"
            footer="Per transaction"
            footerClassName="text-[0.95rem] text-[#6b513a]"
          />
        </div>

        <Card className="overflow-hidden rounded-[1.45rem] border border-[#e0d1bf] bg-white shadow-none">
          <div className="border-b border-[#dccbb8] bg-[#efe4d3] px-8 py-6">
            <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-[#3a2513]">Report Results</h2>
            <p className="mt-2 text-[1rem] text-[#73563a]">
              Showing {results.length} transactions from {filters.date_from || 'N/A'} to {filters.date_to || 'N/A'}
            </p>
          </div>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-white">
                  <tr>
                    {['Order ID', 'Date', 'Customer', 'Type', 'Order Type', 'Items', 'Amount', 'Status', 'Payment'].map((header) => (
                      <th key={header} className="px-8 py-5 text-[1rem] font-semibold text-[#2f2115]">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.length > 0 ? results.map((row, index) => (
                    <tr key={row.id} className={`${index !== results.length - 1 ? 'border-t border-[#eadcca]' : ''} bg-white`}>
                      <td className="px-8 py-6 text-[1.05rem] font-medium text-[#352314]">{row.order_number}</td>
                      <td className="px-8 py-6 text-[1.05rem] text-[#5f4328]">{row.date}</td>
                      <td className="px-8 py-6 text-[1.05rem] text-[#352314]">{row.customer}</td>
                      <td className="px-8 py-6">
                        <span className="inline-flex rounded-full bg-[#efebe6] px-4 py-2 text-[0.95rem] font-medium text-[#5f4328]">
                          {row.type}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-[1.05rem] text-[#5f4328]">{row.order_type}</td>
                      <td className="px-8 py-6 text-[1.05rem] text-[#5f4328]">{row.items}</td>
                      <td className="px-8 py-6 text-[1.05rem] font-medium text-[#352314]">{money(row.amount)}</td>
                      <td className="px-8 py-6">
                        <span className={`inline-flex rounded-full px-4 py-2 text-[0.95rem] font-medium ${statusTone[row.status] || 'bg-slate-100 text-slate-700'}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-[1.05rem] text-[#5f4328]">{formatPayment(row.payment)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={9} className="px-8 py-12 text-center">
                        <p className="text-lg font-medium text-[#4d3218]">No report results found.</p>
                        <p className="mt-2 text-sm text-[#7a5c3e]">Try another date range or filter combination.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {topProducts.length > 0 ? (
          <Card className="rounded-[1.45rem] border border-[#e0d1bf] bg-white shadow-none">
            <CardContent className="p-7">
              <h2 className="text-[1.8rem] font-semibold tracking-[-0.03em] text-[#3a2513]">Top Products</h2>
              <div className="mt-6 space-y-4">
                {topProducts.map((product) => (
                  <div key={product.sku || product.name} className="flex items-center justify-between rounded-[1.1rem] bg-[#f7f1e8] px-5 py-4">
                    <div>
                      <p className="text-[1.05rem] font-semibold text-[#352314]">{product.name}</p>
                      <p className="mt-1 text-sm text-[#73563a]">{product.sku || 'No SKU'} • {product.units} units sold</p>
                    </div>
                    <p className="text-[1.05rem] font-semibold text-[#4f3118]">{money(product.revenue)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppLayout>
  );
}

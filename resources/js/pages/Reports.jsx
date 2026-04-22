import React, { useEffect, useRef, useState } from 'react';
import AppLayout from '@/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/Card';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CalendarDays,
  DollarSign,
  Download,
  FileText,
  Filter,
  Printer,
  ReceiptText,
  ShoppingCart,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';

const money = (value) => new Intl.NumberFormat('en-TZ', {
  style: 'currency',
  currency: 'TZS',
  maximumFractionDigits: 0,
}).format(value || 0);

const formatPrintedAt = (date = new Date()) => new Intl.DateTimeFormat('en-TZ', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(date);

const formatPaymentReportLabel = (row) => {
  const rawPayment = String(row.payment || '').toLowerCase();
  const rawStatus = String(row.status || '').toLowerCase();

  if (rawStatus === 'pending' || rawPayment.includes('pending')) {
    return 'Pending';
  }

  return 'Paid';
};

const statusTone = {
  Paid: 'bg-emerald-100 text-emerald-700',
  Pending: 'bg-amber-100 text-amber-700',
};

const paymentTone = {
  Paid: 'bg-emerald-100 text-emerald-700',
  Pending: 'bg-amber-100 text-amber-700',
};

const orderTypeTone = {
  Pickup: 'bg-[#efe6d8] text-[#4f3118]',
  Delivery: 'bg-[#eadfce] text-[#4f3118]',
};

const formatCustomerTypeBadge = (type) => {
  const normalized = String(type || '').toLowerCase();

  if (normalized === 'member') {
    return 'Mbr';
  }

  if (normalized === 'subscriber') {
    return 'Sub';
  }

  return 'Walk';
};

const customerTypeTone = {
  'Walk-in': 'bg-[#efebe6] text-[#73563a]',
  Member: 'bg-[#e9ddca] text-[#4f3118]',
  Subscriber: 'bg-[#efe6d8] text-[#4f3118]',
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

function ChartTooltip({ active, payload, label, formatter = money }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#eadcca] bg-white px-4 py-3 shadow-lg">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8b6a46]">{label}</p>
      <div className="mt-2 space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium text-[#5b3a1d]">{entry.name}</span>
            <span className="font-bold text-[#2f2419]">{formatter(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Reports({
  auth,
  overview = {},
  filters = {},
  results = [],
  topProducts = [],
  targetActualTrend = [],
  weeklyPerformance = [],
  monthlyPerformance = [],
  performanceSummary = {},
}) {
  const [period, setPeriod] = useState(filters.period || 'monthly');
  const [printedAt, setPrintedAt] = useState(() => formatPrintedAt());
  const previousTitleRef = useRef(null);
  const printedBy = auth?.user?.name || auth?.user?.full_name || auth?.user?.email || 'Current user';

  const refreshPrintedAt = () => setPrintedAt(formatPrintedAt());
  const preparePrint = () => {
    refreshPrintedAt();

    if (previousTitleRef.current === null) {
      previousTitleRef.current = document.title;
      document.title = ' ';
    }
  };
  const finishPrint = () => {
    if (previousTitleRef.current !== null) {
      document.title = previousTitleRef.current;
      previousTitleRef.current = null;
    }
  };
  const printPage = () => {
    preparePrint();
    window.setTimeout(() => window.print(), 0);
  };

  useEffect(() => {
    window.addEventListener('beforeprint', preparePrint);
    window.addEventListener('afterprint', finishPrint);

    return () => {
      window.removeEventListener('beforeprint', preparePrint);
      window.removeEventListener('afterprint', finishPrint);
      finishPrint();
    };
  }, []);

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
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }

          html,
          body {
            width: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #2f2115 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden !important;
          }

          body:has(.reports-print-area) [class~="lg:pl-64"] {
            min-height: 0 !important;
            padding-left: 0 !important;
          }

          body:has(.reports-print-area) [class~="lg:pl-64"] > :not(main),
          body:has(.reports-print-area) aside,
          body:has(.reports-print-area) nav,
          body:has(.reports-print-area) header {
            display: none !important;
          }

          body:has(.reports-print-area) main {
            display: block !important;
            padding: 1cm !important;
            box-sizing: border-box !important;
          }

          body:has(.reports-print-area) main > div {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
          }

          .reports-page {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            visibility: visible !important;
          }

          .reports-page > :not(.reports-print-area) {
            display: none !important;
          }

          .reports-print-area,
          .reports-print-area * {
            visibility: visible !important;
          }

          .reports-print-area {
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            overflow: visible !important;
            border: 1px solid #d8c8b6 !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }

          .reports-print-header {
            position: relative !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            box-sizing: border-box !important;
            height: calc(68px + 1.6cm) !important;
            padding: 0.8cm 28px !important;
            border-bottom: 1px solid #cdbda9 !important;
            background: #f7f1e8 !important;
            text-align: center !important;
          }

          .reports-print-logo {
            position: absolute !important;
            left: 28px !important;
            top: 0.8cm !important;
            width: 68px !important;
            height: 68px !important;
            transform: none !important;
            object-fit: contain !important;
            box-sizing: border-box !important;
            padding: 6px !important;
            border: 1px solid #d8c8b6 !important;
            border-radius: 16px !important;
            background: #ffffff !important;
          }

          .reports-print-title-block {
            max-width: 70% !important;
            margin: 0 auto !important;
          }

          .reports-print-header h2 {
            font-size: 27px !important;
            line-height: 1.1 !important;
            color: #2f2115 !important;
          }

          .reports-print-header p {
            margin-top: 8px !important;
            font-size: 14px !important;
            color: #5f4328 !important;
          }

          .reports-print-meta strong,
          .reports-print-date,
          .reports-print-by {
            font-weight: 700 !important;
            white-space: nowrap !important;
          }

          .reports-print-by-line {
            margin-top: 6px !important;
            display: block !important;
            font-size: 12px !important;
            color: #73563a !important;
          }

          .reports-print-content,
          .reports-print-table-wrap {
            overflow: visible !important;
          }

          .reports-print-area table {
            width: 100% !important;
            min-width: 0 !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }

          .reports-print-area col:nth-child(1) { width: 11% !important; }
          .reports-print-area col:nth-child(2) { width: 9% !important; }
          .reports-print-area col:nth-child(3) { width: 18% !important; }
          .reports-print-area col:nth-child(4) { width: 26% !important; }
          .reports-print-area col:nth-child(5) { width: 10% !important; }
          .reports-print-area col:nth-child(6) { width: 8% !important; }
          .reports-print-area col:nth-child(7) { width: 8% !important; }
          .reports-print-area col:nth-child(8) { width: 9% !important; }

          .reports-print-area thead {
            display: table-header-group !important;
            background: #efe4d3 !important;
          }

          .reports-print-area tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .reports-print-area th,
          .reports-print-area td {
            padding: 14px 10px !important;
            border-top: 1px solid #eadcca !important;
            color: #2f2115 !important;
            font-size: 12px !important;
            line-height: 1.45 !important;
            vertical-align: top !important;
            white-space: normal !important;
            overflow-wrap: normal !important;
            word-break: normal !important;
          }

          .reports-print-area th {
            padding-top: 13px !important;
            padding-bottom: 13px !important;
            font-size: 12px !important;
            font-weight: 800 !important;
            letter-spacing: 0 !important;
            text-transform: none !important;
            background: #efe4d3 !important;
          }

          .reports-print-area .line-clamp-2 {
            display: block !important;
            overflow: visible !important;
            -webkit-line-clamp: unset !important;
            -webkit-box-orient: initial !important;
          }

          .reports-print-area .truncate {
            overflow: visible !important;
            text-overflow: clip !important;
            white-space: nowrap !important;
          }

          .reports-print-area .reports-customer-cell {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            min-width: 0 !important;
          }

          .reports-print-area .reports-customer-name {
            min-width: 0 !important;
            font-size: 12px !important;
            font-weight: 800 !important;
            color: #2f2115 !important;
          }

          .reports-print-area .report-badge {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            border: 0 !important;
            border-radius: 999px !important;
            color: #2f2115 !important;
            padding: 6px 10px !important;
            font-size: 10px !important;
            font-weight: 800 !important;
            line-height: 1 !important;
            letter-spacing: 0.02em !important;
            white-space: nowrap !important;
          }

          .reports-print-area .report-badge-customer,
          .reports-print-area .report-badge-order {
            background: #eadfce !important;
            color: #2f2115 !important;
          }

          .reports-print-area .report-badge-pending {
            background: #fff1bf !important;
            color: #b45309 !important;
          }

          .reports-print-area .report-badge-paid {
            background: #dff3e7 !important;
            color: #047857 !important;
          }
        }
      `}</style>
      <div className="reports-page space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[2.45rem] font-semibold tracking-[-0.04em] text-[#3a2513]">Reports &amp; Analytics</h1>
            <p className="mt-2 text-[0.95rem] text-[#73563a]">Target vs actual trend with daily-resolved sales targets</p>
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
                <label className="mb-2 block text-[1rem] font-medium text-[#5f4328]">Period</label>
                <select
                  name="period"
                  value={period}
                  onChange={(event) => setPeriod(event.target.value)}
                  className="h-14 w-full rounded-[1.05rem] border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {(period === 'daily' || period === 'weekly') ? (
                <div>
                  <label className="mb-2 block text-[1rem] font-medium text-[#5f4328]">Reference Date</label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#866748]" />
                    <input
                      type="date"
                      name="focus_date"
                      defaultValue={filters.focus_date || ''}
                      className="h-14 w-full rounded-[1.05rem] border border-[#dcccba] bg-white pl-14 pr-4 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
                    />
                  </div>
                </div>
              ) : null}

              {period === 'monthly' ? (
                <div>
                  <label className="mb-2 block text-[1rem] font-medium text-[#5f4328]">Month</label>
                  <input
                    type="month"
                    name="month"
                    defaultValue={filters.month || ''}
                    className="h-14 w-full rounded-[1.05rem] border border-[#dcccba] bg-white px-4 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
                  />
                </div>
              ) : null}

              {period === 'custom' ? (
                <>
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
                </>
              ) : null}

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
            icon={Target}
            value={money(overview.total_target)}
            label="Total Target"
            footer={`${performanceSummary.days_without_target || 0} day(s) without target`}
            footerClassName="text-[0.95rem] text-[#6b513a]"
          />
          <MetricCard
            icon={DollarSign}
            value={money(overview.total_revenue)}
            label="Total Actual"
            footer={`Variance: ${money(overview.variance)}`}
            footerClassName={`text-[0.95rem] ${Number(overview.variance || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
          />
          <MetricCard
            icon={TrendingUp}
            value={`${Number(overview.achievement_percentage || 0).toFixed(1)}%`}
            label="Achievement"
            footer={`${performanceSummary.days_above_target || 0} day(s) above target`}
            footerClassName="text-[0.95rem] text-[#6b513a]"
          />
          <MetricCard
            icon={ShoppingCart}
            value={new Intl.NumberFormat('en-TZ').format(overview.total_orders || 0)}
            label="Valid Orders"
            footer={`Paid: ${overview.paid_orders || 0}   Pending: ${overview.pending_orders || 0}`}
            footerClassName="text-[0.95rem] text-[#6b513a]"
          />
        </div>

        <div className="grid gap-8 xl:grid-cols-2">
          <Card className="rounded-[1.45rem] border border-[#e0d1bf] bg-white shadow-none">
            <CardContent className="p-7">
              <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-[#3a2513]">Target vs Actual Trend</h2>
              <div className="mt-6 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={targetActualTrend} margin={{ top: 10, right: 16, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="#efe3d4" strokeDasharray="3 5" />
                    <XAxis dataKey="label" tick={{ fill: '#74563a', fontSize: 13 }} axisLine={{ stroke: '#9d7d5f' }} tickLine={{ stroke: '#9d7d5f' }} />
                    <YAxis tick={{ fill: '#74563a', fontSize: 13 }} axisLine={{ stroke: '#9d7d5f' }} tickLine={{ stroke: '#9d7d5f' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="target" name="Target" stroke="#c5a06a" strokeWidth={3} strokeDasharray="6 6" dot={{ fill: '#c5a06a', strokeWidth: 0, r: 4 }} />
                    <Line type="monotone" dataKey="actual" name="Actual" stroke="#4b311d" strokeWidth={4} dot={{ fill: '#4b311d', strokeWidth: 0, r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.45rem] border border-[#e0d1bf] bg-white shadow-none">
            <CardContent className="p-7">
              <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-[#3a2513]">Weekly Summary</h2>
              <div className="mt-6 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyPerformance} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke="#efe3d4" strokeDasharray="3 5" />
                    <XAxis dataKey="label" tick={{ fill: '#74563a', fontSize: 12 }} axisLine={{ stroke: '#9d7d5f' }} tickLine={{ stroke: '#9d7d5f' }} />
                    <YAxis tick={{ fill: '#74563a', fontSize: 12 }} axisLine={{ stroke: '#9d7d5f' }} tickLine={{ stroke: '#9d7d5f' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                    <Bar dataKey="target" name="Target" fill="#c5a06a" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="actual" name="Actual" fill="#4b311d" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[1.45rem] border border-[#e0d1bf] bg-white shadow-none">
          <CardContent className="p-7">
            <h2 className="text-[1.8rem] font-semibold tracking-[-0.03em] text-[#3a2513]">Monthly Summary</h2>
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-[#ede1cf]">
                  <tr>
                    {['Month', 'Target', 'Actual', 'Variance', 'Achievement', 'Orders'].map((header) => (
                      <th key={header} className="px-5 py-4 text-sm font-semibold text-[#2f2115]">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthlyPerformance.length > 0 ? monthlyPerformance.map((row, index) => (
                    <tr key={`${row.period_start}-${row.period_end}`} className={index !== monthlyPerformance.length - 1 ? 'border-b border-[#eadcca]' : ''}>
                      <td className="px-5 py-4 text-sm font-medium text-[#352314]">{row.label}</td>
                      <td className="px-5 py-4 text-sm text-[#5f4328]">{money(row.target)}</td>
                      <td className="px-5 py-4 text-sm text-[#5f4328]">{money(row.actual)}</td>
                      <td className={`px-5 py-4 text-sm font-medium ${row.variance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{money(row.variance)}</td>
                      <td className="px-5 py-4 text-sm text-[#5f4328]">{Number(row.achievement_percentage || 0).toFixed(1)}%</td>
                      <td className="px-5 py-4 text-sm text-[#5f4328]">{new Intl.NumberFormat('en-TZ').format(row.orders_count || 0)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-sm text-[#7a5c3e]">No monthly rollup data for this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="reports-print-area overflow-hidden rounded-[1.45rem] border border-[#e0d1bf] bg-white shadow-none">
          <div className="reports-print-header relative border-b border-[#dccbb8] bg-[#efe4d3] px-8 py-6 text-center">
            <img
              src="/images/amani_brew_mark.png"
              alt="Amani Brew"
              className="reports-print-logo absolute left-7 top-1/2 h-[68px] w-[68px] -translate-y-1/2 rounded-2xl border border-[#d8c8b6] bg-white p-1.5 object-contain"
            />
            <div className="reports-print-title-block mx-auto max-w-[70%]">
              <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-[#3a2513]">Report Results</h2>
              <p className="reports-print-meta mt-2 text-[1rem] text-[#73563a]">
                Showing <strong>{results.length}</strong> transactions from <span className="reports-print-date">{filters.date_from || 'N/A'}</span> to <span className="reports-print-date">{filters.date_to || 'N/A'}</span>
              </p>
              <p className="reports-print-by-line mt-2 hidden text-sm text-[#73563a]">
                Printed by <span className="reports-print-by">{printedBy}</span> at <span className="reports-print-date">{printedAt}</span>
              </p>
            </div>
          </div>

          <CardContent className="reports-print-content p-0">
            <div className="reports-print-table-wrap overflow-x-auto lg:overflow-visible">
              <table className="w-full min-w-[760px] table-fixed text-left lg:min-w-0">
                <colgroup>
                  <col className="w-[11%]" />
                  <col className="w-[10%]" />
                  <col className="w-[16%]" />
                  <col className="w-[27%]" />
                  <col className="w-[12%]" />
                  <col className="w-[8%]" />
                  <col className="w-[8%]" />
                  <col className="w-[8%]" />
                </colgroup>
                <thead className="bg-white">
                  <tr>
                    {['Order ID', 'Date', 'Customer', 'Description', 'Amount', 'Status', 'Payment', 'Order Type'].map((header) => (
                      <th
                        key={header}
                        className={`px-4 py-4 text-sm font-semibold text-[#2f2115] ${header === 'Amount' ? 'text-right' : ''}`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.length > 0 ? results.map((row, index) => {
                    const paymentLabel = formatPaymentReportLabel(row);
                    const statusPrintClass = row.status === 'Paid' ? 'report-badge-paid' : 'report-badge-pending';
                    const paymentPrintClass = paymentLabel === 'Paid' ? 'report-badge-paid' : 'report-badge-pending';

                    return (
                      <tr key={row.id} className={`${index !== results.length - 1 ? 'border-t border-[#eadcca]' : ''} bg-white`}>
                        <td className="px-4 py-5 text-sm font-semibold text-[#352314]">{row.order_number}</td>
                        <td className="px-4 py-5 text-sm text-[#5f4328]">{row.date}</td>
                        <td className="px-4 py-5">
                          <div className="reports-customer-cell flex min-w-0 items-center gap-2">
                            <p className="reports-customer-name truncate text-sm font-semibold text-[#352314]" title={row.customer}>{row.customer}</p>
                            <span className={`report-badge report-badge-customer inline-flex shrink-0 rounded-full px-2.5 py-1 text-[0.72rem] font-bold uppercase tracking-[0.08em] ${customerTypeTone[row.customer_type] || 'bg-[#efebe6] text-[#73563a]'}`}>
                              {formatCustomerTypeBadge(row.customer_type)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          <p className="line-clamp-2 text-sm leading-6 text-[#5f4328]" title={row.description || ''}>
                            {row.description || 'No items listed'}
                          </p>
                        </td>
                        <td className="px-4 py-5 text-right text-sm font-semibold tabular-nums text-[#352314]">{money(row.amount)}</td>
                        <td className="px-4 py-5">
                          <span className={`report-badge ${statusPrintClass} inline-flex rounded-full px-3 py-1.5 text-[0.78rem] font-bold ${statusTone[row.status] || 'bg-[#efebe6] text-[#73563a]'}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-5">
                          <span className={`report-badge ${paymentPrintClass} inline-flex max-w-full rounded-full px-3 py-1.5 text-[0.78rem] font-bold ${paymentTone[paymentLabel] || 'bg-[#f5efe7] text-[#5f4328]'}`}>
                            {paymentLabel}
                          </span>
                        </td>
                        <td className="px-4 py-5">
                          <span className={`report-badge report-badge-order inline-flex rounded-full px-3 py-1.5 text-[0.78rem] font-bold ${orderTypeTone[row.order_type] || 'bg-[#efe6d8] text-[#4f3118]'}`}>
                            {row.order_type}
                          </span>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={8} className="px-8 py-12 text-center">
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
                      <p className="mt-1 text-sm text-[#73563a]">{product.sku || 'No SKU'} - {product.units} units sold</p>
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

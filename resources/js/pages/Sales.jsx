import React, { useMemo, useState } from 'react';
import { useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/Card';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Filter, Goal, ArrowUpRight, DollarSign, ShoppingCart, Plus, Trash2, X } from 'lucide-react';

const money = (value) => `Tzs ${new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 }).format(value || 0)}`;
const categoryColors = ['#4d3218', '#d1af77', '#c29b61', '#9e7e4d', '#dfc193'];

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

function StatCard({ icon: Icon, value, label, change }) {
  return (
    <Card className="rounded-[1.75rem] border border-[#e8dcca] bg-white shadow-none">
      <CardContent className="space-y-8 p-7">
        <div className="flex min-h-[60px] items-center justify-between gap-4">
          <div className="icon-surface bg-[#f1ece6] text-[#4d3218]">
            <Icon className="h-8 w-8" strokeWidth={1.75} />
          </div>
          <span className="self-start text-sm font-semibold text-emerald-600">+{Number(change || 0).toFixed(1)}%</span>
        </div>
        <div>
          <p className="text-[2.2rem] font-semibold tracking-[-0.03em] text-[#352314]">{value}</p>
          <p className="mt-2 text-[1.05rem] text-[#6b513a]">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TargetModal({ open, onClose, products, filters, existingTargets = [] }) {
  const form = useForm({
    start_date: filters.start_date || '',
    end_date: filters.end_date || '',
    targets: existingTargets.length > 0
      ? existingTargets.map((target) => ({
          product_id: String(target.product_id),
          target_amount: String(target.target_amount),
        }))
      : [{ product_id: '', target_amount: '' }],
  });

  React.useEffect(() => {
    if (!open) {
      return;
    }

    form.setData({
      start_date: filters.start_date || '',
      end_date: filters.end_date || '',
      targets: existingTargets.length > 0
        ? existingTargets.map((target) => ({
            product_id: String(target.product_id),
            target_amount: String(target.target_amount),
          }))
        : [{ product_id: '', target_amount: '' }],
    });
  }, [open, filters.start_date, filters.end_date, existingTargets]);

  if (!open) {
    return null;
  }

  const updateTargetRow = (index, field, value) => {
    const nextTargets = [...form.data.targets];
    nextTargets[index] = {
      ...nextTargets[index],
      [field]: value,
    };
    form.setData('targets', nextTargets);
  };

  const addTargetRow = () => {
    form.setData('targets', [...form.data.targets, { product_id: '', target_amount: '' }]);
  };

  const removeTargetRow = (index) => {
    if (form.data.targets.length === 1) {
      form.setData('targets', [{ product_id: '', target_amount: '' }]);
      return;
    }

    form.setData('targets', form.data.targets.filter((_, rowIndex) => rowIndex !== index));
  };

  const submit = (event) => {
    event.preventDefault();
    form.post('/sales/targets', {
      preserveScroll: true,
      onSuccess: () => onClose(),
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-6">
      <div className="my-auto flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#eadcca] px-6 py-5">
          <div>
            <h2 className="text-[1.9rem] font-semibold tracking-[-0.03em] text-[#3a2513]">Set Product Targets</h2>
            <p className="mt-1 text-base text-[#76593d]">Choose existing products and define target revenue for the selected period.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#6d5036] transition hover:bg-[#f3ede5]"
            aria-label="Close targets modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="overflow-y-auto px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#4f3118]">Start Date</label>
              <input
                type="date"
                value={form.data.start_date}
                onChange={(e) => form.setData('start_date', e.target.value)}
                className="h-12 w-full rounded-xl border border-[#dcccba] bg-white px-4 text-sm outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#4f3118]">End Date</label>
              <input
                type="date"
                value={form.data.end_date}
                onChange={(e) => form.setData('end_date', e.target.value)}
                className="h-12 w-full rounded-xl border border-[#dcccba] bg-white px-4 text-sm outline-none"
              />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {form.data.targets.map((target, index) => (
              <div key={`${index}-${target.product_id}`} className="grid gap-4 rounded-2xl border border-[#eadcca] bg-[#fbf7f1] p-4 md:grid-cols-[1fr,220px,52px]">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#4f3118]">Product</label>
                  <select
                    value={target.product_id}
                    onChange={(e) => updateTargetRow(index, 'product_id', e.target.value)}
                    className="h-12 w-full rounded-xl border border-[#dcccba] bg-white px-4 text-sm outline-none"
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#4f3118]">Target Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={target.target_amount}
                    onChange={(e) => updateTargetRow(index, 'target_amount', e.target.value)}
                    placeholder="Enter TZS target"
                    className="h-12 w-full rounded-xl border border-[#dcccba] bg-white px-4 text-sm outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeTargetRow(index)}
                    className="flex h-12 w-full items-center justify-center rounded-xl border border-red-200 bg-white text-red-500 transition hover:bg-red-50"
                    aria-label="Remove target row"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={addTargetRow}
              className="inline-flex items-center gap-2 rounded-xl border border-[#d8c4aa] bg-white px-4 py-2.5 text-sm font-semibold text-[#4f3118]"
            >
              <Plus className="h-4 w-4" />
              Add Another Product
            </button>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-[#d9c4a9] py-3 text-sm font-semibold text-[#4f3118]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={form.processing}
              className="flex-1 rounded-2xl bg-[#4f3118] py-3 text-sm font-semibold text-white"
            >
              {form.processing ? 'Saving...' : 'Save Targets'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Sales({
  auth,
  metrics = {},
  weeklySales = [],
  categorySales = [],
  products = [],
  filters = {},
  productPerformance = [],
  topProducts = [],
  targets = [],
}) {
  const [targetsOpen, setTargetsOpen] = useState(false);

  const visibleTargets = useMemo(
    () => targets.filter((target) => !filters.product_id || String(target.product_id) === String(filters.product_id)),
    [targets, filters.product_id],
  );

  return (
    <AppLayout user={auth?.user}>
      <TargetModal
        open={targetsOpen}
        onClose={() => setTargetsOpen(false)}
        products={products}
        filters={filters}
        existingTargets={visibleTargets}
      />

      <div className="space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[2.45rem] font-semibold tracking-[-0.04em] text-[#3a2513]">Sales Analytics</h1>
            <p className="mt-2 text-[1.05rem] text-[#73563a]">Track your sales performance and trends</p>
          </div>

          <form method="get" action="/sales" className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setTargetsOpen(true)}
              className="inline-flex items-center gap-3 rounded-[1.05rem] bg-[#4f3118] px-6 py-3.5 text-[1.05rem] font-semibold text-white"
            >
              <Goal className="h-5 w-5" />
              Set Targets
            </button>
            <input type="hidden" name="product_id" value={filters.product_id || ''} />
            <input
              type="date"
              name="start_date"
              defaultValue={filters.start_date || ''}
              className="h-13 rounded-[1.05rem] border border-[#dcccba] bg-white px-4 text-[1rem] text-[#3a2513] outline-none"
            />
            <input
              type="date"
              name="end_date"
              defaultValue={filters.end_date || ''}
              className="h-13 rounded-[1.05rem] border border-[#dcccba] bg-white px-4 text-[1rem] text-[#3a2513] outline-none"
            />
            <button
              type="submit"
              className="rounded-[1.05rem] border border-[#dcccba] bg-white px-5 py-3 text-[1rem] font-semibold text-[#4f3118]"
            >
              Apply
            </button>
          </form>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={DollarSign} value={money(metrics.gross_revenue || 0)} label="Total Sales" change={metrics.gross_revenue_change || 0} />
          <StatCard icon={ShoppingCart} value={new Intl.NumberFormat('en-TZ').format(metrics.total_orders || 0)} label="Total Orders" change={metrics.orders_change || 0} />
          <StatCard icon={ArrowUpRight} value={money(metrics.average_order || 0)} label="Avg. Order Value" change={metrics.average_order_change || 0} />
          <StatCard icon={ArrowUpRight} value={`${Math.round(metrics.sales_growth || 0)}%`} label="Sales Growth" change={metrics.sales_growth_change || 0} />
        </div>

        <Card className="rounded-[1.75rem] border border-[#eadcca] bg-white shadow-none">
          <CardContent className="p-6">
            <form method="get" action="/sales" className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 text-[1.05rem] font-semibold text-[#4f3118]">
                <Filter className="h-5 w-5" />
                Filter by Product:
              </div>
              <input type="hidden" name="start_date" value={filters.start_date || ''} />
              <input type="hidden" name="end_date" value={filters.end_date || ''} />
              <select
                name="product_id"
                defaultValue={filters.product_id || ''}
                className="h-13 min-w-[265px] rounded-[1.05rem] border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none"
              >
                <option value="">All Products</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-[1.05rem] border border-[#dcccba] bg-white px-5 py-3 text-[1rem] font-semibold text-[#4f3118]"
              >
                Filter
              </button>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-8 xl:grid-cols-2">
          <Card className="rounded-[1.75rem] border border-[#eadcca] bg-white shadow-none">
            <CardContent className="p-7">
              <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-[#3a2513]">Weekly Sales: Target vs Actual</h2>
              <div className="mt-6 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklySales} margin={{ top: 10, right: 16, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="#efe3d4" strokeDasharray="3 5" />
                    <XAxis dataKey="day" tick={{ fill: '#74563a', fontSize: 15 }} axisLine={{ stroke: '#9d7d5f' }} tickLine={{ stroke: '#9d7d5f' }} />
                    <YAxis tick={{ fill: '#74563a', fontSize: 15 }} axisLine={{ stroke: '#9d7d5f' }} tickLine={{ stroke: '#9d7d5f' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="target" name="Target" stroke="#c5a06a" strokeWidth={3} strokeDasharray="6 6" dot={{ fill: '#c5a06a', strokeWidth: 0, r: 4 }} />
                    <Line type="monotone" dataKey="actual" name="Actual" stroke="#4b311d" strokeWidth={4} dot={{ fill: '#4b311d', strokeWidth: 0, r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border border-[#eadcca] bg-white shadow-none">
            <CardContent className="p-7">
              <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-[#3a2513]">Sales by Category</h2>
              <div className="mt-6 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categorySales}
                      dataKey="revenue"
                      nameKey="name"
                      cx="50%"
                      cy="55%"
                      innerRadius={0}
                      outerRadius={120}
                      paddingAngle={1}
                      label={({ name, percent }) => `${name}: ${Math.round((percent || 0) * 100)}%`}
                    >
                      {categorySales.map((entry, index) => (
                        <Cell key={entry.name} fill={categoryColors[index % categoryColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip formatter={money} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[1.75rem] border border-[#eadcca] bg-white shadow-none">
          <CardContent className="p-7">
            <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-[#3a2513]">Product Performance: Target vs Actual</h2>
            <div className="mt-6 h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productPerformance} margin={{ top: 10, right: 16, left: -6, bottom: 0 }} barGap={10}>
                  <CartesianGrid stroke="#efe3d4" strokeDasharray="3 5" />
                  <XAxis dataKey="name" tick={{ fill: '#74563a', fontSize: 14 }} axisLine={{ stroke: '#9d7d5f' }} tickLine={{ stroke: '#9d7d5f' }} />
                  <YAxis tick={{ fill: '#74563a', fontSize: 14 }} axisLine={{ stroke: '#9d7d5f' }} tickLine={{ stroke: '#9d7d5f' }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                  <Bar dataKey="target" name="Target" fill="#c29b61" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="actual" name="Actual Revenue" fill="#4b311d" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border border-[#eadcca] bg-white shadow-none">
          <CardContent className="p-5">
            <h2 className="px-2 text-[2rem] font-semibold tracking-[-0.03em] text-[#3a2513]">Top Products</h2>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-[#ede1cf]">
                  <tr>
                    {['Product', 'Units Sold', 'Revenue', 'Target', 'Performance'].map((header) => (
                      <th key={header} className="px-8 py-5 text-[1rem] font-semibold text-[#2f2115]">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((product, index) => {
                    const positive = product.performance >= 100;

                    return (
                      <tr key={product.id || product.name} className={index !== topProducts.length - 1 ? 'border-b border-[#eadcca]' : ''}>
                        <td className="px-8 py-7 text-[1.05rem] font-medium text-[#352314]">{product.name}</td>
                        <td className="px-8 py-7 text-[1.05rem] text-[#352314]">{new Intl.NumberFormat('en-TZ').format(product.units_sold || 0)}</td>
                        <td className="px-8 py-7 text-[1.05rem] font-medium text-[#352314]">{money(product.revenue)}</td>
                        <td className="px-8 py-7 text-[1.05rem] text-[#5f4328]">{money(product.target)}</td>
                        <td className="px-8 py-7">
                          <span className={`inline-flex rounded-full px-4 py-2 text-[0.95rem] font-medium ${positive ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                            {product.performance.toFixed(1)}%{positive ? ' ✓' : ''}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

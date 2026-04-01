import React, { useMemo, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/Card';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  ArrowUpRight,
  Box,
  ChevronRight,
  X,
  DollarSign,
  ShoppingCart,
  Truck,
} from 'lucide-react';

const money = (value) => `Tzs ${new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 }).format(value || 0)}`;

const metricTone = (value, suffix = '%') => {
  const amount = Number(value || 0);

  if (amount > 0) {
    return {
      text: `+${amount}${suffix}`,
      className: 'text-emerald-600',
    };
  }

  if (amount < 0) {
    return {
      text: `${amount}${suffix}`,
      className: 'text-orange-500',
    };
  }

  return {
    text: `0${suffix}`,
    className: 'text-slate-500',
  };
};

const orderStatusTone = {
  completed: 'bg-emerald-100 text-emerald-700',
  processing: 'bg-blue-100 text-blue-700',
  pending: 'bg-orange-100 text-orange-700',
  dispatched: 'bg-amber-100 text-amber-700',
};

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

function StatCard({ icon: Icon, value, label, change, changeSuffix = '%', iconClassName = '' }) {
  const tone = metricTone(change, changeSuffix);

  return (
    <Card className="rounded-[1.75rem] border border-[#e8dcca] bg-white shadow-none">
      <CardContent className="space-y-8 p-7">
        <div className="flex min-h-[60px] items-center justify-between gap-4">
          <div className={`icon-surface bg-[#f1ece6] text-[#4d3218] ${iconClassName}`}>
            <Icon className="h-8 w-8" strokeWidth={1.75} />
          </div>
          <span className={`self-start text-sm font-semibold ${tone.className}`}>{tone.text}</span>
        </div>
        <div>
          <p className="text-[2.2rem] font-semibold tracking-[-0.03em] text-[#352314]">{value}</p>
          <p className="mt-2 text-[1.05rem] text-[#6b513a]">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PendingOrdersModal({ open, onClose, dateLabel, orders }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-6">
      <div className="relative my-auto flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#eadcca] px-7 py-6">
          <div>
            <h2 className="text-[2.2rem] font-semibold tracking-[-0.03em] text-[#3a2513]">Today&apos;s Pending Orders</h2>
            <p className="mt-1 text-xl text-[#6d5036]">{dateLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#6d5036] transition hover:bg-[#f4ede5] hover:text-[#3a2513]"
            aria-label="Close delivery schedule"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-y-auto px-7 py-6">
          <div className="space-y-4">
            {orders.length > 0 ? orders.map((order) => (
              <div key={order.id} className="flex flex-col gap-5 rounded-[1.35rem] border border-[#e3d2bc] bg-[#f9f5ef] px-5 py-5 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="text-[1.15rem] font-semibold text-[#352314]">{order.customer}</p>
                    <p className="text-sm font-medium uppercase tracking-[0.08em] text-[#8a6847]">{order.order_number}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#7c5d40]">
                    <span className="rounded-full bg-[#efe4d3] px-3 py-1.5 font-medium capitalize">{order.fulfillment_method}</span>
                    <span>Placed at {order.created_at || 'Today'}</span>
                  </div>
                  <p className="mt-4 text-base text-[#6d5036]">Items:</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {order.items.map((item) => (
                      <span key={item} className="rounded-xl bg-[#efe4d3] px-3 py-2 text-sm font-medium text-[#5d3f23]">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 items-center justify-start md:justify-end">
                  <button
                    type="button"
                    onClick={() => router.patch(`/dashboard/orders/${order.id}/dispatch`, {}, { preserveScroll: true })}
                    className="inline-flex items-center rounded-2xl bg-[#4f3118] px-6 py-3 text-base font-semibold text-white transition hover:bg-[#402612]"
                  >
                    Dispatch
                  </button>
                </div>
              </div>
            )) : (
              <div className="rounded-[1.35rem] border border-dashed border-[#ddc8ae] bg-[#fbf7f1] px-6 py-10 text-center">
                <p className="text-xl font-medium text-[#4d3218]">No pending orders for today.</p>
                <p className="mt-2 text-base text-[#7a5c3e]">Newly placed orders will appear here and can be dispatched from this panel.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({
  auth,
  stats,
  deliverySummary,
  salesTrend = [],
  productTrend = [],
  lowStock = [],
  recentOrders = [],
  todaysPendingOrders = [],
}) {
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const scheduleDateLabel = deliverySummary?.date || useMemo(() => {
    const today = new Date();

    return today.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const statCards = [
    {
      icon: DollarSign,
      value: money(stats?.todays_sales || 0),
      label: "Today's Sales",
      change: stats?.sales_change || 0,
    },
    {
      icon: ShoppingCart,
      value: new Intl.NumberFormat('en-TZ').format(stats?.todays_orders || 0),
      label: 'Orders',
      change: stats?.orders_change || 0,
    },
    {
      icon: Box,
      value: new Intl.NumberFormat('en-TZ').format(stats?.inventory_items || 0),
      label: 'Inventory Items',
      change: stats?.inventory_change || 0,
      changeSuffix: ' items',
    },
    {
      icon: ArrowUpRight,
      value: money(stats?.monthly_revenue || 0),
      label: 'Monthly Revenue',
      change: stats?.monthly_revenue_change || 0,
    },
  ];

  return (
    <AppLayout user={auth?.user}>
      <div className="space-y-8">
        <PendingOrdersModal
          open={scheduleOpen}
          onClose={() => setScheduleOpen(false)}
          dateLabel={scheduleDateLabel}
          orders={todaysPendingOrders}
        />

        <Card className="rounded-[1.65rem] border border-[#dac8b1] bg-[linear-gradient(90deg,#f3ebe0_0%,#f7f1e8_50%,#f5ecdf_100%)] shadow-none">
          <CardContent className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:p-6">
            <div className="flex items-center gap-4">
              <div className="icon-surface bg-[#4f3118] text-white">
                <Truck className="h-8 w-8" strokeWidth={1.8} />
              </div>
              <div>
                <h1 className="text-[1.95rem] font-semibold tracking-[-0.03em] text-[#3d2815]">
                  {deliverySummary?.title || "Today's Pending Orders"}
                </h1>
                <p className="text-lg text-[#6d5036]">{deliverySummary?.date}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 md:gap-6">
              <div className="text-right">
                <p className="text-[3rem] font-semibold leading-none tracking-[-0.04em] text-[#3a2513]">
                  {deliverySummary?.count || 0}
                </p>
                <p className="mt-1 text-lg text-[#6d5036]">Total Orders</p>
              </div>
              <button
                type="button"
                onClick={() => setScheduleOpen(true)}
                className="inline-flex items-center gap-3 rounded-2xl bg-[#4f3118] px-6 py-4 text-lg font-semibold text-white transition hover:bg-[#402612]"
              >
                View
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>

        <div className="grid gap-8 xl:grid-cols-2">
          <Card className="rounded-[1.75rem] border border-[#eadcca] bg-white shadow-none">
            <CardContent className="p-7">
              <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-[#3a2513]">Weekly Sales: Target vs Actual</h2>
              <div className="mt-6 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesTrend} margin={{ top: 10, right: 16, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="#efe3d4" strokeDasharray="3 5" />
                    <XAxis dataKey="day" tick={{ fill: '#74563a', fontSize: 15 }} axisLine={{ stroke: '#9d7d5f' }} tickLine={{ stroke: '#9d7d5f' }} />
                    <YAxis tick={{ fill: '#74563a', fontSize: 15 }} axisLine={{ stroke: '#9d7d5f' }} tickLine={{ stroke: '#9d7d5f' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="target"
                      name="Target"
                      stroke="#c5a06a"
                      strokeWidth={3}
                      strokeDasharray="6 6"
                      dot={{ fill: '#c5a06a', strokeWidth: 0, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      name="Actual"
                      stroke="#4b311d"
                      strokeWidth={4}
                      dot={{ fill: '#4b311d', strokeWidth: 0, r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border border-[#eadcca] bg-white shadow-none">
            <CardContent className="p-7">
              <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-[#3a2513]">Product Sales: Target vs Actual</h2>
              <div className="mt-6 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productTrend} margin={{ top: 10, right: 16, left: -18, bottom: 0 }} barGap={10}>
                    <CartesianGrid stroke="#efe3d4" strokeDasharray="3 5" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#74563a', fontSize: 15 }} axisLine={{ stroke: '#9d7d5f' }} tickLine={{ stroke: '#9d7d5f' }} />
                    <YAxis tick={{ fill: '#74563a', fontSize: 15 }} axisLine={{ stroke: '#9d7d5f' }} tickLine={{ stroke: '#9d7d5f' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="target" name="Target" fill="#c5a06a" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="actual" name="Actual" fill="#4b311d" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 xl:grid-cols-2">
          <Card className="rounded-[1.75rem] border border-[#eadcca] bg-white shadow-none">
            <CardContent className="p-7">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-[#ff5c00]" />
                <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-[#3a2513]">Low Stock Alert</h2>
              </div>
              <div className="mt-6 space-y-4">
                {lowStock.length > 0 ? lowStock.map((product) => (
                  <div key={product.id} className="flex items-center justify-between gap-4 rounded-[1.35rem] bg-[#efe4d3] px-5 py-5">
                    <div>
                      <p className="text-[1.1rem] font-medium text-[#352314]">{product.name}</p>
                      <p className="mt-1 text-lg text-[#72563a]">
                        {new Intl.NumberFormat('en-TZ').format(product.stock_quantity)} {product.unit} remaining
                      </p>
                      <p className="mt-1 text-sm text-[#8b6a46]">
                        Alert level: {new Intl.NumberFormat('en-TZ').format(product.alert_level || 0)} {product.unit}
                      </p>
                    </div>
                    <Link
                      href="/inventory/products"
                      className="inline-flex items-center rounded-2xl bg-[#4f3118] px-6 py-3 text-lg font-semibold text-white transition hover:bg-[#402612]"
                    >
                      Restock
                    </Link>
                  </div>
                )) : (
                  <div className="rounded-[1.35rem] bg-[#f6efe7] px-5 py-6 text-lg text-[#6b513a]">
                    No stock alerts right now.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border border-[#eadcca] bg-white shadow-none">
            <CardContent className="p-7">
              <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-[#3a2513]">Recent Orders</h2>
              <div className="mt-6 space-y-4">
                {recentOrders.length > 0 ? recentOrders.map((order) => {
                  const statusKey = String(order.status || '').toLowerCase();

                  return (
                    <div key={order.id} className="rounded-[1.35rem] bg-[#efe4d3] px-5 py-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[1.15rem] font-medium text-[#352314]">{order.order_number}</p>
                          <p className="mt-1 text-lg text-[#72563a]">{order.customer || `Customer #${order.customer_id}`}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[1.2rem] font-medium text-[#352314]">{money(order.total)}</p>
                          <span className={`mt-3 inline-flex rounded-full px-4 py-1.5 text-base font-medium capitalize ${orderStatusTone[statusKey] || 'bg-slate-100 text-slate-700'}`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="rounded-[1.35rem] bg-[#f6efe7] px-5 py-6 text-lg text-[#6b513a]">
                    No recent orders yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

import React, { useState } from 'react';
import AppLayout from '@/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Truck, DollarSign, ShoppingCart, Package, TrendingUp, ChevronRight, X } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

const weeklyData = [
  { name: 'Mon', target: 1500, actual: 1200 },
  { name: 'Tue', target: 1800, actual: 1900 },
  { name: 'Wed', target: 1700, actual: 1600 },
  { name: 'Thu', target: 2000, actual: 2300 },
  { name: 'Fri', target: 2500, actual: 2800 },
  { name: 'Sat', target: 3300, actual: 3500 },
  { name: 'Sun', target: 2700, actual: 2600 },
];

const productData = [
  { name: 'Beef',     target: 12000, actual: 13000 },
  { name: 'Pork',     target: 9000,  actual: 8000  },
  { name: 'Chicken',  target: 7000,  actual: 6500  },
  { name: 'Lamb',     target: 5500,  actual: 5000  },
  { name: 'Sausages', target: 4000,  actual: 4200  },
];

const mockDeliveries = [
  { name: 'John Smith',   sub: 'SUB-001', time: '09:00 AM', items: ['Premium Ribeye 2kg', 'Ground Beef 3kg', 'Chicken Breast 2kg'] },
  { name: 'Mike Davis',   sub: 'SUB-003', time: '11:00 AM', items: ['Pork Chops 2kg', 'Bacon 1kg', 'Ground Beef 2kg'] },
  { name: 'Tom Wilson',   sub: 'SUB-007', time: '02:00 PM', items: ['Mixed Pack 5kg'] },
  { name: 'Anna Martinez',sub: 'SUB-009', time: '03:30 PM', items: ['Chicken Variety 4kg', 'Sausages 2kg'] },
];

export default function Dashboard({ 
  auth, 
  totalSales = 0, 
  totalOrders = 0, 
  totalProducts = 0, 
  totalRevenue = 0, 
  lowStock = [], 
  recentOrders = [] 
}) {
  const [showDeliveries, setShowDeliveries] = useState(false);

  const formatCurrency = (val) => {
    return `Tzs ${new Intl.NumberFormat('en-TZ').format(val || 0)}`;
  };

  const metrics = [
    { icon: DollarSign, label: "Today's Sales",    value: formatCurrency(totalSales),  change: '+12.5%', up: true },
    { icon: ShoppingCart, label: 'Today\'s Orders', value: totalOrders.toString(),      change: '+8.3%',  up: true },
    { icon: Package, label: 'Total Products',      value: totalProducts.toString(),    change: 'Active', up: true },
    { icon: TrendingUp, label: 'Total Revenue',    value: formatCurrency(totalRevenue), change: '+18.2%', up: true },
  ];

  return (
    <AppLayout user={auth?.user}>

      {/* Tomorrow's Deliveries Banner */}
      <div className="bg-[#EFEEE7] border border-[#EBE7DF] rounded-2xl p-6 mb-8 flex justify-between items-center">
        <div className="flex items-center gap-5">
          <div className="bg-[var(--color-brand-dark)] p-3 rounded-xl text-white">
            <Truck size={28} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-sys-text-primary)]">Tomorrow's Deliveries</h2>
            <p className="text-sm text-[var(--color-sys-text-secondary)]">Wednesday, March 25, 2026</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="block text-3xl font-bold text-[var(--color-sys-text-primary)] leading-none">4</span>
            <span className="text-xs text-[var(--color-sys-text-secondary)] uppercase tracking-wide">Total Orders</span>
          </div>
          <button
            onClick={() => setShowDeliveries(true)}
            className="bg-[var(--color-brand-dark)] text-white px-5 py-2.5 rounded-xl hover:bg-[#2c1d14] flex items-center transition-colors"
          >
            View <ChevronRight size={18} className="ml-1" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map(({ icon: Icon, label, value, change, up }) => (
          <Card key={label} className="rounded-2xl border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-[#F3F4ED] p-2.5 rounded-lg text-[var(--color-brand-dark)]">
                  <Icon size={20} />
                </div>
                <span className={`text-sm font-semibold ${up ? 'text-[var(--color-status-success)]' : 'text-[var(--color-status-danger)]'}`}>{change}</span>
              </div>
              <div className="text-2xl font-bold text-[var(--color-sys-text-primary)]">{value}</div>
              <p className="text-sm text-[var(--color-sys-text-secondary)] mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="rounded-2xl border-none shadow-sm">
          <CardHeader><CardTitle className="text-base font-semibold">Weekly Sales: Target vs Actual</CardTitle></CardHeader>
          <CardContent className="pb-8">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: 16 }} />
                <Line type="monotone" dataKey="target" name="Target Sales" stroke="#CDAD7D" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4, fill: '#CDAD7D' }} />
                <Line type="monotone" dataKey="actual" name="Actual Sales" stroke="#463426" strokeWidth={2} dot={{ r: 4, fill: '#463426' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-sm">
          <CardHeader><CardTitle className="text-base font-semibold">Product Sales: Target vs Actual</CardTitle></CardHeader>
          <CardContent className="pb-8">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={productData} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip cursor={{ fill: '#F1F5F9' }} />
                <Legend iconType="square" wrapperStyle={{ paddingTop: 16 }} />
                <Bar dataKey="target" name="Target" fill="#C8A97E" radius={[2, 2, 0, 0]} />
                <Bar dataKey="actual"  name="Actual"  fill="#463426" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        <Card className="rounded-2xl border-none shadow-sm h-full">
           <CardHeader className="flex flex-row items-center gap-2">
             <div className="text-amber-600"><TrendingUp size={18} /></div>
             <CardTitle className="text-base font-semibold">Low Stock Alert</CardTitle>
           </CardHeader>
           <CardContent className="space-y-3">
             {lowStock.length > 0 ? lowStock.map((item) => (
               <div key={item.id} className="flex items-center justify-between p-4 bg-[#F5F2EF] rounded-xl border border-transparent hover:border-[#CDAD7D]/30 transition-all">
                 <div>
                   <p className="font-semibold text-[var(--color-sys-text-primary)]">{item.name}</p>
                   <p className="text-xs text-[var(--color-sys-text-secondary)]">{item.stocks?.[0]?.quantity || 0} {item.unit} remaining</p>
                 </div>
                 <Button variant="primary" className="py-1 px-4 text-xs h-8 bg-[var(--color-brand-dark)]">Restock</Button>
               </div>
             )) : (
               <p className="text-center py-8 text-gray-400 text-sm italic">No low stock items currently.</p>
             )}
           </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="rounded-2xl border-none shadow-sm h-full">
           <CardHeader>
             <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
           </CardHeader>
           <CardContent className="space-y-3">
             {recentOrders.length > 0 ? recentOrders.map((order) => {
               const statusColors = {
                 'completed': 'bg-green-100 text-green-700',
                 'processing': 'bg-blue-100 text-blue-700',
                 'pending': 'bg-amber-100 text-amber-700',
                 'cancelled': 'bg-red-100 text-red-700',
               };
               return (
                 <div key={order.id} className="flex items-center justify-between p-4 bg-[#F5F2EF] rounded-xl border border-transparent hover:border-[#CDAD7D]/30 transition-all">
                   <div>
                     <p className="font-semibold text-[var(--color-sys-text-primary)] uppercase text-xs tracking-wider">{order.order_number}</p>
                     <p className="text-sm font-medium text-[var(--color-sys-text-secondary)]">Client ID: {order.customer_id}</p>
                   </div>
                   <div className="text-right">
                     <p className="font-bold text-sm text-[var(--color-sys-text-primary)] mb-1">{formatCurrency(order.total)}</p>
                     <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${statusColors[order.status?.toLowerCase()] || 'bg-gray-100 text-gray-700'}`}>
                       {order.status}
                     </span>
                   </div>
                 </div>
               );
             }) : (
               <p className="text-center py-8 text-gray-400 text-sm italic">No recent orders found.</p>
             )}
           </CardContent>
        </Card>
      </div>

      {/* Delivery Schedule Modal */}
      {showDeliveries && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-start p-6 pb-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--color-sys-text-primary)]">Tomorrow's Delivery Schedule</h2>
                <p className="text-sm text-[var(--color-sys-text-secondary)] mt-0.5">Wednesday, March 25, 2026</p>
              </div>
              <button onClick={() => setShowDeliveries(false)} className="text-gray-400 hover:text-gray-600 mt-0.5">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 pb-6 space-y-3 max-h-[60vh] overflow-y-auto">
              {mockDeliveries.map((d, i) => (
                <div key={i} className="bg-[var(--color-sys-bg)] rounded-xl p-4 flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-semibold text-[var(--color-sys-text-primary)]">{d.name}</span>
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{d.sub}</span>
                    </div>
                    <p className="text-xs text-[var(--color-sys-text-secondary)] mb-2">Items:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {d.items.map((item, j) => (
                        <span key={j} className="text-xs bg-[#E8E2D9] text-[var(--color-brand-dark)] px-2 py-0.5 rounded-full font-medium">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-[var(--color-brand-dark)] text-white text-center rounded-xl px-3 py-2 min-w-[76px] shrink-0">
                    <p className="text-[10px] font-medium opacity-70">Time</p>
                    <p className="text-sm font-bold leading-tight">{d.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </AppLayout>
  );
}

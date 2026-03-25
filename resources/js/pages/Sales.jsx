import React from 'react';
import AppLayout from '@/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { DollarSign, ShoppingCart, TrendingUp, Calendar, Target } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';

export default function Sales({ auth }) {
  const weeklyData = [
    { name: 'Mon', target: 850000, actual: 800000 },
    { name: 'Tue', target: 1700000, actual: 1800000 },
    { name: 'Wed', target: 1600000, actual: 1550000 },
    { name: 'Thu', target: 2000000, actual: 2300000 },
    { name: 'Fri', target: 2800000, actual: 3100000 },
    { name: 'Sat', target: 3400000, actual: 3600000 },
    { name: 'Sun', target: 2700000, actual: 2600000 },
  ];

  const categoryData = [
    { name: 'Beef', value: 35 },
    { name: 'Pork', value: 25 },
    { name: 'Chicken', value: 20 },
    { name: 'Lamb', value: 12 },
    { name: 'Sausages', value: 8 },
  ];

  const pieColors = ['#463426', '#C8A97E', '#8C6F53', '#CDAD7D', '#E2D1B3'];

  return (
    <AppLayout user={auth?.user}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-sys-text-primary)] tracking-tight">Sales Analytics</h1>
          <p className="text-sm text-[var(--color-sys-text-secondary)] mt-1">Track your sales performance and trends</p>
        </div>
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <Button variant="primary" className="flex items-center gap-2">
            <Target size={16} /> Set Targets
          </Button>
          <div className="flex items-center bg-white border border-[var(--color-sys-border)] rounded-lg px-3 py-2">
            <Calendar size={16} className="text-gray-400 mr-2" />
            <select className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer outline-none">
              <option>This Week</option>
              <option>Last Week</option>
              <option>This Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card className="rounded-xl border-none shadow-sm flex flex-col justify-between">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-[#F3F4ED] p-2.5 rounded-lg text-[var(--color-brand-dark)]">
                <DollarSign size={20} />
              </div>
              <span className="text-sm font-semibold text-[var(--color-status-success)]">+18.2%</span>
            </div>
            <div className="text-2xl font-bold text-[var(--color-sys-text-primary)]">Tzs 52,340,000</div>
            <p className="text-sm text-[var(--color-sys-text-secondary)] mt-1">Total Sales</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-none shadow-sm flex flex-col justify-between">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-[#F3F4ED] p-2.5 rounded-lg text-[var(--color-brand-dark)]">
                <ShoppingCart size={20} />
              </div>
              <span className="text-sm font-semibold text-[var(--color-status-success)]">+12.5%</span>
            </div>
            <div className="text-2xl font-bold text-[var(--color-sys-text-primary)]">648</div>
            <p className="text-sm text-[var(--color-sys-text-secondary)] mt-1">Total Orders</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-none shadow-sm flex flex-col justify-between">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-[#F3F4ED] p-2.5 rounded-lg text-[var(--color-brand-dark)]">
                <TrendingUp size={20} />
              </div>
              <span className="text-sm font-semibold text-[var(--color-status-success)]">+5.1%</span>
            </div>
            <div className="text-2xl font-bold text-[var(--color-sys-text-primary)]">Tzs 80,770</div>
            <p className="text-sm text-[var(--color-sys-text-secondary)] mt-1">Avg. Order Value</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-none shadow-sm flex flex-col justify-between">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-[#F3F4ED] p-2.5 rounded-lg text-[var(--color-brand-dark)]">
                <TrendingUp size={20} />
              </div>
              <span className="text-sm font-semibold text-[var(--color-status-success)]">+4.3%</span>
            </div>
            <div className="text-2xl font-bold text-[var(--color-sys-text-primary)]">23%</div>
            <p className="text-sm text-[var(--color-sys-text-secondary)] mt-1">Sales Growth</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-xl border-none shadow-sm mb-6 flex items-center gap-3">
         <span className="text-sm text-gray-500 font-medium whitespace-nowrap">Filter by Product:</span>
         <div className="w-48">
            <Select options={[{label: 'All Products', value: 'all'}]} defaultValue="all" className="bg-white" />
         </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Line Chart */}
        <Card className="rounded-xl border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-md text-[var(--color-sys-text-primary)] font-semibold">Weekly Sales: Target vs Actual</CardTitle>
          </CardHeader>
          <CardContent className="pb-8">
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                  <YAxis axisLine={false} tickLine={true} tick={{ fontSize: 12, fill: '#64748B' }} tickFormatter={(val) => Math.floor(val)} />
                  <Tooltip cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Line type="monotone" dataKey="target" name="Target" stroke="#CDAD7D" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4, fill: '#CDAD7D' }} />
                  <Line type="monotone" dataKey="actual" name="Actual" stroke="#463426" strokeWidth={2} dot={{ r: 4, fill: '#463426' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="rounded-xl border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-md text-[var(--color-sys-text-primary)] font-semibold">Sales by Category</CardTitle>
          </CardHeader>
          <CardContent className="pb-8 flex items-center justify-center relative">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={true}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}

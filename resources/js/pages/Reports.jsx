import React from 'react';
import AppLayout from '@/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { Download, FileSpreadsheet, FileText, Printer, DollarSign, ShoppingCart, Users, FileBarChart } from 'lucide-react';

export default function Reports({ auth }) {
  const transactions = [
    { id: '#ORD-1045', date: '26-Feb-2026', customer: 'John Smith', type: 'Retail', orderType: 'Delivery', items: 3, amount: 'Tzs 145,000', status: 'completed', payment: 'Paid' },
    { id: '#ORD-1044', date: '25-Feb-2026', customer: 'Sarah Johnson', type: 'Wholesale', orderType: 'Pickup', items: 12, amount: 'Tzs 850,000', status: 'pending', payment: 'Pending' },
    { id: '#ORD-1043', date: '25-Feb-2026', customer: 'Mike Davis', type: 'Retail', orderType: 'Delivery', items: 1, amount: 'Tzs 35,000', status: 'completed', payment: 'Paid' },
    { id: '#ORD-1042', date: '24-Feb-2026', customer: 'Amani Hotel', type: 'Wholesale', orderType: 'Delivery', items: 45, amount: 'Tzs 2,100,000', status: 'completed', payment: 'Paid' },
  ];

  const columns = [
    { header: 'Order ID', cell: (row) => <span className="font-medium">{row.id}</span> },
    { header: 'Date', accessorKey: 'date' },
    { header: 'Customer', accessorKey: 'customer' },
    { header: 'Type', accessorKey: 'type' },
    { header: 'Order Type', accessorKey: 'orderType' },
    { header: 'Items', accessorKey: 'items' },
    { header: 'Amount', cell: (row) => <span className="font-semibold">{row.amount}</span> },
    { header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
    { header: 'Payment', cell: (row) => (
      <span className={`text-sm font-medium ${row.payment === 'Paid' ? 'text-[var(--color-status-success)]' : 'text-[var(--color-status-danger)]'}`}>
        {row.payment}
      </span>
    ) },
  ];

  return (
    <AppLayout user={auth?.user}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-sys-text-primary)] tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-[var(--color-sys-text-secondary)] mt-1">Generate and export custom reports</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0">
          <Button variant="outline" className="flex items-center gap-2 bg-white">
            <Download size={16} /> CSV
          </Button>
          <Button variant="outline" className="flex items-center gap-2 bg-white">
            <FileSpreadsheet size={16} /> Excel
          </Button>
          <Button variant="outline" className="flex items-center gap-2 bg-white">
            <FileText size={16} /> PDF
          </Button>
          <Button variant="primary" className="flex items-center gap-2">
            <Printer size={16} /> Print
          </Button>
        </div>
      </div>

      {/* Filters Row */}
      <Card className="rounded-xl border-none shadow-sm mb-6">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4 text-[var(--color-sys-text-primary)] font-medium">
            <FilterIcon /> Report Filters
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="text-xs text-[var(--color-sys-text-secondary)] font-medium mb-1 block">Date From</label>
              <Input type="date" defaultValue="2026-02-01" className="bg-white" />
            </div>
            <div>
              <label className="text-xs text-[var(--color-sys-text-secondary)] font-medium mb-1 block">Date To</label>
              <Input type="date" defaultValue="2026-02-26" className="bg-white" />
            </div>
            <div>
              <label className="text-xs text-[var(--color-sys-text-secondary)] font-medium mb-1 block">Customer Type</label>
              <Select options={[{label: 'All Types', value: 'all'}]} defaultValue="all" className="bg-white" />
            </div>
            <div>
              <label className="text-xs text-[var(--color-sys-text-secondary)] font-medium mb-1 block">Payment Status</label>
              <Select options={[{label: 'All Status', value: 'all'}]} defaultValue="all" className="bg-white" />
            </div>
            <div>
              <label className="text-xs text-[var(--color-sys-text-secondary)] font-medium mb-1 block">Report Type</label>
              <Select options={[{label: 'All Transactions', value: 'all'}]} defaultValue="all" className="bg-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card className="rounded-xl border-none shadow-sm flex flex-col justify-between">
          <CardContent className="p-6">
            <div className="bg-[#F3F4ED] p-3 inline-block rounded-xl text-[var(--color-sys-text-secondary)] mb-4">
              <DollarSign size={22} />
            </div>
            <div className="text-2xl font-bold text-[var(--color-sys-text-primary)]">Tzs 8,338,980</div>
            <p className="text-sm text-[var(--color-sys-text-secondary)] mt-1">Total Revenue</p>
            <div className="flex gap-2 text-xs mt-3 font-medium">
              <span className="text-[var(--color-status-success)]">Paid: Tzs 4,043,520</span>
              <span className="text-[var(--color-status-danger)]">Pending: Tzs 4,295,460</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-none shadow-sm flex flex-col justify-between">
          <CardContent className="p-6">
            <div className="bg-[#F3F4ED] p-3 inline-block rounded-xl text-[var(--color-sys-text-secondary)] mb-4">
              <ShoppingCart size={22} />
            </div>
            <div className="text-2xl font-bold text-[var(--color-sys-text-primary)]">15</div>
            <p className="text-sm text-[var(--color-sys-text-secondary)] mt-1">Total Orders</p>
            <div className="flex gap-2 text-xs mt-3 font-medium">
              <span className="text-[var(--color-status-success)]">Paid: 10</span>
              <span className="text-[var(--color-status-danger)]">Pending: 5</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-none shadow-sm flex flex-col justify-between">
          <CardContent className="p-6">
            <div className="bg-[#F3F4ED] p-3 inline-block rounded-xl text-[var(--color-sys-text-secondary)] mb-4">
              <Users size={22} />
            </div>
            <div className="text-2xl font-bold text-[var(--color-sys-text-primary)]">15</div>
            <p className="text-sm text-[var(--color-sys-text-secondary)] mt-1">Unique Customers</p>
            <div className="text-xs text-gray-400 mt-3 border-t border-transparent">
               In selected period
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-none shadow-sm flex flex-col justify-between">
          <CardContent className="p-6">
            <div className="bg-[#F3F4ED] p-3 inline-block rounded-xl text-[var(--color-sys-text-secondary)] mb-4">
              <FileBarChart size={22} />
            </div>
            <div className="text-2xl font-bold text-[var(--color-sys-text-primary)]">Tzs 555,932</div>
            <p className="text-sm text-[var(--color-sys-text-secondary)] mt-1">Avg. Order Value</p>
            <div className="text-xs text-gray-400 mt-3 border-t border-transparent">
               Per transaction
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Table */}
      <Card className="rounded-xl border-none shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[var(--color-sys-border)] bg-[#F3F1ED] rounded-t-xl">
           <h3 className="font-semibold text-base text-[var(--color-sys-text-primary)]">Report Results</h3>
           <p className="text-sm text-[var(--color-sys-text-secondary)] text-xs mt-1">Showing 15 transactions from 2026-02-01 to 2026-02-26</p>
        </div>
        <DataTable columns={columns} data={transactions} />
      </Card>
      
    </AppLayout>
  );
}

const FilterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

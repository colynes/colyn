import React, { useState } from 'react';
import AppLayout from '@/layouts/AppLayout';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { Plus, Search, Calendar, X } from 'lucide-react';

export default function Subscriptions({ auth }) {
  const [isModalOpen, setIsModalOpen] = useState(true); // Open by default to match screenshot
  const [selectedDays, setSelectedDays] = useState(['Mon', 'Wed', 'Fri']); 

  const subscriptions = [
    { id: 1, customer: 'John Smith', phone: '+255 712 345 678', frequency: 'Daily', nextDelivery: '2026-02-28', status: 'Active' },
    { id: 2, customer: 'Sarah Johnson', phone: '+255 713 456 789', frequency: 'Weekly', nextDelivery: '2026-03-01', status: 'Active' },
    { id: 3, customer: 'Mike Davis', phone: '+255 714 567 890', frequency: 'Bi-Weekly', nextDelivery: '2026-02-27', status: 'Active' },
    { id: 4, customer: 'Tom Wilson', phone: '+255 717 890 123', frequency: 'Monthly', nextDelivery: '2026-02-27', status: 'Active' },
  ];

  const columns = [
    { 
      header: 'Customer', 
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-[var(--color-sys-text-primary)]">{row.customer}</span>
          <span className="text-xs text-[var(--color-sys-text-secondary)]">{row.phone}</span>
        </div>
      ) 
    },
    { header: 'Frequency', accessorKey: 'frequency' },
    { header: 'Next Delivery', accessorKey: 'nextDelivery' },
    { header: 'Status', cell: (row) => <StatusBadge status={row.status.toLowerCase()} /> },
  ];

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const toggleDay = (day) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  return (
    <AppLayout user={auth?.user}>
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-sys-text-primary)] tracking-tight">Subscriptions</h1>
          <p className="text-sm text-[var(--color-sys-text-secondary)] mt-1">Manage customer subscriptions and delivery schedules</p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus size={16} /> New Subscription
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center mb-4">
        <div className="relative w-64">
           <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
           <Input placeholder="Search subscriptions..." className="pl-10 bg-[#EFEEE7] border-none" />
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="bg-white p-2 px-3"><Calendar size={18} className="text-gray-500" /></Button>
        </div>
      </div>

      {/* Background Table */}
      <Card className="rounded-xl border-none shadow-sm overflow-hidden">
        <DataTable columns={columns} data={subscriptions} />
      </Card>

      {/* Create New Subscription Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-5 border-b border-[var(--color-sys-border)] flex justify-between items-center bg-white">
              <h2 className="text-xl font-bold text-[var(--color-sys-text-primary)]">Create New Subscription</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="text-sm text-[var(--color-sys-text-primary)] font-medium mb-1.5 block">Customer Name</label>
                  <Input placeholder="Enter customer name" />
                </div>
                <div>
                  <label className="text-sm text-[var(--color-sys-text-primary)] font-medium mb-1.5 block">Phone</label>
                  <Input placeholder="+255 712 345 678" />
                </div>
                <div>
                  <label className="text-sm text-[var(--color-sys-text-primary)] font-medium mb-1.5 block">Email</label>
                  <Input type="email" placeholder="customer@email.com" />
                </div>
                <div>
                  <label className="text-sm text-[var(--color-sys-text-primary)] font-medium mb-1.5 block">Frequency</label>
                  <Select options={[
                    {label: 'Daily', value: 'daily'},
                    {label: 'Weekly', value: 'weekly'},
                    {label: 'Monthly', value: 'monthly'}
                  ]} defaultValue="daily" />
                </div>
              </div>

              <div className="mb-5">
                <label className="text-sm text-[var(--color-sys-text-primary)] font-medium mb-2.5 block">Delivery Days</label>
                <div className="grid grid-cols-4 gap-2">
                  {days.map(day => (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      type="button"
                      className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                        selectedDays.includes(day)
                          ? 'border-[var(--color-brand-dark)] text-[var(--color-brand-dark)] bg-[#F8F6F4]'
                          : 'border-[var(--color-sys-border)] text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                  <div className="hidden grid-cols-4 col-span-1"></div>
                </div>
              </div>

              <div className="mb-5 flex justify-between items-center border-t border-[var(--color-sys-border)] pt-5">
                <span className="text-sm text-[var(--color-sys-text-primary)] font-medium">Products</span>
                <button type="button" className="text-sm font-bold text-[var(--color-sys-text-primary)] hover:underline flex items-center">
                  + Add Product
                </button>
              </div>

              <div className="mb-2">
                <label className="text-sm text-[var(--color-sys-text-primary)] font-medium mb-1.5 block">Start Date</label>
                <Input type="date" className="text-gray-500" />
              </div>

            </div>

            <div className="px-6 py-5 bg-white border-t border-[var(--color-sys-border)] flex gap-4">
              <Button variant="outline" className="flex-1 py-2.5" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" className="flex-1 py-2.5">
                Create Subscription
              </Button>
            </div>

          </div>
        </div>
      )}

    </AppLayout>
  );
}

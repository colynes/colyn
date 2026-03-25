import React, { useState } from 'react';
import AppLayout from '@/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Plus, Search, Edit2, Trash2, Key, Users as UsersIcon, ShieldCheck, UserCheck, UserPlus } from 'lucide-react';

const USERS = [
  { id: 1, name: 'Admin User', role: 'Administrator', email: 'admin@amanibrew.com', status: 'Active', login: '2026-02-26 09:30', created: '2025-01-01', initials: 'AU', roleColor: 'bg-red-50 text-red-600', statusColor: 'bg-green-100 text-green-700' },
  { id: 2, name: 'John Manager', role: 'Manager', email: 'john.manager@amanibrew.com', status: 'Active', login: '2026-02-26 08:15', created: '2025-06-15', initials: 'JM', roleColor: 'bg-blue-50 text-blue-600', statusColor: 'bg-green-100 text-green-700' },
  { id: 3, name: 'Sarah Staff', role: 'Staff', email: 'sarah.staff@amanibrew.com', status: 'Active', login: '2026-02-25 16:45', created: '2025-09-01', initials: 'SS', roleColor: 'bg-green-50 text-green-600', statusColor: 'bg-green-100 text-green-700' },
  { id: 4, name: 'Mike Employee', role: 'Staff', email: 'mike.employee@amanibrew.com', status: 'Active', login: '2026-02-26 07:20', created: '2025-11-10', initials: 'ME', roleColor: 'bg-green-50 text-green-600', statusColor: 'bg-green-100 text-green-700' },
];

export default function Users({ auth }) {
  const [search, setSearch] = useState('');

  const filtered = USERS.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout user={auth?.user}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-sys-text-primary)]">User Management</h1>
          <p className="text-sm text-[var(--color-sys-text-secondary)] mt-0.5">Manage system users and permissions</p>
        </div>
        <Button variant="primary" className="flex items-center gap-2">
          <Plus size={16} /> Add User
        </Button>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Active Users', value: 4, icon: UsersIcon, color: 'text-gray-400' },
          { label: 'Administrators', value: 1, icon: ShieldCheck, color: 'text-red-400' },
          { label: 'Managers', value: 1, icon: UserCheck, color: 'text-blue-400' },
          { label: 'Staff Members', value: 3, icon: UserPlus, color: 'text-green-400' },
        ].map((stat, i) => (
          <Card key={i} className="rounded-2xl border-none shadow-sm h-full">
            <CardContent className="p-6">
               <div className="flex flex-col h-full justify-between">
                 <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-[#F5F2EF] mb-4 ${stat.color}`}>
                   <stat.icon size={22} />
                 </div>
                 <div>
                    <h3 className="text-3xl font-bold text-[var(--color-sys-text-primary)]">{stat.value}</h3>
                    <p className="text-xs font-medium text-[var(--color-sys-text-secondary)] uppercase tracking-wider">{stat.label}</p>
                 </div>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-xl">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input 
            placeholder="Search users by name or email..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-white" 
          />
        </div>
        <div className="flex items-center gap-2 px-3 bg-white border border-[var(--color-sys-border)] rounded-lg">
           <ShieldCheck size={16} className="text-gray-400" />
           <select className="bg-transparent text-sm text-[var(--color-sys-text-secondary)] outline-none border-none pr-6 cursor-pointer">
              <option>All Roles</option>
              <option>Administrator</option>
              <option>Manager</option>
              <option>Staff</option>
           </select>
        </div>
      </div>

      <Card className="rounded-2xl border-none shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F5F2EF]/50 border-b border-[var(--color-sys-border)] uppercase text-[10px] font-bold tracking-wider text-[var(--color-sys-text-secondary)]">
              {['User', 'Email', 'Role', 'Status', 'Last Login', 'Created', 'Actions'].map(h => (
                <th key={h} className="text-left px-6 py-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => (
              <tr key={u.id} className={`border-b border-[var(--color-sys-border)] hover:bg-[#F5F2EF]/20 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}>
                <td className="px-6 py-5">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400 uppercase tracking-tighter shadow-sm">{u.initials}</div>
                     <div>
                       <p className="font-bold text-[var(--color-sys-text-primary)]">{u.name}</p>
                       <p className="text-[10px] text-gray-400 font-medium tracking-tight">USR-{String(u.id).padStart(3, '0')}</p>
                     </div>
                   </div>
                </td>
                <td className="px-6 py-5">
                   <div className="flex items-center gap-2 text-[var(--color-sys-text-secondary)]">
                      <div className="w-5 h-5 flex items-center justify-center text-gray-400 border border-gray-200 rounded p-1"><ShieldCheck size={12} /></div>
                      <span className="text-xs font-medium">{u.email}</span>
                   </div>
                </td>
                <td className="px-6 py-5">
                   <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.roleColor}`}>{u.role}</span>
                </td>
                <td className="px-6 py-5">
                   <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.statusColor}`}>{u.status}</span>
                </td>
                <td className="px-6 py-5 text-[var(--color-sys-text-secondary)] font-medium">{u.login}</td>
                <td className="px-6 py-5 text-[var(--color-sys-text-secondary)] font-medium">{u.created}</td>
                <td className="px-6 py-5">
                   <div className="flex items-center gap-3 text-gray-400">
                     <button className="hover:text-[var(--color-brand-dark)]"><Key size={16} /></button>
                     <button className="hover:text-[var(--color-brand-dark)]"><Edit2 size={16} /></button>
                     <button className="hover:text-red-500"><Trash2 size={16} /></button>
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

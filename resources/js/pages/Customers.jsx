import React, { useMemo, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import BackofficePagination from '@/components/backoffice/BackofficePagination';
import BackofficePerPageControl from '@/components/backoffice/BackofficePerPageControl';
import { Card, CardContent } from '@/components/ui/Card';
import { Eye, Filter, Search, ShoppingCart, UsersRound, X } from 'lucide-react';

function CustomerViewModal({ customer, onClose }) {
  if (!customer) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-6">
      <div className="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#eadcca] px-6 py-5">
          <div>
            <h2 className="text-[1.9rem] font-semibold tracking-[-0.03em] text-[#3a2513]">Customer Details</h2>
            <p className="mt-1 text-base text-[#76593d]">{customer.full_name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#6d5036] transition hover:bg-[#f3ede5]"
            aria-label="Close customer details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-4 px-6 py-6 md:grid-cols-2">
          <div className="rounded-2xl bg-[#f7f1e8] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c6c4a]">Email</p>
            <p className="mt-2 text-lg font-semibold text-[#3a2513]">{customer.email || 'No email saved'}</p>
          </div>
          <div className="rounded-2xl bg-[#f7f1e8] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c6c4a]">Phone</p>
            <p className="mt-2 text-lg font-semibold text-[#3a2513]">{customer.phone || 'No phone saved'}</p>
          </div>
          <div className="rounded-2xl bg-[#f7f1e8] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c6c4a]">Orders</p>
            <p className="mt-2 text-lg font-semibold text-[#3a2513]">{customer.orders_count}</p>
          </div>
          <div className="rounded-2xl bg-[#f7f1e8] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c6c4a]">Status</p>
            <p className="mt-2">
              <span className="inline-flex rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-700">
                {customer.status || 'Active'}
              </span>
            </p>
          </div>
          <div className="rounded-2xl bg-[#f7f1e8] p-4 md:col-span-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c6c4a]">Address</p>
            <p className="mt-2 text-lg font-semibold text-[#3a2513]">{customer.address || 'No saved address'}</p>
          </div>
          <div className="rounded-2xl bg-[#f7f1e8] p-4 md:col-span-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c6c4a]">City</p>
            <p className="mt-2 text-lg font-semibold text-[#3a2513]">{customer.city || 'No city saved'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Customers({ auth, customers, filters = {}, summary = {}, perPageOptions = [50, 100, 250, 500] }) {
  const rows = customers?.data || [];
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const hasFilters = useMemo(
    () => Boolean((filters.search || '').trim() || (filters.status || '').trim()),
    [filters.search, filters.status],
  );

  return (
    <AppLayout user={auth?.user}>
      <CustomerViewModal customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} />

      <div className="space-y-8">
        <div>
          <h1 className="text-[2.45rem] font-semibold tracking-[-0.04em] text-[#3a2513]">Customers Management</h1>
          <p className="mt-2 text-[0.95rem] text-[#73563a]">Track and manage customer information</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Card className="rounded-[1.4rem] border border-[#e0d1bf] bg-white shadow-none">
            <CardContent className="p-6">
              <div className="icon-surface-sm bg-[#f3ecdf] text-[#4f3118]">
                <UsersRound className="h-7 w-7" />
              </div>
              <p className="mt-5 text-[2.2rem] font-black text-[#352314]">{summary.total_customers || 0}</p>
              <p className="mt-1 text-[1rem] text-[#73563a]">Total Customers</p>
            </CardContent>
          </Card>

          <Card className="rounded-[1.4rem] border border-[#e0d1bf] bg-white shadow-none">
            <CardContent className="p-6">
              <div className="icon-surface-sm bg-[#f7efe2] text-[#4f3118]">
                <ShoppingCart className="h-7 w-7" />
              </div>
              <p className="mt-5 text-[2.2rem] font-black text-[#352314]">{summary.total_orders || 0}</p>
              <p className="mt-1 text-[1rem] text-[#73563a]">Total Orders</p>
            </CardContent>
          </Card>
        </div>

        <form method="get" action="/customers" className="flex items-center gap-4 overflow-x-auto">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#866748]" strokeWidth={2} />
            <input
              type="text"
              name="search"
              defaultValue={filters.search || ''}
              placeholder="Search customers..."
              className="h-14 w-full rounded-[1.05rem] border border-[#dcccba] bg-white pl-14 pr-4 text-[1rem] text-[#3a2513] outline-none transition placeholder:text-[#b09983] focus:border-[#b69066]"
            />
          </div>

          <button
            type="submit"
            className="flex h-14 w-[52px] shrink-0 items-center justify-center rounded-[1.05rem] border border-[#dcccba] bg-white text-[#7a5b3d] transition hover:bg-[#faf6f1]"
            aria-label="Apply customer filters"
          >
            <Filter className="h-6 w-6" strokeWidth={2} />
          </button>

          <select
            name="status"
            defaultValue={filters.status || ''}
            className="h-14 w-[165px] shrink-0 rounded-[1.05rem] border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
          >
            <option value="">All</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          <BackofficePerPageControl
            options={perPageOptions}
            value={filters.per_page || perPageOptions[0]}
            onChange={(event) => router.get('/customers', {
              search: filters.search || '',
              status: filters.status || '',
              per_page: event.target.value,
              page: 1,
            }, { preserveScroll: true, preserveState: true })}
          />
        </form>

        <Card className="overflow-hidden rounded-[1.35rem] border border-[#e0d1bf] bg-white shadow-none">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-[#ede1cf]">
                  <tr>
                    {['Customer', 'Email', 'Phone', 'Address', 'City', 'Orders', 'Status', 'Actions'].map((header) => (
                      <th key={header} className="px-8 py-5 text-[1rem] font-semibold text-[#2f2115]">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length > 0 ? rows.map((customer, index) => (
                    <tr
                      key={customer.id}
                      className={`${index !== rows.length - 1 ? 'border-b border-[#eadcca]' : ''} bg-white`}
                    >
                      <td className="px-8 py-7 text-[1.05rem] font-medium text-[#352314]">{customer.full_name}</td>
                      <td className="px-8 py-7 text-[1.05rem] text-[#5f4328]">{customer.email || 'No email'}</td>
                      <td className="px-8 py-7 text-[1.05rem] text-[#5f4328]">{customer.phone || 'No phone'}</td>
                      <td className="px-8 py-7 text-[1.05rem] text-[#5f4328]">{customer.address || 'No saved address'}</td>
                      <td className="px-8 py-7 text-[1.05rem] text-[#5f4328]">{customer.city || 'N/A'}</td>
                      <td className="px-8 py-7 text-[1.05rem] font-medium text-[#352314]">{customer.orders_count}</td>
                      <td className="px-8 py-7">
                        <span className="inline-flex rounded-full bg-emerald-100 px-4 py-2 text-[1rem] font-medium text-emerald-700">
                          {customer.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-8 py-7">
                        <div className="flex items-center gap-5 text-[#4f3118]">
                          <button
                            type="button"
                            onClick={() => setSelectedCustomer(customer)}
                            className="transition hover:text-[#2f1c0d]"
                            aria-label={`View ${customer.full_name}`}
                          >
                            <Eye className="h-5 w-5" strokeWidth={2} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={8} className="px-8 py-12 text-center">
                        <p className="text-lg font-medium text-[#4d3218]">No customers found.</p>
                        <p className="mt-2 text-sm text-[#7a5c3e]">Try another search or status filter.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {hasFilters ? (
          <div className="flex justify-end">
            <Link href="/customers" className="text-sm font-semibold text-[#4f3118]">
              Clear filters
            </Link>
          </div>
        ) : null}

        <BackofficePagination
          paginator={customers}
          path="/customers"
          query={{
            search: filters.search || '',
            status: filters.status || '',
            per_page: filters.per_page || perPageOptions[0],
          }}
        />
      </div>
    </AppLayout>
  );
}

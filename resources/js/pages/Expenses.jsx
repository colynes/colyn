import React, { useEffect, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import BackofficePagination from '@/components/backoffice/BackofficePagination';
import BackofficePerPageControl from '@/components/backoffice/BackofficePerPageControl';
import { Card, CardContent } from '@/components/ui/Card';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Pencil, Plus, Trash2, X } from 'lucide-react';

const money = (value) => new Intl.NumberFormat('en-TZ', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(value || 0);

function ExpenseModal({ expense, onClose }) {
  const form = useForm({
    expense_date: expense?.date || new Date().toISOString().slice(0, 10),
    description: expense?.description || '',
    amount: expense?.amount || '',
  });

  useEffect(() => {
    form.setData({
      expense_date: expense?.date || new Date().toISOString().slice(0, 10),
      description: expense?.description || '',
      amount: expense?.amount || '',
    });
  }, [expense]);

  if (!expense) {
    return null;
  }

  const submit = (event) => {
    event.preventDefault();

    const options = {
      preserveScroll: true,
      onSuccess: () => onClose(),
    };

    if (expense.id) {
      form.put(`/expenses/${expense.id}`, options);
      return;
    }

    form.post('/expenses', options);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-6">
      <div className="my-auto max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[1.75rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#eadcca] px-6 py-5">
          <div>
            <h2 className="text-[1.9rem] font-semibold tracking-[-0.03em] text-[#3a2513]">
              {expense.id ? 'Edit Expense' : 'Create Expense'}
            </h2>
            <p className="mt-1 text-base text-[#76593d]">Fill in the expense details below.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#6d5036] transition hover:bg-[#f3ede5]"
            aria-label="Close expense modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 px-6 py-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-[#3a2513]">Date</label>
            <input
              type="date"
              value={form.data.expense_date}
              onChange={(e) => form.setData('expense_date', e.target.value)}
              className="h-12 w-full rounded-xl border border-[var(--color-sys-border)] bg-white px-4 text-sm outline-none"
            />
            {form.errors.expense_date ? <p className="mt-2 text-xs text-red-500">{form.errors.expense_date}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#3a2513]">Description</label>
            <input
              type="text"
              value={form.data.description}
              onChange={(e) => form.setData('description', e.target.value)}
              placeholder="Enter expense description"
              className="h-12 w-full rounded-xl border border-[var(--color-sys-border)] bg-white px-4 text-sm outline-none"
            />
            {form.errors.description ? <p className="mt-2 text-xs text-red-500">{form.errors.description}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#3a2513]">Amount</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.data.amount}
              onChange={(e) => form.setData('amount', e.target.value)}
              placeholder="Enter amount"
              className="h-12 w-full rounded-xl border border-[var(--color-sys-border)] bg-white px-4 text-sm outline-none"
            />
            {form.errors.amount ? <p className="mt-2 text-xs text-red-500">{form.errors.amount}</p> : null}
          </div>

          <div className="flex gap-3 pt-2">
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
              {form.processing ? 'Saving...' : expense.id ? 'Save Changes' : 'Create Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Expenses({ auth, expenses = [], summary = {}, filters = {}, perPageOptions = [50, 100, 250, 500] }) {
  const [activeExpense, setActiveExpense] = useState(null);
  const [deletingExpense, setDeletingExpense] = useState(null);
  const rows = expenses?.data || [];

  const deleteExpense = (expense) => {
    router.delete(`/expenses/${expense.id}`, {
      preserveScroll: true,
    });
  };

  return (
    <AppLayout user={auth?.user}>
      <ExpenseModal expense={activeExpense} onClose={() => setActiveExpense(null)} />
      <ConfirmModal
        isOpen={Boolean(deletingExpense)}
        onClose={() => setDeletingExpense(null)}
        onConfirm={() => deletingExpense ? deleteExpense(deletingExpense) : null}
        title="Delete Expense"
        message={deletingExpense ? `You are deleting the expense "${deletingExpense.description}". This action cannot be undone.` : ''}
        confirmText="Delete"
        type="danger"
      />

      <div className="space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[2.45rem] font-semibold tracking-[-0.04em] text-[#3a2513]">Expenses</h1>
            <p className="mt-2 text-[0.95rem] text-[#73563a]">Track operating expenses with clear ownership and audit history</p>
          </div>

          <button
            type="button"
            onClick={() => setActiveExpense({})}
            className="inline-flex items-center gap-3 self-start rounded-[1.05rem] bg-[#4f3118] px-6 py-3.5 text-[1.05rem] font-semibold text-white transition hover:bg-[#402612]"
          >
            <Plus className="h-5 w-5" strokeWidth={2.25} />
            Create Expense
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Card className="rounded-[1.4rem] border border-[#e0d1bf] bg-white shadow-none">
            <CardContent className="p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8c6c4a]">Total Expenses</p>
              <p className="mt-3 text-[2.2rem] font-black text-[#352314]">Tzs {money(summary.total)}</p>
            </CardContent>
          </Card>
          <Card className="rounded-[1.4rem] border border-[#e0d1bf] bg-white shadow-none">
            <CardContent className="p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8c6c4a]">Entries</p>
              <p className="mt-3 text-[2.2rem] font-black text-[#352314]">{summary.count || 0}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <BackofficePerPageControl
            options={perPageOptions}
            value={filters.per_page || perPageOptions[0]}
            onChange={(event) => router.get('/expenses', {
              per_page: event.target.value,
              page: 1,
            }, { preserveScroll: true, preserveState: true })}
          />
        </div>

        <Card className="overflow-hidden rounded-[1.35rem] border border-[#e0d1bf] bg-white shadow-none">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-[#4f3118]">
                  <tr>
                    {['Date', 'Description', 'Amount', 'Created By', 'Last Edited By', 'Actions'].map((header) => (
                      <th key={header} className="px-8 py-5 text-[1rem] font-semibold text-white">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length > 0 ? rows.map((expense, index) => (
                    <tr key={expense.id} className={`${index !== rows.length - 1 ? 'border-b border-[#eadcca]' : ''} bg-white`}>
                      <td className="px-8 py-6 text-[1.05rem] text-[#352314]">{expense.date}</td>
                      <td className="px-8 py-6 text-[1.05rem] font-medium text-[#352314]">{expense.description}</td>
                      <td className="px-8 py-6 text-[1.05rem] font-semibold text-[#352314]">{money(expense.amount)}</td>
                      <td className="px-8 py-6">
                        <span className="inline-flex rounded-full bg-[#f2e5d3] px-4 py-1.5 text-sm font-semibold text-[#4f3118]">
                          {expense.created_by}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="inline-flex rounded-full bg-[#efe5d8] px-4 py-1.5 text-sm font-semibold text-[#6d5036]">
                          {expense.last_edited_by || 'Never edited'}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3 text-[#4f3118]">
                          <button
                            type="button"
                            onClick={() => setActiveExpense(expense)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#f6ecdf] transition hover:bg-[#ecdcc7]"
                            aria-label={`Edit ${expense.description}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingExpense(expense)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#fbe8e5] text-[#b54134] transition hover:bg-[#f7d7d1]"
                            aria-label={`Delete ${expense.description}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="px-8 py-12 text-center">
                        <p className="text-lg font-medium text-[#4d3218]">No expenses recorded.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-[#2f2115]">
                    <td className="px-8 py-5 text-right text-[1.15rem] font-semibold text-white" colSpan={2}>Grand Total:</td>
                    <td className="px-8 py-5 text-[1.15rem] font-semibold text-white">Tzs {money(summary.total)}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        <BackofficePagination
          paginator={expenses}
          path="/expenses"
          query={{
            per_page: filters.per_page || perPageOptions[0],
          }}
        />
      </div>
    </AppLayout>
  );
}

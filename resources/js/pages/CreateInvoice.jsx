import React, { useMemo } from 'react';
import { Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Plus, Trash2 } from 'lucide-react';

const money = (value) => `Tsh ${new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 }).format(value || 0)}`;

function emptyItem() {
  return {
    product_id: '',
    description: '',
    quantity: '1',
    unit_price: '0',
    subtotal: '0',
  };
}

export default function CreateInvoice({ auth, customers = [], products = [], defaults = {}, mode = 'create', invoice = null }) {
  const isEditing = mode === 'edit' && Boolean(invoice?.id);

  const form = useForm({
    order_id: invoice?.order_id ? String(invoice.order_id) : '',
    customer_id: invoice?.customer_id ? String(invoice.customer_id) : '',
    invoice_number: invoice?.invoice_number || defaults.invoice_number || '',
    invoice_date: invoice?.invoice_date || defaults.invoice_date || '',
    due_date: invoice?.due_date || defaults.due_date || '',
    tin_number: invoice?.tin_number || '',
    customer_name: invoice?.customer_name || '',
    customer_contact: invoice?.customer_contact || '',
    bill_to_address: invoice?.bill_to_address || '',
    deliver_to_name: invoice?.deliver_to_name || '',
    deliver_to_address: invoice?.deliver_to_address || '',
    customer_city: invoice?.customer_city || '',
    subtotal: String(invoice?.subtotal ?? 0),
    tax: String(invoice?.tax ?? 0),
    discount: String(invoice?.discount ?? 0),
    total: String(invoice?.total ?? 0),
    currency: invoice?.currency || defaults.currency || 'Tanzanian Shillings',
    bank_name: invoice?.bank_name || defaults.bank_name || '',
    account_name: invoice?.account_name || defaults.account_name || '',
    account_number: invoice?.account_number || defaults.account_number || '',
    status: invoice?.status || 'pending',
    payment_method: invoice?.payment_method || 'bank',
    transaction_id: invoice?.transaction_id || '',
    notes: invoice?.notes || '',
    items: (invoice?.items || []).length > 0
      ? invoice.items.map((item) => ({
          product_id: item.product_id ? String(item.product_id) : '',
          description: item.description || '',
          quantity: String(item.quantity ?? 1),
          unit_price: String(item.unit_price ?? 0),
          subtotal: String(item.subtotal ?? 0),
        }))
      : [emptyItem()],
  });

  const recalculateTotals = (items, tax = form.data.tax, discount = form.data.discount) => {
    const subtotal = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    const total = subtotal + Number(tax || 0) - Number(discount || 0);

    form.setData({
      ...form.data,
      items,
      subtotal: String(subtotal),
      total: String(Math.max(total, 0)),
    });
  };

  const selectCustomer = (customerId) => {
    const customer = customers.find((entry) => String(entry.id) === String(customerId));

    form.setData({
      ...form.data,
      customer_id: customerId,
      customer_name: customer?.full_name || form.data.customer_name,
      customer_contact: customer?.phone || form.data.customer_contact,
      bill_to_address: customer?.address || form.data.bill_to_address,
      deliver_to_name: customer?.full_name || form.data.deliver_to_name,
      deliver_to_address: customer?.address || form.data.deliver_to_address,
    });
  };

  const selectFatClient = (customerId) => {
    const customer = customers.find((entry) => String(entry.id) === String(customerId));

    if (!customer) {
      form.setData({
        ...form.data,
        customer_id: customerId,
        order_id: '',
      });
      return;
    }

    form.setData({
      ...form.data,
      customer_id: String(customer.id),
      order_id: '',
      customer_name: customer.full_name || form.data.customer_name,
      customer_contact: customer.phone || form.data.customer_contact,
      bill_to_address: customer.address || form.data.bill_to_address,
      deliver_to_name: customer.full_name || form.data.deliver_to_name,
      deliver_to_address: customer.address || form.data.deliver_to_address,
    });
  };

  const updateItem = (index, field, value) => {
    const nextItems = [...form.data.items];
    const nextRow = { ...nextItems[index], [field]: value };

    if (field === 'product_id') {
      const selectedProduct = products.find((product) => String(product.id) === String(value));
      nextRow.description = selectedProduct?.name || nextRow.description;
      nextRow.unit_price = String(selectedProduct?.price ?? nextRow.unit_price);
    }

    const quantity = Number(nextRow.quantity || 0);
    const unitPrice = Number(nextRow.unit_price || 0);
    nextRow.subtotal = String(quantity * unitPrice);
    nextItems[index] = nextRow;

    recalculateTotals(nextItems);
  };

  const addItem = () => {
    recalculateTotals([...form.data.items, emptyItem()]);
  };

  const removeItem = (index) => {
    const nextItems = form.data.items.length === 1
      ? [emptyItem()]
      : form.data.items.filter((_, rowIndex) => rowIndex !== index);

    recalculateTotals(nextItems);
  };

  const summary = useMemo(() => ({
    subtotal: Number(form.data.subtotal || 0),
    tax: Number(form.data.tax || 0),
    discount: Number(form.data.discount || 0),
    total: Number(form.data.total || 0),
  }), [form.data.subtotal, form.data.tax, form.data.discount, form.data.total]);

  const firstError = useMemo(() => {
    const messages = Object.values(form.errors || {});
    return messages.length ? String(messages[0]) : '';
  }, [form.errors]);

  const submit = (event) => {
    event.preventDefault();

    if (isEditing) {
      form.put(`/fat-clients/billing/${invoice.id}`, {
        preserveScroll: false,
        preserveState: false,
        onSuccess: () => {
          window.location.href = '/fat-clients/billing';
        },
        onError: () => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
      });
      return;
    }

    form.post('/fat-clients/billing', {
      preserveScroll: false,
      preserveState: false,
      onSuccess: () => {
        window.location.href = '/fat-clients/billing';
      },
      onError: () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    });
  };

  return (
    <AppLayout user={auth?.user}>
      <form onSubmit={submit} className="space-y-8">
        {firstError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
            {firstError}
          </div>
        ) : null}

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[2.45rem] font-semibold tracking-[-0.04em] text-[#3a2513]">
              {isEditing ? 'Edit Invoice' : 'Create Invoice'}
            </h1>
            <p className="mt-2 text-[0.95rem] text-[#73563a]">
              {isEditing ? 'Update invoice details and line items.' : 'Capture invoice details based on the Amani Brew invoice sample.'}
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/fat-clients/billing"
              className="inline-flex items-center justify-center rounded-[1.05rem] border border-[#d9c4a9] bg-white px-6 py-3.5 text-[1rem] font-semibold text-[#4f3118]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={form.processing}
              className="inline-flex items-center justify-center rounded-[1.05rem] bg-[#4f3118] px-6 py-3.5 text-[1rem] font-semibold text-white transition hover:bg-[#402612]"
            >
              {form.processing ? 'Saving...' : isEditing ? 'Update & Close' : 'Save Invoice'}
            </button>
          </div>
        </div>

        <Card className="rounded-[1.5rem] border border-[#e0d1bf] bg-white shadow-none">
          <CardContent className="grid gap-5 p-8 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-[0.95rem] font-semibold text-[#3a2513]">Link Fat Client</label>
              <select
                value={form.data.customer_id}
                onChange={(event) => selectFatClient(event.target.value)}
                className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none focus:border-[#b69066]"
              >
                <option value="">No linked fat client</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-[0.95rem] font-semibold text-[#3a2513]">Invoice Number</label>
              <input
                type="text"
                value={form.data.invoice_number}
                onChange={(event) => form.setData('invoice_number', event.target.value)}
                className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none focus:border-[#b69066]"
              />
              {form.errors.invoice_number ? <p className="mt-2 text-xs text-red-500">{form.errors.invoice_number}</p> : null}
            </div>
            <div>
              <label className="mb-2 block text-[0.95rem] font-semibold text-[#3a2513]">TIN No</label>
              <input
                type="text"
                value={form.data.tin_number}
                onChange={(event) => form.setData('tin_number', event.target.value)}
                placeholder="157-974-097"
                className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none focus:border-[#b69066]"
              />
            </div>
            <div>
              <label className="mb-2 block text-[0.95rem] font-semibold text-[#3a2513]">Invoice Date</label>
              <input
                type="date"
                value={form.data.invoice_date}
                onChange={(event) => form.setData('invoice_date', event.target.value)}
                className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none focus:border-[#b69066]"
              />
            </div>
            <div>
              <label className="mb-2 block text-[0.95rem] font-semibold text-[#3a2513]">Due Date</label>
              <input
                type="date"
                value={form.data.due_date}
                onChange={(event) => form.setData('due_date', event.target.value)}
                className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none focus:border-[#b69066]"
              />
            </div>
            <div>
              <label className="mb-2 block text-[0.95rem] font-semibold text-[#3a2513]">Payment Status</label>
              <select
                value={form.data.status}
                onChange={(event) => form.setData('status', event.target.value)}
                className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none focus:border-[#b69066]"
              >
                {['pending', 'paid', 'overdue', 'draft', 'sent'].map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="rounded-[1.5rem] border border-[#e0d1bf] bg-white shadow-none">
            <CardContent className="space-y-5 p-8">
              <h2 className="text-[1.4rem] font-semibold text-[#3a2513]">Bill To</h2>
              <div>
                <label className="mb-2 block text-[0.95rem] font-semibold text-[#3a2513]">Customer</label>
                <select
                  value={form.data.customer_id}
                  onChange={(event) => selectCustomer(event.target.value)}
                  className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none focus:border-[#b69066]"
                >
                  <option value="">Choose customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>{customer.full_name}</option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={form.data.customer_name}
                onChange={(event) => form.setData('customer_name', event.target.value)}
                placeholder="Customer Name"
                className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none focus:border-[#b69066]"
              />
              <input
                type="text"
                value={form.data.customer_contact}
                onChange={(event) => form.setData('customer_contact', event.target.value)}
                placeholder="Customer contact"
                className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none focus:border-[#b69066]"
              />
              <textarea
                value={form.data.bill_to_address}
                onChange={(event) => form.setData('bill_to_address', event.target.value)}
                rows={4}
                placeholder="Billing address"
                className="w-full rounded-xl border border-[#dcccba] bg-white px-5 py-4 text-[1rem] text-[#3a2513] outline-none focus:border-[#b69066]"
              />
              <input
                type="text"
                value={form.data.customer_city}
                onChange={(event) => form.setData('customer_city', event.target.value)}
                placeholder="City"
                className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none focus:border-[#b69066]"
              />
            </CardContent>
          </Card>

          <Card className="rounded-[1.5rem] border border-[#e0d1bf] bg-white shadow-none">
            <CardContent className="space-y-5 p-8">
              <h2 className="text-[1.4rem] font-semibold text-[#3a2513]">Deliver To</h2>
              <input
                type="text"
                value={form.data.deliver_to_name}
                onChange={(event) => form.setData('deliver_to_name', event.target.value)}
                placeholder="Delivery recipient"
                className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none focus:border-[#b69066]"
              />
              <textarea
                value={form.data.deliver_to_address}
                onChange={(event) => form.setData('deliver_to_address', event.target.value)}
                rows={6}
                placeholder="Delivery address"
                className="w-full rounded-xl border border-[#dcccba] bg-white px-5 py-4 text-[1rem] text-[#3a2513] outline-none focus:border-[#b69066]"
              />
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[0.95rem] font-semibold text-[#3a2513]">Payment Method</label>
                  <select
                    value={form.data.payment_method}
                    onChange={(event) => form.setData('payment_method', event.target.value)}
                    className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none focus:border-[#b69066]"
                  >
                    {['bank', 'cash', 'lipa_no'].map((method) => (
                      <option key={method} value={method}>{method.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-[0.95rem] font-semibold text-[#3a2513]">Transaction ID</label>
                  <input
                    type="text"
                    value={form.data.transaction_id}
                    onChange={(event) => form.setData('transaction_id', event.target.value)}
                    placeholder="Optional transaction reference"
                    className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none focus:border-[#b69066]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[1.5rem] border border-[#e0d1bf] bg-white shadow-none">
          <CardContent className="space-y-6 p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-[1.4rem] font-semibold text-[#3a2513]">Invoice Items</h2>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-2 rounded-xl bg-[#4f3118] px-4 py-2.5 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-[#ede1cf]">
                  <tr>
                    {['Product', 'Description', 'Quantity', 'Unit Price', 'Total', ''].map((header) => (
                      <th key={header} className="px-5 py-4 text-[0.95rem] font-semibold text-[#2f2115]">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {form.data.items.map((item, index) => (
                    <tr key={index} className="border-b border-[#eadcca] bg-white last:border-b-0">
                      <td className="px-5 py-4">
                        <select
                          value={item.product_id}
                          onChange={(event) => updateItem(index, 'product_id', event.target.value)}
                          className="h-12 w-full min-w-[180px] rounded-xl border border-[#dcccba] bg-white px-4 text-sm outline-none focus:border-[#b69066]"
                        >
                          <option value="">Select product</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>{product.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(event) => updateItem(index, 'description', event.target.value)}
                          className="h-12 w-full min-w-[260px] rounded-xl border border-[#dcccba] bg-white px-4 text-sm outline-none focus:border-[#b69066]"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                          className="h-12 w-full min-w-[120px] rounded-xl border border-[#dcccba] bg-white px-4 text-sm outline-none focus:border-[#b69066]"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(event) => updateItem(index, 'unit_price', event.target.value)}
                          className="h-12 w-full min-w-[140px] rounded-xl border border-[#dcccba] bg-white px-4 text-sm outline-none focus:border-[#b69066]"
                        />
                      </td>
                      <td className="px-5 py-4 text-[1rem] font-semibold text-[#352314]">{money(item.subtotal)}</td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-500 transition hover:text-red-600"
                          aria-label="Remove invoice item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-[1.5rem] border border-[#e0d1bf] bg-white shadow-none">
            <CardContent className="space-y-5 p-8">
              <h2 className="text-[1.4rem] font-semibold text-[#3a2513]">Payment Details</h2>
              <div className="grid gap-5 md:grid-cols-2">
                <input
                  type="text"
                  value={form.data.currency}
                  onChange={(event) => form.setData('currency', event.target.value)}
                  placeholder="Currency"
                  className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none focus:border-[#b69066]"
                />
                <input
                  type="text"
                  value={form.data.bank_name}
                  onChange={(event) => form.setData('bank_name', event.target.value)}
                  placeholder="Bank Name"
                  className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none focus:border-[#b69066]"
                />
                <input
                  type="text"
                  value={form.data.account_name}
                  onChange={(event) => form.setData('account_name', event.target.value)}
                  placeholder="Account Name"
                  className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none focus:border-[#b69066]"
                />
                <input
                  type="text"
                  value={form.data.account_number}
                  onChange={(event) => form.setData('account_number', event.target.value)}
                  placeholder="Account Number"
                  className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none focus:border-[#b69066]"
                />
              </div>
              <textarea
                value={form.data.notes}
                onChange={(event) => form.setData('notes', event.target.value)}
                rows={4}
                placeholder="Invoice note / thank-you message"
                className="w-full rounded-xl border border-[#dcccba] bg-white px-5 py-4 text-[1rem] text-[#3a2513] outline-none focus:border-[#b69066]"
              />
            </CardContent>
          </Card>

          <Card className="rounded-[1.5rem] border border-[#e0d1bf] bg-white shadow-none">
            <CardContent className="space-y-4 p-8">
              <h2 className="text-[1.4rem] font-semibold text-[#3a2513]">Invoice Summary</h2>
              <div className="flex items-center justify-between text-[1rem] text-[#6f5238]">
                <span>Subtotal</span>
                <span className="font-semibold text-[#352314]">{money(summary.subtotal)}</span>
              </div>
              <div>
                <label className="mb-2 block text-[0.95rem] font-semibold text-[#3a2513]">Subtotal</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.data.subtotal}
                  onChange={(event) => {
                    form.setData('subtotal', event.target.value);
                    const subtotalValue = Number(event.target.value || 0);
                    const nextTotal = Math.max(subtotalValue + Number(form.data.tax || 0) - Number(form.data.discount || 0), 0);
                    form.setData('total', String(nextTotal));
                  }}
                  className="h-12 w-full rounded-xl border border-[#dcccba] bg-white px-4 text-sm outline-none focus:border-[#b69066]"
                />
                {form.errors.subtotal ? <p className="mt-2 text-xs text-red-500">{form.errors.subtotal}</p> : null}
              </div>
              <div>
                <label className="mb-2 block text-[0.95rem] font-semibold text-[#3a2513]">Tax</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.data.tax}
                  onChange={(event) => {
                    form.setData('tax', event.target.value);
                    recalculateTotals(form.data.items, event.target.value, form.data.discount);
                  }}
                  className="h-12 w-full rounded-xl border border-[#dcccba] bg-white px-4 text-sm outline-none focus:border-[#b69066]"
                />
                {form.errors.tax ? <p className="mt-2 text-xs text-red-500">{form.errors.tax}</p> : null}
              </div>
              <div>
                <label className="mb-2 block text-[0.95rem] font-semibold text-[#3a2513]">Discount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.data.discount}
                  onChange={(event) => {
                    form.setData('discount', event.target.value);
                    recalculateTotals(form.data.items, form.data.tax, event.target.value);
                  }}
                  className="h-12 w-full rounded-xl border border-[#dcccba] bg-white px-4 text-sm outline-none focus:border-[#b69066]"
                />
                {form.errors.discount ? <p className="mt-2 text-xs text-red-500">{form.errors.discount}</p> : null}
              </div>
              <div className="border-t border-[#eadcca] pt-4">
                <label className="mb-2 block text-[0.95rem] font-semibold text-[#3a2513]">Total Due</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.data.total}
                  onChange={(event) => form.setData('total', event.target.value)}
                  className="h-12 w-full rounded-xl border border-[#dcccba] bg-white px-4 text-sm outline-none focus:border-[#b69066]"
                />
                {form.errors.total ? <p className="mt-2 text-xs text-red-500">{form.errors.total}</p> : null}
                <div className="flex items-center justify-between text-[1.1rem] font-semibold text-[#352314]">
                  <span>Total Due</span>
                  <span>{money(summary.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </AppLayout>
  );
}

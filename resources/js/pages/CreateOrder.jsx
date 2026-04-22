import React, { useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Plus, X } from 'lucide-react';

const money = (value) => `Tsh ${new Intl.NumberFormat('en-TZ', {
  maximumFractionDigits: 0,
}).format(value || 0)}`;

const paymentOptions = [
  { value: 'lipa_no', label: 'Lipa No' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
];

function blankItem() {
  return {
    product_id: '',
    quantity: 1,
  };
}

export default function CreateOrder({ auth, products = [], branch = null, nextOrderNumber = '' }) {
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm({
    full_name: '',
    phone: '',
    branch_id: branch?.id ? String(branch.id) : '',
    fulfillment_method: 'delivery',
    payment_method: 'cash',
    items: [blankItem()],
  });

  const updateItem = (index, field, value) => {
    const nextItems = [...form.data.items];
    nextItems[index] = {
      ...nextItems[index],
      [field]: field === 'quantity' ? Number(value || 0) : value,
    };
    form.setData('items', nextItems);
  };

  const addItemRow = () => {
    form.setData('items', [...form.data.items, blankItem()]);
  };

  const removeItemRow = (index) => {
    if (form.data.items.length === 1) {
      form.setData('items', [blankItem()]);
      return;
    }

    form.setData('items', form.data.items.filter((_, itemIndex) => itemIndex !== index));
  };

  const resolveProduct = (productId) => products.find((product) => String(product.id) === String(productId));

  const total = form.data.items.reduce((sum, item) => {
    const product = resolveProduct(item.product_id);
    return sum + ((Number(item.quantity) || 0) * (Number(product?.price) || 0));
  }, 0);

  const submit = (event) => {
    event.preventDefault();
    setSubmitError('');

    const cleanedItems = form.data.items
      .map((item) => ({
        product_id: item.product_id || '',
        quantity: Number(item.quantity),
      }))
      .filter((item) => item.product_id && Number(item.quantity) > 0);

    if (cleanedItems.length === 0) {
      const message = 'Select at least one valid in-stock product before creating the order.';
      form.setError('items', message);
      setSubmitError(message);
      return;
    }

    form.clearErrors('items');

    setIsSubmitting(true);

    router.post('/create-order', {
      full_name: form.data.full_name,
      phone: form.data.phone,
      branch_id: form.data.branch_id,
      fulfillment_method: form.data.fulfillment_method,
      payment_method: form.data.payment_method,
      items: cleanedItems,
    }, {
      preserveScroll: true,
      onError: (errors) => {
        form.setError(errors);
        setSubmitError(
          errors.items
          || errors['items.0.product_id']
          || errors['items.0.quantity']
          || errors.fulfillment_method
          || errors.full_name
          || errors.phone
          || 'Please check the highlighted fields and try again.',
        );
      },
      onSuccess: () => {
        setSubmitError('');
      },
      onFinish: () => {
        setIsSubmitting(false);
      },
    });
  };

  return (
    <AppLayout user={auth?.user}>
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--color-sys-text-secondary)]">Staff workflow</p>
        <h1 className="mt-2 text-3xl font-black">Create Order</h1>
      </div>

      <form onSubmit={submit}>
        <Card className="rounded-[1.75rem] border border-[#e8dcca] bg-white shadow-none">
          <CardContent className="p-7">
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#4f3118]">
                  Full Names <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.data.full_name}
                  onChange={(e) => form.setData('full_name', e.target.value)}
                  placeholder="Enter client name"
                  required
                  className="h-16 w-full rounded-xl border border-[#dac8b1] bg-white px-5 text-lg text-[#352314] outline-none transition focus:border-[#b69066]"
                />
                {form.errors.full_name ? <p className="mt-2 text-xs text-red-500">{form.errors.full_name}</p> : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#4f3118]">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.data.phone}
                  onChange={(e) => form.setData('phone', e.target.value)}
                  placeholder="Enter client phone number"
                  required
                  className="h-16 w-full rounded-xl border border-[#dac8b1] bg-white px-5 text-lg text-[#352314] outline-none transition focus:border-[#b69066]"
                />
                {form.errors.phone ? <p className="mt-2 text-xs text-red-500">{form.errors.phone}</p> : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#4f3118]">
                  Payment Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.data.payment_method}
                  onChange={(e) => form.setData('payment_method', e.target.value)}
                  className="h-16 w-full rounded-xl border border-[#dac8b1] bg-white px-5 text-lg text-[#352314] outline-none transition focus:border-[#b69066]"
                >
                  {paymentOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#4f3118]">
                  Order Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.data.fulfillment_method}
                  onChange={(e) => form.setData('fulfillment_method', e.target.value)}
                  required
                  className="h-16 w-full rounded-xl border border-[#dac8b1] bg-white px-5 text-lg text-[#352314] outline-none transition focus:border-[#b69066]"
                >
                  <option value="delivery">Delivery</option>
                  <option value="pickup">Pickup</option>
                </select>
                {form.errors.fulfillment_method ? <p className="mt-2 text-xs text-red-500">{form.errors.fulfillment_method}</p> : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#4f3118]">
                  Order Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nextOrderNumber}
                  disabled
                  className="h-16 w-full rounded-xl border border-[#dac8b1] bg-[#f7f1e8] px-5 text-lg text-[#352314] outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#4f3118]">
                  Order Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={new Date().toLocaleDateString('en-GB', {
                    day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                  })}
                  disabled
                  className="h-16 w-full rounded-xl border border-[#dac8b1] bg-[#f7f1e8] px-5 text-lg text-[#352314] outline-none"
                />
              </div>
            </div>

            <div className="mt-10">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-[2rem] font-black tracking-[-0.03em] text-[#3a2513]">Invoice Items</h2>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#4f3118] px-5 py-3 text-base font-semibold text-white transition hover:bg-[#402612]"
                >
                  <Plus className="h-5 w-5" />
                  Add Item
                </button>
              </div>
              <div className="mt-4 h-px bg-[#eadcca]" />
            </div>

            <div className="mt-6 overflow-visible rounded-[1.5rem] border border-[#eadcca] bg-white">
              <div className="grid grid-cols-[1.7fr_1fr_1fr_0.9fr_52px] gap-4 bg-[#ede1cf] px-5 py-5 text-sm font-bold text-[#4f3118]">
                <div>Product</div>
                <div>Quantity</div>
                <div>Unit Price</div>
                <div>Total</div>
                <div />
              </div>

              {form.errors.items ? (
                <div className="border-b border-[#f2d4d4] bg-[#fff4f4] px-5 py-3 text-sm text-red-600">
                  {form.errors.items}
                </div>
              ) : null}

              <div className="space-y-4 overflow-visible px-5 py-5">
                {form.data.items.map((item, index) => {
                  const product = resolveProduct(item.product_id);
                  const itemTotal = (Number(item.quantity) || 0) * (Number(product?.price) || 0);
                  const productError = form.errors[`items.${index}.product_id`];
                  const quantityError = form.errors[`items.${index}.quantity`];

                  return (
                    <div
                      key={`${index}-${item.product_id}`}
                      className="relative grid grid-cols-[1.7fr_1fr_1fr_0.9fr_52px] items-center gap-4 rounded-[1.1rem] border border-[#eadcca] bg-[#fffdfa] px-4 py-4"
                    >
                      <div className="relative">
                        <select
                          value={item.product_id || ''}
                          onChange={(event) => updateItem(index, 'product_id', event.target.value)}
                          required
                          className="h-12 w-full rounded-xl border border-[#dac8b1] bg-white px-4 text-sm text-[#352314] outline-none transition hover:border-[#b69066] focus:border-[#b69066]"
                        >
                          <option value="">Select product</option>
                          {products.map((productOption) => (
                            <option key={productOption.id} value={String(productOption.id)}>
                              {productOption.name} - {money(productOption.price)}
                            </option>
                          ))}
                        </select>

                        {products.length === 0 ? (
                          <p className="mt-2 text-xs text-[#8b735d]">No in-stock products found.</p>
                        ) : null}

                        {productError ? (
                          <p className="mt-2 text-xs text-red-500">{productError}</p>
                        ) : null}
                      </div>

                      <div>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          required
                          className="h-12 w-full rounded-xl border border-[#dac8b1] bg-white px-4 text-sm text-[#352314] outline-none transition focus:border-[#b69066]"
                        />
                        {quantityError ? (
                          <p className="mt-2 text-xs text-red-500">{quantityError}</p>
                        ) : null}
                      </div>

                      <input
                        type="text"
                        value={Number(product?.price || 0)}
                        readOnly
                        className="h-12 w-full rounded-xl border border-[#dac8b1] bg-white px-4 text-sm text-[#72563a] outline-none"
                      />

                      <div className="px-2 text-base font-semibold text-[#352314]">
                        {money(itemTotal)}
                      </div>

                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => removeItemRow(index)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-red-500 transition hover:bg-red-50"
                          aria-label="Remove order item"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <div className="w-full max-w-[360px] rounded-[1.2rem] bg-[#f7f1e8] p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#72563a]">Order Total</p>
                <p className="mt-3 text-3xl font-black text-[#352314]">{money(total)}</p>
                {submitError ? (
                  <p className="mt-4 rounded-xl bg-[#fff4f4] px-4 py-3 text-sm font-medium text-red-600">
                    {submitError}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  disabled={isSubmitting || form.processing || form.data.items.length === 0}
                  className="mt-6 h-12 w-full rounded-xl bg-[#4f3118] text-base font-bold text-white hover:bg-[#402612]"
                >
                  {isSubmitting || form.processing ? 'Saving...' : 'Create Order'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </AppLayout>
  );
}

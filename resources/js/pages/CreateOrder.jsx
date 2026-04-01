import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ChevronDown, Plus, Search, X } from 'lucide-react';

const money = (value) => `Tsh ${new Intl.NumberFormat('en-TZ', {
  maximumFractionDigits: 0,
}).format(value || 0)}`;

const paymentOptions = [
  { value: 'lipa_no', label: 'Lipa No' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
];

function blankItem(products) {
  const firstProduct = products[0];

  return {
    product_id: firstProduct?.id ? String(firstProduct.id) : '',
    product_search: firstProduct?.name || '',
    quantity: 1,
  };
}

export default function CreateOrder({ auth, products = [], nextOrderNumber = '' }) {
  const [openProductIndex, setOpenProductIndex] = useState(null);
  const form = useForm({
    full_name: '',
    phone: '',
    payment_method: 'cash',
    items: [blankItem(products)],
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
    form.setData('items', [...form.data.items, blankItem(products)]);
  };

  const removeItemRow = (index) => {
    if (form.data.items.length === 1) {
      form.setData('items', [blankItem(products)]);
      return;
    }

    form.setData('items', form.data.items.filter((_, itemIndex) => itemIndex !== index));
  };

  const resolveProduct = (productId) => products.find((product) => String(product.id) === String(productId));

  const productLookup = products.reduce((carry, product) => {
    carry[product.name] = String(product.id);
    return carry;
  }, {});

  const updateProductSearch = (index, searchValue) => {
    const matchedProductId = productLookup[searchValue] || '';
    const nextItems = [...form.data.items];

    nextItems[index] = {
      ...nextItems[index],
      product_search: searchValue,
      product_id: matchedProductId,
    };

    form.setData('items', nextItems);
  };

  const selectProduct = (index, productOption) => {
    const nextItems = [...form.data.items];

    nextItems[index] = {
      ...nextItems[index],
      product_id: String(productOption.id),
      product_search: productOption.name,
    };

    form.setData('items', nextItems);
    setOpenProductIndex(null);
  };

  const total = form.data.items.reduce((sum, item) => {
    const product = resolveProduct(item.product_id);
    return sum + ((Number(item.quantity) || 0) * (Number(product?.price) || 0));
  }, 0);

  const submit = (event) => {
    event.preventDefault();

    const cleanedItems = form.data.items
      .map((item) => ({
        product_id: item.product_id || productLookup[item.product_search] || '',
        quantity: Number(item.quantity),
      }))
      .filter((item) => item.product_id && Number(item.quantity) > 0);

    if (cleanedItems.length === 0) {
      form.setError('items', 'Select at least one valid product before creating the order.');
      return;
    }

    form.clearErrors('items');

    form.transform((data) => ({
      ...data,
      items: cleanedItems,
    })).post('/create-order');
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
                      className={`relative grid grid-cols-[1.7fr_1fr_1fr_0.9fr_52px] items-center gap-4 rounded-[1.1rem] border border-[#eadcca] bg-[#fffdfa] px-4 py-4 ${openProductIndex === index ? 'z-30 overflow-visible' : ''}`}
                    >
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenProductIndex(openProductIndex === index ? null : index)}
                          className="flex h-12 w-full items-center justify-between rounded-xl border border-[#dac8b1] bg-white px-4 text-left text-sm text-[#352314] outline-none transition hover:border-[#b69066]"
                        >
                          <span className={product ? 'text-[#352314]' : 'text-[#8b735d]'}>
                            {product?.name || 'Select product'}
                          </span>
                          <ChevronDown className="h-4 w-4 text-[#72563a]" />
                        </button>

                        {openProductIndex === index ? (
                          <div className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-40 rounded-xl border border-[#dac8b1] bg-white shadow-[0_18px_40px_rgba(53,35,20,0.14)]">
                            <div className="border-b border-[#eadcca] p-3">
                              <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b735d]" />
                                <input
                                  type="text"
                                  value={item.product_search || ''}
                                  onChange={(e) => updateProductSearch(index, e.target.value)}
                                  placeholder="Search products"
                                  className="h-11 w-full rounded-lg border border-[#dac8b1] bg-white pl-10 pr-3 text-sm text-[#352314] outline-none transition focus:border-[#b69066]"
                                  autoFocus
                                />
                              </div>
                            </div>

                            <div className="max-h-64 overflow-y-auto py-2">
                              {products
                                .filter((productOption) => (
                                  !item.product_search
                                  || productOption.name.toLowerCase().includes(item.product_search.toLowerCase())
                                ))
                                .map((productOption) => (
                                  <button
                                    key={productOption.id}
                                    type="button"
                                    onClick={() => selectProduct(index, productOption)}
                                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-[#352314] transition hover:bg-[#f7f1e8]"
                                  >
                                    <span>{productOption.name}</span>
                                    <span className="text-xs font-semibold text-[#8b735d]">{money(productOption.price)}</span>
                                  </button>
                                ))}

                              {products.filter((productOption) => (
                                !item.product_search
                                || productOption.name.toLowerCase().includes(item.product_search.toLowerCase())
                              )).length === 0 ? (
                                <div className="px-4 py-4 text-sm text-[#8b735d]">
                                  No products found.
                                </div>
                              ) : null}
                            </div>
                          </div>
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
                <Button
                  type="submit"
                  disabled={form.processing || form.data.items.length === 0}
                  className="mt-6 h-12 w-full rounded-xl bg-[#4f3118] text-base font-bold text-white hover:bg-[#402612]"
                >
                  {form.processing ? 'Saving...' : 'Create Order'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </AppLayout>
  );
}

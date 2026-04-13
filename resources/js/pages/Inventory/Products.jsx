import React, { useMemo, useState } from 'react';
import { router, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function Products({ auth, products, categories, filters = {} }) {
  const { flash } = usePage().props;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const search = filters.search || '';
  const categoryId = filters.category_id || '';

  const productForm = useForm({
    category_id: '',
    name: '',
    supplier_name: '',
    supplier_contact: '',
    unit: 'kg',
    stock_quantity: '',
    price: '',
    low_stock_alert: '',
    is_active: true,
  });

  const rows = useMemo(() => products?.data || [], [products]);

  const openCreateModal = () => {
    setEditingProduct(null);
    productForm.reset();
    productForm.setData({
      category_id: '',
      name: '',
      supplier_name: '',
      supplier_contact: '',
      unit: 'kg',
      stock_quantity: '',
      price: '',
      low_stock_alert: '',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    productForm.setData({
      category_id: product.category?.id ? String(product.category.id) : '',
      name: product.name || '',
      supplier_name: product.supplier_name || '',
      supplier_contact: product.supplier_contact || '',
      unit: product.unit || 'kg',
      stock_quantity: product.stock_quantity ?? '',
      price: product.current_price?.price ?? '',
      low_stock_alert: product.low_stock_alert ?? '',
      is_active: Boolean(product.is_active),
    });
    setIsModalOpen(true);
  };

  const submitProduct = (e) => {
    e.preventDefault();

    const endpoint = editingProduct ? `/inventory/products/${editingProduct.id}` : '/inventory/products';
    const method = editingProduct ? 'put' : 'post';

    productForm[method](endpoint, {
      preserveScroll: true,
      onSuccess: () => {
        setEditingProduct(null);
        productForm.reset();
        productForm.setData('unit', 'kg');
        productForm.setData('is_active', true);
        setIsModalOpen(false);
      },
    });
  };

  return (
    <AppLayout user={auth?.user}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-sys-text-primary)]">Products</h1>
          <p className="text-sm text-[var(--color-sys-text-secondary)] mt-0.5">
            Create products using the categories that already exist in your system.
          </p>
        </div>
        <Button variant="primary" onClick={openCreateModal} className="flex items-center gap-2">
          <Plus size={16} />
          Add Product
        </Button>
      </div>

      <ConfirmModal
        isOpen={Boolean(deletingProduct)}
        onClose={() => setDeletingProduct(null)}
        onConfirm={() => {
          if (deletingProduct) {
            router.delete(`/inventory/products/${deletingProduct.id}`, {
              preserveScroll: true,
            });
          }
        }}
        title="Delete Product"
        message={deletingProduct ? `You are deleting product ${deletingProduct.name}. This action cannot be undone.` : ''}
        confirmText="Delete"
        type="danger"
      />

      {(flash?.success || flash?.error) && (
        <div className={`mb-5 rounded-2xl border px-5 py-4 text-sm font-medium ${
          flash.error
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
        }`}>
          {flash.error || flash.success}
        </div>
      )}

      <form method="get" action="/inventory/products" className="mb-5 flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            name="search"
            defaultValue={search}
            placeholder="Search products by name or SKU"
            className="pl-10 bg-white h-11"
          />
        </div>
        <select
          name="category_id"
          defaultValue={categoryId}
          className="h-11 rounded-lg border border-[var(--color-sys-border)] bg-white px-4 text-sm outline-none"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" className="h-11 px-5">Filter</Button>
      </form>

      <Card className="rounded-2xl border-none shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-sys-border)] bg-[#F5F2EF]/50">
                {['Product', 'Category', 'Supplier', 'Unit', 'Quantity', 'Price', 'Status', 'Actions'].map((header) => (
                  <th key={header} className="px-6 py-4 text-left font-bold uppercase tracking-wider text-[10px] text-[var(--color-sys-text-primary)]">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((product, index) => (
                <tr
                  key={product.id}
                  className={`border-b border-[var(--color-sys-border)] ${index % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}
                >
                  <td className="px-6 py-5">
                    <p className="font-bold text-[var(--color-sys-text-primary)]">{product.name}</p>
                    <p className="mt-1 text-xs text-[var(--color-sys-text-secondary)]">{product.sku || 'SKU auto-generated'}</p>
                    <p className="mt-1 text-xs text-[var(--color-sys-text-secondary)]">
                      Low stock alert: {product.low_stock_alert ?? 0} {product.unit}
                    </p>
                  </td>
                  <td className="px-6 py-5">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-600">
                      {product.category?.name || 'Unassigned'}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <p className="font-medium text-[var(--color-sys-text-primary)]">{product.supplier_name || 'No supplier'}</p>
                    <p className="mt-1 text-sm text-[var(--color-sys-text-secondary)]">{product.supplier_contact || 'No contact'}</p>
                  </td>
                  <td className="px-6 py-5 font-medium text-[var(--color-sys-text-secondary)]">{product.unit || '-'}</td>
                  <td className="px-6 py-5 font-medium text-[var(--color-sys-text-secondary)]">
                    {product.stock_quantity}
                  </td>
                  <td className="px-6 py-5 font-bold text-[var(--color-sys-text-primary)]">
                    {product.current_price ? formatCurrency(product.current_price.price) : 'No price'}
                  </td>
                  <td className="px-6 py-5">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      product.status === 'In Stock'
                        ? 'bg-emerald-100 text-emerald-700'
                        : product.status === 'Low Stock'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-600'
                    }`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4 text-[var(--color-brand-dark)]">
                      <button
                        type="button"
                        onClick={() => openEditModal(product)}
                        className="transition hover:text-[#2f1c0d]"
                        aria-label={`Edit ${product.name}`}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingProduct(product)}
                        className="transition hover:text-red-600"
                        aria-label={`Delete ${product.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-sm text-[var(--color-sys-text-secondary)]">
                    No products matched the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-[#1A1A1A]/60 p-4 backdrop-blur-sm">
          <div className="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-sys-border)] px-8 py-6">
              <div>
                <h2 className="text-2xl font-bold text-[var(--color-sys-text-primary)]">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>
                <p className="mt-1 text-sm text-[var(--color-sys-text-secondary)]">
                  {editingProduct ? 'Update product details and pricing.' : 'Choose one of the existing categories before saving the product.'}
                </p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={submitProduct} className="space-y-6 p-8">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-sys-text-primary)]">
                  Category
                </label>
                <select
                  value={productForm.data.category_id}
                  onChange={(e) => productForm.setData('category_id', e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-sys-border)] bg-[#F9F9F9] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand-tan)]"
                >
                  <option value="">Select existing category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {productForm.errors.category_id && <p className="mt-1 text-xs text-red-500">{productForm.errors.category_id}</p>}
              </div>

              <div>
                <Input
                  label="Product Name"
                  value={productForm.data.name}
                  onChange={(e) => productForm.setData('name', e.target.value)}
                  placeholder="e.g., Inter-chick Chicken"
                  error={productForm.errors.name}
                  className="bg-[#F9F9F9] h-11"
                />
              </div>

              <div>
                <Input
                  label="Supplier Name"
                  value={productForm.data.supplier_name}
                  onChange={(e) => productForm.setData('supplier_name', e.target.value)}
                  placeholder="e.g., Amani Brew Supplier"
                  error={productForm.errors.supplier_name}
                  className="bg-[#F9F9F9] h-11"
                />
              </div>

              <div>
                <Input
                  label="Supplier Contact"
                  value={productForm.data.supplier_contact}
                  onChange={(e) => productForm.setData('supplier_contact', e.target.value)}
                  placeholder="e.g., +255 712 345 678"
                  error={productForm.errors.supplier_contact}
                  className="bg-[#F9F9F9] h-11"
                />
              </div>

              <Input
                type="number"
                label="Low Stock Alert"
                value={productForm.data.low_stock_alert}
                onChange={(e) => productForm.setData('low_stock_alert', e.target.value)}
                placeholder="Enter alert threshold"
                error={productForm.errors.low_stock_alert}
                className="bg-[#F9F9F9] h-11"
              />

              <div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-sys-text-primary)]">
                    Unit
                  </label>
                  <select
                    value={productForm.data.unit}
                    onChange={(e) => productForm.setData('unit', e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-sys-border)] bg-[#F9F9F9] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand-tan)]"
                  >
                    <option value="kg">kg</option>
                    <option value="pcs">pcs</option>
                    <option value="pack">pack</option>
                    <option value="gram">gram</option>
                    <option value="litre">litre</option>
                  </select>
                  {productForm.errors.unit && <p className="mt-1 text-xs text-red-500">{productForm.errors.unit}</p>}
                </div>
              </div>

              <Input
                type="number"
                label="Stock Quantity"
                value={productForm.data.stock_quantity}
                onChange={(e) => productForm.setData('stock_quantity', e.target.value)}
                placeholder="Enter available quantity"
                error={productForm.errors.stock_quantity}
                className="bg-[#F9F9F9] h-11"
              />

              <Input
                type="number"
                label="Price (TZS)"
                value={productForm.data.price}
                onChange={(e) => productForm.setData('price', e.target.value)}
                placeholder="18000"
                error={productForm.errors.price}
                className="bg-[#F9F9F9] h-11"
              />

              <label className="flex items-center gap-3 rounded-xl border border-[var(--color-sys-border)] bg-[#F9F9F9] px-4 py-3">
                <input
                  type="checkbox"
                  checked={productForm.data.is_active}
                  onChange={(e) => productForm.setData('is_active', e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium text-[var(--color-sys-text-primary)]">Set product as active</span>
              </label>

              <div className="flex gap-4 border-t border-[var(--color-sys-border)] pt-6">
                <Button type="button" onClick={() => setIsModalOpen(false)} variant="outline" className="flex-1 py-3 font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={productForm.processing} className="flex-1 py-3 font-bold">
                  {productForm.processing ? 'Saving...' : editingProduct ? 'Update Product' : 'Save Product'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

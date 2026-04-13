<?php

namespace App\Http\Requests;

use App\Support\BackofficeAccess;
use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return BackofficeAccess::hasBackofficeAccess($this->user());
    }

    protected function prepareForValidation(): void
    {
        $product = $this->route('product');
        $normalizedName = preg_replace('/\s+/', ' ', trim((string) $this->input('name')));
        $slugInput = trim((string) $this->input('slug'));
        $skuInput = trim((string) $this->input('sku'));

        $this->merge([
            'name' => $normalizedName,
            'slug' => filled($slugInput)
                ? Product::generateUniqueSlug($slugInput, $product?->id)
                : ($product?->slug ?: Product::generateUniqueSlug($normalizedName, $product?->id)),
            'supplier_name' => filled($this->input('supplier_name')) ? preg_replace('/\s+/', ' ', trim((string) $this->input('supplier_name'))) : null,
            'supplier_contact' => filled($this->input('supplier_contact')) ? trim((string) $this->input('supplier_contact')) : null,
            'sku' => filled($skuInput)
                ? Product::generateUniqueSku($skuInput, $product?->id)
                : ($product?->sku ?: Product::generateUniqueSku(ignoreId: $product?->id)),
            'barcode' => filled($this->input('barcode')) ? trim((string) $this->input('barcode')) : null,
            'unit' => strtolower(trim((string) $this->input('unit'))),
        ]);
    }

    public function rules(): array
    {
        $productId = $this->route('product')?->id;

        return [
            'category_id' => ['required', 'exists:categories,id'],
            'name'        => ['required', 'string', 'max:255'],
            'slug'        => ['nullable', 'string', Rule::unique('products', 'slug')->ignore($productId)->whereNull('deleted_at')],
            'supplier_name'=> ['nullable', 'string', 'max:255'],
            'supplier_contact' => ['nullable', 'string', 'max:255'],
            'sku'         => ['nullable', 'string', Rule::unique('products', 'sku')->ignore($productId)->whereNull('deleted_at')],
            'barcode'     => ['nullable', 'string', Rule::unique('products', 'barcode')->ignore($productId)->whereNull('deleted_at')],
            'unit'        => ['required', 'string', 'in:kg,pcs,pack,litre,gram'],
            'weight'      => ['nullable', 'numeric', 'min:0'],
            'stock_quantity' => ['nullable', 'numeric', 'min:0'],
            'low_stock_alert' => ['nullable', 'numeric', 'min:0'],
            'is_active'   => ['boolean'],
            // Pricing
            'price'       => ['nullable', 'numeric', 'min:0'],
            'promo_price' => ['nullable', 'numeric', 'min:0', 'lt:price'],
        ];
    }

    public function messages(): array
    {
        return [
            'promo_price.lt' => 'Promotional price must be less than the regular price.',
        ];
    }
}

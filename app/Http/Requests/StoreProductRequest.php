<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool { return true; }

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

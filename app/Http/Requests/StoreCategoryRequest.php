<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCategoryRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $categoryId = $this->route('category')?->id;

        return [
            'name'        => ['required', 'string', 'max:255', Rule::unique('categories', 'name')->ignore($categoryId)->whereNull('deleted_at')],
            'slug'        => ['nullable', 'string', 'max:255', Rule::unique('categories', 'slug')->ignore($categoryId)->whereNull('deleted_at')],
            'description' => ['nullable', 'string'],
            'is_active'   => ['boolean'],
            'sort_order'  => ['integer', 'min:0'],
            'image'       => ['nullable', 'string'],
        ];
    }
}

<?php

namespace App\Http\Requests;

use App\Models\Category;
use App\Support\BackofficeAccess;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return BackofficeAccess::hasBackofficeAccess($this->user());
    }

    protected function prepareForValidation(): void
    {
        $category = $this->route('category');
        $normalizedName = preg_replace('/\s+/', ' ', trim((string) $this->input('name')));
        $slugInput = trim((string) $this->input('slug'));

        $this->merge([
            'name' => $normalizedName,
            'slug' => filled($slugInput)
                ? Category::generateUniqueSlug($slugInput, $category?->id)
                : Category::generateUniqueSlug($normalizedName, $category?->id),
            'description' => filled($this->input('description')) ? trim((string) $this->input('description')) : null,
            'image' => filled($this->input('image')) ? trim((string) $this->input('image')) : null,
        ]);
    }

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

<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'full_name' => preg_replace('/\s+/', ' ', trim((string) $this->input('full_name'))),
            'email' => Str::lower(trim((string) $this->input('email'))),
            'phone' => preg_replace('/\s+/', '', trim((string) $this->input('phone'))),
            'city' => preg_replace('/\s+/', ' ', trim((string) $this->input('city'))),
            'country' => preg_replace('/\s+/', ' ', trim((string) $this->input('country'))),
            'address' => preg_replace('/\s+/', ' ', trim((string) $this->input('address'))),
            'postal_code' => trim((string) $this->input('postal_code')),
        ]);
    }

    public function rules(): array
    {
        $user = $this->user();
        $customerId = $user?->customer?->id;

        return [
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email:rfc,dns', 'max:255', Rule::unique('users', 'email')->ignore($user?->id), Rule::unique('customers', 'email')->ignore($customerId)],
            'phone' => ['required', 'string', 'max:30', Rule::unique('customers', 'phone')->ignore($customerId)],
            'city' => ['required', 'string', 'max:255'],
            'country' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string', 'max:1000'],
            'postal_code' => ['nullable', 'string', 'max:40'],
            'avatar' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ];
    }
}

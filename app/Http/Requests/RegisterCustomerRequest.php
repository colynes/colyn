<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class RegisterCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'full_name' => preg_replace('/\s+/', ' ', trim((string) $this->input('full_name'))),
            'email' => Str::lower(trim((string) $this->input('email'))),
            'phone' => preg_replace('/\s+/', '', trim((string) $this->input('phone'))),
            'address' => preg_replace('/\s+/', ' ', trim((string) $this->input('address'))),
        ]);
    }

    public function rules(): array
    {
        return [
            'full_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:30', 'unique:customers,phone'],
            'email' => ['required', 'email:rfc,dns', 'max:255', 'unique:users,email', 'unique:customers,email'],
            'address' => ['required', 'string', 'max:1000'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ];
    }
}

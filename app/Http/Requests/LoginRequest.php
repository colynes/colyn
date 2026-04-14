<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => Str::lower(trim((string) $this->input('email'))),
            'remember' => $this->boolean('remember'),
        ]);
    }

    public function rules(): array
    {
        $emailRule = app()->environment('local') ? 'email:rfc' : 'email:rfc,dns';

        return [
            'email' => ['required', $emailRule, 'max:255'],
            'password' => ['required', 'string'],
            'remember' => ['nullable', 'boolean'],
        ];
    }
}

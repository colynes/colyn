<?php

namespace App\Http\Controllers;

use App\Http\Requests\ForgotPasswordRequest;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterCustomerRequest;
use App\Http\Requests\ResetPasswordRequest;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AuthController extends Controller
{
    public function showLogin()
    {
        if (Auth::check()) {
            return redirect()->route($this->redirectRouteFor(Auth::user()));
        }

        return Inertia::render('Login', [
            'formData' => [
                'email' => old('email', ''),
                'remember' => (bool) old('remember', false),
            ],
        ]);
    }

    public function showForgotPassword()
    {
        if (Auth::check()) {
            return redirect()->route($this->redirectRouteFor(Auth::user()));
        }

        return Inertia::render('ForgotPassword', [
            'formData' => [
                'email' => old('email', ''),
            ],
        ]);
    }

    public function sendResetLink(ForgotPasswordRequest $request)
    {
        $validated = $request->validated();

        $status = Password::sendResetLink([
            'email' => $validated['email'],
        ]);

        Log::info('Password reset link requested.', [
            'email' => $validated['email'],
            'ip' => $request->ip(),
            'status' => $status,
            'user_exists' => User::query()->where('email', $validated['email'])->exists(),
        ]);

        return back()->with('success', __('messages.auth.reset_link_sent'));
    }

    public function showResetPassword(Request $request, string $token)
    {
        if (Auth::check()) {
            return redirect()->route($this->redirectRouteFor(Auth::user()));
        }

        return Inertia::render('ResetPassword', [
            'formData' => [
                'email' => old('email', (string) $request->query('email', '')),
                'token' => $token,
            ],
        ]);
    }

    public function resetPassword(ResetPasswordRequest $request)
    {
        $validated = $request->validated();

        $status = Password::reset(
            $validated,
            function (User $user) use ($validated) {
                $user->forceFill([
                    'password' => Hash::make($validated['password']),
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            Log::info('Password reset completed.', [
                'email' => $validated['email'],
                'ip' => $request->ip(),
            ]);

            if (Auth::check()) {
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            return redirect()
                ->route('login')
                ->with('success', __('messages.auth.password_reset_success'));
        }

        Log::warning('Password reset failed.', [
            'email' => $validated['email'],
            'ip' => $request->ip(),
            'status' => $status,
        ]);

        return back()->withErrors([
            'email' => in_array($status, [Password::INVALID_TOKEN, Password::INVALID_USER], true)
                ? __('messages.auth.password_reset_invalid')
                : __($status),
        ])->onlyInput('email');
    }

    public function showRegister()
    {
        if (Auth::check()) {
            return redirect()->route($this->redirectRouteFor(Auth::user()));
        }

        return Inertia::render('Register');
    }

    public function login(LoginRequest $request)
    {
        $credentials = $request->validated();

        if (Auth::attempt(['email' => $credentials['email'], 'password' => $credentials['password']], (bool) $request->boolean('remember'))) {
            $user = $request->user()?->loadMissing('customer');

            if ($user && $user->customer && !$user->hasAnyRole(['Customer', 'Administrator', 'Admin', 'Manager', 'Staff'])) {
                $user->assignRole('Customer');
            }

            $request->session()->regenerate();
            if ($user && Schema::hasColumn('users', 'last_login_at')) {
                $user->forceFill([
                    'last_login_at' => now(),
                ])->save();
            }

            Log::info('User login successful.', [
                'user_id' => $user?->id,
                'email' => $credentials['email'],
                'ip' => $request->ip(),
            ]);

            return redirect()->intended(route($this->redirectRouteFor($user)));
        }

        Log::warning('User login failed.', [
            'email' => $credentials['email'],
            'ip' => $request->ip(),
        ]);

        return back()->withErrors([
            'email' => __('messages.auth.invalid_credentials'),
        ])->onlyInput('email', 'remember');
    }

    public function register(RegisterCustomerRequest $request)
    {
        $existingUser = User::query()
            ->where('email', $request->input('email'))
            ->first();

        $existingCustomer = Customer::query()
            ->where('email', $request->input('email'))
            ->orWhere('phone', $request->input('phone'))
            ->first();

        if ($existingUser || $existingCustomer) {
            return redirect()
                ->route('login')
                ->with('error', __('messages.auth.account_exists_login'));
        }

        $validated = $request->validated();

        $user = DB::transaction(function () use ($validated) {
            $user = User::create([
                'name'     => $validated['full_name'],
                'email'    => $validated['email'],
                'preferred_language' => app()->getLocale(),
                'password' => $validated['password'],
            ]);

            $user->assignRole('Customer');

            Customer::create([
                'user_id'   => $user->id,
                'full_name' => $validated['full_name'],
                'phone'     => $validated['phone'],
                'email'     => $validated['email'],
                'address'   => $validated['address'],
                'status'    => 'Active',
            ]);

            return $user;
        });

        Auth::login($user, true);
        $request->session()->regenerate();

        Log::info('Customer registration completed.', [
            'user_id' => $user->id,
            'email' => $validated['email'],
            'ip' => $request->ip(),
        ]);

        return redirect()->route('customer.home')->with('success', __('messages.auth.registration_success'));
    }

    public function logout(Request $request)
    {
        Log::info('User logout.', [
            'user_id' => $request->user()?->id,
            'ip' => $request->ip(),
        ]);

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('home');
    }

    protected function redirectRouteFor(?User $user): string
    {
        if (!$user) {
            return 'home';
        }

        $user->loadMissing('customer');

        $roleKeys = $user->getRoleNames()->map(fn ($role) => strtolower($role));

        if ($roleKeys->intersect(['administrator', 'admin', 'manager', 'staff'])->isNotEmpty()) {
            return 'dashboard';
        }

        if ($roleKeys->contains('customer') || $user->customer) {
            return 'customer.home';
        }

        return 'home';
    }
}

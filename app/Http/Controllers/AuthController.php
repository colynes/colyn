<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
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

    public function sendResetLink(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $status = Password::sendResetLink([
            'email' => $validated['email'],
        ]);

        if ($status === Password::RESET_LINK_SENT) {
            return back()->with('success', __($status));
        }

        return back()->withErrors([
            'email' => $status === Password::INVALID_USER
                ? 'We could not find a user account with that email address.'
                : __($status),
        ])->onlyInput('email');
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

    public function resetPassword(Request $request)
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

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
            if (Auth::check()) {
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            return redirect()
                ->route('login')
                ->with('success', 'Your password has been reset successfully. You can sign in now.');
        }

        return back()->withErrors([
            'email' => in_array($status, [Password::INVALID_TOKEN, Password::INVALID_USER], true)
                ? 'This password reset link is invalid or has expired.'
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

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email'    => 'required|email',
            'password' => 'required',
            'remember' => 'nullable|boolean',
        ]);

        if (Auth::attempt($request->only('email', 'password'), (bool) $request->boolean('remember'))) {
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

            return redirect()->intended(route($this->redirectRouteFor($user)));
        }

        return back()->withErrors([
            'email' => 'The provided credentials do not match our records.',
        ])->onlyInput('email', 'remember');
    }

    public function register(Request $request)
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
                ->with('error', 'This customer account already exists. Please log in instead.');
        }

        $validated = $request->validate([
            'full_name'              => 'required|string|max:255',
            'phone'                  => 'required|string|max:30|unique:customers,phone',
            'email'                  => 'required|email|max:255|unique:users,email|unique:customers,email',
            'address'                => 'required|string|max:1000',
            'password'               => 'required|string|min:8|confirmed',
        ]);

        $user = DB::transaction(function () use ($validated) {
            $user = User::create([
                'name'     => $validated['full_name'],
                'email'    => $validated['email'],
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

        return redirect()->route('customer.home')->with('success', 'Customer account created successfully.');
    }

    public function logout(Request $request)
    {
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

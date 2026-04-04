<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AuthController extends Controller
{
    public function showLogin()
    {
        if (Auth::check()) {
            return redirect()->route($this->redirectRouteFor(Auth::user()));
        }

        return Inertia::render('Login');
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
        ]);

        if (Auth::attempt($credentials, true)) {
            $request->session()->regenerate();

            return redirect()->intended(route($this->redirectRouteFor($request->user())));
        }

        return back()->withErrors([
            'email' => 'The provided credentials do not match our records.',
        ])->onlyInput('email');
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

        $roleKeys = $user->getRoleNames()->map(fn ($role) => strtolower($role));

        return $roleKeys->intersect(['administrator', 'admin', 'manager', 'staff'])->isNotEmpty()
            ? 'dashboard'
            : 'customer.home';
    }
}

<?php

namespace App\Http\Middleware;

use App\Support\BackofficeAccess;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCustomerAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return redirect()->route('login');
        }

        if (BackofficeAccess::hasBackofficeAccess($user)) {
            return redirect()
                ->route('dashboard')
                ->with('error', 'This account uses the back office dashboard.');
        }

        $hasCustomerAccess = $user->customer !== null
            || $user->getRoleNames()->map(fn ($role) => strtolower((string) $role))->contains('customer');

        if (!$hasCustomerAccess) {
            return redirect()
                ->route('home')
                ->with('error', 'This account does not have customer access.');
        }

        return $next($request);
    }
}

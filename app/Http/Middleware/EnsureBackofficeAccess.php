<?php

namespace App\Http\Middleware;

use App\Support\BackofficeAccess;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureBackofficeAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!BackofficeAccess::hasBackofficeAccess($request->user())) {
            return redirect()
                ->route('customer.home')
                ->with('error', 'This account does not have dashboard access.');
        }

        return $next($request);
    }
}

<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

class AddSecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $nonce = null;

        if (!app()->environment(['local', 'testing'])) {
            $nonce = bin2hex(random_bytes(16));
            $request->attributes->set('csp_nonce', $nonce);
            View::share('cspNonce', $nonce);
            Vite::useCspNonce($nonce);
        }

        $response = $next($request);

        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), geolocation=(self), microphone=(), payment=()');
        $response->headers->set('X-Permitted-Cross-Domain-Policies', 'none');
        $response->headers->set('Cross-Origin-Opener-Policy', 'same-origin');
        $response->headers->set('Cross-Origin-Resource-Policy', 'same-origin');

        if (!app()->environment(['local', 'testing'])) {
            $response->headers->set('Content-Security-Policy', $this->contentSecurityPolicy($nonce));
        }

        if (app()->isProduction() && $request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }

    protected function contentSecurityPolicy(?string $nonce): string
    {
        $scriptSrc = [
            "'self'",
            'https://maps.googleapis.com',
            'https://maps.gstatic.com',
            'https://www.google.com',
            'https://www.gstatic.com',
        ];

        if ($nonce) {
            $scriptSrc[] = "'nonce-{$nonce}'";
        }

        $connectSrc = [
            "'self'",
            'https:',
            'wss:',
        ];

        if (app()->environment('local')) {
            $scriptSrc[] = "'unsafe-eval'";
            $connectSrc[] = 'http://localhost:*';
            $connectSrc[] = 'http://127.0.0.1:*';
            $connectSrc[] = 'ws://localhost:*';
            $connectSrc[] = 'ws://127.0.0.1:*';
        }

        $directives = [
            "default-src 'self'",
            'base-uri ' . "'self'",
            'form-action ' . "'self'",
            'frame-ancestors ' . "'self'",
            "object-src 'none'",
            'script-src ' . implode(' ', array_unique($scriptSrc)),
            "script-src-attr 'none'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "style-src-attr 'unsafe-inline'",
            "img-src 'self' data: blob: https:",
            'connect-src ' . implode(' ', array_unique($connectSrc)),
            "font-src 'self' data: https://fonts.gstatic.com",
            "worker-src 'self' blob:",
        ];

        if (app()->isProduction()) {
            $directives[] = 'upgrade-insecure-requests';
        }

        return implode('; ', $directives);
    }
}

<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;

class SetLocale
{
    public function handle(Request $request, Closure $next)
    {
        $supported = array_keys((array) config('app.supported_locales', []));

        if ($supported === []) {
            $supported = [config('app.locale', 'en')];
        }

        $locale = session('locale', config('app.locale', 'en'));

        if ($request->user() && in_array($request->user()->preferred_language, $supported, true)) {
            $locale = $request->user()->preferred_language;
        }

        if (! in_array($locale, $supported, true)) {
            $locale = config('app.locale', 'en');
        }

        App::setLocale($locale);

        return $next($request);
    }
}

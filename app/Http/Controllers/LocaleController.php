<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class LocaleController extends Controller
{
    public function update(Request $request): RedirectResponse
    {
        $supportedLocales = array_keys((array) config('app.supported_locales', []));

        if ($supportedLocales === []) {
            $supportedLocales = [config('app.locale', 'en')];
        }

        $validated = $request->validate([
            'locale' => ['required', 'string', Rule::in($supportedLocales)],
        ]);

        $locale = $validated['locale'];

        $request->session()->put('locale', $locale);

        if ($request->user() && Schema::hasColumn('users', 'preferred_language')) {
            $request->user()->forceFill([
                'preferred_language' => $locale,
            ])->save();
        }

        return back(303);
    }
}

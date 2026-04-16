<?php

namespace App\Support;

use Illuminate\Support\Facades\File;

class FrontendTranslations
{
    public static function forLocale(string $locale): array
    {
        $fallbackLocale = config('app.fallback_locale', 'en');

        $translations = static::loadLocaleFiles($fallbackLocale);

        if ($locale !== $fallbackLocale) {
            $translations = array_replace_recursive($translations, static::loadLocaleFiles($locale));
        }

        return $translations;
    }

    /**
     * @return array<string, mixed>
     */
    protected static function loadLocaleFiles(string $locale): array
    {
        $directory = lang_path($locale);

        if (! File::isDirectory($directory)) {
            return [];
        }

        $translations = [];

        foreach (File::files($directory) as $file) {
            if ($file->getExtension() !== 'php') {
                continue;
            }

            $group = $file->getFilenameWithoutExtension();
            $lines = require $file->getRealPath();

            if (is_array($lines)) {
                $translations[$group] = $lines;
            }
        }

        return $translations;
    }
}

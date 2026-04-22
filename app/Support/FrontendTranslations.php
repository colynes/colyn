<?php

namespace App\Support;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Cache;

class FrontendTranslations
{
    public static function forLocale(string $locale): array
    {
        $fallbackLocale = config('app.fallback_locale', 'en');
        $locales = array_values(array_unique([$fallbackLocale, $locale]));

        if (!app()->environment(['local', 'testing'])) {
            $signature = static::localeSignature($locales);
            $cacheKey = 'frontend_translations:' . implode(':', $locales) . ':' . $signature;

            return Cache::rememberForever($cacheKey, fn () => static::buildTranslations($locale, $fallbackLocale));
        }

        return static::buildTranslations($locale, $fallbackLocale);
    }

    protected static function buildTranslations(string $locale, string $fallbackLocale): array
    {
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

    /**
     * @param array<int, string> $locales
     */
    protected static function localeSignature(array $locales): string
    {
        $parts = [];

        foreach ($locales as $locale) {
            $directory = lang_path($locale);

            if (! File::isDirectory($directory)) {
                $parts[] = $locale . ':missing';
                continue;
            }

            foreach (File::files($directory) as $file) {
                if ($file->getExtension() !== 'php') {
                    continue;
                }

                $parts[] = $locale . ':' . $file->getFilename() . ':' . $file->getMTime();
            }
        }

        return sha1(implode('|', $parts));
    }
}

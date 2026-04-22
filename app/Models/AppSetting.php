<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class AppSetting extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'key',
        'value',
    ];

    public static function getValue(string $key, mixed $default = null): mixed
    {
        return Cache::remember(static::cacheKey($key), now()->addMinutes(5), function () use ($key) {
            return static::query()->where('key', $key)->value('value');
        }) ?? $default;
    }

    public static function setValue(string $key, mixed $value): void
    {
        static::query()->updateOrCreate(
            ['key' => $key],
            ['value' => $value],
        );

        Cache::forget(static::cacheKey($key));
    }

    protected static function cacheKey(string $key): string
    {
        return 'app_settings:' . $key;
    }
}

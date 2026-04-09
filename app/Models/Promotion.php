<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class Promotion extends Model
{
    protected $fillable = [
        'title',
        'slug',
        'description',
        'image',
        'discount_label',
        'cta_text',
        'starts_at',
        'ends_at',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (Promotion $promotion) {
            if (blank($promotion->slug)) {
                $promotion->slug = Str::slug($promotion->title);
            }
        });
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeActive($query)
    {
        return $query
            ->where('is_active', true)
            ->where(function ($builder) {
                $builder->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function ($builder) {
                $builder->whereNull('ends_at')->orWhereDate('ends_at', '>=', today());
            });
    }

    public function scopeCustomerVisible($query)
    {
        return $query
            ->where('is_active', true)
            ->where(function ($builder) {
                $builder->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function ($builder) {
                $builder->whereNull('ends_at')->orWhereDate('ends_at', '>=', today()->subDays(2));
            });
    }

    public function effectiveEndsAt(): ?Carbon
    {
        if (!$this->ends_at) {
            return null;
        }

        $endsAt = $this->ends_at->copy();

        if ($endsAt->format('H:i:s') !== '00:00:00') {
            return $endsAt;
        }

        return $endsAt->setTimeFromTimeString(self::storeClosingTime());
    }

    public function isClosedForStoreHours(): bool
    {
        return $this->effectiveEndsAt()?->isPast() ?? false;
    }

    public static function storeClosingTime(): string
    {
        return AppSetting::getValue('pickup_close_time', '20:00');
    }
}

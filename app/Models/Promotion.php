<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
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
                $builder->whereNull('ends_at')->orWhere('ends_at', '>=', now());
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
                $builder->whereNull('ends_at')->orWhere('ends_at', '>=', now()->subDays(2));
            });
    }
}

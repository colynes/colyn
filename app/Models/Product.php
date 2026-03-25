<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Product extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'category_id',
        'name',
        'slug',
        'description',
        'image',
        'sku',
        'barcode',
        'unit',
        'weight',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'weight'    => 'float',
    ];

    protected static function booted(): void
    {
        static::creating(function (Product $p) {
            if (empty($p->slug)) {
                $p->slug = Str::slug($p->name);
            }
            if (empty($p->sku)) {
                $p->sku = 'SKU-' . strtoupper(Str::random(6));
            }
        });
    }

    // Relationships
    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function prices()
    {
        return $this->hasMany(ProductPrice::class);
    }

    public function currentPrice()
    {
        return $this->hasOne(ProductPrice::class)
            ->where('effective_from', '<=', now())
            ->where(fn($q) => $q->whereNull('effective_to')->orWhere('effective_to', '>=', now()))
            ->latestOfMany('effective_from');
    }

    public function stocks()
    {
        return $this->hasMany(Stock::class);
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}

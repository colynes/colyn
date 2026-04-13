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
        'supplier_name',
        'supplier_contact',
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
        static::saving(function (Product $product) {
            if (blank($product->slug)) {
                $product->slug = static::generateUniqueSlug($product->name, $product->exists ? $product->getKey() : null);
            }

            if (blank($product->sku)) {
                $product->sku = static::generateUniqueSku(ignoreId: $product->exists ? $product->getKey() : null);
            }
        });
    }

    public static function generateUniqueSlug(?string $value, ?int $ignoreId = null): string
    {
        $base = Str::slug((string) $value);

        if ($base === '') {
            $base = 'product';
        }

        $slug = $base;
        $suffix = 2;

        while (static::query()
            ->where('slug', $slug)
            ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
            ->exists()) {
            $slug = $base . '-' . $suffix;
            $suffix++;
        }

        return $slug;
    }

    public static function generateUniqueSku(?string $value = null, ?int $ignoreId = null): string
    {
        $base = static::normalizeSku($value);

        if ($base !== null) {
            $sku = $base;
            $suffix = 2;

            while (static::query()
                ->where('sku', $sku)
                ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
                ->exists()) {
                $sku = $base . '-' . $suffix;
                $suffix++;
            }

            return $sku;
        }

        do {
            $sku = 'SKU-' . strtoupper(Str::random(6));
        } while (static::query()
            ->where('sku', $sku)
            ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
            ->exists());

        return $sku;
    }

    protected static function normalizeSku(?string $value): ?string
    {
        $value = trim((string) $value);

        if ($value === '') {
            return null;
        }

        $normalized = preg_replace('/[^A-Z0-9]+/', '-', strtoupper($value));
        $normalized = trim((string) $normalized, '-');

        return $normalized !== '' ? $normalized : null;
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

    public function salesTargets()
    {
        return $this->hasMany(SalesTarget::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}

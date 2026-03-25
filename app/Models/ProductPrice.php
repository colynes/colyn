<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductPrice extends Model
{
    protected $fillable = [
        'product_id',
        'price',
        'promo_price',
        'effective_from',
        'effective_to',
    ];

    protected $casts = [
        'price'          => 'decimal:2',
        'promo_price'    => 'decimal:2',
        'effective_from' => 'datetime',
        'effective_to'   => 'datetime',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function getEffectivePriceAttribute(): float
    {
        return $this->promo_price ?? $this->price;
    }
}

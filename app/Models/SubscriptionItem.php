<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubscriptionItem extends Model
{
    protected $fillable = [
        'subscription_id',
        'item_type',
        'product_id',
        'pack_id',
        'item_name',
        'quantity',
        'unit',
        'unit_price',
        'line_total',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'line_total' => 'decimal:2',
    ];

    public function subscription()
    {
        return $this->belongsTo(Subscription::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function pack()
    {
        return $this->belongsTo(Pack::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Stock extends Model
{
    protected $fillable = [
        'product_id',
        'branch_id',
        'quantity',
        'min_stock',
        'reorder_level',
    ];

    protected $casts = [
        'quantity'      => 'decimal:2',
        'min_stock'     => 'decimal:2',
        'reorder_level' => 'decimal:2',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function movements()
    {
        return $this->hasMany(StockMovement::class);
    }

    public function getIsLowStockAttribute(): bool
    {
        return $this->quantity <= $this->reorder_level;
    }
}

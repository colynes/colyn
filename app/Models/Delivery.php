<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Delivery extends Model
{
    protected $fillable = [
        'delivery_number',
        'order_id',
        'branch_id',
        'status',
        'delivery_fee',
        'tracking_number',
        'driver_id',
    ];

    protected $casts = [
        'delivery_fee' => 'decimal:2',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function items()
    {
        return $this->hasMany(DeliveryItem::class);
    }
}

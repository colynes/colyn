<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Subscription extends Model
{
    protected $fillable = [
        'customer_id',
        'customer_name',
        'phone',
        'email',
        'frequency',
        'delivery_days',
        'products',
        'value',
        'next_delivery',
        'status',
    ];

    protected $casts = [
        'delivery_days' => 'array',
        'products' => 'array',
        'value' => 'decimal:2',
        'next_delivery' => 'date',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}


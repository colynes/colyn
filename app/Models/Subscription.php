<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Subscription extends Model
{
    public const STATUS_ACTIVE = 'Active';
    public const STATUS_PAUSED = 'Paused';
    public const STATUS_CANCELLED = 'Cancelled';

    protected $fillable = [
        'customer_id',
        'subscription_request_id',
        'customer_name',
        'phone',
        'email',
        'frequency',
        'delivery_days',
        'products',
        'start_date',
        'delivery_address',
        'notes',
        'value',
        'agreed_price',
        'next_delivery',
        'status',
        'paused_at',
        'cancelled_at',
    ];

    protected $casts = [
        'delivery_days' => 'array',
        'products' => 'array',
        'start_date' => 'date',
        'value' => 'decimal:2',
        'agreed_price' => 'decimal:2',
        'next_delivery' => 'date',
        'paused_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function request()
    {
        return $this->belongsTo(SubscriptionRequest::class, 'subscription_request_id');
    }

    public function items()
    {
        return $this->hasMany(SubscriptionItem::class);
    }

    public function orderLogs()
    {
        return $this->hasMany(SubscriptionOrderLog::class);
    }
}

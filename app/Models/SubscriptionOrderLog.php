<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubscriptionOrderLog extends Model
{
    protected $fillable = [
        'subscription_id',
        'order_id',
        'delivery_date',
    ];

    protected $casts = [
        'delivery_date' => 'date',
    ];

    public function subscription()
    {
        return $this->belongsTo(Subscription::class);
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}

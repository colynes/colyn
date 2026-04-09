<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'order_number',
        'customer_id',
        'branch_id',
        'status',
        'subtotal',
        'tax',
        'total',
        'payment_method',
        'delivery_region',
        'delivery_area',
        'delivery_address',
        'delivery_latitude',
        'delivery_longitude',
        'delivery_notes',
        'delivery_landmark',
        'delivery_phone',
        'fulfillment_method',
        'pickup_time',
        'scheduled_delivery_date',
        'scheduled_pickup_date',
        'pickup_reminder_sent_at',
        'is_paid',
        'notes',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'tax'      => 'decimal:2',
        'total'    => 'decimal:2',
        'delivery_latitude' => 'float',
        'delivery_longitude' => 'float',
        'scheduled_delivery_date' => 'date',
        'scheduled_pickup_date' => 'date',
        'pickup_reminder_sent_at' => 'datetime',
        'is_paid'  => 'boolean',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function deliveries()
    {
        return $this->hasMany(Delivery::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }
}

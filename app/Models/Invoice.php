<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    protected $fillable = [
        'invoice_number',
        'order_id',
        'subscription_id',
        'invoice_date',
        'due_date',
        'tin_number',
        'customer_name',
        'customer_contact',
        'bill_to_address',
        'deliver_to_name',
        'deliver_to_address',
        'customer_city',
        'subtotal',
        'tax',
        'discount',
        'total',
        'currency',
        'bank_name',
        'account_name',
        'account_number',
        'status',
        'notes',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'due_date' => 'date',
        'subtotal' => 'decimal:2',
        'tax' => 'decimal:2',
        'discount' => 'decimal:2',
        'total' => 'decimal:2',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function subscription()
    {
        return $this->belongsTo(Subscription::class);
    }

    public function items()
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }
}

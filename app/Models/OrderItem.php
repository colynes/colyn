<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    protected $fillable = ['order_id', 'product_id', 'quantity', 'price', 'unit_price', 'subtotal', 'notes'];

    protected $casts = [
        'price'    => 'decimal:2',
        'subtotal' => 'decimal:2',
        'quantity' => 'decimal:2',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function metadata(): array
    {
        if (!is_string($this->notes) || $this->notes === '') {
            return [];
        }

        $decoded = json_decode($this->notes, true);

        return is_array($decoded) ? $decoded : [];
    }

    public function displayName(): string
    {
        return $this->product?->name
            ?? ($this->metadata()['name'] ?? 'Item');
    }

    public function displayDescription(): ?string
    {
        return $this->metadata()['description'] ?? null;
    }

    public function displayType(): string
    {
        return $this->metadata()['type'] ?? 'product';
    }
}

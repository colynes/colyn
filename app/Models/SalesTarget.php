<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SalesTarget extends Model
{
    public const TYPE_DAILY = 'daily';
    public const TYPE_WEEKLY = 'weekly';
    public const TYPE_MONTHLY = 'monthly';

    protected $fillable = [
        'product_id',
        'target_type',
        'target_amount',
        'target_date',
        'week_start',
        'week_end',
        'target_month',
        'target_year',
        'notes',
        'start_date',
        'end_date',
        'created_by',
    ];

    protected $casts = [
        'target_amount' => 'decimal:2',
        'target_date' => 'date',
        'week_start' => 'date',
        'week_end' => 'date',
        'target_month' => 'integer',
        'target_year' => 'integer',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public static function supportedTypes(): array
    {
        return [
            self::TYPE_DAILY,
            self::TYPE_WEEKLY,
            self::TYPE_MONTHLY,
        ];
    }

    public function scopeOfType($query, string $type)
    {
        return $query->where('target_type', $type);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

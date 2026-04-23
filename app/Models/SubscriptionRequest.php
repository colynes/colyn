<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

class SubscriptionRequest extends Model
{
    public const STATUS_PENDING_REVIEW = 'pending_review';
    public const STATUS_QUOTED = 'quoted';
    public const STATUS_ACCEPTED = 'accepted';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_EXPIRED = 'expired';

    protected static array $databaseColumnPresence = [];

    protected $fillable = [
        'request_number',
        'user_id',
        'customer_id',
        'resubmitted_from_request_id',
        'frequency',
        'delivery_days',
        'start_date',
        'end_date',
        'delivery_address',
        'notes',
        'offered_price',
        'quoted_price',
        'quoted_message',
        'quote_valid_until',
        'quoted_at',
        'status',
        'reviewed_by',
        'reviewed_at',
        'customer_responded_at',
        'response_message',
        'rejection_reason',
        'subscription_id',
        'archived_at',
    ];

    protected $casts = [
        'delivery_days' => 'array',
        'start_date' => 'date',
        'end_date' => 'date',
        'offered_price' => 'decimal:2',
        'quoted_price' => 'decimal:2',
        'quote_valid_until' => 'date',
        'quoted_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'customer_responded_at' => 'datetime',
        'archived_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function resubmittedFrom()
    {
        return $this->belongsTo(self::class, 'resubmitted_from_request_id');
    }

    public function resubmissions()
    {
        return $this->hasMany(self::class, 'resubmitted_from_request_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function items()
    {
        return $this->hasMany(SubscriptionRequestItem::class);
    }

    public function subscription()
    {
        return $this->belongsTo(Subscription::class);
    }

    public function isQuoteExpired(): bool
    {
        return $this->status === self::STATUS_QUOTED
            && $this->quote_valid_until
            && $this->quote_valid_until->lt(now()->startOfDay());
    }

    public function isArchived(): bool
    {
        return self::hasDatabaseColumn('archived_at') && $this->archived_at !== null;
    }

    public static function hasDatabaseColumn(string $column): bool
    {
        if (!array_key_exists($column, self::$databaseColumnPresence)) {
            self::$databaseColumnPresence[$column] = Schema::hasTable('subscription_requests')
                && Schema::hasColumn('subscription_requests', $column);
        }

        return self::$databaseColumnPresence[$column];
    }
}

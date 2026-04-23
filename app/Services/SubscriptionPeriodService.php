<?php

namespace App\Services;

use App\Models\Subscription;
use App\Support\SubscriptionScheduler;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class SubscriptionPeriodService
{
    public const TYPE_DAYS = 'days';
    public const TYPE_MONTH = 'month';
    public const TYPE_TWO_MONTHS = 'two_months';

    public function normalizePeriod(mixed $startDate, mixed $endDate): array
    {
        $start = $this->dateOrToday($startDate);
        $end = $endDate ? Carbon::parse((string) $endDate)->startOfDay() : $start->copy()->addMonthNoOverflow();

        if ($end->lt($start)) {
            throw ValidationException::withMessages([
                'end_date' => [__('ui.store.subscriptions.validation.end_date_after_start')],
            ]);
        }

        $duration = $this->inferDuration($start, $end);

        return [
            'start_date' => $start->toDateString(),
            'end_date' => $end->toDateString(),
            'duration_type' => $duration['duration_type'],
            'duration_days' => $duration['duration_days'],
        ];
    }

    public function inferDuration(Carbon $start, Carbon $end): array
    {
        $start = $start->copy()->startOfDay();
        $end = $end->copy()->startOfDay();

        if ($this->matchesCalendarMonths($start, $end, 2)) {
            return [
                'duration_type' => self::TYPE_TWO_MONTHS,
                'duration_days' => max(1, $start->diffInDays($end)),
            ];
        }

        if ($this->matchesCalendarMonths($start, $end, 1)) {
            return [
                'duration_type' => self::TYPE_MONTH,
                'duration_days' => max(1, $start->diffInDays($end)),
            ];
        }

        return [
            'duration_type' => self::TYPE_DAYS,
            'duration_days' => max(1, $start->diffInDays($end) + 1),
        ];
    }

    public function renewalPreview(Subscription $subscription): array
    {
        $subscription->loadMissing('items.product', 'items.pack');

        $today = now()->startOfDay();
        $start = $subscription->start_date?->copy()?->startOfDay()
            ?? $subscription->next_delivery?->copy()?->startOfDay()
            ?? $today->copy();
        $currentEnd = $subscription->end_date?->copy()?->startOfDay()
            ?? $start->copy()->addMonthNoOverflow();
        $duration = $this->resolveDuration($subscription, $start, $currentEnd);
        $isExpired = $currentEnd->lt($today);
        $newStart = $this->renewalStartDate($subscription, $today);
        $newEnd = $this->renewalEndDate($newStart, $duration['duration_type'], $duration['duration_days']);

        return [
            'duration_type' => $duration['duration_type'],
            'duration_days' => $duration['duration_days'],
            'duration_label' => $this->durationLabel($duration['duration_type'], $duration['duration_days']),
            'current_start_date' => $start->toDateString(),
            'current_start_date_label' => $this->formatDate($start),
            'current_end_date' => $currentEnd->toDateString(),
            'current_end_date_label' => $this->formatDate($currentEnd),
            'new_start_date' => $newStart->toDateString(),
            'new_start_date_label' => $this->formatDate($newStart),
            'new_end_date' => $newEnd->toDateString(),
            'new_end_date_label' => $this->formatDate($newEnd),
            'is_expired' => $isExpired,
        ];
    }

    public function renew(Subscription $subscription): Subscription
    {
        $preview = $this->renewalPreview($subscription);
        $newStart = Carbon::parse($preview['new_start_date'])->startOfDay();
        $newEnd = Carbon::parse($preview['new_end_date'])->startOfDay();

        if ($newEnd->lte(now()->startOfDay())) {
            throw ValidationException::withMessages([
                'subscription' => [__('ui.store.subscriptions.validation.future_end_date')],
            ]);
        }

        $subscription->update([
            'start_date' => $newStart->toDateString(),
            'end_date' => $newEnd->toDateString(),
            'duration_type' => $preview['duration_type'],
            'duration_days' => $preview['duration_days'],
            'next_delivery' => $this->nextDeliveryForRenewal($subscription, $newStart),
            'status' => Subscription::STATUS_ACTIVE,
            'paused_at' => null,
            'cancelled_at' => null,
        ]);

        return $subscription->fresh(['items.product', 'items.pack', 'customer', 'request']);
    }

    public function displayStatus(Subscription $subscription): array
    {
        $storedStatus = strtolower((string) $subscription->status);

        if ($storedStatus === 'pending') {
            return ['status' => 'Pending', 'tone' => 'pending'];
        }

        if ($storedStatus === 'paused') {
            return ['status' => 'Paused', 'tone' => 'paused'];
        }

        if (in_array($storedStatus, ['cancelled', 'inactive'], true)) {
            return ['status' => 'Cancelled', 'tone' => 'cancelled'];
        }

        $end = $subscription->end_date?->copy()?->startOfDay();

        if (! $end) {
            return ['status' => Subscription::STATUS_ACTIVE, 'tone' => 'active'];
        }

        $today = now()->startOfDay();

        if ($end->lt($today)) {
            return ['status' => 'Expired', 'tone' => 'expired'];
        }

        if ($today->diffInDays($end, false) <= 7) {
            return ['status' => 'Expiring Soon', 'tone' => 'expiring_soon'];
        }

        return ['status' => Subscription::STATUS_ACTIVE, 'tone' => 'active'];
    }

    public function durationLabel(?string $durationType, ?int $durationDays): string
    {
        return match ($durationType) {
            self::TYPE_MONTH => '1 month',
            self::TYPE_TWO_MONTHS => '2 months',
            default => number_format(max(1, (int) $durationDays)) . ' days',
        };
    }

    protected function resolveDuration(Subscription $subscription, Carbon $start, Carbon $end): array
    {
        $durationType = (string) ($subscription->duration_type ?: '');
        $durationDays = (int) ($subscription->duration_days ?: 0);

        if (in_array($durationType, [self::TYPE_DAYS, self::TYPE_MONTH, self::TYPE_TWO_MONTHS], true)
            && ($durationType !== self::TYPE_DAYS || $durationDays > 0)) {
            return [
                'duration_type' => $durationType,
                'duration_days' => $durationDays > 0 ? $durationDays : max(1, $start->diffInDays($end)),
            ];
        }

        return $this->inferDuration($start, $end);
    }

    protected function renewalStartDate(Subscription $subscription, Carbon $today): Carbon
    {
        return SubscriptionScheduler::nextDeliveryDate(
            (string) $subscription->frequency,
            (array) ($subscription->delivery_days ?? []),
            $today->copy()
        )->startOfDay();
    }

    protected function renewalEndDate(Carbon $start, string $durationType, int $durationDays): Carbon
    {
        return match ($durationType) {
            self::TYPE_MONTH => $start->copy()->addMonthNoOverflow(),
            self::TYPE_TWO_MONTHS => $start->copy()->addMonthsNoOverflow(2),
            default => $start->copy()->addDays(max(1, $durationDays) - 1),
        };
    }

    protected function nextDeliveryForRenewal(Subscription $subscription, Carbon $newStart): string
    {
        return SubscriptionScheduler::nextDeliveryDate(
            (string) $subscription->frequency,
            (array) ($subscription->delivery_days ?? []),
            $newStart->copy()
        )->toDateString();
    }

    protected function matchesCalendarMonths(Carbon $start, Carbon $end, int $months): bool
    {
        $exactEnd = $start->copy()->addMonthsNoOverflow($months);
        $inclusiveEnd = $start->copy()->addMonthsNoOverflow($months)->subDay();

        return $end->isSameDay($exactEnd) || $end->isSameDay($inclusiveEnd);
    }

    protected function dateOrToday(mixed $date): Carbon
    {
        return $date ? Carbon::parse((string) $date)->startOfDay() : now()->startOfDay();
    }

    protected function formatDate(Carbon $date): string
    {
        return $date->format('M j, Y');
    }
}

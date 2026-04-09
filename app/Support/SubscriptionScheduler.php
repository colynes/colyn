<?php

namespace App\Support;

use Carbon\Carbon;

class SubscriptionScheduler
{
    protected const DAY_MAP = [
        'Monday' => 'Mon',
        'Mon' => 'Mon',
        'Tuesday' => 'Tue',
        'Tue' => 'Tue',
        'Wednesday' => 'Wed',
        'Wed' => 'Wed',
        'Thursday' => 'Thu',
        'Thu' => 'Thu',
        'Friday' => 'Fri',
        'Fri' => 'Fri',
        'Saturday' => 'Sat',
        'Sat' => 'Sat',
        'Sunday' => 'Sun',
        'Sun' => 'Sun',
        'Weekdays' => 'Mon-Fri',
        'Weekdays only' => 'Mon-Fri',
        'Weekday' => 'Mon-Fri',
        'Mon-Fri' => 'Mon-Fri',
        'Weekends' => 'Sat-Sun',
        'Weekends only' => 'Sat-Sun',
        'Weekend' => 'Sat-Sun',
        'Sat-Sun' => 'Sat-Sun',
        'First Saturday' => 'Sat',
    ];

    protected const WEEKDAY_INDEX = [
        'Mon' => 1,
        'Tue' => 2,
        'Wed' => 3,
        'Thu' => 4,
        'Fri' => 5,
        'Sat' => 6,
        'Sun' => 7,
    ];

    public static function normalizeDeliveryDays(array $days): array
    {
        return collect($days)
            ->map(fn ($day) => self::DAY_MAP[(string) $day] ?? (string) $day)
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    public static function nextDeliveryDate(string $frequency, array $deliveryDays, Carbon $fromDate): Carbon
    {
        $anchor = $fromDate->copy()->startOfDay();
        $allowedWeekdays = self::resolveAllowedWeekdays($frequency, $deliveryDays, $anchor);

        $candidate = $anchor->copy();
        for ($index = 0; $index < 14; $index++) {
            if (in_array($candidate->dayOfWeekIso, $allowedWeekdays, true)) {
                return $candidate->copy();
            }

            $candidate->addDay();
        }

        return $candidate->copy();
    }

    protected static function resolveAllowedWeekdays(string $frequency, array $deliveryDays, Carbon $anchor): array
    {
        $normalizedFrequency = strtolower(trim($frequency));
        $normalizedDays = self::normalizeDeliveryDays($deliveryDays);

        $resolved = collect($normalizedDays)
            ->flatMap(function (string $day) {
                if ($day === 'Mon-Fri') {
                    return [1, 2, 3, 4, 5];
                }
                if ($day === 'Sat-Sun') {
                    return [6, 7];
                }

                $index = self::WEEKDAY_INDEX[$day] ?? null;

                return $index ? [$index] : [];
            })
            ->unique()
            ->sort()
            ->values()
            ->all();

        if ($resolved !== []) {
            return $resolved;
        }

        if ($normalizedFrequency === 'daily') {
            return [1, 2, 3, 4, 5, 6, 7];
        }

        if (in_array($normalizedFrequency, ['weekdays only', 'weekdays'], true)) {
            return [1, 2, 3, 4, 5];
        }

        if (in_array($normalizedFrequency, ['weekends only', 'weekends'], true)) {
            return [6, 7];
        }

        return [$anchor->dayOfWeekIso];
    }
}

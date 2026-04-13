<?php

namespace App\Services;

use App\Models\Order;
use App\Models\SalesTarget;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SalesTargetService
{
    /**
     * "Completed/valid" order statuses used for sales reporting.
     */
    public const REPORTABLE_ORDER_STATUSES = [
        'dispatched',
        'delivered',
        'completed',
    ];

    public function saveTargets(array $targets, ?int $createdBy = null): Collection
    {
        return DB::transaction(function () use ($targets, $createdBy) {
            return collect($targets)->map(function (array $rawTarget) use ($createdBy) {
                $normalized = $this->normalizeTargetInput($rawTarget);

                if (!empty($normalized['id'])) {
                    $model = SalesTarget::query()->find((int) $normalized['id']);

                    if (!$model) {
                        throw ValidationException::withMessages([
                            'targets' => ['One of the selected targets no longer exists. Please refresh and try again.'],
                        ]);
                    }

                    $model->fill($normalized['values']);
                    $model->created_by = $createdBy;
                    $model->save();

                    return $model->fresh();
                }

                return SalesTarget::query()->updateOrCreate(
                    $normalized['match'],
                    $normalized['values'] + ['created_by' => $createdBy]
                );
            })->values();
        });
    }

    public function saveTarget(array $rawTarget, ?int $createdBy = null, bool $overwrite = false): array
    {
        return DB::transaction(function () use ($rawTarget, $createdBy, $overwrite) {
            $normalized = $this->normalizeTargetInput($rawTarget);
            $editingId = !empty($normalized['id']) ? (int) $normalized['id'] : null;
            $editingTarget = $editingId ? SalesTarget::query()->find($editingId) : null;

            if ($editingId && !$editingTarget) {
                throw ValidationException::withMessages([
                    'target' => ['The target you are trying to edit no longer exists. Please refresh and try again.'],
                ]);
            }

            $conflict = $this->findConflict($normalized, $editingId);

            if ($conflict && !$overwrite) {
                return [
                    'status' => 'conflict',
                    'target' => $conflict,
                    'overwritten' => false,
                ];
            }

            if ($conflict) {
                $conflict->fill($normalized['values']);
                $conflict->save();

                if ($editingTarget && $editingTarget->id !== $conflict->id) {
                    $editingTarget->delete();
                }

                return [
                    'status' => 'saved',
                    'target' => $conflict->fresh(),
                    'overwritten' => true,
                ];
            }

            if ($editingTarget) {
                $editingTarget->fill($normalized['values']);
                $editingTarget->save();

                return [
                    'status' => 'saved',
                    'target' => $editingTarget->fresh(),
                    'overwritten' => false,
                ];
            }

            $createdTarget = SalesTarget::query()->create(
                $normalized['values'] + ['created_by' => $createdBy]
            );

            return [
                'status' => 'saved',
                'target' => $createdTarget->fresh(),
                'overwritten' => false,
            ];
        });
    }

    public function buildPerformance(CarbonInterface $startDate, CarbonInterface $endDate): array
    {
        [$start, $end] = $this->normalizeRange($startDate, $endDate);

        $resolvedTargets = $this->resolveDailyTargets($start, $end)->keyBy('date');
        $actualsByDate = $this->actualSalesByDate($start, $end)->keyBy('date');

        $dailyTrend = collect(CarbonPeriod::create($start->copy()->startOfDay(), $end->copy()->startOfDay()))
            ->map(function (CarbonInterface $date) use ($resolvedTargets, $actualsByDate) {
                $dateKey = $date->toDateString();
                $targetRow = $resolvedTargets->get($dateKey);
                $actualRow = $actualsByDate->get($dateKey);

                $target = round((float) ($targetRow['target'] ?? 0), 2);
                $actual = round((float) ($actualRow['actual'] ?? 0), 2);
                $variance = round($actual - $target, 2);
                $achievement = $target > 0
                    ? round(($actual / $target) * 100, 1)
                    : ($actual > 0 ? 100.0 : 0.0);

                return [
                    'date' => $dateKey,
                    'label' => $date->format('M j'),
                    'target' => $target,
                    'actual' => $actual,
                    'variance' => $variance,
                    'achievement_percentage' => $achievement,
                    'orders_count' => (int) ($actualRow['orders_count'] ?? 0),
                    'source_type' => $targetRow['source_type'] ?? 'none',
                ];
            })
            ->values();

        return [
            'start_date' => $start->toDateString(),
            'end_date' => $end->toDateString(),
            'daily_trend' => $dailyTrend,
            'daily_summary' => $this->summarizeTrend($dailyTrend),
            'weekly_summary' => $this->groupTrend($dailyTrend, 'weekly'),
            'monthly_summary' => $this->groupTrend($dailyTrend, 'monthly'),
            'targets_in_range' => $this->listTargets($start, $end),
        ];
    }

    public function resolveDailyTargets(CarbonInterface $startDate, CarbonInterface $endDate): Collection
    {
        [$start, $end] = $this->normalizeRange($startDate, $endDate);
        $targets = $this->listTargets($start, $end);

        $dailyTargets = $targets
            ->where('target_type', SalesTarget::TYPE_DAILY)
            ->filter(fn (SalesTarget $target) => filled($target->target_date));

        $weeklyTargets = $targets
            ->where('target_type', SalesTarget::TYPE_WEEKLY)
            ->filter(fn (SalesTarget $target) => filled($target->week_start) && filled($target->week_end));

        $monthlyTargets = $targets
            ->where('target_type', SalesTarget::TYPE_MONTHLY)
            ->filter(fn (SalesTarget $target) => filled($target->target_year) && filled($target->target_month));

        $dailyMap = [];
        foreach ($dailyTargets as $target) {
            $key = $target->target_date->toDateString();
            if (!isset($dailyMap[$key])) {
                $dailyMap[$key] = $target;
            }
        }

        $monthlyMap = [];
        foreach ($monthlyTargets as $target) {
            $key = sprintf('%04d-%02d', (int) $target->target_year, (int) $target->target_month);
            if (!isset($monthlyMap[$key])) {
                $monthlyMap[$key] = $target;
            }
        }

        return collect(CarbonPeriod::create($start->copy()->startOfDay(), $end->copy()->startOfDay()))
            ->map(function (CarbonInterface $date) use ($dailyMap, $weeklyTargets, $monthlyMap) {
                $dateKey = $date->toDateString();

                if (isset($dailyMap[$dateKey])) {
                    $target = $dailyMap[$dateKey];

                    return [
                        'date' => $dateKey,
                        'target' => round((float) $target->target_amount, 2),
                        'source_type' => SalesTarget::TYPE_DAILY,
                        'source_id' => $target->id,
                    ];
                }

                foreach ($weeklyTargets as $weeklyTarget) {
                    $weekStart = $weeklyTarget->week_start->copy()->startOfDay();
                    $weekEnd = $weeklyTarget->week_end->copy()->startOfDay();

                    if ($date->betweenIncluded($weekStart, $weekEnd)) {
                        $daysInWindow = max($weekStart->diffInDays($weekEnd) + 1, 1);

                        return [
                            'date' => $dateKey,
                            'target' => round((float) $weeklyTarget->target_amount / $daysInWindow, 2),
                            'source_type' => SalesTarget::TYPE_WEEKLY,
                            'source_id' => $weeklyTarget->id,
                        ];
                    }
                }

                $monthKey = $date->format('Y-m');
                if (isset($monthlyMap[$monthKey])) {
                    $monthlyTarget = $monthlyMap[$monthKey];
                    $daysInMonth = max($date->daysInMonth, 1);

                    return [
                        'date' => $dateKey,
                        'target' => round((float) $monthlyTarget->target_amount / $daysInMonth, 2),
                        'source_type' => SalesTarget::TYPE_MONTHLY,
                        'source_id' => $monthlyTarget->id,
                    ];
                }

                return [
                    'date' => $dateKey,
                    'target' => 0.0,
                    'source_type' => 'none',
                    'source_id' => null,
                ];
            })
            ->values();
    }

    public function resolveTargetForDate(CarbonInterface $date): array
    {
        $target = $this->resolveDailyTargets($date, $date)->first();

        return $target ?? [
            'date' => $date->toDateString(),
            'target' => 0.0,
            'source_type' => 'none',
            'source_id' => null,
        ];
    }

    public function actualSalesByDate(CarbonInterface $startDate, CarbonInterface $endDate): Collection
    {
        [$start, $end] = $this->normalizeRange($startDate, $endDate);

        return Order::query()
            ->selectRaw('DATE(created_at) as sales_date, SUM(total) as total_amount, COUNT(*) as orders_count')
            ->whereBetween('created_at', [$start->copy()->startOfDay(), $end->copy()->endOfDay()])
            ->whereRaw(
                'LOWER(COALESCE(status, "")) IN (' . implode(',', array_fill(0, count(self::REPORTABLE_ORDER_STATUSES), '?')) . ')',
                self::REPORTABLE_ORDER_STATUSES
            )
            ->groupBy('sales_date')
            ->orderBy('sales_date')
            ->get()
            ->map(fn ($row) => [
                'date' => (string) $row->sales_date,
                'actual' => round((float) $row->total_amount, 2),
                'orders_count' => (int) $row->orders_count,
            ]);
    }

    public function listTargets(?CarbonInterface $startDate = null, ?CarbonInterface $endDate = null): Collection
    {
        $query = SalesTarget::query()
            ->whereIn('target_type', SalesTarget::supportedTypes())
            ->orderByDesc('updated_at')
            ->orderByDesc('id');

        if ($startDate && $endDate) {
            [$start, $end] = $this->normalizeRange($startDate, $endDate);
            $startMonthKey = ((int) $start->year * 100) + (int) $start->month;
            $endMonthKey = ((int) $end->year * 100) + (int) $end->month;

            $query->where(function ($builder) use ($start, $end, $startMonthKey, $endMonthKey) {
                $builder
                    ->where(function ($dailyQuery) use ($start, $end) {
                        $dailyQuery
                            ->where('target_type', SalesTarget::TYPE_DAILY)
                            ->whereBetween('target_date', [$start->toDateString(), $end->toDateString()]);
                    })
                    ->orWhere(function ($weeklyQuery) use ($start, $end) {
                        $weeklyQuery
                            ->where('target_type', SalesTarget::TYPE_WEEKLY)
                            ->whereDate('week_start', '<=', $end->toDateString())
                            ->whereDate('week_end', '>=', $start->toDateString());
                    })
                    ->orWhere(function ($monthlyQuery) use ($startMonthKey, $endMonthKey) {
                        $monthlyQuery
                            ->where('target_type', SalesTarget::TYPE_MONTHLY)
                            ->whereNotNull('target_year')
                            ->whereNotNull('target_month')
                            ->whereRaw('(target_year * 100 + target_month) BETWEEN ? AND ?', [$startMonthKey, $endMonthKey]);
                    });
            });
        }

        return $query->get();
    }

    public function describeTarget(SalesTarget $target): array
    {
        $targetMonth = $target->target_month ? (int) $target->target_month : null;
        $targetYear = $target->target_year ? (int) $target->target_year : null;
        $monthKey = ($targetMonth && $targetYear)
            ? sprintf('%04d-%02d', $targetYear, $targetMonth)
            : null;

        $label = match ($target->target_type) {
            SalesTarget::TYPE_DAILY => 'Daily Target',
            SalesTarget::TYPE_WEEKLY => 'Weekly Target',
            SalesTarget::TYPE_MONTHLY => 'Monthly Target',
            default => 'Sales Target',
        };

        $scope = match ($target->target_type) {
            SalesTarget::TYPE_DAILY => optional($target->target_date)->toDateString(),
            SalesTarget::TYPE_WEEKLY => collect([
                optional($target->week_start)->toDateString(),
                optional($target->week_end)->toDateString(),
            ])->filter()->implode(' to '),
            SalesTarget::TYPE_MONTHLY => $monthKey,
            default => null,
        };

        return [
            'id' => $target->id,
            'target_type' => $target->target_type,
            'target_amount' => (float) $target->target_amount,
            'target_date' => optional($target->target_date)->toDateString(),
            'week_start' => optional($target->week_start)->toDateString(),
            'week_end' => optional($target->week_end)->toDateString(),
            'target_month' => $targetMonth,
            'target_year' => $targetYear,
            'month_key' => $monthKey,
            'notes' => $target->notes,
            'source_label' => $label,
            'scope_label' => $scope,
            'created_at' => optional($target->created_at)->toDateTimeString(),
            'updated_at' => optional($target->updated_at)->toDateTimeString(),
        ];
    }

    private function normalizeTargetInput(array $rawTarget): array
    {
        $targetType = strtolower((string) ($rawTarget['target_type'] ?? ''));
        $targetAmount = (float) ($rawTarget['target_amount'] ?? 0);
        $notes = trim((string) ($rawTarget['notes'] ?? ''));

        if (!in_array($targetType, SalesTarget::supportedTypes(), true)) {
            throw ValidationException::withMessages([
                'targets' => ['Invalid target type. Allowed values are daily, weekly, and monthly.'],
            ]);
        }

        if ($targetAmount <= 0) {
            throw ValidationException::withMessages([
                'targets' => ['Target amount must be greater than zero.'],
            ]);
        }

        $startDate = null;
        $endDate = null;
        $targetDate = null;
        $weekStart = null;
        $weekEnd = null;
        $targetMonth = null;
        $targetYear = null;

        $match = [
            'product_id' => null,
            'target_type' => $targetType,
        ];

        if ($targetType === SalesTarget::TYPE_DAILY) {
            $targetDate = $this->parseDateOrFail($rawTarget['target_date'] ?? null, 'targets');
            $startDate = $targetDate;
            $endDate = $targetDate;
            $match['target_date'] = $targetDate->toDateString();
        }

        if ($targetType === SalesTarget::TYPE_WEEKLY) {
            $weekStart = $this->parseDateOrFail($rawTarget['week_start'] ?? null, 'targets');
            $weekEnd = $this->parseDateOrFail($rawTarget['week_end'] ?? null, 'targets');

            if ($weekStart->gt($weekEnd)) {
                [$weekStart, $weekEnd] = [$weekEnd->copy(), $weekStart->copy()];
            }

            $startDate = $weekStart->copy();
            $endDate = $weekEnd->copy();
            $match['week_start'] = $weekStart->toDateString();
            $match['week_end'] = $weekEnd->toDateString();
        }

        if ($targetType === SalesTarget::TYPE_MONTHLY) {
            $monthKey = trim((string) ($rawTarget['month_key'] ?? ''));

            if ($monthKey !== '' && preg_match('/^\d{4}-\d{2}$/', $monthKey) === 1) {
                [$targetYear, $targetMonth] = array_map('intval', explode('-', $monthKey));
            } else {
                $targetMonth = (int) ($rawTarget['target_month'] ?? 0);
                $targetYear = (int) ($rawTarget['target_year'] ?? 0);
            }

            if ($targetMonth < 1 || $targetMonth > 12 || $targetYear < 2000 || $targetYear > 9999) {
                throw ValidationException::withMessages([
                    'targets' => ['Monthly target requires a valid month and year.'],
                ]);
            }

            $startDate = Carbon::create($targetYear, $targetMonth, 1)->startOfDay();
            $endDate = $startDate->copy()->endOfMonth()->startOfDay();
            $match['target_month'] = $targetMonth;
            $match['target_year'] = $targetYear;
        }

        return [
            'id' => $rawTarget['id'] ?? null,
            'match' => $match,
            'values' => [
                'product_id' => null,
                'target_type' => $targetType,
                'target_amount' => round($targetAmount, 2),
                'target_date' => $targetDate?->toDateString(),
                'week_start' => $weekStart?->toDateString(),
                'week_end' => $weekEnd?->toDateString(),
                'target_month' => $targetMonth,
                'target_year' => $targetYear,
                'notes' => $notes !== '' ? $notes : null,
                // Legacy compatibility fields retained in schema.
                'start_date' => $startDate?->toDateString(),
                'end_date' => $endDate?->toDateString(),
            ],
        ];
    }

    private function parseDateOrFail(mixed $value, string $field): Carbon
    {
        if (blank($value)) {
            throw ValidationException::withMessages([
                $field => ['A required target date is missing.'],
            ]);
        }

        try {
            return Carbon::parse((string) $value)->startOfDay();
        } catch (\Throwable $exception) {
            throw ValidationException::withMessages([
                $field => ['One of the provided dates is invalid.'],
            ]);
        }
    }

    private function normalizeRange(CarbonInterface $startDate, CarbonInterface $endDate): array
    {
        $start = $startDate->copy()->startOfDay();
        $end = $endDate->copy()->endOfDay();

        if ($start->gt($end)) {
            [$start, $end] = [$end->copy()->startOfDay(), $start->copy()->endOfDay()];
        }

        return [$start, $end];
    }

    private function findConflict(array $normalized, ?int $ignoreId = null): ?SalesTarget
    {
        return SalesTarget::query()
            ->where($normalized['match'])
            ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->first();
    }

    private function summarizeTrend(Collection $trend): array
    {
        $totalTarget = round((float) $trend->sum('target'), 2);
        $totalActual = round((float) $trend->sum('actual'), 2);
        $variance = round($totalActual - $totalTarget, 2);
        $achievement = $totalTarget > 0 ? round(($totalActual / $totalTarget) * 100, 1) : ($totalActual > 0 ? 100.0 : 0.0);

        return [
            'total_target' => $totalTarget,
            'total_actual' => $totalActual,
            'variance' => $variance,
            'achievement_percentage' => $achievement,
            'days_above_target' => $trend->filter(fn ($row) => $row['actual'] > $row['target'] && $row['target'] > 0)->count(),
            'days_on_target' => $trend->filter(fn ($row) => $row['actual'] === $row['target'] && $row['target'] > 0)->count(),
            'days_below_target' => $trend->filter(fn ($row) => $row['actual'] < $row['target'] && $row['target'] > 0)->count(),
            'days_without_target' => $trend->filter(fn ($row) => $row['target'] <= 0)->count(),
            'total_orders' => (int) $trend->sum('orders_count'),
        ];
    }

    private function groupTrend(Collection $dailyTrend, string $mode): Collection
    {
        if (!in_array($mode, ['weekly', 'monthly'], true)) {
            return collect();
        }

        $grouped = $dailyTrend->groupBy(function (array $row) use ($mode) {
            $date = Carbon::parse($row['date']);

            return $mode === 'weekly'
                ? $date->copy()->startOfWeek()->toDateString()
                : $date->format('Y-m');
        });

        return $grouped
            ->map(function (Collection $rows, string $key) use ($mode) {
                if ($mode === 'weekly') {
                    $periodStart = Carbon::parse($key)->startOfWeek();
                    $periodEnd = $periodStart->copy()->endOfWeek();
                    $label = $periodStart->format('M j') . ' - ' . $periodEnd->format('M j');
                } else {
                    $monthDate = Carbon::createFromFormat('Y-m', $key)->startOfMonth();
                    $periodStart = $monthDate->copy()->startOfMonth();
                    $periodEnd = $monthDate->copy()->endOfMonth();
                    $label = $monthDate->format('F Y');
                }

                $target = round((float) $rows->sum('target'), 2);
                $actual = round((float) $rows->sum('actual'), 2);
                $variance = round($actual - $target, 2);
                $achievement = $target > 0 ? round(($actual / $target) * 100, 1) : ($actual > 0 ? 100.0 : 0.0);

                return [
                    'label' => $label,
                    'period_start' => $periodStart->toDateString(),
                    'period_end' => $periodEnd->toDateString(),
                    'target' => $target,
                    'actual' => $actual,
                    'variance' => $variance,
                    'achievement_percentage' => $achievement,
                    'days' => $rows->count(),
                    'orders_count' => (int) $rows->sum('orders_count'),
                ];
            })
            ->values();
    }
}

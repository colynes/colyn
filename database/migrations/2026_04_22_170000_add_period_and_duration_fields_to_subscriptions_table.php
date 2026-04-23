<?php

use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('subscriptions')) {
            return;
        }

        Schema::table('subscriptions', function (Blueprint $table) {
            if (! Schema::hasColumn('subscriptions', 'end_date')) {
                $table->date('end_date')->nullable()->after('start_date');
            }

            if (! Schema::hasColumn('subscriptions', 'duration_type')) {
                $table->string('duration_type', 30)->nullable()->after('end_date');
            }

            if (! Schema::hasColumn('subscriptions', 'duration_days')) {
                $table->unsignedInteger('duration_days')->nullable()->after('duration_type');
            }
        });

        DB::table('subscriptions')
            ->select(['id', 'start_date', 'end_date', 'duration_type', 'duration_days', 'next_delivery', 'status', 'created_at'])
            ->orderBy('id')
            ->chunkById(100, function ($subscriptions) {
                foreach ($subscriptions as $subscription) {
                    if ($subscription->end_date && $subscription->duration_type && $subscription->duration_days) {
                        continue;
                    }

                    $today = now()->startOfDay();
                    $storedStatus = strtolower((string) $subscription->status);
                    $start = $this->parseDate($subscription->start_date)
                        ?? $this->parseDate($subscription->next_delivery)
                        ?? $this->parseDate($subscription->created_at)
                        ?? $today->copy();

                    $end = $this->parseDate($subscription->end_date);

                    if (! $end) {
                        $end = in_array($storedStatus, ['active', 'pending', 'paused'], true)
                            ? $today->copy()->addMonthNoOverflow()
                            : $start->copy()->addMonthNoOverflow();
                    }

                    DB::table('subscriptions')
                        ->where('id', $subscription->id)
                        ->update([
                            'start_date' => $subscription->start_date ?: $start->toDateString(),
                            'end_date' => $end->toDateString(),
                            'duration_type' => 'month',
                            'duration_days' => 30,
                            'updated_at' => now(),
                        ]);
                }
            });
    }

    public function down(): void
    {
        if (! Schema::hasTable('subscriptions')) {
            return;
        }

        Schema::table('subscriptions', function (Blueprint $table) {
            foreach (['duration_days', 'duration_type', 'end_date'] as $column) {
                if (Schema::hasColumn('subscriptions', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }

    protected function parseDate(mixed $value): ?Carbon
    {
        if (blank($value)) {
            return null;
        }

        try {
            return Carbon::parse((string) $value)->startOfDay();
        } catch (Throwable) {
            return null;
        }
    }
};

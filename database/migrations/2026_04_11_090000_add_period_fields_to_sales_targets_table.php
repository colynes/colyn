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
        if (!Schema::hasTable('sales_targets')) {
            return;
        }

        Schema::table('sales_targets', function (Blueprint $table) {
            if (!Schema::hasColumn('sales_targets', 'target_type')) {
                $table->string('target_type', 20)->default('daily')->after('product_id');
            }

            if (!Schema::hasColumn('sales_targets', 'target_date')) {
                $table->date('target_date')->nullable()->after('target_amount');
            }

            if (!Schema::hasColumn('sales_targets', 'week_start')) {
                $table->date('week_start')->nullable()->after('target_date');
            }

            if (!Schema::hasColumn('sales_targets', 'week_end')) {
                $table->date('week_end')->nullable()->after('week_start');
            }

            if (!Schema::hasColumn('sales_targets', 'target_month')) {
                $table->unsignedTinyInteger('target_month')->nullable()->after('week_end');
            }

            if (!Schema::hasColumn('sales_targets', 'target_year')) {
                $table->unsignedSmallInteger('target_year')->nullable()->after('target_month');
            }

            if (!Schema::hasColumn('sales_targets', 'notes')) {
                $table->text('notes')->nullable()->after('target_year');
            }
        });

        Schema::table('sales_targets', function (Blueprint $table) {
            $table->index(['target_type', 'target_date'], 'sales_targets_type_date_idx');
            $table->index(['target_type', 'week_start', 'week_end'], 'sales_targets_type_week_idx');
            $table->index(['target_type', 'target_year', 'target_month'], 'sales_targets_type_month_idx');
        });

        DB::table('sales_targets')
            ->orderBy('id')
            ->get(['id', 'start_date', 'end_date'])
            ->each(function ($row) {
                $start = Carbon::parse($row->start_date)->startOfDay();
                $end = Carbon::parse($row->end_date)->startOfDay();

                $payload = [
                    'target_type' => 'weekly',
                    'target_date' => null,
                    'week_start' => $start->toDateString(),
                    'week_end' => $end->toDateString(),
                    'target_month' => null,
                    'target_year' => null,
                ];

                if ($start->equalTo($end)) {
                    $payload = [
                        'target_type' => 'daily',
                        'target_date' => $start->toDateString(),
                        'week_start' => null,
                        'week_end' => null,
                        'target_month' => null,
                        'target_year' => null,
                    ];
                } elseif (
                    $start->isSameMonth($end)
                    && $start->equalTo($start->copy()->startOfMonth())
                    && $end->equalTo($end->copy()->endOfMonth())
                ) {
                    $payload = [
                        'target_type' => 'monthly',
                        'target_date' => null,
                        'week_start' => null,
                        'week_end' => null,
                        'target_month' => (int) $start->month,
                        'target_year' => (int) $start->year,
                    ];
                }

                DB::table('sales_targets')
                    ->where('id', $row->id)
                    ->update($payload);
            });
    }

    public function down(): void
    {
        if (!Schema::hasTable('sales_targets')) {
            return;
        }

        Schema::table('sales_targets', function (Blueprint $table) {
            $table->dropIndex('sales_targets_type_date_idx');
            $table->dropIndex('sales_targets_type_week_idx');
            $table->dropIndex('sales_targets_type_month_idx');

            if (Schema::hasColumn('sales_targets', 'notes')) {
                $table->dropColumn('notes');
            }

            if (Schema::hasColumn('sales_targets', 'target_year')) {
                $table->dropColumn('target_year');
            }

            if (Schema::hasColumn('sales_targets', 'target_month')) {
                $table->dropColumn('target_month');
            }

            if (Schema::hasColumn('sales_targets', 'week_end')) {
                $table->dropColumn('week_end');
            }

            if (Schema::hasColumn('sales_targets', 'week_start')) {
                $table->dropColumn('week_start');
            }

            if (Schema::hasColumn('sales_targets', 'target_date')) {
                $table->dropColumn('target_date');
            }

            if (Schema::hasColumn('sales_targets', 'target_type')) {
                $table->dropColumn('target_type');
            }
        });
    }
};

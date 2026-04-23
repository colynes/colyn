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
        if (! Schema::hasTable('subscription_requests')) {
            return;
        }

        Schema::table('subscription_requests', function (Blueprint $table) {
            if (! Schema::hasColumn('subscription_requests', 'end_date')) {
                $table->date('end_date')->nullable()->after('start_date');
            }
        });

        DB::table('subscription_requests')
            ->select(['id', 'start_date', 'end_date', 'created_at'])
            ->orderBy('id')
            ->chunkById(100, function ($requests) {
                foreach ($requests as $request) {
                    if ($request->end_date) {
                        continue;
                    }

                    $start = $this->parseDate($request->start_date)
                        ?? $this->parseDate($request->created_at)
                        ?? now()->startOfDay();

                    DB::table('subscription_requests')
                        ->where('id', $request->id)
                        ->update([
                            'end_date' => $start->copy()->addMonthNoOverflow()->toDateString(),
                            'updated_at' => now(),
                        ]);
                }
            });
    }

    public function down(): void
    {
        if (! Schema::hasTable('subscription_requests') || ! Schema::hasColumn('subscription_requests', 'end_date')) {
            return;
        }

        Schema::table('subscription_requests', function (Blueprint $table) {
            $table->dropColumn('end_date');
        });
    }

    protected function parseDate(mixed $value): ?Carbon
    {
        if (blank($value)) {
            return null;
        }

        try {
            return Carbon::parse((string) $value)->startOfDay();
        } catch (\Throwable) {
            return null;
        }
    }
};

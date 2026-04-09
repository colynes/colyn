<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('invoices') || ! Schema::hasColumn('invoices', 'order_id')) {
            return;
        }

        DB::statement('ALTER TABLE `invoices` MODIFY `order_id` BIGINT UNSIGNED NULL');
    }

    public function down(): void
    {
        if (! Schema::hasTable('invoices') || ! Schema::hasColumn('invoices', 'order_id')) {
            return;
        }

        // Revert column nullability back to NOT NULL.
        DB::statement('ALTER TABLE `invoices` MODIFY `order_id` BIGINT UNSIGNED NOT NULL');
    }
};


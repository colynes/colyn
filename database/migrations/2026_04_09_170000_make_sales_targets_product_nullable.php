<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('sales_targets')) {
            return;
        }

        DB::statement('ALTER TABLE sales_targets DROP FOREIGN KEY sales_targets_product_id_foreign');
        DB::statement('ALTER TABLE sales_targets MODIFY product_id BIGINT UNSIGNED NULL');
        DB::statement('ALTER TABLE sales_targets ADD CONSTRAINT sales_targets_product_id_foreign FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE');
    }

    public function down(): void
    {
        if (!Schema::hasTable('sales_targets')) {
            return;
        }

        DB::table('sales_targets')->whereNull('product_id')->delete();
        DB::statement('ALTER TABLE sales_targets DROP FOREIGN KEY sales_targets_product_id_foreign');
        DB::statement('ALTER TABLE sales_targets MODIFY product_id BIGINT UNSIGNED NOT NULL');
        DB::statement('ALTER TABLE sales_targets ADD CONSTRAINT sales_targets_product_id_foreign FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE');
    }
};

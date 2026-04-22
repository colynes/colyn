<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'status')) {
            DB::statement("
                ALTER TABLE orders
                MODIFY status ENUM(
                    'pending',
                    'confirmed',
                    'preparing',
                    'ready',
                    'dispatched',
                    'delivered',
                    'completed',
                    'cancelled'
                ) NOT NULL DEFAULT 'pending'
            ");
        }

        if (Schema::hasTable('deliveries') && Schema::hasColumn('deliveries', 'status')) {
            DB::statement("
                ALTER TABLE deliveries
                MODIFY status ENUM(
                    'pending',
                    'in_transit',
                    'delivered',
                    'failed',
                    'cancelled'
                ) NOT NULL DEFAULT 'pending'
            ");
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('deliveries') && Schema::hasColumn('deliveries', 'status')) {
            DB::statement("
                ALTER TABLE deliveries
                MODIFY status ENUM(
                    'pending',
                    'in_transit',
                    'delivered',
                    'failed'
                ) NOT NULL DEFAULT 'pending'
            ");
        }

        if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'status')) {
            DB::statement("
                ALTER TABLE orders
                MODIFY status ENUM(
                    'pending',
                    'confirmed',
                    'preparing',
                    'ready',
                    'delivered',
                    'completed',
                    'cancelled'
                ) NOT NULL DEFAULT 'pending'
            ");
        }
    }
};

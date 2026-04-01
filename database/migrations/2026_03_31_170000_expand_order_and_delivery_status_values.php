<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            ALTER TABLE orders
            MODIFY status ENUM(
                'pending',
                'confirmed',
                'preparing',
                'ready',
                'dispatched',
                'delivered',
                'cancelled'
            ) NOT NULL DEFAULT 'pending'
        ");

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

    public function down(): void
    {
        DB::statement("
            ALTER TABLE deliveries
            MODIFY status ENUM(
                'pending',
                'in_transit',
                'delivered',
                'failed'
            ) NOT NULL DEFAULT 'pending'
        ");

        DB::statement("
            ALTER TABLE orders
            MODIFY status ENUM(
                'pending',
                'confirmed',
                'preparing',
                'ready',
                'delivered',
                'cancelled'
            ) NOT NULL DEFAULT 'pending'
        ");
    }
};

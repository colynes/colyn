<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('orders')) {
            return;
        }

        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'delivery_region')) {
                $table->string('delivery_region')->nullable()->after('payment_method');
            }

            if (!Schema::hasColumn('orders', 'delivery_area')) {
                $table->string('delivery_area')->nullable()->after('delivery_region');
            }

            if (!Schema::hasColumn('orders', 'delivery_address')) {
                $table->text('delivery_address')->nullable()->after('delivery_area');
            }

            if (!Schema::hasColumn('orders', 'delivery_landmark')) {
                $table->string('delivery_landmark')->nullable()->after('delivery_address');
            }

            if (!Schema::hasColumn('orders', 'delivery_phone')) {
                $table->string('delivery_phone')->nullable()->after('delivery_landmark');
            }

            if (!Schema::hasColumn('orders', 'fulfillment_method')) {
                $table->string('fulfillment_method')->nullable()->after('delivery_phone');
            }

            if (!Schema::hasColumn('orders', 'pickup_time')) {
                $table->string('pickup_time')->nullable()->after('fulfillment_method');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('orders')) {
            return;
        }

        Schema::table('orders', function (Blueprint $table) {
            foreach ([
                'pickup_time',
                'fulfillment_method',
                'delivery_phone',
                'delivery_landmark',
                'delivery_address',
                'delivery_area',
                'delivery_region',
            ] as $column) {
                if (Schema::hasColumn('orders', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};

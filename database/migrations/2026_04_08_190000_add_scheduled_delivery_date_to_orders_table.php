<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'scheduled_delivery_date')) {
                $table->date('scheduled_delivery_date')->nullable()->after('pickup_time');
            }

            if (!Schema::hasColumn('orders', 'scheduled_pickup_date')) {
                $table->date('scheduled_pickup_date')->nullable()->after('scheduled_delivery_date');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'scheduled_pickup_date')) {
                $table->dropColumn('scheduled_pickup_date');
            }

            if (Schema::hasColumn('orders', 'scheduled_delivery_date')) {
                $table->dropColumn('scheduled_delivery_date');
            }
        });
    }
};

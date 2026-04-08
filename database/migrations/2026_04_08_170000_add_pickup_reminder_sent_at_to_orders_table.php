<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'pickup_reminder_sent_at')) {
                $table->timestamp('pickup_reminder_sent_at')->nullable()->after('pickup_time');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'pickup_reminder_sent_at')) {
                $table->dropColumn('pickup_reminder_sent_at');
            }
        });
    }
};

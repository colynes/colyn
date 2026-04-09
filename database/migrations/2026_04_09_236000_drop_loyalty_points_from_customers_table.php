<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('customers', 'loyalty_points')) {
            return;
        }

        Schema::table('customers', function (Blueprint $table) {
            $table->dropIndex('customers_loyalty_points_index');
            $table->dropColumn('loyalty_points');
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('customers', 'loyalty_points')) {
            return;
        }

        Schema::table('customers', function (Blueprint $table) {
            $table->integer('loyalty_points')->default(0)->after('birth_date');
            $table->index('loyalty_points');
        });
    }
};

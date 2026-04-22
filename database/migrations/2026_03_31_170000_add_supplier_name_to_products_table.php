<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('products') || Schema::hasColumn('products', 'supplier_name')) {
            return;
        }

        Schema::table('products', function (Blueprint $table) {
            $table->string('supplier_name')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('products') || !Schema::hasColumn('products', 'supplier_name')) {
            return;
        }

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('supplier_name');
        });
    }
};

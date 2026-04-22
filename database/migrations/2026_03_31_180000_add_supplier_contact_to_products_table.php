<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('products') || Schema::hasColumn('products', 'supplier_contact')) {
            return;
        }

        Schema::table('products', function (Blueprint $table) {
            $table->string('supplier_contact')->nullable()->after('supplier_name');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('products') || !Schema::hasColumn('products', 'supplier_contact')) {
            return;
        }

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('supplier_contact');
        });
    }
};

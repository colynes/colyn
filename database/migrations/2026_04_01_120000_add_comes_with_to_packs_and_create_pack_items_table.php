<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('packs', function (Blueprint $table) {
            $table->text('comes_with')->nullable()->after('description');
        });

        Schema::create('pack_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pack_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->decimal('quantity', 10, 2);
            $table->timestamps();

            $table->unique(['pack_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pack_items');

        Schema::table('packs', function (Blueprint $table) {
            $table->dropColumn('comes_with');
        });
    }
};

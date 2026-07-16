<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
         Schema::table('ventas', function (Blueprint $table) {
            $table->enum('estado', ['abierta', 'cerrada'])
                  ->default('cerrada')
                  ->after('cliente_id');

            $table->foreignId('mesa_id')
                  ->nullable()
                  ->after('estado')
                  ->constrained('mesas')
                  ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $table->dropForeign(['mesa_id']);
            $table->dropColumn(['mesa_id', 'estado']);
        });
    }
};

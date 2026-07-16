<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Corrige dos desajustes entre el esquema original y el código de
     * VentaApiController:
     *
     * 1) `tipo_pago` se creó como NOT NULL, pero una venta recién abierta
     *    (mientras se están agregando productos) todavía no tiene tipo de
     *    pago definido. Lo pasamos a nullable.
     *
     * 2) `estado` se agregó como ENUM('abierta','cerrada') con esos dos
     *    valores en minúscula, pero el controlador usa
     *    'ABIERTA' | 'ANULADA' | 'PAGADA' | 'FIADA'. Migramos los datos
     *    existentes y redefinimos el ENUM con los valores reales que usa
     *    la aplicación.
     */
    public function up(): void
    {
        // 1) Normalizar datos existentes antes de cambiar el ENUM,
        // para que ningún registro quede con un valor fuera del nuevo set.
        DB::table('ventas')->where('estado', 'abierta')->update(['estado' => 'ABIERTA']);
        DB::table('ventas')->where('estado', 'cerrada')->update(['estado' => 'PAGADA']);

        DB::statement(
            "ALTER TABLE ventas
                MODIFY estado ENUM('ABIERTA', 'ANULADA', 'PAGADA', 'FIADA')
                NOT NULL DEFAULT 'ABIERTA'"
        );

        DB::statement(
            "ALTER TABLE ventas
                MODIFY tipo_pago ENUM('CONTADO', 'FIADO') NULL"
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('ventas')->where('estado', 'ABIERTA')->update(['estado' => 'abierta']);
        DB::table('ventas')
            ->whereIn('estado', ['ANULADA', 'PAGADA', 'FIADA'])
            ->update(['estado' => 'cerrada']);

        DB::statement(
            "ALTER TABLE ventas
                MODIFY estado ENUM('abierta', 'cerrada')
                NOT NULL DEFAULT 'cerrada'"
        );

        DB::statement(
            "ALTER TABLE ventas
                MODIFY tipo_pago ENUM('CONTADO', 'FIADO') NOT NULL"
        );
    }
};
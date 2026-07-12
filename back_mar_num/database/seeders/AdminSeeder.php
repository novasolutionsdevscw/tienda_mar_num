<?php

namespace Database\Seeders;

use App\Models\Usuario;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Inserta el usuario administrador inicial.
     */
    public function run(): void
    {
        // Evita duplicados: si ya existe el usuario "wilmer", no lo vuelve a crear
        Usuario::firstOrCreate(
            ['usuario' => 'wilmer'],
            [
                'nombre_usuario' => 'Wilmer',
                'password'       => Hash::make('Admin123*'),
                'rol'            => 'ADMIN',
                'activo'         => true,
            ]
        );
    }
}

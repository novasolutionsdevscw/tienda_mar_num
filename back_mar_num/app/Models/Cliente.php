<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cliente extends Model
{
    protected $table = 'clientes';

    protected $primaryKey = 'id_cliente';

    public $timestamps = false;

    const CREATED_AT = 'fecha_registro';

    protected $fillable = [
        'nombre_cliente',
        'telefono_cliente',
        'direccion_cliente',
        'saldo_deuda',
    ];

    protected function casts(): array
    {
        return [
            'saldo_deuda' => 'decimal:2',
            'fecha_registro' => 'datetime',
        ];
    }

    public function ventas(): HasMany
    {
        return $this->hasMany(Venta::class, 'cliente_id', 'id_cliente');
    }

    public function deudas(): HasMany
    {
        return $this->hasMany(Deuda::class, 'cliente_id', 'id_cliente');
    }

    public function getRouteKeyName(): string
    {
        return 'id_cliente';
    }
}

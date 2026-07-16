<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Venta extends Model
{
    protected $table = 'ventas';

    public $timestamps = false;

    const CREATED_AT = 'fecha';

    protected $fillable = [
        'usuario_id',
        'cliente_id',
        'mesa_id',
        'estado',
        'tipo_pago',
        'total',
    ];

    protected function casts(): array
    {
        return [
            'total' => 'decimal:2',
            'fecha' => 'datetime',
        ];
    }

    public function mesa(): BelongsTo
    {
        return $this->belongsTo(Mesa::class, 'mesa_id', 'id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(
            Usuario::class,
            'usuario_id',
            'id_usuario'
        );
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(
            Cliente::class,
            'cliente_id',
            'id_cliente'
        );
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(
            DetalleVenta::class,
            'venta_id'
        );
    }

    public function deuda(): HasOne
    {
        return $this->hasOne(
            Deuda::class,
            'venta_id'
        );
    }
}
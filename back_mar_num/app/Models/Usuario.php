<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Usuario extends Authenticatable
{
    use HasApiTokens;

    protected $table = 'usuarios';

    protected $primaryKey = 'id_usuario';

    public $timestamps = false;

    const CREATED_AT = 'fecha_creacion';

    protected $fillable = [
        'nombre_usuario',
        'usuario',
        'password',
        'rol',
        'activo',
    ];

    protected $hidden = [
        'password',
    ];

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
            'fecha_creacion' => 'datetime',
        ];
    }

    public function ventas(): HasMany
    {
        return $this->hasMany(Venta::class, 'usuario_id', 'id_usuario');
    }

    public function isAdmin(): bool
    {
        return $this->rol === 'ADMIN';
    }

    public function isAyudante(): bool
    {
        return $this->rol === 'AYUDANTE';
    }

    public function getRouteKeyName(): string
    {
        return 'id_usuario';
    }
}

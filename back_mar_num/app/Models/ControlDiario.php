<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ControlDiario extends Model
{
    protected $table = 'control_diario';

    public $timestamps = false;

    protected $fillable = [
        'fecha',
        'ingresos',
        'gastos',
    ];

    protected function casts(): array
    {
        return [
            'fecha' => 'date',
            'ingresos' => 'decimal:2',
            'gastos' => 'decimal:2',
            'ganancias' => 'decimal:2',
        ];
    }
}

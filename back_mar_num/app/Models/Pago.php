<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Pago extends Model
{
    protected $table = 'pagos';

    public $timestamps = false;

    const CREATED_AT = 'fecha';

    protected $fillable = [
        'deuda_id',
        'monto',
    ];

    protected function casts(): array
    {
        return [
            'monto' => 'decimal:2',
            'fecha' => 'datetime',
        ];
    }

    public function deuda(): BelongsTo
    {
        return $this->belongsTo(Deuda::class, 'deuda_id');
    }
}

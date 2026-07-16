<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Mesa extends Model
{
    protected $fillable = ['numero', 'estado'];

    public function ventas()
    {
        return $this->hasMany(Venta::class);
    }
} 
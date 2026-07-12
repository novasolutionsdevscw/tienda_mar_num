<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UsuarioResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_usuario,
            'nombre_usuario' => $this->nombre_usuario,
            'usuario' => $this->usuario,
            'rol' => $this->rol,
            'activo' => $this->activo,
            'fecha_creacion' => $this->fecha_creacion?->toIso8601String(),
        ];
    }
}

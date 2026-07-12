<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClienteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_cliente,
            'nombre' => $this->nombre_cliente,
            'telefono' => $this->telefono_cliente,
            'direccion' => $this->direccion_cliente,
            'saldo_deuda' => $this->saldo_deuda,
            'fecha_registro' => $this->fecha_registro?->toIso8601String(),
            'deudas' => DeudaResource::collection($this->whenLoaded('deudas')),
            'ventas' => VentaResource::collection($this->whenLoaded('ventas')),
        ];
    }
}

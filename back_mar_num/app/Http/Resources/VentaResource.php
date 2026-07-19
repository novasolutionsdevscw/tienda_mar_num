<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VentaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'usuario_id' => $this->usuario_id,
            'cliente_id' => $this->cliente_id,
            'mesa_id'    => $this->mesa_id,
            'estado'     => $this->estado,
            'tipo_pago'  => $this->tipo_pago,
            'medio_pago' => $this->medio_pago,
            'total'      => $this->total,
            'fecha'      => $this->fecha?->toIso8601String(),
            'cliente'    => new ClienteResource($this->whenLoaded('cliente')),
            'usuario'    => new UsuarioResource($this->whenLoaded('usuario')),
            'mesa'       => $this->whenLoaded('mesa', fn() => [
                'id'     => $this->mesa->id,
                'numero' => $this->mesa->numero,
            ]),
            'detalles'   => DetalleVentaResource::collection($this->whenLoaded('detalles')),
            'deuda'      => new DeudaResource($this->whenLoaded('deuda')),
        ];
    }
}

<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DeudaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'cliente_id' => $this->cliente_id,
            'venta_id' => $this->venta_id,
            'monto' => $this->monto,
            'saldo_pendiente' => $this->saldo_pendiente,
            'estado' => $this->estado,
            'fecha' => $this->fecha?->toIso8601String(),
            'cliente' => new ClienteResource($this->whenLoaded('cliente')),
            'venta' => new VentaResource($this->whenLoaded('venta')),
            'pagos' => PagoResource::collection($this->whenLoaded('pagos')),
        ];
    }
}

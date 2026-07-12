<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PagoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'deuda_id' => $this->deuda_id,
            'monto' => $this->monto,
            'fecha' => $this->fecha?->toIso8601String(),
        ];
    }
}

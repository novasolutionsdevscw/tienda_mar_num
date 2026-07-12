<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ControlDiarioResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'fecha' => $this->fecha?->toDateString(),
            'ingresos' => $this->ingresos,
            'gastos' => $this->gastos,
            'ganancias' => $this->ganancias,
        ];
    }
}

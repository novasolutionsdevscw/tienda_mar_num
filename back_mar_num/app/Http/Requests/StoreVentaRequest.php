<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreVentaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'mesa_id' => [
                'nullable',
                'integer',
                'exists:mesas,id',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'mesa_id.integer' => 'La mesa seleccionada no es válida.',
            'mesa_id.exists' => 'La mesa seleccionada no existe.',
        ];
    }
}
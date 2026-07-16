<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDeudaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'estado'          => ['sometimes', Rule::in(['PENDIENTE', 'PAGADO'])],
            'saldo_pendiente' => ['sometimes', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'estado.in'              => 'El estado debe ser PENDIENTE o PAGADO.',
            'saldo_pendiente.min'    => 'El saldo pendiente no puede ser negativo.',
        ];
    }
}

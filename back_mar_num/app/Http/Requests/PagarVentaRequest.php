<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PagarVentaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tipo_pago' => [
                'required',
                Rule::in([
                    'CONTADO',
                    'FIADO',
                ]),
            ],

            'medio_pago' => [
                'nullable',
                Rule::requiredIf(
                    $this->input('tipo_pago') === 'CONTADO'
                ),
                Rule::in([
                    'EFECTIVO',
                    'NEQUI',
                    'DAVIPLATA',
                    'TARJETA',
                ]),
            ],

            'cliente_id' => [
                Rule::requiredIf(
                    $this->input('tipo_pago') === 'FIADO'
                ),
                'nullable',
                'integer',
                'exists:clientes,id_cliente',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'tipo_pago.required' =>
                'Debe seleccionar el tipo de pago.',

            'medio_pago.required' =>
                'Debe seleccionar el medio de pago.',

            'medio_pago.in' =>
                'El medio de pago seleccionado no es válido.',

            'cliente_id.required' =>
                'Debe seleccionar un cliente para una venta fiada.',

            'cliente_id.exists' =>
                'El cliente seleccionado no existe.',
        ];
    }
}
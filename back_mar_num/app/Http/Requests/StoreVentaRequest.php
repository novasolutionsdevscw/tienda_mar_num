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
            'cliente_id' => [
                Rule::requiredIf($this->input('tipo_pago') === 'FIADO'),
                'nullable',
                'integer',
                'exists:clientes,id_cliente',
            ],
            'tipo_pago' => ['required', Rule::in(['CONTADO', 'FIADO'])],
            'productos' => ['required', 'array', 'min:1'],
            'productos.*.producto_id' => ['required', 'integer', 'exists:productos,id'],
            'productos.*.cantidad' => ['required', 'integer', 'min:1', 'max:9999'],
        ];
    }

    public function messages(): array
    {
        return [
            'cliente_id.required' => 'Debe seleccionar un cliente para ventas fiadas.',
            'cliente_id.exists' => 'El cliente seleccionado no existe.',
            'tipo_pago.required' => 'Debe seleccionar el tipo de pago.',
            'productos.required' => 'Debe agregar al menos un producto.',
            'productos.min' => 'Debe agregar al menos un producto.',
            'productos.*.producto_id.required' => 'Producto inválido.',
            'productos.*.cantidad.required' => 'La cantidad es obligatoria.',
            'productos.*.cantidad.min' => 'La cantidad debe ser al menos 1.',
        ];
    }
}

<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePagoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'monto' => ['required', 'numeric', 'min:0.01'],
        ];
    }

    public function messages(): array
    {
        return [
            'monto.required' => 'El monto del pago es obligatorio.',
            'monto.min' => 'El monto debe ser mayor a cero.',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $deuda = $this->route('deuda');

            if ($deuda && $this->input('monto') > $deuda->saldo_pendiente) {
                $validator->errors()->add(
                    'monto',
                    'El monto no puede superar el saldo pendiente ($'.number_format($deuda->saldo_pendiente, 2).').'
                );
            }
        });
    }
}

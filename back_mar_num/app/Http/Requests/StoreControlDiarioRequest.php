<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreControlDiarioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fecha' => ['required', 'date', Rule::unique('control_diario', 'fecha')],
            'ingresos' => ['required', 'numeric', 'min:0', 'max:99999999.99'],
            'gastos' => ['required', 'numeric', 'min:0', 'max:99999999.99'],
        ];
    }

    public function messages(): array
    {
        return [
            'fecha.required' => 'La fecha es obligatoria.',
            'fecha.unique' => 'Ya existe un registro para esta fecha.',
            'ingresos.required' => 'Los ingresos son obligatorios.',
            'gastos.required' => 'Los gastos son obligatorios.',
        ];
    }
}

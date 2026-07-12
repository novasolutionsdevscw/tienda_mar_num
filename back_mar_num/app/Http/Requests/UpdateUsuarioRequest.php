<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUsuarioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    public function rules(): array
    {
        $id = $this->route('usuario')->id_usuario;

        return [
            'nombre_usuario' => ['required', 'string', 'max:100'],
            'usuario' => ['required', 'string', 'max:50', Rule::unique('usuarios', 'usuario')->ignore($id, 'id_usuario')],
            'password' => ['nullable', 'string', 'min:4', 'confirmed'],
            'rol' => ['required', Rule::in(['ADMIN', 'AYUDANTE'])],
            'activo' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre_usuario.required' => 'El nombre es obligatorio.',
            'usuario.required' => 'El usuario es obligatorio.',
            'usuario.unique' => 'Este nombre de usuario ya existe.',
            'password.confirmed' => 'Las contraseñas no coinciden.',
            'rol.required' => 'Debe seleccionar un rol.',
        ];
    }
}

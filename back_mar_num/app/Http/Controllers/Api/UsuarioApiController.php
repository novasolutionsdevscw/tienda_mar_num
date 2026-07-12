<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUsuarioRequest;
use App\Http\Requests\UpdateUsuarioRequest;
use App\Http\Resources\UsuarioResource;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Hash;

class UsuarioApiController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Usuario::query();

        if ($request->filled('buscar')) {
            $query->where(function ($q) use ($request) {
                $q->where('nombre_usuario', 'like', '%'.$request->buscar.'%')
                    ->orWhere('usuario', 'like', '%'.$request->buscar.'%');
            });
        }

        if ($request->filled('rol')) {
            $query->where('rol', $request->rol);
        }

        $usuarios = $query->orderBy('nombre_usuario')->paginate(15);

        return UsuarioResource::collection($usuarios);
    }

    public function store(StoreUsuarioRequest $request): JsonResponse
    {
        $usuario = Usuario::create([
            'nombre_usuario' => $request->nombre_usuario,
            'usuario' => $request->usuario,
            'password' => Hash::make($request->password),
            'rol' => $request->rol,
            'activo' => $request->boolean('activo', true),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Usuario creado correctamente.',
            'data' => new UsuarioResource($usuario)
        ], 201);
    }

    public function show(Usuario $usuario): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => new UsuarioResource($usuario)
        ]);
    }

    public function update(UpdateUsuarioRequest $request, Usuario $usuario): JsonResponse
    {
        $data = [
            'nombre_usuario' => $request->nombre_usuario,
            'usuario' => $request->usuario,
            'rol' => $request->rol,
            'activo' => $request->boolean('activo'),
        ];

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        if ($usuario->id_usuario === auth()->id() && ! $request->boolean('activo')) {
            return response()->json([
                'success' => false,
                'message' => 'No puedes desactivar tu propia cuenta.'
            ], 422);
        }

        $usuario->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Usuario actualizado correctamente.',
            'data' => new UsuarioResource($usuario)
        ]);
    }

    public function destroy(Usuario $usuario): JsonResponse
    {
        if ($usuario->id_usuario === auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'No puedes eliminar tu propia cuenta.'
            ], 422);
        }

        if ($usuario->ventas()->exists()) {
            $usuario->update(['activo' => false]);

            return response()->json([
                'success' => true,
                'warning' => true,
                'message' => 'El usuario tiene ventas asociadas y fue desactivado.',
                'data' => new UsuarioResource($usuario)
            ]);
        }

        $usuario->delete();

        return response()->json([
            'success' => true,
            'message' => 'Usuario eliminado correctamente.'
        ]);
    }
}

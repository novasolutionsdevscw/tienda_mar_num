<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Resources\UsuarioResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthApiController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->only('usuario', 'password');

        if (!Auth::attempt($credentials)) {
            return response()->json([
                'success' => false,
                'message' => 'Las credenciales proporcionadas son incorrectas.'
            ], 401);
        }

        $user = Auth::user();

        if (!$user->activo) {
            Auth::logout();
            return response()->json([
                'success' => false,
                'message' => 'Tu cuenta de usuario está desactivada.'
            ], 403);
        }

        // Revocar tokens anteriores del usuario y crear uno nuevo
        $user->tokens()->delete();
        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Sesión iniciada correctamente.',
            'token'   => $token,
            'user'    => new UsuarioResource($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        // Revocar el token actual
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Sesión cerrada correctamente.'
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'user'    => new UsuarioResource($request->user()),
        ]);
    }
}

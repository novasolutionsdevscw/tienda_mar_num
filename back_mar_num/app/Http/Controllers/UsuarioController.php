<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUsuarioRequest;
use App\Http\Requests\UpdateUsuarioRequest;
use App\Models\Usuario;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\View\View;

class UsuarioController extends Controller
{
    public function index(Request $request): View
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

        $usuarios = $query->orderBy('nombre_usuario')->paginate(15)->withQueryString();

        return view('usuarios.index', compact('usuarios'));
    }

    public function create(): View
    {
        return view('usuarios.create');
    }

    public function store(StoreUsuarioRequest $request): RedirectResponse
    {
        Usuario::create([
            'nombre_usuario' => $request->nombre_usuario,
            'usuario' => $request->usuario,
            'password' => Hash::make($request->password),
            'rol' => $request->rol,
            'activo' => $request->boolean('activo', true),
        ]);

        return redirect()->route('usuarios.index')
            ->with('success', 'Usuario creado correctamente.');
    }

    public function edit(Usuario $usuario): View
    {
        return view('usuarios.edit', compact('usuario'));
    }

    public function update(UpdateUsuarioRequest $request, Usuario $usuario): RedirectResponse
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
            return back()->with('error', 'No puedes desactivar tu propia cuenta.');
        }

        $usuario->update($data);

        return redirect()->route('usuarios.index')
            ->with('success', 'Usuario actualizado correctamente.');
    }

    public function destroy(Usuario $usuario): RedirectResponse
    {
        if ($usuario->id_usuario === auth()->id()) {
            return back()->with('error', 'No puedes eliminar tu propia cuenta.');
        }

        if ($usuario->ventas()->exists()) {
            $usuario->update(['activo' => false]);

            return redirect()->route('usuarios.index')
                ->with('warning', 'El usuario tiene ventas asociadas y fue desactivado.');
        }

        $usuario->delete();

        return redirect()->route('usuarios.index')
            ->with('success', 'Usuario eliminado correctamente.');
    }
}

<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Models\Usuario;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\View\View;

class LoginController extends Controller
{
    public function showLoginForm(): View|RedirectResponse
    {
        if (Auth::check()) {
            return redirect()->route('dashboard');
        }

        return view('auth.login');
    }

    public function login(LoginRequest $request): RedirectResponse
    {
        $credentials = $request->only('usuario', 'password');

        $usuario = Usuario::where('usuario', $credentials['usuario'])
            ->where('activo', true)
            ->first();

        if (! $usuario) {
            return back()
                ->withInput($request->only('usuario'))
                ->with('error', 'Usuario o contraseña incorrectos.');
        }

        $passwordValid = Hash::check($credentials['password'], $usuario->password)
            || $usuario->password === $credentials['password'];

        if (! $passwordValid) {
            return back()
                ->withInput($request->only('usuario'))
                ->with('error', 'Usuario o contraseña incorrectos.');
        }

        if (! Hash::isHashed($usuario->password)) {
            $usuario->update(['password' => Hash::make($credentials['password'])]);
        }

        Auth::login($usuario, $request->boolean('remember'));
        $request->session()->regenerate();

        return redirect()->intended(route('dashboard'));
    }

    public function logout(): RedirectResponse
    {
        Auth::logout();
        request()->session()->invalidate();
        request()->session()->regenerateToken();

        return redirect()->route('login')->with('success', 'Sesión cerrada correctamente.');
    }
}

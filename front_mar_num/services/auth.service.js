/**
 * Servicio de Autenticación - Tienda Mar & Num
 * Maneja la comunicación con la API de Laravel para autenticación
 */

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const AuthService = {

    /**
     * Iniciar sesión con email y contraseña
     * @param {string} email
     * @param {string} password
     * @returns {Promise<Object>} Datos del usuario y token
     */
    async login(email, password) {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Credenciales incorrectas.');
        }

        if (data.token) {
            localStorage.setItem('auth_token', data.token);
        }
        if (data.user) {
            localStorage.setItem('auth_user', JSON.stringify(data.user));
        }

        return data;
    },

    /**
     * Iniciar sesión con nombre de usuario (campo "usuario") y contraseña
     * @param {string} usuario
     * @param {string} password
     * @returns {Promise<Object>}
     */
    async loginConUsuario(usuario, password) {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ usuario, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Usuario o contraseña incorrectos.');
        }

        if (data.token) {
            localStorage.setItem('auth_token', data.token);
        }
        if (data.user) {
            localStorage.setItem('auth_user', JSON.stringify(data.user));
        }

        return data;
    },

    /**
     * Cerrar sesión
     * @returns {Promise<void>}
     */
    async logout() {
        const token = this.getToken();
        if (token) {
            try {
                await fetch(`${API_BASE_URL}/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });
            } catch (error) {
                console.warn('Error al cerrar sesión en el servidor:', error);
            }
        }
        this.clearSession();
    },

    /**
     * Obtener el usuario autenticado desde la API
     * @returns {Promise<Object>}
     */
    async getMe() {
        const token = this.getToken();
        const response = await fetch(`${API_BASE_URL}/me`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            this.clearSession();
            throw new Error('Sesión expirada. Por favor inicia sesión de nuevo.');
        }

        return await response.json();
    },

    /**
     * Obtener el token almacenado
     * @returns {string|null}
     */
    getToken() {
        return localStorage.getItem('auth_token');
    },

    /**
     * Obtener datos del usuario almacenados localmente
     * @returns {Object|null}
     */
    getUser() {
        const user = localStorage.getItem('auth_user');
        return user ? JSON.parse(user) : null;
    },

    /**
     * Verificar si el usuario está autenticado
     * @returns {boolean}
     */
    isAuthenticated() {
        return !!this.getToken();
    },

    /**
     * Limpiar la sesión del localStorage
     */
    clearSession() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
    },

    /**
     * Redirigir si no está autenticado (para páginas protegidas)
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '../pages/login.html';
        }
    },
};

// Exportar para uso global
window.AuthService = AuthService;

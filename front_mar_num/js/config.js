/**
 * Configuración global — Tienda Mar & Num
 *  ÚNICO LUGAR para definir la URL de la API 
 *
 * Todos los módulos (auth.service.js, ventas.js, páginas, etc.)
 * consumen la constante global `API_URL` que se carga aquí.
 * Para cambiar de entorno (dev → producción) solo edita esta línea.
 */

const API_URL = 'http://127.0.0.1:8000/api'; // URL base de la API (con prefijo /api)
const API = API_URL;
const API_BASE = API_URL;

// Exportar explícitamente al ámbito global para evitar problemas de definición
window.API_URL = API_URL;
window.API = API;
window.API_BASE = API_BASE;


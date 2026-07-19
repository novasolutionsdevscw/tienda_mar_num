// ─── Usuario y sidebar ────────────────────────────────────
      (function initUI() {
        if (window.AuthService) {
          AuthService.requireAuth();
          const u = AuthService.getUser();
          if (u) {
            const nombre = u.nombre_usuario || u.usuario || 'Usuario';
            document.getElementById('userName').textContent   = nombre;
            document.getElementById('userRole').textContent   = u.rol === 'ADMIN' ? '⭐ Administrador' : 'Ayudante';
            document.getElementById('userAvatar').textContent = nombre.charAt(0).toUpperCase();
            if (u.rol === 'ADMIN') document.getElementById('nav-usuarios').style.display = 'flex';
          }
        }

        // Logout
        const btnLogout = document.getElementById('btnLogout');
        if (btnLogout && window.AuthService) {
          btnLogout.addEventListener('click', () => {
            if (confirm('¿Cerrar sesión?')) AuthService.logout();
          });
        }

        // Hamburger
        const btnHam  = document.getElementById('btnHamburger');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (btnHam) {
          btnHam.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('open');
          });
          overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('open');
          });
        }

        // Fecha
        const fechaEl = document.getElementById('fechaActual');
        if (fechaEl) {
          fechaEl.textContent = new Date().toLocaleDateString('es-CO', {
            weekday: 'long', day: 'numeric', month: 'long'
          });
        }
      })();
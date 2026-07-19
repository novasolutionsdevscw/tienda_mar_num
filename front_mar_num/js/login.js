// ─── Redirigir si ya está autenticado ────────────────────────
        if (AuthService.isAuthenticated()) {
            window.location.href = 'dashboard.html';
        }

        // ─── Referencias ─────────────────────────────────────────────
        const loginForm    = document.getElementById('loginForm');
        const usuarioInput = document.getElementById('usuario');
        const passwordInput= document.getElementById('password');
        const btnLogin     = document.getElementById('btnLogin');
        const alertError   = document.getElementById('alertError');
        const errorMessage = document.getElementById('errorMessage');
        const togglePass   = document.getElementById('togglePassword');
        const eyeOpen      = document.getElementById('eyeOpen');
        const eyeClosed    = document.getElementById('eyeClosed');

        // ─── Toggle ver/ocultar contraseña ───────────────────────────
        togglePass.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            eyeOpen.style.display   = isPassword ? 'none'  : '';
            eyeClosed.style.display = isPassword ? ''      : 'none';
            togglePass.setAttribute('aria-label', isPassword ? 'Ocultar contraseña' : 'Ver contraseña');
        });

        // ─── Ocultar error al escribir ────────────────────────────────
        [usuarioInput, passwordInput].forEach(input => {
            input.addEventListener('input', () => alertError.classList.remove('visible'));
        });

        // ─── Mostrar error con shake ──────────────────────────────────
        function showError(msg) {
            errorMessage.textContent = msg;
            alertError.classList.add('visible');
            const inner = document.querySelector('.form-inner');
            inner.style.animation = 'none';
            inner.offsetHeight; // reflow
            inner.style.animation = 'shake 0.4s ease';
        }

        // ─── Submit ───────────────────────────────────────────────────
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const usuario  = usuarioInput.value.trim();
            const password = passwordInput.value;

            if (!usuario || !password) {
                showError('Por favor completa todos los campos.');
                return;
            }

            btnLogin.disabled = true;
            btnLogin.classList.add('loading');
            alertError.classList.remove('visible');

            try {
                // El AuthService envía { email, password } → ajustamos para enviar { usuario, password }
                await AuthService.loginConUsuario(usuario, password);
                window.location.href = 'dashboard.html';
            } catch (error) {
                showError(error.message || 'Usuario o contraseña incorrectos.');
            } finally {
                btnLogin.disabled = false;
                btnLogin.classList.remove('loading');
            }
        });
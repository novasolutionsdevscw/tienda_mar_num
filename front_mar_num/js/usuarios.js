// ─── Guard: solo admins ──────────────────────────────────
        AuthService.requireAuth();

        let meId        = null;
        let editMode    = false;
        let currentPage = 1;
        let deleteId    = null;
        let searchTimer = null;

        function getHeaders() {
            return {
                'Content-Type': 'application/json',
                'Accept':       'application/json',
                'Authorization': `Bearer ${AuthService.getToken()}`
            };
        }

        // ─── Cargar usuario actual ────────────────────────────────
        (function loadUser() {
            const u = AuthService.getUser();
            if (!u) return;
            meId = u.id;
            const nombre = u.nombre_usuario || u.usuario || 'Usuario';
            document.getElementById('userName').textContent   = nombre;
            document.getElementById('userRole').textContent   = u.rol === 'ADMIN' ? '⭐ Administrador' : 'Ayudante';
            document.getElementById('userAvatar').textContent = nombre.charAt(0).toUpperCase();

            // Si no es ADMIN, mostrar banner y deshabilitar botón
            if (u.rol !== 'ADMIN') {
                document.getElementById('adminBanner').style.display = 'flex';
                document.getElementById('btnNuevoUsuario').disabled  = true;
                document.getElementById('btnNuevoUsuario').style.opacity = '0.4';
                document.getElementById('btnNuevoUsuario').title = 'Solo administradores pueden crear usuarios.';
            }
        })();

        // ─── Cargar usuarios ─────────────────────────────────────
        async function loadUsuarios(page = 1) {
            const buscar  = document.getElementById('searchInput').value.trim();
            const rol     = document.getElementById('filterRol').value;
            const activo  = document.getElementById('filterActivo').value;

            let url = `${API}/usuarios?page=${page}`;
            if (buscar) url += `&buscar=${encodeURIComponent(buscar)}`;
            if (rol)    url += `&rol=${rol}`;

            const tbody = document.getElementById('usuariosTableBody');
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;"><span class="skeleton" style="width:220px;display:inline-block;"></span></td></tr>`;

            try {
                const res  = await fetch(url, { headers: getHeaders() });
                const json = await res.json();

                // Si devuelve 403, no es admin
                if (res.status === 403) {
                    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:#c05050;">⚠️ No tienes permisos para ver esta sección.</td></tr>`;
                    document.getElementById('adminBanner').style.display = 'flex';
                    return;
                }
                if (!res.ok) throw new Error(json.message || 'Error al cargar usuarios.');

                let usuarios = json.data || [];
                const meta   = json.meta || {};

                // Filtro activo (solo frontend)
                if (activo !== '') {
                    const activoVal = activo === '1';
                    usuarios = usuarios.filter(u => u.activo === activoVal);
                }

                renderTabla(usuarios);
                renderPagination(meta);
                document.getElementById('totalBadge').textContent = `${meta.total || usuarios.length} usuarios`;
                currentPage = meta.current_page || 1;

                // Calcular stats
                calcStats(usuarios, meta);
            } catch (err) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:#c05050;">${escHTML(err.message)}</td></tr>`;
                showToast(err.message, 'error');
            }
        }

        async function calcStats(usuariosActual, meta) {
            // Si hay filtro activo podría ser parcial; cargamos todos para stats
            try {
                const res  = await fetch(`${API}/usuarios?per_page=200`, { headers: getHeaders() });
                const json = await res.json();
                const todos = json.data || [];
                document.getElementById('statTotal').textContent     = todos.length;
                document.getElementById('statAdmins').textContent    = todos.filter(u => u.rol === 'ADMIN').length;
                document.getElementById('statAyudantes').textContent = todos.filter(u => u.rol === 'AYUDANTE').length;
                document.getElementById('statInactivos').textContent = todos.filter(u => !u.activo).length;
            } catch {}
        }

        function renderTabla(usuarios) {
            const tbody = document.getElementById('usuariosTableBody');
            if (!usuarios || usuarios.length === 0) {
                tbody.innerHTML = `
                    <tr><td colspan="6">
                        <div class="empty-state">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                            <p>No se encontraron usuarios</p>
                        </div>
                    </td></tr>`;
                return;
            }

            tbody.innerHTML = usuarios.map(u => {
                const esYo    = u.id === meId;
                const esAdmin = u.rol === 'ADMIN';
                const activo  = u.activo;
                const fecha   = u.fecha_creacion
                    ? new Date(u.fecha_creacion).toLocaleDateString('es-CO', {day:'2-digit',month:'short',year:'numeric'})
                    : '—';

                const toggleTitle  = activo ? 'Desactivar cuenta' : 'Activar cuenta';
                const deleteTitle  = esYo   ? 'No puedes eliminarte a ti mismo' : 'Eliminar usuario';

                return `
                <tr class="${esYo ? 'me-row' : ''}">
                    <td>
                        <div class="user-cell">
                            <div class="user-av ${esAdmin ? 'av-admin' : 'av-ayudante'}">${u.nombre_usuario.charAt(0).toUpperCase()}</div>
                            <div>
                                <div class="user-fullname">${escHTML(u.nombre_usuario)}${esYo ? ' <span style="font-size:0.68rem;background:rgba(178,150,125,0.2);color:var(--cocoa);padding:1px 6px;border-radius:8px;font-weight:600;">Tú</span>' : ''}</div>
                                <div class="user-username">${escHTML(u.fecha_creacion ? new Date(u.fecha_creacion).toLocaleDateString('es-CO') : '—')}</div>
                            </div>
                        </div>
                    </td>
                    <td style="font-family:monospace;font-size:0.82rem;color:var(--cocoa);font-weight:600;">@${escHTML(u.usuario)}</td>
                    <td>
                        <span class="badge-rol ${esAdmin ? 'rol-admin' : 'rol-ayudante'}">
                            ${esAdmin ? '⭐ ADMIN' : '👤 AYUDANTE'}
                        </span>
                    </td>
                    <td>
                        <span class="badge-estado ${activo ? 'estado-activo' : 'estado-inactivo'}">
                            <span class="dot-estado"></span>${activo ? 'Activo' : 'Inactivo'}
                        </span>
                    </td>
                    <td>${fecha}</td>
                    <td>
                        <div class="actions-cell">
                            <button class="btn-icon btn-edit" title="Editar usuario"
                                onclick="abrirEditar(${u.id}, '${escAttr(u.nombre_usuario)}', '${escAttr(u.usuario)}', '${u.rol}', ${u.activo})">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                            </button>
                            <button class="btn-icon btn-toggle" title="${toggleTitle}" ${esYo ? 'disabled' : ''}
                                onclick="toggleActivo(${u.id}, ${activo})">
                                ${activo
                                    ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>`
                                    : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
                                }
                            </button>
                            <button class="btn-icon btn-delete" title="${deleteTitle}" ${esYo ? 'disabled' : ''}
                                onclick="confirmarEliminar(${u.id}, '${escAttr(u.nombre_usuario)}')">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>`;
            }).join('');
        }

        function renderPagination(meta) {
            const container = document.getElementById('paginationContainer');
            if (!meta || meta.last_page <= 1) { container.style.display = 'none'; return; }
            container.style.display = 'flex';
            document.getElementById('paginationInfo').textContent = `Mostrando ${meta.from}–${meta.to} de ${meta.total}`;
            let html = `<button class="btn-page" ${meta.current_page===1?'disabled':''} onclick="loadUsuarios(${meta.current_page-1})">‹</button>`;
            for (let i = 1; i <= meta.last_page; i++) {
                if (i===1||i===meta.last_page||Math.abs(i-meta.current_page)<=1)
                    html += `<button class="btn-page ${i===meta.current_page?'active':''}" onclick="loadUsuarios(${i})">${i}</button>`;
                else if (Math.abs(i-meta.current_page)===2)
                    html += `<button class="btn-page" disabled>…</button>`;
            }
            html += `<button class="btn-page" ${meta.current_page===meta.last_page?'disabled':''} onclick="loadUsuarios(${meta.current_page+1})">›</button>`;
            document.getElementById('paginationBtns').innerHTML = html;
        }

        // ─── Abrir modal crear ────────────────────────────────────
        function abrirCrear() {
            editMode = false;
            document.getElementById('modalFormTitle').textContent = 'Nuevo Usuario';
            document.getElementById('btnSaveText').textContent    = 'Crear Usuario';
            document.getElementById('usuarioId').value            = '';
            document.getElementById('inputNombre').value          = '';
            document.getElementById('inputUsuario').value         = '';
            document.getElementById('inputPassword').value        = '';
            document.getElementById('inputPasswordConfirm').value = '';
            document.getElementById('inputActivo').checked        = true;
            document.getElementById('editPasswordNote').style.display = 'none';
            document.getElementById('pwReq').style.display    = 'inline';
            document.getElementById('pwConfReq').style.display = 'inline';
            document.getElementById('toggleActivoRow').style.display = 'flex';
            document.querySelector('input[name="rol"][value="AYUDANTE"]').checked = true;
            clearErrors();
            resetPwStrength();
            openModal('modalFormOverlay');
        }

        // ─── Abrir modal editar ───────────────────────────────────
        function abrirEditar(id, nombre, usuario, rol, activo) {
            editMode = true;
            document.getElementById('modalFormTitle').textContent = 'Editar Usuario';
            document.getElementById('btnSaveText').textContent    = 'Actualizar Usuario';
            document.getElementById('usuarioId').value            = id;
            document.getElementById('inputNombre').value          = nombre;
            document.getElementById('inputUsuario').value         = usuario;
            document.getElementById('inputPassword').value        = '';
            document.getElementById('inputPasswordConfirm').value = '';
            document.getElementById('inputActivo').checked        = activo;
            document.getElementById('editPasswordNote').style.display = 'block';
            document.getElementById('pwReq').style.display    = 'none';
            document.getElementById('pwConfReq').style.display = 'none';
            document.getElementById('toggleActivoRow').style.display = id === meId ? 'none' : 'flex';
            document.querySelector(`input[name="rol"][value="${rol}"]`).checked = true;
            clearErrors();
            resetPwStrength();
            openModal('modalFormOverlay');
        }

        // ─── Validación del formulario ────────────────────────────
        function validarForm() {
            let ok = true;
            const nombre   = document.getElementById('inputNombre').value.trim();
            const usuario  = document.getElementById('inputUsuario').value.trim();
            const password = document.getElementById('inputPassword').value;
            const confirm  = document.getElementById('inputPasswordConfirm').value;
            const rol      = document.querySelector('input[name="rol"]:checked')?.value;

            clearErrors();

            if (!nombre) { showError('errNombre'); showCtrlError('inputNombre'); ok = false; }
            if (!usuario || usuario.includes(' ')) {
                showError('errUsuario', usuario.includes(' ') ? 'El usuario no puede tener espacios.' : 'El usuario es obligatorio.');
                showCtrlError('inputUsuario');
                ok = false;
            }
            if (!editMode && password.length < 4) {
                showError('errPassword'); showCtrlError('inputPassword'); ok = false;
            }
            if (editMode && password && password.length < 4) {
                showError('errPassword'); showCtrlError('inputPassword'); ok = false;
            }
            if ((password || !editMode) && password !== confirm) {
                showError('errPasswordConfirm', 'Las contraseñas no coinciden.');
                showCtrlError('inputPasswordConfirm'); ok = false;
            }
            if (!rol) { showError('errRol'); ok = false; }

            return ok;
        }

        function showError(id, msg) {
            const el = document.getElementById(id);
            if (msg) el.textContent = msg;
            el.classList.add('show');
        }
        function showCtrlError(id) { document.getElementById(id).classList.add('error'); }
        function clearErrors() {
            document.querySelectorAll('.form-error').forEach(e => e.classList.remove('show'));
            document.querySelectorAll('.form-control').forEach(e => e.classList.remove('error'));
        }

        // ─── Guardar usuario ──────────────────────────────────────
        async function guardarUsuario() {
            if (!validarForm()) return;

            const id       = document.getElementById('usuarioId').value;
            const nombre   = document.getElementById('inputNombre').value.trim();
            const usuario  = document.getElementById('inputUsuario').value.trim();
            const password = document.getElementById('inputPassword').value;
            const confirm  = document.getElementById('inputPasswordConfirm').value;
            const rol      = document.querySelector('input[name="rol"]:checked').value;
            const activo   = document.getElementById('inputActivo').checked;

            const body = { nombre_usuario: nombre, usuario, rol, activo };
            if (password) {
                body.password              = password;
                body.password_confirmation = confirm;
            }
            if (!editMode) {
                body.password              = password;
                body.password_confirmation = confirm;
            }

            const btn = document.getElementById('btnSaveUsuario');
            btn.disabled = true;

            try {
                const url    = editMode ? `${API}/usuarios/${id}` : `${API}/usuarios`;
                const method = editMode ? 'PUT' : 'POST';
                const res    = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(body) });
                const json   = await res.json();

                if (!res.ok) {
                    // Errores de validación del backend
                    if (json.errors) {
                        const errs = json.errors;
                        if (errs.usuario)   showError('errUsuario',         errs.usuario[0]);
                        if (errs.password)  showError('errPassword',        errs.password[0]);
                        if (errs.nombre_usuario) showError('errNombre',     errs.nombre_usuario[0]);
                        return;
                    }
                    throw new Error(json.message || 'Error al guardar.');
                }

                closeModal('modalFormOverlay');
                showToast(json.message || 'Usuario guardado.', 'success');
                loadUsuarios(currentPage);
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                btn.disabled = false;
            }
        }

        // ─── Toggle activo/inactivo ───────────────────────────────
        async function toggleActivo(id, estadoActual) {
            try {
                const res  = await fetch(`${API}/usuarios/${id}`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify({ activo: !estadoActual })
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json.message || 'No se pudo actualizar.');
                showToast(json.message || `Usuario ${!estadoActual ? 'activado' : 'desactivado'}.`, 'success');
                loadUsuarios(currentPage);
            } catch (err) {
                showToast(err.message, 'error');
            }
        }

        // ─── Eliminar ─────────────────────────────────────────────
        function confirmarEliminar(id, nombre) {
            deleteId = id;
            document.getElementById('confirmTitle').textContent = `¿Eliminar a ${nombre}?`;
            document.getElementById('confirmText').textContent  = `Si tiene ventas registradas, la cuenta será desactivada en lugar de eliminada. Esta acción no se puede deshacer.`;
            openModal('modalConfirmOverlay');
        }

        async function eliminarUsuario() {
            if (!deleteId) return;
            const btn = document.getElementById('btnConfirmDelete');
            btn.disabled = true;
            try {
                const res  = await fetch(`${API}/usuarios/${deleteId}`, { method: 'DELETE', headers: getHeaders() });
                const json = await res.json();
                if (!res.ok) throw new Error(json.message || 'No se pudo eliminar.');
                closeModal('modalConfirmOverlay');
                const type = json.warning ? 'warning' : 'success';
                showToast(json.message, type);
                loadUsuarios(currentPage);
            } catch (err) {
                closeModal('modalConfirmOverlay');
                showToast(err.message, 'error');
            } finally {
                btn.disabled = false;
                deleteId = null;
            }
        }

        // ─── Fortaleza de contraseña ──────────────────────────────
        function evaluarPassword(pw) {
            if (!pw) { resetPwStrength(); return; }
            let score = 0;
            if (pw.length >= 4)  score++;
            if (pw.length >= 8)  score++;
            if (/[A-Z]/.test(pw) || /[0-9]/.test(pw)) score++;
            if (/[^A-Za-z0-9]/.test(pw)) score++;

            const bars   = ['bar1','bar2','bar3','bar4'];
            const cls    = score <= 1 ? 'weak' : score === 2 ? 'medium' : score === 3 ? 'medium' : 'strong';
            const labels = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'];
            bars.forEach((b, i) => {
                const el = document.getElementById(b);
                el.className = 'pw-bar ' + (i < score ? cls : '');
            });
            document.getElementById('pwStrengthText').textContent = score > 0 ? `Contraseña ${labels[score]}` : '';
        }

        function resetPwStrength() {
            ['bar1','bar2','bar3','bar4'].forEach(b => { document.getElementById(b).className = 'pw-bar'; });
            document.getElementById('pwStrengthText').textContent = '';
        }

        // ─── Toggle visibilidad contraseña ────────────────────────
        function togglePw(inputId, btnId, iconId) {
            const input = document.getElementById(inputId);
            const show  = input.type === 'password';
            input.type  = show ? 'text' : 'password';
            document.getElementById(iconId).innerHTML = show
                ? `<path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>`
                : `<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>`;
        }

        // ─── Modales ─────────────────────────────────────────────
        function openModal(id)  { document.getElementById(id).classList.add('open'); }
        function closeModal(id) { document.getElementById(id).classList.remove('open'); }

        // ─── Toast ───────────────────────────────────────────────
        function showToast(msg, type = 'default') {
            const cont  = document.getElementById('toastContainer');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            const icons = {
                success: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`,
                error:   `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`,
                warning: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
                default: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
            };
            toast.innerHTML = `${icons[type] || icons.default}<span>${escHTML(msg)}</span>`;
            cont.appendChild(toast);
            requestAnimationFrame(() => toast.classList.add('show'));
            setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 4000);
        }

        // ─── Helpers ─────────────────────────────────────────────
        function escHTML(str) { return String(str??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
        function escAttr(str) { return String(str??'').replace(/'/g,"\\'").replace(/"/g,'&quot;'); }

        // ─── Listeners ───────────────────────────────────────────
        document.getElementById('btnNuevoUsuario').addEventListener('click',  abrirCrear);
        document.getElementById('btnSaveUsuario').addEventListener('click',   guardarUsuario);
        document.getElementById('btnCloseForm').addEventListener('click',     () => closeModal('modalFormOverlay'));
        document.getElementById('btnCancelForm').addEventListener('click',    () => closeModal('modalFormOverlay'));
        document.getElementById('btnCancelConfirm').addEventListener('click', () => closeModal('modalConfirmOverlay'));
        document.getElementById('btnConfirmDelete').addEventListener('click', eliminarUsuario);

        document.getElementById('btnLogout').addEventListener('click', async () => {
            await AuthService.logout();
            window.location.href = 'login.html';
        });

        // Click fuera para cerrar modal
        document.querySelectorAll('.modal-overlay').forEach(o => {
            o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
        });

        // Mostrar/ocultar contraseñas
        document.getElementById('btnEye1').addEventListener('click', () => togglePw('inputPassword', 'btnEye1', 'eyeIcon1'));
        document.getElementById('btnEye2').addEventListener('click', () => togglePw('inputPasswordConfirm', 'btnEye2', 'eyeIcon2'));

        // Fortaleza de contraseña
        document.getElementById('inputPassword').addEventListener('input', e => evaluarPassword(e.target.value));

        // Limpiar error usuario al escribir
        document.getElementById('inputUsuario').addEventListener('input', function() {
            this.value = this.value.replace(/\s/g, '');
        });

        // Búsqueda con debounce
        document.getElementById('searchInput').addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => loadUsuarios(1), 400);
        });
        document.getElementById('filterRol').addEventListener('change',    () => loadUsuarios(1));
        document.getElementById('filterActivo').addEventListener('change', () => loadUsuarios(1));

        // Enter en formulario
        document.getElementById('usuarioForm').addEventListener('keydown', e => {
            if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') { e.preventDefault(); guardarUsuario(); }
        });

        // ─── Init ─────────────────────────────────────────────────
        loadUsuarios(1);
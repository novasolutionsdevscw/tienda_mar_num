AuthService.requireAuth();

        let currentPage = 1;
        let deleteId    = null;
        let searchTimer = null;
        let editMode    = false;

        function getHeaders() {
            return {
                'Content-Type': 'application/json',
                'Accept':       'application/json',
                'Authorization': `Bearer ${AuthService.getToken()}`
            };
        }

        // ─── Usuario ─────────────────────────────────────────────
        (function loadUser() {
            const u = AuthService.getUser();
            if (!u) return;
            const nombre = u.nombre_usuario || u.usuario || 'Usuario';
            document.getElementById('userName').textContent   = nombre;
            document.getElementById('userRole').textContent   = u.rol === 'ADMIN' ? '⭐ Administrador' : 'Ayudante';
            document.getElementById('userAvatar').textContent = nombre.charAt(0).toUpperCase();
            if (u.rol === 'ADMIN') document.getElementById('nav-usuarios').style.display = 'flex';
        })();

        // ─── Cargar Productos ─────────────────────────────────────
        async function loadData(page = 1) {
            const buscar = document.getElementById('searchInput').value.trim();
            const activo = document.getElementById('filterActivo').value;

            let url = `${API}/productos?page=${page}`;
            if (buscar) url += `&buscar=${encodeURIComponent(buscar)}`;
            if (activo) url += `&activo=${activo}`;

            const tbody = document.getElementById('tableBody');
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:32px;"><span class="skeleton" style="width:200px;display:inline-block;"></span></td></tr>`;

            try {
                const res  = await fetch(url, { headers: getHeaders() });
                const json = await res.json();
                if (!res.ok) throw new Error(json.message || 'Error al cargar.');

                renderTabla(json.data || []);
                renderPagination(json.meta || {});
                document.getElementById('totalBadge').textContent = `${json.meta?.total || 0} productos`;
                currentPage = json.meta?.current_page || 1;
                if (!window.__productosStatsLoaded) {
                    window.__productosStatsLoaded = true;
                    loadStats();
                }
            } catch (err) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#c05050;padding:32px;">${err.message}</td></tr>`;
                showToast(err.message, 'error');
            }
        }

        async function loadStats() {
            try {
                const res = await fetch(`${API}/productos?all=1`, { headers: getHeaders() });
                const json = await res.json();
                const todos = json.data || [];
                document.getElementById('statTotal').textContent = todos.length;
                document.getElementById('statActivos').textContent = todos.filter(p => p.activo).length;
                document.getElementById('statInactivos').textContent = todos.filter(p => !p.activo).length;
            } catch {}
        }

        function renderTabla(lista) {
            const tbody = document.getElementById('tableBody');
            if (!lista.length) {
                tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/></svg><p>No se encontraron productos</p></div></td></tr>`;
                return;
            }

            tbody.innerHTML = lista.map(p => `
                <tr>
                    <td>
                        <div class="prod-cell">
                            <div class="prod-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                            </div>
                            <div class="prod-name">${escHTML(p.nombre)}</div>
                        </div>
                    </td>
                    <td style="font-weight:600;color:var(--espresso);">$${formatCOP(p.precio)}</td>
                    <td>
                        <span class="badge-estado ${p.activo ? 'estado-activo' : 'estado-inactivo'}">
                            <span class="dot"></span>${p.activo ? 'Activo' : 'Inactivo'}
                        </span>
                    </td>
                    <td>
                        <div class="actions-cell">
                            <button class="btn-icon btn-edit" onclick="abrirEditar(${p.id}, '${escAttr(p.nombre)}', ${p.precio}, ${p.activo})">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                            </button>
                            <button class="btn-icon btn-delete" onclick="confirmarEliminar(${p.id}, '${escAttr(p.nombre)}')">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        function renderPagination(meta) {
            const container = document.getElementById('paginationContainer');
            if (!meta || !meta.last_page || meta.last_page <= 1) { container.style.display = 'none'; return; }
            container.style.display = 'flex';
            document.getElementById('paginationInfo').textContent = `Mostrando ${meta.from}–${meta.to} de ${meta.total}`;
            let html = `<button class="btn-page" ${meta.current_page===1?'disabled':''} onclick="loadData(${meta.current_page-1})">‹</button>`;
            for (let i = 1; i <= meta.last_page; i++) {
                if (i===1||i===meta.last_page||Math.abs(i-meta.current_page)<=1)
                    html += `<button class="btn-page ${i===meta.current_page?'active':''}" onclick="loadData(${i})">${i}</button>`;
                else if (Math.abs(i-meta.current_page)===2)
                    html += `<button class="btn-page" disabled>…</button>`;
            }
            html += `<button class="btn-page" ${meta.current_page===meta.last_page?'disabled':''} onclick="loadData(${meta.current_page+1})">›</button>`;
            document.getElementById('paginationBtns').innerHTML = html;
        }

        // ─── CRUD ────────────────────────────────────────────────
        function abrirCrear() {
            editMode = false;
            document.getElementById('modalFormTitle').textContent = 'Nuevo Producto';
            document.getElementById('btnSaveText').textContent = 'Guardar Producto';
            document.getElementById('prodId').value = '';
            document.getElementById('inputNombre').value = '';
            document.getElementById('inputPrecio').value = '';
            document.getElementById('inputActivo').checked = true;
            clearErrors();
            openModal('modalFormOverlay');
        }

        function abrirEditar(id, nombre, precio, activo) {
            editMode = true;
            document.getElementById('modalFormTitle').textContent = 'Editar Producto';
            document.getElementById('btnSaveText').textContent = 'Actualizar';
            document.getElementById('prodId').value = id;
            document.getElementById('inputNombre').value = nombre;
            document.getElementById('inputPrecio').value = precio;
            document.getElementById('inputActivo').checked = activo;
            clearErrors();
            openModal('modalFormOverlay');
        }

        async function guardar() {
            const id     = document.getElementById('prodId').value;
            const nombre = document.getElementById('inputNombre').value.trim();
            const precio = document.getElementById('inputPrecio').value;
            const activo = document.getElementById('inputActivo').checked;

            clearErrors();
            let ok = true;
            if (!nombre) { document.getElementById('errNombre').classList.add('show'); document.getElementById('inputNombre').classList.add('error'); ok = false; }
            if (!precio || precio < 0) { document.getElementById('errPrecio').classList.add('show'); document.getElementById('inputPrecio').classList.add('error'); ok = false; }
            if (!ok) return;

            const btn = document.getElementById('btnSaveProd');
            btn.disabled = true;

            try {
                const url = editMode ? `${API}/productos/${id}` : `${API}/productos`;
                const method = editMode ? 'PUT' : 'POST';
                const res = await fetch(url, {
                    method, headers: getHeaders(),
                    body: JSON.stringify({ nombre, precio, activo })
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json.message || 'Error al guardar');
                
                closeModal('modalFormOverlay');
                showToast(json.message, 'success');
                window.__productosStatsLoaded = false;
                loadData(currentPage);
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                btn.disabled = false;
            }
        }

        function confirmarEliminar(id, nombre) {
            deleteId = id;
            document.getElementById('confirmTitle').textContent = `¿Eliminar ${nombre}?`;
            openModal('modalConfirmOverlay');
        }

        async function ejecutarEliminar() {
            if (!deleteId) return;
            const btn = document.getElementById('btnConfirmDelete');
            btn.disabled = true;
            try {
                const res = await fetch(`${API}/productos/${deleteId}`, { method: 'DELETE', headers: getHeaders() });
                const json = await res.json();
                if (!res.ok) throw new Error(json.message || 'Error al eliminar');
                closeModal('modalConfirmOverlay');
                showToast(json.message, json.warning ? 'warning' : 'success');
                window.__productosStatsLoaded = false;
                loadData(currentPage);
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                btn.disabled = false;
                deleteId = null;
            }
        }

        // ─── Helpers & Utils ──────────────────────────────────────
        function clearErrors() {
            document.querySelectorAll('.form-error').forEach(e => e.classList.remove('show'));
            document.querySelectorAll('.form-control').forEach(e => e.classList.remove('error'));
        }
        function openModal(id) { document.getElementById(id).classList.add('open'); }
        function closeModal(id) { document.getElementById(id).classList.remove('open'); }
        function escHTML(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
        function escAttr(s) { return String(s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;'); }
        function formatCOP(v) { return new Intl.NumberFormat('es-CO').format(v||0); }

        function showToast(msg, type = 'default') {
            const cont = document.getElementById('toastContainer');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            const icons = {
                success: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`,
                error:   `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`,
                warning: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
                default: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
            };
            toast.innerHTML = `${icons[type]||icons.default}<span>${escHTML(msg)}</span>`;
            cont.appendChild(toast);
            requestAnimationFrame(() => toast.classList.add('show'));
            setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3500);
        }

        // ─── Event Listeners ──────────────────────────────────────
        document.getElementById('btnSaveProd').addEventListener('click', guardar);
        document.getElementById('btnConfirmDelete').addEventListener('click', ejecutarEliminar);
        document.getElementById('searchInput').addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => loadData(1), 400);
        });
        document.getElementById('filterActivo').addEventListener('change', () => loadData(1));
        document.getElementById('btnLogout').addEventListener('click', async () => {
            await AuthService.logout();
            window.location.href = 'login.html';
        });
        document.getElementById('prodForm').addEventListener('submit', e => { e.preventDefault(); guardar(); });

        document.querySelectorAll('.modal-overlay').forEach(o => {
            o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
        });

        // ─── Init ─────────────────────────────────────────────────
        loadData(1);
// ─── Guard ───────────────────────────────────────────────
        AuthService.requireAuth();

        // ─── Estado ──────────────────────────────────────────────
        let currentPage    = 1;
        let totalPages     = 1;
        let deleteClienteId = null;
        let searchTimer    = null;
        let editMode       = false;

        function getHeaders() {
            return {
                'Content-Type': 'application/json',
                'Accept':       'application/json',
                'Authorization': `Bearer ${AuthService.getToken()}`
            };
        }

        // ─── Usuario ─────────────────────────────────────────────
        (function loadUser() {
            const user = AuthService.getUser();
            if (!user) return;
            const nombre = user.nombre_usuario || user.usuario || 'Usuario';
            document.getElementById('userName').textContent   = nombre;
            document.getElementById('userRole').textContent   = user.rol === 'ADMIN' ? '⭐ Administrador' : 'Ayudante';
            document.getElementById('userAvatar').textContent = nombre.charAt(0).toUpperCase();
            if (user.rol === 'ADMIN') document.getElementById('nav-usuarios').style.display = 'flex';
        })();

        // ─── Cargar clientes ─────────────────────────────────────
        async function loadClientes(page = 1) {
            const buscar    = document.getElementById('searchInput').value.trim();
            const con_deuda = document.getElementById('filterDeuda').value;

            let url = `${API}/clientes?page=${page}`;
            if (buscar)    url += `&buscar=${encodeURIComponent(buscar)}`;
            if (con_deuda !== '') url += `&con_deuda=${con_deuda}`;

            const tbody = document.getElementById('clientesTableBody');
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;"><span class="skeleton" style="width:200px;display:inline-block;"></span></td></tr>`;

            try {
                const res  = await fetch(url, { headers: getHeaders() });
                const json = await res.json();

                if (!res.ok) throw new Error(json.message || 'Error al cargar clientes.');

                const { data, meta } = json;
                renderTabla(data);
                renderPagination(meta);
                document.getElementById('totalBadge').textContent = `${meta.total} clientes`;
                currentPage = meta.current_page;
                totalPages  = meta.last_page;

                // Badge deudas
                loadBadgeDeudas();
            } catch (err) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:#c05050;">${err.message}</td></tr>`;
                showToast(err.message, 'error');
            }
        }

        function renderTabla(clientes) {
            const tbody = document.getElementById('clientesTableBody');
            if (!clientes || clientes.length === 0) {
                tbody.innerHTML = `
                    <tr><td colspan="7">
                        <div class="empty-state">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                            <p>No se encontraron clientes</p>
                            <div class="sub">Prueba con otro filtro o registra un cliente nuevo</div>
                        </div>
                    </td></tr>`;
                return;
            }

            tbody.innerHTML = clientes.map(c => {
                const tieneDeuda = parseFloat(c.saldo_deuda) > 0;
                const fecha = c.fecha_registro
                    ? new Date(c.fecha_registro).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' })
                    : '—';
                return `
                <tr>
                    <td>
                        <div class="client-name">
                            <div class="client-avatar">${c.nombre.charAt(0).toUpperCase()}</div>
                            ${escHTML(c.nombre)}
                        </div>
                    </td>
                    <td>${escHTML(c.telefono || '—')}</td>
                    <td style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHTML(c.direccion || '—')}</td>
                    <td style="font-weight:600;color:${tieneDeuda ? '#8b3a3a' : 'var(--espresso)'};">
                        $${formatMoney(c.saldo_deuda)}
                    </td>
                    <td>
                        <span class="badge-deuda ${tieneDeuda ? 'badge-con-deuda' : 'badge-sin-deuda'}">
                            ${tieneDeuda ? 'Con deuda' : 'Al día'}
                        </span>
                    </td>
                    <td>${fecha}</td>
                    <td>
                        <div class="actions-cell">
                            <button class="btn-icon btn-view" title="Ver detalle" onclick="verDetalle(${c.id})">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                            </button>
                            <button class="btn-icon btn-edit" title="Editar" onclick="editarCliente(${c.id}, '${escAttr(c.nombre)}', '${escAttr(c.telefono||'')}', '${escAttr(c.direccion||'')}')">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                            </button>
                            <button class="btn-icon btn-delete" title="Eliminar" onclick="confirmarEliminar(${c.id}, '${escAttr(c.nombre)}')">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>`;
            }).join('');
        }

        function renderPagination(meta) {
            const container = document.getElementById('paginationContainer');
            const info      = document.getElementById('paginationInfo');
            const btns      = document.getElementById('paginationBtns');

            if (!meta || meta.last_page <= 1) { container.style.display = 'none'; return; }
            container.style.display = 'flex';
            info.textContent = `Mostrando ${meta.from}–${meta.to} de ${meta.total}`;

            let html = `<button class="btn-page" ${meta.current_page === 1 ? 'disabled' : ''} onclick="loadClientes(${meta.current_page - 1})">‹</button>`;
            for (let i = 1; i <= meta.last_page; i++) {
                if (i === 1 || i === meta.last_page || Math.abs(i - meta.current_page) <= 1) {
                    html += `<button class="btn-page ${i === meta.current_page ? 'active' : ''}" onclick="loadClientes(${i})">${i}</button>`;
                } else if (Math.abs(i - meta.current_page) === 2) {
                    html += `<button class="btn-page" disabled>…</button>`;
                }
            }
            html += `<button class="btn-page" ${meta.current_page === meta.last_page ? 'disabled' : ''} onclick="loadClientes(${meta.current_page + 1})">›</button>`;
            btns.innerHTML = html;
        }

        async function loadBadgeDeudas() {
            try {
                const res  = await fetch(`${API}/deudas?estado=PENDIENTE&per_page=1`, { headers: getHeaders() });
                const json = await res.json();
                if (json.data && json.data.meta) {
                    document.getElementById('badge-deudas').textContent = json.data.meta.total || 0;
                }
            } catch {}
        }

        // ─── Ver detalle ─────────────────────────────────────────
        async function verDetalle(id) {
            openModal('modalDetailOverlay');
            document.getElementById('modalDetailBody').innerHTML = `<div style="text-align:center;padding:24px;"><span class="skeleton" style="width:180px;height:14px;display:inline-block;"></span></div>`;

            try {
                const res  = await fetch(`${API}/clientes/${id}`, { headers: getHeaders() });
                const json = await res.json();
                if (!res.ok) throw new Error(json.message || 'Error al cargar detalle.');

                const c = json.data;
                document.getElementById('modalDetailTitle').textContent = c.nombre;

                const deudas = c.deudas || [];
                const deudaHTML = deudas.length === 0
                    ? `<p style="font-size:0.82rem;color:var(--text-light);margin-top:8px;">Sin deudas registradas</p>`
                    : deudas.map(d => `
                        <div class="deuda-item">
                            <div>
                                <div class="deuda-monto">$${formatMoney(d.saldo_pendiente)} pendiente</div>
                                <div class="deuda-fecha">Monto original: $${formatMoney(d.monto)} · ${d.fecha ? new Date(d.fecha).toLocaleDateString('es-CO') : '—'}</div>
                            </div>
                            <span class="deuda-estado ${d.estado === 'PAGADO' ? 'estado-pagado' : 'estado-pendiente'}">${d.estado}</span>
                        </div>`).join('');

                document.getElementById('modalDetailBody').innerHTML = `
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-label">Nombre</div>
                            <div class="detail-value">${escHTML(c.nombre)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Teléfono</div>
                            <div class="detail-value">${escHTML(c.telefono || '—')}</div>
                        </div>
                        <div class="detail-item" style="grid-column:1/-1;">
                            <div class="detail-label">Dirección</div>
                            <div class="detail-value">${escHTML(c.direccion || '—')}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Saldo Deuda</div>
                            <div class="detail-value debt">$${formatMoney(c.saldo_deuda)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Fecha de Registro</div>
                            <div class="detail-value">${c.fecha_registro ? new Date(c.fecha_registro).toLocaleDateString('es-CO', {day:'2-digit',month:'long',year:'numeric'}) : '—'}</div>
                        </div>
                    </div>
                    <div>
                        <div class="detail-label" style="margin-bottom:10px;">Deudas / Fiados</div>
                        <div class="deudas-list">${deudaHTML}</div>
                    </div>`;
            } catch (err) {
                document.getElementById('modalDetailBody').innerHTML = `<p style="color:#c05050;text-align:center;">${err.message}</p>`;
            }
        }

        // ─── Crear / editar ───────────────────────────────────────
        function abrirModalCrear() {
            editMode = false;
            document.getElementById('modalFormTitle').textContent  = 'Nuevo Cliente';
            document.getElementById('btnSaveText').textContent     = 'Guardar Cliente';
            document.getElementById('clienteId').value    = '';
            document.getElementById('inputNombre').value  = '';
            document.getElementById('inputTelefono').value = '';
            document.getElementById('inputDireccion').value = '';
            document.getElementById('errNombre').style.display = 'none';
            openModal('modalFormOverlay');
        }

        function editarCliente(id, nombre, telefono, direccion) {
            editMode = true;
            document.getElementById('modalFormTitle').textContent  = 'Editar Cliente';
            document.getElementById('btnSaveText').textContent     = 'Actualizar Cliente';
            document.getElementById('clienteId').value    = id;
            document.getElementById('inputNombre').value  = nombre;
            document.getElementById('inputTelefono').value = telefono;
            document.getElementById('inputDireccion').value = direccion;
            document.getElementById('errNombre').style.display = 'none';
            openModal('modalFormOverlay');
        }

        async function guardarCliente() {
            const id       = document.getElementById('clienteId').value;
            const nombre   = document.getElementById('inputNombre').value.trim();
            const telefono = document.getElementById('inputTelefono').value.trim();
            const direccion= document.getElementById('inputDireccion').value.trim();

            // Validación simple
            if (!nombre) {
                document.getElementById('errNombre').style.display = 'block';
                document.getElementById('inputNombre').focus();
                return;
            }
            document.getElementById('errNombre').style.display = 'none';

            const body = { nombre_cliente: nombre };
            if (telefono)  body.telefono_cliente  = telefono;
            if (direccion) body.direccion_cliente = direccion;

            const btn = document.getElementById('btnSaveCliente');
            btn.disabled = true;

            try {
                const url    = editMode ? `${API}/clientes/${id}` : `${API}/clientes`;
                const method = editMode ? 'PUT' : 'POST';
                const res    = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(body) });
                const json   = await res.json();
                if (!res.ok) throw new Error(json.message || 'Error al guardar.');
                closeModal('modalFormOverlay');
                showToast(json.message || 'Cliente guardado correctamente.', 'success');
                loadClientes(currentPage);
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                btn.disabled = false;
            }
        }

        // ─── Eliminar ─────────────────────────────────────────────
        function confirmarEliminar(id, nombre) {
            deleteClienteId = id;
            document.getElementById('confirmText').textContent = `¿Estás seguro de que deseas eliminar a "${nombre}"? Esta acción no se puede deshacer.`;
            openModal('modalConfirmOverlay');
        }

        async function eliminarCliente() {
            if (!deleteClienteId) return;
            const btn = document.getElementById('btnConfirmDelete');
            btn.disabled = true;
            try {
                const res  = await fetch(`${API}/clientes/${deleteClienteId}`, { method: 'DELETE', headers: getHeaders() });
                const json = await res.json();
                if (!res.ok) throw new Error(json.message || 'No se pudo eliminar.');
                closeModal('modalConfirmOverlay');
                showToast(json.message || 'Cliente eliminado.', 'success');
                loadClientes(currentPage);
            } catch (err) {
                closeModal('modalConfirmOverlay');
                showToast(err.message, 'error');
            } finally {
                btn.disabled = false;
                deleteClienteId = null;
            }
        }

        // ─── Modales ─────────────────────────────────────────────
        function openModal(id)  { document.getElementById(id).classList.add('open'); }
        function closeModal(id) { document.getElementById(id).classList.remove('open'); }

        // ─── Toast ───────────────────────────────────────────────
        function showToast(msg, type = 'default') {
            const cont  = document.getElementById('toastContainer');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            const icon = type === 'success'
                ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`
                : type === 'error'
                ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
            toast.innerHTML = `${icon}<span>${escHTML(msg)}</span>`;
            cont.appendChild(toast);
            requestAnimationFrame(() => toast.classList.add('show'));
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 400);
            }, 3500);
        }

        // ─── Helpers ─────────────────────────────────────────────
        function escHTML(str) {
            return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        }
        function escAttr(str) {
            return String(str ?? '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        }
        function formatMoney(val) {
            return parseFloat(val || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        // ─── Listeners ───────────────────────────────────────────
        document.getElementById('btnNuevoCliente').addEventListener('click', abrirModalCrear);
        document.getElementById('btnSaveCliente').addEventListener('click', guardarCliente);
        document.getElementById('btnCancelForm').addEventListener('click',  () => closeModal('modalFormOverlay'));
        document.getElementById('btnCloseModalForm').addEventListener('click', () => closeModal('modalFormOverlay'));
        document.getElementById('btnCloseModalDetail').addEventListener('click', () => closeModal('modalDetailOverlay'));
        document.getElementById('btnCloseDetailFooter').addEventListener('click', () => closeModal('modalDetailOverlay'));
        document.getElementById('btnCancelConfirm').addEventListener('click', () => closeModal('modalConfirmOverlay'));
        document.getElementById('btnConfirmDelete').addEventListener('click', eliminarCliente);

        document.getElementById('btnLogout').addEventListener('click', async () => {
            await AuthService.logout();
            window.location.href = 'login.html';
        });

        // Click outside modal to close
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
        });

        // Búsqueda con debounce
        document.getElementById('searchInput').addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => loadClientes(1), 400);
        });
        document.getElementById('filterDeuda').addEventListener('change', () => loadClientes(1));

        // Enter en formulario
        document.getElementById('clienteForm').addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); guardarCliente(); }
        });

        // ─── Inicializar ─────────────────────────────────────────
        loadClientes(1);
AuthService.requireAuth();

        const today = new Date().toISOString().slice(0, 10);
        document.getElementById('fechaDiario').value = today;
        document.getElementById('fechaSemanal').value = today;

        let editMode = false;

        function getHeaders() {
            return {
                'Content-Type': 'application/json',
                'Accept':       'application/json',
                'Authorization': `Bearer ${AuthService.getToken()}`
            };
        }

        (function loadUser() {
            const u = AuthService.getUser();
            if (!u) return;
            const nombre = u.nombre_usuario || u.usuario || 'Usuario';
            document.getElementById('userName').textContent   = nombre;
            document.getElementById('userRole').textContent   = u.rol === 'ADMIN' ? '⭐ Administrador' : 'Ayudante';
            document.getElementById('userAvatar').textContent = nombre.charAt(0).toUpperCase();
            if (u.rol === 'ADMIN') document.getElementById('nav-usuarios').style.display = 'flex';
        })();

        document.getElementById('btnLogout').addEventListener('click', async () => {
            await AuthService.logout();
            window.location.href = 'login.html';
        });

        // ─── TABS ──────────────────────────────────────────────────
        function switchTab(tabId) {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            document.querySelector(`.tab-btn[onclick="switchTab('${tabId}')"]`).classList.add('active');
            document.getElementById(`tab-${tabId}`).classList.add('active');

            if (tabId === 'diario') loadReporteDiario();
            if (tabId === 'semanal') loadReporteSemanal();
            if (tabId === 'gestion') loadControlDiario();
        }

        // ─── REPORTE DIARIO ────────────────────────────────────────
        async function loadReporteDiario() {
            const f = document.getElementById('fechaDiario').value;
            try {
                const res = await fetch(`${API}/reportes/diario?fecha=${f}`, { headers: getHeaders() });
                const json = await res.json();
                if (!res.ok) throw new Error(json.message);

                document.getElementById('dTotalVentas').textContent = `$${formatCOP(json.total_ventas)}`;
                document.getElementById('dTotalFiado').textContent = `$${formatCOP(json.ventas_fiado)}`;
                document.getElementById('dTotalContado').textContent = `$${formatCOP(json.ventas_contado)}`;
                document.getElementById('dPagosRecibidos').textContent = `$${formatCOP(json.pagos_recibidos)}`;
                
                const ctrl = json.control_diario || { ingresos: 0, gastos: 0 };
                document.getElementById('dIngresos').textContent = `$${formatCOP(ctrl.ingresos)}`;
                document.getElementById('dGastos').textContent = `$${formatCOP(ctrl.gastos)}`;

                const tb = document.getElementById('tbVentasDiario');
                if (json.ventas.length === 0) {
                    tb.innerHTML = `<tr><td colspan="5" class="empty-state">No hay ventas registradas.</td></tr>`;
                } else {
                    tb.innerHTML = json.ventas.map(v => `
                        <tr>
                            <td style="font-weight:600;color:var(--cocoa);">#${v.id}</td>
                            <td>${v.cliente ? escHTML(v.cliente.nombre_cliente) : '<em style="color:#aaa;">Sin cliente</em>'}</td>
                            <td>${v.tipo_pago}</td>
                            <td class="val-moneda">$${formatCOP(v.total)}</td>
                            <td>${new Date(v.fecha).toLocaleTimeString('es-CO')}</td>
                        </tr>
                    `).join('');
                }
            } catch (err) {
                showToast(err.message, 'error');
            }
        }

        // ─── REPORTE SEMANAL ───────────────────────────────────────
        async function loadReporteSemanal() {
            const f = document.getElementById('fechaSemanal').value;
            try {
                const res = await fetch(`${API}/reportes/semanal?fecha=${f}`, { headers: getHeaders() });
                const json = await res.json();
                if (!res.ok) throw new Error(json.message);

                document.getElementById('lblSemanaRango').textContent = `Semana del ${json.rango.inicio} al ${json.rango.fin}`;
                document.getElementById('sTotalVentas').textContent = `$${formatCOP(json.total_ventas)}`;
                document.getElementById('sTotalFiado').textContent = `$${formatCOP(json.ventas_fiado)}`;
                document.getElementById('sIngresos').textContent = `$${formatCOP(json.total_ingresos)}`;
                document.getElementById('sGastos').textContent = `$${formatCOP(json.total_gastos)}`;
                document.getElementById('sGanancias').textContent = `$${formatCOP(json.total_ganancias)}`;
                if(json.total_ganancias < 0) {
                    document.getElementById('sGanancias').style.color = '#8b3a3a';
                } else {
                    document.getElementById('sGanancias').style.color = 'var(--espresso)';
                }

            } catch (err) {
                showToast(err.message, 'error');
            }
        }

        // ─── GESTIÓN DE CONTROL DIARIO ─────────────────────────────
        async function loadControlDiario() {
            const tb = document.getElementById('tbControl');
            tb.innerHTML = `<tr><td colspan="5" class="empty-state">Cargando...</td></tr>`;
            try {
                const res = await fetch(`${API}/control-diario`, { headers: getHeaders() });
                const json = await res.json();
                const list = json.data || [];
                
                if (list.length === 0) {
                    tb.innerHTML = `<tr><td colspan="5" class="empty-state">No hay registros manuales.</td></tr>`;
                    return;
                }

                tb.innerHTML = list.map(c => `
                    <tr>
                        <td style="font-weight:600;">${c.fecha}</td>
                        <td class="val-moneda" style="color:#4a7c4a;">$${formatCOP(c.ingresos)}</td>
                        <td class="val-moneda" style="color:#8b3a3a;">$${formatCOP(c.gastos)}</td>
                        <td class="val-moneda">$${formatCOP(c.ganancias)}</td>
                        <td>
                            <div class="actions-cell">
                                <button class="btn-icon btn-edit" onclick="abrirEditControl(${c.id}, '${c.fecha}', ${c.ingresos}, ${c.gastos})">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                                </button>
                                <button class="btn-icon btn-delete" onclick="eliminarControl(${c.id})">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('');

            } catch (err) {
                tb.innerHTML = `<tr><td colspan="5" class="empty-state" style="color:#c05050;">${err.message}</td></tr>`;
            }
        }

        function abrirControlModal() {
            editMode = false;
            document.getElementById('modalControlTitle').textContent = 'Nuevo Registro Diario';
            document.getElementById('ctrlId').value = '';
            document.getElementById('ctrlFecha').value = today;
            document.getElementById('ctrlIngresos').value = '0';
            document.getElementById('ctrlGastos').value = '0';
            document.querySelectorAll('.form-error').forEach(e=>e.style.display='none');
            openModal('modalControl');
        }

        function abrirEditControl(id, fecha, ing, gas) {
            editMode = true;
            document.getElementById('modalControlTitle').textContent = 'Editar Registro Diario';
            document.getElementById('ctrlId').value = id;
            document.getElementById('ctrlFecha').value = fecha;
            document.getElementById('ctrlIngresos').value = ing;
            document.getElementById('ctrlGastos').value = gas;
            document.querySelectorAll('.form-error').forEach(e=>e.style.display='none');
            openModal('modalControl');
        }

        async function guardarControl() {
            const id = document.getElementById('ctrlId').value;
            const fecha = document.getElementById('ctrlFecha').value;
            const ingresos = document.getElementById('ctrlIngresos').value;
            const gastos = document.getElementById('ctrlGastos').value;

            document.querySelectorAll('.form-error').forEach(e=>e.style.display='none');
            let ok = true;
            if(!fecha){ document.getElementById('errCtrlFecha').style.display='block'; ok=false; }
            if(!ingresos){ document.getElementById('errCtrlIngresos').style.display='block'; ok=false; }
            if(!gastos){ document.getElementById('errCtrlGastos').style.display='block'; ok=false; }
            if(!ok) return;

            const btn = document.getElementById('btnSaveControl');
            btn.disabled = true;

            try {
                const url = editMode ? `${API}/control-diario/${id}` : `${API}/control-diario`;
                const method = editMode ? 'PUT' : 'POST';
                const res = await fetch(url, {
                    method, headers: getHeaders(),
                    body: JSON.stringify({ fecha, ingresos, gastos })
                });
                const json = await res.json();
                if (!res.ok) {
                    if (json.errors && json.errors.fecha) throw new Error(json.errors.fecha[0]);
                    throw new Error(json.message || 'Error al guardar');
                }
                closeModal('modalControl');
                showToast('Registro guardado correctamente.', 'success');
                loadControlDiario();
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                btn.disabled = false;
            }
        }

        async function eliminarControl(id) {
            if(!confirm('¿Eliminar registro?')) return;
            try {
                const res = await fetch(`${API}/control-diario/${id}`, { method: 'DELETE', headers: getHeaders() });
                if (!res.ok) throw new Error('Error al eliminar');
                showToast('Registro eliminado', 'success');
                loadControlDiario();
            } catch (err) {
                showToast(err.message, 'error');
            }
        }

        // ─── UTILIDADES ────────────────────────────────────────────
        function openModal(id) { document.getElementById(id).classList.add('open'); }
        function closeModal(id) { document.getElementById(id).classList.remove('open'); }
        function formatCOP(v) { return new Intl.NumberFormat('es-CO').format(v||0); }
        function escHTML(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
        
        function showToast(msg, type = 'default') {
            const cont = document.getElementById('toastContainer');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            const icon = type === 'success' 
                ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`;
            toast.innerHTML = `${icon}<span>${escHTML(msg)}</span>`;
            cont.appendChild(toast);
            requestAnimationFrame(() => toast.classList.add('show'));
            setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3500);
        }

        // Init
        switchTab('diario');
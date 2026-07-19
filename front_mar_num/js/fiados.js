AuthService.requireAuth();

        // Estado global
        let currentPage    = 1;
        let currentDeudaId = null;
        let confirmCallback = null;
        let searchTimer    = null;
        let deudaCache     = {}; // id -> detalle completo

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

        // ─── Cargar Deudas ────────────────────────────────────────
        async function loadDeudas(page = 1) {
            currentPage = page;
            const estado    = document.getElementById('filterEstado').value;
            const buscarTxt = document.getElementById('searchClienteInput').value.trim();

            let url = `${API}/deudas?page=${page}`;
            if (estado)    url += `&estado=${estado}`;
            if (buscarTxt) url += `&buscar=${encodeURIComponent(buscarTxt)}`;

            const tbody = document.getElementById('deudasTableBody');
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;"><span class="skeleton" style="width:200px;display:inline-block;"></span></td></tr>`;

            try {
                const res  = await fetch(url, { headers: getHeaders() });
                const json = await res.json();
                if (!res.ok) throw new Error(json.message || 'Error al cargar.');

                document.getElementById('statTotalPendiente').textContent = '$' + formatMoney(json.total_pendiente);

                const deudas = json.data.data || [];
                renderTabla(deudas);
                renderPagination(json.data.meta);
                document.getElementById('totalFiadosBadge').textContent = `${json.data.meta.total} fiados`;
                document.getElementById('badge-deudas').textContent = json.data.meta.total || 0;
            } catch (err) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:#c05050;">${err.message}</td></tr>`;
                showToast(err.message, 'error');
            }
        }

        async function loadStats() {
            try {
                const [resPend, resPag, resCli] = await Promise.all([
                    fetch(`${API}/deudas?estado=PENDIENTE&per_page=1`, { headers: getHeaders() }),
                    fetch(`${API}/deudas?estado=PAGADO&per_page=1`,    { headers: getHeaders() }),
                    fetch(`${API}/clientes?con_deuda=1&per_page=1`,    { headers: getHeaders() }),
                ]);
                const [jPend, jPag, jCli] = await Promise.all([resPend.json(), resPag.json(), resCli.json()]);
                document.getElementById('statFiadosPendientes').textContent = jPend.data?.meta?.total ?? '—';
                document.getElementById('statPagados').textContent          = jPag.data?.meta?.total  ?? '—';
                document.getElementById('statClientesDeuda').textContent    = jCli.meta?.total        ?? '—';
            } catch {}
        }

        async function fetchDeudaDetalle(id, force = false) {
            if (!force && deudaCache[id]) {
                return deudaCache[id];
            }
            const res  = await fetch(`${API}/deudas/${id}`, { headers: getHeaders() });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || 'Error al cargar detalle.');
            deudaCache[id] = json.data;
            return json.data;
        }

        function invalidateDeudaCache(id) {
            if (id) delete deudaCache[id];
            else deudaCache = {};
        }

        function renderTabla(deudas) {
            const tbody = document.getElementById('deudasTableBody');
            if (!deudas || deudas.length === 0) {
                tbody.innerHTML = `
                    <tr><td colspan="6">
                        <div class="empty-state">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            <p>No hay fiados con estos filtros</p>
                        </div>
                    </td></tr>`;
                return;
            }

            tbody.innerHTML = deudas.map(d => {
                const cliente = d.cliente || {};
                const nombre  = cliente.nombre || 'Sin cliente';
                const tel     = cliente.telefono || '';
                const fecha   = d.fecha ? new Date(d.fecha).toLocaleDateString('es-CO', {day:'2-digit',month:'short',year:'numeric'}) : '—';
                const pendiente = parseFloat(d.saldo_pendiente || 0);
                const isPagado  = d.estado === 'PAGADO';

                const payBtn = !isPagado
                    ? `<button class="btn-icon btn-pay" title="Registrar pago" onclick="abrirModalPago(${d.id})">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
                       </button>`
                    : '';

                const waBtn = tel
                    ? `<button class="btn-icon btn-wa" title="Enviar por WhatsApp" onclick="enviarWhatsApp(${d.id})">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                       </button>`
                    : '';

                return `
                <tr>
                    <td>
                        <div class="client-cell">
                            <div class="client-av">${nombre.charAt(0).toUpperCase()}</div>
                            <div>
                                <div class="client-name">${escHTML(nombre)}</div>
                                ${tel ? `<div class="client-tel">${escHTML(tel)}</div>` : ''}
                            </div>
                        </div>
                    </td>
                    <td style="font-weight:600;color:var(--espresso);">$${formatMoney(d.monto)}</td>
                    <td style="font-weight:700;color:${isPagado ? '#4a7c4a' : '#8b3a3a'};">$${formatMoney(pendiente)}</td>
                    <td>
                        <span class="badge-estado ${isPagado ? 'estado-pagado' : 'estado-pendiente'}">
                            <span class="dot"></span>${d.estado}
                        </span>
                    </td>
                    <td>${fecha}</td>
                    <td>
                        <div class="actions-cell">
                            <button class="btn-icon btn-view" title="Ver detalle" onclick="verDetalle(${d.id})">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                            </button>
                            ${waBtn}
                            ${payBtn}
                            <button class="btn-icon btn-edit" title="Editar" onclick="abrirModalEdit(${d.id}, '${d.estado}', ${pendiente})">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                            </button>
                            <button class="btn-icon btn-delete" title="Eliminar" onclick="confirmarEliminar(${d.id}, '${escAttr(nombre)}')">
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
            let html = `<button class="btn-page" ${meta.current_page===1?'disabled':''} onclick="loadDeudas(${meta.current_page-1})">‹</button>`;
            for (let i = 1; i <= meta.last_page; i++) {
                if (i===1||i===meta.last_page||Math.abs(i-meta.current_page)<=1)
                    html += `<button class="btn-page ${i===meta.current_page?'active':''}" onclick="loadDeudas(${i})">${i}</button>`;
                else if (Math.abs(i-meta.current_page)===2)
                    html += `<button class="btn-page" disabled>…</button>`;
            }
            html += `<button class="btn-page" ${meta.current_page===meta.last_page?'disabled':''} onclick="loadDeudas(${meta.current_page+1})">›</button>`;
            document.getElementById('paginationBtns').innerHTML = html;
        }

        // ─── Ver Detalle ─────────────────────────────────────────
        async function verDetalle(id) {
            currentDeudaId = id;
            openModal('modalDetailOverlay');
            document.getElementById('modalDetailBody').innerHTML = `<div style="text-align:center;padding:24px;"><span class="skeleton" style="width:180px;display:inline-block;"></span></div>`;
            document.getElementById('btnRegistrarPago').style.display = 'none';
            document.getElementById('btnWhatsAppDetalle').classList.remove('show');

            try {
                const d = await fetchDeudaDetalle(id);
                const c = d.cliente || {};
                document.getElementById('modalDetailTitle').textContent = `Fiado — ${c.nombre || '—'}`;

                const isPagado = d.estado === 'PAGADO';
                if (!isPagado) {
                    document.getElementById('btnRegistrarPago').style.display = 'flex';
                    document.getElementById('btnRegistrarPago').onclick = () => {
                        closeModal('modalDetailOverlay');
                        abrirModalPago(id);
                    };
                }

                if (c.telefono) {
                    const btnWa = document.getElementById('btnWhatsAppDetalle');
                    btnWa.classList.add('show');
                    btnWa.onclick = () => enviarWhatsApp(id);
                }

                const pagos = d.pagos || [];
                const totalPagado = pagos.reduce((s, p) => s + parseFloat(p.monto || 0), 0);
                const pagosHTML = pagos.length === 0
                    ? `<p style="font-size:0.82rem;color:var(--text-light);">Sin pagos registrados.</p>`
                    : pagos.map(p => `
                        <div class="pago-item">
                            <div>
                                <div class="pago-monto">+ $${formatMoney(p.monto)}</div>
                                <div class="pago-fecha">${p.fecha ? new Date(p.fecha).toLocaleDateString('es-CO', {day:'2-digit',month:'long',year:'numeric'}) : '—'}</div>
                            </div>
                            <button class="btn-del-pago" title="Eliminar pago" onclick="eliminarPago(${p.id})">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                        </div>`).join('');

                const detalles = d.venta?.detalles || [];
                const productosHTML = detalles.length === 0
                    ? ''
                    : `
                    <div class="detail-section-title">Productos del fiado</div>
                    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px;">
                        ${detalles.map(item => `
                            <div style="display:flex;justify-content:space-between;gap:12px;font-size:0.82rem;padding:8px 10px;background:var(--linen);border-radius:8px;">
                                <span style="color:var(--espresso);font-weight:600;">${escHTML(item.cantidad)}× ${escHTML(item.producto?.nombre || 'Producto')}</span>
                                <span style="color:var(--text-mid);font-weight:700;">$${formatMoney(item.subtotal)}</span>
                            </div>
                        `).join('')}
                    </div>`;

                document.getElementById('modalDetailBody').innerHTML = `
                    <div class="saldo-bar">
                        <div class="saldo-item">
                            <div class="saldo-label">Monto Original</div>
                            <div class="saldo-val">$${formatMoney(d.monto)}</div>
                        </div>
                        <div class="saldo-sep"></div>
                        <div class="saldo-item">
                            <div class="saldo-label">Total Pagado</div>
                            <div class="saldo-val green">$${formatMoney(totalPagado)}</div>
                        </div>
                        <div class="saldo-sep"></div>
                        <div class="saldo-item">
                            <div class="saldo-label">Saldo Pendiente</div>
                            <div class="saldo-val ${isPagado ? 'green' : 'red'}">$${formatMoney(d.saldo_pendiente)}</div>
                        </div>
                    </div>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-label">Cliente</div>
                            <div class="detail-value">${escHTML(c.nombre || '—')}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Estado</div>
                            <div class="detail-value ${isPagado ? 'success' : 'accent'}">${d.estado}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Teléfono</div>
                            <div class="detail-value">${escHTML(c.telefono || '—')}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Fecha del Fiado</div>
                            <div class="detail-value">${d.fecha ? new Date(d.fecha).toLocaleDateString('es-CO',{day:'2-digit',month:'long',year:'numeric'}) : '—'}</div>
                        </div>
                    </div>
                    ${productosHTML}
                    <div class="detail-section-title">Historial de Pagos</div>
                    <div id="pagosListContainer">${pagosHTML}</div>`;
            } catch (err) {
                document.getElementById('modalDetailBody').innerHTML = `<p style="color:#c05050;text-align:center;">${err.message}</p>`;
            }
        }

        // ─── WhatsApp ────────────────────────────────────────────
        function normalizarTelefonoWA(tel) {
            let n = String(tel || '').replace(/\D/g, '');
            if (!n) return '';
            if (n.startsWith('57') && n.length >= 12) return n;
            if (n.length === 10) return '57' + n;
            return n;
        }

        function construirMensajeFiado(deuda) {
            const c = deuda.cliente || {};
            const nombre = c.nombre || 'cliente';
            const fecha = deuda.fecha
                ? new Date(deuda.fecha).toLocaleDateString('es-CO', {
                    day: '2-digit', month: 'long', year: 'numeric'
                  })
                : '—';

            const detalles = deuda.venta?.detalles || [];
            const lineasProductos = detalles.map((item) => {
                const prod = item.producto?.nombre || 'Producto';
                return `• ${item.cantidad}x ${prod} — $${formatMoney(item.subtotal)}`;
            });

            const pagos = deuda.pagos || [];
            const totalPagado = pagos.reduce((s, p) => s + parseFloat(p.monto || 0), 0);

            const partes = [
                `Hola ${nombre}, te escribimos de *Tienda Mar & Num*.`,
                '',
                'Te recordamos tu *fiado pendiente*:',
                `📅 Fecha: ${fecha}`,
                `💵 Monto original: $${formatMoney(deuda.monto)}`,
            ];

            if (totalPagado > 0) {
                partes.push(`✅ Ya abonado: $${formatMoney(totalPagado)}`);
            }

            partes.push(`❗ *Saldo pendiente: $${formatMoney(deuda.saldo_pendiente)}*`);

            if (lineasProductos.length) {
                partes.push('', '*Productos:*', ...lineasProductos);
            }

            partes.push(
                '',
                '¿Cuándo podrías acercarte a cancelar o abonar?',
                '¡Gracias! 🙏',
            );

            return partes.join('\n');
        }

        async function enviarWhatsApp(id) {
            try {
                const deuda = await fetchDeudaDetalle(id);
                const tel = normalizarTelefonoWA(deuda.cliente?.telefono);

                if (!tel) {
                    showToast('Este cliente no tiene teléfono registrado.', 'error');
                    return;
                }

                const mensaje = construirMensajeFiado(deuda);
                const url = `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`;
                window.open(url, '_blank');
            } catch (err) {
                showToast(err.message || 'No se pudo abrir WhatsApp.', 'error');
            }
        }

        // ─── Registrar Pago ──────────────────────────────────────
        async function abrirModalPago(deudaId) {
            currentDeudaId = deudaId;
            try {
                const d = await fetchDeudaDetalle(deudaId);
                const c = d.cliente || {};
                document.getElementById('pagoClienteNombre').textContent    = c.nombre || '—';
                document.getElementById('pagoSaldoPendiente').textContent   = '$' + formatMoney(d.saldo_pendiente);
                document.getElementById('inputMontoPago').max               = d.saldo_pendiente;
                document.getElementById('inputMontoPago').value             = '';
                document.getElementById('errMontoPago').style.display       = 'none';
            } catch {}
            openModal('modalPagoOverlay');
        }

        async function confirmarPago() {
            const monto = parseFloat(document.getElementById('inputMontoPago').value);
            if (!monto || monto <= 0) {
                document.getElementById('errMontoPago').style.display = 'block';
                return;
            }
            document.getElementById('errMontoPago').style.display = 'none';

            const btn = document.getElementById('btnConfirmPago');
            btn.disabled = true;
            try {
                const res  = await fetch(`${API}/deudas/${currentDeudaId}/pagos`, {
                    method: 'POST', headers: getHeaders(),
                    body: JSON.stringify({ monto })
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json.message || 'Error al registrar pago.');
                closeModal('modalPagoOverlay');
                showToast('Pago registrado correctamente.', 'success');
                invalidateDeudaCache(currentDeudaId);
                loadStats();
                loadDeudas(currentPage);
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                btn.disabled = false;
            }
        }

        // ─── Eliminar Pago ───────────────────────────────────────
        async function eliminarPago(pagoId) {
            if (!confirm('¿Eliminar este pago del historial?')) return;
            try {
                const res  = await fetch(`${API}/pagos/${pagoId}`, { method: 'DELETE', headers: getHeaders() });
                const json = await res.json();
                if (!res.ok) throw new Error(json.message || 'Error al eliminar pago.');
                showToast('Pago eliminado.', 'success');
                invalidateDeudaCache(currentDeudaId);
                loadStats();
                verDetalle(currentDeudaId);
                loadDeudas(currentPage);
            } catch (err) {
                showToast(err.message, 'error');
            }
        }

        // ─── Editar Estado Deuda ─────────────────────────────────
        function abrirModalEdit(id, estado, saldo) {
            currentDeudaId = id;
            document.getElementById('editDeudaId').value = id;
            document.getElementById('editEstado').value  = estado;
            document.getElementById('editSaldo').value   = saldo;
            openModal('modalEditOverlay');
        }

        async function guardarEdicion() {
            const id     = document.getElementById('editDeudaId').value;
            const estado = document.getElementById('editEstado').value;
            const saldo  = parseFloat(document.getElementById('editSaldo').value);

            const btn = document.getElementById('btnSaveEdit');
            btn.disabled = true;
            try {
                const res  = await fetch(`${API}/deudas/${id}`, {
                    method: 'PUT', headers: getHeaders(),
                    body: JSON.stringify({ estado, saldo_pendiente: saldo })
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json.message || 'Error al actualizar.');
                closeModal('modalEditOverlay');
                showToast('Fiado actualizado correctamente.', 'success');
                invalidateDeudaCache(id);
                loadStats();
                loadDeudas(currentPage);
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                btn.disabled = false;
            }
        }

        // ─── Eliminar Deuda ──────────────────────────────────────
        function confirmarEliminar(id, nombre) {
            currentDeudaId = id;
            document.getElementById('confirmTitle').textContent = '¿Eliminar Fiado?';
            document.getElementById('confirmText').textContent  = `¿Eliminar el fiado de "${nombre}"? Solo se puede eliminar si no tiene pagos.`;
            confirmCallback = eliminarDeuda;
            openModal('modalConfirmOverlay');
        }

        async function eliminarDeuda() {
            const btn = document.getElementById('btnConfirmAction');
            btn.disabled = true;
            try {
                const res  = await fetch(`${API}/deudas/${currentDeudaId}`, { method: 'DELETE', headers: getHeaders() });
                const json = await res.json();
                if (!res.ok) throw new Error(json.message || 'No se pudo eliminar.');
                closeModal('modalConfirmOverlay');
                showToast('Fiado eliminado.', 'success');
                invalidateDeudaCache(currentDeudaId);
                loadStats();
                loadDeudas(currentPage);
            } catch (err) {
                closeModal('modalConfirmOverlay');
                showToast(err.message, 'error');
            } finally {
                btn.disabled = false;
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
                : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`;
            toast.innerHTML = `${icon}<span>${escHTML(msg)}</span>`;
            cont.appendChild(toast);
            requestAnimationFrame(() => toast.classList.add('show'));
            setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3500);
        }

        // ─── Helpers ─────────────────────────────────────────────
        function escHTML(str) { return String(str??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
        function escAttr(str) { return String(str??'').replace(/'/g,"\\'").replace(/"/g,'&quot;'); }
        function formatMoney(val) { return parseFloat(val||0).toLocaleString('es-CO',{minimumFractionDigits:2,maximumFractionDigits:2}); }

        // ─── Listeners ───────────────────────────────────────────
        document.getElementById('btnCloseDetail').addEventListener('click',  () => closeModal('modalDetailOverlay'));
        document.getElementById('btnCloseDetailFooter').addEventListener('click', () => closeModal('modalDetailOverlay'));
        document.getElementById('btnClosePago').addEventListener('click',    () => closeModal('modalPagoOverlay'));
        document.getElementById('btnCancelPago').addEventListener('click',   () => closeModal('modalPagoOverlay'));
        document.getElementById('btnConfirmPago').addEventListener('click',  confirmarPago);
        document.getElementById('btnCloseEdit').addEventListener('click',    () => closeModal('modalEditOverlay'));
        document.getElementById('btnCancelEdit').addEventListener('click',   () => closeModal('modalEditOverlay'));
        document.getElementById('btnSaveEdit').addEventListener('click',     guardarEdicion);
        document.getElementById('btnCancelConfirm').addEventListener('click',() => closeModal('modalConfirmOverlay'));
        document.getElementById('btnConfirmAction').addEventListener('click', () => { if (confirmCallback) confirmCallback(); });

        document.getElementById('btnLogout').addEventListener('click', async () => {
            await AuthService.logout();
            window.location.href = 'login.html';
        });

        document.querySelectorAll('.modal-overlay').forEach(o => {
            o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
        });

        document.getElementById('filterEstado').addEventListener('change', () => loadDeudas(1));
        document.getElementById('searchClienteInput').addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => loadDeudas(1), 400);
        });

        // ─── Init ─────────────────────────────────────────────────
        Promise.all([loadDeudas(1), loadStats()]);
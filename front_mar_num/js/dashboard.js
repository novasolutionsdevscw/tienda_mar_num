// ─── Guard: redirige si no está autenticado ───────────────
      AuthService.requireAuth();

      // ─── Fecha actual ────────────────────────────────────────
      const now = new Date();
      document.getElementById("currentDate").textContent =
        now.toLocaleDateString("es-CO", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

      // ─── Cargar datos del usuario ────────────────────────────
      function loadUser() {
        const user = AuthService.getUser();
        if (!user) return;

        const nombre = user.nombre_usuario || user.usuario || "Usuario";
        const rol = user.rol || "—";

        document.getElementById("welcomeName").textContent = nombre;
        document.getElementById("userName").textContent = nombre;
        document.getElementById("userRole").textContent =
          rol === "ADMIN" ? "⭐ Administrador" : "Ayudante";
        document.getElementById("userAvatar").textContent = nombre
          .charAt(0)
          .toUpperCase();

        // Mostrar menú de usuarios solo para ADMIN
        if (rol === "ADMIN") {
          document.getElementById("nav-usuarios").style.display = "flex";
        }
      }

      // ─── Cargar estadísticas desde la API ───────────────────
      async function loadStats() {
        const token = AuthService.getToken();
        const headers = {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        };

        try {
          
          // Ventas de hoy
          const [ventasRes, clientesRes, productosRes, reporteRes] =
            await Promise.allSettled([
              fetch(`${API_BASE}/ventas`, { headers }),
              fetch(`${API_BASE}/clientes`, { headers }),
              fetch(`${API_BASE}/productos?all=1`, { headers }),
              fetch(`${API_BASE}/reportes/diario`, { headers }),
            ]);

          // Clientes
          if (clientesRes.status === "fulfilled" && clientesRes.value.ok) {
            const data = await clientesRes.value.json();
            const total = data.data
              ? data.data.length
              : Array.isArray(data)
                ? data.length
                : "—";
            document.getElementById("statClientes").textContent = total;
          } else {
            document.getElementById("statClientes").textContent = "—";
          }

          // Productos
          if (productosRes.status === "fulfilled" && productosRes.value.ok) {
            const data = await productosRes.value.json();
            const total = data.data
              ? data.data.length
              : Array.isArray(data)
                ? data.length
                : "—";
            document.getElementById("statProductos").textContent = total;
          } else {
            document.getElementById("statProductos").textContent = "—";
          }

          // Reporte diario
          if (reporteRes.status === "fulfilled" && reporteRes.value.ok) {
            const data = await reporteRes.value.json();
            const reporte = data.data || data;
            const ingresos = reporte.ingresos ?? reporte.total_ventas ?? 0;
            const gastos = reporte.gastos ?? 0;
            document.getElementById("statIngresos").textContent =
              formatCOP(ingresos);
            document.getElementById("statIngresosSub").textContent =
              `Gastos: ${formatCOP(gastos)}`;
            document.getElementById("statIngresosSub").className =
              "stat-sub up";
          } else {
            document.getElementById("statIngresos").textContent = "$0";
            document.getElementById("statIngresosSub").textContent =
              "Sin datos hoy";
          }

          // Ventas
          if (ventasRes.status === "fulfilled" && ventasRes.value.ok) {
            const data = await ventasRes.value.json();
            const ventas = data.data || (Array.isArray(data) ? data : []);

            // Filtrar las de hoy
            const hoy = fechaLocalISO();
            const ventasHoy = ventas.filter(
              (v) => v.fecha && v.fecha.slice(0, 10) === hoy,
            );

            document.getElementById("statVentas").textContent =
              ventasHoy.length;
            document.getElementById("statVentasSub").textContent =
              `Total ventas: ${ventas.length}`;

            // Tabla — mostrar las últimas 8
            renderVentasTable(ventas.slice(0, 8));
          } else {
            document.getElementById("statVentas").textContent = "—";
            renderVentasEmpty("No se pudo cargar las ventas.");
          }
        } catch (err) {
          console.error("Error cargando estadísticas:", err);
          renderVentasEmpty("Error de conexión con la API.");
        }
      }

      // ─── Renderizar tabla de ventas ──────────────────────────
      function renderVentasTable(ventas) {
        const tbody = document.getElementById("ventasTableBody");
        if (!ventas || ventas.length === 0) {
          renderVentasEmpty("No hay ventas registradas aún.");
          return;
        }
        tbody.innerHTML = ventas
          .map(
            (v) => `
                <tr>
                    <td style="font-weight:600; color:var(--cocoa);">#${v.id}</td>
                    <td>${v.cliente ? v.cliente.nombre_cliente : '<em style="color:var(--text-light)">Sin cliente</em>'}</td>
                    <td style="font-weight:600;">${formatCOP(v.total)}</td>
                    <td><span class="badge-pago badge-${v.tipo_pago ? v.tipo_pago.toLowerCase() : "contado"}">${v.tipo_pago || "—"}</span></td>
                    <td>${formatFecha(v.fecha)}</td>
                </tr>
            `,
          )
          .join("");
      }

      function renderVentasEmpty(msg) {
        document.getElementById("ventasTableBody").innerHTML = `
                <tr><td colspan="5" style="text-align:center; padding:28px; color:var(--text-light); font-size:0.85rem;">${msg}</td></tr>
            `;
      }

      // ─── Helpers ─────────────────────────────────────────────
      function formatCOP(value) {
        return new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          minimumFractionDigits: 0,
        }).format(value || 0);
      }

      function formatFecha(fecha) {
        if (!fecha) return "—";
        return new Date(fecha).toLocaleDateString("es-CO", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      function fechaLocalISO(fecha = new Date()) {
        const anio = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, "0");
        const dia = String(fecha.getDate()).padStart(2, "0");
        return `${anio}-${mes}-${dia}`;
      }

      // ─── Logout ───────────────────────────────────────────────
      document
        .getElementById("btnLogout")
        .addEventListener("click", async () => {
          const btn = document.getElementById("btnLogout");
          btn.disabled = true;
          btn.textContent = "Cerrando sesión...";
          await AuthService.logout();
          window.location.href = "login.html";
        });

      // ─── Init ─────────────────────────────────────────────────
      loadUser();
      loadStats();
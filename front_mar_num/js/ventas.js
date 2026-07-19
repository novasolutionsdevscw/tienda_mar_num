
class VentasApp {
  constructor() {
    this.productos = [];
    this.mesas = [];
    this.carrito = [];
    this.tipoVenta = "llevar";
    this.mesaSeleccionada = null;
    this.metodoPago = "EFECTIVO";
    this.tipoCobro = "CONTADO"; // CONTADO | FIADO
    this.clienteSeleccionado = null;
    this._clienteBusquedaTimer = null;
    this._productoBusquedaTimer = null;

    // id de la venta ABIERTA en el backend (null hasta que se agrega
    // el primer producto). El carrito se sincroniza siempre desde el servidor.
    this.ventaActualId = null;
    this.procesando = false;

    this.elementos = {
      cardParaLlevar: document.getElementById("cardParaLlevar"),
      cardMesa: document.getElementById("cardMesa"),
      tablesWrap: document.getElementById("tablesWrap"),
      tablesGrid: document.getElementById("tablesGrid"),
      productsGrid: document.getElementById("productsGrid"),
      productsCount: document.getElementById("productsCount"),
      searchInput: document.getElementById("searchInput"),
      searchClear: document.getElementById("searchClear"),
      favRow: document.getElementById("favRow"),
      catRow: document.getElementById("catRow"),
      cartScroll: document.getElementById("cartScroll"),
      cartBadge: document.getElementById("cartBadge"),
      cartLabel: document.getElementById("cartLabel"),
      cartTotal: document.getElementById("cartTotal"),
      subtotalValue: document.getElementById("subtotalValue"),
      grandTotalValue: document.getElementById("grandTotalValue"),
      payGrid: document.getElementById("payGrid"),
      payMethods: document.getElementById("payMethods"),
      cobroGrid: document.getElementById("cobroGrid"),
      clienteSection: document.getElementById("clienteSection"),
      clienteSearchInput: document.getElementById("clienteSearchInput"),
      clienteResults: document.getElementById("clienteResults"),
      clienteSelected: document.getElementById("clienteSelected"),
      clienteSelectedName: document.getElementById("clienteSelectedName"),
      clienteSelectedMeta: document.getElementById("clienteSelectedMeta"),
      clienteClear: document.getElementById("clienteClear"),
      btnCheckout: document.getElementById("btnCheckout"),
      btnCheckoutLabel: document.getElementById("btnCheckoutLabel"),
      contextBar: document.getElementById("contextBar"),
      contextBarTitle: document.getElementById("contextBarTitle"),
      contextBarSub: document.getElementById("contextBarSub"),
      contextBarClose: document.getElementById("contextBarClose"),
      toastContainer: document.getElementById("toastContainer"),
      fechaActual: document.getElementById("fechaActual"),
    };
  }

  async inicializar() {
    if (window.AuthService) {
      AuthService.requireAuth();
    }

    this.configurarEventos();
    this.mostrarFecha();
    this.renderizarMetodosPago();
    this.actualizarUICobro();

    await Promise.all([this.cargarProductos(), this.cargarMesas()]);

    this.renderizarProductos();
    this.renderizarFavoritos();
    this.renderizarCategorias();
    this.actualizarCarrito();
  }

  obtenerToken() {
    const token = localStorage.getItem("auth_token");

    if (!token) {
      throw new Error("No existe un token de autenticación.");
    }

    return token;
  }

  obtenerHeaders() {
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.obtenerToken()}`,
    };
  }

  async realizarPeticion(url, opciones = {}) {
    const respuesta = await fetch(url, {
      ...opciones,
      headers: {
        ...this.obtenerHeaders(),
        ...(opciones.headers || {}),
      },
    });

    if (respuesta.status === 401) {
      throw new Error("Sesión no autorizada o token inválido.");
    }

    if (!respuesta.ok) {
      const cuerpo = await respuesta.json().catch(() => ({}));
      const primerError =
        cuerpo.errors &&
        Object.values(cuerpo.errors).flat().find(Boolean);
      throw new Error(
        primerError || cuerpo.message || `Error HTTP ${respuesta.status}`,
      );
    }

    return await respuesta.json();
  }

  // ─── CARGAR TODOS LOS PRODUCTOS (sin paginación) ──────────────────────────
  async cargarProductos() {
    try {
      const respuesta = await this.realizarPeticion(
        `${API_URL}/productos?all=1&activo=1`,
        { method: "GET" },
      );

      // La API con ?all=1 puede devolver { data: [...] } o un array.
      this.productos = Array.isArray(respuesta)
        ? respuesta
        : respuesta.data || [];

      if (!Array.isArray(this.productos)) {
        this.productos = [];
      }
    } catch (error) {
      console.error("Error al cargar los productos:", error);
      this.productos = [];
      this.mostrarToast(error.message || "No se pudieron cargar los productos.");

      if (this.elementos.productsGrid) {
        this.elementos.productsGrid.innerHTML = `
          <div class="empty-state">
            <div class="emoji">⚠️</div>
            <p>${error.message || "Error al cargar productos. ¿Está el API en marcha?"}</p>
          </div>
        `;
      }
    }
  }

  async cargarMesas() {
    try {
      const respuesta = await this.realizarPeticion(`${API_URL}/mesas`, {
        method: "GET",
      });

      this.mesas = Array.isArray(respuesta)
        ? respuesta
        : respuesta.data || [];

      this.renderizarMesas();
    } catch (error) {
      console.error("Error al cargar las mesas:", error);
      this.mostrarToast(error.message);
    }
  }

  configurarEventos() {
    const on = (el, evento, handler) => {
      if (el) {
        el.addEventListener(evento, handler);
      }
    };

    on(this.elementos.cardParaLlevar, "click", () => {
      this.seleccionarTipoVenta("llevar");
    });

    on(this.elementos.cardMesa, "click", () => {
      this.seleccionarTipoVenta("mesa");
    });

    on(this.elementos.searchInput, "input", () => {
      clearTimeout(this._productoBusquedaTimer);
      this._productoBusquedaTimer = setTimeout(() => {
        this.renderizarProductos();
      }, 180);
    });

    on(this.elementos.searchClear, "click", () => {
      this.elementos.searchInput.value = "";
      this.renderizarProductos();
    });

    on(this.elementos.btnCheckout, "click", (event) => {
      event.stopPropagation();
      this.procesarVenta();
    });

    on(this.elementos.contextBarClose, "click", async () => {
      this.mesaSeleccionada = null;
      this.ventaActualId = null;
      this.carrito = [];

      this.elementos.contextBar.classList.remove("show");
      this.actualizarCarrito();

      await this.cargarMesas();
    });

    on(this.elementos.productsGrid, "click", (event) => {
      const boton = event.target.closest("[data-producto-id]");

      if (!boton) {
        return;
      }

      const productoId = Number(boton.dataset.productoId);
      this.agregarProducto(productoId);
    });

    on(this.elementos.cartScroll, "click", (event) => {
      const boton = event.target.closest("[data-accion]");

      if (!boton) {
        return;
      }

      const productoId = Number(boton.dataset.productoId);
      const accion = boton.dataset.accion;

      if (accion === "aumentar") {
        this.aumentarCantidad(productoId);
      }

      if (accion === "disminuir") {
        this.disminuirCantidad(productoId);
      }

      if (accion === "eliminar") {
        this.eliminarProducto(productoId);
      }
    });

    on(this.elementos.payGrid, "click", (event) => {
      const boton = event.target.closest("[data-metodo]");

      if (!boton) {
        return;
      }

      this.metodoPago = boton.dataset.metodo;
      this.renderizarMetodosPago();
    });

    on(this.elementos.cobroGrid, "click", (event) => {
      const boton = event.target.closest("[data-cobro]");

      if (!boton) {
        return;
      }

      this.seleccionarTipoCobro(boton.dataset.cobro);
    });

    on(this.elementos.clienteSearchInput, "input", () => {
      this.buscarClientesDebounced();
    });

    on(this.elementos.clienteSearchInput, "focus", () => {
      if (this.elementos.clienteSearchInput.value.trim().length >= 1) {
        this.buscarClientesDebounced();
      }
    });

    on(this.elementos.clienteClear, "click", () => {
      this.limpiarClienteSeleccionado();
    });

    document.addEventListener("click", (event) => {
      if (
        !event.target.closest("#clienteSection") &&
        this.elementos.clienteResults
      ) {
        this.elementos.clienteResults.classList.remove("show");
      }
    });
  }

  seleccionarTipoVenta(tipo) {
    this.tipoVenta = tipo;

    this.elementos.cardParaLlevar.classList.toggle(
      "selected",
      tipo === "llevar",
    );

    this.elementos.cardMesa.classList.toggle("selected", tipo === "mesa");

    if (tipo === "mesa") {
      this.ventaActualId = null;
      this.carrito = [];
      this.mesaSeleccionada = null;
      this.elementos.contextBar.classList.remove("show");
      this.actualizarCarrito();
      this.elementos.tablesWrap.classList.add("open");
      this.renderizarMesas();
      return;
    }

    this.elementos.tablesWrap.classList.remove("open");
    this.mesaSeleccionada = null;
    this.elementos.contextBar.classList.remove("show");

    // "Para llevar" siempre arranca una venta nueva (sin mesa).
    this.ventaActualId = null;
    this.carrito = [];
    this.actualizarCarrito();
  }

  renderizarMesas() {
    this.elementos.tablesGrid.innerHTML = "";

    this.mesas.forEach((mesa) => {
      const tarjeta = document.createElement("button");
      tarjeta.type = "button";
      tarjeta.className = "table-card";

      if (mesa.occupied) {
        tarjeta.classList.add("occupied");
      }

      if (this.mesaSeleccionada && this.mesaSeleccionada.id === mesa.id) {
        tarjeta.classList.add("selected");
      }

      const totalHtml =
        mesa.occupied && mesa.total != null
          ? `<div class="table-total">$ ${this.formatearNumero(mesa.total)}</div>`
          : "";

      tarjeta.innerHTML = `
        <div class="table-dot"></div>
        <div class="table-num">Mesa ${mesa.numero}</div>
        <div class="table-status">
          ${mesa.occupied ? "OCUPADA" : "LIBRE"}
        </div>
        ${totalHtml}
      `;

      tarjeta.addEventListener("click", () => {
        this.seleccionarMesa(mesa);
      });

      this.elementos.tablesGrid.appendChild(tarjeta);
    });
  }

  async seleccionarMesa(mesa) {
    this.mesaSeleccionada = mesa;

    this.renderizarMesas();

    this.elementos.contextBar.classList.add("show");

    this.elementos.contextBarTitle.textContent = `Mesa ${mesa.numero}`;

    this.elementos.contextBarSub.textContent = mesa.occupied
      ? `Cuenta abierta · $ ${this.formatearNumero(mesa.total || 0)}`
      : "Cuenta nueva";

    if (mesa.occupied && mesa.venta_id) {
      // Mesa con venta ABIERTA: cargar detalles reales del backend.
      await this.cargarProductosMesa(mesa);
    } else {
      this.ventaActualId = null;
      this.carrito = [];
      this.actualizarCarrito();
    }
  }

  async cargarProductosMesa(mesa) {
    try {
      const respuesta = await this.realizarPeticion(
        `${API_URL}/ventas/${mesa.venta_id}`,
        { method: "GET" },
      );

      await this.sincronizarDesdeVenta(respuesta.data);
    } catch (error) {
      console.error("Error al cargar la venta de la mesa:", error);
      this.mostrarToast(error.message);
    }
  }

  // ─── FUENTE ÚNICA DE VERDAD ────────────────────────────────────────────────
  async sincronizarDesdeVenta(venta) {
    const detalles = venta.detalles || [];

    if (detalles.length === 0) {
      // Venta vacía: si sigue ABIERTA en el servidor, anularla para liberar la mesa.
      if (venta.estado === "ABIERTA" && venta.id) {
        try {
          await this.realizarPeticion(`${API_URL}/ventas/${venta.id}/anular`, {
            method: "POST",
          });
        } catch (error) {
          console.error("Error al anular venta vacía:", error);
        }
      }

      this.ventaActualId = null;
      this.carrito = [];

      if (venta.mesa_id) {
        this._actualizarMesaLocal(venta.mesa_id, {
          occupied: false,
          venta_id: null,
          total: null,
        });
        this.renderizarMesas();
      }

      this.actualizarCarrito();
      return;
    }

    this.ventaActualId = venta.id;

    this.carrito = detalles.map((detalle) => ({
      detalle_id: detalle.id,
      producto_id: detalle.producto_id,
      producto: detalle.producto,
      cantidad: detalle.cantidad,
    }));

    if (venta.mesa_id) {
      this._actualizarMesaLocal(venta.mesa_id, {
        occupied: venta.estado === "ABIERTA",
        venta_id: venta.estado === "ABIERTA" ? venta.id : null,
        total: venta.total,
      });

      if (
        this.mesaSeleccionada &&
        this.mesaSeleccionada.id === venta.mesa_id
      ) {
        this.elementos.contextBarSub.textContent = `Cuenta abierta · $ ${this.formatearNumero(venta.total || 0)}`;
      }
    }

    this.renderizarMesas();
    this.actualizarCarrito();
  }

  _actualizarMesaLocal(mesaId, campos) {
    const idx = this.mesas.findIndex((m) => m.id === mesaId);

    if (idx !== -1) {
      this.mesas[idx] = { ...this.mesas[idx], ...campos };

      if (this.mesaSeleccionada && this.mesaSeleccionada.id === mesaId) {
        this.mesaSeleccionada = this.mesas[idx];
      }
    }
  }

  renderizarProductos() {
    const busqueda = this.elementos.searchInput.value.toLowerCase().trim();

    const productosFiltrados = this.productos.filter((producto) =>
      producto.nombre.toLowerCase().includes(busqueda),
    );

    this.elementos.productsGrid.innerHTML = "";

    if (this.elementos.productsCount) {
      this.elementos.productsCount.textContent =
        productosFiltrados.length === this.productos.length
          ? `${this.productos.length} productos`
          : `${productosFiltrados.length} de ${this.productos.length}`;
    }

    if (productosFiltrados.length === 0) {
      this.elementos.productsGrid.innerHTML = `
        <div class="empty-state">
          <div class="emoji">🔍</div>
          <p>No se encontraron productos.</p>
        </div>
      `;

      return;
    }

    productosFiltrados.forEach((producto) => {
      const tarjeta = document.createElement("div");
      tarjeta.className = "product-card";

      tarjeta.innerHTML = `
        <div class="product-img">🛍️</div>
        <div class="product-info">
          <div class="product-name">${producto.nombre}</div>
          <div class="product-bottom">
            <div class="product-price">
              $ ${this.formatearNumero(producto.precio)}
            </div>
            <button
              type="button"
              class="btn-add"
              data-producto-id="${producto.id}"
            >
              +
            </button>
          </div>
        </div>
      `;

      this.elementos.productsGrid.appendChild(tarjeta);
    });

    this.elementos.searchClear.classList.toggle("show", busqueda.length > 0);
  }

  renderizarFavoritos() {
    this.elementos.favRow.innerHTML = "";

    this.productos.slice(0, 8).forEach((producto) => {
      const favorito = document.createElement("button");
      favorito.type = "button";
      favorito.className = "fav-chip";

      favorito.innerHTML = `
        <div class="fav-circle">
          🛍️
          <span class="fav-star">⭐</span>
        </div>
        <span class="fav-name">${producto.nombre}</span>
      `;

      favorito.addEventListener("click", () => {
        this.agregarProducto(producto.id);
      });

      this.elementos.favRow.appendChild(favorito);
    });
  }

  renderizarCategorias() {
    this.elementos.catRow.innerHTML = "";

    const categorias = [
      ...new Set(
        this.productos
          .map((producto) => producto.categoria)
          .filter(Boolean),
      ),
    ];

    if (categorias.length === 0) {
      return;
    }

    const btnTodos = document.createElement("button");
    btnTodos.type = "button";
    btnTodos.className = "cat-chip active";
    btnTodos.textContent = "Todos";
    btnTodos.addEventListener("click", () => {
      this.elementos.searchInput.value = "";
      document
        .querySelectorAll(".cat-chip")
        .forEach((c) => c.classList.remove("active"));
      btnTodos.classList.add("active");
      this.renderizarProductos();
    });
    this.elementos.catRow.appendChild(btnTodos);

    categorias.forEach((categoria) => {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "cat-chip";
      boton.textContent = categoria;

      boton.addEventListener("click", () => {
        this.elementos.searchInput.value = categoria;
        document
          .querySelectorAll(".cat-chip")
          .forEach((c) => c.classList.remove("active"));
        boton.classList.add("active");
        this.renderizarProductos();
      });

      this.elementos.catRow.appendChild(boton);
    });
  }

  async asegurarVentaAbierta() {
    if (this.ventaActualId) {
      return this.ventaActualId;
    }

    // Evitar abrir una segunda venta si la mesa ya tenía una ABIERTA.
    if (this.tipoVenta === "mesa" && this.mesaSeleccionada?.venta_id) {
      this.ventaActualId = this.mesaSeleccionada.venta_id;
      return this.ventaActualId;
    }

    const respuesta = await this.realizarPeticion(`${API_URL}/ventas`, {
      method: "POST",
      body: JSON.stringify({
        mesa_id:
          this.tipoVenta === "mesa" && this.mesaSeleccionada
            ? this.mesaSeleccionada.id
            : null,
      }),
    });

    this.ventaActualId = respuesta.data.id;

    if (respuesta.data.mesa_id) {
      this._actualizarMesaLocal(respuesta.data.mesa_id, {
        occupied: true,
        venta_id: respuesta.data.id,
        total: 0,
      });
      this.renderizarMesas();
    }

    return this.ventaActualId;
  }

  async agregarProducto(productoId) {
    if (this.procesando) {
      return;
    }

    const producto = this.productos.find(
      (item) => Number(item.id) === Number(productoId),
    );

    if (!producto) {
      return;
    }

    if (this.tipoVenta === "mesa" && !this.mesaSeleccionada) {
      this.mostrarToast("Selecciona una mesa primero.");
      return;
    }

    this.procesando = true;

    try {
      await this.asegurarVentaAbierta();

      const respuesta = await this.realizarPeticion(
        `${API_URL}/ventas/${this.ventaActualId}/detalle`,
        {
          method: "POST",
          body: JSON.stringify({
            producto_id: producto.id,
            cantidad: 1,
          }),
        },
      );

      await this.sincronizarDesdeVenta(respuesta.data);
      this.mostrarToast(`${producto.nombre} agregado ✓`);
    } catch (error) {
      console.error("Error al agregar el producto:", error);
      this.mostrarToast(error.message || "No se pudo agregar el producto.");
    } finally {
      this.procesando = false;
    }
  }

  async aumentarCantidad(productoId) {
    const item = this.carrito.find(
      (producto) => Number(producto.producto_id) === Number(productoId),
    );

    if (!item || this.procesando) {
      return;
    }

    await this.actualizarCantidadEnServidor(item, item.cantidad + 1);
  }

  async disminuirCantidad(productoId) {
    const item = this.carrito.find(
      (producto) => Number(producto.producto_id) === Number(productoId),
    );

    if (!item || this.procesando) {
      return;
    }

    if (item.cantidad - 1 <= 0) {
      await this.eliminarProducto(productoId);
      return;
    }

    await this.actualizarCantidadEnServidor(item, item.cantidad - 1);
  }

  async actualizarCantidadEnServidor(item, nuevaCantidad) {
    this.procesando = true;

    try {
      const respuesta = await this.realizarPeticion(
        `${API_URL}/ventas/${this.ventaActualId}/detalle/${item.detalle_id}`,
        {
          method: "PUT",
          body: JSON.stringify({ cantidad: nuevaCantidad }),
        },
      );

      await this.sincronizarDesdeVenta(respuesta.data);
    } catch (error) {
      console.error("Error al actualizar la cantidad:", error);
      this.mostrarToast(error.message || "No se pudo actualizar la cantidad.");
    } finally {
      this.procesando = false;
    }
  }

  async eliminarProducto(productoId) {
    const item = this.carrito.find(
      (producto) => Number(producto.producto_id) === Number(productoId),
    );

    if (!item || this.procesando) {
      return;
    }

    const nombre = item.producto?.nombre || "este producto";
    const confirmar = confirm(`¿Deseas eliminar ${nombre} del carrito?`);

    if (!confirmar) {
      return;
    }

    this.procesando = true;

    try {
      const respuesta = await this.realizarPeticion(
        `${API_URL}/ventas/${this.ventaActualId}/detalle/${item.detalle_id}`,
        { method: "DELETE" },
      );

      await this.sincronizarDesdeVenta(respuesta.data);
    } catch (error) {
      console.error("Error al eliminar el producto:", error);
      this.mostrarToast(error.message || "No se pudo eliminar el producto.");
    } finally {
      this.procesando = false;
    }
  }

  actualizarCarrito() {
    const cantidadTotal = this.carrito.reduce(
      (total, item) => total + Number(item.cantidad),
      0,
    );

    const total = this.carrito.reduce((suma, item) => {
      const precio = Number(
        item.producto?.precio ?? item.precio_unitario ?? 0,
      );
      return suma + precio * Number(item.cantidad);
    }, 0);

    this.elementos.cartBadge.textContent = cantidadTotal;

    this.elementos.cartLabel.textContent =
      cantidadTotal === 0
        ? "vacío"
        : `${cantidadTotal} producto${cantidadTotal !== 1 ? "s" : ""}`;

    this.elementos.cartTotal.textContent = `$ ${this.formatearNumero(total)}`;
    this.elementos.subtotalValue.textContent = `$ ${this.formatearNumero(total)}`;
    this.elementos.grandTotalValue.textContent = `$ ${this.formatearNumero(total)}`;

    this.renderizarCarrito();
  }

  renderizarCarrito() {
    this.elementos.cartScroll.innerHTML = "";

    if (this.carrito.length === 0) {
      this.elementos.cartScroll.innerHTML = `
        <div class="cart-empty">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="19" cy="21" r="1"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.5 3h2l2.6 12.4a2 2 0 002 1.6h8.8a2 2 0 002-1.6L21 8H6"/>
          </svg>
          <p>Agrega productos para comenzar</p>
        </div>
      `;
      return;
    }

    this.carrito.forEach((item) => {
      const precio = Number(
        item.producto?.precio ?? item.precio_unitario ?? 0,
      );
      const subtotal = precio * Number(item.cantidad);
      const nombre = item.producto?.nombre || "Producto";

      const elemento = document.createElement("div");
      elemento.className = "cart-item";

      elemento.innerHTML = `
        <div class="cart-item-icon">🛍️</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${nombre}</div>
          <div class="cart-item-price">$ ${this.formatearNumero(precio)}</div>
        </div>
        <div class="qty-control">
          <button
            type="button"
            class="qty-btn"
            data-accion="disminuir"
            data-producto-id="${item.producto_id}"
          >−</button>
          <span class="qty-value">${item.cantidad}</span>
          <button
            type="button"
            class="qty-btn"
            data-accion="aumentar"
            data-producto-id="${item.producto_id}"
          >+</button>
        </div>
        <div class="cart-item-subtotal">
          $ ${this.formatearNumero(subtotal)}
        </div>
        <button
          type="button"
          class="btn-remove"
          data-accion="eliminar"
          data-producto-id="${item.producto_id}"
          aria-label="Eliminar"
        >🗑️</button>
      `;

      this.elementos.cartScroll.appendChild(elemento);
    });
  }

  renderizarMetodosPago() {
    if (!this.elementos.payGrid) {
      return;
    }

    const metodos = [
      { id: "EFECTIVO", nombre: "Efectivo", icono: "💵" },
      { id: "NEQUI", nombre: "Nequi", icono: "📱" },
      { id: "DAVIPLATA", nombre: "Daviplata", icono: "📲" },
      { id: "TARJETA", nombre: "Tarjeta", icono: "💳" },
    ];

    this.elementos.payGrid.innerHTML = "";

    metodos.forEach((metodo) => {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "pay-btn";

      if (this.metodoPago === metodo.id) {
        boton.classList.add("selected");
      }

      boton.dataset.metodo = metodo.id;

      boton.innerHTML = `
        <span class="pay-icon">${metodo.icono}</span>
        <span>${metodo.nombre}</span>
      `;

      this.elementos.payGrid.appendChild(boton);
    });
  }

  seleccionarTipoCobro(tipo) {
    this.tipoCobro = tipo === "FIADO" ? "FIADO" : "CONTADO";

    this.elementos.cobroGrid
      .querySelectorAll("[data-cobro]")
      .forEach((btn) => {
        btn.classList.toggle(
          "selected",
          btn.dataset.cobro === this.tipoCobro,
        );
      });

    if (this.tipoCobro === "CONTADO") {
      this.limpiarClienteSeleccionado();
    }

    this.actualizarUICobro();
    this.actualizarCarrito();
  }

  actualizarUICobro() {
    const esFiado = this.tipoCobro === "FIADO";

    if (this.elementos.payMethods) {
      this.elementos.payMethods.classList.toggle("hidden", esFiado);
    }

    if (this.elementos.clienteSection) {
      this.elementos.clienteSection.classList.toggle("show", esFiado);
    }

    if (this.elementos.btnCheckoutLabel) {
      this.elementos.btnCheckoutLabel.textContent = esFiado
        ? "Fiar"
        : "Cobrar";
    }
  }

  buscarClientesDebounced() {
    clearTimeout(this._clienteBusquedaTimer);

    const texto = this.elementos.clienteSearchInput.value.trim();

    if (texto.length < 1) {
      this.elementos.clienteResults.innerHTML = "";
      this.elementos.clienteResults.classList.remove("show");
      return;
    }

    this._clienteBusquedaTimer = setTimeout(() => {
      this.buscarClientes(texto);
    }, 280);
  }

  async buscarClientes(texto) {
    try {
      const respuesta = await this.realizarPeticion(
        `${API_URL}/clientes?buscar=${encodeURIComponent(texto)}&all=1`,
        { method: "GET" },
      );

      const clientes = Array.isArray(respuesta)
        ? respuesta
        : respuesta.data || [];

      this.renderizarResultadosClientes(clientes);
    } catch (error) {
      console.error("Error al buscar clientes:", error);
      this.mostrarToast(error.message || "No se pudieron cargar clientes.");
    }
  }

  renderizarResultadosClientes(clientes) {
    this.elementos.clienteResults.innerHTML = "";

    if (!clientes.length) {
      this.elementos.clienteResults.innerHTML = `
        <div class="cliente-empty">No se encontraron clientes.</div>
      `;
      this.elementos.clienteResults.classList.add("show");
      return;
    }

    clientes.slice(0, 12).forEach((cliente) => {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "cliente-option";

      const deuda = Number(cliente.saldo_deuda || 0);
      const meta = [
        cliente.telefono || "Sin teléfono",
        deuda > 0 ? `Deuda: $ ${this.formatearNumero(deuda)}` : "Sin deuda",
      ].join(" · ");

      boton.innerHTML = `
        <div class="cliente-option-name">${cliente.nombre}</div>
        <div class="cliente-option-meta">${meta}</div>
      `;

      boton.addEventListener("click", () => {
        this.seleccionarCliente(cliente);
      });

      this.elementos.clienteResults.appendChild(boton);
    });

    this.elementos.clienteResults.classList.add("show");
  }

  seleccionarCliente(cliente) {
    this.clienteSeleccionado = cliente;

    this.elementos.clienteSelectedName.textContent = cliente.nombre;

    const deuda = Number(cliente.saldo_deuda || 0);
    this.elementos.clienteSelectedMeta.textContent = [
      cliente.telefono || "Sin teléfono",
      deuda > 0
        ? `Deuda actual: $ ${this.formatearNumero(deuda)}`
        : "Sin deuda pendiente",
    ].join(" · ");

    this.elementos.clienteSelected.classList.add("show");
    this.elementos.clienteResults.classList.remove("show");
    this.elementos.clienteSearchInput.value = "";
  }

  limpiarClienteSeleccionado() {
    this.clienteSeleccionado = null;
    this.elementos.clienteSelected.classList.remove("show");
    this.elementos.clienteSelectedName.textContent = "—";
    this.elementos.clienteSelectedMeta.textContent = "—";
    this.elementos.clienteSearchInput.value = "";
    this.elementos.clienteResults.innerHTML = "";
    this.elementos.clienteResults.classList.remove("show");
  }

  async procesarVenta() {
    if (this.carrito.length === 0) {
      this.mostrarToast("Agrega al menos un producto.");
      return;
    }

    if (this.tipoVenta === "mesa" && !this.mesaSeleccionada) {
      this.mostrarToast("Selecciona una mesa.");
      return;
    }

    if (!this.ventaActualId) {
      this.mostrarToast(
        "La venta no se ha abierto correctamente. Intenta de nuevo.",
      );
      return;
    }

    if (this.tipoCobro === "FIADO" && !this.clienteSeleccionado) {
      this.mostrarToast("Selecciona un cliente para fiar la venta.");
      return;
    }

    const esFiado = this.tipoCobro === "FIADO";
    const confirmar = confirm(
      esFiado
        ? `¿Fiar esta venta a ${this.clienteSeleccionado.nombre}?`
        : "¿Deseas confirmar esta venta?",
    );

    if (!confirmar) {
      return;
    }

    const datos = esFiado
      ? {
          tipo_pago: "FIADO",
          cliente_id: this.clienteSeleccionado.id,
        }
      : {
          tipo_pago: "CONTADO",
          medio_pago: this.metodoPago,
        };

    try {
      const respuesta = await this.realizarPeticion(
        `${API_URL}/ventas/${this.ventaActualId}/pagar`,
        {
          method: "POST",
          body: JSON.stringify(datos),
        },
      );

      this.mostrarToast(
        respuesta.message ||
          (esFiado
            ? "Venta fiada correctamente."
            : "Venta registrada correctamente."),
      );

      if (this.mesaSeleccionada) {
        this._actualizarMesaLocal(this.mesaSeleccionada.id, {
          occupied: false,
          venta_id: null,
          total: null,
        });
      }

      this.ventaActualId = null;
      this.carrito = [];
      this.mesaSeleccionada = null;
      this.limpiarClienteSeleccionado();
      this.seleccionarTipoCobro("CONTADO");

      this.elementos.contextBar.classList.remove("show");

      await this.cargarMesas();
      this.actualizarCarrito();
    } catch (error) {
      console.error("Error al registrar la venta:", error);
      this.mostrarToast(error.message || "No se pudo registrar la venta.");
    }
  }

  mostrarFecha() {
    if (!this.elementos.fechaActual) {
      return;
    }

    const fecha = new Date();

    this.elementos.fechaActual.textContent = fecha.toLocaleDateString(
      "es-CO",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
      },
    );
  }

  mostrarToast(mensaje) {
    if (!this.elementos.toastContainer) {
      console.warn(mensaje);
      return;
    }

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<span>${mensaje}</span>`;

    this.elementos.toastContainer.appendChild(toast);

    // Forzar reflow para animar la entrada
    requestAnimationFrame(() => {
      toast.classList.add("show");
    });

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  formatearNumero(numero) {
    return Number(numero).toLocaleString("es-CO");
  }
}

async function arrancarApp() {
  const app = new VentasApp();

  try {
    await app.inicializar();
  } catch (error) {
    console.error("Error al inicializar la aplicación:", error);

    const grid = document.getElementById("productsGrid");
    if (grid) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="emoji">⚠️</div>
          <p>${error.message || "Error al iniciar ventas."}</p>
        </div>
      `;
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", arrancarApp);
} else {
  arrancarApp();
}
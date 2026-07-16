const API_URL = "http://localhost:8000/api";

class VentasApp {
  constructor() {
    this.productos = [];
    this.mesas = [];
    this.carrito = [];
    this.tipoVenta = "llevar";
    this.mesaSeleccionada = null;
    this.metodoPago = "EFECTIVO";

    // id de la venta ABIERTA en el backend (null hasta que se agrega
    // el primer producto). Todo el carrito se sincroniza siempre
    // desde la respuesta del servidor, nunca se calcula solo en el cliente.
    this.ventaActualId = null;
    this.procesando = false;

    this.elementos = {
      cardParaLlevar: document.getElementById("cardParaLlevar"),
      cardMesa: document.getElementById("cardMesa"),
      tablesWrap: document.getElementById("tablesWrap"),
      tablesGrid: document.getElementById("tablesGrid"),
      productsGrid: document.getElementById("productsGrid"),
      searchInput: document.getElementById("searchInput"),
      searchClear: document.getElementById("searchClear"),
      favRow: document.getElementById("favRow"),
      catRow: document.getElementById("catRow"),
      cartPanel: document.getElementById("cartPanel"),
      cartSummary: document.getElementById("cartSummary"),
      cartOverlay: document.getElementById("cartOverlay"),
      cartScroll: document.getElementById("cartScroll"),
      cartBadge: document.getElementById("cartBadge"),
      cartLabel: document.getElementById("cartLabel"),
      cartTotal: document.getElementById("cartTotal"),
      subtotalValue: document.getElementById("subtotalValue"),
      grandTotalValue: document.getElementById("grandTotalValue"),
      payGrid: document.getElementById("payGrid"),
      btnCheckout: document.getElementById("btnCheckout"),
      contextBar: document.getElementById("contextBar"),
      contextBarTitle: document.getElementById("contextBarTitle"),
      contextBarSub: document.getElementById("contextBarSub"),
      contextBarClose: document.getElementById("contextBarClose"),
      toast: document.getElementById("toast"),
      toastText: document.getElementById("toastText"),
      fechaActual: document.getElementById("fechaActual"),
      btnBack: document.getElementById("btnBack"),
    };
  }

  async inicializar() {
    if (window.AuthService) {
      AuthService.requireAuth();
    }

    this.configurarEventos();
    this.mostrarFecha();
    this.renderizarMetodosPago();

    await this.cargarProductos();
    await this.cargarMesas();

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
      throw new Error(`Error HTTP ${respuesta.status}`);
    }

    return await respuesta.json();
  }

  async cargarProductos() {
    try {
      const respuesta = await this.realizarPeticion(
        `${API_URL}/productos`,
        {
          method: "GET",
        },
      );

      this.productos = respuesta.data || respuesta;

    } catch (error) {
      console.error("Error al cargar los productos:", error);
      this.mostrarToast(error.message);
    }
  }

  async cargarMesas() {
    try {
      this.mesas = await this.realizarPeticion(
        `${API_URL}/mesas`,
        {
          method: "GET",
        },
      );

      this.renderizarMesas();

    } catch (error) {
      console.error("Error al cargar las mesas:", error);
      this.mostrarToast(error.message);
    }
  }

  configurarEventos() {
    this.elementos.cardParaLlevar.addEventListener("click", () => {
      this.seleccionarTipoVenta("llevar");
    });

    this.elementos.cardMesa.addEventListener("click", () => {
      this.seleccionarTipoVenta("mesa");
    });

    this.elementos.searchInput.addEventListener("input", () => {
      this.renderizarProductos();
    });

    this.elementos.searchClear.addEventListener("click", () => {
      this.elementos.searchInput.value = "";
      this.renderizarProductos();
    });

    this.elementos.cartSummary.addEventListener("click", (event) => {
      if (!event.target.closest("#btnCheckout")) {
        this.alternarCarrito();
      }
    });

    this.elementos.cartOverlay.addEventListener("click", () => {
      this.cerrarCarrito();
    });

    this.elementos.btnCheckout.addEventListener("click", (event) => {
      event.stopPropagation();
      this.procesarVenta();
    });

    this.elementos.contextBarClose.addEventListener("click", () => {
      this.mesaSeleccionada = null;
      this.ventaActualId = null;
      this.carrito = [];

      this.elementos.contextBar.classList.remove("show");
      this.renderizarMesas();
      this.actualizarCarrito();
    });

    this.elementos.btnBack.addEventListener("click", () => {
      window.history.back();
    });

    this.elementos.productsGrid.addEventListener("click", (event) => {
      const boton = event.target.closest("[data-producto-id]");

      if (!boton) {
        return;
      }

      const productoId = Number(boton.dataset.productoId);
      this.agregarProducto(productoId);
    });

    this.elementos.cartScroll.addEventListener("click", (event) => {
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

    this.elementos.payGrid.addEventListener("click", (event) => {
      const boton = event.target.closest("[data-metodo]");

      if (!boton) {
        return;
      }

      this.metodoPago = boton.dataset.metodo;
      this.renderizarMetodosPago();
    });
  }

  seleccionarTipoVenta(tipo) {
    this.tipoVenta = tipo;

    this.elementos.cardParaLlevar.classList.toggle(
      "selected",
      tipo === "llevar",
    );

    this.elementos.cardMesa.classList.toggle(
      "selected",
      tipo === "mesa",
    );

    if (tipo === "mesa") {
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

      tarjeta.className = "table-card";

      if (mesa.occupied) {
        tarjeta.classList.add("occupied");
      }

      if (
        this.mesaSeleccionada &&
        this.mesaSeleccionada.id === mesa.id
      ) {
        tarjeta.classList.add("selected");
      }

      tarjeta.innerHTML = `
        <div class="table-dot"></div>
        <div class="table-num">Mesa ${mesa.numero}</div>
        <div class="table-status">
          ${mesa.occupied ? "OCUPADA" : "LIBRE"}
        </div>
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

    this.elementos.contextBarTitle.textContent =
      `Mesa ${mesa.numero}`;

    this.elementos.contextBarSub.textContent = mesa.occupied
      ? `Cuenta abierta · $ ${this.formatearNumero(mesa.total || 0)}`
      : "Cuenta nueva";

    if (mesa.occupied && mesa.venta_id) {
      // La mesa ya tiene una venta ABIERTA en el backend: la cargamos
      // completa (con sus detalles reales) en vez de reconstruirla a mano.
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

      this.sincronizarDesdeVenta(respuesta.data);

    } catch (error) {
      console.error("Error al cargar la venta de la mesa:", error);
      this.mostrarToast(error.message);
    }
  }

  // Fuente única de verdad: reconstruye this.carrito y this.ventaActualId
  // a partir de la venta que devuelve el backend (con sus detalles reales).
  sincronizarDesdeVenta(venta) {
    const detalles = venta.detalles || [];

    if (detalles.length === 0) {
      // Venta sin productos (recién abierta, o quedó vacía y el backend
      // la anuló automáticamente): no hay nada que seguir usando.
      this.ventaActualId = null;
      this.carrito = [];
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

    this.actualizarCarrito();
  }

  renderizarProductos() {
    const busqueda =
      this.elementos.searchInput.value
        .toLowerCase()
        .trim();

    const productosFiltrados = this.productos.filter(
      (producto) =>
        producto.nombre
          .toLowerCase()
          .includes(busqueda),
    );

    this.elementos.productsGrid.innerHTML = "";

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
        <div class="product-img">
          🛍️
        </div>

        <div class="product-info">
          <div class="product-name">
            ${producto.nombre}
          </div>

          <div class="product-bottom">
            <div class="product-price">
              $ ${this.formatearNumero(producto.precio)}
            </div>

            <button
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

    this.elementos.searchClear.classList.toggle(
      "show",
      busqueda.length > 0,
    );
  }

  renderizarFavoritos() {
    this.elementos.favRow.innerHTML = "";

    this.productos.slice(0, 5).forEach((producto) => {
      const favorito = document.createElement("button");

      favorito.className = "fav-chip";

      favorito.innerHTML = `
        <div class="fav-circle">
          🛍️
          <span class="fav-star">⭐</span>
        </div>

        <span>${producto.nombre}</span>
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

    categorias.forEach((categoria) => {
      const boton = document.createElement("button");

      boton.className = "cat-chip";
      boton.textContent = categoria;

      boton.addEventListener("click", () => {
        this.elementos.searchInput.value = categoria;
        this.renderizarProductos();
      });

      this.elementos.catRow.appendChild(boton);
    });
  }

  async asegurarVentaAbierta() {
    if (this.ventaActualId) {
      return this.ventaActualId;
    }

    // Si la mesa ya tenía una venta abierta (occupied) pero por alguna
    // razón no la cargamos, evitamos abrir una segunda venta duplicada.
    if (
      this.tipoVenta === "mesa" &&
      this.mesaSeleccionada?.venta_id
    ) {
      this.ventaActualId = this.mesaSeleccionada.venta_id;
      return this.ventaActualId;
    }

    const respuesta = await this.realizarPeticion(
      `${API_URL}/ventas`,
      {
        method: "POST",
        body: JSON.stringify({
          mesa_id:
            this.tipoVenta === "mesa" && this.mesaSeleccionada
              ? this.mesaSeleccionada.id
              : null,
        }),
      },
    );

    this.ventaActualId = respuesta.data.id;

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

    if (
      this.tipoVenta === "mesa" &&
      !this.mesaSeleccionada
    ) {
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

      this.sincronizarDesdeVenta(respuesta.data);
      this.mostrarToast(`${producto.nombre} agregado`);

    } catch (error) {
      console.error("Error al agregar el producto:", error);
      this.mostrarToast(
        error.message || "No se pudo agregar el producto.",
      );
    } finally {
      this.procesando = false;
    }
  }

  async aumentarCantidad(productoId) {
    const item = this.carrito.find(
      (producto) =>
        Number(producto.producto_id) === Number(productoId),
    );

    if (!item || this.procesando) {
      return;
    }

    await this.actualizarCantidadEnServidor(
      item,
      item.cantidad + 1,
    );
  }

  async disminuirCantidad(productoId) {
    const item = this.carrito.find(
      (producto) =>
        Number(producto.producto_id) === Number(productoId),
    );

    if (!item || this.procesando) {
      return;
    }

    if (item.cantidad - 1 <= 0) {
      await this.eliminarProducto(productoId);
      return;
    }

    await this.actualizarCantidadEnServidor(
      item,
      item.cantidad - 1,
    );
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

      this.sincronizarDesdeVenta(respuesta.data);

    } catch (error) {
      console.error("Error al actualizar la cantidad:", error);
      this.mostrarToast(
        error.message || "No se pudo actualizar la cantidad.",
      );
    } finally {
      this.procesando = false;
    }
  }

  async eliminarProducto(productoId) {
    const item = this.carrito.find(
      (producto) =>
        Number(producto.producto_id) === Number(productoId),
    );

    if (!item || this.procesando) {
      return;
    }

    const confirmar = confirm(
      `¿Deseas eliminar ${item.producto.nombre} del carrito?`,
    );

    if (!confirmar) {
      return;
    }

    this.procesando = true;

    try {
      const respuesta = await this.realizarPeticion(
        `${API_URL}/ventas/${this.ventaActualId}/detalle/${item.detalle_id}`,
        { method: "DELETE" },
      );

      this.sincronizarDesdeVenta(respuesta.data);

    } catch (error) {
      console.error("Error al eliminar el producto:", error);
      this.mostrarToast(
        error.message || "No se pudo eliminar el producto.",
      );
    } finally {
      this.procesando = false;
    }
  }

  actualizarCarrito() {
    const cantidadTotal = this.carrito.reduce(
      (total, item) => total + item.cantidad,
      0,
    );

    const total = this.carrito.reduce(
      (total, item) =>
        total +
        Number(item.producto.precio) *
          item.cantidad,
      0,
    );

    this.elementos.cartBadge.textContent = cantidadTotal;

    this.elementos.cartLabel.textContent =
      cantidadTotal === 0
        ? "Carrito vacío"
        : `${cantidadTotal} producto${
            cantidadTotal !== 1 ? "s" : ""
          }`;

    this.elementos.cartTotal.textContent =
      `$ ${this.formatearNumero(total)}`;

    this.elementos.subtotalValue.textContent =
      `$ ${this.formatearNumero(total)}`;

    this.elementos.grandTotalValue.textContent =
      `$ ${this.formatearNumero(total)}`;

    this.renderizarCarrito();
  }

  renderizarCarrito() {
    this.elementos.cartScroll.innerHTML = "";

    if (this.carrito.length === 0) {
      this.elementos.cartScroll.innerHTML = `
        <div class="empty-state">
          <div class="emoji">🛒</div>
          <p>No hay productos agregados.</p>
        </div>
      `;

      return;
    }

    this.carrito.forEach((item) => {
      const subtotal =
        Number(item.producto.precio) *
        item.cantidad;

      const elemento = document.createElement("div");

      elemento.className = "cart-item";

      elemento.innerHTML = `
        <div class="cart-item-emoji">
          🛍️
        </div>

        <div class="cart-item-info">
          <div class="cart-item-name">
            ${item.producto.nombre}
          </div>

          <div class="cart-item-price">
            $ ${this.formatearNumero(item.producto.precio)}
          </div>
        </div>

        <div class="qty-control">
          <button
            class="qty-btn"
            data-accion="disminuir"
            data-producto-id="${item.producto_id}"
          >
            −
          </button>

          <span class="qty-value">
            ${item.cantidad}
          </span>

          <button
            class="qty-btn"
            data-accion="aumentar"
            data-producto-id="${item.producto_id}"
          >
            +
          </button>
        </div>

        <div class="cart-item-subtotal">
          $ ${this.formatearNumero(subtotal)}
        </div>

        <button
          class="btn-remove"
          data-accion="eliminar"
          data-producto-id="${item.producto_id}"
        >
          🗑️
        </button>
      `;

      this.elementos.cartScroll.appendChild(elemento);
    });
  }

  renderizarMetodosPago() {
    // Estos valores deben coincidir exactamente con los que valida
    // PagarVentaRequest en el backend: EFECTIVO, NEQUI, DAVIPLATA, TARJETA.
    const metodos = [
      {
        id: "EFECTIVO",
        nombre: "Efectivo",
        icono: "💵",
      },
      {
        id: "NEQUI",
        nombre: "Nequi",
        icono: "📱",
      },
      {
        id: "DAVIPLATA",
        nombre: "Daviplata",
        icono: "📲",
      },
      {
        id: "TARJETA",
        nombre: "Tarjeta",
        icono: "💳",
      },
    ];

    this.elementos.payGrid.innerHTML = "";

    metodos.forEach((metodo) => {
      const boton = document.createElement("button");

      boton.className = "pay-btn";

      if (this.metodoPago === metodo.id) {
        boton.classList.add("selected");
      }

      boton.dataset.metodo = metodo.id;

      boton.innerHTML = `
        <span style="font-size: 20px;">
          ${metodo.icono}
        </span>

        <span>
          ${metodo.nombre}
        </span>
      `;

      this.elementos.payGrid.appendChild(boton);
    });
  }

  async procesarVenta() {
    if (this.carrito.length === 0) {
      this.mostrarToast(
        "Agrega al menos un producto.",
      );

      return;
    }

    if (
      this.tipoVenta === "mesa" &&
      !this.mesaSeleccionada
    ) {
      this.mostrarToast(
        "Selecciona una mesa.",
      );

      return;
    }

    if (!this.ventaActualId) {
      this.mostrarToast(
        "La venta no se ha abierto correctamente. Intenta de nuevo.",
      );

      return;
    }

    const confirmar = confirm(
      "¿Deseas confirmar esta venta?",
    );

    if (!confirmar) {
      return;
    }

    // Nota: el backend también soporta ventas "FIADO" (a crédito), que
    // requieren un cliente_id. Esta pantalla, por ahora, solo cobra de
    // contado; si necesitas fiar ventas hay que agregar un selector de
    // cliente y un toggle Contado/Fiado.
    const datos = {
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
          "Venta registrada correctamente.",
      );

      this.ventaActualId = null;
      this.carrito = [];
      this.mesaSeleccionada = null;

      this.elementos.contextBar.classList.remove("show");
      this.cerrarCarrito();

      await this.cargarMesas();

      this.actualizarCarrito();

    } catch (error) {
      console.error(
        "Error al registrar la venta:",
        error,
      );

      this.mostrarToast(
        error.message ||
          "No se pudo registrar la venta.",
      );
    }
  }

  alternarCarrito() {
    this.elementos.cartPanel.classList.toggle(
      "expanded",
    );

    this.elementos.cartOverlay.classList.toggle(
      "show",
      this.elementos.cartPanel.classList.contains(
        "expanded",
      ),
    );
  }

  cerrarCarrito() {
    this.elementos.cartPanel.classList.remove(
      "expanded",
    );

    this.elementos.cartOverlay.classList.remove(
      "show",
    );
  }

  mostrarFecha() {
    const fecha = new Date();

    this.elementos.fechaActual.textContent =
      fecha.toLocaleDateString(
        "es-CO",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
        },
      );
  }

  mostrarToast(mensaje) {
    this.elementos.toastText.textContent = mensaje;

    this.elementos.toast.classList.add("show");

    setTimeout(() => {
      this.elementos.toast.classList.remove(
        "show",
      );
    }, 3000);
  }

  formatearNumero(numero) {
    return Number(numero).toLocaleString(
      "es-CO",
    );
  }
}

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    const app = new VentasApp();

    try {
      await app.inicializar();
    } catch (error) {
      console.error(
        "Error al inicializar la aplicación:",
        error,
      );
    }
  },
);
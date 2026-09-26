"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Buscador from "@/components/Buscador";
import { createClient } from "@/lib/supabaseClient";

const ESTADOS = [
  { value: "pendiente", label: "Pendiente", clase: "bg-line text-ink" },
  { value: "en_impresion", label: "En impresión", clase: "bg-blueprint/10 text-blueprint" },
  { value: "listo", label: "Listo", clase: "bg-accent/10 text-accentdark" },
  { value: "entregado", label: "Entregado", clase: "bg-success/10 text-success" },
  { value: "cancelado", label: "Cancelado", clase: "bg-danger/10 text-danger" },
];

const MULTIPLICADOR_PERSONALIZADO = 4;

function badgeClase(estado) {
  return ESTADOS.find((e) => e.value === estado)?.clase || "bg-line text-ink";
}

function nombreItem(it) {
  return it.tipo === "personalizado" ? it.descripcion || "Personalizado" : it.producto_nombre;
}

function pesos(n) {
  return Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

export default function PedidosPage() {
  const supabase = createClient();
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState(null);
  const [editandoId, setEditandoId] = useState(null);

  async function cargar() {
    setCargando(true);
    const [ped, cli, prod] = await Promise.all([
      supabase
        .from("pedidos")
        .select(
          "*, clientes(nombre), pedido_items(id, tipo, producto_id, producto_nombre, descripcion, cantidad, precio_unitario, gramos, horas_impresion, costo_unitario)"
        )
        .order("created_at", { ascending: false }),
      supabase.from("clientes").select("id, nombre").order("nombre"),
      supabase.from("productos").select("id, nombre, precio").order("nombre"),
    ]);
    setPedidos(ped.data || []);
    setClientes(cli.data || []);
    setProductos(prod.data || []);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  function abrirNuevo() {
    const hoy = new Date().toISOString().slice(0, 10);
    setEditandoId(null);
    setForm({
      cliente_id: "",
      estado: "pendiente",
      fecha_pedido: hoy,
      fecha_entrega_estimada: "",
      notas: "",
      items: [],
      clienteNuevo: null, // null = eligiendo cliente existente; objeto = alta rápida
    });
  }

  function abrirEdicion(p) {
    setEditandoId(p.id);
    setForm({
      cliente_id: p.cliente_id || "",
      estado: p.estado,
      fecha_pedido: p.fecha_pedido || "",
      fecha_entrega_estimada: p.fecha_entrega_estimada || "",
      notas: p.notas || "",
      clienteNuevo: null,
      items: (p.pedido_items || []).map((it) => ({
        tipo: it.tipo,
        producto_id: it.producto_id || "",
        producto_nombre: it.producto_nombre,
        descripcion: it.descripcion || "",
        cantidad: it.cantidad,
        gramos: it.gramos ?? "",
        horas_impresion: it.horas_impresion ?? "",
        costo_unitario: it.costo_unitario ?? "",
        precio_unitario: it.precio_unitario,
      })),
    });
  }

  function cerrarForm() {
    setForm(null);
    setEditandoId(null);
  }

  function abrirAltaRapidaCliente() {
    setForm({ ...form, cliente_id: "", clienteNuevo: { nombre: "", email: "", telefono: "" } });
  }

  function cancelarAltaRapidaCliente() {
    setForm({ ...form, clienteNuevo: null });
  }

  function agregarItemCatalogo() {
    if (productos.length === 0) {
      alert("Todavía no tenés productos cargados en el catálogo.");
      return;
    }
    // Se agrega vacío: el producto se elige desde el buscador.
    setForm({
      ...form,
      items: [
        ...form.items,
        {
          tipo: "catalogo",
          producto_id: "",
          producto_nombre: "",
          cantidad: 1,
          precio_unitario: 0,
          descripcion: "",
          gramos: "",
          horas_impresion: "",
          costo_unitario: "",
        },
      ],
    });
  }

  function agregarItemPersonalizado() {
    setForm({
      ...form,
      items: [
        ...form.items,
        {
          tipo: "personalizado",
          producto_id: null,
          producto_nombre: null,
          descripcion: "",
          cantidad: 1,
          gramos: "",
          horas_impresion: "",
          costo_unitario: "",
          precio_unitario: 0,
        },
      ],
    });
  }

  /**
   * Reglas de precio:
   *  - costo_unitario  -> propone precio unitario = costo × 4 (se puede pisar)
   *  - precio_unitario -> se guarda tal cual; el total se recalcula solo
   *  - precio_total    -> se reparte entre la cantidad para obtener el unitario
   * En la base solo se guarda precio_unitario: el total siempre es derivado.
   */
  function actualizarItem(index, campo, valor) {
    const items = [...form.items];
    const item = { ...items[index] };

    if (campo === "producto_id") {
      const p = productos.find((x) => x.id === valor);
      item.producto_id = valor || "";
      item.producto_nombre = p ? p.nombre : "";
      item.precio_unitario = p ? p.precio : 0;
    } else if (campo === "costo_unitario") {
      item.costo_unitario = valor;
      item.precio_unitario = Number(valor || 0) * MULTIPLICADOR_PERSONALIZADO;
    } else if (campo === "precio_total") {
      const cant = Number(item.cantidad || 0);
      item.precio_unitario = cant > 0 ? Number(valor || 0) / cant : 0;
    } else {
      item[campo] = valor;
    }

    items[index] = item;
    setForm({ ...form, items });
  }

  function quitarItem(index) {
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  }

  const totalForm = (form?.items || []).reduce(
    (s, it) => s + Number(it.cantidad || 0) * Number(it.precio_unitario || 0),
    0
  );

  // Un pedido entregado ya descontó material del stock. Para no desbalancear
  // el inventario, sus items quedan congelados: primero hay que sacarlo de
  // "entregado" (lo que devuelve el material) y recién ahí editarlos.
  const itemsBloqueados = editandoId !== null && form?.estado === "entregado";

  async function guardarPedido(e) {
    e.preventDefault();
    if (guardando) return;

    if (form.items.length === 0) {
      alert("Agregá al menos un producto al pedido.");
      return;
    }
    for (const it of form.items) {
      if (it.tipo === "catalogo" && !it.producto_id) {
        alert("Elegí un producto en cada ítem del catálogo.");
        return;
      }
      if (it.tipo === "personalizado" && !it.descripcion?.trim()) {
        alert("Completá la descripción de cada ítem personalizado.");
        return;
      }
    }

    setGuardando(true);

    let clienteId = form.cliente_id || null;

    // Alta rápida: si se cargó un cliente nuevo en el momento, lo creamos primero.
    if (form.clienteNuevo) {
      if (!form.clienteNuevo.nombre.trim()) {
        alert("Ingresá al menos el nombre del cliente nuevo.");
        setGuardando(false);
        return;
      }
      const { data: clienteCreado, error: errorCliente } = await supabase
        .from("clientes")
        .insert({
          nombre: form.clienteNuevo.nombre,
          email: form.clienteNuevo.email || null,
          telefono: form.clienteNuevo.telefono || null,
        })
        .select()
        .single();

      if (errorCliente) {
        alert("No se pudo crear el cliente nuevo.");
        setGuardando(false);
        return;
      }
      clienteId = clienteCreado.id;
    }

    const cabecera = {
      cliente_id: clienteId,
      fecha_pedido: form.fecha_pedido || null,
      fecha_entrega_estimada: form.fecha_entrega_estimada || null,
      notas: form.notas,
      total: totalForm,
    };

    let pedidoId = editandoId;

    if (editandoId) {
      const { error } = await supabase.from("pedidos").update(cabecera).eq("id", editandoId);
      if (error) {
        alert("No se pudo guardar el pedido.");
        setGuardando(false);
        return;
      }
    } else {
      const { data: pedido, error } = await supabase
        .from("pedidos")
        .insert(cabecera)
        .select()
        .single();
      if (error) {
        alert("No se pudo crear el pedido.");
        setGuardando(false);
        return;
      }
      pedidoId = pedido.id;
    }

    // Los items se reemplazan enteros: es más simple y más seguro que
    // intentar calcular qué se agregó, cambió o borró en el detalle.
    if (!itemsBloqueados) {
      if (editandoId) {
        await supabase.from("pedido_items").delete().eq("pedido_id", pedidoId);
      }

      const items = form.items.map((it) => ({
        pedido_id: pedidoId,
        tipo: it.tipo,
        producto_id: it.tipo === "catalogo" ? it.producto_id : null,
        producto_nombre: it.tipo === "catalogo" ? it.producto_nombre : null,
        descripcion: it.tipo === "personalizado" ? it.descripcion : null,
        cantidad: Number(it.cantidad),
        gramos: it.tipo === "personalizado" ? Number(it.gramos || 0) : null,
        horas_impresion: it.tipo === "personalizado" ? Number(it.horas_impresion || 0) : null,
        costo_unitario: it.tipo === "personalizado" ? Number(it.costo_unitario || 0) : null,
        precio_unitario: Number(it.precio_unitario),
      }));
      await supabase.from("pedido_items").insert(items);
    }

    setGuardando(false);
    cerrarForm();
    cargar();
  }

  async function cambiarEstado(id, estado) {
    await supabase.from("pedidos").update({ estado }).eq("id", id);
    cargar();
  }

  async function eliminarPedido(id) {
    if (!confirm("¿Eliminar este pedido?")) return;
    await supabase.from("pedidos").delete().eq("id", id);
    cargar();
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Pedidos</h1>
        <button onClick={abrirNuevo} className="btn-primary">
          Nuevo pedido
        </button>
      </div>

      {cargando ? (
        <p className="text-inkmuted">Cargando...</p>
      ) : pedidos.length === 0 ? (
        <p className="text-inkmuted">Todavía no hay pedidos.</p>
      ) : (
        <div className="space-y-4">
          {pedidos.map((p) => (
            <div key={p.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div>
                  <p className="font-display font-semibold">{p.clientes?.nombre || "Sin cliente"}</p>
                  <p className="text-xs text-inkmuted">
                    Pedido el {new Date(p.fecha_pedido).toLocaleDateString("es-AR")}
                    {p.fecha_entrega_estimada &&
                      ` · Entrega estimada ${new Date(p.fecha_entrega_estimada).toLocaleDateString("es-AR")}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={p.estado}
                    onChange={(e) => cambiarEstado(p.id, e.target.value)}
                    className={`badge border-0 ${badgeClase(p.estado)}`}
                  >
                    {ESTADOS.map((e) => (
                      <option key={e.value} value={e.value}>{e.label}</option>
                    ))}
                  </select>
                  <button onClick={() => abrirEdicion(p)} className="text-sm text-blueprint hover:underline">
                    Editar
                  </button>
                  <button onClick={() => eliminarPedido(p.id)} className="text-sm text-danger hover:underline">
                    Eliminar
                  </button>
                </div>
              </div>

              <ul className="text-sm text-inkmuted mb-2 space-y-1">
                {(p.pedido_items || []).map((it) => (
                  <li key={it.id}>
                    {it.cantidad}× {nombreItem(it)}
                    {it.tipo === "personalizado" && (
                      <span className="text-xs">
                        {" "}
                        ({it.gramos ? `${it.gramos} g` : ""}
                        {it.gramos && it.horas_impresion ? " · " : ""}
                        {it.horas_impresion ? `${it.horas_impresion} h` : ""})
                      </span>
                    )}
                    {" — "}${pesos(it.precio_unitario)} c/u = ${pesos(it.precio_unitario * it.cantidad)}
                  </li>
                ))}
              </ul>

              {p.notas && <p className="text-sm text-inkmuted italic mb-2">"{p.notas}"</p>}

              <p className="font-display font-semibold text-right">
                Total: ${pesos(p.total)}
              </p>
            </div>
          ))}
        </div>
      )}

      {form && (
        <div className="modal-overlay">
          <form onSubmit={guardarPedido} className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="font-display font-semibold text-lg mb-4">
              {editandoId ? "Editar pedido" : "Nuevo pedido"}
            </h2>

            {itemsBloqueados && (
              <div className="border border-accent/40 bg-accent/10 rounded-sm p-3 mb-4">
                <p className="text-sm">
                  Este pedido está <strong>entregado</strong> y ya descontó material del stock. Podés
                  cambiar cliente, fechas y notas, pero para modificar los productos primero pasalo a
                  otro estado (eso devuelve el material al stock).
                </p>
              </div>
            )}

            {!form.clienteNuevo ? (
              <>
                <div className="flex items-center justify-between mb-1">
                  <label className="field-label mb-0">Cliente</label>
                  <button
                    type="button"
                    onClick={abrirAltaRapidaCliente}
                    className="text-sm text-blueprint hover:underline"
                  >
                    + Es un cliente nuevo
                  </button>
                </div>
                <div className="mb-3">
                  <Buscador
                    opciones={clientes}
                    valor={form.cliente_id}
                    onChange={(id) => setForm({ ...form, cliente_id: id })}
                    placeholder="Escribí para buscar un cliente..."
                    vacio="Ningún cliente coincide con"
                  />
                </div>
              </>
            ) : (
              <div className="border border-line rounded-sm p-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Alta rápida de cliente</p>
                  <button
                    type="button"
                    onClick={cancelarAltaRapidaCliente}
                    className="text-sm text-inkmuted hover:underline"
                  >
                    Elegir cliente existente
                  </button>
                </div>
                <label className="field-label">Nombre y apellido</label>
                <input
                  required
                  className="field-input mb-2"
                  value={form.clienteNuevo.nombre}
                  onChange={(e) =>
                    setForm({ ...form, clienteNuevo: { ...form.clienteNuevo, nombre: e.target.value } })
                  }
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="field-label">Teléfono</label>
                    <input
                      className="field-input"
                      value={form.clienteNuevo.telefono}
                      onChange={(e) =>
                        setForm({ ...form, clienteNuevo: { ...form.clienteNuevo, telefono: e.target.value } })
                      }
                    />
                  </div>
                  <div>
                    <label className="field-label">Email</label>
                    <input
                      type="email"
                      className="field-input"
                      value={form.clienteNuevo.email}
                      onChange={(e) =>
                        setForm({ ...form, clienteNuevo: { ...form.clienteNuevo, email: e.target.value } })
                      }
                    />
                  </div>
                </div>
                <p className="text-xs text-inkmuted mt-2">
                  Se va a dar de alta como cliente nuevo al guardar el pedido. Después podés completar
                  dirección y notas desde la pantalla de Clientes.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="field-label">Fecha del pedido</label>
                <input
                  type="date"
                  className="field-input"
                  value={form.fecha_pedido}
                  onChange={(e) => setForm({ ...form, fecha_pedido: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">Entrega estimada</label>
                <input
                  type="date"
                  className="field-input"
                  value={form.fecha_entrega_estimada}
                  onChange={(e) => setForm({ ...form, fecha_entrega_estimada: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between mb-2">
              <label className="field-label mb-0">Productos</label>
              {!itemsBloqueados && (
                <div className="space-x-3">
                  <button type="button" onClick={agregarItemCatalogo} className="text-sm text-blueprint hover:underline">
                    + Producto del catálogo
                  </button>
                  <button type="button" onClick={agregarItemPersonalizado} className="text-sm text-blueprint hover:underline">
                    + Personalizado
                  </button>
                </div>
              )}
            </div>

            {form.items.length === 0 ? (
              <p className="text-sm text-inkmuted mb-4">Todavía no agregaste productos.</p>
            ) : itemsBloqueados ? (
              <ul className="text-sm text-inkmuted mb-4 space-y-1 border border-line rounded-sm p-3">
                {form.items.map((it, i) => (
                  <li key={i}>
                    {it.cantidad}× {nombreItem(it)}
                    {" — "}${pesos(it.precio_unitario)} c/u = $
                    {pesos(Number(it.cantidad || 0) * Number(it.precio_unitario || 0))}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-3 mb-4">
                {form.items.map((it, i) => {
                  const subtotal = Number(it.cantidad || 0) * Number(it.precio_unitario || 0);
                  return (
                    <div key={i} className="border border-line rounded-sm p-3">
                      {it.tipo === "catalogo" ? (
                        <>
                          <div className="flex items-start gap-2 mb-2">
                            <div className="flex-1">
                              <Buscador
                                opciones={productos}
                                valor={it.producto_id}
                                onChange={(id) => actualizarItem(i, "producto_id", id)}
                                detalle={(p) => `$${pesos(p.precio)}`}
                                placeholder="Escribí para buscar un producto..."
                                vacio="Ningún producto coincide con"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => quitarItem(i)}
                              className="text-danger text-sm px-1 py-2"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="field-label">Cantidad</label>
                              <input
                                type="number"
                                min="1"
                                className="field-input"
                                value={it.cantidad}
                                onChange={(e) => actualizarItem(i, "cantidad", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="field-label">Precio unitario</label>
                              <div className="field-input bg-base font-medium">
                                ${pesos(it.precio_unitario)}
                              </div>
                            </div>
                            <div>
                              <label className="field-label">Precio total</label>
                              <div className="field-input bg-base font-medium">${pesos(subtotal)}</div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-inkmuted uppercase tracking-wide">
                              Personalizado
                            </span>
                            <button type="button" onClick={() => quitarItem(i)} className="text-danger text-sm px-1">
                              ✕ quitar
                            </button>
                          </div>
                          <input
                            placeholder="Descripción del trabajo"
                            className="field-input mb-2"
                            value={it.descripcion}
                            onChange={(e) => actualizarItem(i, "descripcion", e.target.value)}
                          />
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            <div>
                              <label className="field-label">Gramos</label>
                              <input
                                type="number"
                                step="0.1"
                                className="field-input"
                                value={it.gramos}
                                onChange={(e) => actualizarItem(i, "gramos", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="field-label">Horas</label>
                              <input
                                type="number"
                                step="0.1"
                                className="field-input"
                                value={it.horas_impresion}
                                onChange={(e) => actualizarItem(i, "horas_impresion", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="field-label">Cantidad</label>
                              <input
                                type="number"
                                min="1"
                                className="field-input"
                                value={it.cantidad}
                                onChange={(e) => actualizarItem(i, "cantidad", e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="field-label">Costo</label>
                              <input
                                type="number"
                                step="0.01"
                                className="field-input"
                                value={it.costo_unitario}
                                onChange={(e) => actualizarItem(i, "costo_unitario", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="field-label">Precio unitario</label>
                              <input
                                type="number"
                                step="0.01"
                                className="field-input"
                                value={it.precio_unitario}
                                onChange={(e) => actualizarItem(i, "precio_unitario", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="field-label">Precio total</label>
                              <input
                                type="number"
                                step="0.01"
                                className="field-input"
                                value={subtotal}
                                onChange={(e) => actualizarItem(i, "precio_total", e.target.value)}
                              />
                            </div>
                          </div>
                          <p className="text-xs text-inkmuted mt-2">
                            El costo propone el precio unitario (costo × {MULTIPLICADOR_PERSONALIZADO}),
                            pero podés pisarlo. Si editás el precio total, el unitario se recalcula
                            dividiendo por la cantidad.
                          </p>
                        </>
                      )}
                      {it.tipo === "personalizado" && (
                        <p className="text-right text-sm text-inkmuted mt-2">
                          Subtotal: ${pesos(subtotal)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <label className="field-label">Notas</label>
            <textarea
              className="field-input mb-4"
              rows={2}
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
            />

            <p className="text-right font-display font-semibold mb-4">
              Total: ${pesos(totalForm)}
            </p>

            <div className="flex gap-3">
              <button type="submit" disabled={guardando} className="btn-primary flex-1">
                {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Crear pedido"}
              </button>
              <button type="button" onClick={cerrarForm} className="btn-secondary flex-1">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}

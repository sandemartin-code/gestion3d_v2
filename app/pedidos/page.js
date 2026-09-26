"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
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

export default function PedidosPage() {
  const supabase = createClient();
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState(null);

  async function cargar() {
    setCargando(true);
    const [ped, cli, prod] = await Promise.all([
      supabase
        .from("pedidos")
        .select(
          "*, clientes(nombre), pedido_items(id, tipo, producto_nombre, descripcion, cantidad, precio_unitario, gramos, horas_impresion, costo_unitario)"
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
    setForm({
      cliente_id: "",
      fecha_pedido: hoy,
      fecha_entrega_estimada: "",
      notas: "",
      items: [],
      clienteNuevo: null, // null = eligiendo cliente existente; objeto = alta rápida
    });
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
    const p = productos[0];
    setForm({
      ...form,
      items: [
        ...form.items,
        {
          tipo: "catalogo",
          producto_id: p.id,
          producto_nombre: p.nombre,
          cantidad: 1,
          precio_unitario: p.precio,
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

  function actualizarItem(index, campo, valor) {
    const items = [...form.items];
    const item = { ...items[index] };

    if (campo === "producto_id") {
      const p = productos.find((x) => x.id === valor);
      item.producto_id = valor;
      item.producto_nombre = p.nombre;
      item.precio_unitario = p.precio;
    } else if (campo === "costo_unitario") {
      item.costo_unitario = valor;
      item.precio_unitario = Number(valor || 0) * MULTIPLICADOR_PERSONALIZADO;
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

  async function guardarPedido(e) {
    e.preventDefault();
    if (form.items.length === 0) {
      alert("Agregá al menos un producto al pedido.");
      return;
    }
    for (const it of form.items) {
      if (it.tipo === "personalizado" && !it.descripcion?.trim()) {
        alert("Completá la descripción de cada ítem personalizado.");
        return;
      }
    }

    let clienteId = form.cliente_id || null;

    // Alta rápida: si se cargó un cliente nuevo en el momento, lo creamos primero.
    if (form.clienteNuevo) {
      if (!form.clienteNuevo.nombre.trim()) {
        alert("Ingresá al menos el nombre del cliente nuevo.");
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
        return;
      }
      clienteId = clienteCreado.id;
    }

    const { data: pedido, error } = await supabase
      .from("pedidos")
      .insert({
        cliente_id: clienteId,
        fecha_pedido: form.fecha_pedido || null,
        fecha_entrega_estimada: form.fecha_entrega_estimada || null,
        notas: form.notas,
        total: totalForm,
      })
      .select()
      .single();

    if (error) {
      alert("No se pudo crear el pedido.");
      return;
    }

    const items = form.items.map((it) => ({
      pedido_id: pedido.id,
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

    setForm(null);
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
                    {" — "}${Number(it.precio_unitario * it.cantidad).toLocaleString("es-AR")}
                  </li>
                ))}
              </ul>

              {p.notas && <p className="text-sm text-inkmuted italic mb-2">"{p.notas}"</p>}

              <p className="font-display font-semibold text-right">
                Total: ${Number(p.total).toLocaleString("es-AR")}
              </p>
            </div>
          ))}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center px-4 z-50 py-6">
          <form onSubmit={guardarPedido} className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="font-display font-semibold text-lg mb-4">Nuevo pedido</h2>

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
                <select
                  className="field-input mb-3"
                  value={form.cliente_id}
                  onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}
                >
                  <option value="">Sin especificar</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
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
                  Se va a dar de alta como cliente nuevo al crear el pedido. Después podés completar
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
              <div className="space-x-3">
                <button type="button" onClick={agregarItemCatalogo} className="text-sm text-blueprint hover:underline">
                  + Producto del catálogo
                </button>
                <button type="button" onClick={agregarItemPersonalizado} className="text-sm text-blueprint hover:underline">
                  + Personalizado
                </button>
              </div>
            </div>

            {form.items.length === 0 ? (
              <p className="text-sm text-inkmuted mb-4">Todavía no agregaste productos.</p>
            ) : (
              <div className="space-y-3 mb-4">
                {form.items.map((it, i) => {
                  const subtotal = Number(it.cantidad || 0) * Number(it.precio_unitario || 0);
                  return (
                    <div key={i} className="border border-line rounded-sm p-3">
                      {it.tipo === "catalogo" ? (
                        <div className="flex items-center gap-2">
                          <select
                            className="field-input flex-1"
                            value={it.producto_id}
                            onChange={(e) => actualizarItem(i, "producto_id", e.target.value)}
                          >
                            {productos.map((p) => (
                              <option key={p.id} value={p.id}>{p.nombre}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="1"
                            className="field-input w-16"
                            value={it.cantidad}
                            onChange={(e) => actualizarItem(i, "cantidad", e.target.value)}
                          />
                          <button type="button" onClick={() => quitarItem(i)} className="text-danger text-sm px-1">
                            ✕
                          </button>
                        </div>
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
                          <div className="grid grid-cols-2 gap-2 items-end">
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
                              <label className="field-label">Precio de venta (costo × 4)</label>
                              <div className="field-input bg-base font-medium">
                                ${Number(it.precio_unitario || 0).toLocaleString("es-AR")}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                      <p className="text-right text-sm text-inkmuted mt-2">
                        Subtotal: ${subtotal.toLocaleString("es-AR")}
                      </p>
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
              Total: ${totalForm.toLocaleString("es-AR")}
            </p>

            <div className="flex gap-3">
              <button type="submit" className="btn-primary flex-1">Crear pedido</button>
              <button type="button" onClick={() => setForm(null)} className="btn-secondary flex-1">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}

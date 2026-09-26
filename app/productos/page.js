"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabaseClient";

const VACIO = { nombre: "", descripcion: "", precio: 0, tiempo_impresion_horas: 0, materiales: [] };

export default function ProductosPage() {
  const supabase = createClient();
  const [productos, setProductos] = useState([]);
  const [materialesDisponibles, setMaterialesDisponibles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState(null);
  const [editandoId, setEditandoId] = useState(null);

  async function cargar() {
    setCargando(true);
    const [p, m] = await Promise.all([
      supabase.from("productos").select("*").order("nombre"),
      supabase.from("materiales").select("id, nombre, unidad").order("nombre"),
    ]);
    setProductos(p.data || []);
    setMaterialesDisponibles(m.data || []);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  function abrirNuevo() {
    setForm(VACIO);
    setEditandoId(null);
  }

  function abrirEdicion(p) {
    setForm({ ...p, materiales: p.materiales || [] });
    setEditandoId(p.id);
  }

  function toggleMaterial(materialId, checked) {
    if (checked) {
      setForm({ ...form, materiales: [...form.materiales, { material_id: materialId, cantidad: 0 }] });
    } else {
      setForm({ ...form, materiales: form.materiales.filter((x) => x.material_id !== materialId) });
    }
  }

  function cambiarCantidad(materialId, cantidad) {
    setForm({
      ...form,
      materiales: form.materiales.map((x) =>
        x.material_id === materialId ? { ...x, cantidad: Number(cantidad) } : x
      ),
    });
  }

  async function guardar(e) {
    e.preventDefault();
    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion,
      precio: Number(form.precio),
      tiempo_impresion_horas: Number(form.tiempo_impresion_horas),
      materiales: form.materiales,
    };
    if (editandoId) {
      await supabase.from("productos").update(payload).eq("id", editandoId);
    } else {
      await supabase.from("productos").insert(payload);
    }
    setForm(null);
    cargar();
  }

  async function eliminar(id) {
    if (!confirm("¿Eliminar este producto?")) return;
    await supabase.from("productos").delete().eq("id", id);
    cargar();
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Productos</h1>
        <button onClick={abrirNuevo} className="btn-primary">
          Agregar producto
        </button>
      </div>

      {cargando ? (
        <p className="text-inkmuted">Cargando...</p>
      ) : productos.length === 0 ? (
        <p className="text-inkmuted">Todavía no cargaste productos.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {productos.map((p) => (
            <div key={p.id} className="card">
              <div className="flex justify-between items-start">
                <h3 className="font-display font-semibold">{p.nombre}</h3>
                <span className="font-display font-semibold">${Number(p.precio).toLocaleString("es-AR")}</span>
              </div>
              {p.descripcion && <p className="text-sm text-inkmuted mt-1">{p.descripcion}</p>}
              <p className="text-xs text-inkmuted mt-2">
                {p.tiempo_impresion_horas} h de impresión · {(p.materiales || []).length} material(es)
              </p>
              <div className="mt-4 space-x-3">
                <button onClick={() => abrirEdicion(p)} className="text-sm text-blueprint hover:underline">
                  Editar
                </button>
                <button onClick={() => eliminar(p.id)} className="text-sm text-danger hover:underline">
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center px-4 z-50">
          <form onSubmit={guardar} className="card w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="font-display font-semibold text-lg mb-4">
              {editandoId ? "Editar producto" : "Nuevo producto"}
            </h2>

            <label className="field-label">Nombre</label>
            <input
              required
              className="field-input mb-3"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />

            <label className="field-label">Descripción</label>
            <textarea
              className="field-input mb-3"
              rows={2}
              value={form.descripcion || ""}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="field-label">Precio de venta</label>
                <input
                  type="number"
                  step="0.01"
                  className="field-input"
                  value={form.precio}
                  onChange={(e) => setForm({ ...form, precio: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">Horas de impresión</label>
                <input
                  type="number"
                  step="0.1"
                  className="field-input"
                  value={form.tiempo_impresion_horas}
                  onChange={(e) => setForm({ ...form, tiempo_impresion_horas: e.target.value })}
                />
              </div>
            </div>

            <label className="field-label">Materiales que usa</label>
            {materialesDisponibles.length === 0 ? (
              <p className="text-sm text-inkmuted mb-4">Cargá materiales primero para poder asociarlos.</p>
            ) : (
              <div className="border border-line rounded-sm p-3 mb-5 space-y-2 max-h-40 overflow-y-auto">
                {materialesDisponibles.map((m) => {
                  const seleccionado = form.materiales.find((x) => x.material_id === m.id);
                  return (
                    <div key={m.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!seleccionado}
                        onChange={(e) => toggleMaterial(m.id, e.target.checked)}
                      />
                      <span className="text-sm flex-1">{m.nombre}</span>
                      {seleccionado && (
                        <input
                          type="number"
                          step="0.01"
                          placeholder={`cantidad en ${m.unidad}`}
                          className="field-input w-32 py-1"
                          value={seleccionado.cantidad}
                          onChange={(e) => cambiarCantidad(m.id, e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-3">
              <button type="submit" className="btn-primary flex-1">Guardar</button>
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

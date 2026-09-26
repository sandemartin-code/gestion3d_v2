"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabaseClient";

const VACIO = {
  nombre: "",
  tipo: "filamento",
  color: "",
  unidad: "kg",
  costo_unidad: 0,
  stock_actual: 0,
  stock_minimo: 0,
};

export default function MaterialesPage() {
  const supabase = createClient();
  const [materiales, setMateriales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState(null);
  const [editandoId, setEditandoId] = useState(null);

  async function cargar() {
    setCargando(true);
    const { data } = await supabase.from("materiales").select("*").order("nombre");
    setMateriales(data || []);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  function abrirNuevo() {
    setForm(VACIO);
    setEditandoId(null);
  }

  function abrirEdicion(m) {
    setForm({ ...m });
    setEditandoId(m.id);
  }

  async function guardar(e) {
    e.preventDefault();
    const payload = {
      ...form,
      costo_unidad: Number(form.costo_unidad),
      stock_actual: Number(form.stock_actual),
      stock_minimo: Number(form.stock_minimo),
    };

    if (editandoId) {
      await supabase.from("materiales").update(payload).eq("id", editandoId);
    } else {
      await supabase.from("materiales").insert(payload);
    }
    setForm(null);
    cargar();
  }

  async function eliminar(id) {
    if (!confirm("¿Eliminar este material?")) return;
    await supabase.from("materiales").delete().eq("id", id);
    cargar();
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Materiales</h1>
        <button onClick={abrirNuevo} className="btn-primary">
          Agregar material
        </button>
      </div>

      {cargando ? (
        <p className="text-inkmuted">Cargando...</p>
      ) : materiales.length === 0 ? (
        <p className="text-inkmuted">Todavía no cargaste materiales.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-shell">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Costo / unidad</th>
                <th>Stock</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {materiales.map((m) => {
                const bajo = Number(m.stock_actual) <= Number(m.stock_minimo);
                return (
                  <tr key={m.id}>
                    <td>
                      <span className="font-medium">{m.nombre}</span>
                      {m.color && <span className="text-inkmuted text-sm"> · {m.color}</span>}
                    </td>
                    <td className="capitalize">{m.tipo}</td>
                    <td>
                      ${Number(m.costo_unidad).toLocaleString("es-AR")} / {m.unidad}
                    </td>
                    <td>
                      <span className={bajo ? "text-danger font-medium" : ""}>
                        {m.stock_actual} {m.unidad}
                      </span>
                      {bajo && (
                        <span className="badge bg-danger/10 text-danger ml-2">Stock bajo</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap space-x-3">
                      <button
                        onClick={() => abrirEdicion(m)}
                        className="text-sm text-blueprint hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminar(m.id)}
                        className="text-sm text-danger hover:underline"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <div className="modal-overlay">
          <form onSubmit={guardar} className="card w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="font-display font-semibold text-lg mb-4">
              {editandoId ? "Editar material" : "Nuevo material"}
            </h2>

            <label className="field-label">Nombre</label>
            <input
              required
              className="field-input mb-3"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="field-label">Tipo</label>
                <select
                  className="field-input"
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                >
                  <option value="filamento">Filamento</option>
                  <option value="resina">Resina</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="field-label">Color</label>
                <input
                  className="field-input"
                  value={form.color || ""}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="field-label">Unidad</label>
                <select
                  className="field-input"
                  value={form.unidad}
                  onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                >
                  <option value="kg">kg</option>
                  <option value="litro">litro</option>
                  <option value="unidad">unidad</option>
                </select>
              </div>
              <div>
                <label className="field-label">Costo por unidad</label>
                <input
                  type="number"
                  step="0.01"
                  className="field-input"
                  value={form.costo_unidad}
                  onChange={(e) => setForm({ ...form, costo_unidad: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="field-label">Stock actual</label>
                <input
                  type="number"
                  step="0.01"
                  className="field-input"
                  value={form.stock_actual}
                  onChange={(e) => setForm({ ...form, stock_actual: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">Stock mínimo (alerta)</label>
                <input
                  type="number"
                  step="0.01"
                  className="field-input"
                  value={form.stock_minimo}
                  onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" className="btn-primary flex-1">
                Guardar
              </button>
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

"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabaseClient";

const VACIO = { nombre: "", telefono: "", email: "", direccion: "", notas: "" };

export default function ClientesPage() {
  const supabase = createClient();
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState(null); // null = modal cerrado
  const [editandoId, setEditandoId] = useState(null);

  async function cargar() {
    setCargando(true);
    const { data } = await supabase.from("clientes").select("*").order("nombre");
    setClientes(data || []);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  function abrirNuevo() {
    setForm(VACIO);
    setEditandoId(null);
  }

  function abrirEdicion(cliente) {
    setForm({ ...cliente });
    setEditandoId(cliente.id);
  }

  async function guardar(e) {
    e.preventDefault();
    if (editandoId) {
      await supabase.from("clientes").update(form).eq("id", editandoId);
    } else {
      await supabase.from("clientes").insert(form);
    }
    setForm(null);
    cargar();
  }

  async function eliminar(id) {
    if (!confirm("¿Eliminar este cliente?")) return;
    await supabase.from("clientes").delete().eq("id", id);
    cargar();
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <button onClick={abrirNuevo} className="btn-primary">
          Agregar cliente
        </button>
      </div>

      {cargando ? (
        <p className="text-inkmuted">Cargando...</p>
      ) : clientes.length === 0 ? (
        <p className="text-inkmuted">Todavía no cargaste clientes.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-shell">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.nombre}</td>
                  <td className="text-inkmuted">{c.telefono || "—"}</td>
                  <td className="text-inkmuted">{c.email || "—"}</td>
                  <td className="text-right space-x-3 whitespace-nowrap">
                    <button onClick={() => abrirEdicion(c)} className="text-sm text-blueprint hover:underline">
                      Editar
                    </button>
                    <button onClick={() => eliminar(c.id)} className="text-sm text-danger hover:underline">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center px-4 z-50">
          <form onSubmit={guardar} className="card w-full max-w-md">
            <h2 className="font-display font-semibold text-lg mb-4">
              {editandoId ? "Editar cliente" : "Nuevo cliente"}
            </h2>

            <label className="field-label">Nombre</label>
            <input
              required
              className="field-input mb-3"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />

            <label className="field-label">Teléfono</label>
            <input
              className="field-input mb-3"
              value={form.telefono || ""}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            />

            <label className="field-label">Email</label>
            <input
              type="email"
              className="field-input mb-3"
              value={form.email || ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />

            <label className="field-label">Dirección</label>
            <input
              className="field-input mb-3"
              value={form.direccion || ""}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            />

            <label className="field-label">Notas</label>
            <textarea
              className="field-input mb-5"
              rows={2}
              value={form.notas || ""}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
            />

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

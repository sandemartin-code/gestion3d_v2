"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const supabase = createClient();
  const [resumen, setResumen] = useState(null);

  useEffect(() => {
    async function cargar() {
      const [clientes, pedidosActivos, materiales] = await Promise.all([
        supabase.from("clientes").select("id", { count: "exact", head: true }),
        supabase
          .from("pedidos")
          .select("id, estado, total")
          .in("estado", ["pendiente", "en_impresion", "listo"]),
        supabase.from("materiales").select("id, nombre, stock_actual, stock_minimo"),
      ]);

      const stockBajo = (materiales.data || []).filter(
        (m) => Number(m.stock_actual) <= Number(m.stock_minimo)
      );

      setResumen({
        totalClientes: clientes.count || 0,
        pedidosActivos: pedidosActivos.data?.length || 0,
        valorEnCurso: (pedidosActivos.data || []).reduce((s, p) => s + Number(p.total), 0),
        stockBajo,
      });
    }
    cargar();
  }, []);

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold mb-6">Panel</h1>

      {!resumen ? (
        <p className="text-inkmuted">Cargando...</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <div className="card">
              <p className="text-sm text-inkmuted mb-1">Clientes</p>
              <p className="font-display font-bold text-3xl">{resumen.totalClientes}</p>
            </div>
            <div className="card">
              <p className="text-sm text-inkmuted mb-1">Pedidos activos</p>
              <p className="font-display font-bold text-3xl">{resumen.pedidosActivos}</p>
            </div>
            <div className="card">
              <p className="text-sm text-inkmuted mb-1">Valor en curso</p>
              <p className="font-display font-bold text-3xl">
                ${resumen.valorEnCurso.toLocaleString("es-AR")}
              </p>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold">Materiales con stock bajo</h2>
              <Link href="/materiales" className="text-sm text-blueprint hover:underline">
                Ver materiales
              </Link>
            </div>

            {resumen.stockBajo.length === 0 ? (
              <p className="text-sm text-inkmuted">Todo el stock está por encima del mínimo.</p>
            ) : (
              <ul className="space-y-2">
                {resumen.stockBajo.map((m) => (
                  <li key={m.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{m.nombre}</span>
                    <span className="text-danger">
                      {m.stock_actual} restante (mínimo {m.stock_minimo})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}

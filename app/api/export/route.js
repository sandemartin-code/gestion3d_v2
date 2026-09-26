import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";

// GET /api/export
// Header requerido: Authorization: Bearer <EXPORT_API_KEY>
//
// Devuelve un snapshot en JSON con clientes, materiales, productos y pedidos
// (con sus items), pensado para que un sistema externo (contabilidad,
// e-commerce, planilla, etc.) lo consuma.
export async function GET(request) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "");

  if (!process.env.EXPORT_API_KEY || token !== process.env.EXPORT_API_KEY) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const [clientes, materiales, productos, pedidos] = await Promise.all([
    supabase.from("clientes").select("*"),
    supabase.from("materiales").select("*"),
    supabase.from("productos").select("*"),
    supabase.from("pedidos").select("*, cliente:clientes(id, nombre), items:pedido_items(*)"),
  ]);

  return NextResponse.json({
    generado_en: new Date().toISOString(),
    clientes: clientes.data || [],
    materiales: materiales.data || [],
    productos: productos.data || [],
    pedidos: pedidos.data || [],
  });
}

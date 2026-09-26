"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

const NAV_ITEMS = [
  { href: "/", label: "Panel" },
  { href: "/pedidos", label: "Pedidos" },
  { href: "/clientes", label: "Clientes" },
  { href: "/productos", label: "Productos" },
  { href: "/materiales", label: "Materiales" },
];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen md:flex">
      {/* Navegación de escritorio */}
      <aside className="hidden md:flex md:flex-col md:w-60 md:shrink-0 bg-surface border-r border-line p-5">
        <div className="mb-8">
          <p className="font-display font-bold text-lg leading-tight">Taller 3D</p>
          <p className="text-xs text-inkmuted">Gestión del emprendimiento</p>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => {
            const activo = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-sm text-sm font-display font-medium transition-colors ${
                  activo ? "bg-ink text-surface" : "text-inkmuted hover:text-ink hover:bg-base"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button onClick={cerrarSesion} className="text-sm text-inkmuted hover:text-danger text-left">
          Cerrar sesión
        </button>
      </aside>

      {/* Contenido */}
      <main className="flex-1 p-5 pb-24 md:p-8 md:pb-8 max-w-5xl">{children}</main>

      {/* Navegación móvil */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-line flex z-40">
        {NAV_ITEMS.map((item) => {
          const activo = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 text-center py-3 text-xs font-display font-medium ${
                activo ? "text-ink border-t-2 border-ink -mt-px" : "text-inkmuted"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

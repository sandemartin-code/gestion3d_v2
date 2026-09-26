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
      <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 border-r border-line bg-surface">
        <div className="px-5 py-6">
          <p className="font-display font-semibold text-lg leading-tight">Taller 3D</p>
          <p className="text-xs text-inkmuted">Gestión del emprendimiento</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded-sm text-sm font-medium transition-colors ${
                pathname === item.href
                  ? "bg-ink text-surface"
                  : "text-inkmuted hover:bg-base"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={cerrarSesion}
          className="mx-3 mb-6 text-left px-3 py-2 text-sm text-inkmuted hover:text-danger transition-colors"
        >
          Cerrar sesión
        </button>
      </aside>

      {/* Contenido */}
      <div className="flex-1 md:ml-56">
        <main className="px-4 py-6 md:px-10 md:py-10 pb-24 md:pb-10 max-w-5xl">
          {children}
        </main>
      </div>

      {/* Navegación móvil */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-line flex">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 text-center py-3 text-xs font-medium ${
              pathname === item.href ? "text-ink" : "text-inkmuted"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

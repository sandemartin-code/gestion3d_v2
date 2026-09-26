"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

export const STORAGE_KEY = "taller3d-tema";

function aplicar(tema) {
  document.documentElement.classList.toggle("dark", tema === "oscuro");
}

/**
 * Selector de tema claro/oscuro.
 *
 * La preferencia se guarda en dos lugares:
 *  - localStorage: para que el tema se aplique al instante, incluso antes
 *    de que React monte (ver el script anti-parpadeo en app/layout.js).
 *  - user_metadata de Supabase: para que la preferencia viaje con el usuario
 *    y la encuentre igual si entra desde otra compu o desde el celular.
 */
export default function ThemeToggle({ className = "", compacto = false }) {
  const supabase = createClient();
  const [tema, setTema] = useState("claro");
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    // 1) Lo que ya dejó el script anti-parpadeo
    const actual = document.documentElement.classList.contains("dark") ? "oscuro" : "claro";
    setTema(actual);
    setMontado(true);

    // 2) Si el usuario tiene una preferencia guardada en su cuenta, mandá esa.
    //    Cubre el caso de entrar por primera vez desde otro dispositivo.
    supabase.auth.getUser().then(({ data }) => {
      const guardado = data?.user?.user_metadata?.tema;
      if (guardado && guardado !== actual) {
        setTema(guardado);
        aplicar(guardado);
        localStorage.setItem(STORAGE_KEY, guardado);
      }
    });
  }, []);

  async function cambiar() {
    const nuevo = tema === "oscuro" ? "claro" : "oscuro";
    setTema(nuevo);
    aplicar(nuevo);
    localStorage.setItem(STORAGE_KEY, nuevo);

    // Guardado en la cuenta. Si falla (por ejemplo, sin sesión en /login),
    // no pasa nada: localStorage ya cubrió la persistencia en este navegador.
    try {
      await supabase.auth.updateUser({ data: { tema: nuevo } });
    } catch {
      /* sin sesión */
    }
  }

  const oscuro = tema === "oscuro";

  return (
    <button
      type="button"
      onClick={cambiar}
      aria-label={oscuro ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      title={oscuro ? "Tema claro" : "Tema oscuro"}
      className={`inline-flex items-center gap-2 text-sm text-inkmuted hover:text-ink transition-colors ${className}`}
    >
      {/* Antes de montar mostramos el ícono de luna para no parpadear */}
      <span aria-hidden="true">
        {montado && oscuro ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
          </svg>
        )}
      </span>
      {!compacto && <span>{oscuro ? "Tema claro" : "Tema oscuro"}</span>}
    </button>
  );
}

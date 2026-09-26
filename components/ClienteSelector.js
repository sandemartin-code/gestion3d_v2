"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Buscador de clientes con autocompletado.
 *
 * Filtra por palabras sueltas: escribiendo "mar gon" encuentra a
 * "Martín González", sin importar el orden ni los acentos.
 */

function normalizar(texto) {
  return (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // saca tildes
}

export default function ClienteSelector({ clientes, valor, onChange }) {
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [resaltado, setResaltado] = useState(0);
  const contenedorRef = useRef(null);

  const seleccionado = clientes.find((c) => c.id === valor) || null;

  // Cerrar el desplegable al hacer clic afuera
  useEffect(() => {
    function alClickear(e) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", alClickear);
    return () => document.removeEventListener("mousedown", alClickear);
  }, []);

  const filtrados = useMemo(() => {
    const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean);
    if (palabras.length === 0) return clientes.slice(0, 8);
    return clientes
      .filter((c) => {
        const nombre = normalizar(c.nombre);
        return palabras.every((p) => nombre.includes(p));
      })
      .slice(0, 8);
  }, [clientes, busqueda]);

  function elegir(cliente) {
    onChange(cliente ? cliente.id : "");
    setBusqueda("");
    setAbierto(false);
  }

  function alTeclear(e) {
    if (!abierto && (e.key === "ArrowDown" || e.key === "Enter")) {
      setAbierto(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setResaltado((r) => Math.min(r + 1, filtrados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setResaltado((r) => Math.max(r - 1, 0));
    } else if (e.key === "Enter") {
      // Evita que el Enter mande el formulario del pedido
      e.preventDefault();
      if (filtrados[resaltado]) elegir(filtrados[resaltado]);
    } else if (e.key === "Escape") {
      setAbierto(false);
    }
  }

  // Si ya hay un cliente elegido, mostramos su nombre en vez del buscador
  if (seleccionado) {
    return (
      <div className="flex items-center gap-2 mb-3">
        <div className="field-input flex-1 flex items-center justify-between">
          <span className="font-medium">{seleccionado.nombre}</span>
        </div>
        <button
          type="button"
          onClick={() => elegir(null)}
          className="text-sm text-blueprint hover:underline whitespace-nowrap"
        >
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <div ref={contenedorRef} className="relative mb-3">
      <input
        type="text"
        className="field-input"
        placeholder="Escribí para buscar un cliente..."
        value={busqueda}
        onChange={(e) => {
          setBusqueda(e.target.value);
          setAbierto(true);
          setResaltado(0);
        }}
        onFocus={() => setAbierto(true)}
        onKeyDown={alTeclear}
        autoComplete="off"
      />

      {abierto && (
        <div className="absolute z-10 mt-1 w-full bg-surface border border-line rounded-sm shadow-lg max-h-56 overflow-y-auto">
          {filtrados.length === 0 ? (
            <p className="text-sm text-inkmuted px-3 py-2">
              Ningún cliente coincide con "{busqueda}".
            </p>
          ) : (
            filtrados.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onMouseEnter={() => setResaltado(i)}
                onClick={() => elegir(c)}
                className={`block w-full text-left px-3 py-2 text-sm ${
                  i === resaltado ? "bg-base text-ink" : "text-inkmuted"
                }`}
              >
                {c.nombre}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

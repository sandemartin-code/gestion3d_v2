"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Buscador con autocompletado, reutilizable para clientes y productos.
 *
 * Filtra por palabras sueltas: escribiendo "sop cel" encuentra
 * "Soporte de celular", sin importar el orden ni los acentos.
 *
 * Props:
 *   opciones    -> array de objetos con { id, ... }
 *   valor       -> id seleccionado (o "" si no hay nada elegido)
 *   onChange    -> recibe el id elegido ("" al limpiar)
 *   etiqueta    -> función que devuelve el texto a mostrar/buscar de cada opción
 *   detalle     -> opcional, texto secundario a la derecha de cada opción
 *   placeholder -> texto del campo vacío
 *   vacio       -> texto cuando no hay coincidencias
 */

function normalizar(texto) {
  return (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // saca tildes
}

export default function Buscador({
  opciones,
  valor,
  onChange,
  etiqueta = (o) => o.nombre,
  detalle = null,
  placeholder = "Escribí para buscar...",
  vacio = "Sin coincidencias",
  autoFocus = false,
}) {
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [resaltado, setResaltado] = useState(0);
  const contenedorRef = useRef(null);

  const seleccionado = opciones.find((o) => o.id === valor) || null;

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
    if (palabras.length === 0) return opciones.slice(0, 8);
    return opciones
      .filter((o) => {
        const texto = normalizar(etiqueta(o));
        return palabras.every((p) => texto.includes(p));
      })
      .slice(0, 8);
  }, [opciones, busqueda]);

  function elegir(opcion) {
    onChange(opcion ? opcion.id : "");
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

  // Si ya hay algo elegido, mostramos su nombre en vez del buscador
  if (seleccionado) {
    return (
      <div className="flex items-center gap-2">
        <div className="field-input flex-1 flex items-center justify-between gap-2">
          <span className="font-medium truncate">{etiqueta(seleccionado)}</span>
          {detalle && (
            <span className="text-sm text-inkmuted whitespace-nowrap">{detalle(seleccionado)}</span>
          )}
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
    <div ref={contenedorRef} className="relative">
      <input
        type="text"
        className="field-input"
        placeholder={placeholder}
        value={busqueda}
        autoFocus={autoFocus}
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
        <div className="absolute z-20 mt-1 w-full bg-surface border border-line rounded-sm shadow-lg max-h-56 overflow-y-auto">
          {filtrados.length === 0 ? (
            <p className="text-sm text-inkmuted px-3 py-2">
              {vacio}
              {busqueda ? ` "${busqueda}".` : "."}
            </p>
          ) : (
            filtrados.map((o, i) => (
              <button
                key={o.id}
                type="button"
                onMouseEnter={() => setResaltado(i)}
                onClick={() => elegir(o)}
                className={`flex w-full items-center justify-between gap-2 text-left px-3 py-2 text-sm ${
                  i === resaltado ? "bg-base text-ink" : "text-inkmuted"
                }`}
              >
                <span className="truncate">{etiqueta(o)}</span>
                {detalle && (
                  <span className="text-xs text-inkmuted whitespace-nowrap">{detalle(o)}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

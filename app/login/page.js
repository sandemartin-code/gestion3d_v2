"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setCargando(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setCargando(false);

    if (error) {
      setError("Email o contraseña incorrectos.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-1">Taller 3D</h1>
        <p className="text-sm text-inkmuted mb-6">Ingresá para gestionar tu emprendimiento.</p>

        <label className="field-label">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field-input mb-4"
        />

        <label className="field-label">Contraseña</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field-input mb-4"
        />

        {error && <p className="text-sm text-danger mb-4">{error}</p>}

        <button type="submit" disabled={cargando} className="btn-primary w-full">
          {cargando ? "Ingresando..." : "Ingresar"}
        </button>

        <p className="text-xs text-inkmuted mt-5 leading-relaxed">
          El primer usuario se crea manualmente desde el panel de Supabase (Authentication → Users →
          Add user). No hay registro público.
        </p>
      </form>
    </div>
  );
}

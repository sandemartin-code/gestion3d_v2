import { createClient } from "@supabase/supabase-js";

// OJO: usa la service_role key, que se salta las políticas de seguridad (RLS).
// Por eso este archivo solo se importa desde código que corre en el servidor
// (como app/api/export/route.js) y nunca desde un componente de cliente.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

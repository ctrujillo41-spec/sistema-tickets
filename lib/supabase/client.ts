import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

// Cliente de Supabase para componentes de cliente ("use client").
// Usa la publishable/anon key, segura para exponerse en el navegador:
// el acceso real a los datos está controlado por las políticas RLS
// definidas en la base de datos (ver sección 4.4 del documento de
// arquitectura), no por este cliente.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

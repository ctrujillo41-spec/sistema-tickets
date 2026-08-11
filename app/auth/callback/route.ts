import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Fase 8: recibe el redirect de Supabase Auth después de que la persona
// inicia sesión con Microsoft (Entra ID). Intercambia el "code" por una
// sesión real (cookies) y manda a /dashboard. El trigger handle_new_user
// (ver migración phase8_sso_profile_metadata) crea el perfil si es la
// primera vez que esta persona entra, igual que con correo/contraseña.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=No se pudo completar el inicio de sesión con Microsoft`);
}

import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Profile = Tables<"profiles">;
export type Role = "admin" | "agent" | "user";

// Perfil de la persona autenticada, o null si no hay sesión.
// Server-only: se usa en Server Components y en los guards de las
// páginas de administración (ver sección 4.4 del documento de
// arquitectura para el detalle de roles y permisos).
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

// Guard para páginas restringidas por rol. Redirige a /dashboard si el
// perfil no tiene uno de los roles permitidos. La protección real de
// datos sigue siendo RLS en la base de datos; esto es solo UX.
export async function requireRole(roles: Role[]): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile || !roles.includes(profile.role as Role)) {
    redirect("/dashboard");
  }
  return profile;
}

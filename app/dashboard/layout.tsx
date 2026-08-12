import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getCurrentProfile } from "@/lib/auth";
import type { Role } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // El middleware ya garantiza que hay sesión; aquí solo leemos el perfil
  // para personalizar la navegación y el encabezado.
  const profile = await getCurrentProfile();
  const role = (profile?.role as Role) ?? "user";
  const label = profile?.full_name || profile?.email || "Usuario";

  return (
    <DashboardShell
      role={role}
      userId={profile?.id ?? ""}
      userLabel={label}
      userEmail={profile?.email ?? ""}
    >
      {children}
    </DashboardShell>
  );
}

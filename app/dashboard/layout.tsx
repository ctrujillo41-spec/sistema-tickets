import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getCurrentProfile } from "@/lib/auth";
import type { Role } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // El middleware ya garantiza que hay sesión; aquí solo leemos el perfil
  // para personalizar la navegación y el encabezado.
  const profile = await getCurrentProfile();
  const role = (profile?.role as Role) ?? "user";
  const label = profile?.full_name || profile?.email || "Usuario";

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} />
      <div className="flex flex-1 flex-col">
        <Topbar userId={profile?.id ?? ""} userLabel={label} userEmail={profile?.email ?? ""} role={role} />
        <main className="flex-1 bg-background p-6">{children}</main>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { Role } from "@/lib/auth";

interface DashboardShellProps {
  role: Role;
  userId: string;
  userLabel: string;
  userEmail: string;
  children: React.ReactNode;
}

// Junta Sidebar + Topbar y comparte el estado de "menú móvil abierto"
// entre los dos (el botón de hamburguesa vive en el Topbar, el panel que
// abre es el Sidebar).
export function DashboardShell({ role, userId, userLabel, userEmail, children }: DashboardShellProps) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex flex-1 flex-col">
        <Topbar
          userId={userId}
          userLabel={userLabel}
          userEmail={userEmail}
          role={role}
          onMenuClick={() => setNavOpen(true)}
        />
        <main className="flex-1 bg-background p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

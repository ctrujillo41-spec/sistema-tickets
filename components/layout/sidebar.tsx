"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  BookOpen,
  BarChart3,
  Settings,
  LifeBuoy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/auth";

const NAV_ITEMS: { href: string; label: string; icon: typeof LayoutDashboard; roles: Role[] }[] = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard, roles: ["admin", "agent", "user"] },
  { href: "/dashboard/tickets", label: "Tickets", icon: Ticket, roles: ["admin", "agent", "user"] },
  {
    href: "/dashboard/knowledge-base",
    label: "Base de conocimiento",
    icon: BookOpen,
    roles: ["admin", "agent", "user"],
  },
  { href: "/dashboard/reports", label: "Reportes", icon: BarChart3, roles: ["admin", "agent"] },
  { href: "/dashboard/settings", label: "Configuración", icon: Settings, roles: ["admin"] },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <LifeBuoy className="h-5 w-5 text-accent" />
        <span className="text-sm font-semibold">Sistema de Tickets</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent/15 text-accent"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3 text-xs text-muted-foreground">
        Fase 1 · Identidad y catálogos
      </div>
    </aside>
  );
}

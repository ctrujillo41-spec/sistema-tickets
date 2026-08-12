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
  X,
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

interface SidebarProps {
  role: Role;
  open: boolean;
  onClose: () => void;
}

// En md+ es la barra lateral fija de siempre. Debajo de md (celulares en
// vertical, donde no cabe una barra de 240px fija) se vuelve un panel que
// se desliza desde la izquierda sobre un fondo oscuro, controlado por el
// botón de menú del Topbar.
export function Sidebar({ role, open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col border-r border-border bg-card transition-transform duration-200 ease-in-out",
          "md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between gap-2 border-b border-border px-4">
          <div className="flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-accent" />
            <span className="text-sm font-semibold">Sistema de Tickets</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="text-muted-foreground hover:text-foreground md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
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
      </aside>
    </>
  );
}

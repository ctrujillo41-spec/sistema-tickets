import Link from "next/link";
import { Users, Building2, Tags, Landmark, ScrollText, DatabaseBackup, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";

const SECTIONS = [
  {
    href: "/dashboard/settings/users",
    title: "Usuarios y agentes",
    desc: "Roles, departamentos y empresa de cada persona",
    icon: Users,
  },
  {
    href: "/dashboard/settings/departments",
    title: "Departamentos",
    desc: "TI, Recursos Humanos, Compras, Finanzas, Ventas…",
    icon: Building2,
  },
  {
    href: "/dashboard/settings/categories",
    title: "Categorías y subcategorías",
    desc: "Clasificación de tickets, por empresa o generales",
    icon: Tags,
  },
  {
    href: "/dashboard/settings/companies",
    title: "Empresas / clientes",
    desc: "Listado de empresas con RFC, usado al crear tickets",
    icon: Landmark,
  },
  {
    href: "/dashboard/settings/sla",
    title: "SLA por prioridad",
    desc: "Tiempos de primera respuesta y resolución de cada prioridad",
    icon: Timer,
  },
  {
    href: "/dashboard/settings/audit-log",
    title: "Bitácora de auditoría",
    desc: "Historial de altas, bajas y cambios administrativos",
    icon: ScrollText,
  },
  {
    href: "/dashboard/settings/backups",
    title: "Respaldos",
    desc: "Exportaciones diarias verificadas, ejecutar y descargar",
    icon: DatabaseBackup,
  },
];

export default async function SettingsPage() {
  await requireRole(["admin"]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Catálogos base del sistema. Solo visible para administradores.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SECTIONS.map(({ href, title, desc, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="h-full transition-colors hover:border-accent">
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <Icon className="h-5 w-5 text-accent" />
                <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{desc}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

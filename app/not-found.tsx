import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-4 pt-8 text-center">
          <div className="flex items-center gap-2">
            <LifeBuoy className="h-6 w-6 text-accent" />
            <span className="text-base font-semibold">Sistema de Tickets</span>
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-semibold">Página no encontrada</h1>
            <p className="text-sm text-muted-foreground">
              La dirección que abriste no existe o ya no está disponible.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex h-9 w-full items-center justify-center rounded-md bg-accent px-4 text-sm text-accent-foreground transition-colors hover:bg-accent/90"
          >
            Ir al panel
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

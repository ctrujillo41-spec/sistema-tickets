"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Pantalla de error de las secciones del panel. No muestra el mensaje
// tecnico; solo registra el digest para poder buscarlo en los logs.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error en el panel, digest:", error.digest);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 pt-8 text-center">
          <AlertTriangle className="h-6 w-6 text-danger" />
          <div className="space-y-1">
            <h1 className="text-base font-semibold">Algo salió mal</h1>
            <p className="text-sm text-muted-foreground">
              No pudimos cargar esta sección. Intenta de nuevo; si el problema sigue, avisa al
              administrador.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
            <Button type="button" onClick={reset}>
              Reintentar
            </Button>
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center justify-center rounded-md border border-border px-4 text-sm text-foreground transition-colors hover:bg-muted"
            >
              Ir al panel
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

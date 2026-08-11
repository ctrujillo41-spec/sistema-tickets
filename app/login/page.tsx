"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

// Fase 1: autenticación real por correo/contraseña vía Supabase Auth.
// Fase 8: SSO con Microsoft Entra ID vía el proveedor "azure" de Supabase
// Auth (sección 14 del documento de arquitectura). El intercambio del
// código de autorización ocurre en app/auth/callback/route.ts.
export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Correo o contraseña incorrectos."
          : error.message
      );
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleMicrosoftLogin() {
    setMsLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "email openid profile",
      },
    });

    // Si signInWithOAuth arranca bien, el navegador redirige a Microsoft
    // de inmediato; solo llegamos aquí si algo falló antes de redirigir.
    if (error) {
      setError(error.message);
      setMsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-6 pt-8">
          <div className="flex items-center gap-2">
            <LifeBuoy className="h-6 w-6 text-accent" />
            <span className="text-base font-semibold">Sistema de Tickets</span>
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="email">
                Correo
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu.correo@empresa.com"
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="password">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {error && <p className="text-xs text-danger">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando…" : "Iniciar sesión"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link href="/signup" className="font-medium text-accent hover:underline">
              Crear cuenta
            </Link>
          </p>

          <div className="flex w-full items-center gap-2 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            o
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            variant="outline"
            className="w-full"
            type="button"
            disabled={msLoading}
            onClick={handleMicrosoftLogin}
          >
            {msLoading ? "Redirigiendo…" : "Continuar con Microsoft"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

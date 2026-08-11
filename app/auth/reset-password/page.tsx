"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

// Página a la que llega la persona después de dar clic en el enlace de
// "olvidé mi contraseña" del correo. Para cuando se carga esta página, el
// código de recuperación ya se intercambió por una sesión real en
// app/auth/callback/route.ts (que recibe ?next=/auth/reset-password), así
// que aquí solo hace falta pedir la contraseña nueva y llamar a
// supabase.auth.updateUser.
export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(
        error.message === "Auth session missing!"
          ? "El enlace ya venció o ya se usó. Pide uno nuevo desde la pantalla de inicio de sesión."
          : error.message
      );
      return;
    }

    setDone(true);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1500);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-6 pt-8">
          <div className="flex items-center gap-2">
            <LifeBuoy className="h-6 w-6 text-accent" />
            <span className="text-base font-semibold">Sistema de Tickets</span>
          </div>

          {done ? (
            <p className="text-sm text-success">Contraseña actualizada. Entrando…</p>
          ) : (
            <form onSubmit={handleSubmit} className="w-full space-y-3">
              <p className="text-sm text-muted-foreground">Escribe tu contraseña nueva.</p>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="password">
                  Contraseña nueva
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="confirm">
                  Confirmar contraseña
                </label>
                <input
                  id="confirm"
                  type="password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              {error && <p className="text-xs text-danger">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Guardando…" : "Guardar contraseña"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

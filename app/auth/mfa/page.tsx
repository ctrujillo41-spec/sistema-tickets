"use client";

import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { LifeBuoy, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/safe-next";

// Tarea 2.8 (S-16): segundo factor TOTP para el staff (admin y agentes).
// El middleware manda aqui a quien entra a /dashboard sin nivel aal2.
// - Sin factor verificado: registra uno nuevo (QR + clave) y lo activa.
// - Con factor verificado: solo pide el codigo de 6 digitos.

type Mode = "loading" | "enroll" | "verify" | "error";

interface Enrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

const CODE_ERROR = "Código incorrecto o expirado. Revisa que la hora de tu teléfono sea correcta y vuelve a intentarlo.";

function MfaContent() {
  const searchParams = useSearchParams();
  const destination = safeNext(searchParams.get("next"));
  const [supabase] = useState(() => createClient());

  const [mode, setMode] = useState<Mode>("loading");
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // Evita registrar dos factores si el efecto corre dos veces (modo dev).
    if (started.current) return;
    started.current = true;

    async function init() {
      const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError || !aal) {
        setError("No se pudo revisar tu sesión. Cierra sesión y vuelve a entrar.");
        setMode("error");
        return;
      }
      if (aal.currentLevel === "aal2") {
        window.location.replace(destination);
        return;
      }

      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError || !factors) {
        setError("No se pudo revisar tu segundo factor. Cierra sesión y vuelve a entrar.");
        setMode("error");
        return;
      }

      const totpFactors = factors.all.filter((f) => f.factor_type === "totp");
      const verified = totpFactors.find((f) => f.status === "verified");
      if (verified) {
        setFactorId(verified.id);
        setMode("verify");
        return;
      }

      // Limpia registros a medias de intentos anteriores antes de empezar.
      for (const f of totpFactors.filter((f) => f.status === "unverified")) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }

      const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Sistema de Tickets",
      });
      if (enrollError || !enrolled) {
        setError("No se pudo iniciar el registro del segundo factor. Recarga la página para intentarlo de nuevo.");
        setMode("error");
        return;
      }
      setEnrollment({ factorId: enrolled.id, qrCode: enrolled.totp.qr_code, secret: enrolled.totp.secret });
      setFactorId(enrolled.id);
      setMode("enroll");
    }

    init().catch(() => {
      setError("Ocurrió un error inesperado. Recarga la página para intentarlo de nuevo.");
      setMode("error");
    });
  }, [supabase, destination]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    if (!/^\d{6}$/.test(code)) {
      setError("Escribe los 6 dígitos que muestra tu app de autenticación.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (verifyError) {
      setError(CODE_ERROR);
      setCode("");
      setSubmitting(false);
      return;
    }
    // Navegacion completa para que el middleware lea la sesion ya en aal2.
    window.location.replace(destination);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.replace("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-5 pt-8">
          <div className="flex items-center gap-2">
            <LifeBuoy className="h-6 w-6 text-accent" />
            <span className="text-base font-semibold">Sistema de Tickets</span>
          </div>

          <div className="flex flex-col items-center gap-1 text-center">
            <ShieldCheck className="h-5 w-5 text-accent" />
            <h1 className="text-sm font-semibold">Verificación en dos pasos</h1>
          </div>

          {mode === "loading" && <p className="text-xs text-muted-foreground">Cargando…</p>}

          {mode === "enroll" && enrollment && (
            <div className="w-full space-y-3 text-center">
              <p className="text-xs text-muted-foreground">
                Escanea este código con tu app de autenticación (Microsoft Authenticator, Google
                Authenticator u otra) y escribe el código de 6 dígitos que te muestre.
              </p>
              {/* El QR viene como data URI de Supabase; next/image no aporta nada aqui. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={enrollment.qrCode}
                alt="Código QR para registrar el segundo factor"
                className="mx-auto h-44 w-44 rounded-md border border-border bg-white p-2"
              />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">¿No puedes escanear? Escribe esta clave:</p>
                <code className="block break-all rounded-md bg-muted px-2 py-1 text-xs font-medium">
                  {enrollment.secret}
                </code>
              </div>
            </div>
          )}

          {mode === "verify" && (
            <p className="text-center text-xs text-muted-foreground">
              Escribe el código de 6 dígitos que muestra tu app de autenticación.
            </p>
          )}

          {(mode === "enroll" || mode === "verify") && (
            <form onSubmit={handleSubmit} className="w-full space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="mfa-code">
                  Código de 6 dígitos
                </label>
                <input
                  id="mfa-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-center text-sm tracking-widest outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              {error && <p className="text-xs text-danger">{error}</p>}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Verificando…" : mode === "enroll" ? "Activar" : "Verificar"}
              </Button>
            </form>
          )}

          {mode === "error" && error && <p className="text-center text-xs text-danger">{error}</p>}

          <Button variant="outline" className="w-full" type="button" onClick={handleSignOut}>
            Cerrar sesión
          </Button>

          <p className="text-center text-[11px] text-muted-foreground">
            Si perdiste tu teléfono, pide a un administrador que restablezca tu segundo factor.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MfaPage() {
  return (
    <Suspense fallback={null}>
      <MfaContent />
    </Suspense>
  );
}

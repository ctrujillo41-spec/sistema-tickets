"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CICLO_RENOVACION_LABELS, CICLO_RENOVACION_ORDER } from "@/lib/dominios";
import type { Tables } from "@/types/database";

type Company = Tables<"companies">;

interface StaffOption {
  id: string;
  full_name: string | null;
}

export function NewDominioForm({ companies, staff }: { companies: Company[]; staff: StaffOption[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [nombreDominio, setNombreDominio] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [responsableId, setResponsableId] = useState("");
  const [registrador, setRegistrador] = useState("");
  const [proveedorHosting, setProveedorHosting] = useState("");
  const [fechaRegistro, setFechaRegistro] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [costoRenovacion, setCostoRenovacion] = useState("");
  const [moneda, setMoneda] = useState("MXN");
  const [cicloRenovacion, setCicloRenovacion] = useState("anual");
  const [autoRenovacion, setAutoRenovacion] = useState(false);
  const [tieneSitioWeb, setTieneSitioWeb] = useState(false);
  const [urlSitio, setUrlSitio] = useState("");
  const [usuarioRegistrador, setUsuarioRegistrador] = useState("");
  const [passwordRegistrador, setPasswordRegistrador] = useState("");
  const [usuarioHosting, setUsuarioHosting] = useState("");
  const [passwordHosting, setPasswordHosting] = useState("");
  const [servidorDns, setServidorDns] = useState("");
  const [correoNotificaciones, setCorreoNotificaciones] = useState("");
  const [proveedorSsl, setProveedorSsl] = useState("");
  const [fechaVencimientoSsl, setFechaVencimientoSsl] = useState("");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("dominios")
      .insert({
        nombre_dominio: nombreDominio.trim().toLowerCase(),
        company_id: companyId || null,
        responsable_id: responsableId || null,
        registrador: registrador.trim() || null,
        proveedor_hosting: proveedorHosting.trim() || null,
        fecha_registro: fechaRegistro || null,
        fecha_vencimiento: fechaVencimiento || null,
        costo_renovacion: costoRenovacion ? Number(costoRenovacion) : null,
        moneda: moneda.trim() || "MXN",
        ciclo_renovacion: cicloRenovacion,
        auto_renovacion: autoRenovacion,
        tiene_sitio_web: tieneSitioWeb,
        url_sitio: tieneSitioWeb ? urlSitio.trim() || null : null,
        usuario_registrador: usuarioRegistrador.trim() || null,
        password_registrador: passwordRegistrador || null,
        usuario_hosting: usuarioHosting.trim() || null,
        password_hosting: passwordHosting || null,
        servidor_dns: servidorDns.trim() || null,
        correo_notificaciones: correoNotificaciones.trim() || null,
        proveedor_ssl: proveedorSsl.trim() || null,
        fecha_vencimiento_ssl: fechaVencimientoSsl || null,
        notas: notas.trim() || null,
      })
      .select("id")
      .single();

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(`/dashboard/dominios/${data.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Dominio</label>
          <Input
            value={nombreDominio}
            onChange={(e) => setNombreDominio(e.target.value)}
            placeholder="Ej. integratio.com.mx"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Empresa</label>
          <Select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="w-full">
            <option value="">Interno / sin especificar</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Responsable</label>
          <Select value={responsableId} onChange={(e) => setResponsableId(e.target.value)} className="w-full">
            <option value="">Sin asignar</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name ?? "—"}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-1 border-t border-border pt-4">
        <p className="text-xs font-medium text-muted-foreground">Registro y vencimiento</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Registrador</label>
          <Input
            value={registrador}
            onChange={(e) => setRegistrador(e.target.value)}
            placeholder="Ej. GoDaddy, Namecheap…"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Proveedor de hosting</label>
          <Input
            value={proveedorHosting}
            onChange={(e) => setProveedorHosting(e.target.value)}
            placeholder="Ej. Hostinger, DonWeb…"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Fecha de registro</label>
          <Input type="date" value={fechaRegistro} onChange={(e) => setFechaRegistro(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Fecha de vencimiento</label>
          <Input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Costo de renovación</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={costoRenovacion}
            onChange={(e) => setCostoRenovacion(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Moneda</label>
          <Input value={moneda} onChange={(e) => setMoneda(e.target.value.toUpperCase())} placeholder="MXN" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Ciclo de renovación</label>
          <Select value={cicloRenovacion} onChange={(e) => setCicloRenovacion(e.target.value)} className="w-full">
            {CICLO_RENOVACION_ORDER.map((c) => (
              <option key={c} value={c}>
                {CICLO_RENOVACION_LABELS[c]}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input
            id="auto_renovacion"
            type="checkbox"
            checked={autoRenovacion}
            onChange={(e) => setAutoRenovacion(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <label htmlFor="auto_renovacion" className="text-sm">
            Tiene renovación automática
          </label>
        </div>
      </div>

      <div className="space-y-1 border-t border-border pt-4">
        <p className="text-xs font-medium text-muted-foreground">Sitio web</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <input
            id="tiene_sitio_web"
            type="checkbox"
            checked={tieneSitioWeb}
            onChange={(e) => setTieneSitioWeb(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <label htmlFor="tiene_sitio_web" className="text-sm">
            Tiene página / sitio web
          </label>
        </div>
        {tieneSitioWeb && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">URL del sitio</label>
            <Input
              value={urlSitio}
              onChange={(e) => setUrlSitio(e.target.value)}
              placeholder="https://www.ejemplo.com"
            />
          </div>
        )}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Proveedor de SSL</label>
          <Input
            value={proveedorSsl}
            onChange={(e) => setProveedorSsl(e.target.value)}
            placeholder="Ej. Let's Encrypt, Sectigo…"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Vencimiento del SSL</label>
          <Input
            type="date"
            value={fechaVencimientoSsl}
            onChange={(e) => setFechaVencimientoSsl(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1 border-t border-border pt-4">
        <p className="text-xs font-medium text-muted-foreground">Acceso y credenciales</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Usuario del registrador</label>
          <Input value={usuarioRegistrador} onChange={(e) => setUsuarioRegistrador(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Contraseña del registrador</label>
          <Input
            type="password"
            value={passwordRegistrador}
            onChange={(e) => setPasswordRegistrador(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Usuario de hosting</label>
          <Input value={usuarioHosting} onChange={(e) => setUsuarioHosting(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Contraseña de hosting</label>
          <Input
            type="password"
            value={passwordHosting}
            onChange={(e) => setPasswordHosting(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Servidor DNS / nameservers</label>
          <Input
            value={servidorDns}
            onChange={(e) => setServidorDns(e.target.value)}
            placeholder="ns1.ejemplo.com, ns2.ejemplo.com"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Correo de notificaciones</label>
          <Input
            type="email"
            value={correoNotificaciones}
            onChange={(e) => setCorreoNotificaciones(e.target.value)}
            placeholder="Correo donde llegan avisos de renovación"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Notas</label>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={3}
          placeholder="Cualquier detalle adicional…"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <Button type="submit" disabled={loading || !nombreDominio.trim()}>
        {loading ? "Registrando…" : "Registrar dominio"}
      </Button>
    </form>
  );
}

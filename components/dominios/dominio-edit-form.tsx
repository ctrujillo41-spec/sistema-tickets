"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CICLO_RENOVACION_LABELS, CICLO_RENOVACION_ORDER, DOMINIO_ESTADO_LABELS, DOMINIO_ESTADO_ORDER } from "@/lib/dominios";
import type { Tables, TablesUpdate } from "@/types/database";

type Company = Tables<"companies">;
type DominioPatch = TablesUpdate<"dominios">;

interface StaffOption {
  id: string;
  full_name: string | null;
}

interface DominioInitial {
  id: string;
  company_id: string | null;
  responsable_id: string | null;
  registrador: string | null;
  proveedor_hosting: string | null;
  fecha_registro: string | null;
  fecha_vencimiento: string | null;
  costo_renovacion: number | null;
  moneda: string;
  ciclo_renovacion: string;
  auto_renovacion: boolean;
  estado: string;
  tiene_sitio_web: boolean;
  url_sitio: string | null;
  proveedor_ssl: string | null;
  fecha_vencimiento_ssl: string | null;
  usuario_registrador: string | null;
  password_registrador: string | null;
  usuario_hosting: string | null;
  password_hosting: string | null;
  servidor_dns: string | null;
  correo_notificaciones: string | null;
  notas: string | null;
}

function PasswordField({
  label,
  value,
  onChange,
  onBlur,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  disabled: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        <Input
          type={visible ? "text" : "password"}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete="new-password"
          className="pr-9"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground"
          tabIndex={-1}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function DominioEditForm({
  initial,
  companies,
  staff,
}: {
  initial: DominioInitial;
  companies: Company[];
  staff: StaffOption[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [companyId, setCompanyId] = useState(initial.company_id ?? "");
  const [responsableId, setResponsableId] = useState(initial.responsable_id ?? "");
  const [registrador, setRegistrador] = useState(initial.registrador ?? "");
  const [proveedorHosting, setProveedorHosting] = useState(initial.proveedor_hosting ?? "");
  const [fechaRegistro, setFechaRegistro] = useState(initial.fecha_registro ?? "");
  const [fechaVencimiento, setFechaVencimiento] = useState(initial.fecha_vencimiento ?? "");
  const [costoRenovacion, setCostoRenovacion] = useState(initial.costo_renovacion?.toString() ?? "");
  const [moneda, setMoneda] = useState(initial.moneda);
  const [cicloRenovacion, setCicloRenovacion] = useState(initial.ciclo_renovacion);
  const [autoRenovacion, setAutoRenovacion] = useState(initial.auto_renovacion);
  const [estado, setEstado] = useState(initial.estado);
  const [tieneSitioWeb, setTieneSitioWeb] = useState(initial.tiene_sitio_web);
  const [urlSitio, setUrlSitio] = useState(initial.url_sitio ?? "");
  const [proveedorSsl, setProveedorSsl] = useState(initial.proveedor_ssl ?? "");
  const [fechaVencimientoSsl, setFechaVencimientoSsl] = useState(initial.fecha_vencimiento_ssl ?? "");
  const [usuarioRegistrador, setUsuarioRegistrador] = useState(initial.usuario_registrador ?? "");
  const [passwordRegistrador, setPasswordRegistrador] = useState(initial.password_registrador ?? "");
  const [usuarioHosting, setUsuarioHosting] = useState(initial.usuario_hosting ?? "");
  const [passwordHosting, setPasswordHosting] = useState(initial.password_hosting ?? "");
  const [servidorDns, setServidorDns] = useState(initial.servidor_dns ?? "");
  const [correoNotificaciones, setCorreoNotificaciones] = useState(initial.correo_notificaciones ?? "");
  const [notas, setNotas] = useState(initial.notas ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function persist(patch: DominioPatch) {
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("dominios").update(patch).eq("id", initial.id);
    if (error) {
      setError(error.message);
    } else {
      router.refresh();
    }
    setSaving(false);
  }

  function blurPersist<K extends keyof DominioInitial>(field: K, value: string, patchKey: keyof DominioPatch) {
    const initialValue = (initial[field] ?? "") as string;
    if (value !== initialValue) {
      persist({ [patchKey]: value.trim() || null } as DominioPatch);
    }
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar el dominio "${initial.id}" del inventario? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    const { error } = await supabase.from("dominios").delete().eq("id", initial.id);
    if (error) {
      setError(error.message);
      setDeleting(false);
      return;
    }
    router.push("/dashboard/dominios");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 pt-4">
          <p className="text-xs font-medium text-muted-foreground">General</p>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Empresa</label>
            <Select
              value={companyId}
              disabled={saving}
              onChange={(e) => {
                setCompanyId(e.target.value);
                persist({ company_id: e.target.value || null });
              }}
              className="w-full"
            >
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
            <Select
              value={responsableId}
              disabled={saving}
              onChange={(e) => {
                setResponsableId(e.target.value);
                persist({ responsable_id: e.target.value || null });
              }}
              className="w-full"
            >
              <option value="">Sin asignar</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name ?? "—"}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Estado</label>
            <Select
              value={estado}
              disabled={saving}
              onChange={(e) => {
                setEstado(e.target.value);
                persist({ estado: e.target.value });
              }}
              className="w-full"
            >
              {DOMINIO_ESTADO_ORDER.map((s) => (
                <option key={s} value={s}>
                  {DOMINIO_ESTADO_LABELS[s]}
                </option>
              ))}
            </Select>
            <p className="text-[11px] text-muted-foreground">
              "Por vencer" y "Vencido" se calculan solos según la fecha; usa "Cancelado" para marcarlo manualmente.
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Notas</label>
            <textarea
              value={notas}
              disabled={saving}
              onChange={(e) => setNotas(e.target.value)}
              onBlur={() => blurPersist("notas", notas, "notas")}
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent disabled:bg-muted"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-4">
          <p className="text-xs font-medium text-muted-foreground">Registro y vencimiento</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Registrador</label>
              <Input
                value={registrador}
                disabled={saving}
                onChange={(e) => setRegistrador(e.target.value)}
                onBlur={() => blurPersist("registrador", registrador, "registrador")}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Proveedor de hosting</label>
              <Input
                value={proveedorHosting}
                disabled={saving}
                onChange={(e) => setProveedorHosting(e.target.value)}
                onBlur={() => blurPersist("proveedor_hosting", proveedorHosting, "proveedor_hosting")}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Fecha de registro</label>
              <Input
                type="date"
                value={fechaRegistro}
                disabled={saving}
                onChange={(e) => {
                  setFechaRegistro(e.target.value);
                  persist({ fecha_registro: e.target.value || null });
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Fecha de vencimiento</label>
              <Input
                type="date"
                value={fechaVencimiento}
                disabled={saving}
                onChange={(e) => {
                  setFechaVencimiento(e.target.value);
                  persist({ fecha_vencimiento: e.target.value || null });
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Costo de renovación</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={costoRenovacion}
                disabled={saving}
                onChange={(e) => setCostoRenovacion(e.target.value)}
                onBlur={() => {
                  const num = costoRenovacion ? Number(costoRenovacion) : null;
                  if (num !== initial.costo_renovacion) persist({ costo_renovacion: num });
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Moneda</label>
              <Input
                value={moneda}
                disabled={saving}
                onChange={(e) => setMoneda(e.target.value.toUpperCase())}
                onBlur={() => {
                  if (moneda !== initial.moneda) persist({ moneda: moneda.trim() || "MXN" });
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Ciclo de renovación</label>
              <Select
                value={cicloRenovacion}
                disabled={saving}
                onChange={(e) => {
                  setCicloRenovacion(e.target.value);
                  persist({ ciclo_renovacion: e.target.value });
                }}
                className="w-full"
              >
                {CICLO_RENOVACION_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {CICLO_RENOVACION_LABELS[c]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                id="auto_renovacion_edit"
                type="checkbox"
                checked={autoRenovacion}
                disabled={saving}
                onChange={(e) => {
                  setAutoRenovacion(e.target.checked);
                  persist({ auto_renovacion: e.target.checked });
                }}
                className="h-4 w-4 rounded border-border"
              />
              <label htmlFor="auto_renovacion_edit" className="text-sm">
                Renovación automática
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-4">
          <p className="text-xs font-medium text-muted-foreground">Sitio web</p>
          <div className="flex items-center gap-2">
            <input
              id="tiene_sitio_web_edit"
              type="checkbox"
              checked={tieneSitioWeb}
              disabled={saving}
              onChange={(e) => {
                setTieneSitioWeb(e.target.checked);
                persist({ tiene_sitio_web: e.target.checked });
              }}
              className="h-4 w-4 rounded border-border"
            />
            <label htmlFor="tiene_sitio_web_edit" className="text-sm">
              Tiene página / sitio web
            </label>
          </div>
          {tieneSitioWeb && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">URL del sitio</label>
              <Input
                value={urlSitio}
                disabled={saving}
                onChange={(e) => setUrlSitio(e.target.value)}
                onBlur={() => blurPersist("url_sitio", urlSitio, "url_sitio")}
              />
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Proveedor de SSL</label>
              <Input
                value={proveedorSsl}
                disabled={saving}
                onChange={(e) => setProveedorSsl(e.target.value)}
                onBlur={() => blurPersist("proveedor_ssl", proveedorSsl, "proveedor_ssl")}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Vencimiento del SSL</label>
              <Input
                type="date"
                value={fechaVencimientoSsl}
                disabled={saving}
                onChange={(e) => {
                  setFechaVencimientoSsl(e.target.value);
                  persist({ fecha_vencimiento_ssl: e.target.value || null });
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-4">
          <p className="text-xs font-medium text-muted-foreground">Acceso y credenciales</p>
          <p className="text-[11px] text-muted-foreground">
            Visible solo para administradores. Se recomienda usar contraseñas únicas por dominio.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Usuario del registrador</label>
              <Input
                value={usuarioRegistrador}
                disabled={saving}
                onChange={(e) => setUsuarioRegistrador(e.target.value)}
                onBlur={() => blurPersist("usuario_registrador", usuarioRegistrador, "usuario_registrador")}
              />
            </div>
            <PasswordField
              label="Contraseña del registrador"
              value={passwordRegistrador}
              disabled={saving}
              onChange={setPasswordRegistrador}
              onBlur={() => blurPersist("password_registrador", passwordRegistrador, "password_registrador")}
            />
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Usuario de hosting</label>
              <Input
                value={usuarioHosting}
                disabled={saving}
                onChange={(e) => setUsuarioHosting(e.target.value)}
                onBlur={() => blurPersist("usuario_hosting", usuarioHosting, "usuario_hosting")}
              />
            </div>
            <PasswordField
              label="Contraseña de hosting"
              value={passwordHosting}
              disabled={saving}
              onChange={setPasswordHosting}
              onBlur={() => blurPersist("password_hosting", passwordHosting, "password_hosting")}
            />
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Servidor DNS / nameservers</label>
              <Input
                value={servidorDns}
                disabled={saving}
                onChange={(e) => setServidorDns(e.target.value)}
                onBlur={() => blurPersist("servidor_dns", servidorDns, "servidor_dns")}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Correo de notificaciones</label>
              <Input
                type="email"
                value={correoNotificaciones}
                disabled={saving}
                onChange={(e) => setCorreoNotificaciones(e.target.value)}
                onBlur={() => blurPersist("correo_notificaciones", correoNotificaciones, "correo_notificaciones")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-xs text-danger">{error}</p>}

      <Button variant="danger" onClick={handleDelete} disabled={deleting}>
        <Trash2 className="h-4 w-4" />
        {deleting ? "Eliminando…" : "Eliminar dominio"}
      </Button>
    </div>
  );
}

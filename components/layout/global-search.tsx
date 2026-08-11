"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Ticket as TicketIcon, Building2, User as UserIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { STATUS_LABELS } from "@/lib/tickets";
import type { Role } from "@/lib/auth";

interface TicketResult {
  id: string;
  ticket_number: number;
  subject: string;
  status: string;
}

interface CompanyResult {
  id: string;
  name: string;
  rfc: string | null;
}

interface UserResult {
  id: string;
  full_name: string | null;
  email: string | null;
}

export function GlobalSearch({ role }: { role: Role }) {
  const router = useRouter();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<TicketResult[]>([]);
  const [companies, setCompanies] = useState<CompanyResult[]>([]);
  const [users, setUsers] = useState<UserResult[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const canSearchDirectory = role === "admin" || role === "agent";

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
    setQuery("");
    setTickets([]);
    setCompanies([]);
    setUsers([]);
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();

    if (!trimmed) {
      setTickets([]);
      setCompanies([]);
      setUsers([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const isNumeric = /^\d+$/.test(trimmed);

      const { data: ticketData } = isNumeric
        ? await supabase
            .from("tickets")
            .select("id, ticket_number, subject, status")
            .eq("ticket_number", Number(trimmed))
            .limit(8)
        : await supabase
            .from("tickets")
            .select("id, ticket_number, subject, status")
            .textSearch("search_vector", trimmed, { type: "websearch", config: "spanish" })
            .limit(8);

      setTickets((ticketData as TicketResult[] | null) ?? []);

      if (canSearchDirectory) {
        const [{ data: companyData }, { data: userData }] = await Promise.all([
          supabase.from("companies").select("id, name, rfc").ilike("name", `%${trimmed}%`).limit(5),
          supabase
            .from("profiles")
            .select("id, full_name, email")
            .or(`full_name.ilike.%${trimmed}%,email.ilike.%${trimmed}%`)
            .limit(5),
        ]);
        setCompanies((companyData as CompanyResult[] | null) ?? []);
        setUsers((userData as UserResult[] | null) ?? []);
      }

      setLoading(false);
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, canSearchDirectory, supabase]);

  function goToTicket(id: string) {
    setOpen(false);
    router.push(`/dashboard/tickets/${id}`);
  }

  const hasResults = tickets.length > 0 || companies.length > 0 || users.length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex flex-1 items-center gap-2 rounded-md border border-border bg-muted px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted/70"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Buscar ticket, usuario, empresa…</span>
        <kbd className="ml-auto hidden rounded border border-border bg-card px-1.5 py-0.5 text-[10px] sm:inline">
          Ctrl K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-24"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-lg border border-border bg-card shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por número, asunto, empresa o persona…"
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar búsqueda">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto p-2 text-sm">
              {loading && <p className="px-2 py-3 text-xs text-muted-foreground">Buscando…</p>}

              {!loading && query.trim() && !hasResults && (
                <p className="px-2 py-3 text-xs text-muted-foreground">Sin resultados para &quot;{query}&quot;.</p>
              )}

              {!loading && !query.trim() && (
                <p className="px-2 py-3 text-xs text-muted-foreground">
                  Escribe el número de ticket, un asunto{canSearchDirectory ? ", empresa o persona" : ""}…
                </p>
              )}

              {tickets.length > 0 && (
                <div className="mb-2">
                  <p className="px-2 py-1 text-[11px] font-medium uppercase text-muted-foreground">Tickets</p>
                  {tickets.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => goToTicket(t.id)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
                    >
                      <TicketIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">
                        #{t.ticket_number} · {t.subject}
                      </span>
                      <span className="text-xs text-muted-foreground">{STATUS_LABELS[t.status] ?? t.status}</span>
                    </button>
                  ))}
                </div>
              )}

              {companies.length > 0 && (
                <div className="mb-2">
                  <p className="px-2 py-1 text-[11px] font-medium uppercase text-muted-foreground">Empresas</p>
                  {companies.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 rounded-md px-2 py-1.5">
                      <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{c.name}</span>
                      {c.rfc && <span className="text-xs text-muted-foreground">{c.rfc}</span>}
                    </div>
                  ))}
                </div>
              )}

              {users.length > 0 && (
                <div>
                  <p className="px-2 py-1 text-[11px] font-medium uppercase text-muted-foreground">Personas</p>
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center gap-2 rounded-md px-2 py-1.5">
                      <UserIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{u.full_name ?? "—"}</span>
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

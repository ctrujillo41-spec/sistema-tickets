"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  created_at: string;
  uploader: { full_name: string | null } | null;
}

export function AttachmentsSection({
  ticketId,
  initialAttachments,
}: {
  ticketId: string;
  initialAttachments: Attachment[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    async function loadUrls() {
      const entries = await Promise.all(
        initialAttachments.map(async (a) => {
          const { data } = await supabase.storage
            .from("ticket-attachments")
            .createSignedUrl(a.file_path, 60 * 60);
          return [a.id, data?.signedUrl ?? ""] as const;
        })
      );
      if (!cancelled) setUrls(Object.fromEntries(entries));
    }
    if (initialAttachments.length > 0) loadUrls();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAttachments.length]);

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Tu sesión expiró.");
      setUploading(false);
      return;
    }

    const path = `${ticketId}/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("ticket-attachments")
      .upload(path, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { error: insertError } = await supabase.from("ticket_attachments").insert({
      ticket_id: ticketId,
      file_path: path,
      file_name: file.name,
      uploaded_by: user.id,
    });

    if (insertError) setError(insertError.message);
    else router.refresh();

    setUploading(false);
    e.target.value = "";
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">Archivos adjuntos</p>

      <div className="space-y-1">
        {initialAttachments.map((a) => (
          <a
            key={a.id}
            href={urls[a.id] || "#"}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-muted"
          >
            <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{a.file_name}</span>
            <Download className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </a>
        ))}
        {initialAttachments.length === 0 && (
          <p className="text-xs text-muted-foreground">Sin adjuntos todavía.</p>
        )}
      </div>

      <label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={(e) => {
            e.preventDefault();
            (e.currentTarget.parentElement?.querySelector("input") as HTMLInputElement)?.click();
          }}
        >
          {uploading ? "Subiendo…" : "Adjuntar archivo"}
        </Button>
        <input type="file" className="hidden" onChange={handleUpload} />
      </label>

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

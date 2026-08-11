"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      aria-label="Cerrar sesión"
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md border border-border",
        "text-muted-foreground transition-colors hover:bg-muted hover:text-danger"
      )}
    >
      <LogOut className="h-4 w-4" />
    </button>
  );
}

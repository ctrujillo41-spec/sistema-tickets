import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NewTicketForm } from "@/components/tickets/new-ticket-form";

export default async function NewTicketPage() {
  const profile = await getCurrentProfile();
  const supabase = createClient();

  const [{ data: companies }, { data: departments }, { data: categories }, { data: subcategories }] =
    await Promise.all([
      supabase.from("companies").select("*").eq("is_active", true).order("name"),
      supabase.from("departments").select("*").eq("is_active", true).order("name"),
      supabase.from("categories").select("*").eq("is_active", true).order("name"),
      supabase.from("subcategories").select("*").eq("is_active", true).order("name"),
    ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Nuevo ticket</h1>
        <p className="text-sm text-muted-foreground">
          Selecciona primero la empresa y luego la categoría, como se definió en el diseño.
        </p>
      </div>

      <NewTicketForm
        companies={companies ?? []}
        departments={departments ?? []}
        categories={categories ?? []}
        subcategories={subcategories ?? []}
        defaultCompanyId={profile?.company_id ?? null}
        defaultDepartmentId={profile?.department_id ?? null}
      />
    </div>
  );
}

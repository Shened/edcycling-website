import { redirect } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";
import { getSession } from "@/lib/session";

// Tudo o que está em /gestao é só para admins.
export default async function GestaoLayout({ children }: { children: React.ReactNode }) {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) redirect("/");
  const { count: convites } = await supabase.from("perfis").select("id", { count: "exact", head: true }).eq("ativo", false);
  return (
    <div className="adm">
      <div className="sechead"><h2>Painel de admin</h2></div>
      <AdminNav alertas={{ "/gestao/membros": convites ?? 0 }} />
      <div className="adm-body">{children}</div>
    </div>
  );
}

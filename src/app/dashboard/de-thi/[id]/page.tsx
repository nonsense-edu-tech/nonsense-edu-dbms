import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VAI_TRO_DE_THI } from "@/lib/de-thi/danh-muc";
import { taiDeThi } from "@/lib/de-thi/tai-de";
import DeThiWorkspace from "../DeThiWorkspace";
import styles from "../de-thi.module.css";

export default async function DeThiChiTietPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single();
  if (profile?.trang_thai !== "active" || !VAI_TRO_DE_THI.includes(profile?.vai_tro ?? "")) redirect("/dashboard");

  const data = await taiDeThi(supabase, id);
  if (!data) notFound();

  const quanLy = ["master_admin", "admin_ht", "truong_bm"].includes(profile.vai_tro);
  const canEdit = quanLy || data.de.nguoi_tao === user.id;

  return (
    <main className={styles.page}>
      <Link href="/dashboard/de-thi" className={styles.backLink}>← Đề thi</Link>
      <h1 className={styles.title}>{data.de.ten}</h1>
      <DeThiWorkspace data={data} canEdit={canEdit} />
    </main>
  );
}

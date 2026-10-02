import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { taiDanhMuc, VAI_TRO_DE_THI } from "@/lib/de-thi/danh-muc";
import MaTranEditor from "../../MaTranEditor";
import styles from "../../de-thi.module.css";

export default async function MaTranMoiPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single();
  if (profile?.trang_thai !== "active" || !VAI_TRO_DE_THI.includes(profile?.vai_tro ?? "")) redirect("/dashboard");

  const dm = await taiDanhMuc(supabase);
  return (
    <main className={styles.page}>
      <Link href="/dashboard/de-thi?tab=ma-tran" className={styles.backLink}>← Danh sách ma trận</Link>
      <h1 className={styles.title}>Soạn ma trận đề</h1>
      <MaTranEditor init={{ id: null, ten: "", moTa: "", capHocMa: null, monHocMa: null, dong: [], daCoDeDaChot: false }} dm={dm} />
    </main>
  );
}

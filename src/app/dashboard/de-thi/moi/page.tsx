import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VAI_TRO_DE_THI } from "@/lib/de-thi/danh-muc";
import type { RawSearchParams } from "@/lib/phan-trang";
import TaoDeForm from "../TaoDeForm";
import styles from "../de-thi.module.css";

export default async function TaoDePage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = await searchParams;
  const mt = typeof raw.mt === "string" ? raw.mt : null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single();
  if (profile?.trang_thai !== "active" || !VAI_TRO_DE_THI.includes(profile?.vai_tro ?? "")) redirect("/dashboard");

  if (!mt) {
    const { data } = await supabase.from("ma_tran_de").select("id, ten").is("deleted_at", null).order("created_at", { ascending: false }).limit(50);
    return (
      <main className={styles.page}>
        <Link href="/dashboard/de-thi" className={styles.backLink}>← Đề thi</Link>
        <h1 className={styles.title}>Tạo đề mới</h1>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Chọn ma trận</h2>
          {(data ?? []).length === 0 ? (
            <p className={styles.empty}>Chưa có ma trận. <Link href="/dashboard/de-thi/ma-tran/moi">Soạn ma trận đầu tiên</Link>.</p>
          ) : (
            <ul className={styles.goiY}>
              {(data ?? []).map((m) => (
                <li key={m.id}><Link className={styles.link} href={`/dashboard/de-thi/moi?mt=${m.id}`}>{m.ten}</Link></li>
              ))}
            </ul>
          )}
        </section>
      </main>
    );
  }

  const { data: ma } = await supabase.from("ma_tran_de").select("id, ten").eq("id", mt).is("deleted_at", null).maybeSingle();
  if (!ma) redirect("/dashboard/de-thi/moi");
  return (
    <main className={styles.page}>
      <Link href={`/dashboard/de-thi/ma-tran/${ma.id}`} className={styles.backLink}>← Ma trận: {ma.ten}</Link>
      <h1 className={styles.title}>Tạo đề từ ma trận</h1>
      <TaoDeForm maTranId={ma.id} tenMaTran={ma.ten} />
    </main>
  );
}

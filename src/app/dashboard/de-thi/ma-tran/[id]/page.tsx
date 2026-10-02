import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { taiDanhMuc, VAI_TRO_DE_THI } from "@/lib/de-thi/danh-muc";
import MaTranEditor from "../../MaTranEditor";
import styles from "../../de-thi.module.css";

export default async function MaTranSuaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single();
  if (profile?.trang_thai !== "active" || !VAI_TRO_DE_THI.includes(profile?.vai_tro ?? "")) redirect("/dashboard");

  const { data: mt } = await supabase.from("ma_tran_de").select("id, ten, mo_ta, cap_hoc_ma, mon_hoc_ma").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!mt) notFound();

  const [dm, { data: dong }, { count: soDeChot }] = await Promise.all([
    taiDanhMuc(supabase),
    supabase.from("ma_tran_dong").select("*").eq("ma_tran_id", id).order("thu_tu"),
    supabase.from("de").select("id", { count: "exact", head: true }).eq("ma_tran_id", id).eq("trang_thai", "da_phat_hanh"),
  ]);

  return (
    <main className={styles.page}>
      <Link href="/dashboard/de-thi?tab=ma-tran" className={styles.backLink}>← Danh sách ma trận</Link>
      <h1 className={styles.title}>{mt.ten}</h1>
      <MaTranEditor
        init={{
          id: mt.id,
          ten: mt.ten,
          moTa: mt.mo_ta ?? "",
          capHocMa: mt.cap_hoc_ma,
          monHocMa: mt.mon_hoc_ma,
          daCoDeDaChot: (soDeChot ?? 0) > 0,
          dong: (dong ?? []).map((d) => ({
            key: d.id,
            id: d.id,
            thu_tu: d.thu_tu,
            nhan: d.nhan,
            loai_ngu_lieu: d.loai_ngu_lieu,
            so_luong: d.so_luong,
            cau_moi_cum: d.cau_moi_cum,
            dang_cau_ma: d.dang_cau_ma,
            hoc_phan_ma: d.hoc_phan_ma,
            bai_hoc_ma: d.bai_hoc_ma,
            chu_de_ma: d.chu_de_ma,
            tien_trinh: d.tien_trinh,
            do_kho_tu: d.do_kho_tu,
            do_kho_den: d.do_kho_den,
            cho_phep_noi_do_kho: d.cho_phep_noi_do_kho,
            diem_moi_cau: d.diem_moi_cau != null ? Number(d.diem_moi_cau) : null,
          })),
        }}
        dm={dm}
      />
    </main>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CauHoiSubNav from "@/components/CauHoiSubNav";
import NguLieuForm from "@/components/NguLieuForm";
import NguLieuImport from "@/components/NguLieuImport";
import TaoCauHoiTabs from "@/components/TaoCauHoiTabs";
import { VAI_TRO_SOAN_NGU_LIEU } from "@/lib/ngu-lieu";
import styles from "../../ngan-hang-cau-hoi.module.css";

export default async function TaoNguLieuPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: capHocList }, { data: monHocList }, { data: hocPhanList }, { data: baiHocList }, { data: chuDeList }] =
    await Promise.all([
      supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single(),
      supabase.from("cap_hoc").select("ma, ten").is("deleted_at", null).order("ma"),
      supabase.from("mon_hoc").select("id, ma, cap_hoc_ma, ten").is("deleted_at", null).order("ten"),
      supabase.from("hoc_phan").select("id, mon_hoc_id, ma, ten").is("deleted_at", null).order("ten"),
      supabase.from("bai_hoc").select("id, hoc_phan_id, ma, ten").is("deleted_at", null).order("ten"),
      supabase.from("chu_de").select("id, mon_hoc_id, ma, ten").is("deleted_at", null).order("ten"),
    ]);

  const canWrite = profile?.trang_thai === "active" && VAI_TRO_SOAN_NGU_LIEU.includes(profile?.vai_tro ?? "");
  // Vai trò không được soạn thì không có trang này (quy tắc ẩn hẳn) — về danh sách ngữ liệu.
  if (!canWrite) redirect("/dashboard/ngan-hang-cau-hoi/ngu-lieu");

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Ngân hàng câu hỏi</h1>
      </div>
      <CauHoiSubNav active="ngu-lieu" canCreate />

      <section className={styles.card}>
        <TaoCauHoiTabs
          nhanThuCong="Nhập từng ngữ liệu"
          nhanTuFile="Nhập từ file (ngữ liệu + câu hỏi)"
          thuCong={
            <>
              <h2 className={styles.cardTitle}>Tạo ngữ liệu mới</h2>
              <NguLieuForm
                capHocList={capHocList ?? []}
                monHocList={monHocList ?? []}
                hocPhanList={hocPhanList ?? []}
                baiHocList={baiHocList ?? []}
                chuDeList={chuDeList ?? []}
              />
            </>
          }
          tuFile={
            <>
              <h2 className={styles.cardTitle}>Nhập ngữ liệu và câu hỏi con từ file</h2>
              <NguLieuImport />
            </>
          }
        />
      </section>
    </main>
  );
}

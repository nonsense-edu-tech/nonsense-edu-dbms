import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CauHoiForm from "@/components/CauHoiForm";
import CauHoiImport from "@/components/CauHoiImport";
import CauHoiSubNav from "@/components/CauHoiSubNav";
import TaoCauHoiTabs from "@/components/TaoCauHoiTabs";
import styles from "../ngan-hang-cau-hoi.module.css";

const VAI_TRO_QUAN_LY = ["master_admin", "admin_ht", "truong_bm", "gv"];

export default async function TaoCauHoiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: capHocList },
    { data: monHocList },
    { data: hocPhanList },
    { data: baiHocList },
    { data: chuDeList },
    { data: dangCauList },
  ] = await Promise.all([
    supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single(),
    supabase.from("cap_hoc").select("ma, ten").is("deleted_at", null).order("ma"),
    supabase.from("mon_hoc").select("id, ma, cap_hoc_ma, ten").is("deleted_at", null).order("ten"),
    supabase.from("hoc_phan").select("id, mon_hoc_id, ma, ten").is("deleted_at", null).order("ten"),
    supabase.from("bai_hoc").select("id, hoc_phan_id, ma, ten").is("deleted_at", null).order("ten"),
    supabase.from("chu_de").select("id, mon_hoc_id, ma, ten").is("deleted_at", null).order("ten"),
    supabase.from("dang_cau").select("ma, ten").is("deleted_at", null).order("ma"),
  ]);

  const isActive = profile?.trang_thai === "active";
  const canWrite = isActive && VAI_TRO_QUAN_LY.includes(profile?.vai_tro ?? "");

  // Vai trò không được tạo câu hỏi thì không có tab này — đưa về danh sách,
  // không hiện thông báo "không có quyền" (quy tắc ẩn hẳn).
  if (!canWrite) redirect("/dashboard/ngan-hang-cau-hoi");

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Ngân hàng câu hỏi</h1>
      </div>

      <CauHoiSubNav active="tao" canCreate />

      <section className={styles.card}>
        <TaoCauHoiTabs
          thuCong={
            <>
              <h2 className={styles.cardTitle}>Tạo câu hỏi mới</h2>
              <CauHoiForm
                capHocList={capHocList ?? []}
                monHocList={monHocList ?? []}
                hocPhanList={hocPhanList ?? []}
                baiHocList={baiHocList ?? []}
                chuDeList={chuDeList ?? []}
                dangCauList={dangCauList ?? []}
              />
            </>
          }
          tuFile={
            <>
              <h2 className={styles.cardTitle}>Nhập câu hỏi từ file</h2>
              <CauHoiImport />
            </>
          }
        />
      </section>
    </main>
  );
}

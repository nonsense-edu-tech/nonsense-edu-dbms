import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CauHoiForm from "@/components/CauHoiForm";
import CauHoiImport from "@/components/CauHoiImport";
import CauHoiSubNav from "@/components/CauHoiSubNav";
import NguLieuForm from "@/components/NguLieuForm";
import NguLieuImport from "@/components/NguLieuImport";
import type { RawSearchParams } from "@/lib/phan-trang";
import TaoCauHoiTabs from "@/components/TaoCauHoiTabs";
import styles from "../ngan-hang-cau-hoi.module.css";

const VAI_TRO_QUAN_LY = ["master_admin", "admin_ht", "truong_bm", "gv"];

export default async function TaoCauHoiPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = await searchParams;
  const tabRaw = Array.isArray(raw.tab) ? raw.tab[0] : raw.tab;
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
          tabBanDau={tabRaw}
          nhanAria="Loại nội dung cần tạo"
          tabs={[
            {
              id: "thu-cong",
              nhan: "Nhập từng câu",
              noiDung: (
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
              ),
            },
            {
              id: "tu-file",
              nhan: "Nhập từ file",
              noiDung: (
                <>
                  <h2 className={styles.cardTitle}>Nhập câu hỏi từ file</h2>
                  <CauHoiImport />
                </>
              ),
            },
            {
              id: "ngu-lieu",
              nhan: "Tạo ngữ liệu",
              noiDung: (
                <>
                  <p className={styles.noticeBox}>
                    Ngữ liệu là đề dẫn dùng chung (bài đọc, bảng số liệu, tình huống logic) kèm nhiều câu hỏi con. Tạo ngữ
                    liệu trước, rồi thêm câu hỏi con ngay ở trang chi tiết ngữ liệu — hoặc nhập cả nhóm từ file.
                    Xem và tìm ngữ liệu đã có ở tab <strong>Danh sách ngữ liệu</strong>.
                  </p>
                  <TaoCauHoiTabs
                    nhanAria="Cách tạo ngữ liệu"
                    tabs={[
                      {
                        id: "tung-ngu-lieu",
                        nhan: "Nhập từng ngữ liệu",
                        noiDung: (
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
                        ),
                      },
                      {
                        id: "file-ngu-lieu",
                        nhan: "Nhập từ file (ngữ liệu + câu hỏi)",
                        noiDung: (
                          <>
                            <h2 className={styles.cardTitle}>Nhập ngữ liệu và câu hỏi con từ file</h2>
                            <NguLieuImport />
                          </>
                        ),
                      },
                    ]}
                  />
                </>
              ),
            },
          ]}
        />
      </section>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LopForm from "@/components/LopForm";
import LopTable, { type LopRow } from "@/components/LopTable";
import styles from "./lop.module.css";

export default async function LopPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: lopList },
    { data: capHocList },
    { data: chuongTrinhList },
    { data: hocSinhList },
    { data: chiNhanhList },
    { data: userChiNhanhList },
  ] = await Promise.all([
    supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single(),
    supabase
      .from("lop")
      .select(
        "id, ma_lop, ten_lop, cap_hoc_ma, chuong_trinh_ma, chi_nhanh_id, nam_hoc, so_lop, ngay_khai_giang, ngay_ket_thuc, tinh_trang, created_at"
      )
      .order("ma_lop", { ascending: false })
      .limit(100),
    supabase.from("cap_hoc").select("ma, ten").is("deleted_at", null).order("ma"),
    supabase.from("chuong_trinh").select("ma, ten").is("deleted_at", null).order("ma"),
    supabase.from("hoc_sinh").select("lop_hien_tai_id").limit(2000),
    supabase.from("chi_nhanh").select("id, ten").is("deleted_at", null).order("ten"),
    supabase.from("user_chi_nhanh").select("chi_nhanh_id").eq("user_id", user.id),
  ]);

  const isActive = profile?.trang_thai === "active";
  const isMasterAdmin = isActive && profile?.vai_tro === "master_admin";
  const isAdminTs = isActive && profile?.vai_tro === "admin_ts";
  const isQuanLyChiNhanh = isActive && profile?.vai_tro === "quan_ly_chi_nhanh";
  const isAllowed = isMasterAdmin || isAdminTs || isQuanLyChiNhanh;
  const canDelete = isMasterAdmin;

  const myChiNhanhIds = new Set((userChiNhanhList ?? []).map((uc) => uc.chi_nhanh_id));
  const chiNhanhOptionsChoForm = isQuanLyChiNhanh
    ? (chiNhanhList ?? []).filter((c) => myChiNhanhIds.has(c.id))
    : (chiNhanhList ?? []);

  const capHocMap = new Map((capHocList ?? []).map((c) => [c.ma, c.ten]));
  const chuongTrinhMap = new Map((chuongTrinhList ?? []).map((c) => [c.ma, c.ten]));
  const chiNhanhMap = new Map((chiNhanhList ?? []).map((c) => [c.id, c.ten]));

  const soHocSinhMap = new Map<string, number>();
  for (const hs of hocSinhList ?? []) {
    if (hs.lop_hien_tai_id == null) continue;
    soHocSinhMap.set(hs.lop_hien_tai_id, (soHocSinhMap.get(hs.lop_hien_tai_id) ?? 0) + 1);
  }

  const lopRows: LopRow[] = (lopList ?? []).map((lop) => ({
    id: lop.id,
    ma_lop: lop.ma_lop,
    ten_lop: lop.ten_lop,
    cap_hoc_ten: capHocMap.get(lop.cap_hoc_ma) ?? String(lop.cap_hoc_ma),
    chuong_trinh_ten: chuongTrinhMap.get(lop.chuong_trinh_ma) ?? lop.chuong_trinh_ma,
    chi_nhanh_ten: lop.chi_nhanh_id != null ? chiNhanhMap.get(lop.chi_nhanh_id) ?? null : null,
    nam_hoc: lop.nam_hoc,
    so_lop: lop.so_lop,
    ngay_khai_giang: lop.ngay_khai_giang,
    ngay_ket_thuc: lop.ngay_ket_thuc,
    tinh_trang: lop.tinh_trang,
    so_hoc_sinh: soHocSinhMap.get(lop.id) ?? 0,
    coTheSua: isMasterAdmin || isAdminTs || (isQuanLyChiNhanh && lop.chi_nhanh_id != null && myChiNhanhIds.has(lop.chi_nhanh_id)),
  }));

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Lớp học</h1>
        <Link href="/dashboard" className={styles.backLink}>← Về dashboard</Link>
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Tạo lớp mới</h2>
        {isAllowed ? (
          <LopForm
            capHocList={capHocList ?? []}
            chuongTrinhList={chuongTrinhList ?? []}
            chiNhanhList={chiNhanhOptionsChoForm}
            batBuocChiNhanh={isQuanLyChiNhanh}
          />
        ) : (
          <p className={styles.noticeBox}>
            Chỉ Master Admin, Tuyển sinh (admin_ts) hoặc Quản lý chi nhánh được tạo lớp học. Tài khoản của bạn:{" "}
            {isActive ? `vai trò "${profile?.vai_tro ?? "chưa gán"}"` : "tài khoản đang bị khoá (disabled)"}.
          </p>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Danh sách lớp ({lopRows.length})</h2>
        {lopRows.length > 0 ? (
          <LopTable list={lopRows} canDelete={canDelete} />
        ) : (
          <p className={styles.empty}>Chưa có lớp nào.</p>
        )}
      </section>
    </main>
  );
}

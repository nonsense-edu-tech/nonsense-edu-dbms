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

  const [{ data: profile }, { data: lopList }, { data: capHocList }, { data: chuongTrinhList }, { data: hocSinhList }] =
    await Promise.all([
      supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single(),
      supabase
        .from("lop")
        .select(
          "id, ma_lop, ten_lop, cap_hoc_ma, chuong_trinh_ma, nam_hoc, so_lop, ngay_khai_giang, ngay_ket_thuc, tinh_trang, created_at"
        )
        .order("ma_lop", { ascending: false })
        .limit(100),
      supabase.from("cap_hoc").select("ma, ten").is("deleted_at", null).order("ma"),
      supabase.from("chuong_trinh").select("ma, ten").is("deleted_at", null).order("ma"),
      supabase.from("hoc_sinh").select("lop_hien_tai_id").limit(2000),
    ]);

  const isActive = profile?.trang_thai === "active";
  const isMasterAdmin = isActive && profile?.vai_tro === "master_admin";
  const isAllowed = isActive && (profile?.vai_tro === "master_admin" || profile?.vai_tro === "admin_ts");
  const canEdit = isAllowed;
  const canDelete = isMasterAdmin;

  const capHocMap = new Map((capHocList ?? []).map((c) => [c.ma, c.ten]));
  const chuongTrinhMap = new Map((chuongTrinhList ?? []).map((c) => [c.ma, c.ten]));

  const soHocSinhMap = new Map<number, number>();
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
    nam_hoc: lop.nam_hoc,
    so_lop: lop.so_lop,
    ngay_khai_giang: lop.ngay_khai_giang,
    ngay_ket_thuc: lop.ngay_ket_thuc,
    tinh_trang: lop.tinh_trang,
    so_hoc_sinh: soHocSinhMap.get(lop.id) ?? 0,
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
          <LopForm capHocList={capHocList ?? []} chuongTrinhList={chuongTrinhList ?? []} />
        ) : (
          <p className={styles.noticeBox}>
            Chỉ Master Admin hoặc Tuyển sinh (admin_ts) được tạo lớp học. Tài khoản của bạn:{" "}
            {isActive ? `vai trò "${profile?.vai_tro ?? "chưa gán"}"` : "tài khoản đang bị khoá (disabled)"}.
          </p>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Danh sách lớp ({lopRows.length})</h2>
        {lopRows.length > 0 ? (
          <LopTable list={lopRows} canEdit={canEdit} canDelete={canDelete} />
        ) : (
          <p className={styles.empty}>Chưa có lớp nào.</p>
        )}
      </section>
    </main>
  );
}

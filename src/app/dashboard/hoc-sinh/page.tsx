import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HocSinhForm from "@/components/HocSinhForm";
import HocSinhTable, { type HocSinhRow } from "@/components/HocSinhTable";
import styles from "./hoc-sinh.module.css";

export default async function HocSinhPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: lopList }, { data: hocSinhList }] = await Promise.all([
    supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single(),
    supabase.from("lop").select("id, ma_lop, ten_lop").order("ma_lop", { ascending: false }),
    supabase
      .from("hoc_sinh")
      .select(
        "id, ma_hoc_sinh, ho_ten, sdt_phu_huynh, lop_hien_tai_id, created_at, tinh_trang_dang_ky, ngay_sinh, gioi_tinh, email, sdt_hoc_sinh, cccd, truong_thpt, khoi_thi, nv1, ten_phu_huynh, dia_chi"
      )
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  const isActive = profile?.trang_thai === "active";
  const isMasterAdmin = isActive && profile?.vai_tro === "master_admin";
  const isAllowed = isActive && (profile?.vai_tro === "master_admin" || profile?.vai_tro === "admin_ts");
  const canEdit = isAllowed;
  const canDelete = isMasterAdmin;

  const lopMap = new Map((lopList ?? []).map((l) => [l.id, l]));
  const hocSinhRows: HocSinhRow[] = (hocSinhList ?? []).map((hs) => {
    const lop = hs.lop_hien_tai_id != null ? lopMap.get(hs.lop_hien_tai_id) : null;
    return {
      id: hs.id,
      ma_hoc_sinh: hs.ma_hoc_sinh,
      ho_ten: hs.ho_ten,
      sdt_phu_huynh: hs.sdt_phu_huynh,
      lop_hien_tai: lop ? (lop.ten_lop ? `${lop.ma_lop} — ${lop.ten_lop}` : lop.ma_lop) : null,
      tinh_trang_dang_ky: hs.tinh_trang_dang_ky,
      ngay_sinh: hs.ngay_sinh,
      gioi_tinh: hs.gioi_tinh,
      email: hs.email,
      sdt_hoc_sinh: hs.sdt_hoc_sinh,
      cccd: hs.cccd,
      truong_thpt: hs.truong_thpt,
      khoi_thi: hs.khoi_thi,
      nv1: hs.nv1,
      ten_phu_huynh: hs.ten_phu_huynh,
      dia_chi: hs.dia_chi,
    };
  });

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Học sinh</h1>
        <Link href="/dashboard" className={styles.backLink}>← Về dashboard</Link>
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Tạo ID học sinh</h2>
        {isAllowed ? (
          <HocSinhForm lopList={lopList ?? []} />
        ) : (
          <p className={styles.noticeBox}>
            Chỉ Master Admin hoặc Tuyển sinh (admin_ts) được tạo ID học sinh. Tài khoản của bạn:{" "}
            {isActive ? `vai trò "${profile?.vai_tro ?? "chưa gán"}"` : "tài khoản đang bị khoá (disabled)"}.
          </p>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Tra cứu &amp; xuất danh sách học sinh ({hocSinhRows.length})</h2>
        {hocSinhRows.length > 0 ? (
          <HocSinhTable list={hocSinhRows} canEdit={canEdit} canDelete={canDelete} />
        ) : (
          <p className={styles.empty}>Chưa có học sinh nào.</p>
        )}
      </section>
    </main>
  );
}

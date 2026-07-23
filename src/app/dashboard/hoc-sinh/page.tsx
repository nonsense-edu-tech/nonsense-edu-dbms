import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HocSinhForm from "@/components/HocSinhForm";
import HocSinhTable, { type HocSinhRow } from "@/components/HocSinhTable";
import styles from "./hoc-sinh.module.css";

// Phòng trường hợp dữ liệu cũ (trước khi đổi cột sang text[]) vẫn còn ở dạng
// chuỗi đơn — tránh crash .map() ở client component.
function chuanHoaMang(v: unknown): string[] | null {
  if (v == null) return null;
  if (Array.isArray(v)) return v;
  return [String(v)];
}

export default async function HocSinhPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: lopList },
    { data: hocSinhList },
    { data: ghiDanhMoList },
    { data: userChiNhanhList },
    { data: chiNhanhList },
  ] = await Promise.all([
    supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single(),
    supabase.from("lop").select("id, ma_lop, ten_lop, chi_nhanh_id").order("ma_lop", { ascending: false }),
    supabase
      .from("hoc_sinh")
      .select(
        "id, stt, ma_hoc_sinh, ho_ten, sdt_phu_huynh, lop_hien_tai_id, created_at, tinh_trang_dang_ky, ngay_sinh, gioi_tinh, email, sdt_hoc_sinh, cccd, truong_thpt, khoi_thi, nv1, ten_phu_huynh, dia_chi"
      )
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("ghi_danh")
      .select("id, hoc_sinh_id, trang_thai")
      .is("deleted_at", null)
      .is("ngay_ket_thuc", null),
    supabase.from("user_chi_nhanh").select("chi_nhanh_id").eq("user_id", user.id),
    supabase.from("chi_nhanh").select("id, ten").is("deleted_at", null).order("ten"),
  ]);

  const isActive = profile?.trang_thai === "active";
  const isMasterAdmin = isActive && profile?.vai_tro === "master_admin";
  const isAdminTs = isActive && profile?.vai_tro === "admin_ts";
  const isQuanLyChiNhanh = isActive && profile?.vai_tro === "quan_ly_chi_nhanh";
  const isAllowed = isMasterAdmin || isAdminTs || isQuanLyChiNhanh;
  const canDelete = isMasterAdmin;

  const myChiNhanhIds = new Set((userChiNhanhList ?? []).map((uc) => uc.chi_nhanh_id));
  const lopIdsTrongPhamVi = new Set(
    (lopList ?? []).filter((l) => l.chi_nhanh_id != null && myChiNhanhIds.has(l.chi_nhanh_id)).map((l) => l.id)
  );

  // Danh sách lớp cho dropdown (tạo học sinh / chuyển lớp): quan_ly_chi_nhanh
  // chỉ thấy lớp trong phạm vi chi nhánh mình — RLS chỉ chặn ghi, không chặn
  // đọc (lop.p_read cho phép đọc mọi lớp), nên phải lọc ở tầng ứng dụng.
  const lopListChoForm = isQuanLyChiNhanh
    ? (lopList ?? []).filter((l) => lopIdsTrongPhamVi.has(l.id))
    : (lopList ?? []);

  const chiNhanhListChoForm = isQuanLyChiNhanh
    ? (chiNhanhList ?? []).filter((c) => myChiNhanhIds.has(c.id))
    : (chiNhanhList ?? []);

  const lopMap = new Map((lopList ?? []).map((l) => [l.id, l]));
  const ghiDanhMoMap = new Map((ghiDanhMoList ?? []).map((gd) => [gd.hoc_sinh_id, gd]));
  const hocSinhRows: HocSinhRow[] = (hocSinhList ?? []).map((hs) => {
    const lop = hs.lop_hien_tai_id != null ? lopMap.get(hs.lop_hien_tai_id) : null;
    const ghiDanhMo = ghiDanhMoMap.get(hs.id);
    return {
      id: hs.id,
      stt: hs.stt,
      ma_hoc_sinh: hs.ma_hoc_sinh,
      ho_ten: hs.ho_ten,
      sdt_phu_huynh: hs.sdt_phu_huynh,
      lop_hien_tai_id: hs.lop_hien_tai_id,
      lop_hien_tai: lop ? (lop.ten_lop ? `${lop.ma_lop} — ${lop.ten_lop}` : lop.ma_lop) : null,
      tinh_trang_dang_ky: chuanHoaMang(hs.tinh_trang_dang_ky),
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
      ghi_danh_id: ghiDanhMo?.id ?? null,
      trang_thai_ghi_danh: ghiDanhMo?.trang_thai ?? null,
      coTheSua:
        isMasterAdmin ||
        isAdminTs ||
        (isQuanLyChiNhanh && hs.lop_hien_tai_id != null && lopIdsTrongPhamVi.has(hs.lop_hien_tai_id)),
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
          <HocSinhForm lopList={lopListChoForm} />
        ) : (
          <p className={styles.noticeBox}>
            Chỉ Master Admin, Tuyển sinh (admin_ts) hoặc Quản lý chi nhánh được tạo ID học sinh. Tài khoản của bạn:{" "}
            {isActive ? `vai trò "${profile?.vai_tro ?? "chưa gán"}"` : "tài khoản đang bị khoá (disabled)"}.
          </p>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Tra cứu &amp; xuất danh sách học sinh ({hocSinhRows.length})</h2>
        {hocSinhRows.length > 0 ? (
          <HocSinhTable
            list={hocSinhRows}
            lopList={lopListChoForm}
            chiNhanhList={chiNhanhListChoForm}
            canDelete={canDelete}
          />
        ) : (
          <p className={styles.empty}>Chưa có học sinh nào.</p>
        )}
      </section>
    </main>
  );
}

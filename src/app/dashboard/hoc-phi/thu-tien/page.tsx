import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PhieuThuForm, { type HopDongDangHoatDong } from "@/components/PhieuThuForm";
import PhieuThuTable, { type PhieuThuRow } from "@/components/PhieuThuTable";
import styles from "../hoc-phi.module.css";

const VAI_TRO_DOC = ["master_admin", "ke_toan", "thu_ngan", "admin_ts"];
const VAI_TRO_GHI = ["master_admin", "ke_toan", "thu_ngan", "admin_ts"];

export default async function ThuTienPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: taiChinhList },
    { data: ghiDanhList },
    { data: hocSinhList },
    { data: lopList },
    { data: chuongTrinhList },
    { data: phieuThuList },
    { data: tepDinhKemList },
  ] = await Promise.all([
    supabase.from("users").select("vai_tro, trang_thai, ho_ten").eq("id", user.id).single(),
    supabase.from("v_tai_chinh_hop_dong").select("hop_dong_id, ghi_danh_id, chuong_trinh_ma, con_phai_thu, trang_thai"),
    supabase.from("ghi_danh").select("id, hoc_sinh_id").is("deleted_at", null),
    supabase.from("hoc_sinh").select("id, ho_ten, ma_hoc_sinh").is("deleted_at", null),
    supabase.from("lop").select("id, chuong_trinh_ma").is("deleted_at", null),
    supabase.from("chuong_trinh").select("ma, ten").is("deleted_at", null),
    supabase
      .from("phieu_thu")
      .select("id, ma_phieu_thu, hop_dong_id, so_tien, ngay_thu, hinh_thuc, la_phieu_dao, ghi_chu, nguoi_thu_ten, tep_dinh_kem_id, tep_dinh_kem_id_2")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("tep_dinh_kem").select("id, ten_tep, duong_dan_luu_tru"),
  ]);

  const isActive = profile?.trang_thai === "active";
  const vaiTro = profile?.vai_tro ?? "";
  const canRead = isActive && VAI_TRO_DOC.includes(vaiTro);
  const canEdit = isActive && VAI_TRO_GHI.includes(vaiTro);
  const nguoiDungHienTai = profile?.ho_ten?.trim() || user.email || "?";

  const hocSinhMap = new Map((hocSinhList ?? []).map((h) => [h.id, h]));
  const ghiDanhMap = new Map((ghiDanhList ?? []).map((g) => [g.id, g]));
  const chuongTrinhMap = new Map((chuongTrinhList ?? []).map((c) => [c.ma, c.ten]));
  const tepDinhKemMap = new Map((tepDinhKemList ?? []).map((t) => [t.id, t]));

  const hopDongDangHoatDong: HopDongDangHoatDong[] = (taiChinhList ?? [])
    .filter((tc) => tc.trang_thai === "dang_hoat_dong")
    .map((tc) => {
      const gd = ghiDanhMap.get(tc.ghi_danh_id);
      const hs = gd ? hocSinhMap.get(gd.hoc_sinh_id) : undefined;
      return {
        id: tc.hop_dong_id,
        ho_ten: hs?.ho_ten ?? "?",
        ma_hoc_sinh: hs?.ma_hoc_sinh ?? "?",
        chuong_trinh_ten: chuongTrinhMap.get(tc.chuong_trinh_ma) ?? "?",
        con_phai_thu: tc.con_phai_thu,
      };
    })
    .sort((a, b) => a.ho_ten.localeCompare(b.ho_ten, "vi"));

  const hopDongHocSinhMap = new Map(hopDongDangHoatDong.map((h) => [h.id, h]));

  const phieuThuRows: PhieuThuRow[] = (phieuThuList ?? []).map((pt) => {
    const info = hopDongHocSinhMap.get(pt.hop_dong_id);
    const bienLai = [pt.tep_dinh_kem_id, pt.tep_dinh_kem_id_2]
      .filter((id): id is number => id != null)
      .map((id) => tepDinhKemMap.get(id))
      .filter((t): t is { id: number; ten_tep: string; duong_dan_luu_tru: string } => t != null)
      .map((t) => ({ ten_tep: t.ten_tep, duong_dan_luu_tru: t.duong_dan_luu_tru }));
    return {
      id: pt.id,
      ma_phieu_thu: pt.ma_phieu_thu,
      ho_ten: info?.ho_ten ?? "?",
      ma_hoc_sinh: info?.ma_hoc_sinh ?? "?",
      so_tien: pt.so_tien,
      ngay_thu: pt.ngay_thu,
      hinh_thuc: pt.hinh_thuc,
      la_phieu_dao: pt.la_phieu_dao,
      ghi_chu: pt.ghi_chu,
      nguoi_thu_ten: pt.nguoi_thu_ten ?? "?",
      bien_lai: bienLai,
    };
  });

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Thu tiền</h1>
        <Link href="/dashboard/hoc-phi" className={styles.backLink}>← Về tổng quan học phí</Link>
      </div>

      <nav className={styles.subNav}>
        <Link href="/dashboard/hoc-phi" className={styles.subNavLink}>Tổng quan</Link>
        <Link href="/dashboard/hoc-phi/goi" className={styles.subNavLink}>Gói học phí</Link>
        <Link href="/dashboard/hoc-phi/hop-dong" className={styles.subNavLink}>Hợp đồng</Link>
        <Link href="/dashboard/hoc-phi/thu-tien" className={`${styles.subNavLink} ${styles.subNavLinkActive}`}>Thu tiền</Link>
      </nav>

      {!canRead ? (
        <section className={styles.card}>
          <p className={styles.noticeBox}>
            Bạn không có quyền xem trang này. Tài khoản của bạn:{" "}
            {isActive ? `vai trò "${vaiTro || "chưa gán"}"` : "tài khoản đang bị khoá (disabled)"}.
          </p>
        </section>
      ) : (
        <>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Ghi phiếu thu</h2>
            {canEdit ? (
              <PhieuThuForm hopDongList={hopDongDangHoatDong} nguoiDungHienTai={nguoiDungHienTai} />
            ) : (
              <p className={styles.noticeBox}>Bạn không có quyền ghi phiếu thu.</p>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Lịch sử phiếu thu ({phieuThuRows.length})</h2>
            {phieuThuRows.length > 0 ? (
              <PhieuThuTable list={phieuThuRows} />
            ) : (
              <p className={styles.empty}>Chưa có phiếu thu nào.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}

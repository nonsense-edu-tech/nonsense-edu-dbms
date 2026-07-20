import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HocPhiDashboardClient, {
  type HopDongTaiChinh,
  type PhieuThuTaiChinh,
  type HopDongQuaHan,
} from "@/components/HocPhiDashboardClient";
import styles from "./hoc-phi.module.css";

const VAI_TRO_DOC = ["master_admin", "ke_toan", "thu_ngan", "admin_ts"];

export default async function HocPhiDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: chuongTrinhList },
    { data: hopDongList },
    { data: ghiDanhList },
    { data: lopList },
    { data: phieuThuList },
    { data: quaHanRaw },
  ] = await Promise.all([
    supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single(),
    supabase.from("chuong_trinh").select("ma, ten").is("deleted_at", null).order("ma"),
    supabase
      .from("hop_dong_hoc_phi")
      .select("id, ghi_danh_id, doanh_thu_thuan, trang_thai, kich_hoat_luc, created_at")
      .is("deleted_at", null),
    supabase.from("ghi_danh").select("id, lop_id").is("deleted_at", null),
    supabase.from("lop").select("id, chuong_trinh_ma").is("deleted_at", null),
    supabase.from("phieu_thu").select("id, hop_dong_id, so_tien, ngay_thu, la_phieu_dao"),
    supabase.from("v_hop_dong_qua_han").select("hop_dong_id, ho_ten, ma_hoc_sinh, ten_lop, so_tien_cham, so_ngay_tre_nhat"),
  ]);

  const isActive = profile?.trang_thai === "active";
  const vaiTro = profile?.vai_tro ?? "";
  const canRead = isActive && VAI_TRO_DOC.includes(vaiTro);

  const lopChuongTrinhMap = new Map((lopList ?? []).map((l) => [l.id, l.chuong_trinh_ma]));
  const ghiDanhLopMap = new Map((ghiDanhList ?? []).map((g) => [g.id, g.lop_id]));
  const hopDongGhiDanhMap = new Map((hopDongList ?? []).map((h) => [h.id, h.ghi_danh_id]));

  function chuongTrinhCuaGhiDanh(ghiDanhId: number): string {
    const lopId = ghiDanhLopMap.get(ghiDanhId);
    return lopId != null ? lopChuongTrinhMap.get(lopId) ?? "" : "";
  }

  const hopDong: HopDongTaiChinh[] = (hopDongList ?? []).map((h) => ({
    id: h.id,
    chuong_trinh_ma: chuongTrinhCuaGhiDanh(h.ghi_danh_id),
    doanh_thu_thuan: h.doanh_thu_thuan,
    trang_thai: h.trang_thai,
    ngay_moc: (h.kich_hoat_luc ?? h.created_at).slice(0, 10),
  }));

  const phieuThu: PhieuThuTaiChinh[] = (phieuThuList ?? []).map((p) => {
    const ghiDanhId = hopDongGhiDanhMap.get(p.hop_dong_id);
    return {
      hop_dong_id: p.hop_dong_id,
      chuong_trinh_ma: ghiDanhId != null ? chuongTrinhCuaGhiDanh(ghiDanhId) : "",
      so_tien: p.so_tien,
      ngay_thu: p.ngay_thu,
      la_phieu_dao: p.la_phieu_dao,
    };
  });

  const quaHan: HopDongQuaHan[] = (quaHanRaw ?? []).map((q) => {
    const ghiDanhId = hopDongGhiDanhMap.get(q.hop_dong_id);
    return {
      hop_dong_id: q.hop_dong_id,
      ho_ten: q.ho_ten,
      ma_hoc_sinh: q.ma_hoc_sinh,
      ten_lop: q.ten_lop,
      chuong_trinh_ma: ghiDanhId != null ? chuongTrinhCuaGhiDanh(ghiDanhId) : "",
      so_tien_cham: q.so_tien_cham,
      so_ngay_tre_nhat: q.so_ngay_tre_nhat,
    };
  });

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Học phí / Tài chính</h1>
        <Link href="/dashboard" className={styles.backLink}>← Về dashboard</Link>
      </div>

      <nav className={styles.subNav}>
        <Link href="/dashboard/hoc-phi" className={`${styles.subNavLink} ${styles.subNavLinkActive}`}>Tổng quan</Link>
        <Link href="/dashboard/hoc-phi/goi" className={styles.subNavLink}>Gói học phí</Link>
        <Link href="/dashboard/hoc-phi/hop-dong" className={styles.subNavLink}>Hợp đồng</Link>
        <Link href="/dashboard/hoc-phi/thu-tien" className={styles.subNavLink}>Thu tiền</Link>
      </nav>

      {!canRead ? (
        <section className={styles.card}>
          <p className={styles.noticeBox}>
            Bạn không có quyền xem trang này. Tài khoản của bạn:{" "}
            {isActive ? `vai trò "${vaiTro || "chưa gán"}"` : "tài khoản đang bị khoá (disabled)"}.
          </p>
        </section>
      ) : (
        <HocPhiDashboardClient
          chuongTrinhList={chuongTrinhList ?? []}
          hopDong={hopDong}
          phieuThu={phieuThu}
          quaHan={quaHan}
        />
      )}
    </main>
  );
}

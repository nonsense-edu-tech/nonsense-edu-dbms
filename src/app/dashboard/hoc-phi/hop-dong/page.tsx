import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HopDongForm, { type GhiDanhOption, type GoiOption } from "@/components/HopDongForm";
import HopDongTable, { type HopDongRow } from "@/components/HopDongTable";
import styles from "../hoc-phi.module.css";

const VAI_TRO_DOC = ["master_admin", "ke_toan", "thu_ngan", "admin_ts"];
const VAI_TRO_GHI = ["master_admin", "ke_toan", "admin_ts"];

export default async function HopDongPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: chuongTrinhList },
    { data: ghiDanhList },
    { data: hocSinhList },
    { data: lopList },
    { data: hopDongList },
    { data: goiList },
    { data: taiChinhList },
  ] = await Promise.all([
    supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single(),
    supabase.from("chuong_trinh").select("ma, ten").is("deleted_at", null).order("ma"),
    supabase.from("ghi_danh").select("id, hoc_sinh_id, lop_id, trang_thai").is("deleted_at", null),
    supabase.from("hoc_sinh").select("id, ho_ten, ma_hoc_sinh").is("deleted_at", null),
    supabase.from("lop").select("id, ten_lop, chuong_trinh_ma").is("deleted_at", null),
    supabase
      .from("hop_dong_hoc_phi")
      .select("id, ghi_danh_id, goi_hoc_phi_id, gia_niem_yet, so_tien_giam, doanh_thu_thuan, trang_thai")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("goi_hoc_phi").select("id, ten, chuong_trinh_ma, gia_niem_yet, dang_ap_dung, hieu_luc_den").is("deleted_at", null),
    supabase.from("v_tai_chinh_hop_dong").select("hop_dong_id, thuc_thu"),
  ]);

  const isActive = profile?.trang_thai === "active";
  const vaiTro = profile?.vai_tro ?? "";
  const canRead = isActive && VAI_TRO_DOC.includes(vaiTro);
  const canEdit = isActive && VAI_TRO_GHI.includes(vaiTro);

  const chuongTrinhMap = new Map((chuongTrinhList ?? []).map((c) => [c.ma, c.ten]));
  const hocSinhMap = new Map((hocSinhList ?? []).map((h) => [h.id, h]));
  const lopMap = new Map((lopList ?? []).map((l) => [l.id, l]));
  const goiMap = new Map((goiList ?? []).map((g) => [g.id, g]));
  const thucThuMap = new Map((taiChinhList ?? []).map((tc) => [tc.hop_dong_id, tc.thuc_thu]));

  const usedGhiDanhIds = new Set((hopDongList ?? []).map((hd) => hd.ghi_danh_id));

  const ghiDanhKhaDung: GhiDanhOption[] = (ghiDanhList ?? [])
    .filter((gd) => gd.trang_thai === "dang_hoc" && !usedGhiDanhIds.has(gd.id))
    .map((gd) => {
      const hs = hocSinhMap.get(gd.hoc_sinh_id);
      const lop = lopMap.get(gd.lop_id);
      return {
        id: gd.id,
        ho_ten: hs?.ho_ten ?? "?",
        ma_hoc_sinh: hs?.ma_hoc_sinh ?? "?",
        ten_lop: lop?.ten_lop ?? null,
        chuong_trinh_ma: lop?.chuong_trinh_ma ?? "",
        chuong_trinh_ten: chuongTrinhMap.get(lop?.chuong_trinh_ma ?? "") ?? "?",
      };
    })
    .sort((a, b) => a.ho_ten.localeCompare(b.ho_ten, "vi"));

  const goiKhaDung: GoiOption[] = (goiList ?? [])
    .filter((g) => g.dang_ap_dung && g.hieu_luc_den === null)
    .map((g) => ({ id: g.id, ten: g.ten, chuong_trinh_ma: g.chuong_trinh_ma, gia_niem_yet: g.gia_niem_yet }));

  const hopDongRows: HopDongRow[] = (hopDongList ?? []).map((hd) => {
    const gd = (ghiDanhList ?? []).find((g) => g.id === hd.ghi_danh_id);
    const hs = gd ? hocSinhMap.get(gd.hoc_sinh_id) : undefined;
    const lop = gd ? lopMap.get(gd.lop_id) : undefined;
    const goi = goiMap.get(hd.goi_hoc_phi_id);
    return {
      id: hd.id,
      ho_ten: hs?.ho_ten ?? "?",
      ma_hoc_sinh: hs?.ma_hoc_sinh ?? "?",
      chuong_trinh_ten: chuongTrinhMap.get(lop?.chuong_trinh_ma ?? "") ?? "?",
      goi_ten: goi?.ten ?? "?",
      gia_niem_yet: hd.gia_niem_yet,
      so_tien_giam: hd.so_tien_giam,
      doanh_thu_thuan: hd.doanh_thu_thuan,
      thuc_thu: thucThuMap.get(hd.id) ?? 0,
      trang_thai: hd.trang_thai,
    };
  });

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Hợp đồng học phí</h1>
        <Link href="/dashboard/hoc-phi" className={styles.backLink}>← Về tổng quan học phí</Link>
      </div>

      <nav className={styles.subNav}>
        <Link href="/dashboard/hoc-phi" className={styles.subNavLink}>Tổng quan</Link>
        <Link href="/dashboard/hoc-phi/goi" className={styles.subNavLink}>Gói học phí</Link>
        <Link href="/dashboard/hoc-phi/hop-dong" className={`${styles.subNavLink} ${styles.subNavLinkActive}`}>Hợp đồng</Link>
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
        <>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Tạo hợp đồng mới</h2>
            {canEdit ? (
              <HopDongForm ghiDanhList={ghiDanhKhaDung} goiList={goiKhaDung} />
            ) : (
              <p className={styles.noticeBox}>Chỉ Master Admin, Kế toán hoặc Admin Tuyển sinh được tạo hợp đồng.</p>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Danh sách hợp đồng ({hopDongRows.length})</h2>
            {hopDongRows.length > 0 ? (
              <HopDongTable list={hopDongRows} canEdit={canEdit} />
            ) : (
              <p className={styles.empty}>Chưa có hợp đồng nào.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}

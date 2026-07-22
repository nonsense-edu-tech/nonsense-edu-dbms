import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BuoiHocForm, { type LopOption } from "@/components/BuoiHocForm";
import BuoiHocTable, { type BuoiHocRow } from "@/components/BuoiHocTable";
import styles from "../van-hanh.module.css";

export default async function BuoiHocPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single();

  const isActive = profile?.trang_thai === "active";
  const vaiTro = profile?.vai_tro ?? "";
  const isMasterAdmin = isActive && vaiTro === "master_admin";
  const isAdminTs = isActive && vaiTro === "admin_ts";
  const isQuanLyChiNhanh = isActive && vaiTro === "quan_ly_chi_nhanh";
  const isGv = isActive && vaiTro === "gv";
  const isKeToan = isActive && vaiTro === "ke_toan";
  const canSeeCost = isMasterAdmin || isKeToan;
  const canCreate = isMasterAdmin || isAdminTs || isQuanLyChiNhanh || isGv;
  const canReassignGv = isMasterAdmin || isAdminTs || isQuanLyChiNhanh;

  const [
    { data: lopList },
    { data: monHocList },
    { data: phongHocList },
    { data: chiNhanhList },
    { data: lichList },
    { data: chiPhiList },
    { data: gvList },
    { data: myScope },
  ] = await Promise.all([
    supabase.from("lop").select("id, ma_lop, ten_lop, cap_hoc_ma, chi_nhanh_id").is("deleted_at", null),
    supabase.from("mon_hoc").select("ma, cap_hoc_ma, ten").is("deleted_at", null).order("ma"),
    supabase.from("phong_hoc").select("id, ten, chi_nhanh_id").is("deleted_at", null).order("ten"),
    supabase.from("chi_nhanh").select("id, ma, ten").is("deleted_at", null),
    supabase
      .from("buoi_hoc_lich")
      .select("id, lop_id, mon_hoc_ma, gv_id, phong_hoc_id, ngay, gio_bat_dau, gio_ket_thuc, trang_thai")
      .is("deleted_at", null)
      .order("ngay", { ascending: false })
      .limit(200),
    canSeeCost
      ? supabase.from("buoi_hoc_chi_phi").select("id, thu_lao_gv, chi_phi_phong").is("deleted_at", null)
      : Promise.resolve({ data: [] as { id: number; thu_lao_gv: number | null; chi_phi_phong: number | null }[] }),
    supabase.rpc("danh_sach_gv") as unknown as Promise<{ data: { id: string; ho_ten: string }[] | null }>,
    isQuanLyChiNhanh
      ? supabase.from("user_chi_nhanh").select("chi_nhanh_id").eq("user_id", user.id)
      : Promise.resolve({ data: [] as { chi_nhanh_id: number }[] }),
  ]);

  const lopMap = new Map((lopList ?? []).map((l) => [l.id, l]));
  const monHocMap = new Map((monHocList ?? []).map((m) => [`${m.cap_hoc_ma}-${m.ma}`, m.ten]));
  const phongHocMap = new Map((phongHocList ?? []).map((p) => [p.id, p.ten]));
  const gvMap = new Map((gvList ?? []).map((g: { id: string; ho_ten: string }) => [g.id, g.ho_ten]));
  const chiPhiMap = new Map((chiPhiList ?? []).map((c) => [c.id, c]));

  const myScopeIds = (myScope ?? []).map((s) => s.chi_nhanh_id);
  const lopTrongPhamViQlcn = new Set(
    (lopList ?? []).filter((l) => l.chi_nhanh_id != null && myScopeIds.includes(l.chi_nhanh_id)).map((l) => l.id)
  );

  function lopNhan(lopId: number): string {
    const lop = lopMap.get(lopId);
    if (!lop) return String(lopId);
    return lop.ten_lop ? `${lop.ma_lop} - ${lop.ten_lop}` : lop.ma_lop;
  }

  const buoiHocRows: BuoiHocRow[] = (lichList ?? []).map((b) => {
    const lop = lopMap.get(b.lop_id);
    const chiPhi = chiPhiMap.get(b.id);
    return {
      id: b.id,
      lop_id: b.lop_id,
      lop_nhan: lopNhan(b.lop_id),
      mon_hoc_ma: b.mon_hoc_ma,
      mon_hoc_ten: monHocMap.get(`${lop?.cap_hoc_ma}-${b.mon_hoc_ma}`) ?? String(b.mon_hoc_ma),
      cap_hoc_ma: lop?.cap_hoc_ma ?? 0,
      gv_id: b.gv_id,
      gv_ten: b.gv_id ? gvMap.get(b.gv_id) ?? "?" : null,
      phong_hoc_id: b.phong_hoc_id,
      phong_hoc_ten: b.phong_hoc_id ? phongHocMap.get(b.phong_hoc_id) ?? "?" : null,
      ngay: b.ngay,
      gio_bat_dau: b.gio_bat_dau,
      gio_ket_thuc: b.gio_ket_thuc,
      trang_thai: b.trang_thai,
      thu_lao_gv: chiPhi?.thu_lao_gv ?? null,
      chi_phi_phong: chiPhi?.chi_phi_phong ?? null,
    };
  });

  const editableIds: number[] | "all" =
    isMasterAdmin || isAdminTs
      ? "all"
      : isQuanLyChiNhanh
        ? buoiHocRows.filter((b) => lopTrongPhamViQlcn.has(b.lop_id)).map((b) => b.id)
        : isGv
          ? buoiHocRows.filter((b) => b.gv_id === user.id).map((b) => b.id)
          : [];

  const lopOptionsChoForm: LopOption[] = (
    isMasterAdmin || isAdminTs || isGv
      ? lopList ?? []
      : isQuanLyChiNhanh
        ? (lopList ?? []).filter((l) => l.chi_nhanh_id != null && myScopeIds.includes(l.chi_nhanh_id))
        : []
  ).map((l) => ({ id: l.id, nhan: l.ten_lop ? `${l.ma_lop} - ${l.ten_lop}` : l.ma_lop, cap_hoc_ma: l.cap_hoc_ma }));

  const monHocOptions = (monHocList ?? []).map((m) => ({ ma: m.ma, cap_hoc_ma: m.cap_hoc_ma, ten: m.ten }));
  const gvOptions = (gvList ?? []) as { id: string; ho_ten: string }[];
  const phongHocOptions = (phongHocList ?? []).map((p) => ({ id: p.id, ten: p.ten }));

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Buổi học</h1>
        <Link href="/dashboard/van-hanh" className={styles.backLink}>← Về vận hành</Link>
      </div>

      <nav className={styles.subNav}>
        <Link href="/dashboard/van-hanh" className={styles.subNavLink}>Tổng quan</Link>
        <Link href="/dashboard/van-hanh/loai-phong" className={styles.subNavLink}>Loại phòng</Link>
        <Link href="/dashboard/van-hanh/phong-hoc" className={styles.subNavLink}>Phòng học</Link>
        <Link href="/dashboard/van-hanh/chuong-trinh-mon-hoc" className={styles.subNavLink}>Chương trình - Môn học</Link>
        <Link href="/dashboard/van-hanh/buoi-hoc" className={`${styles.subNavLink} ${styles.subNavLinkActive}`}>Buổi học</Link>
      </nav>

      {!isActive ? (
        <section className={styles.card}>
          <p className={styles.noticeBox}>Tài khoản của bạn đang bị khoá (disabled).</p>
        </section>
      ) : (
        <>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Tạo buổi học mới</h2>
            {canCreate ? (
              <BuoiHocForm
                lopList={lopOptionsChoForm}
                monHocList={monHocOptions}
                gvList={gvOptions}
                phongHocList={phongHocOptions}
                fixedGvId={isGv ? user.id : undefined}
              />
            ) : (
              <p className={styles.noticeBox}>
                Vai trò của bạn ("{vaiTro || "chưa gán"}") không được tạo buổi học.
              </p>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Danh sách buổi học ({buoiHocRows.length})</h2>
            {!canSeeCost && (
              <p className={styles.empty} style={{ marginBottom: 12 }}>
                Cột chi phí (thù lao GV, chi phí phòng) chỉ Master Admin/Kế toán xem được.
              </p>
            )}
            {buoiHocRows.length > 0 ? (
              <BuoiHocTable
                list={buoiHocRows}
                editableIds={editableIds}
                deletableIds={editableIds}
                canReassignGv={canReassignGv}
                canSeeCost={canSeeCost}
                monHocList={monHocOptions}
                gvList={gvOptions}
                phongHocList={phongHocOptions}
              />
            ) : (
              <p className={styles.empty}>Chưa có buổi học nào.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}

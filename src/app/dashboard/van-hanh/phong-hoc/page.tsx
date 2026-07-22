import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PhongHocForm from "@/components/PhongHocForm";
import PhongHocTable, { type PhongHocRow } from "@/components/PhongHocTable";
import styles from "../van-hanh.module.css";

export default async function PhongHocPage() {
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
  const canReadLoaiPhong = isActive && (vaiTro === "master_admin" || vaiTro === "ke_toan");

  const [{ data: phongHocList }, { data: chiNhanhList }, { data: loaiPhongList }, { data: myScope }] =
    await Promise.all([
      supabase.from("phong_hoc").select("id, ten, chi_nhanh_id, loai_phong_id").is("deleted_at", null).order("ten"),
      supabase.from("chi_nhanh").select("id, ma, ten").is("deleted_at", null).order("ma"),
      canReadLoaiPhong
        ? supabase.from("loai_phong").select("id, ten").is("deleted_at", null).order("ten")
        : Promise.resolve({ data: [] as { id: number; ten: string }[] }),
      isQuanLyChiNhanh
        ? supabase.from("user_chi_nhanh").select("chi_nhanh_id").eq("user_id", user.id)
        : Promise.resolve({ data: [] as { chi_nhanh_id: number }[] }),
    ]);

  const chiNhanhMap = new Map((chiNhanhList ?? []).map((c) => [c.id, c.ten]));
  const loaiPhongMap = new Map((loaiPhongList ?? []).map((l) => [l.id, l.ten]));

  const phongHocRows: PhongHocRow[] = (phongHocList ?? []).map((p) => ({
    id: p.id,
    ten: p.ten,
    chi_nhanh_id: p.chi_nhanh_id,
    chi_nhanh_ten: chiNhanhMap.get(p.chi_nhanh_id) ?? String(p.chi_nhanh_id),
    loai_phong_id: p.loai_phong_id,
    loai_phong_ten: canReadLoaiPhong ? loaiPhongMap.get(p.loai_phong_id) ?? null : null,
  }));

  const myScopeIds = (myScope ?? []).map((s) => s.chi_nhanh_id);

  const editableChiNhanhIds: number[] | "all" | "none" =
    isMasterAdmin || isAdminTs ? "all" : isQuanLyChiNhanh ? myScopeIds : "none";
  const deletableChiNhanhIds = editableChiNhanhIds;

  const chiNhanhOptions = (chiNhanhList ?? []).map((c) => ({ ma: c.id, ten: c.ten }));
  const loaiPhongOptions = (loaiPhongList ?? []).map((l) => ({ ma: l.id, ten: l.ten }));

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Phòng học</h1>
        <Link href="/dashboard/van-hanh" className={styles.backLink}>← Về vận hành</Link>
      </div>

      <nav className={styles.subNav}>
        <Link href="/dashboard/van-hanh" className={styles.subNavLink}>Tổng quan</Link>
        <Link href="/dashboard/van-hanh/loai-phong" className={styles.subNavLink}>Loại phòng</Link>
        <Link href="/dashboard/van-hanh/phong-hoc" className={`${styles.subNavLink} ${styles.subNavLinkActive}`}>Phòng học</Link>
        <Link href="/dashboard/van-hanh/chuong-trinh-mon-hoc" className={styles.subNavLink}>Chương trình - Môn học</Link>
        <Link href="/dashboard/van-hanh/buoi-hoc" className={styles.subNavLink}>Buổi học</Link>
      </nav>

      {!isActive ? (
        <section className={styles.card}>
          <p className={styles.noticeBox}>Tài khoản của bạn đang bị khoá (disabled).</p>
        </section>
      ) : (
        <>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Tạo phòng học mới</h2>
            {isMasterAdmin ? (
              <PhongHocForm chiNhanhList={chiNhanhOptions} loaiPhongList={loaiPhongOptions} />
            ) : (
              <p className={styles.noticeBox}>
                Chỉ Master Admin tạo được phòng mới (cần chọn loại phòng — dữ liệu chi phí ẩn với vai trò khác).
              </p>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Danh sách phòng học ({phongHocRows.length})</h2>
            {phongHocRows.length > 0 ? (
              <PhongHocTable
                list={phongHocRows}
                isMasterAdmin={isMasterAdmin}
                editableChiNhanhIds={editableChiNhanhIds}
                deletableChiNhanhIds={deletableChiNhanhIds}
                showLoaiPhongColumn={canReadLoaiPhong}
                chiNhanhList={chiNhanhOptions}
                loaiPhongList={loaiPhongOptions}
              />
            ) : (
              <p className={styles.empty}>Chưa có phòng học nào.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}

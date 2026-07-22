import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoaiPhongForm from "@/components/LoaiPhongForm";
import LoaiPhongTable, { type LoaiPhongRow } from "@/components/LoaiPhongTable";
import styles from "../van-hanh.module.css";

const VAI_TRO_DOC = ["master_admin", "ke_toan"];

export default async function LoaiPhongPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: loaiPhongList }] = await Promise.all([
    supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single(),
    supabase
      .from("loai_phong")
      .select("id, ten, don_gia_thue_gio, don_gia_dien_nuoc_gio, don_gia_khau_hao_gio, hieu_luc_tu, hieu_luc_den")
      .is("deleted_at", null)
      .order("ten"),
  ]);

  const isActive = profile?.trang_thai === "active";
  const vaiTro = profile?.vai_tro ?? "";
  const canRead = isActive && VAI_TRO_DOC.includes(vaiTro);
  const isMasterAdmin = isActive && vaiTro === "master_admin";

  const loaiPhongRows: LoaiPhongRow[] = canRead ? loaiPhongList ?? [] : [];

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Loại phòng</h1>
        <Link href="/dashboard/van-hanh" className={styles.backLink}>← Về vận hành</Link>
      </div>

      <nav className={styles.subNav}>
        <Link href="/dashboard/van-hanh" className={styles.subNavLink}>Tổng quan</Link>
        <Link href="/dashboard/van-hanh/loai-phong" className={`${styles.subNavLink} ${styles.subNavLinkActive}`}>Loại phòng</Link>
        <Link href="/dashboard/van-hanh/phong-hoc" className={styles.subNavLink}>Phòng học</Link>
        <Link href="/dashboard/van-hanh/chuong-trinh-mon-hoc" className={styles.subNavLink}>Chương trình - Môn học</Link>
        <Link href="/dashboard/van-hanh/buoi-hoc" className={styles.subNavLink}>Buổi học</Link>
      </nav>

      {!canRead ? (
        <section className={styles.card}>
          <p className={styles.noticeBox}>
            Đây là dữ liệu chi phí — chỉ Master Admin/Kế toán xem được. Tài khoản của bạn:{" "}
            {isActive ? `vai trò "${vaiTro || "chưa gán"}"` : "tài khoản đang bị khoá (disabled)"}.
          </p>
        </section>
      ) : (
        <>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Tạo loại phòng mới</h2>
            {isMasterAdmin ? (
              <LoaiPhongForm />
            ) : (
              <p className={styles.noticeBox}>Chỉ Master Admin được tạo/sửa loại phòng.</p>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Danh sách loại phòng ({loaiPhongRows.length})</h2>
            {loaiPhongRows.length > 0 ? (
              <LoaiPhongTable list={loaiPhongRows} canEdit={isMasterAdmin} canDelete={isMasterAdmin} />
            ) : (
              <p className={styles.empty}>Chưa có loại phòng nào.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}

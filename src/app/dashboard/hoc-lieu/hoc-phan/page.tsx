import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HocPhanForm from "@/components/HocPhanForm";
import HocPhanTable, { type HocPhanRow } from "@/components/HocPhanTable";
import styles from "../hoc-lieu.module.css";

const VAI_TRO_QUAN_LY = ["master_admin", "admin_ht", "truong_bm"];

export default async function HocPhanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: hocPhanList }, { data: monHocList }, { data: capHocList }] = await Promise.all([
    supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single(),
    supabase
      .from("hoc_phan")
      .select("id, mon_hoc_id, ma, ten, mo_ta")
      .is("deleted_at", null)
      .order("ma"),
    supabase.from("mon_hoc").select("id, ma, cap_hoc_ma, ten").is("deleted_at", null).order("ten"),
    supabase.from("cap_hoc").select("ma, ten").is("deleted_at", null).order("ma"),
  ]);

  const isActive = profile?.trang_thai === "active";
  const vaiTro = profile?.vai_tro ?? "";
  const canWrite = isActive && VAI_TRO_QUAN_LY.includes(vaiTro);

  const capHocMap = new Map((capHocList ?? []).map((c) => [c.ma, c.ten]));
  const monHocMap = new Map((monHocList ?? []).map((m) => [m.id, m]));

  const monHocOptions = (monHocList ?? []).map((m) => ({
    id: m.id,
    ma: m.ma,
    cap_hoc_ma: m.cap_hoc_ma,
    ten: m.ten,
    cap_hoc_ten: capHocMap.get(m.cap_hoc_ma) ?? String(m.cap_hoc_ma),
  }));

  const hocPhanRows: HocPhanRow[] = (hocPhanList ?? []).map((hp) => {
    const mh = monHocMap.get(hp.mon_hoc_id);
    return {
      id: hp.id,
      mon_hoc_id: hp.mon_hoc_id,
      ma: hp.ma,
      ten: hp.ten,
      mo_ta: hp.mo_ta,
      mon_hoc_ten: mh?.ten ?? "—",
      cap_hoc_ten: mh ? capHocMap.get(mh.cap_hoc_ma) ?? String(mh.cap_hoc_ma) : "—",
    };
  });

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Học phần</h1>
        <Link href="/dashboard/hoc-lieu" className={styles.backLink}>← Về học liệu</Link>
      </div>

      <nav className={styles.subNav}>
        <Link href="/dashboard/hoc-lieu" className={styles.subNavLink}>Tổng quan</Link>
        <Link href="/dashboard/hoc-lieu/chu-de" className={styles.subNavLink}>Chủ đề</Link>
        <Link href="/dashboard/hoc-lieu/hoc-phan" className={`${styles.subNavLink} ${styles.subNavLinkActive}`}>Học phần</Link>
        <Link href="/dashboard/hoc-lieu/bai-hoc" className={styles.subNavLink}>Bài học</Link>
        <Link href="/dashboard/hoc-lieu/cau-hoi" className={styles.subNavLink}>Câu hỏi</Link>
      </nav>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Tạo học phần mới</h2>
        {canWrite ? (
          <HocPhanForm monHocList={monHocOptions} />
        ) : (
          <p className={styles.noticeBox}>
            Chỉ Master Admin, Admin học thuật hoặc Trưởng bộ môn được tạo/sửa/xoá học phần. Tài khoản của bạn:{" "}
            {isActive ? `vai trò "${vaiTro || "chưa gán"}"` : "tài khoản đang bị khoá (disabled)"}.
          </p>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Danh sách học phần ({hocPhanRows.length})</h2>
        {hocPhanRows.length > 0 ? (
          <HocPhanTable list={hocPhanRows} canWrite={canWrite} />
        ) : (
          <p className={styles.empty}>Chưa có học phần nào.</p>
        )}
      </section>
    </main>
  );
}

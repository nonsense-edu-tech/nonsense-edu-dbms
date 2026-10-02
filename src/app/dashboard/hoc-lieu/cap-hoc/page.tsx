import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PhanTrang from "@/components/PhanTrang";
import { duongDanTrangCuoi, parsePhanTrang, type RawSearchParams } from "@/lib/phan-trang";
import CapHocForm from "@/components/CapHocForm";
import CapHocTable, { type CapHocRow } from "@/components/CapHocTable";
import styles from "../hoc-lieu.module.css";

export default async function CapHocPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = await searchParams;
  const pp = parsePhanTrang(raw);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: list, count }] = await Promise.all([
    supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single(),
    supabase
      .from("cap_hoc")
      .select("id, ma, ten", { count: "exact" })
      .is("deleted_at", null)
      .order("ma")
      .order("id")
      .range(pp.from, pp.to),
  ]);

  const total = count ?? 0;
  const trangCuoi = duongDanTrangCuoi("/dashboard/hoc-lieu/cap-hoc", raw, pp, total);
  if (trangCuoi) redirect(trangCuoi);

  const isActive = profile?.trang_thai === "active";
  const vaiTro = profile?.vai_tro ?? "";
  const canWrite = isActive && vaiTro === "master_admin";

  const rows: CapHocRow[] = (list ?? []).map((c) => ({ id: c.id, ma: c.ma, ten: c.ten }));

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Cấp học</h1>
      </div>

      <nav className={styles.subNav}>
        <Link href="/dashboard/hoc-lieu" className={styles.subNavLink}>Tổng quan</Link>
        <Link href="/dashboard/hoc-lieu/cap-hoc" className={`${styles.subNavLink} ${styles.subNavLinkActive}`}>Cấp học</Link>
        <Link href="/dashboard/hoc-lieu/chuong-trinh" className={styles.subNavLink}>Chương trình</Link>
        <Link href="/dashboard/hoc-lieu/mon-hoc" className={styles.subNavLink}>Môn học</Link>
        <Link href="/dashboard/hoc-lieu/chuong-trinh-mon-hoc" className={styles.subNavLink}>Chương trình - Môn học</Link>
        <Link href="/dashboard/hoc-lieu/chu-de" className={styles.subNavLink}>Chủ đề</Link>
        <Link href="/dashboard/hoc-lieu/hoc-phan" className={styles.subNavLink}>Học phần</Link>
        <Link href="/dashboard/hoc-lieu/bai-hoc" className={styles.subNavLink}>Bài học</Link>
        <Link href="/dashboard/hoc-lieu/cau-hoi" className={styles.subNavLink}>Câu hỏi</Link>
      </nav>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Tạo cấp học mới</h2>
        {canWrite ? (
          <CapHocForm />
        ) : (
          <p className={styles.noticeBox}>
            Chỉ Master Admin được tạo/sửa/xoá cấp học. Tài khoản của bạn:{" "}
            {isActive ? `vai trò "${vaiTro || "chưa gán"}"` : "tài khoản đang bị khoá (disabled)"}.
          </p>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Danh sách cấp học ({total})</h2>
        {total > 0 ? (
          <>
            <CapHocTable list={rows} canWrite={canWrite} />
            <PhanTrang total={total} page={pp.page} size={pp.size} />
          </>
        ) : (
          <p className={styles.empty}>Chưa có cấp học nào.</p>
        )}
      </section>
    </main>
  );
}

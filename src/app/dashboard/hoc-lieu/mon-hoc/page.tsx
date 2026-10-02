import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PhanTrang from "@/components/PhanTrang";
import { duongDanTrangCuoi, parsePhanTrang, type RawSearchParams } from "@/lib/phan-trang";
import MonHocForm from "@/components/MonHocForm";
import MonHocTable, { type MonHocRow } from "@/components/MonHocTable";
import styles from "../hoc-lieu.module.css";

// RLS mon_hoc: master_admin, hoặc admin_ht trong phạm vi cấp học (can_manage_cap_hoc).
const VAI_TRO_QUAN_LY = ["master_admin", "admin_ht"];

export default async function MonHocPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = await searchParams;
  const pp = parsePhanTrang(raw);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: list, count }, { data: capHocList }] = await Promise.all([
    supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single(),
    supabase
      .from("mon_hoc")
      .select("id, ma, cap_hoc_ma, ten, mo_ta", { count: "exact" })
      .is("deleted_at", null)
      .order("cap_hoc_ma")
      .order("ma")
      .order("id")
      .range(pp.from, pp.to),
    supabase.from("cap_hoc").select("ma, ten").is("deleted_at", null).order("ma"),
  ]);

  const total = count ?? 0;
  const trangCuoi = duongDanTrangCuoi("/dashboard/hoc-lieu/mon-hoc", raw, pp, total);
  if (trangCuoi) redirect(trangCuoi);

  const isActive = profile?.trang_thai === "active";
  const vaiTro = profile?.vai_tro ?? "";
  const canWrite = isActive && VAI_TRO_QUAN_LY.includes(vaiTro);

  const capHocMap = new Map((capHocList ?? []).map((c) => [c.ma, c.ten]));
  const rows: MonHocRow[] = (list ?? []).map((m) => ({
    id: m.id,
    ma: m.ma,
    cap_hoc_ma: m.cap_hoc_ma,
    cap_hoc_ten: capHocMap.get(m.cap_hoc_ma) ?? String(m.cap_hoc_ma),
    ten: m.ten,
    mo_ta: m.mo_ta,
  }));

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Môn học</h1>
      </div>

      <nav className={styles.subNav}>
        <Link href="/dashboard/hoc-lieu" className={styles.subNavLink}>Tổng quan</Link>
        <Link href="/dashboard/hoc-lieu/cap-hoc" className={styles.subNavLink}>Cấp học</Link>
        <Link href="/dashboard/hoc-lieu/chuong-trinh" className={styles.subNavLink}>Chương trình</Link>
        <Link href="/dashboard/hoc-lieu/mon-hoc" className={`${styles.subNavLink} ${styles.subNavLinkActive}`}>Môn học</Link>
        <Link href="/dashboard/hoc-lieu/chu-de" className={styles.subNavLink}>Chủ đề</Link>
        <Link href="/dashboard/hoc-lieu/hoc-phan" className={styles.subNavLink}>Học phần</Link>
        <Link href="/dashboard/hoc-lieu/bai-hoc" className={styles.subNavLink}>Bài học</Link>
      </nav>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Tạo môn học mới</h2>
        {canWrite ? (
          <MonHocForm capHocList={capHocList ?? []} />
        ) : (
          <p className={styles.noticeBox}>
            Chỉ Master Admin hoặc Admin học thuật (trong phạm vi cấp học) được tạo/sửa/xoá môn học. Tài khoản của bạn:{" "}
            {isActive ? `vai trò "${vaiTro || "chưa gán"}"` : "tài khoản đang bị khoá (disabled)"}.
          </p>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Danh sách môn học ({total})</h2>
        {total > 0 ? (
          <>
            <MonHocTable list={rows} canWrite={canWrite} />
            <PhanTrang total={total} page={pp.page} size={pp.size} />
          </>
        ) : (
          <p className={styles.empty}>Chưa có môn học nào.</p>
        )}
      </section>
    </main>
  );
}

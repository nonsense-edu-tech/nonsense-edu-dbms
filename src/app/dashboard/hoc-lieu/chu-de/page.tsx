import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PhanTrang from "@/components/PhanTrang";
import { duongDanTrangCuoi, parsePhanTrang, type RawSearchParams } from "@/lib/phan-trang";
import ChuDeForm from "@/components/ChuDeForm";
import ChuDeTable, { type ChuDeRow } from "@/components/ChuDeTable";
import styles from "../hoc-lieu.module.css";

const VAI_TRO_QUAN_LY = ["master_admin", "admin_ht", "truong_bm"];

export default async function ChuDePage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = await searchParams;
  const pp = parsePhanTrang(raw);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: chuDeList, count: tongChuDe }, { data: monHocList }, { data: capHocList }] = await Promise.all([
    supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single(),
    supabase
      .from("chu_de")
      .select("id, mon_hoc_id, ma, ten, mo_ta", { count: "exact" })
      .is("deleted_at", null)
      .order("ma")
      .order("id")
      .range(pp.from, pp.to),
    supabase.from("mon_hoc").select("id, ma, cap_hoc_ma, ten").is("deleted_at", null).order("ten"),
    supabase.from("cap_hoc").select("ma, ten").is("deleted_at", null).order("ma"),
  ]);

  const total = tongChuDe ?? 0;
  const trangCuoi = duongDanTrangCuoi("/dashboard/hoc-lieu/chu-de", raw, pp, total);
  if (trangCuoi) redirect(trangCuoi);

  const isActive = profile?.trang_thai === "active";
  const vaiTro = profile?.vai_tro ?? "";
  const canWrite = isActive && VAI_TRO_QUAN_LY.includes(vaiTro);

  const capHocMap = new Map((capHocList ?? []).map((c) => [c.ma, c.ten]));
  const monHocMap = new Map((monHocList ?? []).map((m) => [m.id, m]));

  const monHocOptions = (monHocList ?? []).map((m) => ({
    id: m.id,
    ma: m.ma,
    ten: m.ten,
    cap_hoc_ten: capHocMap.get(m.cap_hoc_ma) ?? String(m.cap_hoc_ma),
  }));

  const chuDeRows: ChuDeRow[] = (chuDeList ?? []).map((cd) => {
    const mh = monHocMap.get(cd.mon_hoc_id);
    return {
      id: cd.id,
      mon_hoc_id: cd.mon_hoc_id,
      ma: cd.ma,
      ten: cd.ten,
      mo_ta: cd.mo_ta,
      mon_hoc_ten: mh?.ten ?? "—",
      cap_hoc_ten: mh ? capHocMap.get(mh.cap_hoc_ma) ?? String(mh.cap_hoc_ma) : "—",
    };
  });

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Chủ đề</h1>
      </div>

      <nav className={styles.subNav}>
        <Link href="/dashboard/hoc-lieu" className={styles.subNavLink}>Tổng quan</Link>
        <Link href="/dashboard/hoc-lieu/cap-hoc" className={styles.subNavLink}>Cấp học</Link>
        <Link href="/dashboard/hoc-lieu/chuong-trinh" className={styles.subNavLink}>Chương trình</Link>
        <Link href="/dashboard/hoc-lieu/mon-hoc" className={styles.subNavLink}>Môn học</Link>
        <Link href="/dashboard/hoc-lieu/chu-de" className={`${styles.subNavLink} ${styles.subNavLinkActive}`}>Chủ đề</Link>
        <Link href="/dashboard/hoc-lieu/hoc-phan" className={styles.subNavLink}>Học phần</Link>
        <Link href="/dashboard/hoc-lieu/bai-hoc" className={styles.subNavLink}>Bài học</Link>
        <Link href="/dashboard/hoc-lieu/cau-hoi" className={styles.subNavLink}>Câu hỏi</Link>
      </nav>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Tạo chủ đề mới</h2>
        {canWrite ? (
          <ChuDeForm monHocList={monHocOptions} />
        ) : (
          <p className={styles.noticeBox}>
            Chỉ Master Admin, Admin học thuật hoặc Trưởng bộ môn được tạo/sửa/xoá chủ đề. Tài khoản của bạn:{" "}
            {isActive ? `vai trò "${vaiTro || "chưa gán"}"` : "tài khoản đang bị khoá (disabled)"}.
          </p>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Danh sách chủ đề ({total})</h2>
        {total > 0 ? (
          <>
            <ChuDeTable list={chuDeRows} canWrite={canWrite} />
            <PhanTrang total={total} page={pp.page} size={pp.size} />
          </>
        ) : (
          <p className={styles.empty}>Chưa có chủ đề nào.</p>
        )}
      </section>
    </main>
  );
}

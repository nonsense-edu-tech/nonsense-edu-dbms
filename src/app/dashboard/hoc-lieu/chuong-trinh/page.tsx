import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PhanTrang from "@/components/PhanTrang";
import { duongDanTrangCuoi, parsePhanTrang, type RawSearchParams } from "@/lib/phan-trang";
import ChuongTrinhForm from "@/components/ChuongTrinhForm";
import ChuongTrinhMonHocForm from "@/components/ChuongTrinhMonHocForm";
import ChuongTrinhTable, { type ChuongTrinhRow, type MonDaGan } from "@/components/ChuongTrinhTable";
import styles from "../hoc-lieu.module.css";

export default async function ChuongTrinhPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = await searchParams;
  const pp = parsePhanTrang(raw);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: list, count }, { data: tatCaChuongTrinh }, { data: capHocList }, { data: monHocList }] =
    await Promise.all([
      supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single(),
      supabase
        .from("chuong_trinh")
        .select("id, ma, ten", { count: "exact" })
        .is("deleted_at", null)
        .order("ma")
        .order("id")
        .range(pp.from, pp.to),
      supabase.from("chuong_trinh").select("ma, ten").is("deleted_at", null).order("ma"),
      supabase.from("cap_hoc").select("ma, ten").is("deleted_at", null).order("ma"),
      supabase.from("mon_hoc").select("ma, cap_hoc_ma, ten").is("deleted_at", null).order("cap_hoc_ma").order("ma"),
    ]);

  const total = count ?? 0;
  const trangCuoi = duongDanTrangCuoi("/dashboard/hoc-lieu/chuong-trinh", raw, pp, total);
  if (trangCuoi) redirect(trangCuoi);

  const isActive = profile?.trang_thai === "active";
  const vaiTro = profile?.vai_tro ?? "";
  const canWrite = isActive && vaiTro === "master_admin";

  // Môn học đã gán — chỉ lấy cho các chương trình đang hiện ở trang này (một phân trang duy nhất).
  const maTrang = (list ?? []).map((c) => c.ma);
  const { data: mappingList } = maTrang.length
    ? await supabase
        .from("chuong_trinh_mon_hoc")
        .select("chuong_trinh_ma, cap_hoc_ma, mon_hoc_ma")
        .in("chuong_trinh_ma", maTrang)
        .order("cap_hoc_ma")
        .order("mon_hoc_ma")
    : { data: [] as { chuong_trinh_ma: string; cap_hoc_ma: number; mon_hoc_ma: number }[] };

  const capHocMap = new Map((capHocList ?? []).map((c) => [c.ma, c.ten]));
  const monHocMap = new Map((monHocList ?? []).map((m) => [`${m.cap_hoc_ma}-${m.ma}`, m.ten]));
  const monTheoChuongTrinh = new Map<string, MonDaGan[]>();
  for (const m of mappingList ?? []) {
    const ds = monTheoChuongTrinh.get(m.chuong_trinh_ma) ?? [];
    ds.push({
      cap_hoc_ma: m.cap_hoc_ma,
      cap_hoc_ten: capHocMap.get(m.cap_hoc_ma) ?? String(m.cap_hoc_ma),
      mon_hoc_ma: m.mon_hoc_ma,
      mon_hoc_ten: monHocMap.get(`${m.cap_hoc_ma}-${m.mon_hoc_ma}`) ?? String(m.mon_hoc_ma),
    });
    monTheoChuongTrinh.set(m.chuong_trinh_ma, ds);
  }

  const rows: ChuongTrinhRow[] = (list ?? []).map((c) => ({
    id: c.id,
    ma: c.ma,
    ten: c.ten,
    mon_hoc: monTheoChuongTrinh.get(c.ma) ?? [],
  }));

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Chương trình</h1>
      </div>

      <nav className={styles.subNav}>
        <Link href="/dashboard/hoc-lieu" className={styles.subNavLink}>Tổng quan</Link>
        <Link href="/dashboard/hoc-lieu/cap-hoc" className={styles.subNavLink}>Cấp học</Link>
        <Link href="/dashboard/hoc-lieu/chuong-trinh" className={`${styles.subNavLink} ${styles.subNavLinkActive}`}>Chương trình</Link>
        <Link href="/dashboard/hoc-lieu/mon-hoc" className={styles.subNavLink}>Môn học</Link>
        <Link href="/dashboard/hoc-lieu/chu-de" className={styles.subNavLink}>Chủ đề</Link>
        <Link href="/dashboard/hoc-lieu/hoc-phan" className={styles.subNavLink}>Học phần</Link>
        <Link href="/dashboard/hoc-lieu/bai-hoc" className={styles.subNavLink}>Bài học</Link>
      </nav>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Tạo chương trình mới</h2>
        {canWrite ? (
          <ChuongTrinhForm />
        ) : (
          <p className={styles.noticeBox}>
            Chỉ Master Admin được tạo/sửa/xoá chương trình. Tài khoản của bạn:{" "}
            {isActive ? `vai trò "${vaiTro || "chưa gán"}"` : "tài khoản đang bị khoá (disabled)"}.
          </p>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Gán môn học vào chương trình</h2>
        {canWrite ? (
          <ChuongTrinhMonHocForm
            chuongTrinhList={tatCaChuongTrinh ?? []}
            capHocList={capHocList ?? []}
            monHocList={monHocList ?? []}
          />
        ) : (
          <p className={styles.noticeBox}>Chỉ Master Admin được gán/gỡ môn học khỏi chương trình.</p>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Danh sách chương trình ({total})</h2>
        {total > 0 ? (
          <>
            <ChuongTrinhTable list={rows} canWrite={canWrite} />
            <PhanTrang total={total} page={pp.page} size={pp.size} />
          </>
        ) : (
          <p className={styles.empty}>Chưa có chương trình nào.</p>
        )}
      </section>
    </main>
  );
}

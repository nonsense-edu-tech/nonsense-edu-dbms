import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PhanTrang from "@/components/PhanTrang";
import { duongDanTrangCuoi, parsePhanTrang, type RawSearchParams } from "@/lib/phan-trang";
import ChuongTrinhMonHocForm from "@/components/ChuongTrinhMonHocForm";
import ChuongTrinhMonHocTable, { type ChuongTrinhMonHocRow } from "@/components/ChuongTrinhMonHocTable";
import styles from "../van-hanh.module.css";

export default async function ChuongTrinhMonHocPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = await searchParams;
  const pp = parsePhanTrang(raw);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: chuongTrinhList }, { data: capHocList }, { data: monHocList }, { data: mappingList, count: tongMapping }] =
    await Promise.all([
      supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single(),
      supabase.from("chuong_trinh").select("ma, ten").is("deleted_at", null).order("ma"),
      supabase.from("cap_hoc").select("ma, ten").is("deleted_at", null).order("ma"),
      supabase.from("mon_hoc").select("ma, cap_hoc_ma, ten").is("deleted_at", null).order("ma"),
      supabase
        .from("chuong_trinh_mon_hoc")
        .select("chuong_trinh_ma, cap_hoc_ma, mon_hoc_ma", { count: "exact" })
        // Không có cột id — bộ 3 cột này là khoá ghép duy nhất, dùng làm thứ tự ổn định.
        .order("chuong_trinh_ma")
        .order("cap_hoc_ma")
        .order("mon_hoc_ma")
        .range(pp.from, pp.to),
    ]);

  const total = tongMapping ?? 0;
  const trangCuoi = duongDanTrangCuoi("/dashboard/van-hanh/chuong-trinh-mon-hoc", raw, pp, total);
  if (trangCuoi) redirect(trangCuoi);

  const isActive = profile?.trang_thai === "active";
  const isMasterAdmin = isActive && profile?.vai_tro === "master_admin";

  const chuongTrinhMap = new Map((chuongTrinhList ?? []).map((c) => [c.ma, c.ten]));
  const capHocMap = new Map((capHocList ?? []).map((c) => [c.ma, c.ten]));
  const monHocMap = new Map((monHocList ?? []).map((m) => [`${m.cap_hoc_ma}-${m.ma}`, m.ten]));

  const mappingRows: ChuongTrinhMonHocRow[] = (mappingList ?? []).map((m) => ({
    chuong_trinh_ma: m.chuong_trinh_ma,
    chuong_trinh_ten: chuongTrinhMap.get(m.chuong_trinh_ma) ?? m.chuong_trinh_ma,
    cap_hoc_ma: m.cap_hoc_ma,
    cap_hoc_ten: capHocMap.get(m.cap_hoc_ma) ?? String(m.cap_hoc_ma),
    mon_hoc_ma: m.mon_hoc_ma,
    mon_hoc_ten: monHocMap.get(`${m.cap_hoc_ma}-${m.mon_hoc_ma}`) ?? String(m.mon_hoc_ma),
  }));

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Chương trình - Môn học</h1>
      </div>

      <nav className={styles.subNav}>
        <Link href="/dashboard/van-hanh" className={styles.subNavLink}>Tổng quan</Link>
        <Link href="/dashboard/van-hanh/loai-phong" className={styles.subNavLink}>Loại phòng</Link>
        <Link href="/dashboard/van-hanh/phong-hoc" className={styles.subNavLink}>Phòng học</Link>
        <Link href="/dashboard/van-hanh/chuong-trinh-mon-hoc" className={`${styles.subNavLink} ${styles.subNavLinkActive}`}>Chương trình - Môn học</Link>
        <Link href="/dashboard/van-hanh/buoi-hoc" className={styles.subNavLink}>Buổi học</Link>
      </nav>

      {!isActive ? (
        <section className={styles.card}>
          <p className={styles.noticeBox}>Tài khoản của bạn đang bị khoá (disabled).</p>
        </section>
      ) : (
        <>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Thêm môn học vào chương trình</h2>
            {isMasterAdmin ? (
              <ChuongTrinhMonHocForm
                chuongTrinhList={chuongTrinhList ?? []}
                capHocList={capHocList ?? []}
                monHocList={monHocList ?? []}
              />
            ) : (
              <p className={styles.noticeBox}>Chỉ Master Admin được sửa trục Chương trình - Môn học.</p>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Danh sách ({total})</h2>
            {total > 0 ? (
              <>
                <ChuongTrinhMonHocTable list={mappingRows} canDelete={isMasterAdmin} />
                <PhanTrang total={total} page={pp.page} size={pp.size} />
              </>
            ) : (
              <p className={styles.empty}>Chưa có môn học nào được gán vào chương trình.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}

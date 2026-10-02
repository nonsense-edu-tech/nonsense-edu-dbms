import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PhanTrang from "@/components/PhanTrang";
import { duongDanTrangCuoi, parsePhanTrang, type RawSearchParams } from "@/lib/phan-trang";
import BaiHocForm from "@/components/BaiHocForm";
import BaiHocTable, { type BaiHocRow } from "@/components/BaiHocTable";
import styles from "../hoc-lieu.module.css";

const VAI_TRO_QUAN_LY = ["master_admin", "admin_ht", "truong_bm"];

export default async function BaiHocPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = await searchParams;
  const pp = parsePhanTrang(raw);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: baiHocList, count: tongBaiHoc }, { data: hocPhanList }, { data: monHocList }, { data: capHocList }] =
    await Promise.all([
      supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single(),
      supabase
        .from("bai_hoc")
        .select("id, hoc_phan_id, ma, ten, mo_ta", { count: "exact" })
        .is("deleted_at", null)
        .order("ma")
        .order("id")
        .range(pp.from, pp.to),
      supabase.from("hoc_phan").select("id, mon_hoc_id, ma, ten").is("deleted_at", null).order("ten"),
      supabase.from("mon_hoc").select("id, ma, cap_hoc_ma, ten").is("deleted_at", null).order("ten"),
      supabase.from("cap_hoc").select("ma, ten").is("deleted_at", null).order("ma"),
    ]);

  const total = tongBaiHoc ?? 0;
  const trangCuoi = duongDanTrangCuoi("/dashboard/hoc-lieu/bai-hoc", raw, pp, total);
  if (trangCuoi) redirect(trangCuoi);

  const isActive = profile?.trang_thai === "active";
  const vaiTro = profile?.vai_tro ?? "";
  const canWrite = isActive && VAI_TRO_QUAN_LY.includes(vaiTro);

  const capHocMap = new Map((capHocList ?? []).map((c) => [c.ma, c.ten]));
  const monHocMap = new Map((monHocList ?? []).map((m) => [m.id, m]));
  const hocPhanMap = new Map((hocPhanList ?? []).map((hp) => [hp.id, hp]));

  const hocPhanOptions = (hocPhanList ?? []).map((hp) => {
    const mh = monHocMap.get(hp.mon_hoc_id);
    return {
      id: hp.id,
      ma: hp.ma,
      ten: hp.ten,
      mon_hoc_ten: mh?.ten ?? "—",
      cap_hoc_ten: mh ? capHocMap.get(mh.cap_hoc_ma) ?? String(mh.cap_hoc_ma) : "—",
    };
  });

  const baiHocRows: BaiHocRow[] = (baiHocList ?? []).map((bh) => {
    const hp = hocPhanMap.get(bh.hoc_phan_id);
    const mh = hp ? monHocMap.get(hp.mon_hoc_id) : undefined;
    return {
      id: bh.id,
      hoc_phan_id: bh.hoc_phan_id,
      ma: bh.ma,
      ten: bh.ten,
      mo_ta: bh.mo_ta,
      hoc_phan_ten: hp?.ten ?? "—",
      mon_hoc_ten: mh?.ten ?? "—",
      cap_hoc_ten: mh ? capHocMap.get(mh.cap_hoc_ma) ?? String(mh.cap_hoc_ma) : "—",
    };
  });

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Bài học</h1>
      </div>

      <nav className={styles.subNav}>
        <Link href="/dashboard/hoc-lieu" className={styles.subNavLink}>Tổng quan</Link>
        <Link href="/dashboard/hoc-lieu/cap-hoc" className={styles.subNavLink}>Cấp học</Link>
        <Link href="/dashboard/hoc-lieu/chuong-trinh" className={styles.subNavLink}>Chương trình</Link>
        <Link href="/dashboard/hoc-lieu/mon-hoc" className={styles.subNavLink}>Môn học</Link>
        <Link href="/dashboard/hoc-lieu/chu-de" className={styles.subNavLink}>Chủ đề</Link>
        <Link href="/dashboard/hoc-lieu/hoc-phan" className={styles.subNavLink}>Học phần</Link>
        <Link href="/dashboard/hoc-lieu/bai-hoc" className={`${styles.subNavLink} ${styles.subNavLinkActive}`}>Bài học</Link>
      </nav>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Tạo bài học mới</h2>
        {canWrite ? (
          <BaiHocForm hocPhanList={hocPhanOptions} />
        ) : (
          <p className={styles.noticeBox}>
            Chỉ Master Admin, Admin học thuật hoặc Trưởng bộ môn được tạo/sửa/xoá bài học. Tài khoản của bạn:{" "}
            {isActive ? `vai trò "${vaiTro || "chưa gán"}"` : "tài khoản đang bị khoá (disabled)"}.
          </p>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Danh sách bài học ({total})</h2>
        {total > 0 ? (
          <>
            <BaiHocTable list={baiHocRows} canWrite={canWrite} />
            <PhanTrang total={total} page={pp.page} size={pp.size} />
          </>
        ) : (
          <p className={styles.empty}>Chưa có bài học nào.</p>
        )}
      </section>
    </main>
  );
}

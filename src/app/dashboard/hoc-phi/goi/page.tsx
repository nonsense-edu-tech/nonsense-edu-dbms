import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PhanTrang from "@/components/PhanTrang";
import { duongDanTrangCuoi, parsePhanTrang, type RawSearchParams } from "@/lib/phan-trang";
import GoiHocPhiForm from "@/components/GoiHocPhiForm";
import GoiHocPhiTable, { type GoiHocPhiRow } from "@/components/GoiHocPhiTable";
import styles from "../hoc-phi.module.css";

const VAI_TRO_DOC = ["master_admin", "ke_toan", "thu_ngan", "admin_ts"];
const VAI_TRO_GHI = ["master_admin", "ke_toan"];

export default async function GoiHocPhiPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = await searchParams;
  const pp = parsePhanTrang(raw);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: chuongTrinhList }, { data: goiList, count: tongGoi }] = await Promise.all([
    supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single(),
    supabase.from("chuong_trinh").select("ma, ten").is("deleted_at", null).order("ma"),
    supabase
      .from("goi_hoc_phi")
      .select("id, ten, chuong_trinh_ma, hinh_thuc_dong, gia_niem_yet, hieu_luc_tu, hieu_luc_den, dang_ap_dung", { count: "exact" })
      .is("deleted_at", null)
      .order("chuong_trinh_ma")
      .order("hieu_luc_tu", { ascending: false })
      .order("id")
      .range(pp.from, pp.to),
  ]);

  const total = tongGoi ?? 0;
  const trangCuoi = duongDanTrangCuoi("/dashboard/hoc-phi/goi", raw, pp, total);
  if (trangCuoi) redirect(trangCuoi);

  const isActive = profile?.trang_thai === "active";
  const vaiTro = profile?.vai_tro ?? "";
  const canRead = isActive && VAI_TRO_DOC.includes(vaiTro);
  const canEdit = isActive && VAI_TRO_GHI.includes(vaiTro);

  const chuongTrinhMap = new Map((chuongTrinhList ?? []).map((c) => [c.ma, c.ten]));

  const goiRows: GoiHocPhiRow[] = (goiList ?? []).map((g) => ({
    id: g.id,
    ten: g.ten,
    chuong_trinh_ten: chuongTrinhMap.get(g.chuong_trinh_ma) ?? g.chuong_trinh_ma,
    hinh_thuc_dong: g.hinh_thuc_dong,
    gia_niem_yet: g.gia_niem_yet,
    hieu_luc_tu: g.hieu_luc_tu,
    hieu_luc_den: g.hieu_luc_den,
    dang_ap_dung: g.dang_ap_dung,
  }));

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Gói học phí</h1>
      </div>

      <nav className={styles.subNav}>
        <Link href="/dashboard/hoc-phi" className={styles.subNavLink}>Tổng quan</Link>
        <Link href="/dashboard/hoc-phi/goi" className={`${styles.subNavLink} ${styles.subNavLinkActive}`}>Gói học phí</Link>
        <Link href="/dashboard/hoc-phi/hop-dong" className={styles.subNavLink}>Hợp đồng</Link>
        <Link href="/dashboard/hoc-phi/thu-tien" className={styles.subNavLink}>Thu tiền</Link>
      </nav>

      {!canRead ? (
        <section className={styles.card}>
          <p className={styles.noticeBox}>
            Bạn không có quyền xem trang này. Tài khoản của bạn:{" "}
            {isActive ? `vai trò "${vaiTro || "chưa gán"}"` : "tài khoản đang bị khoá (disabled)"}.
          </p>
        </section>
      ) : (
        <>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Tạo gói học phí mới</h2>
            {canEdit ? (
              <GoiHocPhiForm chuongTrinhList={chuongTrinhList ?? []} />
            ) : (
              <p className={styles.noticeBox}>Chỉ Master Admin hoặc Kế toán được định giá gói học phí.</p>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Danh sách gói học phí ({total})</h2>
            {total > 0 ? (
              <>
                <GoiHocPhiTable list={goiRows} canEdit={canEdit} />
                <PhanTrang total={total} page={pp.page} size={pp.size} />
              </>
            ) : (
              <p className={styles.empty}>Chưa có gói học phí nào.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}

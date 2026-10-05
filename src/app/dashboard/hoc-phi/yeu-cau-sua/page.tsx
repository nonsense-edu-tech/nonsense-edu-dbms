import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import YeuCauSuaTable, { type YeuCauRow } from "@/components/YeuCauSuaTable";
import PhanTrang from "@/components/PhanTrang";
import { motBanGhi } from "@/lib/embed";
import { duongDanTrangCuoi, parsePhanTrang, type RawSearchParams } from "@/lib/phan-trang";
import styles from "../hoc-phi.module.css";

const VAI_TRO_DOC = ["master_admin", "ke_toan", "thu_ngan", "admin_ts"];

// Danh sách yêu cầu sửa hợp đồng: Admin Tuyển sinh đề xuất (kèm lý do) → Master Admin duyệt/từ chối (kèm lý do).
export default async function YeuCauSuaPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = await searchParams;
  const pp = parsePhanTrang(raw);
  const locRaw = Array.isArray(raw.tt) ? raw.tt[0] : raw.tt;
  const loc = locRaw === "tat_ca" ? "tat_ca" : "cho_duyet"; // mặc định: chỉ yêu cầu đang chờ

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let truyVan = supabase
    .from("yeu_cau_sua_hop_dong")
    .select(
      "id, hop_dong_id, nguoi_de_xuat, ly_do_de_xuat, truoc, gia_niem_yet, loai_giam_gia, gia_tri_giam_gia, hinh_thuc_dong, ghi_chu, trang_thai, xu_ly_luc, ly_do_xu_ly, created_at, de_xuat:users!yeu_cau_sua_hop_dong_nguoi_de_xuat_fkey(ho_ten, email), xu_ly:users!yeu_cau_sua_hop_dong_nguoi_xu_ly_fkey(ho_ten, email), hop_dong_hoc_phi(ghi_danh(hoc_sinh(ho_ten, ma_hoc_sinh)))",
      { count: "exact" }
    );
  if (loc === "cho_duyet") truyVan = truyVan.eq("trang_thai", "cho_duyet");
  truyVan = truyVan.order("created_at", { ascending: false }).order("id").range(pp.from, pp.to);

  const [{ data: profile }, { data: ds, count }] = await Promise.all([
    supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single(),
    truyVan,
  ]);

  const total = count ?? 0;
  const trangCuoi = duongDanTrangCuoi("/dashboard/hoc-phi/yeu-cau-sua", raw, pp, total);
  if (trangCuoi) redirect(trangCuoi);

  const isActive = profile?.trang_thai === "active";
  const vaiTro = profile?.vai_tro ?? "";
  const canRead = isActive && VAI_TRO_DOC.includes(vaiTro);
  const isMaster = isActive && vaiTro === "master_admin";

  const rows: YeuCauRow[] = (ds ?? []).map((y) => {
    const hd = motBanGhi(y.hop_dong_hoc_phi);
    const gd = motBanGhi(hd?.ghi_danh);
    const hs = motBanGhi(gd?.hoc_sinh);
    const dx = motBanGhi(y.de_xuat);
    const xl = motBanGhi(y.xu_ly);
    return {
      id: y.id,
      hop_dong_id: y.hop_dong_id,
      ho_ten: hs?.ho_ten ?? "?",
      ma_hoc_sinh: hs?.ma_hoc_sinh ?? "?",
      nguoi_de_xuat_id: y.nguoi_de_xuat,
      nguoi_de_xuat: dx?.ho_ten || dx?.email || "?",
      ly_do_de_xuat: y.ly_do_de_xuat,
      truoc: (y.truoc ?? {}) as Record<string, unknown>,
      moi: {
        gia_niem_yet: y.gia_niem_yet,
        loai_giam_gia: y.loai_giam_gia,
        gia_tri_giam_gia: y.gia_tri_giam_gia,
        hinh_thuc_dong: y.hinh_thuc_dong,
        ghi_chu: y.ghi_chu,
      },
      trang_thai: y.trang_thai,
      nguoi_xu_ly: xl ? xl.ho_ten || xl.email || "?" : null,
      xu_ly_luc: y.xu_ly_luc,
      ly_do_xu_ly: y.ly_do_xu_ly,
      created_at: y.created_at,
    };
  });

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Yêu cầu sửa hợp đồng</h1>
      </div>

      <nav className={styles.subNav}>
        <Link href="/dashboard/hoc-phi" className={styles.subNavLink}>Tổng quan</Link>
        <Link href="/dashboard/hoc-phi/goi" className={styles.subNavLink}>Gói học phí</Link>
        <Link href="/dashboard/hoc-phi/hop-dong" className={styles.subNavLink}>Hợp đồng</Link>
        <Link href="/dashboard/hoc-phi/thu-tien" className={styles.subNavLink}>Thu tiền</Link>
        <Link href="/dashboard/hoc-phi/yeu-cau-sua" className={`${styles.subNavLink} ${styles.subNavLinkActive}`}>Yêu cầu sửa</Link>
      </nav>

      {!canRead ? (
        <section className={styles.card}>
          <p className={styles.noticeBox}>
            Bạn không có quyền xem trang này. Tài khoản của bạn:{" "}
            {isActive ? `vai trò "${vaiTro || "chưa gán"}"` : "tài khoản đang bị khoá (disabled)"}.
          </p>
        </section>
      ) : (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            {loc === "cho_duyet" ? "Đang chờ duyệt" : "Tất cả yêu cầu"} ({total})
          </h2>
          <nav className={styles.subNav}>
            <Link
              href="/dashboard/hoc-phi/yeu-cau-sua"
              className={`${styles.subNavLink} ${loc === "cho_duyet" ? styles.subNavLinkActive : ""}`}
            >
              Chờ duyệt
            </Link>
            <Link
              href="/dashboard/hoc-phi/yeu-cau-sua?tt=tat_ca"
              className={`${styles.subNavLink} ${loc === "tat_ca" ? styles.subNavLinkActive : ""}`}
            >
              Tất cả
            </Link>
          </nav>
          {rows.length > 0 ? (
            <>
              <YeuCauSuaTable list={rows} isMaster={isMaster} userId={user.id} />
              <PhanTrang total={total} page={pp.page} size={pp.size} />
            </>
          ) : (
            <p className={styles.empty}>
              {loc === "cho_duyet" ? "Không có yêu cầu nào đang chờ duyệt." : "Chưa có yêu cầu nào."}
            </p>
          )}
          {!isMaster && (
            <p className={styles.noticeBox}>
              Chỉ Master Admin được phê duyệt hoặc từ chối. Admin Tuyển sinh gửi đề xuất từ trang Hợp đồng (nút &quot;Đề xuất sửa&quot;).
            </p>
          )}
        </section>
      )}
    </main>
  );
}

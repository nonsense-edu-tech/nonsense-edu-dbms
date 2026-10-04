import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HopDongForm, { type GhiDanhOption, type GoiOption } from "@/components/HopDongForm";
import HopDongTable, { type HopDongRow } from "@/components/HopDongTable";
import PhanTrang from "@/components/PhanTrang";
import OTimKiem from "@/components/OTimKiem";
import { layTuKhoa, timHopDongTheoTuKhoa, UUID_RONG } from "@/lib/tim-kiem-hoc-phi";
import { motBanGhi } from "@/lib/embed";
import { duongDanTrangCuoi, parsePhanTrang, type RawSearchParams } from "@/lib/phan-trang";
import styles from "../hoc-phi.module.css";

const VAI_TRO_DOC = ["master_admin", "ke_toan", "thu_ngan", "admin_ts"];
const VAI_TRO_GHI = ["master_admin", "ke_toan", "admin_ts"];

type HopDongNhung = { trang_thai: string; deleted_at: string | null };

// Ghi danh "đã có hợp đồng" chỉ khi có ít nhất 1 hợp đồng chưa hủy và chưa xóa mềm.
// Embed trả về mảng (quan hệ 1-nhiều từ 0053) hoặc object tùy kiểu sinh — chấp nhận cả hai.
function coHopDongDangMo(v: HopDongNhung | HopDongNhung[] | null | undefined): boolean {
  const ds = Array.isArray(v) ? v : v ? [v] : [];
  return ds.some((h) => h.trang_thai !== "da_huy" && h.deleted_at == null);
}

export default async function HopDongPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;
  const pp = parsePhanTrang(raw);
  const q = layTuKhoa(raw);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Tìm kiếm: tên/mã học sinh, lớp, tên gói → tra ra id hợp đồng khớp rồi lọc theo id.
  let quaRong = false;
  let idKhop: string[] | null = null;
  if (q) {
    const kq = await timHopDongTheoTuKhoa(supabase, q, { gomLopVaGoi: true, boDaXoa: true });
    quaRong = kq.quaRong;
    idKhop = kq.ids;
  }

  let truyVanHopDong = supabase
    .from("hop_dong_hoc_phi")
    .select(
      "id, ghi_danh_id, goi_hoc_phi_id, gia_niem_yet, so_tien_giam, doanh_thu_thuan, trang_thai, goi_hoc_phi(ten), ghi_danh(hoc_sinh(ho_ten, ma_hoc_sinh), lop(chuong_trinh_ma))",
      { count: "exact" }
    )
    .is("deleted_at", null);
  if (idKhop) truyVanHopDong = truyVanHopDong.in("id", idKhop.length > 0 ? idKhop : [UUID_RONG]);
  truyVanHopDong = truyVanHopDong.order("created_at", { ascending: false }).order("id").range(pp.from, pp.to);

  const [
    { data: profile },
    { data: chuongTrinhList },
    { data: hopDongList, count },
    { data: goiList },
    { data: ghiDanhDangHoc },
  ] = await Promise.all([
    supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single(),
    supabase.from("chuong_trinh").select("ma, ten").is("deleted_at", null).order("ma"),
    // Chỉ lấy đúng 1 trang hợp đồng; tên học sinh / lớp / gói lấy bằng embed
    // (thay cho việc tải toàn bộ ghi_danh/hoc_sinh/lop rồi join bằng Map).
    truyVanHopDong,
    supabase.from("goi_hoc_phi").select("id, ten, chuong_trinh_ma, gia_niem_yet, dang_ap_dung, hieu_luc_den").is("deleted_at", null),
    // Dropdown "Tạo hợp đồng": ghi danh đang học CHƯA có hợp đồng ĐANG MỞ. Hợp đồng đã hủy
    // (`da_huy`) hoặc xóa mềm không tính — nếu không, học sinh bị hủy hợp đồng sẽ không bao giờ
    // tạo lại được (migration 0053 cũng chỉ ràng buộc duy nhất trên hợp đồng đang mở).
    supabase
      .from("ghi_danh")
      .select("id, hoc_sinh(ho_ten, ma_hoc_sinh, deleted_at), lop(ten_lop, chuong_trinh_ma), hop_dong_hoc_phi(id, trang_thai, deleted_at)")
      .eq("trang_thai", "dang_hoc")
      .is("deleted_at", null),
  ]);

  const total = count ?? 0;
  const trangCuoi = duongDanTrangCuoi("/dashboard/hoc-phi/hop-dong", raw, pp, total);
  if (trangCuoi) redirect(trangCuoi);

  // Thực thu chỉ tra cho các hợp đồng của trang hiện tại.
  const hopDongIds = (hopDongList ?? []).map((hd) => hd.id);
  const { data: taiChinhList } =
    hopDongIds.length > 0
      ? await supabase.from("v_tai_chinh_hop_dong").select("hop_dong_id, thuc_thu").in("hop_dong_id", hopDongIds)
      : { data: [] as { hop_dong_id: string | null; thuc_thu: number | null }[] };

  const isActive = profile?.trang_thai === "active";
  const vaiTro = profile?.vai_tro ?? "";
  const canRead = isActive && VAI_TRO_DOC.includes(vaiTro);
  const canEdit = isActive && VAI_TRO_GHI.includes(vaiTro);

  const chuongTrinhMap = new Map((chuongTrinhList ?? []).map((c) => [c.ma, c.ten]));
  const thucThuMap = new Map((taiChinhList ?? []).map((tc) => [tc.hop_dong_id, tc.thuc_thu]));

  const ghiDanhKhaDung: GhiDanhOption[] = (ghiDanhDangHoc ?? [])
    .filter((gd) => !coHopDongDangMo(gd.hop_dong_hoc_phi))
    .map((gd) => {
      const hs = motBanGhi(gd.hoc_sinh);
      const lop = motBanGhi(gd.lop);
      return { gd, hs, lop };
    })
    .filter(({ hs }) => hs != null && hs.deleted_at == null)
    .map(({ gd, hs, lop }) => ({
      id: gd.id,
      ho_ten: hs?.ho_ten ?? "?",
      ma_hoc_sinh: hs?.ma_hoc_sinh ?? "?",
      ten_lop: lop?.ten_lop ?? null,
      chuong_trinh_ma: lop?.chuong_trinh_ma ?? "",
      chuong_trinh_ten: chuongTrinhMap.get(lop?.chuong_trinh_ma ?? "") ?? "?",
    }))
    .sort((a, b) => a.ho_ten.localeCompare(b.ho_ten, "vi"));

  const goiKhaDung: GoiOption[] = (goiList ?? [])
    .filter((g) => g.dang_ap_dung && g.hieu_luc_den === null)
    .map((g) => ({ id: g.id, ten: g.ten, chuong_trinh_ma: g.chuong_trinh_ma, gia_niem_yet: g.gia_niem_yet }));

  const hopDongRows: HopDongRow[] = (hopDongList ?? []).map((hd) => {
    const gd = motBanGhi(hd.ghi_danh);
    const hs = motBanGhi(gd?.hoc_sinh);
    const lop = motBanGhi(gd?.lop);
    const goi = motBanGhi(hd.goi_hoc_phi);
    return {
      id: hd.id,
      ho_ten: hs?.ho_ten ?? "?",
      ma_hoc_sinh: hs?.ma_hoc_sinh ?? "?",
      chuong_trinh_ten: chuongTrinhMap.get(lop?.chuong_trinh_ma ?? "") ?? "?",
      goi_ten: goi?.ten ?? "?",
      gia_niem_yet: hd.gia_niem_yet,
      so_tien_giam: hd.so_tien_giam,
      doanh_thu_thuan: hd.doanh_thu_thuan,
      thuc_thu: thucThuMap.get(hd.id) ?? 0,
      trang_thai: hd.trang_thai,
    };
  });

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Hợp đồng học phí</h1>
      </div>

      <nav className={styles.subNav}>
        <Link href="/dashboard/hoc-phi" className={styles.subNavLink}>Tổng quan</Link>
        <Link href="/dashboard/hoc-phi/goi" className={styles.subNavLink}>Gói học phí</Link>
        <Link href="/dashboard/hoc-phi/hop-dong" className={`${styles.subNavLink} ${styles.subNavLinkActive}`}>Hợp đồng</Link>
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
            <h2 className={styles.cardTitle}>Tạo hợp đồng mới</h2>
            {canEdit ? (
              <HopDongForm ghiDanhList={ghiDanhKhaDung} goiList={goiKhaDung} />
            ) : (
              <p className={styles.noticeBox}>Chỉ Master Admin, Kế toán hoặc Admin Tuyển sinh được tạo hợp đồng.</p>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Danh sách hợp đồng ({total})</h2>
            {(total > 0 || q) && (
              <OTimKiem q={q} placeholder="Tìm theo tên/mã học sinh, lớp, gói học phí..." ketQua={total} />
            )}
            {quaRong && (
              <p className={styles.noticeBox}>Từ khoá khớp quá nhiều kết quả nên danh sách có thể thiếu — hãy nhập cụ thể hơn.</p>
            )}
            {hopDongRows.length > 0 ? (
              <>
                <HopDongTable list={hopDongRows} canEdit={canEdit} />
                <PhanTrang total={total} page={pp.page} size={pp.size} />
              </>
            ) : (
              <p className={styles.empty}>{q ? `Không có hợp đồng nào khớp "${q}".` : "Chưa có hợp đồng nào."}</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}

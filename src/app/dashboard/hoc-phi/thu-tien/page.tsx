import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PhanTrang from "@/components/PhanTrang";
import { motBanGhi } from "@/lib/embed";
import { duongDanTrangCuoi, parsePhanTrang, type RawSearchParams } from "@/lib/phan-trang";
import PhieuThuForm, { type HopDongCoTheThu } from "@/components/PhieuThuForm";
import PhieuThuTable, { type PhieuThuRow } from "@/components/PhieuThuTable";
import OTimKiem from "@/components/OTimKiem";
import { layTuKhoa, timHopDongTheoTuKhoa, tuKhoaLaSoTien } from "@/lib/tim-kiem-hoc-phi";
import { nhanPhieuThuTrongDanhSach } from "@/lib/thu-tien";
import styles from "../hoc-phi.module.css";

const VAI_TRO_DOC = ["master_admin", "ke_toan", "thu_ngan", "admin_ts"];
const VAI_TRO_GHI = ["master_admin", "ke_toan", "thu_ngan", "admin_ts"];

export default async function ThuTienPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = await searchParams;
  const pp = parsePhanTrang(raw);
  const q = layTuKhoa(raw);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Tìm kiếm: mã phiếu, ghi chú, người thu, số tiền (nếu gõ toàn số) + tên/mã học sinh
  // (tra ngược ra hợp đồng của học sinh đó, kể cả hợp đồng đã hoàn tất/huỷ).
  let quaRong = false;
  let dieuKienTim: string | null = null;
  if (q) {
    const hd = await timHopDongTheoTuKhoa(supabase, q, { gomLopVaGoi: false, boDaXoa: false });
    quaRong = hd.quaRong;
    const dk = [`ma_phieu_thu.ilike.%${q}%`, `ghi_chu.ilike.%${q}%`, `nguoi_thu_ten.ilike.%${q}%`];
    const soTien = tuKhoaLaSoTien(q);
    if (soTien != null) dk.push(`so_tien.eq.${soTien}`);
    if (hd.ids.length > 0) dk.push(`hop_dong_id.in.(${hd.ids.join(",")})`);
    dieuKienTim = dk.join(",");
  }

  let truyVanPhieuThu = supabase
    .from("phieu_thu")
    // Tên học sinh + biên lai lấy bằng embed (chỉ cho phiếu của trang hiện tại), thay cho
    // việc tải toàn bộ ghi_danh/hoc_sinh/tep_dinh_kem rồi ghép bằng Map. Phiếu của hợp đồng
    // KHÔNG còn hoạt động (đã hoàn tất/huỷ) cũng ra đúng tên thay vì "?".
    .select(
      "id, ma_phieu_thu, hop_dong_id, so_tien, ngay_thu, hinh_thuc, la_phieu_dao, ghi_chu, nguoi_thu_ten, hop_dong_hoc_phi(ghi_danh(hoc_sinh(ho_ten, ma_hoc_sinh))), bien_lai_1:tep_dinh_kem!phieu_thu_tep_dinh_kem_id_fkey(ten_tep, duong_dan_luu_tru), bien_lai_2:tep_dinh_kem!phieu_thu_tep_dinh_kem_id_2_fkey(ten_tep, duong_dan_luu_tru)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .order("id")
    .range(pp.from, pp.to);
  if (dieuKienTim) truyVanPhieuThu = truyVanPhieuThu.or(dieuKienTim);

  const [
    { data: profile },
    { data: taiChinhList },
    { data: ghiDanhList },
    { data: hocSinhList },
    { data: lopList },
    { data: chuongTrinhList },
    { data: phieuThuList, count: tongPhieuThu },
  ] = await Promise.all([
    supabase.from("users").select("vai_tro, trang_thai, ho_ten").eq("id", user.id).single(),
    supabase.from("v_tai_chinh_hop_dong").select("hop_dong_id, ghi_danh_id, chuong_trinh_ma, con_phai_thu, trang_thai"),
    supabase.from("ghi_danh").select("id, hoc_sinh_id").is("deleted_at", null),
    supabase.from("hoc_sinh").select("id, ho_ten, ma_hoc_sinh").is("deleted_at", null),
    supabase.from("lop").select("id, chuong_trinh_ma").is("deleted_at", null),
    supabase.from("chuong_trinh").select("ma, ten").is("deleted_at", null),
    truyVanPhieuThu,
  ]);

  const total = tongPhieuThu ?? 0;
  const trangCuoi = duongDanTrangCuoi("/dashboard/hoc-phi/thu-tien", raw, pp, total);
  if (trangCuoi) redirect(trangCuoi);

  const isActive = profile?.trang_thai === "active";
  const vaiTro = profile?.vai_tro ?? "";
  const canRead = isActive && VAI_TRO_DOC.includes(vaiTro);
  const canEdit = isActive && VAI_TRO_GHI.includes(vaiTro);
  const nguoiDungHienTai = profile?.ho_ten?.trim() || user.email || "?";

  const hocSinhMap = new Map((hocSinhList ?? []).map((h) => [h.id, h]));
  const ghiDanhMap = new Map((ghiDanhList ?? []).map((g) => [g.id, g]));
  const chuongTrinhMap = new Map((chuongTrinhList ?? []).map((c) => [c.ma, c.ten]));

  // Gồm hợp đồng đang hoạt động + hợp đồng đã hoàn thành nhưng còn phải thu (thu muộn).
  const hopDongCoTheThu: HopDongCoTheThu[] = (taiChinhList ?? [])
    .filter((tc) => nhanPhieuThuTrongDanhSach(tc.trang_thai, Number(tc.con_phai_thu ?? 0)))
    .map((tc) => {
      const gd = ghiDanhMap.get(tc.ghi_danh_id);
      const hs = gd ? hocSinhMap.get(gd.hoc_sinh_id) : undefined;
      return {
        id: tc.hop_dong_id,
        ho_ten: hs?.ho_ten ?? "?",
        ma_hoc_sinh: hs?.ma_hoc_sinh ?? "?",
        chuong_trinh_ten: chuongTrinhMap.get(tc.chuong_trinh_ma) ?? "?",
        con_phai_thu: tc.con_phai_thu,
        da_ket_thuc: tc.trang_thai === "hoan_thanh",
      };
    })
    .sort((a, b) => a.ho_ten.localeCompare(b.ho_ten, "vi"));

  const phieuThuRows: PhieuThuRow[] = (phieuThuList ?? []).map((pt) => {
    const hocSinh = motBanGhi(motBanGhi(motBanGhi(pt.hop_dong_hoc_phi)?.ghi_danh)?.hoc_sinh);
    const bienLai = [motBanGhi(pt.bien_lai_1), motBanGhi(pt.bien_lai_2)]
      .filter((t): t is NonNullable<typeof t> => t != null)
      .map((t) => ({ ten_tep: t.ten_tep, duong_dan_luu_tru: t.duong_dan_luu_tru }));
    return {
      id: pt.id,
      ma_phieu_thu: pt.ma_phieu_thu,
      ho_ten: hocSinh?.ho_ten ?? "?",
      ma_hoc_sinh: hocSinh?.ma_hoc_sinh ?? "?",
      so_tien: pt.so_tien,
      ngay_thu: pt.ngay_thu,
      hinh_thuc: pt.hinh_thuc,
      la_phieu_dao: pt.la_phieu_dao,
      ghi_chu: pt.ghi_chu,
      nguoi_thu_ten: pt.nguoi_thu_ten ?? "?",
      bien_lai: bienLai,
    };
  });

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Thu tiền</h1>
      </div>

      <nav className={styles.subNav}>
        <Link href="/dashboard/hoc-phi" className={styles.subNavLink}>Tổng quan</Link>
        <Link href="/dashboard/hoc-phi/goi" className={styles.subNavLink}>Gói học phí</Link>
        <Link href="/dashboard/hoc-phi/hop-dong" className={styles.subNavLink}>Hợp đồng</Link>
        <Link href="/dashboard/hoc-phi/thu-tien" className={`${styles.subNavLink} ${styles.subNavLinkActive}`}>Thu tiền</Link>
        <Link href="/dashboard/hoc-phi/yeu-cau-sua" className={styles.subNavLink}>Yêu cầu sửa</Link>
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
            <h2 className={styles.cardTitle}>Ghi phiếu thu</h2>
            {canEdit ? (
              <PhieuThuForm hopDongList={hopDongCoTheThu} nguoiDungHienTai={nguoiDungHienTai} />
            ) : (
              <p className={styles.noticeBox}>Bạn không có quyền ghi phiếu thu.</p>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Lịch sử phiếu thu ({total})</h2>
            {(total > 0 || q) && (
              <OTimKiem q={q} placeholder="Tìm theo mã phiếu, học sinh, số tiền, người thu, ghi chú..." ketQua={total} />
            )}
            {quaRong && (
              <p className={styles.noticeBox}>Từ khoá khớp quá nhiều học sinh nên kết quả có thể thiếu — hãy nhập cụ thể hơn.</p>
            )}
            {total > 0 ? (
              <>
                <PhieuThuTable list={phieuThuRows} />
                <PhanTrang total={total} page={pp.page} size={pp.size} />
              </>
            ) : (
              <p className={styles.empty}>{q ? `Không có phiếu thu nào khớp "${q}".` : "Chưa có phiếu thu nào."}</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}

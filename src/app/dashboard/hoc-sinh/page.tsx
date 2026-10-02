import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PhanTrang from "@/components/PhanTrang";
import HocSinhSubNav from "@/components/HocSinhSubNav";
import HocSinhTable, { type HocSinhRow } from "@/components/HocSinhTable";
import { apDungBoLoc, parseBoLoc } from "@/lib/hoc-sinh-loc";
import { duongDanTrangCuoi, parsePhanTrang, type RawSearchParams } from "@/lib/phan-trang";
import styles from "./hoc-sinh.module.css";

// Phòng trường hợp dữ liệu cũ (trước khi đổi cột sang text[]) vẫn còn ở dạng
// chuỗi đơn — tránh crash .map() ở client component.
function chuanHoaMang(v: unknown): string[] | null {
  if (v == null) return null;
  if (Array.isArray(v)) return v;
  return [String(v)];
}

export default async function HocSinhPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;
  const pp = parsePhanTrang(raw);
  const boLoc = parseBoLoc(raw);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: lopList },
    { data: userChiNhanhList },
    { data: chiNhanhList },
  ] = await Promise.all([
    supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single(),
    supabase.from("lop").select("id, ma_lop, ten_lop, chi_nhanh_id").is("deleted_at", null).order("ma_lop", { ascending: false }),
    supabase.from("user_chi_nhanh").select("chi_nhanh_id").eq("user_id", user.id),
    supabase.from("chi_nhanh").select("id, ten").is("deleted_at", null).order("ten"),
  ]);

  // Chỉ lấy đúng 1 trang học sinh (đã lọc phía server) từ view
  // v_hoc_sinh_danh_sach (security_invoker — RLS áp theo người xem).
  const { data: hocSinhList, count } = await apDungBoLoc(
    supabase.from("v_hoc_sinh_danh_sach").select("*", { count: "exact" }),
    boLoc,
    lopList ?? []
  )
    .order("created_at", { ascending: false })
    .order("id")
    .range(pp.from, pp.to);

  const total = count ?? 0;
  const trangCuoi = duongDanTrangCuoi("/dashboard/hoc-sinh", raw, pp, total);
  if (trangCuoi) redirect(trangCuoi);

  const isActive = profile?.trang_thai === "active";
  const isMasterAdmin = isActive && profile?.vai_tro === "master_admin";
  const isAdminTs = isActive && profile?.vai_tro === "admin_ts";
  const isQuanLyChiNhanh = isActive && profile?.vai_tro === "quan_ly_chi_nhanh";
  const isAllowed = isMasterAdmin || isAdminTs || isQuanLyChiNhanh;
  const canDelete = isMasterAdmin;

  const myChiNhanhIds = new Set((userChiNhanhList ?? []).map((uc) => uc.chi_nhanh_id));
  const lopIdsTrongPhamVi = new Set(
    (lopList ?? []).filter((l) => l.chi_nhanh_id != null && myChiNhanhIds.has(l.chi_nhanh_id)).map((l) => l.id)
  );

  // Danh sách lớp cho dropdown (tạo học sinh / chuyển lớp): quan_ly_chi_nhanh
  // chỉ thấy lớp trong phạm vi chi nhánh mình — RLS chỉ chặn ghi, không chặn
  // đọc (lop.p_read cho phép đọc mọi lớp), nên phải lọc ở tầng ứng dụng.
  const lopListChoForm = isQuanLyChiNhanh
    ? (lopList ?? []).filter((l) => lopIdsTrongPhamVi.has(l.id))
    : (lopList ?? []);

  const chiNhanhListChoForm = isQuanLyChiNhanh
    ? (chiNhanhList ?? []).filter((c) => myChiNhanhIds.has(c.id))
    : (chiNhanhList ?? []);

  const lopMap = new Map((lopList ?? []).map((l) => [l.id, l]));
  const hocSinhRows: HocSinhRow[] = (hocSinhList ?? []).map((hs) => {
    const lop = hs.lop_hien_tai_id != null ? lopMap.get(hs.lop_hien_tai_id) : null;
    return {
      id: hs.id as string,
      stt: hs.stt as number,
      ma_hoc_sinh: hs.ma_hoc_sinh as string,
      ho_ten: hs.ho_ten as string,
      sdt_phu_huynh: hs.sdt_phu_huynh,
      lop_hien_tai_id: hs.lop_hien_tai_id,
      lop_hien_tai: lop ? (lop.ten_lop ? `${lop.ma_lop} — ${lop.ten_lop}` : lop.ma_lop) : null,
      tinh_trang_dang_ky: chuanHoaMang(hs.tinh_trang_dang_ky),
      ngay_sinh: hs.ngay_sinh,
      gioi_tinh: hs.gioi_tinh,
      email: hs.email,
      sdt_hoc_sinh: hs.sdt_hoc_sinh,
      cccd: hs.cccd,
      truong_thpt: hs.truong_thpt,
      khoi_thi: hs.khoi_thi,
      nv1: hs.nv1,
      ten_phu_huynh: hs.ten_phu_huynh,
      dia_chi: hs.dia_chi,
      ghi_danh_id: hs.ghi_danh_id,
      trang_thai_ghi_danh: hs.trang_thai_ghi_danh,
      coTheSua:
        isMasterAdmin ||
        isAdminTs ||
        (isQuanLyChiNhanh && hs.lop_hien_tai_id != null && lopIdsTrongPhamVi.has(hs.lop_hien_tai_id)),
    };
  });

  const dangLoc = Boolean(boLoc.q || boLoc.lop || boLoc.cn || boLoc.tt);

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Học sinh</h1>
      </div>

      <HocSinhSubNav active="danh-sach" canCreate={isAllowed} />

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Tra cứu &amp; xuất danh sách học sinh ({total})</h2>
        {/* Bộ lọc luôn hiện để người dùng xoá được bộ lọc kể cả khi kết quả rỗng. */}
        <HocSinhTable
          list={hocSinhRows}
          lopList={lopListChoForm}
          chiNhanhList={chiNhanhListChoForm}
          canDelete={canDelete}
          boLoc={boLoc}
          total={total}
          dangLoc={dangLoc}
        />
        <PhanTrang total={total} page={pp.page} size={pp.size} />
      </section>
    </main>
  );
}

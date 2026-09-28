import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { redirect } from "next/navigation";
import styles from "./dashboard.module.css";

// Dashboard theo vai trò — 3 nhóm giao diện, khớp phân quyền RLS thật của
// từng bảng (không chỉ khớp tên vai trò):
//   1. "Admin" (master_admin/admin_ts/admin_ht/ke_toan/thu_ngan/quan_ly_chi_nhanh)
//      — nhiều số liệu nhất, nhưng MỖI nhóm chỉ hiện nếu vai trò đó thật sự
//      có policy SELECT trên bảng tương ứng (vd admin_ht không đọc được
//      hop_dong_hoc_phi/phieu_thu/ky_dong_hoc_phi — xem ghi chú QUYEN_ADMIN).
//   2. "Trưởng bộ môn / GV" (truong_bm/gv) — chỉ học sinh đang phụ trách +
//      học liệu của mình đang quản lý, không có số liệu tài chính/học phí.
//   3. "Trợ giảng" (tro_giang) — không có thẻ số liệu nào, chỉ khối nghiệp vụ.
// Thiết kế đã được duyệt trên canvas — xem mô tả lưu trong project docs.

const VAI_TRO_LABEL: Record<string, string> = {
  master_admin: "Master Admin",
  admin_ts: "Admin Tuyển sinh",
  admin_ht: "Admin Hiệu trưởng",
  truong_bm: "Trưởng bộ môn",
  gv: "Giáo viên",
  ke_toan: "Kế toán",
  thu_ngan: "Thu ngân",
  quan_ly_chi_nhanh: "Quản lý chi nhánh",
  tro_giang: "Trợ giảng",
};

const ADMIN_TIER = ["master_admin", "admin_ts", "admin_ht", "ke_toan", "thu_ngan", "quan_ly_chi_nhanh"];
const GV_TIER = ["truong_bm", "gv"];
const TRO_GIANG_TIER = ["tro_giang"];

// Khớp đúng theo pg_policies thật trên production (kiểm tra 28/09/2026) —
// KHÔNG suy đoán theo "vai trò nghe có vẻ admin thì chắc xem được hết".
function quyenAdmin(vaiTro: string) {
  const taiChinh = ["master_admin", "ke_toan", "thu_ngan", "admin_ts"].includes(vaiTro); // phieu_thu + ky_dong_hoc_phi
  return {
    taiChinh, // phieu_thu, ky_dong_hoc_phi — quan_ly_chi_nhanh KHÔNG có policy nào trên 2 bảng này
    hopDong: ["master_admin", "ke_toan", "thu_ngan", "admin_ts", "quan_ly_chi_nhanh"].includes(vaiTro), // hop_dong_hoc_phi
    vanHanh: true, // lop/buoi_hoc/phong_hoc/chi_nhanh — RLS đọc mở cho mọi vai trò đã đăng nhập
    nganHangCauHoi: ["master_admin", "admin_ht"].includes(vaiTro), // cau_hoi — ke_toan/thu_ngan/admin_ts/quan_ly_chi_nhanh không có policy đọc
  };
}

function tenVaiTro(vaiTro: string) {
  return VAI_TRO_LABEL[vaiTro] ?? vaiTro;
}

function chuCaiDau(s: string) {
  return (s.trim()[0] ?? "?").toUpperCase();
}

function formatTien(n: number | null) {
  if (n === null) return "—";
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

function formatSo(n: number | null) {
  return n === null ? "—" : new Intl.NumberFormat("vi-VN").format(n);
}

// Biên UTC gần đúng cho "hôm nay"/"tháng này" theo giờ VN (UTC+7) — đủ dùng
// cho số liệu tổng quan trên dashboard, không cần chính xác tuyệt đối theo giây.
function bienNgayVN() {
  const nowUtcMs = Date.now();
  const nowVN = new Date(nowUtcMs + 7 * 3600 * 1000);
  const y = nowVN.getUTCFullYear();
  const m = nowVN.getUTCMonth();
  const d = nowVN.getUTCDate();
  const dow = nowVN.getUTCDay(); // 0=CN
  const toUtcIso = (yy: number, mm: number, dd: number) => new Date(Date.UTC(yy, mm, dd, -7, 0, 0)).toISOString();

  const dauNgay = toUtcIso(y, m, d);
  const dauNgayMai = toUtcIso(y, m, d + 1);
  const dauThang = toUtcIso(y, m, 1);
  const dauThangSau = toUtcIso(y, m + 1, 1);
  const soNgayLuiVeThuHai = dow === 0 ? 6 : dow - 1;
  const dauTuan = toUtcIso(y, m, d - soNgayLuiVeThuHai);
  const dauTuanSau = toUtcIso(y, m, d - soNgayLuiVeThuHai + 7);
  const homNay = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return { dauNgay, dauNgayMai, dauThang, dauThangSau, dauTuan, dauTuanSau, homNay };
}

async function demSoLuong(
  q: PromiseLike<{ count: number | null; error: { message: string } | null }>
): Promise<number | null> {
  const { count, error } = await q;
  if (error) return null;
  return count ?? 0;
}

async function tongSoTienPhieuThu(
  supabase: Awaited<ReturnType<typeof createClient>>,
  choPhep: boolean,
  dauNgay: string,
  dauNgayKe: string
): Promise<number | null> {
  if (!choPhep) return null;
  const { data, error } = await supabase.from("phieu_thu").select("so_tien").gte("ngay_thu", dauNgay).lt("ngay_thu", dauNgayKe);
  if (error || !data) return null;
  return data.reduce((s: number, r: { so_tien: number }) => s + (r.so_tien ?? 0), 0);
}

async function tongConNoKyDong(
  supabase: Awaited<ReturnType<typeof createClient>>,
  choPhep: boolean
): Promise<number | null> {
  if (!choPhep) return null;
  const { data, error } = await supabase
    .from("ky_dong_hoc_phi")
    .select("so_tien_du_kien")
    .in("trang_thai", ["cho_thu", "dong_mot_phan", "qua_han"]);
  if (error || !data) return null;
  return data.reduce((s: number, r: { so_tien_du_kien: number }) => s + (r.so_tien_du_kien ?? 0), 0);
}

async function soPhongDangSuDung(
  supabase: Awaited<ReturnType<typeof createClient>>,
  homNay: string
): Promise<number | null> {
  const { data, error } = await supabase.from("buoi_hoc").select("phong_hoc_id").eq("ngay", homNay).neq("trang_thai", "huy");
  if (error || !data) return null;
  return new Set(data.map((r: { phong_hoc_id: string | null }) => r.phong_hoc_id).filter(Boolean)).size;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("vai_tro, trang_thai, ho_ten")
    .eq("id", user.id)
    .single();

  const isActive = profile?.trang_thai === "active";
  const vaiTro = profile?.vai_tro ?? "";
  const tenHienThi = profile?.ho_ten?.trim() || user.email?.split("@")[0] || "bạn";

  const header = (
    <header className={styles.header}>
      <div className={styles.brand}>
        <Image
          src="/brand/nonsense-edu-logo-horizontal.png"
          alt="Nonsense Education"
          width={220}
          height={66}
          priority
          className={styles.logoImg}
        />
        {isActive && vaiTro && <span className={styles.roleBadge}>{tenVaiTro(vaiTro)}</span>}
      </div>
      <div className={styles.headerRight}>
        <div className={styles.userChip}>
          <div className={styles.avatar}>{chuCaiDau(tenHienThi)}</div>
          <div className={styles.userMeta}>
            <span className={styles.userName}>{tenHienThi}</span>
            <span className={styles.userRole}>{user.email}</span>
          </div>
        </div>
        <div className={styles.divider} />
        <form action={signOut}>
          <button type="submit" className={styles.btnSignOut}>
            Đăng xuất
          </button>
        </form>
      </div>
    </header>
  );

  if (!isActive || !vaiTro) {
    return (
      <main className={styles.page}>
        {header}
        <div className={styles.content}>
          <div className={styles.greeting}>
            <div>
              <h1 className={styles.greetingTitle}>Xin chào, {tenHienThi}</h1>
              <span className={styles.greetingSub}>
                {isActive ? "Tài khoản chưa được gán vai trò." : "Tài khoản đang chờ Admin duyệt (trang_thai khác active)."}
              </span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (ADMIN_TIER.includes(vaiTro)) {
    return <AdminDashboard vaiTro={vaiTro} tenHienThi={tenHienThi} header={header} />;
  }
  if (GV_TIER.includes(vaiTro)) {
    return <GvDashboard vaiTro={vaiTro} tenHienThi={tenHienThi} header={header} userId={user.id} />;
  }
  if (TRO_GIANG_TIER.includes(vaiTro)) {
    return <TroGiangDashboard header={header} tenHienThi={tenHienThi} />;
  }

  // Vai trò lạ (không nằm trong 3 nhóm đã biết) — vẫn cho vào, chỉ hiện khối
  // nghiệp vụ như Trợ giảng, tránh chặn cứng người dùng vì thiếu ánh xạ.
  return <TroGiangDashboard header={header} tenHienThi={tenHienThi} />;
}

/* ────────────────────────────────────────────────────────────────────── */
/* 1) ADMIN                                                                */
/* ────────────────────────────────────────────────────────────────────── */

async function AdminDashboard({
  vaiTro,
  tenHienThi,
  header,
}: {
  vaiTro: string;
  tenHienThi: string;
  header: ReactNode;
}) {
  const supabase = await createClient();
  const quyen = quyenAdmin(vaiTro);
  const { dauNgay, dauNgayMai, dauThang, dauThangSau, homNay } = bienNgayVN();

  const [
    doanhThuThang,
    phieuThuHomNay,
    congNoChuaThu,
    hopDongHoatDong,
    hopDongChoDuyet,
    kyDongQuaHan,
    buoiHocHomNay,
    soPhongDangDung,
    chiNhanhHoatDong,
    tongCauHoi,
    cauHoiChoDuyet,
    cauHoiDaDuyetThang,
  ] = await Promise.all([
    tongSoTienPhieuThu(supabase, quyen.taiChinh, dauThang, dauThangSau),
    quyen.taiChinh
      ? demSoLuong(supabase.from("phieu_thu").select("id", { count: "exact", head: true }).gte("ngay_thu", dauNgay).lt("ngay_thu", dauNgayMai))
      : Promise.resolve(null),
    tongConNoKyDong(supabase, quyen.taiChinh),
    quyen.hopDong
      ? demSoLuong(supabase.from("hop_dong_hoc_phi").select("id", { count: "exact", head: true }).eq("trang_thai", "dang_hoat_dong"))
      : Promise.resolve(null),
    quyen.hopDong
      ? demSoLuong(supabase.from("hop_dong_hoc_phi").select("id", { count: "exact", head: true }).eq("trang_thai", "cho_duyet"))
      : Promise.resolve(null),
    quyen.taiChinh
      ? demSoLuong(supabase.from("ky_dong_hoc_phi").select("id", { count: "exact", head: true }).eq("trang_thai", "qua_han"))
      : Promise.resolve(null),
    demSoLuong(supabase.from("buoi_hoc").select("id", { count: "exact", head: true }).eq("ngay", homNay).neq("trang_thai", "huy")),
    soPhongDangSuDung(supabase, homNay),
    demSoLuong(supabase.from("chi_nhanh").select("id", { count: "exact", head: true })),
    quyen.nganHangCauHoi
      ? demSoLuong(supabase.from("cau_hoi").select("id", { count: "exact", head: true }).is("deleted_at", null))
      : Promise.resolve(null),
    quyen.nganHangCauHoi
      ? demSoLuong(supabase.from("cau_hoi").select("id", { count: "exact", head: true }).eq("trang_thai", "cho_duyet"))
      : Promise.resolve(null),
    quyen.nganHangCauHoi
      ? demSoLuong(
          supabase
            .from("cau_hoi")
            .select("id", { count: "exact", head: true })
            .eq("trang_thai", "da_duyet")
            .gte("ngay_duyet", dauThang)
            .lt("ngay_duyet", dauThangSau)
        )
      : Promise.resolve(null),
  ]);

  const coNhomTaiChinhHoacHocPhi = quyen.taiChinh || quyen.hopDong;

  return (
    <main className={styles.page}>
      {header}
      <div className={styles.content}>
        <div className={styles.greeting}>
          <div>
            <h1 className={styles.greetingTitle}>Xin chào, {tenHienThi}</h1>
            <span className={styles.greetingSub}>Toàn cảnh các khối nghiệp vụ trong phạm vi vai trò của bạn</span>
          </div>
          <span className={styles.updatedTag}>Cập nhật lần cuối: hôm nay</span>
        </div>

        <div className={styles.groupsWrap}>
          {coNhomTaiChinhHoacHocPhi && (
            <>
              {quyen.taiChinh && (
                <div className={styles.group}>
                  <div className={styles.groupHead}>
                    <IconTaiChinh />
                    <span className={styles.groupLabel}>Tài chính</span>
                    <span className={styles.groupHint}>Chỉ kế toán / thu ngân / admin_ts / master_admin</span>
                  </div>
                  <div className={styles.statGrid}>
                    <StatCard label="Doanh thu tháng này" value={formatTien(doanhThuThang)} />
                    <StatCard label="Công nợ chưa thu" value={formatTien(congNoChuaThu)} />
                    <StatCard label="Phiếu thu hôm nay" value={formatSo(phieuThuHomNay)} />
                  </div>
                </div>
              )}

              {quyen.hopDong && (
                <div className={styles.group}>
                  <div className={styles.groupHead}>
                    <IconHopDong />
                    <span className={styles.groupLabel}>Học phí</span>
                  </div>
                  <div className={styles.statGrid}>
                    <StatCard label="Hợp đồng đang hoạt động" value={formatSo(hopDongHoatDong)} />
                    <StatCard label="Chờ duyệt" value={formatSo(hopDongChoDuyet)} tag={hopDongChoDuyet && hopDongChoDuyet > 0 ? { text: "cần xử lý", kind: "warn" } : undefined} />
                    {quyen.taiChinh ? (
                      <StatCard label="Kỳ đóng quá hạn" value={formatSo(kyDongQuaHan)} tag={kyDongQuaHan && kyDongQuaHan > 0 ? { text: "trễ hạn", kind: "danger" } : undefined} />
                    ) : (
                      <div className={styles.lockedCard}>
                        <span className={styles.lockedLabel}>Kỳ đóng quá hạn</span>
                        <span className={styles.lockedNote}>Chỉ Kế toán / Thu ngân / Admin Tuyển sinh / Master Admin xem được.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <div className={styles.group}>
            <div className={styles.groupHead}>
              <IconVanHanh />
              <span className={styles.groupLabel}>Vận hành</span>
            </div>
            <div className={styles.statGrid}>
              <StatCard label="Buổi học hôm nay" value={formatSo(buoiHocHomNay)} />
              <StatCard label="Phòng đang sử dụng hôm nay" value={formatSo(soPhongDangDung)} />
              <StatCard label="Chi nhánh hoạt động" value={formatSo(chiNhanhHoatDong)} />
            </div>
          </div>

          {quyen.nganHangCauHoi ? (
            <div className={styles.group}>
              <div className={styles.groupHead}>
                <IconHocLieu />
                <span className={styles.groupLabel}>Ngân hàng câu hỏi</span>
              </div>
              <div className={styles.statGrid}>
                <StatCard label="Tổng câu hỏi" value={formatSo(tongCauHoi)} />
                <StatCard label="Chờ duyệt" value={formatSo(cauHoiChoDuyet)} tag={cauHoiChoDuyet && cauHoiChoDuyet > 0 ? { text: "cần duyệt", kind: "warn" } : undefined} />
                <StatCard label="Đã duyệt tháng này" value={formatSo(cauHoiDaDuyetThang)} />
              </div>
            </div>
          ) : (
            <div className={styles.group}>
              <div className={styles.groupHead}>
                <IconHocLieu />
                <span className={styles.groupLabel}>Ngân hàng câu hỏi</span>
              </div>
              <div className={styles.lockedCard}>
                <span className={styles.lockedNote}>
                  Vai trò {tenVaiTro(vaiTro)} không có quyền đọc bảng câu hỏi (chỉ Master Admin / Admin Hiệu trưởng / Trưởng bộ môn / GV trong phạm vi môn).
                </span>
              </div>
            </div>
          )}
        </div>

        <ChartsPlaceholder
          items={[
            { title: "Doanh thu 6 tháng gần nhất", kind: "Biểu đồ đường" },
            { title: "Học sinh theo chi nhánh", kind: "Biểu đồ cột" },
          ]}
        />

        <ModuleGridFull />
      </div>
    </main>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/* 2) TRƯỞNG BỘ MÔN / GV                                                  */
/* ────────────────────────────────────────────────────────────────────── */

async function GvDashboard({
  vaiTro,
  tenHienThi,
  header,
  userId,
}: {
  vaiTro: string;
  tenHienThi: string;
  header: ReactNode;
  userId: string;
}) {
  const supabase = await createClient();
  const { dauTuan, dauTuanSau } = bienNgayVN();

  const { data: buoiHocRows } = await supabase
    .from("buoi_hoc")
    .select("lop_id")
    .eq("gv_id", userId)
    .is("deleted_at", null)
    .neq("trang_thai", "huy");
  const lopIds = Array.from(new Set((buoiHocRows ?? []).map((r: { lop_id: string }) => r.lop_id)));

  const [buoiHocTuanNay, hocSinhPhuTrach, cauHoiDaTao, cauHoiChoDuyet, cauHoiDaDuyet] = await Promise.all([
    demSoLuong(
      supabase
        .from("buoi_hoc")
        .select("id", { count: "exact", head: true })
        .eq("gv_id", userId)
        .neq("trang_thai", "huy")
        .gte("ngay", dauTuan)
        .lt("ngay", dauTuanSau)
    ),
    lopIds.length > 0
      ? demSoLuong(
          supabase
            .from("ghi_danh")
            .select("hoc_sinh_id", { count: "exact", head: true })
            .in("lop_id", lopIds)
            .eq("trang_thai", "dang_hoc")
        )
      : Promise.resolve(0),
    demSoLuong(supabase.from("cau_hoi").select("id", { count: "exact", head: true }).eq("nguoi_tao", userId).is("deleted_at", null)),
    demSoLuong(supabase.from("cau_hoi").select("id", { count: "exact", head: true }).eq("nguoi_tao", userId).eq("trang_thai", "cho_duyet")),
    demSoLuong(supabase.from("cau_hoi").select("id", { count: "exact", head: true }).eq("nguoi_tao", userId).eq("trang_thai", "da_duyet")),
  ]);

  return (
    <main className={styles.page}>
      {header}
      <div className={styles.content}>
        <div className={styles.greeting}>
          <div>
            <h1 className={styles.greetingTitle}>Xin chào, {tenHienThi}</h1>
            <span className={styles.greetingSub}>Học sinh đang phụ trách & học liệu bạn đang quản lý</span>
          </div>
          <span className={styles.updatedTag}>Cập nhật lần cuối: hôm nay</span>
        </div>

        <div className={styles.groupsWrap}>
          <div className={styles.group}>
            <div className={styles.groupHead}>
              <IconHocSinh />
              <span className={styles.groupLabel}>Học sinh đang phụ trách</span>
            </div>
            <div className={styles.statGrid}>
              <StatCard label="Tổng học sinh phụ trách" value={formatSo(hocSinhPhuTrach)} />
              <StatCard label="Số lớp đang dạy" value={formatSo(lopIds.length)} />
              <StatCard label="Buổi học tuần này" value={formatSo(buoiHocTuanNay)} />
            </div>
          </div>

          <div className={styles.group}>
            <div className={styles.groupHead}>
              <IconHocLieu />
              <span className={styles.groupLabel}>Học liệu của mình đang quản lý</span>
            </div>
            <div className={styles.statGrid}>
              <StatCard label="Câu hỏi tôi đã tạo" value={formatSo(cauHoiDaTao)} />
              <StatCard label="Đang chờ duyệt" value={formatSo(cauHoiChoDuyet)} tag={cauHoiChoDuyet && cauHoiChoDuyet > 0 ? { text: "cần theo dõi", kind: "warn" } : undefined} />
              <StatCard label="Đã được duyệt" value={formatSo(cauHoiDaDuyet)} tag={cauHoiDaDuyet && cauHoiDaDuyet > 0 ? { text: "", kind: "ok" } : undefined} />
            </div>
          </div>
        </div>

        <ChartsPlaceholder items={[{ title: "Học sinh theo lớp tôi đang dạy", kind: "Biểu đồ cột" }]} />

        <div className={styles.moduleSection}>
          <span className={styles.groupLabel}>Khối nghiệp vụ dành cho bạn</span>
          <div className={styles.moduleGrid}>
            <ModuleCard href="/dashboard/lop" icon={<IconLop />} title="Lớp học" desc="Danh sách lớp đang dạy" />
            <ModuleCard href="/dashboard/hoc-sinh" icon={<IconHocSinh />} title="Học sinh" desc="Hồ sơ học sinh phụ trách" />
            <ModuleCard href="/dashboard/hoc-lieu" icon={<IconHocLieu />} title="Học liệu" desc="Ngân hàng câu hỏi" />
            <ModuleCard href="/dashboard/van-hanh" icon={<IconVanHanh />} title="Vận hành" desc="Lịch buổi học" />
          </div>
          <span className={styles.noteSmall}>
            * Không hiển thị số liệu tài chính/học phí — theo đúng phân quyền của vai trò {tenVaiTro(vaiTro)}.
          </span>
        </div>
      </div>
    </main>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/* 3) TRỢ GIẢNG — không có bảng biểu, chỉ khối nghiệp vụ                  */
/* ────────────────────────────────────────────────────────────────────── */

function TroGiangDashboard({ header, tenHienThi }: { header: ReactNode; tenHienThi: string }) {
  return (
    <main className={styles.page}>
      {header}
      <div className={styles.welcomeWrap}>
        <div className={styles.welcomeHead}>
          <h1 className={styles.welcomeTitle}>Xin chào, {tenHienThi}</h1>
          <span className={styles.welcomeSub}>
            Chọn một khối nghiệp vụ bên dưới để bắt đầu. Tài khoản trợ giảng chỉ tra cứu học liệu qua các lối vào
            được cấp quyền — không hiển thị số liệu thống kê.
          </span>
        </div>

        <div className={styles.welcomeGrid}>
          <Link href="/dashboard/tro-giang" className={styles.welcomeCard}>
            <div className={styles.welcomeIconWrap}>
              <IconTroGiang className={styles.welcomeIcon} />
            </div>
            <div>
              <div className={styles.welcomeCardTitle}>Trợ giảng — Tra cứu câu hỏi</div>
              <div className={styles.welcomeCardDesc}>Xem danh mục & chi tiết câu hỏi theo môn học trong phạm vi được phân quyền.</div>
            </div>
          </Link>

          <div className={`${styles.welcomeCard} ${styles.welcomeCardLocked}`}>
            <div className={styles.welcomeIconWrap}>
              <IconLop className={styles.welcomeIcon} />
            </div>
            <div>
              <div className={styles.welcomeCardTitle}>Lớp học</div>
              <div className={styles.welcomeCardDesc}>Chưa được cấp quyền truy cập trực tiếp.</div>
            </div>
          </div>
        </div>

        <div className={styles.welcomeFootnote}>
          <svg width="14" height="14" viewBox="0 0 24 24" style={{ stroke: "var(--text-lo)", fill: "none", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" }}>
            <circle cx="12" cy="12" r="9.5" />
            <path d="M12 8v5M12 16.2v.1" />
          </svg>
          Dữ liệu chỉ truy cập qua hàm RPC có kiểm tra quyền — không đọc trực tiếp bảng câu hỏi/lựa chọn.
        </div>
      </div>
    </main>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/* Thành phần dùng chung                                                  */
/* ────────────────────────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  tag,
}: {
  label: string;
  value: string;
  tag?: { text: string; kind: "warn" | "danger" | "ok" };
}) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statCardRow}>
        <div>
          <div className={styles.statLabel}>{label}</div>
          <div className={styles.statValue}>{value}</div>
        </div>
        {tag && tag.text && (
          <span className={`${styles.tag} ${tag.kind === "warn" ? styles.tagWarn : tag.kind === "danger" ? styles.tagDanger : styles.tagOk}`}>
            {tag.text}
          </span>
        )}
      </div>
    </div>
  );
}

function ChartsPlaceholder({ items }: { items: { title: string; kind: string }[] }) {
  return (
    <div className={styles.chartsRow} style={items.length === 1 ? { gridTemplateColumns: "1fr" } : undefined}>
      {items.map((it) => (
        <div className={styles.chartCard} key={it.title}>
          <div className={styles.chartCardHead}>
            <span className={styles.chartCardTitle}>{it.title}</span>
            <span className={styles.chartCardKind}>{it.kind}</span>
          </div>
          <div className={styles.chartPlaceholder}>
            <svg width="28" height="28" viewBox="0 0 24 24" style={{ stroke: "var(--text-lo)", fill: "none", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" }}>
              <path d="M4 20V10" />
              <path d="M11 20V4" />
              <path d="M18 20v-7" />
              <path d="M2 20h20" />
            </svg>
            <span className={styles.chartPlaceholderText}>Biểu đồ sẽ hiển thị tại đây</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ModuleCard({ href, icon, title, desc }: { href: string; icon: ReactNode; title: string; desc: string }) {
  return (
    <Link href={href} className={styles.moduleCard}>
      <div className={styles.moduleIconWrap}>{icon}</div>
      <div className={styles.moduleText}>
        <span className={styles.moduleTitle}>{title}</span>
        <span className={styles.moduleDesc}>{desc}</span>
      </div>
    </Link>
  );
}

function ModuleGridFull() {
  return (
    <div className={styles.moduleSection}>
      <span className={styles.groupLabel}>Khối nghiệp vụ</span>
      <div className={styles.moduleGrid8}>
        <ModuleCard href="/dashboard/lop" icon={<IconLop />} title="Lớp học" desc="Danh sách & quản lý lớp" />
        <ModuleCard href="/dashboard/hoc-sinh" icon={<IconHocSinh />} title="Học sinh" desc="Hồ sơ & ghi danh" />
        <ModuleCard href="/dashboard/hoc-phi" icon={<IconHopDong />} title="Học phí" desc="Hợp đồng & thu tiền" />
        <ModuleCard href="/dashboard/chi-nhanh" icon={<IconChiNhanh />} title="Chi nhánh" desc="Cơ sở & phân quyền" />
        <ModuleCard href="/dashboard/van-hanh" icon={<IconVanHanh />} title="Vận hành" desc="Phòng học & buổi học" />
        <ModuleCard href="/dashboard/hoc-lieu" icon={<IconHocLieu />} title="Học liệu" desc="Ngân hàng câu hỏi" />
        <ModuleCard href="/dashboard/tro-giang" icon={<IconTroGiang />} title="Trợ giảng" desc="Tra cứu câu hỏi" />
        <ModuleCard href="/dashboard/users" icon={<IconNguoiDung />} title="Người dùng" desc="Vai trò & phân quyền" />
      </div>
    </div>
  );
}

/* ── Icon set (inline stroke SVG, không dùng emoji) ────────────────────── */
function IconTaiChinh() {
  return (
    <svg className={styles.groupIcon} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9.5" />
      <path d="M8.5 15.5c.6.9 1.7 1.5 3 1.5 1.9 0 3.5-1.1 3.5-2.6 0-3.2-6.5-1.4-6.5-4.6 0-1.5 1.6-2.6 3.5-2.6 1.3 0 2.4.6 3 1.5" />
      <path d="M12 6v1.3M12 16.7V18" />
    </svg>
  );
}
function IconHopDong() {
  return (
    <svg className={styles.groupIcon} viewBox="0 0 24 24">
      <rect x="2.5" y="6" width="19" height="13" rx="2.5" />
      <path d="M2.5 10h19" />
      <path d="M6 14h4" />
    </svg>
  );
}
function IconVanHanh() {
  return (
    <svg className={styles.groupIcon} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="2.6" />
      <path d="M12 3v2.4M12 18.6V21M21 12h-2.4M5.4 12H3M18.1 5.9l-1.7 1.7M7.6 16.4l-1.7 1.7M18.1 18.1l-1.7-1.7M7.6 7.6 5.9 5.9" />
    </svg>
  );
}
function IconHocLieu() {
  return (
    <svg className={styles.groupIcon} viewBox="0 0 24 24">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  );
}
function IconHocSinh() {
  return (
    <svg className={styles.groupIcon} viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}
function IconLop({ className }: { className?: string }) {
  return (
    <svg className={className ?? styles.moduleIcon} viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
    </svg>
  );
}
function IconChiNhanh() {
  return (
    <svg className={styles.moduleIcon} viewBox="0 0 24 24">
      <path d="M4 21V9l8-5 8 5v12" />
      <path d="M9 21v-7h6v7" />
    </svg>
  );
}
function IconTroGiang({ className }: { className?: string }) {
  return (
    <svg className={className ?? styles.moduleIcon} viewBox="0 0 24 24">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16.5 10.5 18 12l3-3.2" />
    </svg>
  );
}
function IconNguoiDung() {
  return (
    <svg className={styles.moduleIcon} viewBox="0 0 24 24">
      <circle cx="8.5" cy="8" r="3" />
      <path d="M2.5 20a6 6 0 0 1 12 0" />
      <path d="M16 8.3a2.7 2.7 0 1 1 3.2 2.65" />
      <path d="M14.5 20a5.2 5.2 0 0 1 8-4.4" />
    </svg>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import UsersTable from "@/components/UsersTable";
import TaiKhoanDaXoaTable from "@/components/TaiKhoanDaXoaTable";
import TaoTaiKhoanForm from "@/components/TaoTaiKhoanForm";
import PhanTrang from "@/components/PhanTrang";
import { duongDanTrangCuoi, parsePhanTrang, type RawSearchParams } from "@/lib/phan-trang";
import styles from "./users.module.css";

export default async function UsersPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  // Trang có 2 bảng nên tách 2 bộ tham số: ?page/?size (tài khoản) và ?xoa_page/?xoa_size (đã xoá).
  const raw = await searchParams;
  const pp = parsePhanTrang(raw);
  const ppXoa = parsePhanTrang(raw, "xoa");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("vai_tro, trang_thai")
    .eq("id", user.id)
    .single();

  const isActive = profile?.trang_thai === "active";
  const isMasterAdmin = isActive && profile?.vai_tro === "master_admin";
  const isAdminHt = isActive && profile?.vai_tro === "admin_ht";

  if (isAdminHt) {
    // admin_ht chỉ được CẤP tài khoản GV/Trợ giảng cho chi nhánh mình quản lý
    // — không có quyền xem/sửa danh sách người dùng khác (quyết định
    // 28/09/2026), nên trang này với họ chỉ là 1 form, không phải danh sách.
    const { data: chiNhanhList } = await supabase
      .from("user_chi_nhanh")
      .select("chi_nhanh:chi_nhanh_id(id, ten)")
      .eq("user_id", user.id);

    const chiNhanhOptions = (chiNhanhList ?? [])
      .map((r) => r.chi_nhanh as unknown as { id: string; ten: string } | null)
      .filter((cn): cn is { id: string; ten: string } => !!cn);

    return (
      <main className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Cấp tài khoản Giáo viên / Trợ giảng</h1>
        </div>

        <section className={styles.card}>
          {chiNhanhOptions.length > 0 ? (
            <TaoTaiKhoanForm vaiTroNguoiGoi="admin_ht" chiNhanhOptions={chiNhanhOptions} />
          ) : (
            <p className={styles.noticeBox}>
              Bạn chưa được gán quản lý chi nhánh nào — liên hệ Master Admin để được gán trước khi cấp tài khoản.
            </p>
          )}
        </section>
      </main>
    );
  }

  if (!isMasterAdmin) {
    return (
      <main className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Người dùng</h1>
        </div>
        <section className={styles.card}>
          <p className={styles.noticeBox}>
            Chỉ Master Admin được quản trị người dùng. Tài khoản của bạn:{" "}
            {isActive ? `vai trò "${profile?.vai_tro ?? "chưa gán"}"` : "tài khoản đang bị khoá (disabled)"}.
          </p>
        </section>
      </main>
    );
  }

  // Master Admin: dùng service role để thấy cả tài khoản đã xoá mềm (bị
  // p_users_read ẩn đi vì lọc deleted_at IS NULL) — quyền đã xác nhận ở trên.
  const admin = createAdminClient();
  const COT = "id, email, ho_ten, vai_tro, trang_thai, deleted_at";
  const [{ data: usersList, count: tongUsers }, { data: daXoaList, count: tongDaXoa }] = await Promise.all([
    admin
      .from("users")
      .select(COT, { count: "exact" })
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .order("id")
      .range(pp.from, pp.to),
    admin
      .from("users")
      .select(COT, { count: "exact" })
      .not("deleted_at", "is", null)
      .order("created_at", { ascending: true })
      .order("id")
      .range(ppXoa.from, ppXoa.to),
  ]);

  const total = tongUsers ?? 0;
  const totalXoa = tongDaXoa ?? 0;
  const trangCuoi = duongDanTrangCuoi("/dashboard/users", raw, pp, total);
  if (trangCuoi) redirect(trangCuoi);
  const trangCuoiXoa = duongDanTrangCuoi("/dashboard/users", raw, ppXoa, totalXoa, "xoa");
  if (trangCuoiXoa) redirect(trangCuoiXoa);

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Người dùng</h1>
        <Link href="/dashboard/users/moi" className={styles.btnPrimaryLink}>+ Tạo tài khoản</Link>
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Danh sách tài khoản ({total})</h2>
        {total > 0 ? (
          <>
            <UsersTable list={usersList ?? []} currentUserId={user.id} />
            <PhanTrang total={total} page={pp.page} size={pp.size} />
          </>
        ) : (
          <p className={styles.empty}>Chưa có tài khoản nào.</p>
        )}
      </section>

      {totalXoa > 0 && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Đã xoá ({totalXoa})</h2>
          <TaiKhoanDaXoaTable list={daXoaList ?? []} />
          <PhanTrang total={totalXoa} page={ppXoa.page} size={ppXoa.size} prefix="xoa" />
        </section>
      )}

      <p className={styles.empty}>
        Gán phạm vi môn học/chi nhánh cho từng tài khoản, đặt lại mật khẩu, hoặc xoá — vào trang{" "}
        <strong>Chi tiết</strong> của tài khoản đó.
      </p>
    </main>
  );
}

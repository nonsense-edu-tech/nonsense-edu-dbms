import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChiNhanhForm from "@/components/ChiNhanhForm";
import ChiNhanhTable, { type ChiNhanhRow, type QuanLyOption } from "@/components/ChiNhanhTable";
import styles from "./chi-nhanh.module.css";

export default async function ChiNhanhPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: chiNhanhList }, { data: userChiNhanhList }, { data: quanLyUserList }] =
    await Promise.all([
      supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single(),
      supabase.from("chi_nhanh").select("id, ma, ten, dia_chi").is("deleted_at", null).order("ma"),
      supabase.from("user_chi_nhanh").select("id, user_id, chi_nhanh_id"),
      supabase.from("users").select("id, email, ho_ten").eq("vai_tro", "quan_ly_chi_nhanh").eq("trang_thai", "active"),
    ]);

  const isActive = profile?.trang_thai === "active";
  const isMasterAdmin = isActive && profile?.vai_tro === "master_admin";
  const canEdit = isMasterAdmin;
  const canDelete = isMasterAdmin;

  const userTenMap = new Map((quanLyUserList ?? []).map((u) => [u.id, u.ho_ten ?? u.email]));

  const quanLyOptions: QuanLyOption[] = (quanLyUserList ?? []).map((u) => ({
    user_id: u.id,
    ten_hien_thi: u.ho_ten ?? u.email,
  }));

  const chiNhanhRows: ChiNhanhRow[] = (chiNhanhList ?? []).map((cn) => ({
    id: cn.id,
    ma: cn.ma,
    ten: cn.ten,
    dia_chi: cn.dia_chi,
    quan_ly: (userChiNhanhList ?? [])
      .filter((uc) => uc.chi_nhanh_id === cn.id)
      .map((uc) => ({
        assignment_id: uc.id,
        user_id: uc.user_id,
        ten_hien_thi: userTenMap.get(uc.user_id) ?? uc.user_id,
      })),
  }));

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Chi nhánh</h1>
        <Link href="/dashboard" className={styles.backLink}>← Về dashboard</Link>
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Tạo chi nhánh mới</h2>
        {isMasterAdmin ? (
          <ChiNhanhForm />
        ) : (
          <p className={styles.noticeBox}>
            Chỉ Master Admin được tạo/sửa chi nhánh. Tài khoản của bạn:{" "}
            {isActive ? `vai trò "${profile?.vai_tro ?? "chưa gán"}"` : "tài khoản đang bị khoá (disabled)"}.
          </p>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Danh sách chi nhánh ({chiNhanhRows.length})</h2>
        {chiNhanhRows.length > 0 ? (
          <ChiNhanhTable list={chiNhanhRows} quanLyOptions={quanLyOptions} canEdit={canEdit} canDelete={canDelete} />
        ) : (
          <p className={styles.empty}>Chưa có chi nhánh nào.</p>
        )}
      </section>

      {isMasterAdmin && quanLyOptions.length === 0 && (
        <p className={styles.empty}>
          Chưa có tài khoản nào mang vai trò &quot;Quản lý chi nhánh&quot; — gán vai trò này ở trang{" "}
          <Link href="/dashboard/users" className={styles.backLink}>Người dùng</Link> trước khi phân công quản lý chi nhánh.
        </p>
      )}
    </main>
  );
}

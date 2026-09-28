import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TaoTaiKhoanForm from "@/components/TaoTaiKhoanForm";
import styles from "../users.module.css";

export default async function TaoTaiKhoanPage() {
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

  if (!isMasterAdmin) redirect("/dashboard/users");

  const { data: chiNhanhList } = await supabase
    .from("chi_nhanh")
    .select("id, ten")
    .is("deleted_at", null)
    .order("ten");

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Tạo tài khoản mới</h1>
        <Link href="/dashboard/users" className={styles.backLink}>← Về danh sách</Link>
      </div>

      <section className={styles.card}>
        <TaoTaiKhoanForm vaiTroNguoiGoi="master_admin" chiNhanhOptions={chiNhanhList ?? []} />
      </section>

      <p className={styles.empty}>
        Tài khoản mới được tạo với mật khẩu mặc định, bắt buộc đổi ở lần đăng nhập đầu. Gán phạm vi môn học chi tiết
        sau khi tạo, ở trang <strong>Chi tiết</strong> của tài khoản.
      </p>
    </main>
  );
}

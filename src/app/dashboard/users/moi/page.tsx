import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TaoNguoiDungMotBuocForm from "@/components/TaoNguoiDungMotBuocForm";
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

  const [{ data: chiNhanhList }, { data: capHocList }, { data: monHocList }, { data: lopList }] = await Promise.all([
    supabase.from("chi_nhanh").select("id, ten").is("deleted_at", null).order("ten"),
    supabase.from("cap_hoc").select("ma, ten").is("deleted_at", null).order("ma"),
    supabase.from("mon_hoc").select("cap_hoc_ma, ma, ten").is("deleted_at", null).order("ma"),
    supabase
      .from("lop")
      .select("id, ma_lop, ten_lop, cap_hoc_ma, chi_nhanh_id")
      .is("deleted_at", null)
      .order("ma_lop", { ascending: false })
      .limit(1000),
  ]);

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Tạo tài khoản mới</h1>
        <Link href="/dashboard/users" className={styles.backLink}>← Về danh sách</Link>
      </div>

      <section className={styles.card}>
        <TaoNguoiDungMotBuocForm
          chiNhanhList={chiNhanhList ?? []}
          capHocList={capHocList ?? []}
          monHocList={monHocList ?? []}
          lopList={lopList ?? []}
        />
      </section>

      <p className={styles.empty}>
        Tài khoản mới được tạo với mật khẩu mặc định, bắt buộc đổi ở lần đăng nhập đầu. Chi nhánh, môn học và phân lớp
        được thiết lập ngay trong bước tạo này.
      </p>
    </main>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { redirect } from "next/navigation";
import styles from "./dashboard.module.css";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("vai_tro, trang_thai")
    .eq("id", user.id)
    .single();

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.badge}>✓ Đã đăng nhập</div>
        <h1 className={styles.title}>Xin chào!</h1>
        <p className={styles.email}>{user.email}</p>
        <p className={styles.note}>
          Vai trò:{" "}
          {profile?.trang_thai === "active"
            ? `"${profile.vai_tro ?? "chưa gán"}"`
            : "chưa được Admin duyệt"}
        </p>
        <nav className={styles.nav}>
          <Link href="/dashboard/lop" className={styles.navLink}>Lớp học</Link>
          <Link href="/dashboard/hoc-sinh" className={styles.navLink}>Học sinh</Link>
          <Link href="/dashboard/hoc-phi" className={styles.navLink}>Học phí</Link>
          <Link href="/dashboard/chi-nhanh" className={styles.navLink}>Chi nhánh</Link>
          <Link href="/dashboard/van-hanh" className={styles.navLink}>Vận hành</Link>
          <Link href="/dashboard/users" className={styles.navLink}>Người dùng</Link>
        </nav>
        <form action={signOut}>
          <button type="submit" className={styles.btnSignOut}>
            Đăng xuất
          </button>
        </form>
      </div>
    </main>
  );
}

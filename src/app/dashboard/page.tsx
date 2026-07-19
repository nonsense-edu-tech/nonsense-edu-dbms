import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { redirect } from "next/navigation";
import styles from "./dashboard.module.css";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.badge}>✓ Đã đăng nhập</div>
        <h1 className={styles.title}>Xin chào!</h1>
        <p className={styles.email}>{user.email}</p>
        <p className={styles.note}>
          Dashboard đang được xây dựng theo lộ trình GĐ1.
          <br />
          Trang đăng nhập đã hoạt động đúng.
        </p>
        <form action={signOut}>
          <button type="submit" className={styles.btnSignOut}>
            Đăng xuất
          </button>
        </form>
      </div>
    </main>
  );
}

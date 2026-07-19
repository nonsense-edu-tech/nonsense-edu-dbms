import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UsersTable from "@/components/UsersTable";
import styles from "./users.module.css";

export default async function UsersPage() {
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
  const isAllowed = isActive && profile?.vai_tro === "master_admin";

  const { data: usersList } = isAllowed
    ? await supabase
        .from("users")
        .select("id, email, ho_ten, vai_tro, trang_thai")
        .order("created_at", { ascending: true })
    : { data: null };

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Người dùng</h1>
        <Link href="/dashboard" className={styles.backLink}>← Về dashboard</Link>
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Danh sách tài khoản ({usersList?.length ?? 0})</h2>
        {!isAllowed ? (
          <p className={styles.noticeBox}>
            Chỉ Master Admin được quản trị người dùng. Tài khoản của bạn:{" "}
            {isActive ? `vai trò "${profile?.vai_tro ?? "chưa gán"}"` : "tài khoản đang bị khoá (disabled)"}.
          </p>
        ) : usersList && usersList.length > 0 ? (
          <UsersTable list={usersList} currentUserId={user.id} />
        ) : (
          <p className={styles.empty}>Chưa có tài khoản nào.</p>
        )}
      </section>

      <p className={styles.empty}>
        Tạo tài khoản mới: mời qua Supabase Dashboard (Authentication → Users), sau đó gán vai trò tại đây.
        Gán phạm vi chi tiết (cấp học/môn học cho admin_ht/truong_bm, bài học cho gv) vẫn làm qua Supabase SQL
        Editor.
      </p>
    </main>
  );
}

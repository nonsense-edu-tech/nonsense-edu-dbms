import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DoiMatKhauForm from "@/components/DoiMatKhauForm";
import styles from "../users/users.module.css";

export default async function DoiMatKhauPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main className={styles.page} style={{ maxWidth: 480 }}>
      <div className={styles.header}>
        <h1 className={styles.title}>Đổi mật khẩu</h1>
      </div>

      <section className={styles.card}>
        <p className={styles.noticeBox} style={{ marginBottom: 20 }}>
          Tài khoản của bạn đang dùng mật khẩu mặc định — bắt buộc đổi trước khi tiếp tục sử dụng hệ thống. Nhập mật khẩu hiện tại (mật khẩu Admin đã cấp cho bạn) rồi đặt mật khẩu mới.
        </p>
        <DoiMatKhauForm />
      </section>
    </main>
  );
}

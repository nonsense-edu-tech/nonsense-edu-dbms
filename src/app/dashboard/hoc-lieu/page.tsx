import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import styles from "./hoc-lieu.module.css";

export default async function HocLieuPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Học liệu</h1>
        <Link href="/dashboard" className={styles.backLink}>← Về dashboard</Link>
      </div>

      <nav className={styles.subNav}>
        <Link href="/dashboard/hoc-lieu" className={`${styles.subNavLink} ${styles.subNavLinkActive}`}>Tổng quan</Link>
        <Link href="/dashboard/hoc-lieu/chu-de" className={styles.subNavLink}>Chủ đề</Link>
        <Link href="/dashboard/hoc-lieu/hoc-phan" className={styles.subNavLink}>Học phần</Link>
        <Link href="/dashboard/hoc-lieu/bai-hoc" className={styles.subNavLink}>Bài học</Link>
      </nav>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Ngân hàng câu hỏi (GĐ3)</h2>
        <p className={styles.noticeBox}>
          Đang triển khai theo lộ trình Bước 5: các bảng mã gốc phục vụ cấp mã câu hỏi —{" "}
          <strong>chủ đề</strong>, <strong>học phần</strong>, <strong>bài học</strong> — đã có ở các mục bên.
          Trang tạo/duyệt/tra cứu câu hỏi sẽ được thêm ở bước kế tiếp.
        </p>
      </section>
    </main>
  );
}

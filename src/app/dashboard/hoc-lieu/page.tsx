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
        <Link href="/dashboard/hoc-lieu/cau-hoi" className={styles.subNavLink}>Câu hỏi</Link>
      </nav>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Ngân hàng câu hỏi (GĐ3)</h2>
        <p className={styles.noticeBox}>
          Bước 5.2: trang <strong>tạo câu hỏi</strong> (cascading chọn cấp học → chương trình → môn → học phần →
          bài học → chủ đề → dạng câu, tự cấp mã 17 số) đã có ở mục <strong>Câu hỏi</strong>. Sửa/duyệt câu hỏi sẽ
          được thêm ở bước kế tiếp (5.3-5.4).
        </p>
      </section>
    </main>
  );
}

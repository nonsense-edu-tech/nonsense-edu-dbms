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
      </div>

      <nav className={styles.subNav}>
        <Link href="/dashboard/hoc-lieu" className={`${styles.subNavLink} ${styles.subNavLinkActive}`}>Tổng quan</Link>
        <Link href="/dashboard/hoc-lieu/cap-hoc" className={styles.subNavLink}>Cấp học</Link>
        <Link href="/dashboard/hoc-lieu/chuong-trinh" className={styles.subNavLink}>Chương trình</Link>
        <Link href="/dashboard/hoc-lieu/mon-hoc" className={styles.subNavLink}>Môn học</Link>
        <Link href="/dashboard/hoc-lieu/chu-de" className={styles.subNavLink}>Chủ đề</Link>
        <Link href="/dashboard/hoc-lieu/hoc-phan" className={styles.subNavLink}>Học phần</Link>
        <Link href="/dashboard/hoc-lieu/bai-hoc" className={styles.subNavLink}>Bài học</Link>
      </nav>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Học liệu</h2>
        <p className={styles.noticeBox}>
          Bảng mã gốc của học thuật, tạo theo thứ tự: <strong>Cấp học</strong> → <strong>Chương trình</strong>{" "}
          (gán môn học vào chương trình ngay trong tab này) → <strong>Môn học</strong> → <strong>Chủ đề</strong> /{" "}
          <strong>Học phần</strong> → <strong>Bài học</strong>. Việc tạo và tra cứu câu hỏi nằm ở mục{" "}
          <Link href="/dashboard/ngan-hang-cau-hoi">Ngân hàng câu hỏi</Link>.
        </p>
      </section>
    </main>
  );
}

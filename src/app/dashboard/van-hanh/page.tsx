import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import styles from "./van-hanh.module.css";

export default async function VanHanhPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single();

  const isActive = profile?.trang_thai === "active";
  const vaiTro = profile?.vai_tro ?? "";

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Vận hành lớp học</h1>
        <Link href="/dashboard" className={styles.backLink}>← Về dashboard</Link>
      </div>

      <nav className={styles.subNav}>
        <Link href="/dashboard/van-hanh" className={`${styles.subNavLink} ${styles.subNavLinkActive}`}>Tổng quan</Link>
        <Link href="/dashboard/van-hanh/loai-phong" className={styles.subNavLink}>Loại phòng</Link>
        <Link href="/dashboard/van-hanh/phong-hoc" className={styles.subNavLink}>Phòng học</Link>
        <Link href="/dashboard/van-hanh/chuong-trinh-mon-hoc" className={styles.subNavLink}>Chương trình - Môn học</Link>
        <Link href="/dashboard/van-hanh/buoi-hoc" className={styles.subNavLink}>Buổi học</Link>
      </nav>

      {!isActive ? (
        <section className={styles.card}>
          <p className={styles.noticeBox}>Tài khoản của bạn đang bị khoá (disabled).</p>
        </section>
      ) : (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Các khối trong "Vận hành"</h2>
          <p className={styles.empty}>
            <strong>Loại phòng</strong> — đơn giá thuê/điện nước/khấu hao theo loại phòng. Chỉ Master Admin/Kế toán
            xem được (dữ liệu chi phí).
            <br />
            <strong>Phòng học</strong> — danh sách phòng vật lý theo chi nhánh. Ai cũng xem được tên phòng, không
            thấy đơn giá.
            <br />
            <strong>Chương trình - Môn học</strong> — môn học nào thuộc chương trình nào (trục Model C).
            <br />
            <strong>Buổi học</strong> — lịch dạy cụ thể theo lớp. Chi phí theo buổi (thù lao GV, chi phí phòng) chỉ
            Master Admin/Kế toán xem/ghi được.
          </p>
          <p className={styles.empty} style={{ marginTop: 12 }}>
            Vai trò hiện tại: &quot;{vaiTro || "chưa gán"}&quot;.
          </p>
        </section>
      )}
    </main>
  );
}

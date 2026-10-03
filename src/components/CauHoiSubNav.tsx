import Link from "next/link";
import styles from "@/app/dashboard/ngan-hang-cau-hoi/ngan-hang-cau-hoi.module.css";

/**
 * Tab con của Ngân hàng câu hỏi. Tab "Tạo câu hỏi" chỉ hiện với vai trò được tạo
 * (quy tắc "ẩn hẳn, không hiện dạng khoá" — giống HocSinhSubNav).
 */
export default function CauHoiSubNav({ active, canCreate }: { active: "tao" | "danh-sach" | "ngu-lieu"; canCreate: boolean }) {
  return (
    <nav className={styles.subNav} aria-label="Ngân hàng câu hỏi">
      {canCreate && (
        <Link
          href="/dashboard/ngan-hang-cau-hoi/tao-moi"
          className={`${styles.subNavLink} ${active === "tao" ? styles.subNavLinkActive : ""}`}
          aria-current={active === "tao" ? "page" : undefined}
        >
          Tạo câu hỏi
        </Link>
      )}
      <Link
        href="/dashboard/ngan-hang-cau-hoi"
        className={`${styles.subNavLink} ${active === "danh-sach" ? styles.subNavLinkActive : ""}`}
        aria-current={active === "danh-sach" ? "page" : undefined}
      >
        Danh sách câu hỏi
      </Link>
      <Link
        href="/dashboard/ngan-hang-cau-hoi/ngu-lieu"
        className={`${styles.subNavLink} ${active === "ngu-lieu" ? styles.subNavLinkActive : ""}`}
        aria-current={active === "ngu-lieu" ? "page" : undefined}
      >
        Danh sách ngữ liệu
      </Link>
    </nav>
  );
}

import Link from "next/link";
import styles from "@/app/dashboard/hoc-sinh/hoc-sinh.module.css";

/**
 * Tab con của mục Học sinh. Tab "Tạo học sinh" chỉ hiện với vai trò được tạo
 * (quy tắc "ẩn hẳn, không hiện dạng khoá" — xem thiet-ke-dashboard-theo-vai-tro).
 */
export default function HocSinhSubNav({
  active,
  canCreate,
}: {
  active: "tao" | "danh-sach";
  canCreate: boolean;
}) {
  return (
    <nav className={styles.subNav} aria-label="Học sinh">
      {canCreate && (
        <Link
          href="/dashboard/hoc-sinh/tao-moi"
          className={`${styles.subNavLink} ${active === "tao" ? styles.subNavLinkActive : ""}`}
          aria-current={active === "tao" ? "page" : undefined}
        >
          Tạo học sinh
        </Link>
      )}
      <Link
        href="/dashboard/hoc-sinh"
        className={`${styles.subNavLink} ${active === "danh-sach" ? styles.subNavLinkActive : ""}`}
        aria-current={active === "danh-sach" ? "page" : undefined}
      >
        Danh sách học sinh
      </Link>
    </nav>
  );
}

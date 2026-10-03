"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "./Breadcrumb.module.css";

// Nhãn tiếng Việt cho từng route — khớp cây route thật dưới src/app/dashboard/**.
// Route không có trong bảng này (hiếm, vd trang lạ) sẽ fallback hiển thị theo
// segment (viết hoa chữ đầu, thay "-" bằng khoảng trắng).
const ROUTE_LABELS: Record<string, string> = {
  "/dashboard": "Trang chủ",
  "/dashboard/lop": "Lớp học",
  "/dashboard/hoc-sinh": "Học sinh",
  "/dashboard/hoc-sinh/tao-moi": "Tạo học sinh",
  "/dashboard/chi-nhanh": "Chi nhánh",
  "/dashboard/users": "Người dùng",
  "/dashboard/tro-giang": "Trợ giảng",
  "/dashboard/hoc-phi": "Học phí",
  "/dashboard/hoc-phi/goi": "Gói học phí",
  "/dashboard/hoc-phi/hop-dong": "Hợp đồng",
  "/dashboard/hoc-phi/thu-tien": "Thu tiền",
  "/dashboard/hoc-lieu": "Học liệu",
  "/dashboard/hoc-lieu/cap-hoc": "Cấp học",
  "/dashboard/hoc-lieu/chuong-trinh": "Chương trình",
  "/dashboard/hoc-lieu/mon-hoc": "Môn học",
  "/dashboard/hoc-lieu/chu-de": "Chủ đề",
  "/dashboard/hoc-lieu/hoc-phan": "Học phần",
  "/dashboard/hoc-lieu/bai-hoc": "Bài học",
  "/dashboard/ngan-hang-cau-hoi": "Ngân hàng câu hỏi",
  "/dashboard/ngan-hang-cau-hoi/tao-moi": "Tạo câu hỏi",
  "/dashboard/ngan-hang-cau-hoi/ngu-lieu": "Danh sách ngữ liệu",
  "/dashboard/de-thi": "Đề thi",
  "/dashboard/de-thi/ma-tran": "Ma trận đề",
  "/dashboard/de-thi/ma-tran/moi": "Soạn ma trận",
  "/dashboard/de-thi/moi": "Tạo đề",
  "/dashboard/van-hanh": "Vận hành",
  "/dashboard/van-hanh/buoi-hoc": "Buổi học",
  "/dashboard/van-hanh/loai-phong": "Loại phòng",
  "/dashboard/van-hanh/phong-hoc": "Phòng học",
};

function nhanCho(path: string, segment: string) {
  return ROUTE_LABELS[path] ?? segment.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

type Crumb = { href: string; label: string };

export default function Breadcrumb() {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown "···" khi điều hướng sang trang khác — điều chỉnh state
  // ngay trong lúc render (theo khuyến nghị của React), không cần effect.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpenMenu(false);
  }

  useEffect(() => {
    if (!openMenu) return;
    function onClickAway(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpenMenu(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [openMenu]);

  const segments = pathname.split("/").filter(Boolean); // ["dashboard", "hoc-lieu", "cau-hoi"]
  const crumbs: Crumb[] = [];
  let acc = "";
  for (const seg of segments) {
    acc += "/" + seg;
    crumbs.push({ href: acc, label: nhanCho(acc, seg) });
  }
  // Luôn có ít nhất "Trang chủ" (trường hợp pathname lạ không bắt đầu bằng /dashboard).
  if (crumbs.length === 0 || crumbs[0].href !== "/dashboard") {
    crumbs.unshift({ href: "/dashboard", label: "Trang chủ" });
  }

  // Chỉ ở trang chủ: hiện 1 mục duy nhất, không cần rút gọn.
  if (crumbs.length <= 1) {
    return (
      <nav aria-label="breadcrumb" className={styles.crumb}>
        <IconHome className={styles.homeIcon} />
        <span className={styles.current}>Trang chủ</span>
      </nav>
    );
  }

  // Nguyên tắc: ưu tiên hiện các bước GẦN NHẤT (áp chót + hiện tại luôn hiện
  // đủ, không bao giờ bị cắt). Phần giữa (nếu path đủ sâu) gộp vào nút "···".
  const home = crumbs[0];
  const last = crumbs[crumbs.length - 1];
  const gioiHan = 4; // home + tối đa 3 bước còn lại thì hiện hết, không cần gộp
  const canRutGon = crumbs.length > gioiHan;
  const hienThi = canRutGon ? crumbs.slice(-2) : crumbs.slice(1);
  const anGiua = canRutGon ? crumbs.slice(1, -2) : [];

  return (
    <nav aria-label="breadcrumb" className={styles.crumb} ref={wrapRef}>
      <Link href={home.href} className={styles.homeLink} title="Trang chủ">
        <IconHome className={styles.homeIcon} />
      </Link>

      {canRutGon && (
        <>
          <span className={styles.sep}>/</span>
          <div className={styles.moreWrap}>
            <button
              type="button"
              className={styles.moreBtn}
              onClick={() => setOpenMenu((v) => !v)}
              title={`${anGiua.length} bước trước: ${anGiua.map((c) => c.label).join(", ")}`}
              aria-expanded={openMenu}
            >
              ···
            </button>
            {openMenu && (
              <div className={styles.dropdown}>
                {anGiua.map((c) => (
                  <Link key={c.href} href={c.href} className={styles.dropdownLink}>
                    {c.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {hienThi.map((c) => {
        const isCurrent = c.href === last.href;
        return (
          <span key={c.href} className={styles.item}>
            <span className={styles.sep}>/</span>
            {isCurrent ? (
              <span className={styles.current}>{c.label}</span>
            ) : (
              <Link href={c.href} className={styles.link}>
                {c.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function IconHome({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9.5A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V10" />
    </svg>
  );
}

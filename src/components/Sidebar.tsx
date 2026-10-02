"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { nhomGiaoDien, tenVaiTro, NGUOI_DUNG_TIER, type NhomGiaoDien } from "@/lib/vai-tro";
import styles from "./Sidebar.module.css";

type NavItem = { href: string; icon: ReactNode; label: string };
type NavGroup = { label: string; items: NavItem[] };

// Cùng nội dung 3 cụm khối nghiệp vụ trước đây nằm trên thân trang dashboard
// (ModuleClustersAdmin/GvDashboard/TroGiangDashboard) — giờ chuyển hết vào
// đây. QUY TẮC CỐ ĐỊNH: role không liên quan đến cụm nào thì KHÔNG hiện cụm
// đó, không hiện dạng khoá/mờ — nên mỗi nhóm liệt kê đúng danh sách nhóm đó
// được thấy, không có "items rỗng nhưng vẫn render tiêu đề cụm".
function navGroupsForNhom(nhom: NhomGiaoDien, vaiTro: string): NavGroup[] {
  if (nhom === "admin") {
    // "Người dùng" chỉ hiện cho vai trò thật sự có quyền (xem NGUOI_DUNG_TIER)
    // — ke_toan/thu_ngan/admin_ts/quan_ly_chi_nhanh không có policy đọc bảng
    // users nên KHÔNG hiện mục này, đúng quy tắc "role không liên quan thì
    // không thấy chức năng" (không hiện dạng khoá/mờ).
    const coQuyenNguoiDung = NGUOI_DUNG_TIER.includes(vaiTro);
    // "Đề thi": RLS chỉ cho master_admin/admin_ht/truong_bm/gv — các vai trò admin-tier khác ẩn hẳn.
    const coQuyenDeThi = ["master_admin", "admin_ht"].includes(vaiTro);
    return [
      {
        label: "Vận hành",
        items: [
          { href: "/dashboard/chi-nhanh", icon: <IconChiNhanh />, label: "Chi nhánh" },
          { href: "/dashboard/lop", icon: <IconLop />, label: "Lớp học" },
          { href: "/dashboard/hoc-sinh", icon: <IconHocSinh />, label: "Học sinh" },
          { href: "/dashboard/van-hanh", icon: <IconVanHanh />, label: "Vận hành" },
          ...(coQuyenNguoiDung ? [{ href: "/dashboard/users", icon: <IconNguoiDung />, label: "Người dùng" }] : []),
        ],
      },
      {
        label: "Học thuật",
        items: [
          { href: "/dashboard/hoc-lieu", icon: <IconHocLieu />, label: "Học liệu" },
          { href: "/dashboard/hoc-lieu/bai-hoc", icon: <IconBaiHoc />, label: "Bài học" },
          { href: "/dashboard/ngan-hang-cau-hoi", icon: <IconCauHoi />, label: "Ngân hàng câu hỏi" },
          ...(coQuyenDeThi ? [{ href: "/dashboard/de-thi", icon: <IconDeThi />, label: "Đề thi" }] : []),
          { href: "/dashboard/tro-giang", icon: <IconTroGiang />, label: "Trợ giảng" },
        ],
      },
      {
        label: "Tài chính",
        items: [{ href: "/dashboard/hoc-phi", icon: <IconHopDong />, label: "Học phí" }],
      },
    ];
  }
  if (nhom === "gv") {
    return [
      {
        label: "Vận hành",
        items: [
          { href: "/dashboard/lop", icon: <IconLop />, label: "Lớp học" },
          { href: "/dashboard/hoc-sinh", icon: <IconHocSinh />, label: "Học sinh" },
          { href: "/dashboard/van-hanh", icon: <IconVanHanh />, label: "Vận hành" },
        ],
      },
      {
        label: "Học thuật",
        items: [
          { href: "/dashboard/hoc-lieu", icon: <IconHocLieu />, label: "Học liệu" },
          { href: "/dashboard/hoc-lieu/bai-hoc", icon: <IconBaiHoc />, label: "Bài học" },
          { href: "/dashboard/ngan-hang-cau-hoi", icon: <IconCauHoi />, label: "Ngân hàng câu hỏi" },
          { href: "/dashboard/de-thi", icon: <IconDeThi />, label: "Đề thi" },
          { href: "/dashboard/tro-giang", icon: <IconTroGiang />, label: "Trợ giảng" },
        ],
      },
    ];
  }
  // tro_giang + vai trò lạ chưa ánh xạ
  return [
    {
      label: "Học thuật",
      items: [{ href: "/dashboard/tro-giang", icon: <IconTroGiang />, label: "Trợ giảng" }],
    },
  ];
}

const STORAGE_KEY = "nonsense-edu:sidebar-collapsed";

export default function Sidebar({ vaiTro }: { vaiTro: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // localStorage không khả dụng (ví dụ private mode chặn) — giữ mặc định mở rộng.
    }
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // best-effort, không chặn UI nếu ghi thất bại
    }
  }

  const nhom = nhomGiaoDien(vaiTro);
  const groups = navGroupsForNhom(nhom, vaiTro);
  const tatCaItems = groups.flatMap((g) => g.items);
  // Tránh nhấp nháy layout khi chưa đọc xong localStorage: giữ trạng thái mở
  // rộng cho tới khi hydrate xong rồi mới áp trạng thái đã lưu.
  const isCollapsed = hydrated && collapsed;

  return (
    <nav className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ""}`} aria-label="Điều hướng chính">
      <Link
        href="/dashboard"
        className={`${styles.navItem} ${pathname === "/dashboard" ? styles.navItemActive : ""}`}
        title="Trang chủ"
      >
        <IconTrangChu className={styles.navIcon} />
        {!isCollapsed && <span className={styles.navLabel}>Trang chủ</span>}
      </Link>

      {groups.map((g) => (
        <div className={styles.group} key={g.label}>
          {!isCollapsed && <span className={styles.groupLabel}>{g.label}</span>}
          {isCollapsed && <div className={styles.groupDivider} />}
          {g.items.map((it) => {
            const khop = (href: string) => pathname === href || pathname.startsWith(href + "/");
            // Mục con (shortcut) thắng mục cha: vào /hoc-lieu/bai-hoc chỉ sáng "Bài học", không sáng cả "Học liệu".
            const active = khop(it.href) && !tatCaItems.some((o) => o.href.length > it.href.length && khop(o.href));
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
                title={it.label}
              >
                <span className={styles.navIcon}>{it.icon}</span>
                {!isCollapsed && <span className={styles.navLabel}>{it.label}</span>}
              </Link>
            );
          })}
        </div>
      ))}

      <div className={styles.spacer} />

      <button type="button" className={styles.collapseBtn} onClick={toggle} title={isCollapsed ? "Mở rộng" : "Thu gọn"}>
        <IconThuGon collapsed={isCollapsed} />
        {!isCollapsed && <span className={styles.navLabel}>Thu gọn</span>}
      </button>

      {!isCollapsed && <span className={styles.roleFootnote}>{tenVaiTro(vaiTro)}</span>}
    </nav>
  );
}

/* ── Icon set (inline stroke SVG) ───────────────────────────────────────── */
function IconTrangChu({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9.5A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V10" />
    </svg>
  );
}
function IconLop() {
  return (
    <svg viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
    </svg>
  );
}
function IconHocSinh() {
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}
function IconChiNhanh() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M4 21V9l8-5 8 5v12" />
      <path d="M9 21v-7h6v7" />
    </svg>
  );
}
function IconVanHanh() {
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="2.6" />
      <path d="M12 3v2.4M12 18.6V21M21 12h-2.4M5.4 12H3M18.1 5.9l-1.7 1.7M7.6 16.4l-1.7 1.7M18.1 18.1l-1.7-1.7M7.6 7.6 5.9 5.9" />
    </svg>
  );
}
function IconHocLieu() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  );
}
function IconBaiHoc() {
  return (
    <svg viewBox="0 0 24 24">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h3" />
    </svg>
  );
}
function IconCauHoi() {
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7" />
      <path d="M12 17h.01" />
    </svg>
  );
}
function IconDeThi() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4" />
      <path d="M9.5 12h5M9.5 15.5h5" />
    </svg>
  );
}
function IconTroGiang() {
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16.5 10.5 18 12l3-3.2" />
    </svg>
  );
}
function IconHopDong() {
  return (
    <svg viewBox="0 0 24 24">
      <rect x="2.5" y="6" width="19" height="13" rx="2.5" />
      <path d="M2.5 10h19" />
      <path d="M6 14h4" />
    </svg>
  );
}
function IconNguoiDung() {
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="8.5" cy="8" r="3" />
      <path d="M2.5 20a6 6 0 0 1 12 0" />
      <path d="M16 8.3a2.7 2.7 0 1 1 3.2 2.65" />
      <path d="M14.5 20a5.2 5.2 0 0 1 8-4.4" />
    </svg>
  );
}
function IconThuGon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, flexShrink: 0, stroke: "currentColor", fill: "none", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" }}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d={collapsed ? "M15 4v16" : "M9 4v16"} />
      <path d={collapsed ? "M9.5 9.5 12 12l-2.5 2.5" : "M14.5 9.5 12 12l2.5 2.5"} />
    </svg>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "@/app/dashboard/hoc-phi/hoc-phi.module.css";

/**
 * Ô tìm kiếm phía server cho bảng danh sách: từ khoá nằm trên URL (?q=), gõ xong ~300ms
 * mới truy vấn, đổi từ khoá luôn về trang 1 (giữ nguyên ?size). Dùng chung cho các bảng
 * học phí; mẫu giống ô tìm của danh sách học sinh.
 */
export default function OTimKiem({
  q,
  placeholder,
  ketQua,
}: {
  /** Từ khoá hiện tại trên URL (đã làm sạch ở server). */
  q: string;
  placeholder: string;
  /** Số kết quả khi đang tìm — hiển thị bên cạnh nút xoá. */
  ketQua?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dangTai, batDauTai] = useTransition();
  const [giaTri, setGiaTri] = useState(q);

  useEffect(() => {
    const dangGo = giaTri.trim();
    if (dangGo === q) return;
    const t = setTimeout(() => {
      const qs = new URLSearchParams(searchParams.toString());
      qs.delete("page");
      if (dangGo) qs.set("q", dangGo);
      else qs.delete("q");
      const url = qs.size > 0 ? `${pathname}?${qs.toString()}` : pathname;
      batDauTai(() => router.replace(url));
    }, 300);
    return () => clearTimeout(t);
  }, [giaTri, q, pathname, router, searchParams]);

  // Back/Forward làm đổi ?q từ ngoài → đồng bộ lại ô nhập.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGiaTri(q);
  }, [q]);

  return (
    <div className={styles.searchRow} role="search">
      <input
        type="search"
        className={styles.searchInput}
        placeholder={placeholder}
        value={giaTri}
        maxLength={100}
        aria-label={placeholder}
        onChange={(e) => setGiaTri(e.target.value)}
      />
      {q && (
        <>
          <span className={styles.searchInfo} aria-live="polite">
            {dangTai ? "Đang tìm…" : ketQua != null ? `${ketQua} kết quả cho "${q}"` : ""}
          </span>
          <button type="button" className={styles.btnEdit} onClick={() => setGiaTri("")}>
            Xoá tìm kiếm
          </button>
        </>
      )}
    </div>
  );
}

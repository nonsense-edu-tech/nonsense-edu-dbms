"use client";

import { useMemo, useState } from "react";
import styles from "@/app/dashboard/hoc-sinh/hoc-sinh.module.css";

export type HocSinhRow = {
  id: number;
  ma_hoc_sinh: string;
  ho_ten: string;
  sdt_phu_huynh: string | null;
  lop_hien_tai: string | null;
};

export default function HocSinhTable({ list }: { list: HocSinhRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (hs) =>
        hs.ma_hoc_sinh.toLowerCase().includes(q) ||
        hs.ho_ten.toLowerCase().includes(q) ||
        (hs.lop_hien_tai ?? "").toLowerCase().includes(q)
    );
  }, [list, query]);

  function handleExport() {
    const header = ["ID hoc sinh", "Ho va ten", "Lop hien tai", "SDT phu huynh"];
    const rows = filtered.map((hs) => [
      hs.ma_hoc_sinh,
      hs.ho_ten,
      hs.lop_hien_tai ?? "",
      hs.sdt_phu_huynh ?? "",
    ]);
    const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\r\n");
    // BOM để Excel mở tiếng Việt không lỗi font.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `danh-sach-hoc-sinh-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className={styles.searchRow}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Tìm theo ID, họ tên, lớp..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          className={styles.btnExport}
          onClick={handleExport}
          disabled={filtered.length === 0}
        >
          Xuất CSV ({filtered.length})
        </button>
      </div>

      {filtered.length > 0 ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID học sinh</th>
                <th>Họ tên</th>
                <th>Lớp hiện tại</th>
                <th>SĐT phụ huynh</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((hs) => (
                <tr key={hs.id}>
                  <td className={styles.mono}>{hs.ma_hoc_sinh}</td>
                  <td>{hs.ho_ten}</td>
                  <td>{hs.lop_hien_tai ?? "—"}</td>
                  <td>{hs.sdt_phu_huynh ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={styles.empty}>Không tìm thấy học sinh nào khớp.</p>
      )}
    </div>
  );
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

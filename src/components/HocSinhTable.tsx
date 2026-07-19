"use client";

import { useMemo, useState, useTransition } from "react";
import { xoaHocSinh } from "@/app/dashboard/hoc-sinh/actions";
import { GIOI_TINH_LABEL, TINH_TRANG_DANG_KY_LABEL } from "./hocSinhOptions";
import HocSinhEditModal from "./HocSinhEditModal";
import styles from "@/app/dashboard/hoc-sinh/hoc-sinh.module.css";

export type HocSinhRow = {
  id: number;
  ma_hoc_sinh: string;
  ho_ten: string;
  sdt_phu_huynh: string | null;
  lop_hien_tai: string | null;
  tinh_trang_dang_ky: string | null;
  ngay_sinh: string | null;
  gioi_tinh: string | null;
  email: string | null;
  sdt_hoc_sinh: string | null;
  cccd: string | null;
  truong_thpt: string | null;
  khoi_thi: string | null;
  nv1: string | null;
  ten_phu_huynh: string | null;
  dia_chi: string | null;
};

export default function HocSinhTable({
  list,
  canEdit,
  canDelete,
}: {
  list: HocSinhRow[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [query, setQuery] = useState("");
  const [editingRow, setEditingRow] = useState<HocSinhRow | null>(null);

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
    const header = [
      "ID hoc sinh", "Ho va ten", "Lop hien tai", "SDT phu huynh", "Ten phu huynh",
      "Ngay sinh", "Gioi tinh", "SDT hoc sinh", "Email", "CCCD", "Dia chi",
      "Tinh trang dang ky", "Truong THPT", "Khoi thi", "NV1",
    ];
    const rows = filtered.map((hs) => [
      hs.ma_hoc_sinh,
      hs.ho_ten,
      hs.lop_hien_tai ?? "",
      hs.sdt_phu_huynh ?? "",
      hs.ten_phu_huynh ?? "",
      hs.ngay_sinh ?? "",
      hs.gioi_tinh ? (GIOI_TINH_LABEL[hs.gioi_tinh] ?? hs.gioi_tinh) : "",
      hs.sdt_hoc_sinh ?? "",
      hs.email ?? "",
      hs.cccd ?? "",
      hs.dia_chi ?? "",
      hs.tinh_trang_dang_ky ? (TINH_TRANG_DANG_KY_LABEL[hs.tinh_trang_dang_ky] ?? hs.tinh_trang_dang_ky) : "",
      hs.truong_thpt ?? "",
      hs.khoi_thi ?? "",
      hs.nv1 ?? "",
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
                {(canEdit || canDelete) && <th></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((hs) => (
                <HocSinhRowItem
                  key={hs.id}
                  hocSinh={hs}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onEdit={() => setEditingRow(hs)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={styles.empty}>Không tìm thấy học sinh nào khớp.</p>
      )}

      {editingRow && <HocSinhEditModal hocSinh={editingRow} onClose={() => setEditingRow(null)} />}
    </div>
  );
}

function HocSinhRowItem({
  hocSinh,
  canEdit,
  canDelete,
  onEdit,
}: {
  hocSinh: HocSinhRow;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(`Xoá học sinh "${hocSinh.ho_ten}" (${hocSinh.ma_hoc_sinh})? Có thể khôi phục sau (xoá mềm).`);
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const result = await xoaHocSinh(hocSinh.id);
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <tr>
      <td className={styles.mono}>{hocSinh.ma_hoc_sinh}</td>
      <td>{hocSinh.ho_ten}</td>
      <td>{hocSinh.lop_hien_tai ?? "—"}</td>
      <td>{hocSinh.sdt_phu_huynh ?? "—"}</td>
      {(canEdit || canDelete) && (
        <td>
          <div className={styles.rowActions}>
            {canEdit && (
              <button type="button" className={styles.btnEdit} onClick={onEdit} disabled={isPending}>
                Sửa
              </button>
            )}
            {canDelete && (
              <button type="button" className={styles.btnDelete} onClick={handleDelete} disabled={isPending}>
                {isPending ? "Đang xoá…" : "Xoá"}
              </button>
            )}
          </div>
          {error && <div className={styles.errorText}>{error}</div>}
        </td>
      )}
    </tr>
  );
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

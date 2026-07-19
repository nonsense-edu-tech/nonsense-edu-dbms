"use client";

import { useState, useTransition } from "react";
import { xoaLop } from "@/app/dashboard/lop/actions";
import { TINH_TRANG_LOP_LABEL, hienThiNienKhoa } from "./lopOptions";
import { ngayHienThi } from "@/lib/formatDate";
import LopEditModal from "./LopEditModal";
import styles from "@/app/dashboard/lop/lop.module.css";

export type LopRow = {
  id: number;
  ma_lop: string;
  ten_lop: string | null;
  cap_hoc_ten: string;
  chuong_trinh_ten: string;
  nam_hoc: number;
  so_lop: number;
  ngay_khai_giang: string | null;
  ngay_ket_thuc: string | null;
  tinh_trang: string[] | null;
  so_hoc_sinh: number;
};

export default function LopTable({
  list,
  canEdit,
  canDelete,
}: {
  list: LopRow[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [editingRow, setEditingRow] = useState<LopRow | null>(null);

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Số thứ tự</th>
            <th>ID lớp học</th>
            <th>Tên lớp</th>
            <th>Cấp học</th>
            <th>Chương trình</th>
            <th>Niên khoá</th>
            <th>Ngày khai giảng</th>
            <th>Ngày kết thúc</th>
            <th>Tình trạng</th>
            <th>Tổng số học sinh</th>
            {(canEdit || canDelete) && <th></th>}
          </tr>
        </thead>
        <tbody>
          {list.map((lop) => (
            <LopRowItem
              key={lop.id}
              lop={lop}
              canEdit={canEdit}
              canDelete={canDelete}
              onEdit={() => setEditingRow(lop)}
            />
          ))}
        </tbody>
      </table>

      {editingRow && <LopEditModal lop={editingRow} onClose={() => setEditingRow(null)} />}
    </div>
  );
}

function LopRowItem({
  lop,
  canEdit,
  canDelete,
  onEdit,
}: {
  lop: LopRow;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(`Xoá lớp "${lop.ma_lop}"? Có thể khôi phục sau (xoá mềm).`);
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const result = await xoaLop(lop.id);
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <tr>
      <td>{lop.so_lop}</td>
      <td className={styles.mono}>{lop.ma_lop}</td>
      <td>{lop.ten_lop ?? "—"}</td>
      <td>{lop.cap_hoc_ten}</td>
      <td>{lop.chuong_trinh_ten}</td>
      <td>{hienThiNienKhoa(lop.nam_hoc)}</td>
      <td>{ngayHienThi(lop.ngay_khai_giang)}</td>
      <td>{ngayHienThi(lop.ngay_ket_thuc)}</td>
      <td>
        {lop.tinh_trang && lop.tinh_trang.length > 0
          ? lop.tinh_trang.map((t) => TINH_TRANG_LOP_LABEL[t] ?? t).join(", ")
          : "—"}
      </td>
      <td>{lop.so_hoc_sinh}</td>
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

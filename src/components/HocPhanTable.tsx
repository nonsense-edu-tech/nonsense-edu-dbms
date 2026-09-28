"use client";

import { useState, useTransition } from "react";
import { xoaHocPhan } from "@/app/dashboard/hoc-lieu/hoc-phan/actions";
import { useToast } from "./ToastProvider";
import HocPhanEditModal from "./HocPhanEditModal";
import styles from "@/app/dashboard/hoc-lieu/hoc-lieu.module.css";

export type HocPhanRow = {
  id: string;
  mon_hoc_id: string;
  ma: number;
  ten: string;
  mo_ta: string | null;
  mon_hoc_ten: string;
  cap_hoc_ten: string;
};

export default function HocPhanTable({ list, canWrite }: { list: HocPhanRow[]; canWrite: boolean }) {
  const [editingRow, setEditingRow] = useState<HocPhanRow | null>(null);

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Cấp học</th>
            <th>Môn học</th>
            <th>Mã</th>
            <th>Tên học phần</th>
            <th>Mô tả</th>
            {canWrite && <th></th>}
          </tr>
        </thead>
        <tbody>
          {list.map((hp) => (
            <HocPhanRowItem key={hp.id} hocPhan={hp} canWrite={canWrite} onEdit={() => setEditingRow(hp)} />
          ))}
        </tbody>
      </table>

      {editingRow && <HocPhanEditModal hocPhan={editingRow} onClose={() => setEditingRow(null)} />}
    </div>
  );
}

function HocPhanRowItem({
  hocPhan,
  canWrite,
  onEdit,
}: {
  hocPhan: HocPhanRow;
  canWrite: boolean;
  onEdit: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();

  function handleDelete() {
    const confirmed = window.confirm(`Xoá học phần "${hocPhan.ten}"? Có thể khôi phục sau (xoá mềm).`);
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const result = await xoaHocPhan(hocPhan.id);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Xoá học phần thất bại: ${result.error}` });
      } else {
        showToast({ type: "success", message: `Đã xoá học phần "${hocPhan.ten}" thành công.` });
      }
    });
  }

  return (
    <tr>
      <td>{hocPhan.cap_hoc_ten}</td>
      <td>{hocPhan.mon_hoc_ten}</td>
      <td className={styles.mono}>{String(hocPhan.ma).padStart(2, "0")}</td>
      <td>{hocPhan.ten}</td>
      <td>{hocPhan.mo_ta ?? "—"}</td>
      {canWrite && (
        <td>
          <div className={styles.rowActions}>
            <button type="button" className={styles.btnEdit} onClick={onEdit} disabled={isPending}>Sửa</button>
            <button type="button" className={styles.btnDelete} onClick={handleDelete} disabled={isPending}>
              {isPending ? "Đang xoá…" : "Xoá"}
            </button>
          </div>
          {error && <div className={styles.errorText}>{error}</div>}
        </td>
      )}
    </tr>
  );
}

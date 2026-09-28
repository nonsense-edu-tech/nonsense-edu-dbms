"use client";

import { useState, useTransition } from "react";
import { xoaChuDe } from "@/app/dashboard/hoc-lieu/chu-de/actions";
import { useToast } from "./ToastProvider";
import ChuDeEditModal from "./ChuDeEditModal";
import styles from "@/app/dashboard/hoc-lieu/hoc-lieu.module.css";

export type ChuDeRow = {
  id: string;
  mon_hoc_id: string;
  ma: number;
  ten: string;
  mo_ta: string | null;
  mon_hoc_ten: string;
  cap_hoc_ten: string;
};

export default function ChuDeTable({ list, canWrite }: { list: ChuDeRow[]; canWrite: boolean }) {
  const [editingRow, setEditingRow] = useState<ChuDeRow | null>(null);

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Cấp học</th>
            <th>Môn học</th>
            <th>Mã</th>
            <th>Tên chủ đề</th>
            <th>Mô tả</th>
            {canWrite && <th></th>}
          </tr>
        </thead>
        <tbody>
          {list.map((cd) => (
            <ChuDeRowItem key={cd.id} chuDe={cd} canWrite={canWrite} onEdit={() => setEditingRow(cd)} />
          ))}
        </tbody>
      </table>

      {editingRow && <ChuDeEditModal chuDe={editingRow} onClose={() => setEditingRow(null)} />}
    </div>
  );
}

function ChuDeRowItem({
  chuDe,
  canWrite,
  onEdit,
}: {
  chuDe: ChuDeRow;
  canWrite: boolean;
  onEdit: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();

  function handleDelete() {
    const confirmed = window.confirm(`Xoá chủ đề "${chuDe.ten}"? Có thể khôi phục sau (xoá mềm).`);
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const result = await xoaChuDe(chuDe.id);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Xoá chủ đề thất bại: ${result.error}` });
      } else {
        showToast({ type: "success", message: `Đã xoá chủ đề "${chuDe.ten}" thành công.` });
      }
    });
  }

  return (
    <tr>
      <td>{chuDe.cap_hoc_ten}</td>
      <td>{chuDe.mon_hoc_ten}</td>
      <td className={styles.mono}>{String(chuDe.ma).padStart(2, "0")}</td>
      <td>{chuDe.ten}</td>
      <td>{chuDe.mo_ta ?? "—"}</td>
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

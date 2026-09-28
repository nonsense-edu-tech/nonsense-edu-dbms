"use client";

import { useState, useTransition } from "react";
import { xoaBaiHoc } from "@/app/dashboard/hoc-lieu/bai-hoc/actions";
import { useToast } from "./ToastProvider";
import BaiHocEditModal from "./BaiHocEditModal";
import styles from "@/app/dashboard/hoc-lieu/hoc-lieu.module.css";

export type BaiHocRow = {
  id: string;
  hoc_phan_id: string;
  ma: number;
  ten: string;
  mo_ta: string | null;
  hoc_phan_ten: string;
  mon_hoc_ten: string;
  cap_hoc_ten: string;
};

export default function BaiHocTable({ list, canWrite }: { list: BaiHocRow[]; canWrite: boolean }) {
  const [editingRow, setEditingRow] = useState<BaiHocRow | null>(null);

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Cấp học</th>
            <th>Môn học</th>
            <th>Học phần</th>
            <th>Mã</th>
            <th>Tên bài học</th>
            <th>Mô tả</th>
            {canWrite && <th></th>}
          </tr>
        </thead>
        <tbody>
          {list.map((bh) => (
            <BaiHocRowItem key={bh.id} baiHoc={bh} canWrite={canWrite} onEdit={() => setEditingRow(bh)} />
          ))}
        </tbody>
      </table>

      {editingRow && <BaiHocEditModal baiHoc={editingRow} onClose={() => setEditingRow(null)} />}
    </div>
  );
}

function BaiHocRowItem({
  baiHoc,
  canWrite,
  onEdit,
}: {
  baiHoc: BaiHocRow;
  canWrite: boolean;
  onEdit: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();

  function handleDelete() {
    const confirmed = window.confirm(`Xoá bài học "${baiHoc.ten}"? Có thể khôi phục sau (xoá mềm).`);
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const result = await xoaBaiHoc(baiHoc.id);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Xoá bài học thất bại: ${result.error}` });
      } else {
        showToast({ type: "success", message: `Đã xoá bài học "${baiHoc.ten}" thành công.` });
      }
    });
  }

  return (
    <tr>
      <td>{baiHoc.cap_hoc_ten}</td>
      <td>{baiHoc.mon_hoc_ten}</td>
      <td>{baiHoc.hoc_phan_ten}</td>
      <td className={styles.mono}>{String(baiHoc.ma).padStart(2, "0")}</td>
      <td>{baiHoc.ten}</td>
      <td>{baiHoc.mo_ta ?? "—"}</td>
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

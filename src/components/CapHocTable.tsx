"use client";

import { useState, useTransition } from "react";
import { suaCapHoc, xoaCapHoc } from "@/app/dashboard/hoc-lieu/cap-hoc/actions";
import { useToast } from "./ToastProvider";
import formStyles from "./Form.module.css";
import styles from "@/app/dashboard/hoc-lieu/hoc-lieu.module.css";

export type CapHocRow = { id: string; ma: number; ten: string };

export default function CapHocTable({ list, canWrite }: { list: CapHocRow[]; canWrite: boolean }) {
  const [editingRow, setEditingRow] = useState<CapHocRow | null>(null);

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Mã</th>
            <th>Tên cấp học</th>
            {canWrite && <th></th>}
          </tr>
        </thead>
        <tbody>
          {list.map((row) => (
            <RowItem key={row.id} row={row} canWrite={canWrite} onEdit={() => setEditingRow(row)} />
          ))}
        </tbody>
      </table>
      {editingRow && <EditModal row={editingRow} onClose={() => setEditingRow(null)} />}
    </div>
  );
}

function RowItem({ row, canWrite, onEdit }: { row: CapHocRow; canWrite: boolean; onEdit: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();

  function handleDelete() {
    if (!window.confirm(`Xoá cấp học "${row.ten}"? Có thể khôi phục sau (xoá mềm).`)) return;
    setError(null);
    startTransition(async () => {
      const result = await xoaCapHoc(row.id, row.ma);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Xoá cấp học thất bại: ${result.error}` });
      } else {
        showToast({ type: "success", message: `Đã xoá cấp học "${row.ten}" thành công.` });
      }
    });
  }

  return (
    <tr>
      <td className={styles.mono}>{row.ma}</td>
      <td>{row.ten}</td>
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

function EditModal({ row, onClose }: { row: CapHocRow; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("id", row.id);
    startTransition(async () => {
      const result = await suaCapHoc(formData);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Sửa cấp học thất bại: ${result.error}` });
      } else {
        showToast({ type: "success", message: `Đã sửa cấp học "${result.ten}" thành công.` });
        onClose();
      }
    });
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Sửa cấp học — mã {row.ma}</h3>
          <button type="button" className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className={formStyles.form} noValidate>
          <p className={formStyles.hint}>Mã cấp học là một phần của ID lớp/học sinh/câu hỏi nên không đổi được; chỉ sửa tên.</p>
          <div className={formStyles.field}>
            <label htmlFor="ten" className={formStyles.label}>Tên cấp học</label>
            <input id="ten" name="ten" type="text" required className={formStyles.input} disabled={isPending} defaultValue={row.ten} />
          </div>
          {error && <div className={formStyles.errorBox} role="alert">{error}</div>}
          <div className={styles.modalActions}>
            <button type="button" className={styles.btnEdit} onClick={onClose} disabled={isPending}>Huỷ</button>
            <button type="submit" className={formStyles.btnPrimary} disabled={isPending}>
              {isPending ? "Đang lưu…" : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { suaMonHoc, xoaMonHoc } from "@/app/dashboard/hoc-lieu/mon-hoc/actions";
import { useToast } from "./ToastProvider";
import formStyles from "./Form.module.css";
import styles from "@/app/dashboard/hoc-lieu/hoc-lieu.module.css";

export type MonHocRow = {
  id: string;
  ma: number;
  cap_hoc_ma: number;
  cap_hoc_ten: string;
  ten: string;
  mo_ta: string | null;
};

export default function MonHocTable({ list, canWrite }: { list: MonHocRow[]; canWrite: boolean }) {
  const [editingRow, setEditingRow] = useState<MonHocRow | null>(null);

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Cấp học</th>
            <th>Mã</th>
            <th>Tên môn học</th>
            <th>Mô tả</th>
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

function RowItem({ row, canWrite, onEdit }: { row: MonHocRow; canWrite: boolean; onEdit: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();

  function handleDelete() {
    if (!window.confirm(`Xoá môn học "${row.ten}"? Có thể khôi phục sau (xoá mềm).`)) return;
    setError(null);
    startTransition(async () => {
      const result = await xoaMonHoc(row.id, row.ma, row.cap_hoc_ma);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Xoá môn học thất bại: ${result.error}` });
      } else {
        showToast({ type: "success", message: `Đã xoá môn học "${row.ten}" thành công.` });
      }
    });
  }

  return (
    <tr>
      <td>{row.cap_hoc_ten}</td>
      <td className={styles.mono}>{String(row.ma).padStart(2, "0")}</td>
      <td>{row.ten}</td>
      <td>{row.mo_ta ?? "—"}</td>
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

function EditModal({ row, onClose }: { row: MonHocRow; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("id", row.id);
    startTransition(async () => {
      const result = await suaMonHoc(formData);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Sửa môn học thất bại: ${result.error}` });
      } else {
        showToast({ type: "success", message: `Đã sửa môn học "${result.ten}" thành công.` });
        onClose();
      }
    });
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Sửa môn học — {row.cap_hoc_ten} / mã {String(row.ma).padStart(2, "0")}</h3>
          <button type="button" className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className={formStyles.form} noValidate>
          <p className={formStyles.hint}>Mã môn học nằm trong ID câu hỏi nên không đổi được; chỉ sửa tên và mô tả.</p>
          <div className={formStyles.field}>
            <label htmlFor="ten" className={formStyles.label}>Tên môn học</label>
            <input id="ten" name="ten" type="text" required className={formStyles.input} disabled={isPending} defaultValue={row.ten} />
          </div>
          <div className={formStyles.field}>
            <label htmlFor="mo_ta" className={formStyles.label}>Mô tả (tuỳ chọn)</label>
            <textarea id="mo_ta" name="mo_ta" className={formStyles.textarea} disabled={isPending} rows={2} defaultValue={row.mo_ta ?? ""} />
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

"use client";

import { useState, useTransition } from "react";
import { goMonKhoiChuongTrinh, suaChuongTrinh, xoaChuongTrinh } from "@/app/dashboard/hoc-lieu/chuong-trinh/actions";
import { useToast } from "./ToastProvider";
import formStyles from "./Form.module.css";
import styles from "@/app/dashboard/hoc-lieu/hoc-lieu.module.css";

export type MonDaGan = { cap_hoc_ma: number; cap_hoc_ten: string; mon_hoc_ma: number; mon_hoc_ten: string };
export type ChuongTrinhRow = { id: string; ma: string; ten: string; mon_hoc: MonDaGan[] };

export default function ChuongTrinhTable({ list, canWrite }: { list: ChuongTrinhRow[]; canWrite: boolean }) {
  const [editingRow, setEditingRow] = useState<ChuongTrinhRow | null>(null);

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Mã</th>
            <th>Tên chương trình</th>
            <th>Môn học đã gán</th>
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

function RowItem({ row, canWrite, onEdit }: { row: ChuongTrinhRow; canWrite: boolean; onEdit: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();

  function handleDelete() {
    if (!window.confirm(`Xoá chương trình "${row.ten}"? Có thể khôi phục sau (xoá mềm).`)) return;
    setError(null);
    startTransition(async () => {
      const result = await xoaChuongTrinh(row.id, row.ma);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Xoá chương trình thất bại: ${result.error}` });
      } else {
        showToast({ type: "success", message: `Đã xoá chương trình "${row.ten}" thành công.` });
      }
    });
  }

  return (
    <tr>
      <td className={styles.mono}>{row.ma}</td>
      <td>{row.ten}</td>
      <td>
        {row.mon_hoc.length === 0 ? (
          "—"
        ) : (
          <div className={styles.rowActions} style={{ flexWrap: "wrap" }}>
            {row.mon_hoc.map((m) => (
              <MonChip key={`${m.cap_hoc_ma}-${m.mon_hoc_ma}`} chuongTrinh={row} mon={m} canWrite={canWrite} />
            ))}
          </div>
        )}
      </td>
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

function EditModal({ row, onClose }: { row: ChuongTrinhRow; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("id", row.id);
    startTransition(async () => {
      const result = await suaChuongTrinh(formData);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Sửa chương trình thất bại: ${result.error}` });
      } else {
        showToast({ type: "success", message: `Đã sửa chương trình "${result.ten}" thành công.` });
        onClose();
      }
    });
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Sửa chương trình — mã {row.ma}</h3>
          <button type="button" className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className={formStyles.form} noValidate>
          <p className={formStyles.hint}>Mã chương trình là một phần của ID lớp/học sinh/câu hỏi nên không đổi được; chỉ sửa tên.</p>
          <div className={formStyles.field}>
            <label htmlFor="ten" className={formStyles.label}>Tên chương trình</label>
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

function MonChip({ chuongTrinh, mon, canWrite }: { chuongTrinh: ChuongTrinhRow; mon: MonDaGan; canWrite: boolean }) {
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();

  function handleRemove() {
    if (!window.confirm(`Gỡ môn "${mon.mon_hoc_ten}" (${mon.cap_hoc_ten}) khỏi chương trình "${chuongTrinh.ten}"?`)) return;
    startTransition(async () => {
      const result = await goMonKhoiChuongTrinh(chuongTrinh.ma, mon.cap_hoc_ma, mon.mon_hoc_ma);
      if ("error" in result) {
        showToast({ type: "error", message: `Gỡ môn học thất bại: ${result.error}` });
      } else {
        showToast({ type: "success", message: `Đã gỡ môn "${mon.mon_hoc_ten}" khỏi chương trình "${chuongTrinh.ten}".` });
      }
    });
  }

  return (
    <span className={styles.mono} style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      {mon.cap_hoc_ten} · {mon.mon_hoc_ten}
      {canWrite && (
        <button type="button" className={styles.btnDelete} onClick={handleRemove} disabled={isPending} title="Gỡ môn học" aria-label={`Gỡ ${mon.mon_hoc_ten}`}>
          ✕
        </button>
      )}
    </span>
  );
}

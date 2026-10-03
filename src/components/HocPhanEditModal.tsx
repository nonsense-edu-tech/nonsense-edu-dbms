"use client";

import { useState, useTransition } from "react";
import { suaHocPhan } from "@/app/dashboard/hoc-lieu/hoc-phan/actions";
import { useToast } from "./ToastProvider";
import type { HocPhanRow } from "./HocPhanTable";
import formStyles from "./Form.module.css";
import modalStyles from "@/app/dashboard/hoc-lieu/hoc-lieu.module.css";

export default function HocPhanEditModal({ hocPhan, onClose, laGv = false }: { hocPhan: HocPhanRow; onClose: () => void; laGv?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("id", String(hocPhan.id));

    startTransition(async () => {
      const result = await suaHocPhan(formData);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Sửa học phần thất bại: ${result.error}` });
      } else {
        showToast({ type: "success", message: `Đã sửa học phần "${hocPhan.ten}" thành công.` });
        onClose();
      }
    });
  }

  return (
    <div className={modalStyles.modalOverlay} onClick={onClose}>
      <div className={modalStyles.modalPanel} onClick={(e) => e.stopPropagation()}>
        <div className={modalStyles.modalHeader}>
          <h3 className={modalStyles.modalTitle}>Sửa học phần — {hocPhan.cap_hoc_ten} / {hocPhan.mon_hoc_ten}</h3>
          <button type="button" className={modalStyles.modalClose} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={formStyles.form} noValidate>
          {!laGv && (
          <div className={formStyles.field}>
            <label htmlFor="ma" className={formStyles.label}>Mã học phần (1-99)</label>
            <input id="ma" name="ma" type="number" min={1} max={99} className={formStyles.input} disabled={isPending} defaultValue={hocPhan.ma ?? ""} />
          </div>
          )}

          <div className={formStyles.field}>
            <label htmlFor="ten" className={formStyles.label}>Tên học phần</label>
            <input id="ten" name="ten" type="text" required className={formStyles.input} disabled={isPending} defaultValue={hocPhan.ten} />
          </div>

          <div className={formStyles.field}>
            <label htmlFor="mo_ta" className={formStyles.label}>Mô tả (tuỳ chọn)</label>
            <textarea id="mo_ta" name="mo_ta" className={formStyles.textarea} disabled={isPending} rows={2} defaultValue={hocPhan.mo_ta ?? ""} />
          </div>

          {error && <div className={formStyles.errorBox} role="alert">{error}</div>}

          <div className={modalStyles.modalActions}>
            <button type="button" className={modalStyles.btnEdit} onClick={onClose} disabled={isPending}>Huỷ</button>
            <button type="submit" className={formStyles.btnPrimary} disabled={isPending}>
              {isPending ? "Đang lưu…" : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { suaChiNhanh } from "@/app/dashboard/chi-nhanh/actions";
import type { ChiNhanhRow } from "./ChiNhanhTable";
import formStyles from "./Form.module.css";
import modalStyles from "@/app/dashboard/chi-nhanh/chi-nhanh.module.css";

export default function ChiNhanhEditModal({ chiNhanh, onClose }: { chiNhanh: ChiNhanhRow; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("id", String(chiNhanh.id));

    startTransition(async () => {
      const result = await suaChiNhanh(formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  }

  return (
    <div className={modalStyles.modalOverlay} onClick={onClose}>
      <div className={modalStyles.modalPanel} onClick={(e) => e.stopPropagation()}>
        <div className={modalStyles.modalHeader}>
          <h3 className={modalStyles.modalTitle}>
            Sửa chi nhánh — <span className={modalStyles.mono}>{chiNhanh.ma}</span>
          </h3>
          <button type="button" className={modalStyles.modalClose} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={formStyles.form} noValidate>
          <div className={formStyles.field}>
            <label htmlFor="ten" className={formStyles.label}>Tên chi nhánh</label>
            <input
              id="ten" name="ten" type="text" required
              className={formStyles.input} disabled={isPending}
              defaultValue={chiNhanh.ten}
            />
          </div>

          <div className={formStyles.field}>
            <label htmlFor="dia_chi" className={formStyles.label}>Địa chỉ</label>
            <input
              id="dia_chi" name="dia_chi" type="text"
              className={formStyles.input} disabled={isPending}
              defaultValue={chiNhanh.dia_chi ?? ""}
            />
          </div>

          {error && <div className={formStyles.errorBox} role="alert">{error}</div>}

          <div className={modalStyles.modalActions}>
            <button type="button" className={modalStyles.btnEdit} onClick={onClose} disabled={isPending}>
              Huỷ
            </button>
            <button type="submit" className={formStyles.btnPrimary} disabled={isPending}>
              {isPending ? "Đang lưu…" : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

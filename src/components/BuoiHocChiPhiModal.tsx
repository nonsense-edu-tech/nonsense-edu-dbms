"use client";

import { useState, useTransition } from "react";
import { ganChiPhiBuoiHoc } from "@/app/dashboard/van-hanh/buoi-hoc/actions";
import type { BuoiHocRow } from "./BuoiHocTable";
import formStyles from "./Form.module.css";
import modalStyles from "@/app/dashboard/van-hanh/van-hanh.module.css";

export default function BuoiHocChiPhiModal({ buoiHoc, onClose }: { buoiHoc: BuoiHocRow; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("id", String(buoiHoc.id));

    startTransition(async () => {
      const result = await ganChiPhiBuoiHoc(formData);
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
          <h3 className={modalStyles.modalTitle}>Ghi nhận chi phí — {buoiHoc.lop_nhan}</h3>
          <button type="button" className={modalStyles.modalClose} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={formStyles.form} noValidate>
          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label htmlFor="thu_lao_gv" className={formStyles.label}>Thù lao GV (đ)</label>
              <input
                id="thu_lao_gv" name="thu_lao_gv" type="number" min={0} step={1000}
                className={formStyles.input} disabled={isPending}
                defaultValue={buoiHoc.thu_lao_gv ?? ""}
              />
            </div>
            <div className={formStyles.field}>
              <label htmlFor="chi_phi_phong" className={formStyles.label}>Chi phí phòng (đ)</label>
              <input
                id="chi_phi_phong" name="chi_phi_phong" type="number" min={0} step={1000}
                className={formStyles.input} disabled={isPending}
                defaultValue={buoiHoc.chi_phi_phong ?? ""}
              />
            </div>
          </div>

          {error && <div className={formStyles.errorBox} role="alert">{error}</div>}

          <div className={modalStyles.modalActions}>
            <button type="button" className={modalStyles.btnEdit} onClick={onClose} disabled={isPending}>Huỷ</button>
            <button type="submit" className={formStyles.btnPrimary} disabled={isPending}>
              {isPending ? "Đang lưu…" : "Lưu chi phí"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

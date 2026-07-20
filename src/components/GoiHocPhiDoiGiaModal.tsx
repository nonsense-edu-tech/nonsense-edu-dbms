"use client";

import { useState, useTransition } from "react";
import { doiGiaGoi } from "@/app/dashboard/hoc-phi/goi/actions";
import type { GoiHocPhiRow } from "./GoiHocPhiTable";
import formStyles from "./Form.module.css";
import modalStyles from "@/app/dashboard/hoc-phi/hoc-phi.module.css";

export default function GoiHocPhiDoiGiaModal({ goi, onClose }: { goi: GoiHocPhiRow; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("id", String(goi.id));

    startTransition(async () => {
      const result = await doiGiaGoi(formData);
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
          <h3 className={modalStyles.modalTitle}>Đổi giá — {goi.ten}</h3>
          <button type="button" className={modalStyles.modalClose} onClick={onClose}>✕</button>
        </div>

        <p className={formStyles.hint} style={{ marginBottom: 12 }}>
          Giá hiện tại: <strong>{goi.gia_niem_yet.toLocaleString("vi-VN")} đ</strong>. Đổi giá sẽ khoá dòng cũ
          (hiệu lực đến trước ngày áp dụng mới) và tạo một dòng gói mới — không sửa giá cũ tại chỗ, để các hợp
          đồng đã ký giữ nguyên snapshot.
        </p>

        <form onSubmit={handleSubmit} className={formStyles.form} noValidate>
          <div className={formStyles.field}>
            <label htmlFor="gia_niem_yet_moi" className={formStyles.label}>Giá niêm yết mới (VNĐ)</label>
            <input
              id="gia_niem_yet_moi" name="gia_niem_yet_moi" type="number" min="0" step="1000" required
              className={formStyles.input} disabled={isPending}
            />
          </div>
          <div className={formStyles.field}>
            <label htmlFor="ngay_doi_gia" className={formStyles.label}>Áp dụng từ ngày</label>
            <input
              id="ngay_doi_gia" name="ngay_doi_gia" type="date" required
              className={formStyles.input} disabled={isPending}
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>

          {error && <div className={formStyles.errorBox} role="alert">{error}</div>}

          <div className={modalStyles.modalActions}>
            <button type="button" className={modalStyles.btnEdit} onClick={onClose} disabled={isPending}>
              Huỷ
            </button>
            <button type="submit" className={formStyles.btnPrimary} disabled={isPending}>
              {isPending ? "Đang lưu…" : "Xác nhận đổi giá"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { suaLop } from "@/app/dashboard/lop/actions";
import { TINH_TRANG_LOP_LABEL, TINH_TRANG_LOP_OPTIONS } from "./lopOptions";
import type { LopRow } from "./LopTable";
import formStyles from "./Form.module.css";
import modalStyles from "@/app/dashboard/lop/lop.module.css";

export default function LopEditModal({ lop, onClose }: { lop: LopRow; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("id", String(lop.id));

    startTransition(async () => {
      const result = await suaLop(formData);
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
            Sửa lớp — <span className={modalStyles.mono}>{lop.ma_lop}</span>
          </h3>
          <button type="button" className={modalStyles.modalClose} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={formStyles.form} noValidate>
          <div className={formStyles.field}>
            <label htmlFor="ten_lop" className={formStyles.label}>Tên lớp</label>
            <input
              id="ten_lop" name="ten_lop" type="text"
              className={formStyles.input} disabled={isPending}
              defaultValue={lop.ten_lop ?? ""}
              placeholder="vd V-ACT 12A1"
            />
          </div>

          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label htmlFor="ngay_khai_giang" className={formStyles.label}>Ngày khai giảng</label>
              <input
                id="ngay_khai_giang" name="ngay_khai_giang" type="date"
                className={formStyles.input} disabled={isPending}
                defaultValue={lop.ngay_khai_giang ?? ""}
              />
            </div>
            <div className={formStyles.field}>
              <label htmlFor="ngay_ket_thuc" className={formStyles.label}>Ngày kết thúc</label>
              <input
                id="ngay_ket_thuc" name="ngay_ket_thuc" type="date"
                className={formStyles.input} disabled={isPending}
                defaultValue={lop.ngay_ket_thuc ?? ""}
              />
            </div>
          </div>

          <div className={formStyles.field}>
            <span className={formStyles.label}>Tình trạng (chọn được nhiều)</span>
            <div className={formStyles.checkGroup}>
              {TINH_TRANG_LOP_OPTIONS.map((t) => (
                <label key={t} className={formStyles.checkItem}>
                  <input
                    type="checkbox"
                    name="tinh_trang"
                    value={t}
                    disabled={isPending}
                    defaultChecked={lop.tinh_trang?.includes(t) ?? false}
                  />
                  {TINH_TRANG_LOP_LABEL[t]}
                </label>
              ))}
            </div>
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

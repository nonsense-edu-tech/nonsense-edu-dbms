"use client";

import { useState, useTransition } from "react";
import { suaPhongHoc } from "@/app/dashboard/van-hanh/phong-hoc/actions";
import type { PhongHocRow } from "./PhongHocTable";
import formStyles from "./Form.module.css";
import modalStyles from "@/app/dashboard/van-hanh/van-hanh.module.css";

type MaTen = { ma: string | number; ten: string };

export default function PhongHocEditModal({
  phongHoc,
  fullEdit,
  chiNhanhList,
  loaiPhongList,
  onClose,
}: {
  phongHoc: PhongHocRow;
  fullEdit: boolean;
  chiNhanhList: MaTen[];
  loaiPhongList: MaTen[];
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("id", String(phongHoc.id));
    if (!fullEdit) {
      formData.delete("chi_nhanh_id");
      formData.delete("loai_phong_id");
    }

    startTransition(async () => {
      const result = await suaPhongHoc(formData);
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
          <h3 className={modalStyles.modalTitle}>Sửa phòng học — {phongHoc.ten}</h3>
          <button type="button" className={modalStyles.modalClose} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={formStyles.form} noValidate>
          <div className={formStyles.field}>
            <label htmlFor="ten" className={formStyles.label}>Tên phòng</label>
            <input id="ten" name="ten" type="text" required className={formStyles.input} disabled={isPending} defaultValue={phongHoc.ten} />
          </div>

          {fullEdit && (
            <div className={formStyles.row}>
              <div className={formStyles.field}>
                <label htmlFor="chi_nhanh_id" className={formStyles.label}>Chi nhánh</label>
                <select id="chi_nhanh_id" name="chi_nhanh_id" required className={formStyles.select} disabled={isPending} defaultValue={phongHoc.chi_nhanh_id}>
                  {chiNhanhList.map((c) => (
                    <option key={c.ma} value={c.ma}>{c.ten}</option>
                  ))}
                </select>
              </div>
              <div className={formStyles.field}>
                <label htmlFor="loai_phong_id" className={formStyles.label}>Loại phòng</label>
                <select id="loai_phong_id" name="loai_phong_id" required className={formStyles.select} disabled={isPending} defaultValue={phongHoc.loai_phong_id}>
                  {loaiPhongList.map((l) => (
                    <option key={l.ma} value={l.ma}>{l.ten}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {!fullEdit && (
            <p className={formStyles.hint}>
              Bạn chỉ đổi được tên phòng. Đổi chi nhánh/loại phòng cần Master Admin.
            </p>
          )}

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

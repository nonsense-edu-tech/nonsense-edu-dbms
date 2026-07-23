"use client";

import { useState, useTransition } from "react";
import { chuyenLop } from "@/app/dashboard/hoc-sinh/actions";
import type { HocSinhRow } from "./HocSinhTable";
import formStyles from "./Form.module.css";
import modalStyles from "@/app/dashboard/hoc-sinh/hoc-sinh.module.css";

type LopOption = { id: string; ma_lop: string; ten_lop: string | null };

export default function ChuyenLopModal({
  hocSinh,
  lopList,
  onClose,
}: {
  hocSinh: HocSinhRow;
  lopList: LopOption[];
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const lopDich = lopList.filter((l) => l.id !== hocSinh.lop_hien_tai_id);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const lopMoiId = String(formData.get("lop_moi_id") ?? "").trim();
    if (!lopMoiId) {
      setError("Vui lòng chọn lớp đích.");
      return;
    }
    startTransition(async () => {
      const result = await chuyenLop(hocSinh.id, lopMoiId);
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
            Chuyển lớp — <span className={modalStyles.mono}>{hocSinh.ma_hoc_sinh}</span>
          </h3>
          <button type="button" className={modalStyles.modalClose} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={formStyles.form} noValidate>
          <p className={formStyles.hint}>
            {hocSinh.ho_ten} — hiện đang ở lớp <strong>{hocSinh.lop_hien_tai ?? "chưa xếp lớp"}</strong>.
            Ghi danh cũ sẽ được đóng lại (trạng thái &quot;Đã chuyển lớp&quot;), ghi danh mới sẽ được tạo cho lớp đích.
            Mã học sinh và lớp nhập học đầu tiên không đổi.
          </p>

          <div className={formStyles.field}>
            <label htmlFor="lop_moi_id" className={formStyles.label}>Lớp đích</label>
            <select id="lop_moi_id" name="lop_moi_id" required className={formStyles.select} disabled={isPending} defaultValue="">
              <option value="" disabled>— Chọn lớp đích —</option>
              {lopDich.map((lop) => (
                <option key={lop.id} value={lop.id}>
                  {lop.ma_lop}
                  {lop.ten_lop ? ` — ${lop.ten_lop}` : ""}
                </option>
              ))}
            </select>
          </div>

          {error && <div className={formStyles.errorBox} role="alert">{error}</div>}

          <div className={modalStyles.modalActions}>
            <button type="button" className={modalStyles.btnEdit} onClick={onClose} disabled={isPending}>
              Huỷ
            </button>
            <button type="submit" className={formStyles.btnPrimary} disabled={isPending}>
              {isPending ? "Đang chuyển…" : "Chuyển lớp"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

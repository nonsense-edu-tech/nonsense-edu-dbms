"use client";

import { useMemo, useState, useTransition } from "react";
import { chuyenLop } from "@/app/dashboard/hoc-sinh/actions";
import { useToast } from "./ToastProvider";
import type { HocSinhRow } from "./HocSinhTable";
import SearchableSelect from "./SearchableSelect";
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
  const [lopMoiId, setLopMoiId] = useState("");
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();
  const lopDich = lopList.filter((l) => l.id !== hocSinh.lop_hien_tai_id);
  const lopDichOptions = useMemo(
    () =>
      lopDich.map((lop) => ({
        value: lop.id,
        label: lop.ten_lop ? `${lop.ma_lop} — ${lop.ten_lop}` : lop.ma_lop,
      })),
    [lopDich]
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!lopMoiId) {
      setError("Vui lòng chọn lớp đích.");
      return;
    }
    startTransition(async () => {
      const result = await chuyenLop(hocSinh.id, lopMoiId);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Chuyển lớp thất bại: ${result.error}` });
      } else {
        showToast({ type: "success", message: `Đã chuyển lớp cho "${hocSinh.ho_ten}" thành công.` });
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
            <SearchableSelect
              id="lop_moi_id"
              name="lop_moi_id"
              options={lopDichOptions}
              value={lopMoiId}
              disabled={isPending}
              required
              placeholder="— Tìm và chọn lớp đích —"
              emptyText="Không tìm thấy lớp nào."
              onChange={setLopMoiId}
            />
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

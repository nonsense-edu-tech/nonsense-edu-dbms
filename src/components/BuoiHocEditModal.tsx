"use client";

import { useState, useTransition } from "react";
import { suaBuoiHoc } from "@/app/dashboard/van-hanh/buoi-hoc/actions";
import type { BuoiHocRow } from "./BuoiHocTable";
import type { GvOption, PhongHocOption, MonHocOption } from "./BuoiHocForm";
import formStyles from "./Form.module.css";
import modalStyles from "@/app/dashboard/van-hanh/van-hanh.module.css";

const TRANG_THAI_LABEL: Record<string, string> = {
  du_kien: "Dự kiến",
  da_day: "Đã dạy",
  huy: "Huỷ",
};

export default function BuoiHocEditModal({
  buoiHoc,
  canReassignGv,
  monHocList,
  gvList,
  phongHocList,
  onClose,
}: {
  buoiHoc: BuoiHocRow;
  canReassignGv: boolean;
  monHocList: MonHocOption[];
  gvList: GvOption[];
  phongHocList: PhongHocOption[];
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const monHocKhaDung = monHocList.filter((m) => m.cap_hoc_ma === buoiHoc.cap_hoc_ma);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("id", String(buoiHoc.id));
    if (!canReassignGv) formData.delete("gv_id");

    startTransition(async () => {
      const result = await suaBuoiHoc(formData);
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
          <h3 className={modalStyles.modalTitle}>Sửa buổi học — {buoiHoc.lop_nhan}</h3>
          <button type="button" className={modalStyles.modalClose} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={formStyles.form} noValidate>
          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label htmlFor="mon_hoc_ma" className={formStyles.label}>Môn học</label>
              <select id="mon_hoc_ma" name="mon_hoc_ma" required className={formStyles.select} disabled={isPending} defaultValue={buoiHoc.mon_hoc_ma}>
                {monHocKhaDung.map((m) => (
                  <option key={m.ma} value={m.ma}>{m.ten}</option>
                ))}
              </select>
            </div>
            <div className={formStyles.field}>
              <label htmlFor="ngay" className={formStyles.label}>Ngày học</label>
              <input id="ngay" name="ngay" type="date" required className={formStyles.input} disabled={isPending} defaultValue={buoiHoc.ngay} />
            </div>
          </div>

          <div className={formStyles.row}>
            {canReassignGv && (
              <div className={formStyles.field}>
                <label htmlFor="gv_id" className={formStyles.label}>Giáo viên</label>
                <select id="gv_id" name="gv_id" className={formStyles.select} disabled={isPending} defaultValue={buoiHoc.gv_id ?? ""}>
                  <option value="">— Chưa gán —</option>
                  {gvList.map((g) => (
                    <option key={g.id} value={g.id}>{g.ho_ten}</option>
                  ))}
                </select>
              </div>
            )}
            <div className={formStyles.field}>
              <label htmlFor="phong_hoc_id" className={formStyles.label}>Phòng học</label>
              <select id="phong_hoc_id" name="phong_hoc_id" className={formStyles.select} disabled={isPending} defaultValue={buoiHoc.phong_hoc_id ?? ""}>
                <option value="">— Chưa chọn —</option>
                {phongHocList.map((p) => (
                  <option key={p.id} value={p.id}>{p.ten}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label htmlFor="gio_bat_dau" className={formStyles.label}>Giờ bắt đầu</label>
              <input id="gio_bat_dau" name="gio_bat_dau" type="time" className={formStyles.input} disabled={isPending} defaultValue={buoiHoc.gio_bat_dau ?? ""} />
            </div>
            <div className={formStyles.field}>
              <label htmlFor="gio_ket_thuc" className={formStyles.label}>Giờ kết thúc</label>
              <input id="gio_ket_thuc" name="gio_ket_thuc" type="time" className={formStyles.input} disabled={isPending} defaultValue={buoiHoc.gio_ket_thuc ?? ""} />
            </div>
            <div className={formStyles.field}>
              <label htmlFor="trang_thai" className={formStyles.label}>Trạng thái</label>
              <select id="trang_thai" name="trang_thai" required className={formStyles.select} disabled={isPending} defaultValue={buoiHoc.trang_thai}>
                {Object.entries(TRANG_THAI_LABEL).map(([v, label]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </div>
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

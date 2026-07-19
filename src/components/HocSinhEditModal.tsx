"use client";

import { useState, useTransition } from "react";
import { suaHocSinh } from "@/app/dashboard/hoc-sinh/actions";
import { GIOI_TINH_LABEL, GIOI_TINH_OPTIONS, TINH_TRANG_DANG_KY_LABEL, TINH_TRANG_DANG_KY_OPTIONS } from "./hocSinhOptions";
import type { HocSinhRow } from "./HocSinhTable";
import formStyles from "./Form.module.css";
import modalStyles from "@/app/dashboard/hoc-sinh/hoc-sinh.module.css";

export default function HocSinhEditModal({ hocSinh, onClose }: { hocSinh: HocSinhRow; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("id", String(hocSinh.id));

    startTransition(async () => {
      const result = await suaHocSinh(formData);
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
            Sửa thông tin — <span className={modalStyles.mono}>{hocSinh.ma_hoc_sinh}</span>
          </h3>
          <button type="button" className={modalStyles.modalClose} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={formStyles.form} noValidate>
          <div className={formStyles.field}>
            <label htmlFor="ho_ten" className={formStyles.label}>Họ tên học sinh</label>
            <input
              id="ho_ten" name="ho_ten" type="text" required
              className={formStyles.input} disabled={isPending}
              defaultValue={hocSinh.ho_ten}
            />
          </div>

          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label htmlFor="ngay_sinh" className={formStyles.label}>Ngày sinh</label>
              <input
                id="ngay_sinh" name="ngay_sinh" type="date"
                className={formStyles.input} disabled={isPending}
                defaultValue={hocSinh.ngay_sinh ?? ""}
              />
            </div>
            <div className={formStyles.field}>
              <label htmlFor="gioi_tinh" className={formStyles.label}>Giới tính</label>
              <select
                id="gioi_tinh" name="gioi_tinh"
                className={formStyles.select} disabled={isPending}
                defaultValue={hocSinh.gioi_tinh ?? ""}
              >
                <option value="">— Chưa chọn —</option>
                {GIOI_TINH_OPTIONS.map((g) => (
                  <option key={g} value={g}>{GIOI_TINH_LABEL[g]}</option>
                ))}
              </select>
            </div>
            <div className={formStyles.field}>
              <label htmlFor="cccd" className={formStyles.label}>Số CCCD</label>
              <input
                id="cccd" name="cccd" type="text"
                className={formStyles.input} disabled={isPending}
                defaultValue={hocSinh.cccd ?? ""}
              />
            </div>
          </div>

          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label htmlFor="ten_phu_huynh" className={formStyles.label}>Tên phụ huynh</label>
              <input
                id="ten_phu_huynh" name="ten_phu_huynh" type="text"
                className={formStyles.input} disabled={isPending}
                defaultValue={hocSinh.ten_phu_huynh ?? ""}
              />
            </div>
            <div className={formStyles.field}>
              <label htmlFor="sdt_phu_huynh" className={formStyles.label}>SĐT phụ huynh</label>
              <input
                id="sdt_phu_huynh" name="sdt_phu_huynh" type="tel"
                className={formStyles.input} disabled={isPending}
                defaultValue={hocSinh.sdt_phu_huynh ?? ""}
              />
            </div>
          </div>

          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label htmlFor="sdt_hoc_sinh" className={formStyles.label}>SĐT học sinh</label>
              <input
                id="sdt_hoc_sinh" name="sdt_hoc_sinh" type="tel"
                className={formStyles.input} disabled={isPending}
                defaultValue={hocSinh.sdt_hoc_sinh ?? ""}
              />
            </div>
            <div className={formStyles.field}>
              <label htmlFor="email" className={formStyles.label}>Email học sinh</label>
              <input
                id="email" name="email" type="email"
                className={formStyles.input} disabled={isPending}
                defaultValue={hocSinh.email ?? ""}
              />
            </div>
          </div>

          <div className={formStyles.field}>
            <label htmlFor="dia_chi" className={formStyles.label}>Địa chỉ nhà ở</label>
            <input
              id="dia_chi" name="dia_chi" type="text"
              className={formStyles.input} disabled={isPending}
              defaultValue={hocSinh.dia_chi ?? ""}
            />
          </div>

          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label htmlFor="tinh_trang_dang_ky" className={formStyles.label}>Tình trạng đăng ký</label>
              <select
                id="tinh_trang_dang_ky" name="tinh_trang_dang_ky"
                className={formStyles.select} disabled={isPending}
                defaultValue={hocSinh.tinh_trang_dang_ky ?? ""}
              >
                <option value="">— Chưa chọn —</option>
                {TINH_TRANG_DANG_KY_OPTIONS.map((t) => (
                  <option key={t} value={t}>{TINH_TRANG_DANG_KY_LABEL[t]}</option>
                ))}
              </select>
            </div>
            <div className={formStyles.field}>
              <label htmlFor="truong_thpt" className={formStyles.label}>Trường THPT</label>
              <input
                id="truong_thpt" name="truong_thpt" type="text"
                className={formStyles.input} disabled={isPending}
                defaultValue={hocSinh.truong_thpt ?? ""}
              />
            </div>
          </div>

          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label htmlFor="khoi_thi" className={formStyles.label}>Khối thi</label>
              <input
                id="khoi_thi" name="khoi_thi" type="text"
                className={formStyles.input} disabled={isPending}
                defaultValue={hocSinh.khoi_thi ?? ""}
                placeholder="vd A00, D01"
              />
            </div>
            <div className={formStyles.field}>
              <label htmlFor="nv1" className={formStyles.label}>Nguyện vọng 1</label>
              <input
                id="nv1" name="nv1" type="text"
                className={formStyles.input} disabled={isPending}
                defaultValue={hocSinh.nv1 ?? ""}
              />
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

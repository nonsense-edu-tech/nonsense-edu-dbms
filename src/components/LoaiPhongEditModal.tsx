"use client";

import { useState, useTransition } from "react";
import { suaLoaiPhong } from "@/app/dashboard/van-hanh/loai-phong/actions";
import type { LoaiPhongRow } from "./LoaiPhongTable";
import formStyles from "./Form.module.css";
import modalStyles from "@/app/dashboard/van-hanh/van-hanh.module.css";

export default function LoaiPhongEditModal({ loaiPhong, onClose }: { loaiPhong: LoaiPhongRow; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("id", String(loaiPhong.id));

    startTransition(async () => {
      const result = await suaLoaiPhong(formData);
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
          <h3 className={modalStyles.modalTitle}>Sửa loại phòng — {loaiPhong.ten}</h3>
          <button type="button" className={modalStyles.modalClose} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={formStyles.form} noValidate>
          <div className={formStyles.field}>
            <label htmlFor="ten" className={formStyles.label}>Tên loại phòng</label>
            <input id="ten" name="ten" type="text" required className={formStyles.input} disabled={isPending} defaultValue={loaiPhong.ten} />
          </div>

          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label htmlFor="don_gia_thue_gio" className={formStyles.label}>Đơn giá thuê / giờ (đ)</label>
              <input id="don_gia_thue_gio" name="don_gia_thue_gio" type="number" min={0} step={1000} required className={formStyles.input} disabled={isPending} defaultValue={loaiPhong.don_gia_thue_gio} />
            </div>
            <div className={formStyles.field}>
              <label htmlFor="don_gia_dien_nuoc_gio" className={formStyles.label}>Đơn giá điện nước / giờ (đ)</label>
              <input id="don_gia_dien_nuoc_gio" name="don_gia_dien_nuoc_gio" type="number" min={0} step={1000} required className={formStyles.input} disabled={isPending} defaultValue={loaiPhong.don_gia_dien_nuoc_gio} />
            </div>
            <div className={formStyles.field}>
              <label htmlFor="don_gia_khau_hao_gio" className={formStyles.label}>Đơn giá khấu hao / giờ (đ)</label>
              <input id="don_gia_khau_hao_gio" name="don_gia_khau_hao_gio" type="number" min={0} step={1000} className={formStyles.input} disabled={isPending} defaultValue={loaiPhong.don_gia_khau_hao_gio} />
            </div>
          </div>

          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label htmlFor="hieu_luc_tu" className={formStyles.label}>Hiệu lực từ</label>
              <input id="hieu_luc_tu" name="hieu_luc_tu" type="date" required className={formStyles.input} disabled={isPending} defaultValue={loaiPhong.hieu_luc_tu} />
            </div>
            <div className={formStyles.field}>
              <label htmlFor="hieu_luc_den" className={formStyles.label}>Hiệu lực đến</label>
              <input id="hieu_luc_den" name="hieu_luc_den" type="date" className={formStyles.input} disabled={isPending} defaultValue={loaiPhong.hieu_luc_den ?? ""} />
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

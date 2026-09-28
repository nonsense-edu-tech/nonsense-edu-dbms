"use client";

import { useEffect, useState, useTransition } from "react";
import { suaCauHoi, layLuaChonCauHoi } from "@/app/dashboard/hoc-lieu/cau-hoi/actions";
import { useToast } from "./ToastProvider";
import { layLoaiDangCau } from "./dangCauOptions";
import DapAnFields, { type LuaChonInitial } from "./DapAnFields";
import type { CauHoiRow } from "./CauHoiTable";
import formStyles from "./Form.module.css";
import modalStyles from "@/app/dashboard/hoc-lieu/hoc-lieu.module.css";

export default function CauHoiEditModal({ cauHoi, onClose }: { cauHoi: CauHoiRow; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();

  const loaiDangCau = layLoaiDangCau(cauHoi.dang_cau_ma);

  const canLuaChon = loaiDangCau === "single" || loaiDangCau === "multi" || loaiDangCau === "dung_sai";
  const [dangTaiLuaChon, setDangTaiLuaChon] = useState(canLuaChon);
  const [luaChonBanDau, setLuaChonBanDau] = useState<LuaChonInitial[] | null>(null);
  const [loiTaiLuaChon, setLoiTaiLuaChon] = useState<string | null>(null);

  useEffect(() => {
    if (!canLuaChon) return;
    let huy = false;
    layLuaChonCauHoi(cauHoi.id).then((result) => {
      if (huy) return;
      if ("error" in result) {
        setLoiTaiLuaChon(result.error);
      } else {
        setLuaChonBanDau(result.data.map((lc) => ({ noi_dung: lc.noi_dung, la_dap_an: lc.la_dap_an })));
      }
      setDangTaiLuaChon(false);
    });
    return () => {
      huy = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cauHoi.id]);

  const dienKhuyetBanDau = loaiDangCau === "dien_khuyet" && cauHoi.dap_an_text ? cauHoi.dap_an_text.split(" | ") : undefined;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("id", cauHoi.id);

    startTransition(async () => {
      const result = await suaCauHoi(formData);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Sửa câu hỏi thất bại: ${result.error}` });
      } else {
        showToast({ type: "success", message: `Đã sửa câu hỏi "${cauHoi.ma_cau_hoi}" thành công.` });
        onClose();
      }
    });
  }

  return (
    <div className={modalStyles.modalOverlay} onClick={onClose}>
      <div className={modalStyles.modalPanel} onClick={(e) => e.stopPropagation()}>
        <div className={modalStyles.modalHeader}>
          <h3 className={modalStyles.modalTitle}>Sửa câu hỏi — {cauHoi.ma_cau_hoi}</h3>
          <button type="button" className={modalStyles.modalClose} onClick={onClose}>✕</button>
        </div>

        <p className={modalStyles.previewCode}>
          {cauHoi.cap_hoc_ten} · {cauHoi.mon_hoc_ten} · {cauHoi.hoc_phan_ten} · {cauHoi.bai_hoc_ten} · {cauHoi.chu_de_ten} ·{" "}
          {cauHoi.dang_cau_ten}
          <br />
          Không thể đổi phân loại này sau khi tạo (mã câu hỏi đã cố định).
        </p>

        <form onSubmit={handleSubmit} className={formStyles.form} noValidate>
          <div className={formStyles.field}>
            <label htmlFor="noi_dung" className={formStyles.label}>Nội dung câu hỏi</label>
            <textarea
              id="noi_dung"
              name="noi_dung"
              required
              className={formStyles.textarea}
              disabled={isPending}
              rows={4}
              defaultValue={cauHoi.noi_dung}
            />
          </div>

          <div className={formStyles.field}>
            <label htmlFor="do_kho" className={formStyles.label}>Độ khó (tuỳ chọn, 1-5)</label>
            <select id="do_kho" name="do_kho" className={formStyles.select} disabled={isPending} defaultValue={cauHoi.do_kho ?? ""}>
              <option value="">— Không đặt —</option>
              {[1, 2, 3, 4, 5].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {canLuaChon && dangTaiLuaChon && <p className={formStyles.hint}>Đang tải lựa chọn hiện có…</p>}
          {canLuaChon && loiTaiLuaChon && <div className={formStyles.errorBox} role="alert">{loiTaiLuaChon}</div>}
          {(!canLuaChon || !dangTaiLuaChon) && (
            <DapAnFields
              loaiDangCau={loaiDangCau}
              disabled={isPending}
              initialLuaChon={luaChonBanDau ?? undefined}
              initialDienKhuyet={dienKhuyetBanDau}
              initialDapAnText={cauHoi.dap_an_text}
            />
          )}

          <div className={formStyles.field}>
            <label htmlFor="loi_giai" className={formStyles.label}>Lời giải (tuỳ chọn)</label>
            <textarea
              id="loi_giai"
              name="loi_giai"
              className={formStyles.textarea}
              disabled={isPending}
              rows={3}
              defaultValue={cauHoi.loi_giai ?? ""}
            />
          </div>

          {error && <div className={formStyles.errorBox} role="alert">{error}</div>}

          <div className={modalStyles.modalActions}>
            <button type="button" className={modalStyles.btnEdit} onClick={onClose} disabled={isPending}>Huỷ</button>
            <button type="submit" className={formStyles.btnPrimary} disabled={isPending || dangTaiLuaChon}>
              {isPending ? "Đang lưu…" : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

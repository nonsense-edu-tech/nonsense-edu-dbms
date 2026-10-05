"use client";

import { useState, useTransition } from "react";
import { doiTrangThaiGhiDanhVaCongNo, type CongNoGhiDanh } from "@/app/dashboard/hoc-sinh/actions";
import { tienHienThi } from "@/lib/formatCurrency";
import { useToast } from "./ToastProvider";
import { TRANG_THAI_GHI_DANH_LABEL } from "./hocSinhOptions";
import formStyles from "./Form.module.css";
import modalStyles from "@/app/dashboard/hoc-sinh/hoc-sinh.module.css";
import hocPhiStyles from "@/app/dashboard/hoc-phi/hoc-phi.module.css";

export type YeuCauXuLyCongNo = {
  ghiDanhId: string;
  hoTen: string;
  maHocSinh: string;
  trangThaiMoi: string;
  list: CongNoGhiDanh[];
  coTheTatToan: boolean;
};

// Hiện khi đổi ghi danh sang nghỉ/bảo lưu/chuyển lớp mà hợp đồng học phí còn công nợ: không tự đổi dữ liệu
// tài chính — người dùng chọn giữ công nợ (thu dần) hoặc tất toán (miễn phần còn lại).
export default function GhiDanhCongNoModal({ yeuCau, onClose }: { yeuCau: YeuCauXuLyCongNo; onClose: () => void }) {
  const [cach, setCach] = useState<"giu" | "tat_toan">("giu");
  const [lyDo, setLyDo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();
  const tong = yeuCau.list.reduce((t, c) => t + c.con_phai_thu, 0);
  const tenMoi = TRANG_THAI_GHI_DANH_LABEL[yeuCau.trangThaiMoi] ?? yeuCau.trangThaiMoi;
  const baoLuu = yeuCau.trangThaiMoi === "bao_luu";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const tatToan = cach === "tat_toan";
    if (tatToan && lyDo.trim().length < 5) {
      setError("Vui lòng nhập lý do tất toán (tối thiểu 5 ký tự) — lý do được lưu vào nhật ký.");
      return;
    }
    startTransition(async () => {
      const r = await doiTrangThaiGhiDanhVaCongNo(yeuCau.ghiDanhId, yeuCau.trangThaiMoi, tatToan, lyDo);
      if ("error" in r) {
        setError(r.error);
        showToast({ type: "error", message: `Đổi trạng thái ghi danh thất bại: ${r.error}` });
        return;
      }
      if (r.loiTatToan) {
        showToast({
          type: "error",
          message: `Đã đổi trạng thái ghi danh của "${yeuCau.hoTen}" nhưng tất toán thất bại: ${r.loiTatToan}. Hãy tất toán lại ở trang Hợp đồng.`,
        });
      } else if (tatToan) {
        showToast({
          type: "success",
          message: `Đã đổi trạng thái ghi danh của "${yeuCau.hoTen}" thành "${tenMoi}" và tất toán hợp đồng (miễn ${tienHienThi(r.tongMien)}).`,
        });
      } else {
        showToast({
          type: "success",
          message: `Đã đổi trạng thái ghi danh của "${yeuCau.hoTen}" thành "${tenMoi}". Công nợ ${tienHienThi(tong)} được giữ lại ở bảng "Công nợ học sinh đã nghỉ" (trang Thu tiền).`,
        });
      }
      onClose();
    });
  }

  return (
    <div className={modalStyles.modalOverlay} onClick={isPending ? undefined : onClose}>
      <div className={modalStyles.modalPanel} onClick={(e) => e.stopPropagation()}>
        <div className={modalStyles.modalHeader}>
          <h3 className={modalStyles.modalTitle}>Đổi trạng thái ghi danh — {yeuCau.hoTen}</h3>
          <button type="button" className={modalStyles.modalClose} onClick={onClose} disabled={isPending}>✕</button>
        </div>

        <div className={hocPhiStyles.warnBox} role="alert" style={{ marginBottom: 12 }}>
          Học sinh <strong>{yeuCau.hoTen}</strong> ({yeuCau.maHocSinh}) sắp chuyển sang <strong>{tenMoi}</strong> nhưng hợp đồng
          học phí còn phải thu <strong>{tienHienThi(tong)}</strong>. Chọn cách xử lý công nợ:
        </div>

        <form onSubmit={handleSubmit} className={formStyles.form} noValidate>
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13 }}>
            <input type="radio" name="cach" checked={cach === "giu"} onChange={() => setCach("giu")} disabled={isPending} />
            <span>
              <strong>Giữ công nợ{baoLuu ? " (bảo lưu — học sinh sẽ quay lại)" : " để thu dần"}.</strong> Hợp đồng giữ nguyên; khoản
              phải thu nằm ở bảng &quot;Công nợ học sinh đã nghỉ / bảo lưu / chuyển lớp&quot; (trang Thu tiền) và không bị báo quá hạn.
            </span>
          </label>

          {yeuCau.coTheTatToan ? (
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13 }}>
              <input type="radio" name="cach" checked={cach === "tat_toan"} onChange={() => setCach("tat_toan")} disabled={isPending} />
              <span>
                <strong>Tất toán — miễn phần còn lại ({tienHienThi(tong)}).</strong> Hợp đồng chuyển &quot;Hoàn thành&quot;, doanh
                thu ghi nhận = số đã thu. Không hoàn tác trên giao diện; ghi nhật ký.
              </span>
            </label>
          ) : (
            <p className={formStyles.hint}>Chỉ Master Admin, Admin Tuyển sinh và Kế toán được tất toán (miễn công nợ).</p>
          )}

          {cach === "tat_toan" && (
            <div className={formStyles.field}>
              <label htmlFor="ly_do_ghi_danh_tat_toan" className={formStyles.label}>Lý do tất toán (bắt buộc)</label>
              <textarea
                id="ly_do_ghi_danh_tat_toan" rows={2} className={formStyles.textarea} disabled={isPending}
                placeholder="VD: Gia đình xin nghỉ, thỏa thuận miễn phần còn lại"
                value={lyDo} onChange={(e) => setLyDo(e.target.value)}
              />
            </div>
          )}

          {error && <div className={formStyles.errorBox} role="alert">{error}</div>}

          <div className={modalStyles.modalActions}>
            <button type="button" className={modalStyles.btnEdit} onClick={onClose} disabled={isPending}>
              Không đổi
            </button>
            <button type="submit" className={formStyles.btnPrimary} disabled={isPending}>
              {isPending ? "Đang lưu…" : cach === "tat_toan" ? "Đổi trạng thái và tất toán" : "Đổi trạng thái, giữ công nợ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

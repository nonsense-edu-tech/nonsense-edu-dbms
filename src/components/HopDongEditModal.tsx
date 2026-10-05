"use client";

import { useMemo, useState, useTransition } from "react";
import { suaHopDongMaster } from "@/app/dashboard/hoc-phi/hop-dong/actions";
import { HINH_THUC_DONG_LABEL, LOAI_GIAM_GIA_LABEL, tinhDoanhThuThuan } from "./hocPhiOptions";
import { tienHienThi } from "@/lib/formatCurrency";
import { useToast } from "./ToastProvider";
import type { HopDongRow } from "./HopDongTable";
import formStyles from "./Form.module.css";
import styles from "@/app/dashboard/hoc-phi/hoc-phi.module.css";

// Công cụ sửa hợp đồng — chỉ hiển thị cho Master Admin (DB cũng chặn lại ở RPC sua_hop_dong_master).
export default function HopDongEditModal({ hd, onClose }: { hd: HopDongRow; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();

  const [gia, setGia] = useState(String(hd.gia_niem_yet));
  const [loai, setLoai] = useState(hd.loai_giam_gia);
  const [giaTri, setGiaTri] = useState(String(hd.gia_tri_giam_gia));
  const [hinhThuc, setHinhThuc] = useState(hd.hinh_thuc_dong);
  const [ghiChu, setGhiChu] = useState(hd.ghi_chu ?? "");
  const [lyDo, setLyDo] = useState("");

  const xemTruoc = useMemo(() => {
    const g = Number(gia);
    if (!Number.isFinite(g) || g < 0) return null;
    return tinhDoanhThuThuan(g, loai, loai === "khong" ? 0 : Number(giaTri) || 0);
  }, [gia, loai, giaTri]);

  const coThucThu = hd.trang_thai === "dang_hoat_dong" || hd.trang_thai === "hoan_thanh";
  const thuDu = xemTruoc != null && coThucThu && hd.thuc_thu > xemTruoc.doanhThuThuan;
  const khongDoi =
    Number(gia) === hd.gia_niem_yet &&
    loai === hd.loai_giam_gia &&
    (loai === "khong" ? 0 : Number(giaTri) || 0) === hd.gia_tri_giam_gia &&
    hinhThuc === hd.hinh_thuc_dong &&
    ghiChu.trim() === (hd.ghi_chu ?? "").trim();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (khongDoi) {
      setError("Chưa có thay đổi nào so với hiện tại.");
      return;
    }
    if (lyDo.trim().length < 5) {
      setError("Vui lòng nhập lý do chỉnh sửa (tối thiểu 5 ký tự) — lý do được lưu vào nhật ký.");
      return;
    }
    const formData = new FormData(e.currentTarget);
    formData.set("id", hd.id);

    startTransition(async () => {
      const result = await suaHopDongMaster(formData);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Sửa hợp đồng thất bại: ${result.error}` });
        return;
      }
      let msg = `Đã sửa hợp đồng của "${hd.ho_ten}": doanh thu thuần ${tienHienThi(result.doanhThuCu)} → ${tienHienThi(result.doanhThuMoi)}.`;
      if (result.soKy > 0 && result.tongKyDuKien !== result.doanhThuMoi) {
        msg += ` Lưu ý: tổng lịch kỳ đóng (${tienHienThi(result.tongKyDuKien)}) chưa khớp doanh thu thuần mới — cần chỉnh lịch kỳ.`;
      }
      showToast({ type: "success", message: msg });
      onClose();
    });
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Sửa hợp đồng — {hd.ho_ten}</h3>
          <button type="button" className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <p className={formStyles.hint} style={{ marginBottom: 12 }}>
          {hd.goi_ten} · {hd.chuong_trinh_ten} · thực thu hiện tại <strong>{tienHienThi(hd.thuc_thu)}</strong>.
          Mọi thay đổi (giá trị cũ → mới, người sửa, lý do) được ghi vào nhật ký và không thể xoá.
        </p>

        <form onSubmit={handleSubmit} className={formStyles.form} noValidate>
          <div className={formStyles.field}>
            <label htmlFor="gia_niem_yet" className={formStyles.label}>Giá niêm yết (VNĐ)</label>
            <input
              id="gia_niem_yet" name="gia_niem_yet" type="number" min="0" step="1000" required
              className={formStyles.input} disabled={isPending}
              value={gia} onChange={(e) => setGia(e.target.value)}
            />
          </div>

          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label htmlFor="loai_giam_gia" className={formStyles.label}>Giảm giá</label>
              <select
                id="loai_giam_gia" name="loai_giam_gia" className={formStyles.select} disabled={isPending}
                value={loai} onChange={(e) => setLoai(e.target.value)}
              >
                {Object.entries(LOAI_GIAM_GIA_LABEL).map(([v, label]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </div>
            <div className={formStyles.field}>
              <label htmlFor="gia_tri_giam_gia" className={formStyles.label}>
                {loai === "phan_tram" ? "Giá trị giảm (%)" : "Số tiền giảm (VNĐ)"}
              </label>
              <input
                id="gia_tri_giam_gia" name="gia_tri_giam_gia" type="number" min="0"
                max={loai === "phan_tram" ? 100 : undefined} step={loai === "phan_tram" ? 1 : 1000}
                className={formStyles.input} disabled={isPending || loai === "khong"}
                value={loai === "khong" ? "0" : giaTri} onChange={(e) => setGiaTri(e.target.value)}
              />
            </div>
          </div>

          <div className={formStyles.field}>
            <label htmlFor="hinh_thuc_dong" className={formStyles.label}>Hình thức đóng</label>
            <select
              id="hinh_thuc_dong" name="hinh_thuc_dong" className={formStyles.select} disabled={isPending}
              value={hinhThuc} onChange={(e) => setHinhThuc(e.target.value)}
            >
              {Object.entries(HINH_THUC_DONG_LABEL).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </div>

          <div className={formStyles.field}>
            <label htmlFor="ghi_chu" className={formStyles.label}>Ghi chú hợp đồng</label>
            <textarea
              id="ghi_chu" name="ghi_chu" rows={2} className={formStyles.textarea} disabled={isPending}
              value={ghiChu} onChange={(e) => setGhiChu(e.target.value)}
            />
          </div>

          {xemTruoc && (
            <div className={styles.previewBox}>
              Doanh thu thuần: <strong>{tienHienThi(hd.doanh_thu_thuan)}</strong> →{" "}
              <strong>{tienHienThi(xemTruoc.doanhThuThuan)}</strong>{" "}
              (giảm {tienHienThi(xemTruoc.soTienGiam)}).
              {coThucThu && (
                <>
                  <br />
                  Còn phải thu sau khi sửa: <strong>{tienHienThi(Math.max(0, xemTruoc.doanhThuThuan - hd.thuc_thu))}</strong>.
                </>
              )}
            </div>
          )}
          {thuDu && xemTruoc && (
            <div className={styles.warnBox} role="alert">
              Thực thu ({tienHienThi(hd.thuc_thu)}) lớn hơn doanh thu thuần mới ({tienHienThi(xemTruoc.doanhThuThuan)}):
              hợp đồng sẽ ở trạng thái &quot;Thu dư&quot;. Phiếu thu không bị thay đổi.
            </div>
          )}
          <div className={formStyles.hint}>
            Lưu ý: sửa giá không tự cập nhật lịch kỳ đóng và không đổi phiếu thu đã lập.
          </div>

          <div className={formStyles.field}>
            <label htmlFor="ly_do" className={formStyles.label}>Lý do chỉnh sửa (bắt buộc)</label>
            <textarea
              id="ly_do" name="ly_do" rows={2} required className={formStyles.textarea} disabled={isPending}
              placeholder="VD: Phụ huynh được giảm 1,5 triệu theo thỏa thuận ngày …"
              value={lyDo} onChange={(e) => setLyDo(e.target.value)}
            />
          </div>

          {error && <div className={formStyles.errorBox} role="alert">{error}</div>}

          <div className={styles.modalActions}>
            <button type="button" className={styles.btnEdit} onClick={onClose} disabled={isPending}>
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

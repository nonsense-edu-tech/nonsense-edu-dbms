"use client";

import { useMemo, useState, useTransition } from "react";
import { taoCauHoi } from "@/app/dashboard/ngan-hang-cau-hoi/actions";
import { useToast } from "./ToastProvider";
import { DANG_CAU_CHUA_HO_TRO, layLoaiDangCau } from "./dangCauOptions";
import DapAnFields from "./DapAnFields";
import HinhAnhInput from "./HinhAnhInput";
import formStyles from "./Form.module.css";
import styles from "@/app/dashboard/ngan-hang-cau-hoi/ngan-hang-cau-hoi.module.css";

type CapHoc = { ma: number; ten: string };
type ChuongTrinh = { ma: string; ten: string };
type ChuongTrinhMonHoc = { chuong_trinh_ma: string; cap_hoc_ma: number; mon_hoc_ma: number };
type MonHoc = { id: string; ma: number; cap_hoc_ma: number; ten: string };
type HocPhan = { id: string; mon_hoc_id: string; ma: number; ten: string };
type BaiHoc = { id: string; hoc_phan_id: string; ma: number; ten: string };
type ChuDe = { id: string; mon_hoc_id: string; ma: number; ten: string };
type DangCau = { ma: number; ten: string };

export default function CauHoiForm({
  capHocList,
  chuongTrinhList,
  chuongTrinhMonHocList,
  monHocList,
  hocPhanList,
  baiHocList,
  chuDeList,
  dangCauList,
}: {
  capHocList: CapHoc[];
  chuongTrinhList: ChuongTrinh[];
  chuongTrinhMonHocList: ChuongTrinhMonHoc[];
  monHocList: MonHoc[];
  hocPhanList: HocPhan[];
  baiHocList: BaiHoc[];
  chuDeList: ChuDe[];
  dangCauList: DangCau[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();

  const [capHocMa, setCapHocMa] = useState("");
  const [chuongTrinhMa, setChuongTrinhMa] = useState("");
  const [monHocId, setMonHocId] = useState("");
  const [hocPhanId, setHocPhanId] = useState("");
  const [baiHocId, setBaiHocId] = useState("");
  const [chuDeId, setChuDeId] = useState("");
  const [dangCauMa, setDangCauMa] = useState("");
  const [hinhKey, setHinhKey] = useState(0); // đổi key để xoá ảnh đã chọn sau khi tạo xong

  const dangCauKhaDung = useMemo(() => dangCauList.filter((dc) => !DANG_CAU_CHUA_HO_TRO.includes(dc.ma)), [dangCauList]);
  const loaiDangCau = layLoaiDangCau(dangCauMa ? Number(dangCauMa) : null);

  const monHocOptions = useMemo(
    () =>
      monHocList.filter(
        (m) =>
          String(m.cap_hoc_ma) === capHocMa &&
          chuongTrinhMonHocList.some(
            (c) => c.chuong_trinh_ma === chuongTrinhMa && String(c.cap_hoc_ma) === capHocMa && c.mon_hoc_ma === m.ma
          )
      ),
    [monHocList, chuongTrinhMonHocList, capHocMa, chuongTrinhMa]
  );

  const hocPhanOptions = useMemo(() => hocPhanList.filter((hp) => hp.mon_hoc_id === monHocId), [hocPhanList, monHocId]);
  const baiHocOptions = useMemo(() => baiHocList.filter((bh) => bh.hoc_phan_id === hocPhanId), [baiHocList, hocPhanId]);
  const chuDeOptions = useMemo(() => chuDeList.filter((cd) => cd.mon_hoc_id === monHocId), [chuDeList, monHocId]);

  const monHocChon = monHocList.find((m) => m.id === monHocId) ?? null;
  const hocPhanChon = hocPhanList.find((hp) => hp.id === hocPhanId) ?? null;
  const baiHocChon = baiHocList.find((bh) => bh.id === baiHocId) ?? null;
  const chuDeChon = chuDeList.find((cd) => cd.id === chuDeId) ?? null;

  function resetTat() {
    setCapHocMa("");
    setChuongTrinhMa("");
    setMonHocId("");
    setHocPhanId("");
    setBaiHocId("");
    setChuDeId("");
    setDangCauMa("");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await taoCauHoi(formData);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Tạo câu hỏi thất bại: ${result.error}` });
      } else {
        setSuccess(`Đã tạo câu hỏi, mã ${result.data.ma_cau_hoi}`);
        showToast({ type: "success", message: `Đã tạo câu hỏi (mã ${result.data.ma_cau_hoi}) thành công.` });
        form.reset();
        resetTat();
        setHinhKey((k) => k + 1);
      }
    });
  }

  if (capHocList.length === 0 || chuongTrinhList.length === 0 || dangCauList.length === 0) {
    return (
      <p className={formStyles.hint}>
        Thiếu bảng mã gốc (cấp học/chương trình/dạng câu). Vào mục <strong>Vận hành</strong> để thiết lập trước.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={formStyles.form} noValidate>
      <fieldset className={styles.fieldset}>
        <legend className={styles.fieldsetTitle}>Phân loại câu hỏi</legend>

        <div className={formStyles.row}>
          <div className={formStyles.field}>
            <label htmlFor="cap_hoc" className={formStyles.label}>Cấp học</label>
            <select
              id="cap_hoc"
              name="cap_hoc"
              required
              className={formStyles.select}
              disabled={isPending}
              value={capHocMa}
              onChange={(e) => {
                setCapHocMa(e.target.value);
                setMonHocId("");
                setHocPhanId("");
                setBaiHocId("");
                setChuDeId("");
              }}
            >
              <option value="" disabled>— Chọn cấp học —</option>
              {capHocList.map((c) => (
                <option key={c.ma} value={c.ma}>{c.ten}</option>
              ))}
            </select>
          </div>

          <div className={formStyles.field}>
            <label htmlFor="chuong_trinh_ma" className={formStyles.label}>Chương trình</label>
            <select
              id="chuong_trinh_ma"
              name="chuong_trinh_ma"
              required
              className={formStyles.select}
              disabled={isPending}
              value={chuongTrinhMa}
              onChange={(e) => {
                setChuongTrinhMa(e.target.value);
                setMonHocId("");
                setHocPhanId("");
                setBaiHocId("");
                setChuDeId("");
              }}
            >
              <option value="" disabled>— Chọn chương trình —</option>
              {chuongTrinhList.map((c) => (
                <option key={c.ma} value={c.ma}>{c.ten}</option>
              ))}
            </select>
          </div>

          <div className={formStyles.field}>
            <label htmlFor="mon_hoc_id" className={formStyles.label}>Môn học</label>
            <select
              id="mon_hoc_id"
              required
              className={formStyles.select}
              disabled={isPending || !capHocMa || !chuongTrinhMa}
              value={monHocId}
              onChange={(e) => {
                setMonHocId(e.target.value);
                setHocPhanId("");
                setBaiHocId("");
                setChuDeId("");
              }}
            >
              <option value="" disabled>{capHocMa && chuongTrinhMa ? "— Chọn môn học —" : "— Chọn cấp học & chương trình trước —"}</option>
              {monHocOptions.map((m) => (
                <option key={m.id} value={m.id}>{m.ten}</option>
              ))}
            </select>
            {capHocMa && chuongTrinhMa && monHocOptions.length === 0 && (
              <p className={formStyles.hint}>
                Chưa có môn học nào cho tổ hợp này — vào <strong>Học liệu → Chương trình</strong> để thêm.
              </p>
            )}
          </div>
        </div>

        <div className={formStyles.row}>
          <div className={formStyles.field}>
            <label htmlFor="hoc_phan_id" className={formStyles.label}>Học phần</label>
            <select
              id="hoc_phan_id"
              required
              className={formStyles.select}
              disabled={isPending || !monHocId}
              value={hocPhanId}
              onChange={(e) => {
                setHocPhanId(e.target.value);
                setBaiHocId("");
              }}
            >
              <option value="" disabled>{monHocId ? "— Chọn học phần —" : "— Chọn môn học trước —"}</option>
              {hocPhanOptions.map((hp) => (
                <option key={hp.id} value={hp.id}>{hp.ten}</option>
              ))}
            </select>
            {monHocId && hocPhanOptions.length === 0 && (
              <p className={formStyles.hint}>Chưa có học phần nào — vào <strong>Học liệu → Học phần</strong> để thêm.</p>
            )}
          </div>

          <div className={formStyles.field}>
            <label htmlFor="bai_hoc_id" className={formStyles.label}>Bài học</label>
            <select
              id="bai_hoc_id"
              required
              className={formStyles.select}
              disabled={isPending || !hocPhanId}
              value={baiHocId}
              onChange={(e) => setBaiHocId(e.target.value)}
            >
              <option value="" disabled>{hocPhanId ? "— Chọn bài học —" : "— Chọn học phần trước —"}</option>
              {baiHocOptions.map((bh) => (
                <option key={bh.id} value={bh.id}>{bh.ten}</option>
              ))}
            </select>
            {hocPhanId && baiHocOptions.length === 0 && (
              <p className={formStyles.hint}>Chưa có bài học nào — vào <strong>Học liệu → Bài học</strong> để thêm.</p>
            )}
          </div>

          <div className={formStyles.field}>
            <label htmlFor="chu_de_id" className={formStyles.label}>Chủ đề</label>
            <select
              id="chu_de_id"
              required
              className={formStyles.select}
              disabled={isPending || !monHocId}
              value={chuDeId}
              onChange={(e) => setChuDeId(e.target.value)}
            >
              <option value="" disabled>{monHocId ? "— Chọn chủ đề —" : "— Chọn môn học trước —"}</option>
              {chuDeOptions.map((cd) => (
                <option key={cd.id} value={cd.id}>{cd.ten}</option>
              ))}
            </select>
            {monHocId && chuDeOptions.length === 0 && (
              <p className={formStyles.hint}>Chưa có chủ đề nào — vào <strong>Học liệu → Chủ đề</strong> để thêm.</p>
            )}
          </div>
        </div>

        <div className={formStyles.field}>
          <label htmlFor="dang_cau_ma" className={formStyles.label}>Dạng câu</label>
          <select
            id="dang_cau_ma"
            name="dang_cau_ma"
            required
            className={formStyles.select}
            disabled={isPending}
            value={dangCauMa}
            onChange={(e) => setDangCauMa(e.target.value)}
          >
            <option value="" disabled>— Chọn dạng câu —</option>
            {dangCauKhaDung.map((dc) => (
              <option key={dc.ma} value={dc.ma}>{dc.ten}</option>
            ))}
          </select>
          <p className={formStyles.hint}>
            Nối/ghép cặp và Sắp xếp thứ tự/kéo thả chưa có giao diện soạn thảo — sẽ bổ sung ở bước sau.
          </p>
        </div>

        {/* Mã ma-số gửi kèm form, suy ra từ lựa chọn ở trên (không cho sửa tay). */}
        <input type="hidden" name="mon_hoc_ma" value={monHocChon?.ma ?? ""} />
        <input type="hidden" name="hoc_phan_ma" value={hocPhanChon?.ma ?? ""} />
        <input type="hidden" name="bai_hoc_ma" value={baiHocChon?.ma ?? ""} />
        <input type="hidden" name="chu_de_ma" value={chuDeChon?.ma ?? ""} />
      </fieldset>

      <div className={formStyles.field}>
        <label htmlFor="noi_dung" className={formStyles.label}>Nội dung câu hỏi</label>
        <textarea id="noi_dung" name="noi_dung" required className={formStyles.textarea} disabled={isPending} rows={4} />
        <HinhAnhInput key={`de-${hinhKey}`} ten="hinh_de" nhan="đề bài" toiDa={5} disabled={isPending} />
        <p className={formStyles.hint}>Ảnh đề bài (tuỳ chọn, tối đa 5 ảnh JPG/PNG/WebP, mỗi ảnh ≤ 2MB).</p>
      </div>

      <div className={formStyles.row}>
        <div className={formStyles.field}>
          <label htmlFor="do_kho" className={formStyles.label}>Độ khó (tuỳ chọn, 1-5)</label>
          <select id="do_kho" name="do_kho" className={formStyles.select} disabled={isPending} defaultValue="">
            <option value="">— Không đặt —</option>
            {[1, 2, 3, 4, 5].map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      <DapAnFields key={`${dangCauMa}-${hinhKey}`} loaiDangCau={loaiDangCau} disabled={isPending} />

      <div className={formStyles.field}>
        <label htmlFor="loi_giai" className={formStyles.label}>Lời giải (tuỳ chọn)</label>
        <textarea id="loi_giai" name="loi_giai" className={formStyles.textarea} disabled={isPending} rows={3} />
        <HinhAnhInput key={`lg-${hinhKey}`} ten="hinh_loi_giai" nhan="lời giải" toiDa={5} disabled={isPending} />
      </div>

      {error && <div className={formStyles.errorBox} role="alert">{error}</div>}
      {success && <div className={formStyles.successBox} role="status">{success}</div>}

      <button type="submit" className={formStyles.btnPrimary} disabled={isPending}>
        {isPending ? "Đang tạo…" : "Tạo câu hỏi (trạng thái Nháp)"}
      </button>
    </form>
  );
}

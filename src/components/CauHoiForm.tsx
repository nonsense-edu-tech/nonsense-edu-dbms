"use client";

import { useMemo, useState, useTransition } from "react";
import { taoCauHoi } from "@/app/dashboard/ngan-hang-cau-hoi/actions";
import { useToast } from "./ToastProvider";
import { DANG_CAU_CHUA_HO_TRO, layLoaiDangCau } from "./dangCauOptions";
import DapAnFields from "./DapAnFields";
import HinhAnhInput from "./HinhAnhInput";
import RichTextEditor from "./RichTextEditor";
import formStyles from "./Form.module.css";
import styles from "@/app/dashboard/ngan-hang-cau-hoi/ngan-hang-cau-hoi.module.css";

type CapHoc = { ma: number; ten: string };
type MonHoc = { id: string; ma: number; cap_hoc_ma: number; ten: string };
type HocPhan = { id: string; mon_hoc_id: string; ma: number; ten: string };
type BaiHoc = { id: string; hoc_phan_id: string; ma: number; ten: string };
type ChuDe = { id: string; mon_hoc_id: string; ma: number; ten: string };
type DangCau = { ma: number; ten: string };

export default function CauHoiForm({
  capHocList,
  monHocList,
  hocPhanList,
  baiHocList,
  chuDeList,
  dangCauList,
}: {
  capHocList: CapHoc[];
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

  const [monHocId, setMonHocId] = useState("");
  const [hocPhanId, setHocPhanId] = useState("");
  const [baiHocId, setBaiHocId] = useState("");
  const [chuDeId, setChuDeId] = useState("");
  const [dangCauMa, setDangCauMa] = useState("");
  const [hinhKey, setHinhKey] = useState(0); // đổi key để xoá ảnh đã chọn sau khi tạo xong

  const dangCauKhaDung = useMemo(() => dangCauList.filter((dc) => !DANG_CAU_CHUA_HO_TRO.includes(dc.ma)), [dangCauList]);
  const loaiDangCau = layLoaiDangCau(dangCauMa ? Number(dangCauMa) : null);

  // Môn học nhóm theo cấp học (cấp học tự suy ra từ môn — không còn ô chọn riêng).
  const monHocTheoCap = useMemo(
    () =>
      capHocList
        .map((c) => ({ cap: c, mon: monHocList.filter((m) => m.cap_hoc_ma === c.ma) }))
        .filter((nhom) => nhom.mon.length > 0),
    [capHocList, monHocList]
  );

  const hocPhanOptions = useMemo(() => hocPhanList.filter((hp) => hp.mon_hoc_id === monHocId), [hocPhanList, monHocId]);
  const baiHocOptions = useMemo(() => baiHocList.filter((bh) => bh.hoc_phan_id === hocPhanId), [baiHocList, hocPhanId]);
  const chuDeOptions = useMemo(() => chuDeList.filter((cd) => cd.mon_hoc_id === monHocId), [chuDeList, monHocId]);

  const monHocChon = monHocList.find((m) => m.id === monHocId) ?? null;
  const hocPhanChon = hocPhanList.find((hp) => hp.id === hocPhanId) ?? null;
  const baiHocChon = baiHocList.find((bh) => bh.id === baiHocId) ?? null;
  const chuDeChon = chuDeList.find((cd) => cd.id === chuDeId) ?? null;

  function resetTat() {
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

  if (capHocList.length === 0 || monHocList.length === 0 || dangCauList.length === 0) {
    return (
      <p className={formStyles.hint}>
        Thiếu bảng mã gốc (cấp học/môn học/dạng câu). Vào mục <strong>Học liệu</strong> để thiết lập trước.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={formStyles.form} noValidate>
      <fieldset className={styles.fieldset}>
        <legend className={styles.fieldsetTitle}>Phân loại câu hỏi</legend>

        <div className={formStyles.row}>
          <div className={formStyles.field}>
            <label htmlFor="mon_hoc_id" className={formStyles.label}>Môn học</label>
            <select
              id="mon_hoc_id"
              required
              className={formStyles.select}
              disabled={isPending}
              value={monHocId}
              onChange={(e) => {
                setMonHocId(e.target.value);
                setHocPhanId("");
                setBaiHocId("");
                setChuDeId("");
              }}
            >
              <option value="" disabled>— Chọn môn học —</option>
              {monHocTheoCap.map(({ cap, mon }) => (
                <optgroup key={cap.ma} label={cap.ten}>
                  {mon.map((m) => (
                    <option key={m.id} value={m.id}>{m.ten}</option>
                  ))}
                </optgroup>
              ))}
            </select>
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
          </div>
        </div>

        <div className={formStyles.row}>
          <div className={formStyles.field}>
            <label htmlFor="hoc_phan_id" className={formStyles.label}>Học phần (tuỳ chọn)</label>
            <select
              id="hoc_phan_id"
              className={formStyles.select}
              disabled={isPending || !monHocId}
              value={hocPhanId}
              onChange={(e) => {
                setHocPhanId(e.target.value);
                setBaiHocId("");
              }}
            >
              <option value="">{monHocId ? "— Chung (không chọn) —" : "— Chọn môn học trước —"}</option>
              {hocPhanOptions.map((hp) => (
                <option key={hp.id} value={hp.id}>{hp.ten}</option>
              ))}
            </select>
          </div>

          <div className={formStyles.field}>
            <label htmlFor="bai_hoc_id" className={formStyles.label}>Bài học (tuỳ chọn)</label>
            <select
              id="bai_hoc_id"
              className={formStyles.select}
              disabled={isPending || !hocPhanId}
              value={baiHocId}
              onChange={(e) => setBaiHocId(e.target.value)}
            >
              <option value="">{hocPhanId ? "— Chung (không chọn) —" : "— Chọn học phần trước —"}</option>
              {baiHocOptions.map((bh) => (
                <option key={bh.id} value={bh.id}>{bh.ten}</option>
              ))}
            </select>
          </div>

          <div className={formStyles.field}>
            <label htmlFor="chu_de_id" className={formStyles.label}>Chủ đề (tuỳ chọn)</label>
            <select
              id="chu_de_id"
              className={formStyles.select}
              disabled={isPending || !monHocId}
              value={chuDeId}
              onChange={(e) => setChuDeId(e.target.value)}
            >
              <option value="">{monHocId ? "— Chung (không chọn) —" : "— Chọn môn học trước —"}</option>
              {chuDeOptions.map((cd) => (
                <option key={cd.id} value={cd.id}>{cd.ten}</option>
              ))}
            </select>
          </div>
        </div>
        <p className={formStyles.hint}>
          Chỉ cần chọn <strong>môn học</strong> và <strong>dạng câu</strong>. Học phần, bài học, chủ đề để trống nghĩa là
          &quot;Chung&quot; — phân loại này không sửa được sau khi tạo. Câu hỏi tự vào mọi chương trình có chứa môn này.
        </p>
        <p className={formStyles.hint}>
          Nối/ghép cặp và Sắp xếp thứ tự/kéo thả chưa có giao diện soạn thảo — sẽ bổ sung ở bước sau.
        </p>

        {/* Mã ma-số gửi kèm form, suy ra từ lựa chọn ở trên (không cho sửa tay). Chương trình luôn 000 (server). */}
        <input type="hidden" name="cap_hoc" value={monHocChon?.cap_hoc_ma ?? ""} />
        <input type="hidden" name="mon_hoc_ma" value={monHocChon?.ma ?? ""} />
        <input type="hidden" name="hoc_phan_ma" value={hocPhanChon?.ma ?? ""} />
        <input type="hidden" name="bai_hoc_ma" value={baiHocChon?.ma ?? ""} />
        <input type="hidden" name="chu_de_ma" value={chuDeChon?.ma ?? ""} />
      </fieldset>

      <div className={formStyles.field}>
        <label htmlFor="noi_dung" className={formStyles.label}>Nội dung câu hỏi</label>
        <RichTextEditor key={`nd-${hinhKey}`} id="noi_dung" name="noi_dung" nhan="Nội dung câu hỏi" soDong={4} disabled={isPending} />
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
        <RichTextEditor key={`lgt-${hinhKey}`} id="loi_giai" name="loi_giai" nhan="Lời giải" soDong={3} disabled={isPending} />
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

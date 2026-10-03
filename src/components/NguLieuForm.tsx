"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { suaNguLieu, taoNguLieu } from "@/app/dashboard/ngan-hang-cau-hoi/ngu-lieu/actions";
import { LOAI_NGU_LIEU } from "@/lib/ngu-lieu";
import { useToast } from "./ToastProvider";
import RichTextEditor from "./RichTextEditor";
import formStyles from "./Form.module.css";
import styles from "@/app/dashboard/ngan-hang-cau-hoi/ngan-hang-cau-hoi.module.css";

type CapHoc = { ma: number; ten: string };
type MonHoc = { id: string; ma: number; cap_hoc_ma: number; ten: string };
type HocPhan = { id: string; mon_hoc_id: string; ma: number; ten: string };
type BaiHoc = { id: string; hoc_phan_id: string; ma: number; ten: string };
type ChuDe = { id: string; mon_hoc_id: string; ma: number; ten: string };

export type NguLieuBanDau = {
  id: string;
  loai: string;
  tieu_de: string | null;
  noi_dung: string;
  mon_hoc_id: string;
  hoc_phan_id: string | null;
  bai_hoc_id: string | null;
  chu_de_id: string | null;
};

/**
 * Tạo / sửa ngữ liệu. Chế độ sửa: `banDau` có giá trị; `khoaViTri` = true khi ngữ liệu đã có câu con
 * (mã câu hỏi bất biến nên vị trí không đổi được nữa).
 */
export default function NguLieuForm({
  capHocList,
  monHocList,
  hocPhanList,
  baiHocList,
  chuDeList,
  banDau,
  khoaViTri = false,
  onXong,
}: {
  capHocList: CapHoc[];
  monHocList: MonHoc[];
  hocPhanList: HocPhan[];
  baiHocList: BaiHoc[];
  chuDeList: ChuDe[];
  banDau?: NguLieuBanDau;
  khoaViTri?: boolean;
  onXong?: () => void;
}) {
  const router = useRouter();
  const showToast = useToast();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [monHocId, setMonHocId] = useState(banDau?.mon_hoc_id ?? "");
  const [hocPhanId, setHocPhanId] = useState(banDau?.hoc_phan_id ?? "");
  const [baiHocId, setBaiHocId] = useState(banDau?.bai_hoc_id ?? "");
  const [chuDeId, setChuDeId] = useState(banDau?.chu_de_id ?? "");

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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    if (banDau) {
      formData.set("id", banDau.id);
      if (!khoaViTri) formData.set("sua_vi_tri", "1");
    }
    startTransition(async () => {
      if (banDau) {
        const kq = await suaNguLieu(formData);
        if ("error" in kq) {
          setError(kq.error);
          showToast({ type: "error", message: `Sửa ngữ liệu thất bại: ${kq.error}` });
          return;
        }
        showToast({ type: "success", message: "Đã cập nhật ngữ liệu." });
        router.refresh();
        onXong?.();
      } else {
        const kq = await taoNguLieu(formData);
        if ("error" in kq) {
          setError(kq.error);
          showToast({ type: "error", message: `Tạo ngữ liệu thất bại: ${kq.error}` });
          return;
        }
        showToast({ type: "success", message: `Đã tạo ngữ liệu ${kq.data.so_hieu}. Thêm các câu hỏi con ở bước tiếp theo.` });
        router.push(`/dashboard/ngan-hang-cau-hoi/ngu-lieu/${kq.data.id}`);
      }
    });
  }

  if (capHocList.length === 0 || monHocList.length === 0) {
    return (
      <p className={formStyles.hint}>
        Thiếu bảng mã gốc (cấp học/môn học). Vào mục <strong>Học liệu</strong> để thiết lập trước.
      </p>
    );
  }

  const khoa = isPending || khoaViTri;

  return (
    <form onSubmit={handleSubmit} className={formStyles.form} noValidate>
      <fieldset className={styles.fieldset}>
        <legend className={styles.fieldsetTitle}>Vị trí giáo án (một ngữ liệu — một vị trí)</legend>
        <div className={formStyles.row}>
          <div className={formStyles.field}>
            <label htmlFor="nl_mon_hoc_id" className={formStyles.label}>Môn học</label>
            <select
              id="nl_mon_hoc_id"
              name="mon_hoc_id"
              required
              className={formStyles.select}
              disabled={khoa}
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
            <label htmlFor="nl_loai" className={formStyles.label}>Loại ngữ liệu</label>
            <select id="nl_loai" name="loai" required className={formStyles.select} disabled={isPending} defaultValue={banDau?.loai ?? ""}>
              <option value="" disabled>— Chọn loại —</option>
              {LOAI_NGU_LIEU.map((l) => (
                <option key={l.ma} value={l.ma}>{l.ten}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={formStyles.row}>
          <div className={formStyles.field}>
            <label htmlFor="nl_hoc_phan_id" className={formStyles.label}>Học phần (tuỳ chọn)</label>
            <select
              id="nl_hoc_phan_id"
              name="hoc_phan_id"
              className={formStyles.select}
              disabled={khoa || !monHocId}
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
            <label htmlFor="nl_bai_hoc_id" className={formStyles.label}>Bài học (tuỳ chọn)</label>
            <select
              id="nl_bai_hoc_id"
              name="bai_hoc_id"
              className={formStyles.select}
              disabled={khoa || !hocPhanId}
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
            <label htmlFor="nl_chu_de_id" className={formStyles.label}>Chủ đề (tuỳ chọn)</label>
            <select
              id="nl_chu_de_id"
              name="chu_de_id"
              className={formStyles.select}
              disabled={khoa || !monHocId}
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
          {khoaViTri
            ? "Ngữ liệu đã có câu hỏi con nên vị trí không đổi được (mã câu hỏi bất biến). Cần vị trí khác → tạo ngữ liệu mới."
            : "Mọi câu hỏi con tự theo vị trí này. Học phần/bài học/chủ đề để trống nghĩa là \"Chung\"; không đổi được sau khi đã thêm câu hỏi con."}
        </p>
        {/* Select bị disabled không gửi giá trị — khi khoá vị trí, form sửa không dùng các trường này (server bỏ qua). */}
      </fieldset>

      <div className={formStyles.field}>
        <label htmlFor="nl_tieu_de" className={formStyles.label}>Tiêu đề (tuỳ chọn)</label>
        <input id="nl_tieu_de" name="tieu_de" className={formStyles.input} maxLength={200} disabled={isPending} defaultValue={banDau?.tieu_de ?? ""} />
      </div>

      <div className={formStyles.field}>
        <label htmlFor="nl_noi_dung" className={formStyles.label}>Nội dung ngữ liệu</label>
        <RichTextEditor id="nl_noi_dung" name="noi_dung" nhan="Nội dung ngữ liệu" thutLe soDong={10} disabled={isPending} defaultValue={banDau?.noi_dung ?? ""} />
        <p className={formStyles.hint}>
          Văn bản có định dạng, công thức viết trong dấu <code>$…$</code>. Ảnh/biểu đồ cho ngữ liệu chưa hỗ trợ — bảng số liệu hiện nhập dạng văn bản.
        </p>
      </div>

      {error && <div className={formStyles.errorBox} role="alert">{error}</div>}

      <button type="submit" className={formStyles.btnPrimary} disabled={isPending}>
        {isPending ? "Đang lưu…" : banDau ? "Lưu thay đổi" : "Tạo ngữ liệu và thêm câu hỏi con"}
      </button>
    </form>
  );
}

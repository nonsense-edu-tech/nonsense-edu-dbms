"use client";

import { useRef, useState } from "react";
import type { LoaiDangCau } from "./dangCauOptions";
import formStyles from "./Form.module.css";
import styles from "@/app/dashboard/hoc-lieu/hoc-lieu.module.css";

export type LuaChonInitial = { noi_dung: string; la_dap_an: boolean };

type Row<T> = { key: number; initial: T };

function taoRowBanDau<T>(initial: T[] | undefined, macDinh: T[]): { rows: Row<T>[]; keyTiepTheo: number } {
  const list = initial && initial.length > 0 ? initial : macDinh;
  return { rows: list.map((initial, idx) => ({ key: idx, initial })), keyTiepTheo: list.length };
}

const LUA_CHON_MAC_DINH: LuaChonInitial[] = [
  { noi_dung: "", la_dap_an: false },
  { noi_dung: "", la_dap_an: false },
];
const DIEN_KHUYET_MAC_DINH: string[] = [""];

// Dùng chung cho CauHoiForm (tạo) và CauHoiEditModal (sửa) — cấu trúc đáp án
// phụ thuộc dạng câu, xem dangCauOptions.ts. Với "sửa", truyền initialLuaChon/
// initialDienKhuyet/initialDapAnText để prefill; với "tạo" thì để trống (mặc
// định 2 lựa chọn rỗng / 1 chỗ trống rỗng).
export default function DapAnFields({
  loaiDangCau,
  disabled,
  initialLuaChon,
  initialDienKhuyet,
  initialDapAnText,
}: {
  loaiDangCau: LoaiDangCau;
  disabled: boolean;
  initialLuaChon?: LuaChonInitial[];
  initialDienKhuyet?: string[];
  initialDapAnText?: string | null;
}) {
  const luaChonInit = taoRowBanDau(initialLuaChon, LUA_CHON_MAC_DINH);
  const luaChonKeyRef = useRef(luaChonInit.keyTiepTheo);
  const [luaChonRows, setLuaChonRows] = useState<Row<LuaChonInitial>[]>(luaChonInit.rows);

  const dienKhuyetInit = taoRowBanDau(initialDienKhuyet, DIEN_KHUYET_MAC_DINH);
  const dienKhuyetKeyRef = useRef(dienKhuyetInit.keyTiepTheo);
  const [dienKhuyetRows, setDienKhuyetRows] = useState<Row<string>[]>(dienKhuyetInit.rows);

  function themLuaChon() {
    setLuaChonRows((rows) => [...rows, { key: luaChonKeyRef.current++, initial: { noi_dung: "", la_dap_an: false } }]);
  }
  function xoaLuaChon(key: number) {
    setLuaChonRows((rows) => rows.filter((r) => r.key !== key));
  }
  function themDienKhuyet() {
    setDienKhuyetRows((rows) => [...rows, { key: dienKhuyetKeyRef.current++, initial: "" }]);
  }
  function xoaDienKhuyet(key: number) {
    setDienKhuyetRows((rows) => rows.filter((r) => r.key !== key));
  }

  if (loaiDangCau === "single" || loaiDangCau === "multi" || loaiDangCau === "dung_sai") {
    return (
      <fieldset className={styles.fieldset}>
        <legend className={styles.fieldsetTitle}>
          {loaiDangCau === "dung_sai"
            ? "Các mệnh đề (đánh dấu mệnh đề đúng)"
            : loaiDangCau === "single"
              ? "Lựa chọn (đánh dấu đúng 1 đáp án đúng)"
              : "Lựa chọn (đánh dấu ít nhất 1 đáp án đúng)"}
        </legend>
        {luaChonRows.map((row, idx) => (
          <div key={row.key} className={styles.luaChonRow}>
            <input
              type="text"
              name="lua_chon_noi_dung"
              className={formStyles.input}
              placeholder={loaiDangCau === "dung_sai" ? `Mệnh đề ${idx + 1}` : `Lựa chọn ${idx + 1}`}
              defaultValue={row.initial.noi_dung}
              disabled={disabled}
            />
            <label className={styles.luaChonCheck}>
              <input
                type={loaiDangCau === "single" ? "radio" : "checkbox"}
                name="lua_chon_dung"
                value={idx}
                defaultChecked={row.initial.la_dap_an}
                disabled={disabled}
              />
              {loaiDangCau === "dung_sai" ? "Đúng" : "Đáp án đúng"}
            </label>
            {luaChonRows.length > 1 && (
              <button type="button" className={styles.btnEdit} onClick={() => xoaLuaChon(row.key)} disabled={disabled}>✕</button>
            )}
          </div>
        ))}
        <button type="button" className={styles.btnAdd} onClick={themLuaChon} disabled={disabled}>
          + Thêm {loaiDangCau === "dung_sai" ? "mệnh đề" : "lựa chọn"}
        </button>
      </fieldset>
    );
  }

  if (loaiDangCau === "dien_khuyet") {
    return (
      <fieldset className={styles.fieldset}>
        <legend className={styles.fieldsetTitle}>Đáp án cho từng chỗ trống</legend>
        <p className={formStyles.hint}>
          Đánh dấu chỗ trống trong nội dung câu hỏi bằng <code>___</code>; nhập đáp án theo đúng thứ tự chỗ trống
          xuất hiện trong nội dung.
        </p>
        {dienKhuyetRows.map((row, idx) => (
          <div key={row.key} className={styles.luaChonRow}>
            <input
              type="text"
              name="dien_khuyet_dap_an"
              className={formStyles.input}
              placeholder={`Đáp án chỗ trống ${idx + 1}`}
              defaultValue={row.initial}
              disabled={disabled}
            />
            {dienKhuyetRows.length > 1 && (
              <button type="button" className={styles.btnEdit} onClick={() => xoaDienKhuyet(row.key)} disabled={disabled}>✕</button>
            )}
          </div>
        ))}
        <button type="button" className={styles.btnAdd} onClick={themDienKhuyet} disabled={disabled}>
          + Thêm chỗ trống
        </button>
      </fieldset>
    );
  }

  if (loaiDangCau === "text") {
    return (
      <div className={formStyles.field}>
        <label htmlFor="dap_an_text" className={formStyles.label}>
          Đáp án (tuỳ chọn — tự luận có thể để trống, chấm tay)
        </label>
        <input id="dap_an_text" name="dap_an_text" type="text" className={formStyles.input} defaultValue={initialDapAnText ?? ""} disabled={disabled} />
      </div>
    );
  }

  return <p className={formStyles.hint}>Chọn dạng câu ở trên để hiển thị phần nhập đáp án phù hợp.</p>;
}

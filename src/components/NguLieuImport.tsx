"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { nhapMotNguLieu, xemTruocNhapNguLieu } from "@/app/dashboard/ngan-hang-cau-hoi/ngu-lieu/import-actions";
import { PAGE_SIZES } from "@/lib/phan-trang";
import {
  SO_CAU_CON_TOI_DA_MOI_FILE,
  SO_NGU_LIEU_TOI_DA,
  type NhomXemTruoc,
} from "@/lib/ngu-lieu-import";
import { useToast } from "./ToastProvider";
import formStyles from "./Form.module.css";
import styles from "@/app/dashboard/ngan-hang-cau-hoi/ngan-hang-cau-hoi.module.css";

type Buoc = "chon" | "xem-truoc" | "dang-nhap" | "xong";
type KetQuaNhom = { nhom: string; ok: boolean; soHieu?: string; id?: string; soCau?: number; loi?: string };

function rutGon(s: string, n: number): string {
  const g = s.replace(/\s+/g, " ").trim();
  return g.length > n ? g.slice(0, n) + "…" : g;
}

/** Nhập ngữ liệu + câu con từ file .xlsx 2 sheet. Tách riêng khỏi CauHoiImport (nhập câu hỏi lẻ). */
export default function NguLieuImport() {
  const showToast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDoc, startDoc] = useTransition();
  const [buoc, setBuoc] = useState<Buoc>("chon");
  const [tenFile, setTenFile] = useState("");
  const [loi, setLoi] = useState<string | null>(null);
  const [nhom, setNhom] = useState<NhomXemTruoc[]>([]);
  const [moCoi, setMoCoi] = useState<{ soDong: number; loi: string }[]>([]);
  const [chon, setChon] = useState<Set<number>>(new Set()); // theo số dòng ngữ liệu
  const [moRong, setMoRong] = useState<number | null>(null);
  const [trang, setTrang] = useState(1);
  const [size, setSize] = useState<number>(10);
  const [daNhap, setDaNhap] = useState(0);
  const [tong, setTong] = useState(0);
  const [ketQua, setKetQua] = useState<KetQuaNhom[]>([]);

  const soHopLe = nhom.filter((n) => n.hopLe).length;
  const tongTrang = Math.max(1, Math.ceil(nhom.length / size));
  const trangHienTai = Math.min(trang, tongTrang);
  const trangNhom = nhom.slice((trangHienTai - 1) * size, trangHienTai * size);
  const chonHetTrang = trangNhom.some((n) => n.hopLe) && trangNhom.filter((n) => n.hopLe).every((n) => chon.has(n.soDong));
  const soCauDuocChon = useMemo(() => nhom.filter((n) => chon.has(n.soDong)).reduce((t, n) => t + n.cau.length, 0), [nhom, chon]);

  function datLai() {
    setBuoc("chon");
    setTenFile("");
    setLoi(null);
    setNhom([]);
    setMoCoi([]);
    setChon(new Set());
    setMoRong(null);
    setTrang(1);
    setKetQua([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleXemTruoc() {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setLoi("Vui lòng chọn file .xlsx.");
      return;
    }
    setLoi(null);
    const formData = new FormData();
    formData.set("file", file);
    startDoc(async () => {
      const kq = await xemTruocNhapNguLieu(formData);
      if ("error" in kq) {
        setLoi(kq.error);
        showToast({ type: "error", message: `Đọc file thất bại: ${kq.error}` });
        return;
      }
      setTenFile(kq.tenFile);
      setNhom(kq.nhom);
      setMoCoi(kq.dongMoCoi);
      // Mặc định chọn nhóm hợp lệ; nhóm có cảnh báo (nghi trùng) vẫn chọn sẵn nhưng người dùng tự bỏ được.
      setChon(new Set(kq.nhom.filter((n) => n.hopLe).map((n) => n.soDong)));
      setTrang(1);
      setBuoc("xem-truoc");
    });
  }

  function chuyenChon(soDong: number) {
    setChon((cu) => {
      const moi = new Set(cu);
      if (moi.has(soDong)) moi.delete(soDong);
      else moi.add(soDong);
      return moi;
    });
  }

  function chuyenChonTrang() {
    setChon((cu) => {
      const moi = new Set(cu);
      const hopLe = trangNhom.filter((n) => n.hopLe);
      if (hopLe.every((n) => moi.has(n.soDong))) hopLe.forEach((n) => moi.delete(n.soDong));
      else hopLe.forEach((n) => moi.add(n.soDong));
      return moi;
    });
  }

  async function handleNhap() {
    const ds = nhom.filter((n) => n.hopLe && n.nguLieu && chon.has(n.soDong));
    if (ds.length === 0) return;
    setBuoc("dang-nhap");
    setDaNhap(0);
    setTong(ds.length);
    const kq: KetQuaNhom[] = [];
    for (const n of ds) {
      const formData = new FormData();
      formData.set("du_lieu", JSON.stringify({ nguLieu: n.nguLieu, cau: n.cau.map((c) => c.cauHoi) }));
      let res;
      try {
        res = await nhapMotNguLieu(formData);
      } catch {
        res = { error: "Mất kết nối tới máy chủ." };
      }
      if ("error" in res) kq.push({ nhom: n.nhom, ok: false, loi: res.error });
      else kq.push({ nhom: n.nhom, ok: true, soHieu: res.data.so_hieu, id: res.data.id, soCau: res.data.soCau });
      setDaNhap(kq.length);
      // Mất quyền/mất mạng thì dừng — các nhóm còn lại CHƯA được nhập.
      if ("error" in res && /quyền|đăng nhập|kết nối/i.test(res.error)) break;
    }
    setKetQua(kq);
    setBuoc("xong");
    const ok = kq.filter((k) => k.ok).length;
    showToast({
      type: ok === kq.length ? "success" : "error",
      message: `Nhập ngữ liệu: ${ok}/${ds.length} nhóm thành công${ok < ds.length ? " — xem chi tiết lỗi bên dưới" : ""}.`,
    });
  }

  return (
    <div>
      <div className={styles.importBar}>
        <a className={styles.linkBtn} href="/dashboard/ngan-hang-cau-hoi/ngu-lieu/template" download>Tải template (.xlsx)</a>
        <span className={formStyles.hint}>
          File 2 sheet: &quot;Ngữ liệu&quot; và &quot;Câu hỏi con&quot; nối nhau bằng cột Nhóm. Tối đa {SO_NGU_LIEU_TOI_DA} ngữ liệu,{" "}
          {SO_CAU_CON_TOI_DA_MOI_FILE} câu con mỗi file. Chưa hỗ trợ ảnh.
        </span>
      </div>

      {buoc === "chon" && (
        <div className={formStyles.form}>
          <input ref={inputRef} type="file" accept=".xlsx" className={styles.fileInput} disabled={isDoc} />
          {loi && <div className={formStyles.errorBox} role="alert">{loi}</div>}
          <button type="button" className={formStyles.btnPrimary} onClick={handleXemTruoc} disabled={isDoc}>
            {isDoc ? "Đang đọc file…" : "Đọc file và xem trước"}
          </button>
        </div>
      )}

      {buoc === "xem-truoc" && (
        <div>
          <p className={styles.importSummary}>
            <strong>{tenFile}</strong>: {nhom.length} ngữ liệu — {soHopLe} hợp lệ, {nhom.length - soHopLe} có lỗi. Đã chọn{" "}
            {chon.size} ngữ liệu ({soCauDuocChon} câu con).
          </p>
          {moCoi.length > 0 && (
            <div className={formStyles.errorBox} role="alert">
              <strong>{moCoi.length} dòng câu hỏi con không gắn được vào ngữ liệu nào (sẽ không được nhập):</strong>
              <ul>
                {moCoi.slice(0, 10).map((m) => (
                  <li key={m.soDong}>Dòng {m.soDong}: {m.loi}</li>
                ))}
                {moCoi.length > 10 && <li>… và {moCoi.length - 10} dòng nữa.</li>}
              </ul>
            </div>
          )}

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th><input type="checkbox" checked={chonHetTrang} onChange={chuyenChonTrang} aria-label="Chọn cả trang" /></th>
                  <th>Nhóm</th>
                  <th>Loại</th>
                  <th>Tiêu đề</th>
                  <th>Vị trí</th>
                  <th>Số câu con</th>
                  <th>Kiểm tra</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {trangNhom.map((n) => (
                  <NhomDong
                    key={n.soDong}
                    n={n}
                    duocChon={chon.has(n.soDong)}
                    moRong={moRong === n.soDong}
                    onChon={() => chuyenChon(n.soDong)}
                    onMo={() => setMoRong(moRong === n.soDong ? null : n.soDong)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.phanTrangNho}>
            <label>
              Dòng/trang{" "}
              <select value={size} onChange={(e) => { setSize(Number(e.target.value)); setTrang(1); }}>
                {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <button type="button" disabled={trangHienTai <= 1} onClick={() => setTrang(trangHienTai - 1)}>‹</button>
            <span>{trangHienTai}/{tongTrang}</span>
            <button type="button" disabled={trangHienTai >= tongTrang} onClick={() => setTrang(trangHienTai + 1)}>›</button>
          </div>

          <div className={styles.importBar}>
            <button type="button" className={formStyles.btnPrimary} disabled={chon.size === 0} onClick={handleNhap}>
              Nhập {chon.size} ngữ liệu ({soCauDuocChon} câu con)
            </button>
            <button type="button" className={styles.linkBtn} onClick={datLai}>Chọn file khác</button>
          </div>
        </div>
      )}

      {buoc === "dang-nhap" && (
        <div>
          <p className={styles.importSummary}>Đang nhập… {daNhap}/{tong} ngữ liệu. Không đóng trang.</p>
          <div className={styles.tienDo}><div className={styles.tienDoThanh} style={{ width: `${tong ? (daNhap / tong) * 100 : 0}%` }} /></div>
        </div>
      )}

      {buoc === "xong" && (
        <div>
          <p className={styles.importSummary}>
            Xong: {ketQua.filter((k) => k.ok).length}/{ketQua.length} ngữ liệu được nhập (câu hỏi ở trạng thái Nháp).
          </p>
          <ul>
            {ketQua.map((k) => (
              <li key={k.nhom}>
                {k.ok ? (
                  <>Nhóm {k.nhom}: <Link href={`/dashboard/ngan-hang-cau-hoi/ngu-lieu/${k.id}`}>{k.soHieu}</Link> — {k.soCau} câu con</>
                ) : (
                  <span className={styles.errorText}>Nhóm {k.nhom} thất bại: {k.loi}</span>
                )}
              </li>
            ))}
          </ul>
          <button type="button" className={styles.linkBtn} onClick={datLai}>Nhập file khác</button>
        </div>
      )}
    </div>
  );
}

function NhomDong({ n, duocChon, moRong, onChon, onMo }: { n: NhomXemTruoc; duocChon: boolean; moRong: boolean; onChon: () => void; onMo: () => void }) {
  const soLoiCau = n.cau.filter((c) => !c.hopLe).length;
  return (
    <>
      <tr>
        <td><input type="checkbox" checked={duocChon} disabled={!n.hopLe} onChange={onChon} aria-label={`Chọn nhóm ${n.nhom}`} /></td>
        <td>{n.nhom || "—"}</td>
        <td>{n.loai || "—"}</td>
        <td>{rutGon(n.tieuDe, 40) || "—"}</td>
        <td>{rutGon(n.viTri, 50) || "—"}</td>
        <td>{n.cau.length}</td>
        <td>
          {n.hopLe ? (
            n.canhBao.length > 0 || n.cau.some((c) => c.canhBao.length > 0) ? <span className={styles.ghiChuCanhBao}>Hợp lệ, có cảnh báo</span> : "Hợp lệ"
          ) : (
            <span className={styles.ghiChuLoi}>{n.loi.length + soLoiCau} lỗi</span>
          )}
        </td>
        <td><button type="button" className={styles.btnEdit} onClick={onMo}>{moRong ? "Thu gọn" : "Chi tiết"}</button></td>
      </tr>
      {moRong && (
        <tr>
          <td colSpan={8}>
            <div className={styles.chiTiet}>
              <p>Ngữ liệu ở dòng {n.soDong} của sheet &quot;Ngữ liệu&quot;.</p>
              {n.loi.map((l, i) => <p key={`l${i}`} className={styles.ghiChuLoi}>• {l}</p>)}
              {n.canhBao.map((l, i) => <p key={`c${i}`} className={styles.ghiChuCanhBao}>• {l}</p>)}
              <ol>
                {n.cau.map((c) => (
                  <li key={c.soDong}>
                    Dòng {c.soDong} ({c.viTri.dang_cau || "?"}): {c.cauHoi ? rutGon(c.cauHoi.noi_dung, 80) : "—"}
                    {c.loi.map((l, i) => <div key={`l${i}`} className={styles.ghiChuLoi}>✗ {l}</div>)}
                    {c.canhBao.map((l, i) => <div key={`c${i}`} className={styles.ghiChuCanhBao}>⚠ {l}</div>)}
                  </li>
                ))}
              </ol>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

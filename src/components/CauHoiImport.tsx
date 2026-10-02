"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { nhapCauHoiHangLoat, xemTruocNhapCauHoi } from "@/app/dashboard/ngan-hang-cau-hoi/import-actions";
import { CHU_LUA_CHON, SO_CAU_MOI_LO, SO_DONG_TOI_DA, type DongXemTruoc } from "@/lib/cau-hoi-import";
import { PAGE_SIZES } from "@/lib/phan-trang";
import TepUpload from "./TepUpload";
import { useToast } from "./ToastProvider";
import formStyles from "./Form.module.css";
import styles from "@/app/dashboard/ngan-hang-cau-hoi/ngan-hang-cau-hoi.module.css";

type Buoc = "chon" | "xem-truoc" | "dang-nhap" | "xong";
type LocHien = "tat-ca" | "loi" | "canh-bao";
type KetQuaCuoi = { thanhCong: number; thatBai: { soDong: number; ly_do: string }[]; dungSom: string | null };

function rutGon(s: string, n: number): string {
  const g = s.replace(/\s+/g, " ").trim();
  return g.length > n ? g.slice(0, n) + "…" : g;
}

export default function CauHoiImport() {
  const showToast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);
  const zipDaDungRef = useRef<File | null>(null); // zip đã dùng ở bước xem trước — giải nén lại khi nhập
  const [canhBaoZip, setCanhBaoZip] = useState<string[]>([]);
  const [isDoc, startDoc] = useTransition();
  const [buoc, setBuoc] = useState<Buoc>("chon");
  const [tenFile, setTenFile] = useState("");
  const [loi, setLoi] = useState<string | null>(null);
  const [dong, setDong] = useState<DongXemTruoc[]>([]);
  const [chon, setChon] = useState<Set<number>>(new Set()); // theo số dòng trong file
  const [moRong, setMoRong] = useState<number | null>(null);
  const [loc, setLoc] = useState<LocHien>("tat-ca");
  const [trang, setTrang] = useState(1);
  const [size, setSize] = useState<number>(10);
  const [daNhap, setDaNhap] = useState(0);
  const [tongNhap, setTongNhap] = useState(0);
  const [ketQua, setKetQua] = useState<KetQuaCuoi | null>(null);

  const soHopLe = dong.filter((d) => d.hopLe).length;
  const soLoi = dong.length - soHopLe;
  const soTrung = dong.filter((d) => d.hopLe && d.trung).length;

  const hienThi = useMemo(
    () => dong.filter((d) => (loc === "loi" ? !d.hopLe : loc === "canh-bao" ? d.hopLe && d.canhBao.length > 0 : true)),
    [dong, loc]
  );
  const tongTrang = Math.max(1, Math.ceil(hienThi.length / size));
  const trangHienTai = Math.min(trang, tongTrang);
  const trangDong = hienThi.slice((trangHienTai - 1) * size, trangHienTai * size);
  const chonHetTrang = trangDong.filter((d) => d.hopLe).every((d) => chon.has(d.soDong)) && trangDong.some((d) => d.hopLe);

  function datLai() {
    setBuoc("chon");
    setTenFile("");
    setLoi(null);
    setDong([]);
    setChon(new Set());
    setMoRong(null);
    setLoc("tat-ca");
    setTrang(1);
    setKetQua(null);
    if (inputRef.current) inputRef.current.value = "";
    if (zipRef.current) zipRef.current.value = "";
    zipDaDungRef.current = null;
    setCanhBaoZip([]);
  }

  function handleXemTruoc() {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setLoi("Vui lòng chọn file .xlsx hoặc .csv.");
      return;
    }
    setLoi(null);
    const formData = new FormData();
    formData.set("file", file);
    const zip = zipRef.current?.files?.[0] ?? null;
    if (zip) formData.set("zip_anh", zip);
    startDoc(async () => {
      const result = await xemTruocNhapCauHoi(formData);
      if ("error" in result) {
        setLoi(result.error);
        showToast({ type: "error", message: `Đọc file thất bại: ${result.error}` });
        return;
      }
      setTenFile(result.tenFile);
      zipDaDungRef.current = zip;
      setCanhBaoZip(result.canhBaoZip);
      setDong(result.dong);
      // Mặc định chọn các dòng hợp lệ và KHÔNG nghi trùng — dòng nghi trùng để người dùng tự quyết.
      setChon(new Set(result.dong.filter((d) => d.hopLe && !d.trung).map((d) => d.soDong)));
      setTrang(1);
      setLoc("tat-ca");
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
      const hopLe = trangDong.filter((d) => d.hopLe);
      if (hopLe.every((d) => moi.has(d.soDong))) hopLe.forEach((d) => moi.delete(d.soDong));
      else hopLe.forEach((d) => moi.add(d.soDong));
      return moi;
    });
  }

  async function handleNhap() {
    const dsDong = dong.filter((d) => d.hopLe && d.cauHoi && chon.has(d.soDong));
    if (dsDong.length === 0) return;
    setBuoc("dang-nhap");
    setDaNhap(0);
    setTongNhap(dsDong.length);

    let thanhCong = 0;
    const thatBai: KetQuaCuoi["thatBai"] = [];
    let dungSom: string | null = null;

    // Giải nén zip ảnh ngay trên trình duyệt (chỉ khi có dòng được chọn dùng ảnh) rồi chỉ gửi
    // đúng các ảnh cần cho từng lô — không gửi lại cả file zip ở mỗi lô.
    let anhTheoTen = new Map<string, File>();
    if (dsDong.some((d) => d.cauHoi?.hinh) && zipDaDungRef.current) {
      try {
        const JSZip = (await import("jszip")).default;
        const zip = await JSZip.loadAsync(await zipDaDungRef.current.arrayBuffer());
        for (const f of Object.values(zip.files)) {
          if (f.dir || f.name.startsWith("__MACOSX/")) continue;
          const ten = f.name.split("/").pop() ?? "";
          anhTheoTen.set(ten.trim().toLowerCase(), new File([await f.async("blob")], ten));
        }
      } catch {
        anhTheoTen = new Map();
      }
    }

    const tenAnhCuaDong = (d: DongXemTruoc): string[] => {
      const h = d.cauHoi?.hinh;
      if (!h) return [];
      return [...new Set([...h.de, ...h.loi_giai, ...h.lua_chon.map((l) => l.ten)].map((t) => t.trim().toLowerCase()))];
    };

    // Chia lô theo số câu VÀ dung lượng ảnh (≤ 20MB/lô) để không vượt giới hạn body của server.
    const cacLo: DongXemTruoc[][] = [];
    let loHienTai: DongXemTruoc[] = [];
    let byteLo = 0;
    for (const d of dsDong) {
      const byteDong = tenAnhCuaDong(d).reduce((t, ten) => t + (anhTheoTen.get(ten)?.size ?? 0), 0);
      if (loHienTai.length > 0 && (loHienTai.length >= SO_CAU_MOI_LO || byteLo + byteDong > 20 * 1024 * 1024)) {
        cacLo.push(loHienTai);
        loHienTai = [];
        byteLo = 0;
      }
      loHienTai.push(d);
      byteLo += byteDong;
    }
    if (loHienTai.length > 0) cacLo.push(loHienTai);

    let daXong = 0;
    for (const lo of cacLo) {
      const formData = new FormData();
      formData.set("danh_sach", JSON.stringify(lo.map((d) => d.cauHoi!)));
      for (const d of lo) {
        for (const ten of tenAnhCuaDong(d)) {
          const tep = anhTheoTen.get(ten);
          if (tep && !formData.has(`anh:${ten}`)) formData.set(`anh:${ten}`, tep);
        }
      }
      let result;
      try {
        result = await nhapCauHoiHangLoat(formData);
      } catch {
        result = { error: "Mất kết nối tới máy chủ." };
      }
      if ("error" in result) {
        // Lỗi cả lô (mất quyền, mất mạng…): dừng, các dòng còn lại CHƯA được nhập.
        dungSom = result.error;
        lo.forEach((d) => thatBai.push({ soDong: d.soDong, ly_do: result.error }));
        break;
      }
      for (const r of result.ketQua) {
        if (r.error) thatBai.push({ soDong: lo[r.chiSo].soDong, ly_do: r.error });
        else thanhCong++;
      }
      daXong += lo.length;
      setDaNhap(daXong);
    }

    setKetQua({ thanhCong, thatBai, dungSom });
    setBuoc("xong");
    if (thanhCong > 0 && thatBai.length === 0) {
      showToast({ type: "success", message: `Đã nhập ${thanhCong} câu hỏi (trạng thái Nháp) thành công.` });
    } else if (thanhCong > 0) {
      showToast({ type: "success", message: `Đã nhập ${thanhCong} câu hỏi; ${thatBai.length} câu thất bại — xem chi tiết bên dưới.` });
    } else {
      showToast({ type: "error", message: `Nhập câu hỏi từ file thất bại: ${dungSom ?? thatBai[0]?.ly_do ?? "không nhập được câu nào"}` });
    }
  }

  // ---------------------------------------------------------------- Bước chọn file
  if (buoc === "chon") {
    return (
      <div>
        <p className={styles.noticeBox}>
          Quy trình: <strong>(1)</strong> tải template → <strong>(2)</strong> điền câu hỏi theo đúng mẫu →{" "}
          <strong>(3)</strong> tải file lên để xem trước → <strong>(4)</strong> xác nhận nhập. Câu hỏi nhập vào luôn ở
          trạng thái <strong>Nháp</strong>, chờ nộp duyệt. Tối đa {SO_DONG_TOI_DA} câu mỗi file.
        </p>
        <div className={styles.importBar}>
          <a className={styles.linkBtn} href="/dashboard/ngan-hang-cau-hoi/template?dinh_dang=xlsx" download>
            Tải template Excel (.xlsx)
          </a>
          <a className={styles.linkBtn} href="/dashboard/ngan-hang-cau-hoi/template?dinh_dang=csv" download>
            Tải template CSV
          </a>
        </div>
        <p className={formStyles.hint}>
          Nên dùng bản Excel: có sheet hướng dẫn và các sheet tra mã (cấp học, chương trình, môn, học phần, bài học,
          chủ đề, dạng câu) luôn khớp dữ liệu hiện có. File CSV cần lưu dạng UTF-8.
        </p>

        <div className={styles.uploadHang}>
          <TepUpload
            inputRef={inputRef}
            accept=".xlsx,.csv"
            tieuDe="Chọn hoặc kéo thả file câu hỏi vào đây"
            moTa="Excel (.xlsx) hoặc CSV, tối đa 5MB"
            disabled={isDoc}
          />
          <TepUpload
            inputRef={zipRef}
            accept=".zip"
            tieuDe="Chọn hoặc kéo thả file ảnh (.zip)"
            moTa="Chỉ cần khi câu hỏi có ảnh — tối đa 20MB"
            disabled={isDoc}
            tuyChon
          />
        </div>
        <p className={formStyles.hint}>
          Nếu câu hỏi có ảnh: ghi tên file ảnh vào cột <strong>Ảnh đề</strong> / <strong>Ảnh lời giải</strong> (nhiều ảnh
          ngăn cách bằng <code>|</code>) / <strong>Ảnh lựa chọn</strong> (dạng <code>A:a.png | C:c.png</code>), rồi nén
          toàn bộ ảnh vào 1 file zip. Mỗi ảnh JPG/PNG/WebP ≤ 2MB, tên ảnh không trùng nhau.
        </p>
        <div className={styles.importBar}>
          <button type="button" className={formStyles.btnPrimary} onClick={handleXemTruoc} disabled={isDoc}>
            {isDoc ? "Đang đọc file…" : "Đọc file & xem trước"}
          </button>
        </div>
        {loi && <div className={formStyles.errorBox} role="alert">{loi}</div>}
      </div>
    );
  }

  // ---------------------------------------------------------------- Đang nhập / xong
  if (buoc === "dang-nhap") {
    const phanTram = tongNhap > 0 ? Math.round((daNhap / tongNhap) * 100) : 0;
    return (
      <div>
        <p>
          Đang nhập câu hỏi… {daNhap}/{tongNhap}
        </p>
        <div className={styles.tienDo}>
          <div className={styles.tienDoThanh} style={{ width: `${phanTram}%` }} />
        </div>
        <p className={formStyles.hint}>Vui lòng không đóng trang cho tới khi nhập xong.</p>
      </div>
    );
  }

  if (buoc === "xong" && ketQua) {
    return (
      <div>
        {ketQua.thanhCong > 0 && (
          <div className={formStyles.successBox} role="status">
            Đã nhập {ketQua.thanhCong} câu hỏi vào ngân hàng ở trạng thái <strong>Nháp</strong>.
          </div>
        )}
        {ketQua.thatBai.length > 0 && (
          <div className={formStyles.errorBox} role="alert">
            {ketQua.thatBai.length} câu không nhập được{ketQua.dungSom ? " (đã dừng giữa chừng — các câu sau chưa được nhập)" : ""}:
            <ul>
              {ketQua.thatBai.slice(0, 50).map((t) => (
                <li key={t.soDong}>Dòng {t.soDong}: {t.ly_do}</li>
              ))}
            </ul>
            {ketQua.thatBai.length > 50 && <div>… và {ketQua.thatBai.length - 50} câu khác.</div>}
          </div>
        )}
        <div className={styles.importBar}>
          <Link className={styles.linkBtn} href="/dashboard/ngan-hang-cau-hoi?tt=nhap">Xem danh sách câu hỏi (Nháp)</Link>
          <button type="button" className={formStyles.btnPrimary} onClick={datLai}>Nhập file khác</button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- Xem trước
  return (
    <div>
      <div className={styles.importSummary}>
        <span>File: <strong>{tenFile}</strong></span>
        <span><strong>{dong.length}</strong> dòng</span>
        <span><strong>{soHopLe}</strong> hợp lệ</span>
        <span style={{ color: soLoi > 0 ? "#F08080" : undefined }}><strong>{soLoi}</strong> lỗi (không nhập được)</span>
        {soTrung > 0 && <span style={{ color: "var(--accent)" }}><strong>{soTrung}</strong> nghi trùng (mặc định không chọn)</span>}
      </div>

      {canhBaoZip.length > 0 && (
        <div className={styles.noticeBox}>
          <strong>Về file zip ảnh:</strong>
          <ul>
            {canhBaoZip.slice(0, 10).map((t, i) => (
              <li key={i}>{t}</li>
            ))}
            {canhBaoZip.length > 10 && <li>… và {canhBaoZip.length - 10} cảnh báo khác.</li>}
          </ul>
        </div>
      )}

      <div className={styles.importBar}>
        <select className={styles.rowSelect} value={loc} onChange={(e) => { setLoc(e.target.value as LocHien); setTrang(1); }}>
          <option value="tat-ca">Tất cả dòng</option>
          <option value="loi">Chỉ dòng lỗi</option>
          <option value="canh-bao">Chỉ dòng có cảnh báo</option>
        </select>
        <button type="button" className={styles.btnEdit} onClick={datLai}>Chọn file khác</button>
        <button type="button" className={formStyles.btnPrimary} onClick={handleNhap} disabled={chon.size === 0}>
          Nhập {chon.size} câu hỏi (Nháp)
        </button>
      </div>

      {hienThi.length === 0 ? (
        <p className={styles.empty}>Không có dòng nào khớp bộ lọc.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>
                  <input type="checkbox" checked={chonHetTrang} onChange={chuyenChonTrang} aria-label="Chọn các dòng hợp lệ của trang" />
                </th>
                <th>Dòng</th>
                <th>Vị trí giáo án</th>
                <th>Dạng câu</th>
                <th>Nội dung</th>
                <th>Kiểm tra</th>
              </tr>
            </thead>
            <tbody>
              {trangDong.map((d) => {
                const c = d.cauHoi;
                const dangMo = moRong === d.soDong;
                return (
                  <PreviewRow key={d.soDong} d={d} dangMo={dangMo} daChon={chon.has(d.soDong)} onChon={() => chuyenChon(d.soDong)} onMo={() => setMoRong(dangMo ? null : d.soDong)} c={c} />
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.phanTrangNho}>
        <span>Dòng/trang</span>
        <select className={styles.rowSelect} value={size} onChange={(e) => { setSize(Number(e.target.value)); setTrang(1); }}>
          {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <button type="button" className={styles.btnEdit} onClick={() => setTrang(trangHienTai - 1)} disabled={trangHienTai <= 1}>‹ Trước</button>
        <span>Trang {trangHienTai}/{tongTrang}</span>
        <button type="button" className={styles.btnEdit} onClick={() => setTrang(trangHienTai + 1)} disabled={trangHienTai >= tongTrang}>Sau ›</button>
      </div>
    </div>
  );
}

function PreviewRow({
  d,
  c,
  dangMo,
  daChon,
  onChon,
  onMo,
}: {
  d: DongXemTruoc;
  c: DongXemTruoc["cauHoi"];
  dangMo: boolean;
  daChon: boolean;
  onChon: () => void;
  onMo: () => void;
}) {
  const viTri = [d.viTri.cap_hoc, d.viTri.chuong_trinh, d.viTri.mon_hoc, d.viTri.hoc_phan, d.viTri.bai_hoc, d.viTri.chu_de].filter(Boolean).join(" › ");
  const noiDung = c?.noi_dung ?? "";
  const lopDong = !d.hopLe ? styles.dongLoi : d.canhBao.length > 0 ? styles.dongCanhBao : undefined;

  return (
    <>
      <tr className={lopDong}>
        <td>
          <input type="checkbox" checked={daChon} disabled={!d.hopLe} onChange={onChon} aria-label={`Chọn dòng ${d.soDong}`} />
        </td>
        <td className={styles.mono}>{d.soDong}</td>
        <td>{viTri || "—"}</td>
        <td>{d.viTri.dang_cau || "—"}</td>
        <td>
          {c ? (
            <>
              {rutGon(noiDung, 120)}{" "}
              <button type="button" className={styles.btnEdit} onClick={onMo}>{dangMo ? "Thu gọn" : "Xem"}</button>
            </>
          ) : (
            "—"
          )}
        </td>
        <td>
          {d.hopLe ? <span style={{ color: "var(--success)" }}>Hợp lệ</span> : <span className={styles.ghiChuLoi}>Lỗi</span>}
          {d.loi.map((l, i) => <div key={`l${i}`} className={styles.ghiChuLoi}>{l}</div>)}
          {d.canhBao.map((w, i) => <div key={`w${i}`} className={styles.ghiChuCanhBao}>{w}</div>)}
        </td>
      </tr>
      {dangMo && c && (
        <tr>
          <td />
          <td colSpan={5}>
            <div className={styles.chiTiet}>
              {c.noi_dung}
              {c.lua_chon.length > 0 && (
                <ul>
                  {c.lua_chon.map((l, i) => (
                    <li key={i}>
                      <strong>{CHU_LUA_CHON[i]}.</strong> {l.noi_dung} {l.la_dap_an && <span className={styles.chiTietDung}>✓ đúng</span>}
                    </li>
                  ))}
                </ul>
              )}
              {c.dap_an_text && <div><strong>Đáp án:</strong> {c.dap_an_text}</div>}
              {c.do_kho != null && <div><strong>Độ khó:</strong> {c.do_kho}</div>}
              {c.loi_giai && <div><strong>Lời giải:</strong> {c.loi_giai}</div>}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useToast } from "@/components/ToastProvider";
import { doPhuMaTran, luuMaTran, type DoPhuRow, type DongInput } from "./actions";
import styles from "./de-thi.module.css";

export type MonOption = { id: string; cap_hoc_ma: number; ma: number; ten: string; cap_ten: string };
export type DanhMuc = {
  monHoc: MonOption[];
  hocPhan: { id: string; mon_hoc_id: string; ma: number; ten: string }[];
  baiHoc: { id: string; hoc_phan_id: string; ma: number; ten: string }[];
  chuDe: { id: string; mon_hoc_id: string; ma: number; ten: string }[];
  dangCau: { ma: number; ten: string }[];
  tienTrinh: { ma: string; ten: string }[];
};

export type MaTranInit = {
  id: string | null;
  ten: string;
  moTa: string;
  capHocMa: number | null;
  monHocMa: number | null;
  dong: (DongInput & { key: string })[];
  daCoDeDaChot: boolean;
};

const LOAI_NGU_LIEU = [
  { v: "", t: "Câu độc lập" },
  { v: "doc_core", t: "Cụm bài đọc" },
  { v: "so_lieu", t: "Cụm số liệu" },
  { v: "logic", t: "Cụm tình huống logic" },
  { v: "khac", t: "Cụm ngữ liệu khác" },
];

let dem = 0;
function dongMoi(): DongInput & { key: string } {
  dem += 1;
  return { key: `moi-${dem}-${Date.now()}`, thu_tu: 0, nhan: "", loai_ngu_lieu: null, so_luong: 5, cau_moi_cum: null, do_kho_tu: 1, do_kho_den: 5, cho_phep_noi_do_kho: false, diem_moi_cau: null };
}

const num = (v: string): number | null => (v === "" ? null : Number(v));

export default function MaTranEditor({ init, dm }: { init: MaTranInit; dm: DanhMuc }) {
  const router = useRouter();
  const showToast = useToast();
  const [pending, startTransition] = useTransition();
  const [id, setId] = useState(init.id);
  const [ten, setTen] = useState(init.ten);
  const [moTa, setMoTa] = useState(init.moTa);
  const [mon, setMon] = useState(init.capHocMa != null && init.monHocMa != null ? `${init.capHocMa}-${init.monHocMa}` : "");
  const [dong, setDong] = useState(init.dong.length ? init.dong : [dongMoi()]);
  const [doPhu, setDoPhu] = useState<Record<string, DoPhuRow> | null>(null);

  const monDuocChon = useMemo(() => dm.monHoc.find((m) => `${m.cap_hoc_ma}-${m.ma}` === mon) ?? null, [dm.monHoc, mon]);
  const khoa = init.daCoDeDaChot;

  const tong = useMemo(() => {
    let cau = 0;
    let diem = 0;
    let khongBiet = false;
    for (const d of dong) {
      const n = d.loai_ngu_lieu ? (d.cau_moi_cum ? d.so_luong * d.cau_moi_cum : null) : d.so_luong;
      if (n === null) {
        khongBiet = true;
        continue;
      }
      cau += n;
      diem += n * (d.diem_moi_cau ?? 0);
    }
    return { cau, diem, khongBiet };
  }, [dong]);

  function sua(key: string, patch: Partial<DongInput>) {
    setDoPhu(null);
    setDong((cur) => cur.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function di(key: string, huong: -1 | 1) {
    setDoPhu(null);
    setDong((cur) => {
      const i = cur.findIndex((d) => d.key === key);
      const j = i + huong;
      if (i < 0 || j < 0 || j >= cur.length) return cur;
      const c = [...cur];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  }

  function luu(sau?: (id: string) => void) {
    if (!monDuocChon) {
      showToast({ type: "error", message: "Chọn môn học." });
      return;
    }
    startTransition(async () => {
      const r = await luuMaTran({
        id,
        ten,
        moTa,
        capHocMa: monDuocChon.cap_hoc_ma,
        monHocMa: monDuocChon.ma,
        dong: dong.map((d) => {
          const rest: DongInput & { key?: string } = { ...d };
          delete rest.key;
          return { ...rest, id: d.id ?? null };
        }),
      });
      if ("error" in r) {
        showToast({ type: "error", message: r.error });
        return;
      }
      showToast({ type: "success", message: "Đã lưu ma trận." });
      setId(r.id);
      setDong((cur) => cur.map((d, i) => ({ ...d, id: r.dongIds[i] ?? d.id })));
      if (!id && !sau) router.replace(`/dashboard/de-thi/ma-tran/${r.id}`);
      sau?.(r.id);
      router.refresh();
    });
  }

  function kiemTraDoPhu() {
    luu(async (mid) => {
      const r = await doPhuMaTran(mid);
      if ("error" in r) {
        showToast({ type: "error", message: r.error });
        return;
      }
      setDoPhu(Object.fromEntries(r.rows.map((x) => [x.dong_id, x])));
    });
  }

  return (
    <div className={styles.workspace}>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Thông tin ma trận</h2>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>Tên ma trận</span>
            <input className={styles.input} value={ten} disabled={khoa} onChange={(e) => setTen(e.target.value)} placeholder="VD: Kiểm tra giữa kỳ — Toán 10" />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Môn học</span>
            <select className={styles.input} value={mon} disabled={khoa} onChange={(e) => setMon(e.target.value)}>
              <option value="">— Chọn môn —</option>
              {dm.monHoc.map((m) => (
                <option key={m.id} value={`${m.cap_hoc_ma}-${m.ma}`}>{m.cap_ten} · {m.ten}</option>
              ))}
            </select>
          </label>
        </div>
        <label className={styles.field}>
          <span className={styles.label}>Mô tả (tuỳ chọn)</span>
          <input className={styles.input} value={moTa} disabled={khoa} onChange={(e) => setMoTa(e.target.value)} />
        </label>
        {khoa && <p className={styles.noticeWarn}>Ma trận này đã dùng cho đề đã chốt nên không sửa được. Hãy nhân bản ma trận ở danh sách để chỉnh.</p>}
      </section>

      <section className={styles.card}>
        <div className={styles.rowBetween}>
          <h2 className={styles.cardTitle}>Các dòng ma trận</h2>
          <span className={styles.muted}>
            Tổng {tong.cau}{tong.khongBiet ? "+" : ""} câu{tong.diem > 0 ? ` · ${Math.round(tong.diem * 100) / 100} điểm` : ""}
          </span>
        </div>

        {dong.map((d, i) => {
          const hp = monDuocChon ? dm.hocPhan.filter((x) => x.mon_hoc_id === monDuocChon.id) : [];
          const hpChon = hp.find((x) => x.ma === d.hoc_phan_ma && d.hoc_phan_ma !== 0);
          const bai = hpChon ? dm.baiHoc.filter((x) => x.hoc_phan_id === hpChon.id) : [];
          const cd = monDuocChon ? dm.chuDe.filter((x) => x.mon_hoc_id === monDuocChon.id) : [];
          const dp = d.id ? doPhu?.[d.id] : undefined;
          const chip = dp ? (dp.co_dung > dp.can ? ["Đủ", styles.chipDu] : dp.co_dung === dp.can ? ["Vừa đủ", styles.chipVua] : dp.co_noi >= dp.can ? ["Đủ nếu nới độ khó", styles.chipVua] : ["Thiếu", styles.chipThieu]) : null;
          return (
            <div key={d.key} className={styles.dong}>
              <div className={styles.dongHead}>
                <strong>Dòng {i + 1}</strong>
                <input className={styles.input} placeholder="Tên phần (VD: Phần I — Trắc nghiệm)" value={d.nhan ?? ""} disabled={khoa} onChange={(e) => sua(d.key, { nhan: e.target.value })} />
                {chip && <span className={`${styles.chip} ${chip[1]}`}>{chip[0]} ({dp!.co_dung}/{dp!.can}{dp!.co_noi > dp!.co_dung ? `, nới: ${dp!.co_noi}` : ""})</span>}
                {!khoa && (
                  <span className={styles.donViBtns}>
                    <button type="button" className={styles.btnMini} disabled={i === 0} onClick={() => di(d.key, -1)} aria-label="Lên">↑</button>
                    <button type="button" className={styles.btnMini} disabled={i === dong.length - 1} onClick={() => di(d.key, 1)} aria-label="Xuống">↓</button>
                    <button type="button" className={styles.btnMiniDanger} disabled={dong.length === 1} onClick={() => { setDoPhu(null); setDong((c) => c.filter((x) => x.key !== d.key)); }}>Xoá</button>
                  </span>
                )}
              </div>
              <fieldset className={styles.dongGrid} disabled={khoa}>
                <label className={styles.field}>
                  <span className={styles.label}>Loại</span>
                  <select className={styles.input} value={d.loai_ngu_lieu ?? ""} onChange={(e) => sua(d.key, { loai_ngu_lieu: e.target.value || null, cau_moi_cum: e.target.value ? d.cau_moi_cum : null })}>
                    {LOAI_NGU_LIEU.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>{d.loai_ngu_lieu ? "Số cụm" : "Số câu"}</span>
                  <input className={styles.input} type="number" min={1} max={200} value={d.so_luong} onChange={(e) => sua(d.key, { so_luong: Number(e.target.value) })} />
                </label>
                {d.loai_ngu_lieu && (
                  <label className={styles.field}>
                    <span className={styles.label}>Câu mỗi cụm</span>
                    <input className={styles.input} type="number" min={1} max={50} placeholder="Trọn cụm" value={d.cau_moi_cum ?? ""} onChange={(e) => sua(d.key, { cau_moi_cum: num(e.target.value) })} />
                  </label>
                )}
                <label className={styles.field}>
                  <span className={styles.label}>Dạng câu</span>
                  <select className={styles.input} value={d.dang_cau_ma ?? ""} onChange={(e) => sua(d.key, { dang_cau_ma: num(e.target.value) })}>
                    <option value="">Mọi dạng</option>
                    {dm.dangCau.map((x) => <option key={x.ma} value={x.ma}>{x.ten}</option>)}
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Học phần</span>
                  <select className={styles.input} value={d.hoc_phan_ma ?? ""} onChange={(e) => sua(d.key, { hoc_phan_ma: num(e.target.value), bai_hoc_ma: null })}>
                    <option value="">Tất cả</option>
                    {hp.map((x) => <option key={x.id} value={x.ma}>{x.ten}</option>)}
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Bài học</span>
                  <select className={styles.input} value={d.bai_hoc_ma ?? ""} disabled={!hpChon} onChange={(e) => sua(d.key, { bai_hoc_ma: num(e.target.value) })}>
                    <option value="">Tất cả</option>
                    {bai.map((x) => <option key={x.id} value={x.ma}>{x.ten}</option>)}
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Chủ đề</span>
                  <select className={styles.input} value={d.chu_de_ma ?? ""} onChange={(e) => sua(d.key, { chu_de_ma: num(e.target.value) })}>
                    <option value="">Tất cả</option>
                    {cd.map((x) => <option key={x.id} value={x.ma}>{x.ten}</option>)}
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Tiến trình</span>
                  <select className={styles.input} value={d.tien_trinh ?? ""} onChange={(e) => sua(d.key, { tien_trinh: e.target.value || null })}>
                    <option value="">Tất cả</option>
                    {dm.tienTrinh.map((x) => <option key={x.ma} value={x.ma}>{x.ten}</option>)}
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Độ khó từ</span>
                  <select className={styles.input} value={d.do_kho_tu} onChange={(e) => sua(d.key, { do_kho_tu: Number(e.target.value) })}>
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>đến</span>
                  <select className={styles.input} value={d.do_kho_den} onChange={(e) => sua(d.key, { do_kho_den: Number(e.target.value) })}>
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Điểm / câu</span>
                  <input className={styles.input} type="number" step="0.05" min={0} value={d.diem_moi_cau ?? ""} onChange={(e) => sua(d.key, { diem_moi_cau: num(e.target.value) })} />
                </label>
                <label className={`${styles.check} ${styles.checkInline}`}>
                  <input type="checkbox" checked={d.cho_phep_noi_do_kho} onChange={(e) => sua(d.key, { cho_phep_noi_do_kho: e.target.checked })} />
                  Thiếu thì nới độ khó ±1
                </label>
              </fieldset>
            </div>
          );
        })}

        {!khoa && (
          <div className={styles.actions}>
            <button type="button" className={styles.btnGhost} onClick={() => setDong((c) => [...c, dongMoi()])}>+ Thêm dòng</button>
            <button type="button" className={styles.btnGhost} disabled={pending} onClick={kiemTraDoPhu}>Lưu & kiểm tra độ phủ ngân hàng</button>
            <button type="button" className={styles.btnPrimary} disabled={pending} onClick={() => luu()}>{pending ? "Đang lưu…" : "Lưu ma trận"}</button>
          </div>
        )}
        {id && (
          <p className={styles.actions}>
            <Link className={styles.btnPrimary} href={`/dashboard/de-thi/moi?mt=${id}`}>Tạo đề từ ma trận này →</Link>
          </p>
        )}
      </section>
    </div>
  );
}

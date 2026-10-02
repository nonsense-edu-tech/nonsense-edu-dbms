"use client";

import { useCallback, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CAC_KHOA_LOC, type BoLocCauHoi } from "@/lib/cau-hoi-loc";
import { TRANG_THAI_LABEL } from "./trangThaiCauHoi";
import styles from "@/app/dashboard/ngan-hang-cau-hoi/ngan-hang-cau-hoi.module.css";

type CapHoc = { ma: number; ten: string };
type ChuongTrinh = { ma: string; ten: string };
type MonHoc = { id: string; ma: number; cap_hoc_ma: number; ten: string };
type HocPhan = { id: string; mon_hoc_id: string; ten: string };
type BaiHoc = { id: string; hoc_phan_id: string; ten: string };
type ChuDe = { id: string; mon_hoc_id: string; ten: string };
type DangCau = { ma: number; ten: string };

/**
 * Thanh tìm kiếm + bộ lọc danh sách câu hỏi (cùng kiểu danh sách học sinh):
 * bộ lọc nằm trên URL, đổi bộ lọc luôn về trang 1, ô tìm kiếm chờ ~300ms sau
 * lần gõ cuối. Học phần / Bài học / Chủ đề chỉ hiện khi đã chọn cấp cha.
 * `children` (bảng + phân trang do server render) mờ đi khi đang tải lại.
 */
export default function CauHoiLoc({
  boLoc,
  dangLoc,
  capHocList,
  chuongTrinhList,
  monHocList,
  hocPhanList,
  baiHocList,
  chuDeList,
  dangCauList,
  children,
}: {
  boLoc: BoLocCauHoi;
  dangLoc: boolean;
  capHocList: CapHoc[];
  chuongTrinhList: ChuongTrinh[];
  monHocList: MonHoc[];
  hocPhanList: HocPhan[];
  baiHocList: BaiHoc[];
  chuDeList: ChuDe[];
  dangCauList: DangCau[];
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLocPending, startLocTransition] = useTransition();
  const [query, setQuery] = useState(boLoc.q);

  const capHocTen = useMemo(() => new Map(capHocList.map((c) => [String(c.ma), c.ten])), [capHocList]);
  const monHocOptions = useMemo(
    () => (boLoc.cap ? monHocList.filter((m) => String(m.cap_hoc_ma) === boLoc.cap) : monHocList),
    [monHocList, boLoc.cap]
  );
  const hocPhanOptions = useMemo(() => hocPhanList.filter((h) => h.mon_hoc_id === boLoc.mon), [hocPhanList, boLoc.mon]);
  const baiHocOptions = useMemo(() => baiHocList.filter((b) => b.hoc_phan_id === boLoc.hp), [baiHocList, boLoc.hp]);
  const chuDeOptions = useMemo(() => chuDeList.filter((c) => c.mon_hoc_id === boLoc.mon), [chuDeList, boLoc.mon]);

  // Bộ lọc nằm trên URL. Đổi bộ lọc luôn về trang 1; đổi cấp cha thì xoá các cấp con.
  const datBoLoc = useCallback(
    (thayDoi: Partial<BoLocCauHoi>) => {
      const qs = new URLSearchParams(searchParams.toString());
      qs.delete("page");
      for (const [k, v] of Object.entries(thayDoi)) {
        if (v) qs.set(k, v);
        else qs.delete(k);
      }
      const url = qs.size > 0 ? `${pathname}?${qs.toString()}` : pathname;
      startLocTransition(() => router.replace(url));
    },
    [pathname, router, searchParams]
  );

  // Ô tìm kiếm: chờ ~300ms sau lần gõ cuối mới truy vấn server.
  useEffect(() => {
    const dangGo = query.trim();
    if (dangGo === boLoc.q) return;
    const t = setTimeout(() => datBoLoc({ q: dangGo }), 300);
    return () => clearTimeout(t);
  }, [query, boLoc.q, datBoLoc]);

  // Back/Forward hoặc "Xoá bộ lọc" làm đổi ?q từ ngoài → đồng bộ lại ô nhập.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(boLoc.q);
  }, [boLoc.q]);

  return (
    <div>
      <div className={styles.searchRow}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Tìm theo mã câu hỏi, nội dung..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className={styles.rowSelect} value={boLoc.cap} onChange={(e) => datBoLoc({ cap: e.target.value, mon: "", hp: "", bh: "", cd: "" })}>
          <option value="">— Tất cả cấp học —</option>
          {capHocList.map((c) => (
            <option key={c.ma} value={c.ma}>{c.ten}</option>
          ))}
        </select>
        <select className={styles.rowSelect} value={boLoc.ct} onChange={(e) => datBoLoc({ ct: e.target.value })}>
          <option value="">— Tất cả chương trình —</option>
          {chuongTrinhList.map((c) => (
            <option key={c.ma} value={c.ma}>{c.ten}</option>
          ))}
        </select>
        <select className={styles.rowSelect} value={boLoc.mon} onChange={(e) => datBoLoc({ mon: e.target.value, hp: "", bh: "", cd: "" })}>
          <option value="">— Tất cả môn học —</option>
          {monHocOptions.map((m) => (
            <option key={m.id} value={m.id}>
              {boLoc.cap ? m.ten : `${capHocTen.get(String(m.cap_hoc_ma)) ?? m.cap_hoc_ma} — ${m.ten}`}
            </option>
          ))}
        </select>
        {boLoc.mon && (
          <>
            <select className={styles.rowSelect} value={boLoc.hp} onChange={(e) => datBoLoc({ hp: e.target.value, bh: "" })}>
              <option value="">— Tất cả học phần —</option>
              {hocPhanOptions.map((h) => (
                <option key={h.id} value={h.id}>{h.ten}</option>
              ))}
            </select>
            {boLoc.hp && (
              <select className={styles.rowSelect} value={boLoc.bh} onChange={(e) => datBoLoc({ bh: e.target.value })}>
                <option value="">— Tất cả bài học —</option>
                {baiHocOptions.map((b) => (
                  <option key={b.id} value={b.id}>{b.ten}</option>
                ))}
              </select>
            )}
            <select className={styles.rowSelect} value={boLoc.cd} onChange={(e) => datBoLoc({ cd: e.target.value })}>
              <option value="">— Tất cả chủ đề —</option>
              {chuDeOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.ten}</option>
              ))}
            </select>
          </>
        )}
        <select className={styles.rowSelect} value={boLoc.dang} onChange={(e) => datBoLoc({ dang: e.target.value })}>
          <option value="">— Tất cả dạng câu —</option>
          {dangCauList.map((d) => (
            <option key={d.ma} value={d.ma}>{d.ten}</option>
          ))}
        </select>
        <select className={styles.rowSelect} value={boLoc.tt} onChange={(e) => datBoLoc({ tt: e.target.value })}>
          <option value="">— Tất cả trạng thái —</option>
          {Object.entries(TRANG_THAI_LABEL).map(([ma, nhan]) => (
            <option key={ma} value={ma}>{nhan}</option>
          ))}
        </select>
        <select className={styles.rowSelect} value={boLoc.dk} onChange={(e) => datBoLoc({ dk: e.target.value })}>
          <option value="">— Tất cả độ khó —</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>Độ khó {n}</option>
          ))}
        </select>
        {dangLoc && (
          <button
            type="button"
            className={styles.btnEdit}
            onClick={() => {
              setQuery("");
              datBoLoc(Object.fromEntries(CAC_KHOA_LOC.map((k) => [k, ""])) as Partial<BoLocCauHoi>);
            }}
          >
            Xoá bộ lọc
          </button>
        )}
      </div>

      <div className={isLocPending ? styles.dangTai : undefined}>{children}</div>
    </div>
  );
}

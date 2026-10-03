// Bộ lọc danh sách ngữ liệu (phía server) — cùng kiểu bộ lọc danh sách câu hỏi:
// trạng thái nằm trên URL (?q=&cap=&mon=&hp=&bh=&cd=&loai=), server luôn ép giá trị hợp lệ.
// Thuần (không import next/*), dùng được ở cả server lẫn client.

import { lamSachTuKhoa } from "@/lib/hoc-sinh-loc";
import { laLoaiNguLieu } from "@/lib/ngu-lieu";
import type { RawSearchParams } from "@/lib/phan-trang";

export type BoLocNguLieu = {
  /** Từ khoá tìm theo số hiệu, tiêu đề hoặc nội dung (đã làm sạch). */
  q: string;
  /** Mã cấp học (1-9) hoặc "". */
  cap: string;
  /** id môn học / học phần / bài học / chủ đề (uuid) hoặc "". */
  mon: string;
  hp: string;
  bh: string;
  cd: string;
  /** Loại ngữ liệu hoặc "". */
  loai: string;
};

export const CAC_KHOA_LOC_NGU_LIEU = ["q", "cap", "mon", "hp", "bh", "cd", "loai"] as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function layDau(v: string | string[] | undefined): string {
  return ((Array.isArray(v) ? v[0] : v) ?? "").trim();
}
const uuidHopLe = (v: string) => (UUID_RE.test(v) ? v : "");

export function parseBoLocNguLieu(raw: RawSearchParams): BoLocNguLieu {
  const cap = layDau(raw.cap);
  const loai = layDau(raw.loai);
  return {
    q: lamSachTuKhoa(layDau(raw.q)),
    cap: /^[1-9]$/.test(cap) ? cap : "",
    mon: uuidHopLe(layDau(raw.mon)),
    hp: uuidHopLe(layDau(raw.hp)),
    bh: uuidHopLe(layDau(raw.bh)),
    cd: uuidHopLe(layDau(raw.cd)),
    loai: laLoaiNguLieu(loai) ? loai : "",
  };
}

export const dangLocNguLieu = (bo: BoLocNguLieu): boolean => CAC_KHOA_LOC_NGU_LIEU.some((k) => bo[k] !== "");

type LocDuoc = {
  or(filters: string): LocDuoc;
  eq(column: string, value: string | number): LocDuoc;
};

/** Áp bộ lọc lên query bảng `ngu_lieu` (vị trí lưu bằng id nên lọc thẳng theo id). id lạ → không khớp dòng nào. */
export function apDungBoLocNguLieu<Q>(query: Q, bo: BoLocNguLieu): Q {
  let qb = query as unknown as LocDuoc;
  if (bo.q) qb = qb.or(`so_hieu.ilike.%${bo.q}%,tieu_de.ilike.%${bo.q}%,noi_dung.ilike.%${bo.q}%`);
  if (bo.cap) qb = qb.eq("cap_hoc_ma", Number(bo.cap));
  if (bo.mon) qb = qb.eq("mon_hoc_id", bo.mon);
  if (bo.hp) qb = qb.eq("hoc_phan_id", bo.hp);
  if (bo.bh) qb = qb.eq("bai_hoc_id", bo.bh);
  if (bo.cd) qb = qb.eq("chu_de_id", bo.cd);
  if (bo.loai) qb = qb.eq("loai", bo.loai);
  return qb as unknown as Q;
}

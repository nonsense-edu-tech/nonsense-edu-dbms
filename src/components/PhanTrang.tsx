"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZES,
  PAGE_SIZE_STORAGE_KEY,
  chuanHoaSize,
  danhSachSoTrang,
  tongSoTrang,
} from "@/lib/phan-trang";
import styles from "./PhanTrang.module.css";

// Ngưỡng ẩn thanh: tổng ≤ số dòng nhỏ nhất thì không có gì để phân trang.
const NGUONG_AN = Math.min(...PAGE_SIZES);

function docSizeDaLuu(): number | null {
  try {
    const raw = window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
    if (raw == null || !/^\d+$/.test(raw)) return null;
    const n = Number(raw);
    return (PAGE_SIZES as readonly number[]).includes(n) ? n : null;
  } catch {
    return null; // localStorage bị chặn/không có — bỏ qua, dùng mặc định.
  }
}

function luuSize(size: number) {
  try {
    window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(size));
  } catch {
    // bỏ qua
  }
}

type ThanhProps = {
  total: number;
  page: number;
  size: number;
  disabled?: boolean;
  onPage: (page: number) => void;
  onSize: (size: number) => void;
};

/** Phần giao diện thuần, dùng chung cho chế độ URL (server) và chế độ cục bộ (client). */
function ThanhPhanTrang({ total, page, size, disabled, onPage, onSize }: ThanhProps) {
  const tong = tongSoTrang(total, size);
  const tu = total === 0 ? 0 : (page - 1) * size + 1;
  const den = Math.min(page * size, total);

  return (
    <div className={`${styles.bar} ${disabled ? styles.pending : ""}`}>
      <span className={styles.info} aria-live="polite">
        Hiển thị {tu}–{den} / {total}
      </span>
      <div className={styles.controls}>
        <label className={styles.sizeWrap}>
          Số dòng mỗi trang
          <select
            className={styles.select}
            value={size}
            onChange={(e) => onSize(Number(e.target.value))}
            disabled={disabled}
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <nav className={styles.pages} aria-label="Phân trang">
          <button
            type="button"
            className={styles.pageBtn}
            disabled={disabled || page <= 1}
            onClick={() => onPage(page - 1)}
            aria-label="Trang trước"
          >
            ‹ Trước
          </button>
          {danhSachSoTrang(page, tong).map((n, i) =>
            n === "…" ? (
              <span key={`e${i}`} className={styles.ellipsis} aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                className={`${styles.pageBtn} ${n === page ? styles.pageBtnActive : ""}`}
                disabled={disabled}
                aria-current={n === page ? "page" : undefined}
                onClick={() => onPage(n)}
              >
                {n}
              </button>
            )
          )}
          <button
            type="button"
            className={styles.pageBtn}
            disabled={disabled || page >= tong}
            onClick={() => onPage(page + 1)}
            aria-label="Trang sau"
          >
            Sau ›
          </button>
        </nav>
      </div>
    </div>
  );
}

/**
 * Chế độ URL (bảng phân trang phía server): đổi trang/size = đổi ?page/?size
 * rồi để trang server query lại. `prefix` dùng khi 1 trang có nhiều bảng
 * (khớp với `parsePhanTrang(raw, prefix)`).
 */
export default function PhanTrang({
  total,
  page,
  size,
  prefix = "",
}: {
  total: number;
  page: number;
  size: number;
  prefix?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const kPage = prefix ? `${prefix}_page` : "page";
  const kSize = prefix ? `${prefix}_size` : "size";

  function diDen(nextPage: number, nextSize: number, kieu: "push" | "replace" = "push") {
    const qs = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) qs.delete(kPage);
    else qs.set(kPage, String(nextPage));
    if (nextSize === DEFAULT_PAGE_SIZE) qs.delete(kSize);
    else qs.set(kSize, String(nextSize));
    const url = qs.size > 0 ? `${pathname}?${qs.toString()}` : pathname;
    startTransition(() => {
      if (kieu === "replace") router.replace(url);
      else router.push(url);
    });
  }

  // Nhớ số dòng/trang theo người dùng: nếu URL chưa có ?size mà trước đó họ đã
  // chọn size khác mặc định thì áp lại (replace — không tạo thêm mục lịch sử).
  const coSizeTrenUrl = searchParams.has(kSize);
  useEffect(() => {
    if (coSizeTrenUrl) return;
    const daLuu = docSizeDaLuu();
    if (daLuu != null && daLuu !== DEFAULT_PAGE_SIZE) diDen(1, daLuu, "replace");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coSizeTrenUrl]);

  if (total <= NGUONG_AN && size === DEFAULT_PAGE_SIZE) return null;

  return (
    <ThanhPhanTrang
      total={total}
      page={page}
      size={size}
      disabled={pending}
      onPage={(p) => diDen(p, size)}
      onSize={(s) => {
        luuSize(s);
        diDen(1, s); // đổi số dòng luôn về trang 1
      }}
    />
  );
}

/**
 * Chế độ cục bộ (cắt trang phía client) — chỉ cho bảng mà dữ liệu đã nằm hết ở
 * client vì còn dùng để tính tổng hợp (vd bảng "quá hạn" ở dashboard học phí).
 * Trả về phần dòng của trang hiện tại + thanh phân trang.
 */
export function useCatTrangCucBo<T>(list: T[]) {
  const [size, setSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const daLuu = docSizeDaLuu();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (daLuu != null) setSize(daLuu);
  }, []);

  const tong = tongSoTrang(list.length, size);
  const trangThucTe = Math.min(page, tong); // danh sách co lại (đổi bộ lọc) thì lùi trang
  const rows = list.slice((trangThucTe - 1) * size, trangThucTe * size);

  const thanh =
    list.length <= NGUONG_AN && size === DEFAULT_PAGE_SIZE ? null : (
      <ThanhPhanTrang
        total={list.length}
        page={trangThucTe}
        size={size}
        onPage={setPage}
        onSize={(s) => {
          const v = chuanHoaSize(s);
          luuSize(v);
          setSize(v);
          setPage(1);
        }}
      />
    );

  return { rows, thanh };
}

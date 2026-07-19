export const TINH_TRANG_LOP_LABEL: Record<string, string> = {
  dang_tuyen_sinh: "Đang tuyển sinh",
  da_khai_giang: "Đã khai giảng",
  dang_hoc: "Đang học",
  da_hoan_thanh: "Đã hoàn thành",
  da_huy: "Đã huỷ",
};

export const TINH_TRANG_LOP_OPTIONS = Object.keys(TINH_TRANG_LOP_LABEL);

const NAM_BAT_DAU_NIEN_KHOA = 2017;

export type NienKhoaOption = { value: number; label: string };

export function danhSachNienKhoa(): NienKhoaOption[] {
  const namNay = new Date().getFullYear();
  const options: NienKhoaOption[] = [];
  for (let nam = NAM_BAT_DAU_NIEN_KHOA; nam <= namNay; nam++) {
    options.push({ value: nam % 100, label: `${nam}-${nam + 1}` });
  }
  return options.reverse();
}

export function hienThiNienKhoa(namHoc: number): string {
  const nam2000 = 2000 + namHoc;
  return `${nam2000}-${nam2000 + 1}`;
}

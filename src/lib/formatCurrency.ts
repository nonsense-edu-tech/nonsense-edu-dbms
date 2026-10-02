export function tienHienThi(soTien: number): string {
  return `${soTien.toLocaleString("vi-VN")} đ`;
}

// Rút gọn cho nhãn trục biểu đồ: 1.250.000.000 → "1,25 tỷ", 902.850.000 → "902,9 tr".
export function tienRutGon(soTien: number): string {
  const abs = Math.abs(soTien);
  if (abs >= 1e9) return `${(soTien / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tỷ`;
  if (abs >= 1e6) return `${(soTien / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`;
  if (abs >= 1e3) return `${(soTien / 1e3).toLocaleString("vi-VN", { maximumFractionDigits: 0 })}k`;
  return soTien.toLocaleString("vi-VN");
}

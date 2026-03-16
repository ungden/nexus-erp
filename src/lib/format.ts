// ============================================================
// FORMAT UTILITIES — Nguồn duy nhất cho toàn bộ ứng dụng
// Chuẩn Việt Nam: dấu chấm (.) ngăn cách hàng nghìn
// ============================================================

/**
 * Format tiền VNĐ
 * @param value - Giá trị số
 * @param mode - 'full' (1.500.000.000 đ) | 'short' (1,5 tỷ) | 'compact' (1.5B)
 */
export function formatVND(value: number, mode: 'full' | 'short' = 'short'): string {
  if (mode === 'full') {
    return new Intl.NumberFormat('vi-VN').format(value) + ' đ';
  }
  
  // Short mode
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (abs >= 1_000_000_000) {
    const v = abs / 1_000_000_000;
    return `${sign}${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)} tỷ`;
  }
  if (abs >= 1_000_000) {
    const v = abs / 1_000_000;
    return `${sign}${v % 1 === 0 ? v.toFixed(0) : v.toFixed(0)} tr`;
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('vi-VN').format(value) + ' đ';
}

/**
 * Format số lượng (không có đơn vị tiền tệ)
 * VD: 1.500 | 25.000
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

/**
 * Format phần trăm
 * VD: 22,5% | 100%
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(decimals)}%`;
}

/**
 * Format ngày tháng từ ISO string hoặc Date
 * VD: 17/03/2026
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return date as string; // fallback nếu parse lỗi
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

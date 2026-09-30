export type TrendPoint = { key: string; label: string; detail: string; a: number; b: number };
const dayKey = (d: Date) => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
export function financialTrend(invoices: { issueDate?: string; amount: number }[], expenses: { expenseDate?: string; amount: number }[], from: Date, to: Date, language: string) {
  if (!Number.isFinite(+from) || !Number.isFinite(+to) || from > to) return [];
  const first = dayKey(from), last = dayKey(to);
  const days = Math.round((Date.parse(last) - Date.parse(first)) / 86400000) + 1;
  const daily = days <= 31;
  const locale = language === 'en' ? 'en-GB' : 'pt-MZ';
  const points = new Map<string, TrendPoint>();
  const cursor = new Date(from.getFullYear(), from.getMonth(), daily ? from.getDate() : 1);
  const end = new Date(to.getFullYear(), to.getMonth(), daily ? to.getDate() : 1);
  while (cursor <= end) {
    const key = dayKey(cursor).slice(0, daily ? 10 : 7);
    points.set(key, { key,
      label: cursor.toLocaleDateString(locale, daily ? { day: '2-digit', month: '2-digit' } : { month: 'short', year: '2-digit' }),
      detail: cursor.toLocaleDateString(locale, daily ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } : { month: 'long', year: 'numeric' }),
      a: 0, b: 0 });
    if (daily) cursor.setDate(cursor.getDate() + 1); else cursor.setMonth(cursor.getMonth() + 1);
  }
  const add = (date: string | undefined, amount: number, field: 'a' | 'b') => {
    if (!date || date < first || date > last || !Number.isFinite(amount)) return;
    const point = points.get(date.slice(0, daily ? 10 : 7));
    if (point) point[field] += Math.round(amount * 100);
  };
  invoices.forEach(i => add(i.issueDate, i.amount, 'a'));
  expenses.forEach(e => add(e.expenseDate, e.amount, 'b'));
  return [...points.values()].map(p => ({ ...p, a: p.a / 100, b: p.b / 100 }));
}
export function trendGeometry(data: TrendPoint[], width: number, height: number, left = 54) {
  const right = width - 16, top = 16, bottom = height - 30;
  const values = data.flatMap(p => [p.a, p.b]);
  const low = Math.min(0, ...values), high = Math.max(0, ...values);
  const step = Math.pow(10, Math.floor(Math.log10(Math.max(high - low, 1)))) / 2;
  const min = Math.floor(low / step) * step, max = Math.ceil(Math.max(high, low + 1) / step) * step;
  const x = (i: number) => data.length <= 1 ? (left + right) / 2 : left + i / (data.length - 1) * (right - left);
  const y = (v: number) => bottom - (v - min) / (max - min) * (bottom - top);
  const path = (field: 'a' | 'b') => data.map((p, i) => (i ? 'L' : 'M') + x(i) + ',' + y(p[field])).join(' ');
  const area = (field: 'a' | 'b') => data.length ? path(field) + ' L' + x(data.length - 1) + ',' + y(0) + ' L' + x(0) + ',' + y(0) + ' Z' : '';
  const nearest = (position: number) => Math.max(0, Math.min(data.length - 1, Math.round((position - left) / (right - left) * (data.length - 1))));
  const ticks = Array.from({ length: 5 }, (_, i) => min + (max - min) * i / 4);
  const labels = [...new Set(Array.from({ length: Math.min(5, data.length) }, (_, i) => Math.round(i * (data.length - 1) / Math.max(1, Math.min(5, data.length) - 1))))];
  return { left, right, top, bottom, x, y, path, area, nearest, ticks, labels };
}
export const shortMoney = (value: number, language: string) => new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'pt-MZ', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

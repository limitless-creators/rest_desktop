import FinancialLineChart from './FinancialLineChart';
import { financialTrend } from '../lib/financialTrend';
import { useMemo, useState } from 'react';
import { ChevronLeft, Activity, FileDown, Paperclip, TrendingUp, Calendar, BarChart2 } from 'lucide-react';
import { Invoice, Quote, Receipt as ReceiptType, Expense, Language, CompanySettings } from '../types';
import { formatValue } from '../data';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ReceiptImageModal, { ReceiptThumbnail } from './ReceiptImageModal';

interface MetricsViewProps {
  invoices: Invoice[];
  quotes: Quote[];
  receipts: ReceiptType[];
  expenses: Expense[];
  language: Language;
  companySettings: CompanySettings;
  onBack: () => void;
}

type MetricsPeriod = '1m' | '3m' | '6m' | 'custom';

const CAT_COLORS = ['#0369a1', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#be185d'];


function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function inRange(dateStr: string | undefined, from: Date, to: Date): boolean {
  const d = parseDate(dateStr);
  if (!d) return false;
  return d >= from && d <= to;
}

// ─── Donut chart (SVG stroke-dasharray) ───────────────────────────────────────
function DonutChart({ data, size = 120 }: { data: { name: string; pct: number; color: string }[]; size?: number }) {
  const r = 32;
  const C = 2 * Math.PI * r;
  let cumPct = 0;
  const hasData = data.some(d => d.pct > 0);

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="20" />
      {hasData && data.map(d => {
        if (d.pct <= 0) return null;
        const start = cumPct;
        cumPct += d.pct;
        return (
          <circle
            key={d.name}
            cx="50" cy="50" r={r}
            fill="none"
            stroke={d.color}
            strokeWidth="20"
            strokeDasharray={`${(d.pct / 100) * C} ${C}`}
            transform={`rotate(${-90 + (start / 100) * 360} 50 50)`}
          />
        );
      })}
    </svg>
  );
}

export default function MetricsView({
  invoices, quotes, receipts, expenses, language, companySettings, onBack,
}: MetricsViewProps) {
  const t = (en: string, pt: string) => language === 'en' ? en : pt;
  const [period, setPeriod] = useState<MetricsPeriod>('3m');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [previewUrl, setPreviewUrl] = useState<{ url: string; label: string } | null>(null);

  void quotes;

  const today = useMemo(() => {
    const d = new Date(); d.setHours(23, 59, 59, 999); return d;
  }, []);

  const { from, to } = useMemo(() => {
    if (period === 'custom') {
      const f = customFrom
        ? new Date(customFrom + 'T00:00:00')
        : (() => { const d = new Date(today); d.setDate(d.getDate() - 30); d.setHours(0, 0, 0, 0); return d; })();
      const t = customTo ? new Date(customTo + 'T23:59:59') : today;
      return { from: f, to: t };
    }
    const days = period === '1m' ? 30 : period === '3m' ? 90 : 180;
    const f = new Date(today);
    f.setDate(f.getDate() - days);
    f.setHours(0, 0, 0, 0);
    return { from: f, to: today };
  }, [period, today, customFrom, customTo]);

  const periodLabel = useMemo(() => {
    const fmt = (d: Date) => d.toLocaleDateString('pt-MZ');
    return `${fmt(from)} — ${fmt(to)}`;
  }, [from, to]);

  const filteredInvoices = useMemo(
    () => invoices.filter(i => inRange(i.issueDate, from, to)),
    [invoices, from, to],
  );
  const filteredReceipts = useMemo(
    () => receipts.filter(r => inRange(r.paymentDate, from, to)),
    [receipts, from, to],
  );
  const filteredExpenses = useMemo(
    () => expenses.filter(e => inRange(e.expenseDate, from, to)),
    [expenses, from, to],
  );

  const totalInvoiced    = filteredInvoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid        = filteredInvoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0);
  const totalReceipts    = filteredReceipts.reduce((s, r) => s + r.amount, 0);
  const totalExpenses    = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const netResult        = totalReceipts - totalExpenses;
  const collectionRate   = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0;
  const expensesWithReceipts = filteredExpenses.filter(e => e.receiptImageUrl);

  const trendData = useMemo(() => financialTrend(filteredInvoices, filteredExpenses, from, to, language), [filteredInvoices, filteredExpenses, from, to, language]);

  const expenseCategories = useMemo(() => {
    const map = new Map<string, number>();
    filteredExpenses.forEach(e => { map.set(e.categoryPt, (map.get(e.categoryPt) ?? 0) + e.amount); });
    const total = filteredExpenses.reduce((s, e) => s + e.amount, 0) || 1;
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([name, val], i) => ({
        name, total: val,
        pct: Math.round((val / total) * 100),
        color: CAT_COLORS[i % CAT_COLORS.length],
      }));
  }, [filteredExpenses]);

  const productData = useMemo(() => {
    const map = new Map<string, number>();
    filteredInvoices.forEach(inv => {
      (inv.items ?? []).forEach(item => {
        map.set(item.description, (map.get(item.description) ?? 0) + item.quantity);
      });
    });
    const arr = Array.from(map.entries()).filter(([, q]) => q > 0).map(([desc, qty]) => ({ desc, qty }));
    const byDesc = [...arr].sort((a, b) => b.qty - a.qty);
    return { top: byDesc.slice(0, 5), bottom: [...byDesc].reverse().slice(0, 5) };
  }, [filteredInvoices]);

  const paymentMethods = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    filteredReceipts.forEach(r => {
      const cur = map.get(r.methodPt) ?? { count: 0, total: 0 };
      map.set(r.methodPt, { count: cur.count + 1, total: cur.total + r.amount });
    });
    const totalAmt = filteredReceipts.reduce((s, r) => s + r.amount, 0) || 1;
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b.total - a.total)
      .map(([method, v], i) => ({
        method, ...v,
        pct: Math.round((v.total / totalAmt) * 100),
        color: CAT_COLORS[i % CAT_COLORS.length],
      }));
  }, [filteredReceipts]);

  function handlePDF() {
    setGeneratingPdf(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const { companyName, nuit } = companySettings;

      doc.setFontSize(14);
      doc.setTextColor(12, 28, 72);
      doc.text('Resultados e Métricas', 14, 16);
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`${companyName}${nuit ? ` — NUIT: ${nuit}` : ''} | ${periodLabel}`, 14, 23);

      let y = 32;

      autoTable(doc, {
        startY: y,
        head: [['Indicador', 'Valor']],
        body: [
          [t('Net Result', 'Resultado Líquido'), formatValue(netResult)],
          [t('Total Invoiced', 'Total Facturado'), formatValue(totalInvoiced)],
          [t('Total Received', 'Total Recebido'), formatValue(totalReceipts)],
          [t('Total Expenses', 'Total Despesas'), formatValue(totalExpenses)],
          [t('Collection Rate', 'Taxa de Cobrança'), `${collectionRate}%`],
          [t('Receipts Attached', 'Comprovativos Anexados'), String(expensesWithReceipts.length)],
        ],
        theme: 'striped',
        headStyles: { fillColor: [12, 28, 72] },
        margin: { left: 14 },
        tableWidth: 110,
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

      if (expenseCategories.length > 0) {
        doc.setFontSize(10); doc.setTextColor(12, 28, 72);
        doc.text(t('Expenses by Category', 'Despesas por Categoria'), 14, y); y += 4;
        autoTable(doc, {
          startY: y,
          head: [[t('Category', 'Categoria'), t('Amount', 'Valor'), '%']],
          body: expenseCategories.map(c => [c.name, formatValue(c.total), `${c.pct}%`]),
          theme: 'striped',
          headStyles: { fillColor: [128, 85, 34] },
          margin: { left: 14 },
          tableWidth: 130,
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      }

      if (paymentMethods.length > 0 && y < 165) {
        doc.setFontSize(10); doc.setTextColor(12, 28, 72);
        doc.text(t('Payment Methods', 'Métodos de Pagamento'), 14, y); y += 4;
        autoTable(doc, {
          startY: y,
          head: [[t('Method', 'Método'), t('Count', 'Qtd'), t('Total', 'Total'), '%']],
          body: paymentMethods.map(m => [m.method, String(m.count), formatValue(m.total), `${m.pct}%`]),
          theme: 'striped',
          headStyles: { fillColor: [5, 150, 105] },
          margin: { left: 14 },
          tableWidth: 130,
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      }

      if (productData.top.length > 0) {
        if (y > 155) { doc.addPage(); y = 16; }
        doc.setFontSize(10); doc.setTextColor(12, 28, 72);
        doc.text(t('Top Products', 'Produtos Mais Vendidos'), 14, y); y += 4;
        autoTable(doc, {
          startY: y,
          head: [[t('Product', 'Produto'), t('Qty Sold', 'Qtd Vendida')]],
          body: productData.top.map(p => [p.desc, String(p.qty)]),
          theme: 'striped',
          headStyles: { fillColor: [12, 28, 72] },
          margin: { left: 14 },
          tableWidth: 150,
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      }

      if (expensesWithReceipts.length > 0) {
        if (y > 150) { doc.addPage(); y = 16; }
        doc.setFontSize(10); doc.setTextColor(12, 28, 72);
        doc.text(t('Expenses with Receipts', 'Despesas com Comprovativos'), 14, y); y += 4;
        autoTable(doc, {
          startY: y,
          head: [[t('Ref', 'Ref'), t('Merchant', 'Comerciante'), t('Amount', 'Valor'), t('Receipt URL', 'URL Comprovativo')]],
          body: expensesWithReceipts.map(e => [e.ref, e.merchant, formatValue(e.amount), e.receiptImageUrl ?? '']),
          theme: 'striped',
          headStyles: { fillColor: [109, 40, 217] },
          margin: { left: 14 },
          columnStyles: { 3: { cellWidth: 90, fontSize: 6 } },
        });
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      doc.save(`Metricas_${dateStr}.pdf`);
    } finally {
      setGeneratingPdf(false);
    }
  }

  const kpis = [
    {
      label: t('Net Result', 'Resultado Líquido'),
      value: formatValue(netResult),
      color: netResult >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
      bg: netResult >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20',
    },
    { label: t('Total Invoiced', 'Total Facturado'), value: formatValue(totalInvoiced), color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: t('Total Received', 'Total Recebido'), value: formatValue(totalReceipts), color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
    { label: t('Total Expenses', 'Total Despesas'), value: formatValue(totalExpenses), color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { label: t('Receipts Attached', 'Comprovativos Anexados'), value: String(expensesWithReceipts.length), color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20' },
    {
      label: t('Collection Rate', 'Taxa de Cobrança'),
      value: `${collectionRate}%`,
      color: collectionRate >= 70 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
      bg: collectionRate >= 70 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-amber-50 dark:bg-amber-900/20',
    },
  ];

  return (
    <div className="space-y-5">

      {previewUrl && (
        <ReceiptImageModal
          b2Url={previewUrl.url}
          label={previewUrl.label}
          language={language}
          onClose={() => setPreviewUrl(null)}
        />
      )}

      {/* Back + Title + Export */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary dark:hover:text-slate-300 mb-2 transition-colors cursor-pointer"
          >
            <ChevronLeft size={14} />
            {t('Back to Reports', 'Voltar a Relatórios')}
          </button>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity size={20} className="text-secondary" />
            {t('Results & Metrics', 'Resultados e Métricas')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">{periodLabel}</p>
        </div>
        <button
          onClick={handlePDF}
          disabled={generatingPdf}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
        >
          <FileDown size={14} />
          {generatingPdf ? t('Generating...', 'A gerar...') : t('Export PDF', 'Exportar PDF')}
        </button>
      </div>

      {/* Period filter */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('Period', 'Período')}</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['1m', '3m', '6m', 'custom'] as MetricsPeriod[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  period === p
                    ? 'bg-secondary text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {p === '1m' ? t('Last 30d', 'Último mês')
                  : p === '3m' ? t('Last 3mo', 'Últimos 3 meses')
                  : p === '6m' ? t('Last 6mo', 'Últimos 6 meses')
                  : <><Calendar size={10} />{t('Custom', 'Personalizado')}</>}
              </button>
            ))}
          </div>
          {period !== 'custom' && (
            <span className="text-[10px] text-slate-400 ml-auto italic">{periodLabel}</span>
          )}
        </div>
        {period === 'custom' && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{t('From', 'De')}</span>
            <input
              type="date"
              value={customFrom}
              max={customTo || todayStr}
              onChange={e => setCustomFrom(e.target.value)}
              className="px-2.5 py-1.5 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 outline-none focus:border-secondary cursor-pointer"
            />
            <span className="text-[10px] text-slate-400">→</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{t('To', 'Até')}</span>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              max={todayStr}
              onChange={e => setCustomTo(e.target.value)}
              className="px-2.5 py-1.5 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 outline-none focus:border-secondary cursor-pointer"
            />
            <span className="text-[10px] text-slate-400 italic ml-1">{periodLabel}</span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(kpi => (
          <div key={kpi.label} className={`${kpi.bg} rounded-xl p-3.5 border border-slate-200/60 dark:border-slate-700/40`}>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mb-1">{kpi.label}</p>
            <p className={`text-sm font-extrabold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Financial trend */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
        <h3 className="mb-5 text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <TrendingUp size={16} className="text-teal-500" />
          {t('Revenue vs Expenses', 'Receitas vs Despesas')}
        </h3>
        <FinancialLineChart data={trendData} language={language} />
      </div>

      {/* Pie charts: Expense Categories + Payment Methods — side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Despesas por Categoria */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-4">
            {t('Expenses by Category', 'Despesas por Categoria')}
          </h3>
          {expenseCategories.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">{t('No expenses in this period.', 'Sem despesas neste período.')}</p>
          ) : (
            <div className="flex items-center gap-5">
              <DonutChart data={expenseCategories} size={120} />
              <div className="flex-1 space-y-2 min-w-0">
                {expenseCategories.map(cat => (
                  <div key={cat.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 flex-1 truncate">{cat.name}</span>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 shrink-0">{cat.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Métodos de Pagamento */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-4">
            {t('Payment Methods', 'Métodos de Pagamento')}
          </h3>
          {paymentMethods.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">{t('No receipts in this period.', 'Sem recibos neste período.')}</p>
          ) : (
            <div className="flex items-center gap-5">
              <DonutChart data={paymentMethods.map(m => ({ name: m.method, pct: m.pct, color: m.color }))} size={120} />
              <div className="flex-1 space-y-2 min-w-0">
                {paymentMethods.map(m => (
                  <div key={m.method} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 flex-1 truncate">{m.method}</span>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 shrink-0">{m.count}× · {m.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Products: Most + Least sold side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { titleEn: 'Most Sold', titlePt: 'Mais Vendidos', emoji: '🏆', data: productData.top, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
          { titleEn: 'Least Sold', titlePt: 'Menos Vendidos', emoji: '📉', data: productData.bottom, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30' },
        ].map(section => (
          <div key={section.titlePt} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-4">
              {section.emoji} {t(section.titleEn, section.titlePt)}
            </h3>
            {section.data.length === 0 ? (
              <p className="text-xs text-slate-400">{t('No product data.', 'Sem dados de produtos.')}</p>
            ) : (
              <div className="space-y-2">
                {section.data.map((p, i) => (
                  <div key={p.desc} className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-slate-400 w-4">{i + 1}.</span>
                    <span className="flex-1 text-xs text-slate-700 dark:text-slate-300 truncate">{p.desc}</span>
                    <span className={`text-xs font-extrabold ${section.color} ${section.bg} px-2 py-0.5 rounded-full whitespace-nowrap`}>{p.qty}×</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Receipt images */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Paperclip size={14} className="text-violet-500" />
          {t('Expense Receipts', 'Comprovativos de Despesas')}
          <span className="ml-1 text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
            {expensesWithReceipts.length}
          </span>
        </h3>
        {expensesWithReceipts.length === 0 ? (
          <p className="text-xs text-slate-400">{t('No receipts attached in this period.', 'Sem comprovativos neste período.')}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {expensesWithReceipts.map(exp => (
              <div key={exp.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                <ReceiptThumbnail
                  b2Url={exp.receiptImageUrl!}
                  alt={exp.ref}
                  onClick={() => setPreviewUrl({ url: exp.receiptImageUrl!, label: exp.ref })}
                />
                <div className="p-2.5">
                  <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 font-mono">{exp.ref}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{exp.merchant}</p>
                  <p className="text-[10px] font-extrabold text-orange-600 dark:text-orange-400 mt-0.5">{formatValue(exp.amount)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

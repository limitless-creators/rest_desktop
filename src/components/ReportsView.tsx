/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  BarChart2, Download, FileSpreadsheet, Calendar,
  TrendingUp, TrendingDown, Clock, CheckCircle, XCircle,
  FileText, FileCode, Receipt, CreditCard, AlertCircle, Activity,
} from 'lucide-react';
import { Invoice, Quote, Receipt as ReceiptType, Expense, Language, CompanySettings, GeneralSale } from '../types';
import { formatValue } from '../data';
import { generateFilteredReportPDF } from '../lib/pdf';
import { generateReportExcel } from '../lib/excel';
import MetricsView from './MetricsView';

interface ReportsViewProps {
  invoices: Invoice[];
  quotes: Quote[];
  receipts: ReceiptType[];
  expenses: Expense[];
  generalSales: GeneralSale[];
  language: Language;
  companySettings: CompanySettings;
}

type FilterPeriod = '1m' | '3m' | 'custom';

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

function statusBadge(status: string, lang: Language) {
  const map: Record<string, { bg: string; text: string }> = {
    Paid:      { bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300', text: lang === 'en' ? 'Paid' : 'Pago' },
    Pago:      { bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300', text: 'Pago' },
    Pending:   { bg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300', text: lang === 'en' ? 'Pending' : 'Pendente' },
    Pendente:  { bg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300', text: 'Pendente' },
    Overdue:   { bg: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300', text: lang === 'en' ? 'Overdue' : 'Vencido' },
    Vencido:   { bg: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300', text: 'Vencido' },
    Approved:  { bg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300', text: lang === 'en' ? 'Approved' : 'Aprovado' },
    Aprovado:  { bg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300', text: 'Aprovado' },
    Rejected:  { bg: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300', text: lang === 'en' ? 'Rejected' : 'Rejeitado' },
    Rejeitado: { bg: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300', text: 'Rejeitado' },
    Liquidado: { bg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300', text: 'Liquidado' },
  };
  const s = map[status] ?? { bg: 'bg-slate-100 text-slate-700', text: status };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${s.bg}`}>
      {s.text}
    </span>
  );
}

function fmtDate(s: string | undefined) {
  if (!s) return '—';
  try { return new Date(s + 'T00:00:00').toLocaleDateString('pt-MZ'); } catch { return s; }
}

export default function ReportsView({
  invoices,
  quotes,
  receipts,
  expenses,
  generalSales,
  language,
  companySettings,
}: ReportsViewProps) {
  const t = (en: string, pt: string) => language === 'en' ? en : pt;

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  const [period, setPeriod] = useState<FilterPeriod>('1m');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState(new Date().toISOString().slice(0, 10));
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);

  const { from, to } = useMemo(() => {
    if (period === '1m') {
      const f = new Date(today);
      f.setDate(f.getDate() - 30);
      f.setHours(0, 0, 0, 0);
      return { from: f, to: today };
    }
    if (period === '3m') {
      const f = new Date(today);
      f.setDate(f.getDate() - 90);
      f.setHours(0, 0, 0, 0);
      return { from: f, to: today };
    }
    // custom
    const f = customFrom ? new Date(customFrom + 'T00:00:00') : new Date('2000-01-01');
    const toD = customTo ? new Date(customTo + 'T23:59:59') : today;
    return { from: f, to: toD };
  }, [period, customFrom, customTo, today]);

  const periodLabel = useMemo(() => {
    const fmt = (d: Date) => d.toLocaleDateString('pt-MZ');
    return `${fmt(from)} — ${fmt(to)}`;
  }, [from, to]);

  const filteredInvoices  = useMemo(() => invoices.filter(i => inRange(i.issueDate, from, to)), [invoices, from, to]);
  const filteredQuotes    = useMemo(() => quotes.filter(q => inRange(q.issueDate, from, to)), [quotes, from, to]);
  const filteredReceipts  = useMemo(() => receipts.filter(r => inRange(r.paymentDate, from, to)), [receipts, from, to]);
  const filteredExpenses  = useMemo(() => expenses.filter(e => inRange(e.expenseDate, from, to)), [expenses, from, to]);
  const filteredGenSales  = useMemo(() => generalSales.filter(s => {
    const d = parseDate(s.saleDate);
    return d ? d >= from && d <= to : false;
  }), [generalSales, from, to]);

  // KPIs
  const totalInvoiced  = filteredInvoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid      = filteredInvoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0);
  const totalPending   = filteredInvoices.filter(i => i.status === 'Pending').reduce((s, i) => s + i.amount, 0);
  const totalOverdue   = filteredInvoices.filter(i => i.status === 'Overdue').reduce((s, i) => s + i.amount, 0);
  const totalExpenses  = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const totalReceipts  = filteredReceipts.reduce((s, r) => s + r.amount, 0);
  const totalQuotes    = filteredQuotes.reduce((s, q) => s + q.amount, 0);
  const totalGenSales  = filteredGenSales.reduce((s, sv) => s + sv.totalAmount, 0);
  const netResult      = totalPaid + totalGenSales - totalExpenses;

  async function handlePDF() {
    setGeneratingPdf(true);
    try {
      await generateFilteredReportPDF(
        filteredInvoices, filteredQuotes, filteredReceipts, filteredExpenses,
        companySettings, periodLabel
      );
    } finally {
      setGeneratingPdf(false);
    }
  }

  function handleExcel() {
    generateReportExcel(
      filteredInvoices, filteredQuotes, filteredReceipts, filteredExpenses,
      companySettings, periodLabel
    );
  }

  const kpis = [
    {
      label: t('Total Invoiced', 'Total Facturado'),
      value: formatValue(totalInvoiced),
      icon: FileText,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: t('Total Received', 'Total Recebido'),
      value: formatValue(totalPaid),
      icon: CheckCircle,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      label: t('Pending', 'Pendente'),
      value: formatValue(totalPending),
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
    {
      label: t('Overdue', 'Vencido'),
      value: formatValue(totalOverdue),
      icon: AlertCircle,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/20',
    },
    {
      label: t('General Sales', 'Vendas Gerais'),
      value: formatValue(totalGenSales),
      icon: CreditCard,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-900/20',
    },
    {
      label: t('Total Expenses', 'Total Despesas'),
      value: formatValue(totalExpenses),
      icon: TrendingDown,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
    },
    {
      label: t('Net Result', 'Resultado Líquido'),
      value: formatValue(netResult),
      icon: netResult >= 0 ? TrendingUp : TrendingDown,
      color: netResult >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
      bg: netResult >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20',
    },
  ];

  if (showMetrics) {
    return (
      <MetricsView
        invoices={invoices}
        quotes={quotes}
        receipts={receipts}
        expenses={expenses}
        language={language}
        companySettings={companySettings}
        onBack={() => setShowMetrics(false)}
      />
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart2 size={20} className="text-secondary" />
            {t('Financial Reports', 'Relatórios Financeiros')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('Detailed accounting summary for business management', 'Resumo contabilístico detalhado para gestão empresarial')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowMetrics(true)}
            className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/90 text-white text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Activity size={14} />
            {t('Results & Metrics', 'Resultados e Métricas')}
          </button>
          <button
            onClick={handleExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <FileSpreadsheet size={14} />
            Excel
          </button>
          <button
            onClick={handlePDF}
            disabled={generatingPdf}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Download size={14} />
            {generatingPdf ? t('Generating...', 'A gerar...') : 'PDF'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar size={14} className="text-slate-400" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {t('Filter Period', 'Período')}
          </span>

          <div className="flex items-center gap-1.5 ml-2">
            {(['1m', '3m', 'custom'] as FilterPeriod[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  period === p
                    ? 'bg-secondary text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {p === '1m' ? t('Last 30 days', 'Último mês') : p === '3m' ? t('Last 3 months', 'Últimos 3 meses') : t('Custom', 'Personalizado')}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
              />
              <span className="text-xs text-slate-400">—</span>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
              />
            </div>
          )}

          <span className="text-[10px] text-slate-400 ml-auto italic">{periodLabel}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(kpi => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className={`${kpi.bg} rounded-xl p-3.5 border border-slate-200/60 dark:border-slate-700/40`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${kpi.bg}`}>
                <Icon size={15} className={kpi.color} />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{kpi.label}</p>
              <p className={`text-sm font-extrabold mt-0.5 ${kpi.color}`}>{kpi.value}</p>
            </div>
          );
        })}
      </div>

      {/* ─── Invoices Table ────────────────────────────────────────────────── */}
      <SectionTable
        icon={<FileText size={14} className="text-blue-500" />}
        title={t('Invoices', 'Facturas')}
        count={filteredInvoices.length}
        total={totalInvoiced}
        language={language}
        statusBreakdown={[
          { label: t('Paid', 'Pagas'), count: filteredInvoices.filter(i => i.status === 'Paid').length, color: 'text-emerald-600', total: totalPaid },
          { label: t('Pending', 'Pendentes'), count: filteredInvoices.filter(i => i.status === 'Pending').length, color: 'text-amber-600', total: totalPending },
          { label: t('Overdue', 'Vencidas'), count: filteredInvoices.filter(i => i.status === 'Overdue').length, color: 'text-red-600', total: totalOverdue },
        ]}
        headers={[
          t('Invoice No.', 'Nº Factura'),
          t('Client', 'Cliente'),
          t('Issue Date', 'Data Emissão'),
          t('Due Date', 'Vencimento'),
          t('Amount', 'Valor'),
          t('Status', 'Estado'),
        ]}
        rows={filteredInvoices.map(i => [
          <span key="n" className="font-mono font-bold text-blue-700 dark:text-blue-400">{i.invoiceNumber}</span>,
          <span key="c" className="font-semibold">{i.client}</span>,
          fmtDate(i.issueDate),
          fmtDate(i.dueDate),
          <span key="v" className="font-bold">{formatValue(i.amount)}</span>,
          statusBadge(i.status, language),
        ])}
      />

      {/* ─── Quotes Table ──────────────────────────────────────────────────── */}
      <SectionTable
        icon={<FileCode size={14} className="text-amber-500" />}
        title={t('Quotes', 'Cotações')}
        count={filteredQuotes.length}
        total={totalQuotes}
        language={language}
        statusBreakdown={[
          { label: t('Approved', 'Aprovadas'), count: filteredQuotes.filter(q => q.status === 'Approved').length, color: 'text-blue-600', total: filteredQuotes.filter(q => q.status === 'Approved').reduce((s, q) => s + q.amount, 0) },
          { label: t('Pending', 'Pendentes'), count: filteredQuotes.filter(q => q.status === 'Pending').length, color: 'text-amber-600', total: filteredQuotes.filter(q => q.status === 'Pending').reduce((s, q) => s + q.amount, 0) },
          { label: t('Rejected', 'Rejeitadas'), count: filteredQuotes.filter(q => q.status === 'Rejected').length, color: 'text-red-600', total: filteredQuotes.filter(q => q.status === 'Rejected').reduce((s, q) => s + q.amount, 0) },
          { label: 'Liquidadas', count: filteredQuotes.filter(q => q.status === 'Liquidado').length, color: 'text-purple-600', total: filteredQuotes.filter(q => q.status === 'Liquidado').reduce((s, q) => s + q.amount, 0) },
        ]}
        headers={[
          t('Quote No.', 'Nº Cotação'),
          t('Client', 'Cliente'),
          t('Issue Date', 'Data Emissão'),
          t('Validity (days)', 'Validade (dias)'),
          t('Amount', 'Valor'),
          t('Status', 'Estado'),
        ]}
        rows={filteredQuotes.map(q => [
          <span key="n" className="font-mono font-bold text-amber-700 dark:text-amber-400">{q.quoteNumber}</span>,
          <span key="c" className="font-semibold">{q.client}</span>,
          fmtDate(q.issueDate),
          String(q.validityDays),
          <span key="v" className="font-bold">{formatValue(q.amount)}</span>,
          statusBadge(q.statusPt, language),
        ])}
      />

      {/* ─── Receipts Table ────────────────────────────────────────────────── */}
      <SectionTable
        icon={<Receipt size={14} className="text-emerald-500" />}
        title={t('Receipts', 'Recibos')}
        count={filteredReceipts.length}
        total={totalReceipts}
        language={language}
        headers={[
          t('Receipt No.', 'Nº Recibo'),
          t('Client', 'Cliente'),
          t('Payment Date', 'Data Pagamento'),
          t('Invoice Ref.', 'Ref. Factura'),
          t('Method', 'Método'),
          t('Amount', 'Valor'),
        ]}
        rows={filteredReceipts.map(r => [
          <span key="n" className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{r.receiptNumber}</span>,
          <span key="c" className="font-semibold">{r.client}</span>,
          fmtDate(r.paymentDate),
          <span key="ref" className="text-slate-500 dark:text-slate-400">{r.invoiceRef}</span>,
          r.methodPt,
          <span key="v" className="font-bold">{formatValue(r.amount)}</span>,
        ])}
      />

      {/* ─── Expenses Table ────────────────────────────────────────────────── */}
      <SectionTable
        icon={<CreditCard size={14} className="text-orange-500" />}
        title={t('Expenses', 'Despesas')}
        count={filteredExpenses.length}
        total={totalExpenses}
        language={language}
        statusBreakdown={[
          { label: t('Approved', 'Aprovadas'), count: filteredExpenses.filter(e => e.status === 'Approved').length, color: 'text-emerald-600', total: filteredExpenses.filter(e => e.status === 'Approved').reduce((s, e) => s + e.amount, 0) },
          { label: t('Pending', 'Pendentes'), count: filteredExpenses.filter(e => e.status === 'Pending').length, color: 'text-amber-600', total: filteredExpenses.filter(e => e.status === 'Pending').reduce((s, e) => s + e.amount, 0) },
          { label: t('Rejected', 'Rejeitadas'), count: filteredExpenses.filter(e => e.status === 'Rejected').length, color: 'text-red-600', total: filteredExpenses.filter(e => e.status === 'Rejected').reduce((s, e) => s + e.amount, 0) },
        ]}
        headers={[
          t('Ref.', 'Ref.'),
          t('Merchant', 'Comerciante'),
          t('Category', 'Categoria'),
          t('Date', 'Data'),
          t('Amount', 'Valor'),
          t('Status', 'Estado'),
        ]}
        rows={filteredExpenses.map(e => [
          <span key="ref" className="font-mono font-bold text-orange-700 dark:text-orange-400">{e.ref}</span>,
          <span key="m" className="font-semibold">{e.merchant}</span>,
          e.categoryPt,
          fmtDate(e.expenseDate),
          <span key="v" className="font-bold">{formatValue(e.amount)}</span>,
          statusBadge(e.statusPt, language),
        ])}
      />

      {/* Bottom Summary */}
      <div className="bg-slate-900 dark:bg-slate-950 border border-slate-700 dark:border-slate-800 rounded-xl p-5">
        <h3 className="text-xs font-extrabold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
          <BarChart2 size={13} className="text-secondary" />
          {t('Accounting Balance', 'Saldo Contabilístico')} — {periodLabel}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: t('Invoiced', 'Facturado'), val: totalInvoiced, color: 'text-blue-400' },
            { label: t('Received', 'Recebido'), val: totalPaid, color: 'text-emerald-400' },
            { label: t('General Sales', 'Vendas Gerais'), val: totalGenSales, color: 'text-violet-400' },
            { label: t('Expenses', 'Despesas'), val: totalExpenses, color: 'text-orange-400' },
            { label: t('Net Result', 'Resultado Líquido'), val: netResult, color: netResult >= 0 ? 'text-emerald-400' : 'text-red-400' },
          ].map(item => (
            <div key={item.label} className="text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{item.label}</p>
              <p className={`text-base font-extrabold mt-1 ${item.color}`}>{formatValue(item.val)}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── Generic Section Table ────────────────────────────────────────────────────

interface StatusBreakdown {
  label: string;
  count: number;
  color: string;
  total?: number;
}

interface SectionTableProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  total: number;
  language: Language;
  statusBreakdown?: StatusBreakdown[];
  headers: string[];
  rows: React.ReactNode[][];
}

function SectionTable({ icon, title, count, total, language, statusBreakdown, headers, rows }: SectionTableProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
      {/* Section Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-2.5">
          {icon}
          <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-widest">
            {title}
          </h3>
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
            {count} {language === 'en' ? 'records' : 'registos'}
          </span>
          {statusBreakdown && statusBreakdown.map(s => s.count > 0 && (
            <span key={s.label} className={`text-[10px] font-semibold ${s.color} hidden sm:inline`}>
              · {s.count} {s.label}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-extrabold text-slate-900 dark:text-white">{formatValue(total)}</span>
          <span className="text-slate-400 text-xs">{collapsed ? '▸' : '▾'}</span>
        </div>
      </div>

      {/* Status breakdown chips */}
      {!collapsed && statusBreakdown && statusBreakdown.some(s => s.count > 0) && (
        <div className="px-5 py-2 bg-slate-50/60 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-3">
          {statusBreakdown.map(s => s.count > 0 && (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className={`text-[10px] font-extrabold ${s.color}`}>{s.count}×</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{s.label}</span>
              {s.total !== undefined && (
                <span className={`text-[10px] font-bold ${s.color}`}>({formatValue(s.total)})</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {!collapsed && (
        rows.length === 0 ? (
          <div className="px-5 py-8 text-center text-xs text-slate-400">
            {language === 'en' ? 'No records in this period.' : 'Sem registos neste período.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60">
                  {headers.map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                    {row.map((cell, j) => (
                      <td key={j} className="px-4 py-2.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

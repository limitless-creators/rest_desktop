/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { Invoice, Quote, Receipt, Expense, CompanySettings, GeneralSale, Language } from '../types';
import { formatValue } from '../data';

function fmtDate(d: string | undefined): string {
  if (!d) return '—';
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-MZ');
  } catch { return d; }
}

export function generateReportExcel(
  invoices: Invoice[],
  quotes: Quote[],
  receipts: Receipt[],
  expenses: Expense[],
  settings: CompanySettings,
  periodLabel: string
): void {
  const wb = XLSX.utils.book_new();

  // ─── Sheet 1: Resumo ─────────────────────────────────────────────────────
  const totalInvoiced   = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid       = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0);
  const totalPending    = invoices.filter(i => i.status === 'Pending').reduce((s, i) => s + i.amount, 0);
  const totalOverdue    = invoices.filter(i => i.status === 'Overdue').reduce((s, i) => s + i.amount, 0);
  const totalQuotes     = quotes.reduce((s, q) => s + q.amount, 0);
  const totalReceipts   = receipts.reduce((s, r) => s + r.amount, 0);
  const totalExpenses   = expenses.reduce((s, e) => s + e.amount, 0);
  const netResult       = totalPaid - totalExpenses;

  const summaryData = [
    ['RESUMO CONTABILÍSTICO', ''],
    ['Empresa:', settings.companyName || '—'],
    ['Período:', periodLabel],
    ['Gerado em:', new Date().toLocaleString('pt-MZ')],
    ['', ''],
    ['INDICADOR', 'VALOR (MT)'],
    ['Total Facturado', formatValue(totalInvoiced)],
    ['Total Recebido (Pago)', formatValue(totalPaid)],
    ['Total Pendente', formatValue(totalPending)],
    ['Total Vencido', formatValue(totalOverdue)],
    ['Total Cotações', formatValue(totalQuotes)],
    ['Total Recibos Emitidos', formatValue(totalReceipts)],
    ['Total Despesas', formatValue(totalExpenses)],
    ['', ''],
    ['RESULTADO LÍQUIDO (Recebido − Despesas)', formatValue(netResult)],
    ['', ''],
    ['ESTATÍSTICAS DE FACTURAS', ''],
    ['Facturas Pagas', invoices.filter(i => i.status === 'Paid').length],
    ['Facturas Pendentes', invoices.filter(i => i.status === 'Pending').length],
    ['Facturas Vencidas', invoices.filter(i => i.status === 'Overdue').length],
    ['Total de Facturas', invoices.length],
    ['', ''],
    ['ESTATÍSTICAS DE COTAÇÕES', ''],
    ['Cotações Aprovadas', quotes.filter(q => q.status === 'Approved').length],
    ['Cotações Pendentes', quotes.filter(q => q.status === 'Pending').length],
    ['Cotações Rejeitadas', quotes.filter(q => q.status === 'Rejected').length],
    ['Cotações Liquidadas', quotes.filter(q => q.status === 'Liquidado').length],
    ['Total de Cotações', quotes.length],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 42 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

  // ─── Sheet 2: Facturas ────────────────────────────────────────────────────
  const invoiceHeader = ['Nº Factura', 'Cliente', 'NUIT Cliente', 'Data Emissão', 'Data Vencimento', 'Valor (MT)', 'Estado'];
  const invoiceRows = invoices.map(inv => [
    inv.invoiceNumber,
    inv.client,
    inv.clientNuit || '—',
    fmtDate(inv.issueDate),
    fmtDate(inv.dueDate),
    inv.amount,
    inv.statusPt,
  ]);
  invoiceRows.push(['', '', '', '', 'TOTAL:', totalInvoiced, '']);
  const wsInvoices = XLSX.utils.aoa_to_sheet([invoiceHeader, ...invoiceRows]);
  wsInvoices['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsInvoices, 'Facturas');

  // ─── Sheet 3: Cotações ────────────────────────────────────────────────────
  const quoteHeader = ['Nº Cotação', 'Cliente', 'NUIT Cliente', 'Data Emissão', 'Validade (dias)', 'Valor (MT)', 'Estado'];
  const quoteRows = quotes.map(q => [
    q.quoteNumber,
    q.client,
    q.clientNuit || '—',
    fmtDate(q.issueDate),
    q.validityDays,
    q.amount,
    q.statusPt,
  ]);
  quoteRows.push(['', '', '', '', 'TOTAL:', totalQuotes, '']);
  const wsQuotes = XLSX.utils.aoa_to_sheet([quoteHeader, ...quoteRows]);
  wsQuotes['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 15 }, { wch: 16 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsQuotes, 'Cotações');

  // ─── Sheet 4: Recibos ─────────────────────────────────────────────────────
  const receiptHeader = ['Nº Recibo', 'Cliente', 'Data Pagamento', 'Ref. Factura', 'Método de Pagamento', 'Valor (MT)'];
  const receiptRows = receipts.map(r => [
    r.receiptNumber,
    r.client,
    fmtDate(r.paymentDate),
    r.invoiceRef,
    r.methodPt,
    r.amount,
  ]);
  receiptRows.push(['', '', '', '', 'TOTAL:', totalReceipts]);
  const wsReceipts = XLSX.utils.aoa_to_sheet([receiptHeader, ...receiptRows]);
  wsReceipts['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 22 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsReceipts, 'Recibos');

  // ─── Sheet 5: Despesas ────────────────────────────────────────────────────
  const expenseHeader = ['Ref.', 'Comerciante', 'Categoria', 'Data', 'Valor (MT)', 'Estado', 'Notas'];
  const expenseRows = expenses.map(e => [
    e.ref,
    e.merchant,
    e.categoryPt,
    fmtDate(e.expenseDate),
    e.amount,
    e.statusPt,
    e.notes || '',
  ]);
  expenseRows.push(['', '', '', 'TOTAL:', totalExpenses, '', '']);
  const wsExpenses = XLSX.utils.aoa_to_sheet([expenseHeader, ...expenseRows]);
  wsExpenses['!cols'] = [{ wch: 12 }, { wch: 26 }, { wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsExpenses, 'Despesas');

  // ─── Write & Download ─────────────────────────────────────────────────────
  const dateStr = new Date().toISOString().slice(0, 10);
  void window.restDesktop.save(`Relatorio_${dateStr}.xlsx`, XLSX.write(wb, {type:'array', bookType:'xlsx'})).catch(e => window.alert(e.message));
}

export function generateGeneralSalesExcel(
  sales: GeneralSale[],
  language: Language,
  settings: CompanySettings,
  dateFrom?: string,
  dateTo?: string
): void {
  const isEn = language === 'en';
  const wb = XLSX.utils.book_new();
  const now = new Date();

  const totalRevenue = sales.reduce((s, sv) => s + sv.totalAmount, 0);
  const totalQty = sales.reduce((s, sv) => s + sv.quantity, 0);
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTotal = sales.filter(sv => sv.saleDate === todayStr).reduce((s, sv) => s + sv.totalAmount, 0);

  const period = (dateFrom || dateTo) ? `${dateFrom || '—'} → ${dateTo || '—'}` : now.toLocaleDateString('pt-MZ');

  const summaryData = [
    [isEn ? 'GENERAL SALES SUMMARY' : 'RESUMO DE VENDAS GERAIS', ''],
    [isEn ? 'Company:' : 'Empresa:', settings.companyName || '—'],
    [isEn ? 'NUIT:' : 'NUIT:', settings.nuit || '—'],
    [isEn ? 'Period:' : 'Período:', period],
    [''],
    [isEn ? 'Total Sales' : 'Total Vendas', sales.length],
    [isEn ? 'Items Sold' : 'Itens Vendidos', totalQty],
    [isEn ? 'Total Revenue (MT)' : 'Receita Total (MT)', totalRevenue],
    [isEn ? "Today's Sales (MT)" : 'Vendas Hoje (MT)', todayTotal],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, isEn ? 'Summary' : 'Resumo');

  const salesHead = [isEn
    ? ['Ref', 'Product', 'SKU', 'Quantity', 'Unit Price (MT)', 'Total (MT)', 'Payment', 'Date', 'Notes']
    : ['Ref', 'Produto', 'SKU', 'Quantidade', 'Preço Unit. (MT)', 'Total (MT)', 'Pagamento', 'Data', 'Notas']
  ];
  const salesRows: (string | number)[][] = sales.map(sv => [
    sv.ref, sv.productName, sv.sku || '', sv.quantity,
    sv.unitPrice, sv.totalAmount,
    sv.paymentMethod,
    isEn ? sv.date : sv.datePt,
    sv.notes || '',
  ]);
  salesRows.push(['', isEn ? `TOTAL (${sales.length})` : `TOTAL (${sales.length})`, '', totalQty, '', totalRevenue, '', '', '']);
  const wsSales = XLSX.utils.aoa_to_sheet([...salesHead, ...salesRows]);
  XLSX.utils.book_append_sheet(wb, wsSales, isEn ? 'Sales' : 'Vendas');

  void window.restDesktop.save(`Vendas_Gerais_${now.toISOString().slice(0, 10)}.xlsx`, XLSX.write(wb, {type:'array', bookType:'xlsx'})).catch(e => window.alert(e.message));
}

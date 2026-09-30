import { localDateKey } from '../lib/salesSummary';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ShoppingCart, Plus, CalendarDays, X, FileText, FileSpreadsheet, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { GeneralSale, StockItem, Language, Currency, CompanySettings } from '../types';
import { formatValue } from '../data';
import { generateGeneralSalesPDF } from '../lib/pdf';
import { generateGeneralSalesExcel } from '../lib/excel';

interface VendasViewProps {
  sales: GeneralSale[];
  stockItems: StockItem[];
  language: Language;
  currency: Currency;
  companySettings: CompanySettings;
  onNewSale: () => void;
  onDeleteSale: (id: string) => void;
  searchQuery: string;
}

const PAGE_SIZE = 10;

export default function VendasView({
  sales,
  language,
  currency,
  companySettings,
  onNewSale,
  onDeleteSale,
  searchQuery,
}: VendasViewProps) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const isEn = language === 'en';
  const todayStr = localDateKey();

  const todaySales = sales.filter(s => s.saleDate === todayStr);
  const todayTotal = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
  const todayQty = todaySales.reduce((sum, s) => sum + s.quantity, 0);

  const q = searchQuery.toLowerCase();
  const filtered = sales.filter(s => {
    const matchSearch = !q || s.productName.toLowerCase().includes(q) || s.sku.toLowerCase().includes(q) || s.ref.toLowerCase().includes(q);
    const matchFrom = !dateFrom || s.saleDate >= dateFrom;
    const matchTo = !dateTo || s.saleDate <= dateTo;
    return matchSearch && matchFrom && matchTo;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const filteredRevenue = filtered.reduce((s, sv) => s + sv.totalAmount, 0);

  return (
    <div className="space-y-6 animation-fade-in text-left">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart size={20} className="text-secondary" />
            <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
              {isEn ? 'General Sales' : 'Vendas Gerais'}
            </h2>
          </div>
          <p className="text-slate-500 text-xs">
            {isEn ? 'Dayly sales.' : 'Vendas do dia.'}
          </p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded border border-slate-200/60 dark:border-primary-container/20 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{isEn ? "Today's Revenue" : 'Receita Hoje'}</p>
          <p className="text-xl font-black text-primary dark:text-white">{formatValue(todayTotal, currency)}</p>
          <p className="text-xs text-slate-400 mt-1">{todaySales.length} {isEn ? 'sales' : 'vendas'} · {todayQty} {isEn ? 'items' : 'itens'}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded border border-slate-200/60 dark:border-primary-container/20 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{isEn ? 'Filtered Revenue' : 'Receita Filtrada'}</p>
          <p className="text-xl font-black text-primary dark:text-white">{formatValue(filteredRevenue, currency)}</p>
          <p className="text-xs text-slate-400 mt-1">{filtered.length} {isEn ? 'records' : 'registos'}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded border border-slate-200/60 dark:border-primary-container/20 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{isEn ? 'Total Sales' : 'Total Vendas'}</p>
          <p className="text-xl font-black text-primary dark:text-white">{sales.length}</p>
          <p className="text-xs text-slate-400 mt-1">{formatValue(sales.reduce((s, sv) => s + sv.totalAmount, 0), currency)}</p>
        </div>
      </div>

      {/* Filters + Export + New Sale */}
      <div className="bg-white dark:bg-slate-900 rounded border border-slate-200/60 dark:border-slate-800 p-4 space-y-3">
        {/* Date range */}
        <div className="flex flex-wrap items-center gap-3">
          <CalendarDays size={15} className="text-slate-400 flex-shrink-0" />
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isEn ? 'From' : 'De'}</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs outline-none focus:border-blue-500 text-slate-700 dark:text-slate-300"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isEn ? 'To' : 'Até'}</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1); }}
              className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs outline-none focus:border-blue-500 text-slate-700 dark:text-slate-300"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }}
              className="flex items-center gap-1 text-[10px] font-semibold text-red-500 hover:text-red-700 cursor-pointer"
            >
              <X size={12} />
              {isEn ? 'Clear dates' : 'Limpar datas'}
            </button>
          )}
        </div>

        {/* Actions row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => generateGeneralSalesPDF(filtered, language, companySettings, dateFrom || undefined, dateTo || undefined)}
            className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg transition-all cursor-pointer shadow-sm"
          >
            <FileText size={13} />
            {isEn ? 'Export PDF' : 'Exportar PDF'}
          </button>
          <button
            onClick={() => generateGeneralSalesExcel(filtered, language, companySettings, dateFrom || undefined, dateTo || undefined)}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-all cursor-pointer shadow-sm"
          >
            <FileSpreadsheet size={13} />
            {isEn ? 'Export Excel' : 'Exportar Excel'}
          </button>
          <div className="flex-1" />
          <button
            onClick={onNewSale}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-all cursor-pointer shadow-sm"
          >
            <Plus size={14} />
            {isEn ? 'New Sale' : 'Nova Venda'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded border border-slate-200/60 dark:border-slate-800 shadow-xs overflow-hidden">
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <ShoppingCart size={20} className="text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {isEn ? 'No sales recorded' : 'Nenhuma venda registada'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {isEn ? 'Click "New Sale" to register the first sale.' : 'Clique em "Nova Venda" para registar a primeira venda.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 dark:bg-slate-900 border-b border-slate-200/50 dark:border-slate-800">
                <tr>
                  {[
                    'Ref',
                    isEn ? 'Product' : 'Produto',
                    'SKU',
                    isEn ? 'Qty' : 'Qtd',
                    isEn ? 'Unit Price' : 'Preço Unit.',
                    'Total',
                    isEn ? 'Payment' : 'Pagamento',
                    isEn ? 'Date' : 'Data',
                    isEn ? 'Notes' : 'Notas',
                    '',
                  ].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-[10px] font-bold text-primary dark:text-slate-300 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginated.map(sale => (
                  <tr key={sale.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-all group">
                    <td className="px-4 py-3 text-xs font-mono font-bold text-blue-600 dark:text-blue-400">{sale.ref}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[160px] truncate">{sale.productName}</td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-500 dark:text-slate-400">{sale.sku || '—'}</td>
                    <td className="px-4 py-3 text-xs text-right font-bold text-slate-700 dark:text-slate-300">{sale.quantity}</td>
                    <td className="px-4 py-3 text-xs text-right text-slate-600 dark:text-slate-400">{formatValue(sale.unitPrice, currency)}</td>
                    <td className="px-4 py-3 text-xs text-right font-black text-primary dark:text-white">{formatValue(sale.totalAmount, currency)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                        sale.paymentMethod === 'M-Pesa' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' :
                        sale.paymentMethod === 'E-mola' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' :
                        sale.paymentMethod === 'Banco' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' :
                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                      }`}>
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{isEn ? sale.date : sale.datePt}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 max-w-[120px] truncate">{sale.notes || '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onDeleteSale(sale.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer"
                        title={isEn ? 'Delete sale' : 'Eliminar venda'}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">
              {isEn ? `Page ${safePage} of ${totalPages} · ${filtered.length} records` : `Página ${safePage} de ${totalPages} · ${filtered.length} registos`}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft size={14} className="text-slate-500" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight size={14} className="text-slate-500" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

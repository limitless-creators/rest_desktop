import { localDateKey, salesForDay } from '../lib/salesSummary';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrendingUp, AlertCircle, Package, ArrowRight, CornerDownRight, Plus, BarChart2 } from 'lucide-react';
import { Transaction, StockItem, Invoice, Language, Currency, GeneralSale } from '../types';
import { formatValue } from '../data';

interface DashboardViewProps {
  transactions: Transaction[];
  stockItems: StockItem[];
  invoices: Invoice[];
  generalSales: GeneralSale[];
  language: Language;
  currency: Currency;
  onNavigate: (tab: string) => void;
  onNewInvoice: () => void;
  onAddStock: () => void;
  onGenerateReport: () => void;
  onNavigateToVendas: () => void;
}

export default function DashboardView({
  transactions,
  stockItems,
  invoices,
  generalSales,
  language,
  currency,
  onNavigate,
  onNewInvoice,
  onAddStock,
  onGenerateReport,
  onNavigateToVendas,
}: DashboardViewProps) {

  const todayStr = localDateKey();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  // KPIs calculated from live data
  const { total: totalSalesToday, count: salesTodayCount } = salesForDay(generalSales, invoices, todayStr);

  const monthlyRevenue = invoices
    .filter(inv => inv.status === 'Paid' && inv.issueDate >= monthStart)
    .reduce((sum, inv) => sum + inv.amount, 0);

  const pendingInvs = invoices.filter(inv => inv.status === 'Pending' || inv.status === 'Overdue');
  const pendingInvoicedCount = pendingInvs.length;
  const pendingInvoiceSum = pendingInvs.reduce((sum, inv) => sum + inv.amount, 0);

  const lowStockItems = stockItems.filter(item => item.stockLevel <= item.maxStock * 0.35);
  const lowStockCount = lowStockItems.length;

  // Dynamic current date/time
  const now = new Date();
  const currentDateEn = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const currentDatePt = now.toLocaleDateString('pt-MZ', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const lastUpdatedTime = now.toLocaleTimeString(language === 'en' ? 'en-US' : 'pt-MZ', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-8 animation-fade-in text-left">

      {/* Welcome Title & Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            {language === 'en' ? 'Operational Overview' : 'Visão Geral Operacional'}
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            {language === 'en'
              ? `Welcome back. Today is ${currentDateEn}.`
              : `Bem-vindo de volta. Hoje é ${currentDatePt}.`
            }
          </p>
        </div>
        <div className="flex gap-2">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full ring-1 ring-slate-200 dark:ring-slate-700/50">
            {language === 'en' ? `Updated at ${lastUpdatedTime}` : `Actualizado às ${lastUpdatedTime}`}
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Sales Today Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded border border-slate-200/60 dark:border-primary-container/20 shadow-xs flex flex-col justify-between transition-smooth hover:shadow-md hover:border-slate-350 dark:hover:border-primary-container group cursor-pointer" onClick={onNavigateToVendas}>
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-display">
              {language === 'en' ? 'Sales Today' : 'Vendas Hoje'}
            </span>
            <TrendingUp size={16} className="text-secondary transition-transform group-hover:scale-110" />
          </div>
          <div className="my-3">
            <span className="text-2xl font-black text-primary dark:text-white font-display hanken">
              {formatValue(totalSalesToday, currency)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-slate-400 dark:text-slate-500 text-[10px] font-medium">
              {salesTodayCount} {language === 'en' ? 'paid transactions' : 'transacções pagas'}
            </span>
          </div>
        </div>

        {/* Monthly Revenue Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded border border-slate-200/60 dark:border-primary-container/20 shadow-xs flex flex-col justify-between transition-smooth hover:shadow-md hover:border-slate-350 dark:hover:border-primary-container group cursor-pointer" onClick={() => onNavigate('reports')}>
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-display">
              {language === 'en' ? 'Monthly Revenue' : 'Receita Mensal'}
            </span>
            <CornerDownRight size={16} className="text-secondary transition-transform group-hover:scale-110" />
          </div>
          <div className="my-3">
            <span className="text-2xl font-black text-primary dark:text-white font-display hanken">
              {formatValue(monthlyRevenue, currency)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-slate-400 dark:text-slate-500 text-[10px] font-medium">
              {invoices.filter(inv => inv.status === 'Paid').length} {language === 'en' ? 'paid invoices' : 'facturas pagas'}
            </span>
          </div>
        </div>

        {/* Pending Invoices Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded border border-slate-200/60 dark:border-primary-container/20 shadow-xs flex flex-col justify-between transition-smooth hover:shadow-md hover:border-slate-350 dark:hover:border-primary-container group cursor-pointer" onClick={() => onNavigate('invoices')}>
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-display">
              {language === 'en' ? 'Pending Invoices' : 'Facturas Pendentes'}
            </span>
            <AlertCircle size={16} className="text-red-500 transition-transform group-hover:scale-110" />
          </div>
          <div className="my-3">
            <span className="text-2xl font-black text-primary dark:text-white font-display hanken">
              {pendingInvoicedCount}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-red-600 dark:text-red-405 text-xs font-bold">
              {formatValue(pendingInvoiceSum, currency)}
            </span>
            <span className="text-slate-400 dark:text-slate-500 text-[10px] font-medium">
              {language === 'en' ? 'awaiting payment' : 'aguarda pagamento'}
            </span>
          </div>
        </div>

        {/* Low Stock Items Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded border border-slate-200/60 dark:border-primary-container/20 shadow-xs flex flex-col justify-between transition-smooth hover:shadow-md hover:border-slate-350 dark:hover:border-primary-container group cursor-pointer" onClick={() => onNavigate('stock')}>
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-display">
              {language === 'en' ? 'Low Stock Items' : 'Itens Stock Baixo'}
            </span>
            <Package size={16} className="text-amber-500 transition-transform group-hover:scale-110" />
          </div>
          <div className="my-3">
            <span className="text-2xl font-black text-primary dark:text-white font-display hanken">
              {lowStockCount < 10 ? `0${lowStockCount}` : lowStockCount}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-amber-600 dark:text-amber-450 text-xs font-bold font-mono">
              {lowStockCount} {language === 'en' ? 'Critical' : 'Críticos'}
            </span>
            <span className="text-slate-400 dark:text-slate-500 text-[10px] font-medium">
              {language === 'en' ? 'restock required' : 'necessitam reposição'}
            </span>
          </div>
        </div>

      </div>

      {/* Main Grid: Data Table + Quick Action Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Transactions Panel */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded border border-slate-200/60 dark:border-primary-container/25 shadow-xs overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/20 dark:bg-slate-900">
            <h3 className="text-xs font-bold text-primary dark:text-slate-200 font-display">
              {language === 'en' ? 'Recent Transactions' : 'Transacções Recentes'}
            </h3>
            <button
              onClick={() => onNavigate('invoices')}
              className="text-secondary hover:text-secondary/80 text-xs font-semibold hover:underline flex items-center gap-1"
            >
              <span>{language === 'en' ? 'View All' : 'Ver Tudo'}</span>
              <ArrowRight size={12} />
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                <TrendingUp size={18} className="text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {language === 'en' ? 'No transactions yet' : 'Ainda sem transacções'}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                {language === 'en' ? 'Create an invoice to get started' : 'Crie uma factura para começar'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left max-w-full">
                <thead className="bg-[#fbf8fd]/80 dark:bg-[#111c3a] border-b border-b-slate-200/50">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-bold text-primary dark:text-slate-300 uppercase tracking-wider font-display">
                      {language === 'en' ? 'Transaction ID' : 'ID da Transacção'}
                    </th>
                    <th className="px-6 py-3 text-[10px] font-bold text-primary dark:text-slate-300 uppercase tracking-wider font-display">
                      {language === 'en' ? 'Client' : 'Cliente'}
                    </th>
                    <th className="px-6 py-3 text-[10px] font-bold text-primary dark:text-slate-300 uppercase tracking-wider font-display">
                      {language === 'en' ? 'Amount' : 'Valor'}
                    </th>
                    <th className="px-6 py-3 text-[10px] font-bold text-primary dark:text-slate-300 uppercase tracking-wider font-display">
                      {language === 'en' ? 'Status' : 'Estado'}
                    </th>
                    <th className="px-6 py-3 text-[10px] font-bold text-primary dark:text-slate-300 uppercase tracking-wider font-display">
                      {language === 'en' ? 'Date' : 'Data'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {transactions.slice(0, 5).map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-smooth cursor-pointer group">
                      <td className="px-6 py-4 text-xs font-mono font-bold text-primary dark:text-blue-400">
                        {tx.transactionId}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded ${tx.avatarBg} flex items-center justify-center font-bold text-[10px] shadow-xs`}>
                            {tx.initials}
                          </div>
                          <span className="text-xs text-slate-705 dark:text-slate-300 font-semibold group-hover:text-primary dark:group-hover:text-white">
                            {tx.client}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatValue(tx.amount, currency)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          tx.status === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : tx.status === 'Pending'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-955/45 dark:text-amber-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-955/40 dark:text-red-350'
                        }`}>
                          {language === 'en' ? tx.status : tx.statusPt}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-450">
                        {language === 'en' ? tx.date : tx.datePt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Action Panels Right Column */}
        <div className="space-y-6">

          {/* Quick Actions Panel */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded border border-slate-200/60 dark:border-primary-container/25 shadow-xs text-left">
            <h3 className="text-xs font-bold text-primary dark:text-slate-200 mb-5 font-display">
              {language === 'en' ? 'Quick Actions' : 'Acções Rápidas'}
            </h3>
            <div className="flex flex-col gap-3">

              <button
                onClick={onNewInvoice}
                className="flex items-center gap-4 p-4 rounded bg-primary/5 hover:bg-primary/10 border border-primary/10 transition-smooth text-primary dark:text-white text-left group cursor-pointer active:scale-98"
              >
                <div className="bg-primary text-white p-2 rounded flex items-center justify-center shadow-xs">
                  <Plus size={16} />
                </div>
                <div>
                  <p className="font-bold text-xs">{language === 'en' ? 'New Invoice' : 'Nova Factura'}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {language === 'en' ? 'Bill a client instantly' : 'Facture um cliente instantaneamente'}
                  </p>
                </div>
              </button>

              <button
                onClick={onAddStock}
                className="flex items-center gap-4 p-4 rounded bg-secondary/5 hover:bg-secondary/10 border border-secondary/10 transition-smooth text-secondary text-left group cursor-pointer active:scale-98"
              >
                <div className="bg-secondary text-white p-2 rounded flex items-center justify-center shadow-xs">
                  <Package size={16} />
                </div>
                <div>
                  <p className="font-bold text-xs">{language === 'en' ? 'Add Stock' : 'Adicionar Stock'}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {language === 'en' ? 'Update inventory levels' : 'Actualizar níveis de inventário'}
                  </p>
                </div>
              </button>

              <button
                onClick={onGenerateReport}
                className="flex items-center gap-4 p-4 rounded bg-slate-500/5 hover:bg-slate-500/10 border border-slate-200 dark:border-slate-800 transition-smooth text-slate-700 dark:text-slate-300 text-left cursor-pointer active:scale-99"
              >
                <div className="bg-slate-700 dark:bg-slate-800 text-slate-200 p-2 rounded flex items-center justify-center shadow-xs">
                  <BarChart2 size={16} />
                </div>
                <div>
                  <p className="font-bold text-xs">{language === 'en' ? 'Generate Report' : 'Gerar Relatório'}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {language === 'en' ? 'Export quarterly PDF' : 'Exportar PDF trimestral'}
                  </p>
                </div>
              </button>

            </div>
          </div>

          {/* Critical Stock Widget */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded border border-slate-200/60 dark:border-primary-container/25 shadow-xs text-left">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xs font-bold text-primary dark:text-slate-200 font-display">
                {language === 'en' ? 'Critical Stock' : 'Stock Crítico'}
              </h3>
              {lowStockCount > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
            </div>

            {lowStockItems.length === 0 ? (
              <div className="py-6 text-center">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center mx-auto mb-2">
                  <Package size={16} className="text-emerald-600" />
                </div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {language === 'en' ? 'All stock levels healthy' : 'Todos os níveis normais'}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {language === 'en' ? 'No items need restocking' : 'Nenhum item necessita reposição'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {lowStockItems.slice(0, 3).map((item) => {
                  const pct = item.maxStock > 0 ? Math.min(100, Math.floor((item.stockLevel / item.maxStock) * 100)) : 0;
                  return (
                    <div key={item.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-semibold text-slate-705 dark:text-slate-300 truncate max-w-[140px]">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-slate-400">SKU: {item.sku}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-red-600 font-mono">
                            {item.stockLevel} {language === 'en' ? 'units' : 'unidades'}
                          </span>
                          <p className="text-[9px] text-slate-400">
                            {language === 'en' ? `Limit: ${item.maxStock}` : `Limite: ${item.maxStock}`}
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-red-500 h-full" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => onNavigate('stock')}
              className="w-full mt-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-[#15244e] text-primary dark:text-slate-200 font-semibold text-xs rounded transition-smooth active:scale-98"
            >
              {language === 'en' ? 'Manage Inventory' : 'Gerir Inventário'}
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}

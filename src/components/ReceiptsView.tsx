/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Receipt as ReceiptIcon, Eye, Download, FileText, Trash2, Info, Plus, X } from 'lucide-react';
import { Receipt, Quote, Language, Currency, CompanySettings } from '../types';
import { formatValue } from '../data';
import { generateReceiptPDF, amountToWordsPt, resolveCompanySettings } from '../lib/pdf';
import * as db from '../lib/db';
import DeleteConfirmModal from './DeleteConfirmModal';

interface ReceiptsViewProps {
  receipts: Receipt[];
  setReceipts: (rcs: Receipt[]) => void;
  quotes: Quote[];
  language: Language;
  currency: Currency;
  searchQuery: string;
  companySettings?: CompanySettings;
  createPanel?: React.ReactNode;
}

export default function ReceiptsView({
  receipts, setReceipts, quotes, language, currency, searchQuery, companySettings, createPanel,
}: ReceiptsViewProps) {
  const pt = language === 'pt';
  const defaultSettings: CompanySettings = {
    companyName: '', nuit: '', address: '', city: '',
    phone: '', email: '', bankAccounts: [], mobileContacts: [], setupComplete: false,
  };

  const findRelatedQuotes = (rc: Receipt): Quote[] =>
    quotes.filter(q => q.client.toLowerCase() === rc.client.toLowerCase() && q.status === 'Liquidado');

  const handleDownloadPDF = async (rc: Receipt) => {
    const base = companySettings || defaultSettings;
    const settings = resolveCompanySettings(base, rc.companyProfileId);
    await generateReceiptPDF(rc, settings, findRelatedQuotes(rc));
  };

  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [rightMode, setRightMode] = useState<'new' | 'details'>('new');
  const [mobileModalOpen, setMobileModalOpen] = useState(false);

  const handleDeleteReceipt = async () => {
    if (!deleteTarget) return;
    await db.deleteReceipt(deleteTarget.id);
    setReceipts(receipts.filter(rc => rc.id !== deleteTarget.id));
    if (selectedReceipt?.id === deleteTarget.id) setSelectedReceipt(null);
  };

  const filteredReceipts = receipts.filter(rc =>
    rc.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rc.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rc.invoiceRef.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabBtn = (mode: 'new' | 'details', Icon: React.ElementType, label: string) => (
    <button
      onClick={() => setRightMode(mode)}
      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-all ${
        rightMode === mode
          ? 'bg-emerald-600 text-white'
          : 'text-slate-500 dark:text-slate-400 hover:text-emerald-700 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}
    >
      <Icon size={12} />
      {label}
    </button>
  );

  // Shared details content
  const detailsPanel = (
    <div className="p-5">
      <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {pt ? 'Detalhes do recibo' : 'Receipt details'}
      </h3>
      {selectedReceipt ? (() => {
        const related = findRelatedQuotes(selectedReceipt);
        return (
          <div className="mt-4 space-y-4 text-sm text-slate-700 dark:text-slate-200">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">{pt ? 'Código Recibo' : 'Receipt ID'}</p>
              <p className="font-black text-base text-primary dark:text-white">{selectedReceipt.receiptNumber}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">{pt ? 'Cliente' : 'Client'}</p>
              <p className="font-semibold">{selectedReceipt.client}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">{pt ? 'Data' : 'Date'}</p>
                <p className="font-semibold mt-1">{pt ? selectedReceipt.datePt : selectedReceipt.date}</p>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">{pt ? 'Método' : 'Method'}</p>
                <p className="font-semibold mt-1">{pt ? selectedReceipt.methodPt : selectedReceipt.method}</p>
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-xs">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">{pt ? 'Valor' : 'Amount'}</p>
              <p className="mt-1 text-lg font-black text-primary dark:text-white">{formatValue(selectedReceipt.amount, currency)}</p>
              <p className="mt-1 text-[10px] text-slate-400 italic">{amountToWordsPt(selectedReceipt.amount)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-xs">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">{pt ? 'Ref. Factura' : 'Invoice Ref'}</p>
              <p className="font-mono font-bold text-secondary mt-1">{selectedReceipt.invoiceRef}</p>
            </div>
            {related.length > 0 && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-3 text-xs">
                <p className="text-[10px] uppercase tracking-wider text-blue-500 font-bold flex items-center gap-1">
                  <FileText size={10} />
                  {pt ? 'Cotações Liquidadas' : 'Settled Quotes'}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {related.map(q => (
                    <span key={q.id} className="font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded text-[10px]">
                      {q.quoteNumber}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={() => handleDownloadPDF(selectedReceipt)}
              className="w-full px-3 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download size={13} />
              {pt ? 'Descarregar Recibo PDF' : 'Download Receipt PDF'}
            </button>
          </div>
        );
      })() : (
        <p className="mt-4 text-xs text-slate-400">
          {pt ? 'Selecione um recibo para ver os detalhes.' : 'Select a receipt to view its details.'}
        </p>
      )}
    </div>
  );

  return (
    <>
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteReceipt}
        language={language}
        documentLabel={deleteTarget?.label ?? ''}
      />

      {/* ── Mobile bottom-sheet modal ─────────────────────────────── */}
      {mobileModalOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" onClick={() => setMobileModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>
            <div className="flex flex-shrink-0 border-b border-slate-200 dark:border-slate-800">
              {createPanel && tabBtn('new', ReceiptIcon, pt ? 'Novo Recibo' : 'New Receipt')}
              {tabBtn('details', Info, pt ? 'Detalhes' : 'Details')}
              <button
                onClick={() => setMobileModalOpen(false)}
                className="px-4 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-l border-slate-200 dark:border-slate-800"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {createPanel && rightMode === 'new' && createPanel}
              {rightMode === 'details' && detailsPanel}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5 animation-fade-in text-left">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-display">
              {pt ? 'Historial de Recibos' : 'Client Receipts Ledger'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {pt
                ? 'Consulte comprovantes de liquidação, carteiras móveis (M-Pesa) e transacções de clientes.'
                : 'Access financial settlement proof sheets, mobile wallets, and payment records.'}
            </p>
          </div>
          {createPanel && (
            <button
              onClick={() => { setRightMode('new'); setMobileModalOpen(true); }}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded flex items-center gap-2 transition-smooth cursor-pointer shadow-sm"
            >
              <ReceiptIcon size={14} />
              <span>{pt ? 'Emitir Recibo' : 'Issue Receipt'}</span>
            </button>
          )}
        </div>

        {/* Main area: table + right panel */}
        <div className="flex gap-5 items-start">

          {/* Table */}
          <div className="flex-1 min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[680px]">
                <thead className="bg-[#fbf8fd]/80 dark:bg-[#111c3a] border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-primary dark:text-slate-200 uppercase tracking-wider font-display">{pt ? 'Código' : 'Receipt ID'}</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-primary dark:text-slate-200 uppercase tracking-wider font-display">{pt ? 'Cliente' : 'Client'}</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-primary dark:text-slate-200 uppercase tracking-wider font-display">{pt ? 'Ref. Factura' : 'Invoice Ref'}</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-primary dark:text-slate-200 uppercase tracking-wider font-display">{pt ? 'Data' : 'Date'}</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-primary dark:text-slate-200 uppercase tracking-wider font-display">{pt ? 'Método' : 'Method'}</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-primary dark:text-slate-200 uppercase tracking-wider font-display">{pt ? 'Valor' : 'Amount'}</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-primary dark:text-slate-200 uppercase tracking-wider font-display text-right">{pt ? 'Ações' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredReceipts.length > 0 ? filteredReceipts.map(rc => (
                    <tr
                      key={rc.id}
                      onClick={() => { setSelectedReceipt(rc); setRightMode('details'); setMobileModalOpen(true); }}
                      className={`hover:bg-slate-50/40 dark:hover:bg-slate-850/40 transition-smooth cursor-pointer ${selectedReceipt?.id === rc.id ? 'bg-slate-50 dark:bg-slate-850/40' : ''}`}
                    >
                      <td className="px-5 py-3.5 text-xs font-mono font-bold text-primary dark:text-slate-200">{rc.receiptNumber}</td>
                      <td className="px-5 py-3.5 text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-tight">{rc.client}</td>
                      <td className="px-5 py-3.5 text-xs font-mono font-bold text-secondary dark:text-secondary-container">{rc.invoiceRef}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">{pt ? rc.datePt : rc.date}</td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 bg-secondary/10 dark:bg-secondary-container/10 text-secondary dark:text-[#fec487] border border-secondary/25 rounded text-[9px] font-extrabold uppercase tracking-wide">
                          {pt ? rc.methodPt : rc.method}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-mono font-extrabold text-[#794f1d] dark:text-[#fec487]">{formatValue(rc.amount, currency)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={e => { e.stopPropagation(); setSelectedReceipt(rc); setRightMode('details'); setMobileModalOpen(true); }}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded cursor-pointer">
                            <Eye size={13} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleDownloadPDF(rc); }}
                            className="p-1.5 hover:bg-blue-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 rounded cursor-pointer">
                            <Download size={13} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setDeleteTarget({ id: rc.id, label: rc.receiptNumber }); }}
                            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded cursor-pointer">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                        {pt ? 'Nenhum recibo encontrado.' : 'No receipt records found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right panel — hidden below lg */}
          <div className="hidden lg:block w-96 flex-shrink-0 sticky top-36 self-start space-y-2">
            {createPanel && (
              <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                {tabBtn('new', ReceiptIcon, pt ? 'Novo Recibo' : 'New Receipt')}
                {tabBtn('details', Info, pt ? 'Detalhes' : 'Details')}
              </div>
            )}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
              {(!createPanel || rightMode === 'new') && createPanel && (
                <div className="overflow-y-auto max-h-[calc(100vh-220px)]">{createPanel}</div>
              )}
              {(!createPanel || rightMode === 'details') && detailsPanel}
            </div>
          </div>

        </div>
      </div>

      {/* Mobile FAB */}
      {createPanel && (
        <button
          onClick={() => { setRightMode('new'); setMobileModalOpen(true); }}
          className="fixed bottom-6 right-6 z-40 lg:hidden w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-xl flex items-center justify-center transition-colors cursor-pointer"
          aria-label={pt ? 'Emitir Recibo' : 'Issue Receipt'}
        >
          <Plus size={22} />
        </button>
      )}
    </>
  );
}

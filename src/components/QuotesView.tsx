/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FileCode, Plus, Check, Eye, Download, Trash2, Info, X } from 'lucide-react';
import { Quote, Language, Currency, CompanySettings } from '../types';
import { formatValue } from '../data';
import * as db from '../lib/db';
import { generateQuotePDF, resolveCompanySettings, PdfGenerationOptions } from '../lib/pdf';
import PdfOptionsModal from './PdfOptionsModal';
import DeleteConfirmModal from './DeleteConfirmModal';

interface QuotesViewProps {
  quotes: Quote[];
  setQuotes: (qs: Quote[]) => void;
  language: Language;
  currency: Currency;
  onNewQuote?: () => void;
  triggerToast: (title: string, titlePt: string, desc: string, descPt: string, type: 'success' | 'info' | 'error') => void;
  searchQuery: string;
  onApproveQuote?: (id: string, num: string) => void;
  companySettings?: CompanySettings;
  createPanel?: React.ReactNode;
}

export default function QuotesView({
  quotes, setQuotes, language, currency, onNewQuote,
  triggerToast, searchQuery, onApproveQuote: onApproveQuoteProp,
  companySettings, createPanel,
}: QuotesViewProps) {
  const pt = language === 'pt';

  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pendingQuote, setPendingQuote] = useState<Quote | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [rightMode, setRightMode] = useState<'new' | 'details'>('new');
  const [mobileModalOpen, setMobileModalOpen] = useState(false);

  const handleDeleteQuote = async () => {
    if (!deleteTarget) return;
    await db.deleteQuote(deleteTarget.id);
    setQuotes(quotes.filter(q => q.id !== deleteTarget.id));
    if (selectedQuote?.id === deleteTarget.id) setSelectedQuote(null);
  };

  const handleDownloadPDF = (q: Quote) => { setPendingQuote(q); setPdfModalOpen(true); };

  const handleGeneratePDF = async (options: PdfGenerationOptions) => {
    if (!pendingQuote) return;
    const base = companySettings || { companyName: '', nuit: '', address: '', city: '', phone: '', email: '', bankAccounts: [], mobileContacts: [], setupComplete: false };
    const settings = resolveCompanySettings(base, pendingQuote.companyProfileId);
    const items = await db.fetchQuoteItems(pendingQuote.id);
    await generateQuotePDF(pendingQuote, items, settings, options);
    setPendingQuote(null);
  };

  const handleApproveQuote = (id: string, num: string) => {
    if (onApproveQuoteProp) { onApproveQuoteProp(id, num); return; }
    setQuotes(quotes.map(q => q.id === id ? { ...q, status: 'Approved' as const, statusPt: 'Aprovado' as const } : q));
    triggerToast('Quote Approved', 'Proposta Aprovada',
      `Quote ${num} promoted to ready-to-bill.`, `Proposta ${num} promovida para facturação.`, 'success');
  };

  const filteredQuotes = quotes.filter(q =>
    q.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabBtn = (mode: 'new' | 'details', Icon: React.ElementType, label: string) => (
    <button
      onClick={() => setRightMode(mode)}
      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-all ${
        rightMode === mode
          ? 'bg-primary text-white'
          : 'text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800'
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
        {pt ? 'Detalhes da cotação' : 'Quote details'}
      </h3>
      {selectedQuote ? (
        <div className="mt-4 space-y-4 text-sm text-slate-700 dark:text-slate-200">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">{pt ? 'Referência' : 'Reference'}</p>
            <p className="font-black text-base text-primary dark:text-white">{selectedQuote.quoteNumber}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">{pt ? 'Cliente' : 'Client'}</p>
            <p className="font-semibold">{selectedQuote.client}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">{pt ? 'Data' : 'Date'}</p>
              <p className="font-semibold mt-1">{pt ? selectedQuote.datePt : selectedQuote.date}</p>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">{pt ? 'Validade' : 'Validity'}</p>
              <p className="font-semibold mt-1">{selectedQuote.validityDays} {pt ? 'dias' : 'days'}</p>
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-xs">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">{pt ? 'Valor' : 'Value'}</p>
            <p className="mt-1 text-lg font-black text-primary dark:text-white">{formatValue(selectedQuote.amount, currency)}</p>
          </div>
          {selectedQuote.description && (
            <div className="rounded-lg border border-amber-100 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs">
              <p className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold mb-1">{pt ? 'Nota' : 'Note'}</p>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{selectedQuote.description}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {selectedQuote.status === 'Pending' && (
              <button onClick={() => handleApproveQuote(selectedQuote.id, selectedQuote.quoteNumber)}
                className="px-3 py-2 rounded bg-emerald-600 text-white text-xs font-bold cursor-pointer">
                {pt ? 'Aprovar' : 'Approve'}
              </button>
            )}
            <button onClick={() => handleDownloadPDF(selectedQuote)}
              className="px-3 py-2 rounded bg-blue-600 text-white text-xs font-bold cursor-pointer">
              {pt ? 'Descarregar PDF' : 'Download PDF'}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-xs text-slate-400">
          {pt ? 'Selecione uma cotação para ver os detalhes.' : 'Select a quote to view its details.'}
        </p>
      )}
    </div>
  );

  return (
    <>
      <PdfOptionsModal
        isOpen={pdfModalOpen}
        onClose={() => { setPdfModalOpen(false); setPendingQuote(null); }}
        onGenerate={handleGeneratePDF}
        language={language}
        hasStamp={!!(companySettings?.stampBase64)}
      />
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteQuote}
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
              {createPanel && tabBtn('new', FileCode, pt ? 'Nova Cotação' : 'New Quote')}
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
              {pt ? 'Cotações e Propostas' : 'Quotes & Proposals'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {pt
                ? 'Gere simulações financeiras e propostas comerciais para parceiros estratégicos.'
                : 'Draft commercial offers and financial simulations for premium partners.'}
            </p>
          </div>
          <button
            onClick={() => { setRightMode('new'); setMobileModalOpen(true); if (!createPanel) onNewQuote?.(); }}
            className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-semibold text-xs rounded flex items-center gap-2 transition-smooth cursor-pointer shadow-sm"
          >
            <Plus size={15} />
            <span>{pt ? 'Simular Proposta' : 'New Proposal'}</span>
          </button>
        </div>

        {/* Main area: table + right panel */}
        <div className="flex gap-5 items-start">

          {/* Table */}
          <div className="flex-1 min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[620px]">
                <thead className="bg-[#fbf8fd]/80 dark:bg-[#111c3a] border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-primary dark:text-slate-200 uppercase tracking-wider font-display">{pt ? 'Código' : 'Quote Ref'}</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-primary dark:text-slate-200 uppercase tracking-wider font-display">{pt ? 'Cliente' : 'Client'}</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-primary dark:text-slate-200 uppercase tracking-wider font-display">{pt ? 'Data' : 'Date'}</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-primary dark:text-slate-200 uppercase tracking-wider font-display">{pt ? 'Valor' : 'Value'}</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-primary dark:text-slate-200 uppercase tracking-wider font-display">{pt ? 'Estado' : 'Status'}</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-primary dark:text-slate-200 uppercase tracking-wider font-display text-right">{pt ? 'Ações' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredQuotes.length > 0 ? filteredQuotes.map(q => (
                    <tr
                      key={q.id}
                      onClick={() => { setSelectedQuote(q); setRightMode('details'); setMobileModalOpen(true); }}
                      className={`hover:bg-slate-50/40 dark:hover:bg-slate-850/40 transition-smooth cursor-pointer ${selectedQuote?.id === q.id ? 'bg-slate-50 dark:bg-slate-850/40' : ''}`}
                    >
                      <td className="px-5 py-3.5 text-xs font-mono font-bold text-primary dark:text-slate-100">{q.quoteNumber}</td>
                      <td className="px-5 py-3.5 text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-tight">{q.client}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">{pt ? q.datePt : q.date}</td>
                      <td className="px-5 py-3.5 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{formatValue(q.amount, currency)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                          q.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : q.status === 'Pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                          : q.status === 'Liquidado' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                        }`}>{pt ? q.statusPt : q.status}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {q.status === 'Pending' && (
                            <button onClick={e => { e.stopPropagation(); handleApproveQuote(q.id, q.quoteNumber); }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] uppercase px-2.5 py-1.5 rounded inline-flex items-center gap-1 cursor-pointer">
                              <Check size={10} />
                              <span>{pt ? 'Aprovar' : 'Approve'}</span>
                            </button>
                          )}
                          <button onClick={e => { e.stopPropagation(); setSelectedQuote(q); setRightMode('details'); setMobileModalOpen(true); }}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded cursor-pointer">
                            <Eye size={13} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleDownloadPDF(q); }}
                            className="p-1.5 hover:bg-blue-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 rounded cursor-pointer">
                            <Download size={13} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setDeleteTarget({ id: q.id, label: q.quoteNumber }); }}
                            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded cursor-pointer">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                        {pt ? 'Nenhuma cotação encontrada.' : 'No quote records found.'}
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
                {tabBtn('new', FileCode, pt ? 'Nova Cotação' : 'New Quote')}
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
          className="fixed bottom-6 right-6 z-40 lg:hidden w-14 h-14 bg-primary hover:bg-primary/90 text-white rounded-full shadow-xl flex items-center justify-center transition-colors cursor-pointer"
          aria-label={pt ? 'Nova Cotação' : 'New Quote'}
        >
          <Plus size={22} />
        </button>
      )}
    </>
  );
}

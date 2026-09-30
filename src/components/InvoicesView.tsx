/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FileText, Plus, Check, AlertCircle, Clock, FileCheck2,
  Download, Filter, Eye, ChevronLeft, ChevronRight, Trash2, Info, X,
} from 'lucide-react';
import { Invoice, Language, Currency, CompanySettings } from '../types';
import { formatValue } from '../data';
import * as db from '../lib/db';
import { generateInvoicePDF, resolveCompanySettings, PdfGenerationOptions } from '../lib/pdf';
import PdfOptionsModal from './PdfOptionsModal';
import DeleteConfirmModal from './DeleteConfirmModal';

interface InvoicesViewProps {
  invoices: Invoice[];
  setInvoices: (invs: Invoice[]) => void;
  language: Language;
  currency: Currency;
  onNewInvoice?: () => void;
  triggerToast: (title: string, titlePt: string, desc: string, descPt: string, type: 'success' | 'info' | 'error') => void;
  searchQuery: string;
  onMarkAsPaid?: (invoiceId: string, paymentMethod: string) => void;
  companySettings?: CompanySettings;
  createPanel?: React.ReactNode;
}

export default function InvoicesView({
  invoices, setInvoices, language, currency, onNewInvoice,
  triggerToast, searchQuery, onMarkAsPaid, companySettings, createPanel,
}: InvoicesViewProps) {
  const pt = language === 'pt';

  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pendingInvoice, setPendingInvoice] = useState<Invoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [rightMode, setRightMode] = useState<'new' | 'details'>('new');
  const [mobileModalOpen, setMobileModalOpen] = useState(false);

  useEffect(() => {
    setSelectedInvoice(current => current ? invoices.find(inv => inv.id === current.id) ?? null : null);
  }, [invoices]);

  const handleDeleteInvoice = async () => {
    if (!deleteTarget) return;
    await db.deleteInvoice(deleteTarget.id);
    setInvoices(invoices.filter(inv => inv.id !== deleteTarget.id));
    if (selectedInvoice?.id === deleteTarget.id) setSelectedInvoice(null);
  };

  const handleDownloadPDF = (inv: Invoice) => { setPendingInvoice(inv); setPdfModalOpen(true); };

  const handleGeneratePDF = async (options: PdfGenerationOptions) => {
    if (!pendingInvoice) return;
    const base = companySettings || { companyName: '', nuit: '', address: '', city: '', phone: '', email: '', bankAccounts: [], mobileContacts: [], setupComplete: false };
    const settings = resolveCompanySettings(base, pendingInvoice.companyProfileId);
    const items = await db.fetchInvoiceItems(pendingInvoice.id);
    await generateInvoicePDF(pendingInvoice, items, settings, options);
    setPendingInvoice(null);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const handleMarkAsPaid = (id: string, invNum: string) => {
    if (onMarkAsPaid) {
      onMarkAsPaid(id, 'Bank Transfer');

      return;
    }
    setInvoices(invoices.map(inv => inv.id === id ? { ...inv, status: 'Paid' as const, statusPt: 'Pago' as const } : inv));
    if (selectedInvoice?.id === id) setSelectedInvoice({ ...selectedInvoice!, status: 'Paid', statusPt: 'Pago' });
    triggerToast('Payment Captured', 'Pagamento Confirmado',
      `Invoice ${invNum} marked as PAID.`, `Factura ${invNum} marcada como PAGA.`, 'success');
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && (selectedStatus === 'All' || inv.status === selectedStatus);
  });

  const overdueInvoices  = invoices.filter(inv => inv.status === 'Overdue');
  const pendingInvoices  = invoices.filter(inv => inv.status === 'Pending');
  const totalOverdueSum  = overdueInvoices.reduce((a, c) => a + c.amount, 0);
  const totalPendingSum  = pendingInvoices.reduce((a, c) => a + c.amount, 0);
  const totalCollected   = invoices.filter(inv => inv.status === 'Paid').reduce((s, i) => s + i.amount, 0);
  const paidCount        = invoices.filter(inv => inv.status === 'Paid').length;

  const indexOfLastItem   = currentPage * itemsPerPage;
  const indexOfFirstItem  = indexOfLastItem - itemsPerPage;
  const currentInvoices   = filteredInvoices.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages        = Math.max(1, Math.ceil(filteredInvoices.length / itemsPerPage));

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

  // Shared details content — rendered in desktop panel AND mobile modal
  const detailsPanel = (
    <div className="p-5">
      <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {pt ? 'Detalhes da factura' : 'Invoice details'}
      </h3>
      {selectedInvoice ? (
        <div className="mt-4 space-y-4 text-sm text-slate-700 dark:text-slate-200">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">{pt ? 'Referência' : 'Reference'}</p>
            <p className="font-black text-base text-primary dark:text-white">{selectedInvoice.invoiceNumber}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">{pt ? 'Cliente' : 'Client'}</p>
            <p className="font-semibold">{selectedInvoice.client}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">{pt ? 'Data emissão' : 'Issue date'}</p>
              <p className="font-semibold mt-1">{pt ? selectedInvoice.datePt : selectedInvoice.date}</p>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">{pt ? 'Estado' : 'Status'}</p>
              <p className="font-semibold mt-1">{pt ? selectedInvoice.statusPt : selectedInvoice.status}</p>
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-xs">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">{pt ? 'Valor' : 'Amount'}</p>
            <p className="mt-1 text-lg font-black text-primary dark:text-white">{formatValue(selectedInvoice.amount, currency)}</p>
          </div>
          {selectedInvoice.description && (
            <div className="rounded-lg border border-amber-100 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs">
              <p className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold mb-1">{pt ? 'Nota' : 'Note'}</p>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{selectedInvoice.description}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {selectedInvoice.status !== 'Paid' && (
              <button onClick={() => handleMarkAsPaid(selectedInvoice.id, selectedInvoice.invoiceNumber)}
                className="px-3 py-2 rounded bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer">
                {pt ? 'Marcar como paga' : 'Mark as paid'}
              </button>
            )}
            <button onClick={() => handleDownloadPDF(selectedInvoice)}
              className="px-3 py-2 rounded bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer">
              {pt ? 'Descarregar PDF' : 'Download PDF'}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-xs text-slate-400">
          {pt ? 'Selecione uma factura para ver os detalhes.' : 'Select an invoice to view its details.'}
        </p>
      )}
    </div>
  );

  return (
    <>
      <PdfOptionsModal
        isOpen={pdfModalOpen}
        onClose={() => { setPdfModalOpen(false); setPendingInvoice(null); }}
        onGenerate={handleGeneratePDF}
        language={language}
        hasStamp={!!(companySettings?.stampBase64)}
      />
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteInvoice}
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
              {createPanel && tabBtn('new', FileText, pt ? 'Nova Factura' : 'New Invoice')}
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
              {pt ? 'Gestão de Facturação' : 'Invoice Workflows'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {pt
                ? 'Gere, monitorize e registe pagamentos para contas de crédito comercial.'
                : 'Draft, issue, track, and record payments for corporate trade credit accounts.'}
            </p>
          </div>
          <button
            onClick={() => { setRightMode('new'); setMobileModalOpen(true); }}
            className="px-5 py-2.5 bg-primary text-white font-semibold text-xs rounded flex items-center gap-2 hover:bg-primary/90 transition-smooth cursor-pointer shadow-sm"
          >
            <Plus size={15} />
            <span>{pt ? 'Criar Factura' : 'Create Invoice'}</span>
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white dark:bg-slate-900 p-5 rounded border border-slate-200/60 dark:border-primary-container/20 shadow-xs flex flex-col justify-between hover:shadow-md transition-smooth">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider font-display">
                  {pt ? 'Total Recebido' : 'Total Collected'}
                </span>
                <p className="text-2xl font-black text-primary dark:text-white mt-1 font-display">
                  {formatValue(totalCollected, currency)}
                </p>
              </div>
              <div className="flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold">
                <FileCheck2 size={10} />
                <span>{paidCount}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
              {paidCount === 0
                ? (pt ? 'Sem facturas pagas' : 'No paid invoices yet')
                : `${paidCount} ${pt ? 'factura(s) liquidada(s)' : 'invoice(s) fully settled'}`}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded border border-slate-200/60 dark:border-primary-container/20 shadow-xs flex flex-col justify-between hover:shadow-md transition-smooth">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-display">
                {pt ? 'Dívidas em Atraso' : 'Overdue Debt'}
              </span>
              <p className="text-2xl font-black text-red-600 dark:text-red-400 mt-1 font-display">
                {formatValue(totalOverdueSum, currency)}
              </p>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-4 flex gap-3 items-center">
              <div className="w-9 h-9 rounded bg-red-100 dark:bg-red-950/40 text-red-600 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {overdueInvoices.length} {pt ? 'Contas em Atraso' : 'Overdue Accounts'}
                </p>
                <p className="text-[10px] text-slate-400">{pt ? 'Requer cobrança imediata' : 'Requires dynamic billing'}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded border border-slate-200/60 dark:border-primary-container/20 shadow-xs flex flex-col justify-between hover:shadow-md transition-smooth">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-display">
                {pt ? 'Facturação a Cobrar' : 'Unpaid Outstanding'}
              </span>
              <p className="text-2xl font-black text-amber-600 mt-1 font-display">
                {formatValue(totalPendingSum, currency)}
              </p>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-4 flex gap-3 items-center">
              <div className="w-9 h-9 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center animate-pulse flex-shrink-0">
                <Clock size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {pendingInvoices.length} {pt ? 'Aguardam liquidação' : 'Pending settlement'}
                </p>
                <p className="text-[10px] text-slate-400">{pt ? 'Estimado: 5 dias úteis' : 'Est: 5 business days'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded shadow-xs">
            <Filter size={13} className="mr-2 text-slate-400" />
            <select
              value={selectedStatus}
              onChange={e => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              className="border-none bg-transparent focus:ring-0 text-xs text-slate-700 dark:text-slate-300 cursor-pointer outline-none font-semibold"
            >
              <option value="All">{pt ? 'Todos os Estados' : 'All Statuses'}</option>
              <option value="Paid">{pt ? 'Pago' : 'Paid'}</option>
              <option value="Pending">{pt ? 'Pendente' : 'Pending'}</option>
              <option value="Overdue">{pt ? 'Vencido' : 'Overdue'}</option>
            </select>
          </div>
        </div>

        {/* Main area: table + right panel */}
        <div className="flex gap-5 items-start">

          {/* Table */}
          <div className="flex-1 min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden shadow-xs flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[680px]">
                <thead className="bg-[#fbf8fd]/80 dark:bg-[#111c3a] border-b border-slate-200/50">
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="px-5 py-3.5 text-[10px] font-bold text-primary dark:text-slate-200 font-display uppercase tracking-wider">{pt ? 'Referência' : 'Invoice Ref'}</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-primary dark:text-slate-200 font-display uppercase tracking-wider">{pt ? 'Cliente' : 'Client'}</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-primary dark:text-slate-200 font-display uppercase tracking-wider">{pt ? 'Vencimento' : 'Due Date'}</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-primary dark:text-slate-200 font-display uppercase tracking-wider">{pt ? 'Valor' : 'Amount'}</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-primary dark:text-slate-200 font-display uppercase tracking-wider">{pt ? 'Estado' : 'Status'}</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-primary dark:text-slate-200 font-display uppercase tracking-wider text-right">{pt ? 'Ações' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {currentInvoices.length > 0 ? currentInvoices.map(inv => (
                    <tr
                      key={inv.id}
                      onClick={() => { setSelectedInvoice(inv); setRightMode('details'); setMobileModalOpen(true); }}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-smooth cursor-pointer ${selectedInvoice?.id === inv.id ? 'bg-slate-50 dark:bg-slate-850/40' : ''}`}
                    >
                      <td className="px-5 py-3.5 text-xs font-mono font-bold text-primary dark:text-blue-400">{inv.invoiceNumber}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded ${inv.logoBg} flex items-center justify-center font-bold text-[10px] flex-shrink-0`}>{inv.initials}</div>
                          <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-tight">{inv.client}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">{pt ? inv.datePt : inv.date}</td>
                      <td className="px-5 py-3.5 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{formatValue(inv.amount, currency)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : inv.status === 'Pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                        }`}>{pt ? inv.statusPt : inv.status}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={e => { e.stopPropagation(); setSelectedInvoice(inv); setRightMode('details'); setMobileModalOpen(true); }}
                            className="px-2 py-1.5 bg-slate-100 hover:bg-primary hover:text-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Eye size={11} />
                            <span>{pt ? 'Ver' : 'View'}</span>
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDownloadPDF(inv); }}
                            className="p-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded cursor-pointer transition-colors"
                          >
                            <Download size={12} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteTarget({ id: inv.id, label: inv.invoiceNumber }); }}
                            className="p-1.5 bg-slate-100 hover:bg-red-600 hover:text-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded cursor-pointer transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                        {pt ? 'Nenhuma factura encontrada.' : 'No invoices found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-50 dark:bg-slate-850 px-5 py-3.5 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500">
                {pt ? 'Página' : 'Page'} <span className="font-bold text-slate-800 dark:text-slate-200">{currentPage}</span> {pt ? 'de' : 'of'} <span className="font-bold text-slate-800 dark:text-slate-200">{totalPages}</span>
              </span>
              <div className="flex gap-1.5">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 dark:border-slate-800 hover:bg-white disabled:opacity-40 cursor-pointer text-slate-400">
                  <ChevronLeft size={15} />
                </button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 dark:border-slate-800 hover:bg-white disabled:opacity-40 cursor-pointer text-slate-400">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Right panel — hidden below lg, visible on lg+ */}
          <div className="hidden lg:block w-[500px] flex-shrink-0 sticky top-36 self-start space-y-2">
            {createPanel && (
              <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                {tabBtn('new', FileText, pt ? 'Nova Factura' : 'New Invoice')}
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

      {/* Mobile "Nova Factura" FAB — only on small screens when right panel is hidden */}
      {createPanel && (
        <button
          onClick={() => { setRightMode('new'); setMobileModalOpen(true); }}
          className="fixed bottom-6 right-6 z-40 lg:hidden w-14 h-14 bg-primary hover:bg-primary/90 text-white rounded-full shadow-xl flex items-center justify-center transition-colors cursor-pointer"
          aria-label={pt ? 'Criar Factura' : 'Create Invoice'}
        >
          <Plus size={22} />
        </button>
      )}
    </>
  );
}

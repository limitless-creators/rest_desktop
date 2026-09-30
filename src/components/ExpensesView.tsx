/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Expense, Language, Currency } from '../types';
import { formatValue } from '../data';
import { CreditCard, Plus, Search, HelpCircle, Check, Trash2, Paperclip } from 'lucide-react';
import * as db from '../lib/db';
import DeleteConfirmModal from './DeleteConfirmModal';
import ReceiptImageModal from './ReceiptImageModal';

interface ExpensesViewProps {
  expenses: Expense[];
  setExpenses: (exps: Expense[]) => void;
  language: Language;
  currency: Currency;
  onNewExpense: () => void;
  triggerToast: (title: string, titlePt: string, desc: string, descPt: string, type: 'success' | 'info') => void;
  searchQuery: string;
  onDeleteExpense?: (id: string) => void;
}

export default function ExpensesView({
  expenses,
  setExpenses,
  language,
  currency,
  onNewExpense,
  triggerToast,
  searchQuery,
  onDeleteExpense: onDeleteExpenseProp,
}: ExpensesViewProps) {

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<{ url: string; label: string } | null>(null);

  const handleDeleteExpense = async () => {
    if (!deleteTarget) return;
    await db.deleteExpense(deleteTarget.id);
    if (onDeleteExpenseProp) {
      onDeleteExpenseProp(deleteTarget.id);
    } else {
      setExpenses(expenses.filter(exp => exp.id !== deleteTarget.id));
    }
    triggerToast(
      'Expense Removed',
      'Despesa Removida',
      `Procurement record ${deleteTarget.label} was successfully deleted.`,
      `O registro de despesa ${deleteTarget.label} foi eliminado permanentemente.`,
      'info'
    );
  };

  const filteredExpenses = expenses.filter(exp => {
    return exp.merchant.toLowerCase().includes(searchQuery.toLowerCase()) || 
           exp.ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
           exp.category.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const totalSpend = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <>
    {previewUrl && (
      <ReceiptImageModal
        b2Url={previewUrl.url}
        label={previewUrl.label}
        language={language}
        onClose={() => setPreviewUrl(null)}
      />
    )}
    <DeleteConfirmModal
      isOpen={!!deleteTarget}
      onClose={() => setDeleteTarget(null)}
      onConfirm={handleDeleteExpense}
      language={language}
      documentLabel={deleteTarget?.label ?? ''}
    />
    <div className="space-y-6 animation-fade-in text-left">

      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-display">
            {language === 'en' ? 'Procurement & Expenses' : 'Rastreamento de Despesas'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'en'
              ? 'Evaluate, file, and audit company disbursements, hardware sourcing, and staff expenses.'
              : 'Verifique, registe e audite custos corporativos, infraestrutura de nuvem e material.'
            }
          </p>
        </div>
        
        <button
          onClick={onNewExpense}
          className="px-5 py-2.5 bg-primary hover:bg-primary-container text-white font-semibold text-xs rounded flex items-center gap-2 transition-smooth cursor-pointer shadow-sm active:scale-98"
        >
          <Plus size={15} />
          <span>{language === 'en' ? 'File Expense' : 'Registar Despesa'}</span>
        </button>
      </div>

      {/* Summary card */}
      <div className="bg-gradient-to-r from-[#fbf8fd] to-[#f5f3f7] dark:from-[#0c1c48]/5 dark:to-slate-900 border border-slate-205 dark:border-slate-800 px-5 py-3.5 rounded flex justify-between items-center max-w-[32rem] shadow-sm">
        <span className="text-xs font-bold text-slate-500 font-display uppercase tracking-wide">
          {language === 'en' ? 'Aggregated filtered spending:' : 'Total de despesas filtradas:'}
        </span>
        <span className="text-base font-black text-primary dark:text-white font-mono">
          {formatValue(totalSpend, currency)}
        </span>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded overflow-hidden shadow-xs">
        <table className="w-full text-left">
          <thead className="bg-[#fbf8fd]/80 dark:bg-[#111c3a] border-b border-slate-205 dark:border-slate-850">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 uppercase tracking-wider text-[10px] font-display">{language === 'en' ? 'Credit Reference' : 'ID da Despesa'}</th>
              <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 uppercase tracking-wider text-[10px] font-display">{language === 'en' ? 'Merchant / Supplier' : 'Fornecedor / Loja'}</th>
              <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 uppercase tracking-wider text-[10px] font-display">{language === 'en' ? 'Division Category' : 'Categoria'}</th>
              <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 uppercase tracking-wider text-[10px] font-display">{language === 'en' ? 'Filing Date' : 'Data'}</th>
              <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 uppercase tracking-wider text-[10px] font-display">{language === 'en' ? 'Verification' : 'Estado'}</th>
              <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 uppercase tracking-wider text-[10px] font-display text-center">{language === 'en' ? 'Receipt' : 'Comprovativo'}</th>
              <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 uppercase tracking-wider text-[10px] font-display">{language === 'en' ? 'Outlay Sum' : 'Valor Pago'}</th>
              <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 uppercase tracking-wider text-[10px] font-display text-right">{language === 'en' ? 'Actions' : 'Remover'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredExpenses.length > 0 ? (
               filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/40 transition-smooth">
                  <td className="px-6 py-4 text-xs font-mono font-bold text-slate-755 dark:text-slate-350">
                    {exp.ref}
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-primary dark:text-slate-305 uppercase tracking-tight">
                    {exp.merchant}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-650 rounded">
                      {language === 'en' ? exp.category : exp.categoryPt}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {language === 'en' ? exp.date : exp.datePt}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                      exp.status === 'Approved' 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' 
                        : exp.status === 'Pending'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-955/40 dark:text-red-300'
                    }`}>
                      {language === 'en' ? exp.status : exp.statusPt}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {exp.receiptImageUrl ? (
                      <button
                        onClick={() => setPreviewUrl({ url: exp.receiptImageUrl!, label: exp.ref })}
                        title={language === 'en' ? 'View receipt image' : 'Ver comprovativo'}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors cursor-pointer"
                      >
                        <Paperclip size={13} />
                      </button>
                    ) : (
                      <span className="text-slate-250 dark:text-slate-700 text-[10px]">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono font-extrabold text-primary dark:text-white">
                    {formatValue(exp.amount, currency)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => setDeleteTarget({ id: exp.id, label: exp.ref })}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-955/20 text-slate-400 hover:text-red-650 dark:hover:text-red-400 rounded transition-smooth cursor-pointer"
                      title={language === 'en' ? 'Delete expense' : 'Eliminar despesa'}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-400">
                  {language === 'en' ? 'No expense files found matching criteria.' : 'Nenhuma despesa localizada.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
    </>
  );
}

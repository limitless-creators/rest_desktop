/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Share2,
  ChevronDown,
  FileCheck,
  Edit3,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Filter,
  Trash2,
  CalendarDays,
  X,
  TrendingUp,
  PackagePlus,
  Info,
  BarChart2,
} from 'lucide-react';
import { StockItem, Language, Currency, CompanySettings, GeneralSale } from '../types';
import { formatValue } from '../data';
import * as db from '../lib/db';
import DeleteConfirmModal from './DeleteConfirmModal';
import { generateStockPDF, generateStockROIPDF } from '../lib/pdf';

interface StockViewProps {
  stockItems: StockItem[];
  setStockItems: (items: StockItem[]) => void;
  language: Language;
  currency: Currency;
  userId: string | null;
  triggerToast: (title: string, titlePt: string, desc: string, descPt: string, type: 'success' | 'info' | 'error') => void;
  searchQuery: string;
  companySettings: CompanySettings;
  generalSales: GeneralSale[];
}

const CATEGORY_PT_MAP: Record<string, string> = {
  Hardware: 'Hardware',
  Accessories: 'Acessórios',
  Structural: 'Estrutural',
  Infrastructure: 'Infraestrutura',
  'Dry Grocery': 'Mercearia',
  'Canned Foods': 'Conservas',
  Beverages: 'Bebidas',
  'Dairy Products': 'Laticínios',
};

export default function StockView({
  stockItems,
  setStockItems,
  language,
  currency,
  userId,
  triggerToast,
  searchQuery,
  companySettings,
  generalSales,
}: StockViewProps) {
  const pt = language === 'pt';

  // ── Delete modal ─────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  const handleDeleteStockItem = async () => {
    if (!deleteTarget) return;
    await db.deleteStockItem(deleteTarget.id);
    setStockItems(stockItems.filter(item => item.id !== deleteTarget.id));
  };

  // ── Table filters ─────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedWarehouse, setSelectedWarehouse] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const CATEGORIES = pt
    ? ['Todas as Categorias', 'Mercearia', 'Conservas', 'Bebidas', 'Laticínios']
    : ['All Categories', 'Dry Grocery', 'Canned Foods', 'Beverages', 'Dairy Products'];

  const getCategoryKey = (cat: string) => {
    if (cat === 'All Categories' || cat === 'Todas as Categorias') return 'All';
    if (cat === 'Mercearia' || cat === 'Dry Grocery') return 'Dry Grocery';
    if (cat === 'Conservas' || cat === 'Canned Foods') return 'Canned Foods';
    if (cat === 'Bebidas' || cat === 'Beverages') return 'Beverages';
    if (cat === 'Laticínios' || cat === 'Dairy Products') return 'Dairy Products';
    return cat;
  };

  const filteredItems = stockItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const catVal = getCategoryKey(selectedCategory);
    const matchesCategory = catVal === 'All' || item.category === catVal;
    const matchesStatus = selectedStatus === 'All' ||
      (selectedStatus === 'In Stock' && item.status === 'In Stock') ||
      (selectedStatus === 'Low Stock' && item.status === 'Low Stock') ||
      (selectedStatus === 'Out of Stock' && item.status === 'Out of Stock');
    const wVal = selectedWarehouse;
    const matchesWarehouse = wVal === 'All' ||
      (wVal === 'NYC' && item.warehouse.includes('NYC')) ||
      (wVal === 'West' && item.warehouse.includes('West')) ||
      (wVal === 'Maputo' && item.warehousePt.includes('Maputo')) ||
      (wVal === 'Beira' && item.warehousePt.includes('Beira'));
    const itemDate = item.createdAt ? item.createdAt.slice(0, 10) : '';
    const matchesFrom = !dateFrom || itemDate >= dateFrom;
    const matchesTo = !dateTo || itemDate <= dateTo;
    return matchesSearch && matchesCategory && matchesStatus && matchesWarehouse && matchesFrom && matchesTo;
  });

  const lowStockCount = filteredItems.filter(item => item.status !== 'In Stock').length;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));

  const handleRestock = (sku: string) => {
    const updated = stockItems.map(item =>
      item.sku === sku
        ? { ...item, stockLevel: item.maxStock, status: 'In Stock' as const, statusPt: 'Em Stock' as const }
        : item
    );
    setStockItems(updated);
    triggerToast('Inventory Synchronized', 'Inventário Sincronizado',
      `Restocked item with SKU ${sku} successfully.`,
      `Artigo SKU ${sku} reposto com sucesso.`, 'success');
  };

  const handleSyncAllLevels = () => {
    const updated = stockItems.map(item =>
      item.stockLevel <= item.maxStock * 0.35
        ? { ...item, stockLevel: Math.floor(item.maxStock * 0.9), status: 'In Stock' as const, statusPt: 'Em Stock' as const }
        : item
    );
    setStockItems(updated);
    triggerToast('Inventory Synchronized', 'Inventário Sincronizado',
      'All stock levels updated.', 'Todos os níveis de stock actualizados.', 'success');
  };

  // ── Add item form state ───────────────────────────────────────
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState('Hardware');
  const [formPurchasePrice, setFormPurchasePrice] = useState('');
  const [formSalePrice, setFormSalePrice] = useState('');
  const [formStockLevel, setFormStockLevel] = useState('');
  const [formMaxStock, setFormMaxStock] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Right panel state ─────────────────────────────────────────
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [rightMode, setRightMode] = useState<'new' | 'details'>('new');

  // ── Live ROI for form ─────────────────────────────────────────
  const roi = useMemo(() => {
    const purchase = parseFloat(formPurchasePrice);
    const sale = parseFloat(formSalePrice);
    const qty = parseInt(formStockLevel);
    if (isNaN(purchase) || purchase <= 0 || isNaN(sale) || sale <= 0) return null;
    const profitPerUnit = sale - purchase;
    const marginPct = (profitPerUnit / purchase) * 100;
    const totalProfit = !isNaN(qty) && qty > 0 ? profitPerUnit * qty : null;
    return { profitPerUnit, marginPct, totalProfit };
  }, [formPurchasePrice, formSalePrice, formStockLevel]);

  // ── ROI for selected item (from stored prices) ────────────────
  const selectedRoi = useMemo(() => {
    if (!selectedItem || !selectedItem.salePrice || selectedItem.price <= 0) return null;
    const profitPerUnit = selectedItem.salePrice - selectedItem.price;
    const marginPct = (profitPerUnit / selectedItem.price) * 100;
    const totalProfit = profitPerUnit * selectedItem.stockLevel;
    return { profitPerUnit, marginPct, totalProfit };
  }, [selectedItem]);

  const resetForm = () => {
    setFormName('');
    setFormSku('');
    setFormCategory('Hardware');
    setFormPurchasePrice('');
    setFormSalePrice('');
    setFormStockLevel('');
    setFormMaxStock('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    const purchaseNum = parseFloat(formPurchasePrice);
    const salePriceNum = formSalePrice ? parseFloat(formSalePrice) : undefined;
    const levNum = parseInt(formStockLevel);
    const maxNum = parseInt(formMaxStock);
    if (!formName.trim() || !formSku.trim() || isNaN(purchaseNum) || isNaN(levNum) || isNaN(maxNum)) {
      triggerToast('Validation Error', 'Erro', 'Please fill all required fields.', 'Preencha todos os campos obrigatórios.', 'error');
      return;
    }
    setIsSubmitting(true);
    const newItem = await db.createStockItem({
      userId,
      name: formName.trim(),
      sku: formSku.toUpperCase().trim(),
      category: formCategory,
      categoryPt: CATEGORY_PT_MAP[formCategory] ?? formCategory,
      stockLevel: levNum,
      maxStock: maxNum,
      price: purchaseNum,
      salePrice: salePriceNum,
      warehouse: 'Primary Hub (Maputo)',
      warehousePt: 'Hub Principal (Maputo)',
    });
    setIsSubmitting(false);
    if (newItem) {
      setStockItems([newItem, ...stockItems]);
      resetForm();
      triggerToast('Item Registered', 'Artigo Registado',
        `SKU ${newItem.sku} added to warehouse.`,
        `Artigo SKU ${newItem.sku} catalogado com sucesso.`, 'success');
    } else {
      triggerToast('Error', 'Erro', 'Failed to create stock item.', 'Falha ao criar artigo.', 'error');
    }
  };

  const inputCls = 'w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-primary dark:focus:border-primary/70 text-slate-900 dark:text-slate-100 placeholder:text-slate-400';
  const labelCls = 'block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1';

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

  const roiBlock = (r: { profitPerUnit: number; marginPct: number; totalProfit: number | null }) => (
    <div className="space-y-2.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-500">{pt ? 'Lucro por unidade' : 'Profit / unit'}</span>
        <span className={`text-xs font-bold ${r.profitPerUnit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
          {r.profitPerUnit >= 0 ? '+' : ''}{formatValue(r.profitPerUnit, currency)}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-500">{pt ? 'Margem bruta' : 'Gross margin'}</span>
        <span className={`text-xs font-bold ${r.marginPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
          {r.marginPct.toFixed(1)}%
        </span>
      </div>
      {r.totalProfit !== null && (
        <>
          <div className="h-px bg-slate-100 dark:bg-slate-800" />
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 font-medium">{pt ? 'Lucro potencial' : 'Potential profit'}</span>
            <span className={`text-sm font-extrabold ${r.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
              {formatValue(r.totalProfit, currency)}
            </span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${r.marginPct >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(100, Math.abs(r.marginPct))}%` }}
            />
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteStockItem}
        language={language}
        documentLabel={deleteTarget?.label ?? ''}
      />

      <div className="flex gap-6 animation-fade-in text-left items-start">

        {/* ── LEFT: table panel ─────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-display">
                {pt ? 'Gestão de Stock' : 'Stock Management'}
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {pt
                  ? 'Monitorize e gira o inventário da sua empresa em todos os armazéns.'
                  : 'Monitor and manage your enterprise inventory across all warehouses.'}
              </p>
            </div>

            {/* Export */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-smooth cursor-pointer shadow-sm"
              >
                <Share2 size={13} />
                <span>{pt ? 'Exportar' : 'Export'}</span>
                <ChevronDown size={12} className="opacity-60" />
              </button>
              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xl z-50 overflow-hidden animation-fade-in text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <button
                    onClick={() => {
                      setShowExportDropdown(false);
                      generateStockPDF(filteredItems, language, companySettings, dateFrom || undefined, dateTo || undefined);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <FileCheck size={14} className="text-red-500" />
                    <span>{pt ? 'Exportar para PDF' : 'Export to PDF'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowExportDropdown(false);
                      generateStockROIPDF(filteredItems, generalSales, language, companySettings, dateFrom || undefined, dateTo || undefined);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-t border-slate-100 dark:border-slate-800"
                  >
                    <BarChart2 size={14} className="text-emerald-600" />
                    <span>{pt ? 'Relatório de Lucratividade' : 'Profitability Report'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Date range */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-3 py-1.5 shadow-xs">
              <CalendarDays size={13} className="text-slate-400 flex-shrink-0" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{pt ? 'De' : 'From'}</span>
              <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }}
                className="bg-transparent border-none text-xs text-slate-700 dark:text-slate-300 outline-none cursor-pointer font-semibold" />
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-3 py-1.5 shadow-xs">
              <CalendarDays size={13} className="text-slate-400 flex-shrink-0" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{pt ? 'Até' : 'To'}</span>
              <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }}
                className="bg-transparent border-none text-xs text-slate-700 dark:text-slate-300 outline-none cursor-pointer font-semibold" />
            </div>
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); setCurrentPage(1); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:text-red-600 border border-slate-200 rounded hover:border-red-300 transition-colors cursor-pointer">
                <X size={11} />
                {pt ? 'Limpar datas' : 'Clear dates'}
              </button>
            )}
          </div>

          {/* Filter strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2 lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded flex items-center shadow-xs">
              <Filter size={14} className="mx-2 text-slate-400" />
              <select value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                className="w-full border-none bg-transparent focus:ring-0 text-xs text-slate-700 dark:text-slate-300 py-1.5 cursor-pointer outline-none font-semibold">
                {CATEGORIES.map((cat, i) => <option key={i} value={cat} className="dark:bg-slate-900">{cat}</option>)}
              </select>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded flex items-center shadow-xs">
              <select value={selectedStatus} onChange={e => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                className="w-full border-none bg-transparent focus:ring-0 text-xs text-slate-700 dark:text-slate-300 py-1.5 cursor-pointer outline-none font-semibold">
                <option value="All">{pt ? 'Todos os Estados' : 'All Statuses'}</option>
                <option value="In Stock">{pt ? 'Em Stock' : 'In Stock'}</option>
                <option value="Low Stock">{pt ? 'Stock Baixo' : 'Low Stock'}</option>
                <option value="Out of Stock">{pt ? 'Sem Stock' : 'Out of Stock'}</option>
              </select>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded flex items-center shadow-xs">
              <select value={selectedWarehouse} onChange={e => { setSelectedWarehouse(e.target.value); setCurrentPage(1); }}
                className="w-full border-none bg-transparent focus:ring-0 text-xs text-slate-700 dark:text-slate-300 py-1.5 cursor-pointer outline-none font-semibold">
                <option value="All">{pt ? 'Armazém: Todos' : 'Warehouse: All'}</option>
                {pt ? (
                  <>
                    <option value="Maputo">Hub Principal (Maputo)</option>
                    <option value="Beira">Anexo da Beira</option>
                  </>
                ) : (
                  <>
                    <option value="NYC">Primary Hub (NYC)</option>
                    <option value="West">West Coast Annex</option>
                  </>
                )}
              </select>
            </div>
            <div className="bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 dark:border-red-900/25 rounded px-4 py-1.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                <span className="text-[11px] text-red-700 dark:text-red-400 font-extrabold uppercase tracking-tight">
                  {lowStockCount} {pt ? 'Alertas' : 'Alerts'}
                </span>
              </div>
              <button onClick={handleSyncAllLevels} className="text-secondary hover:text-secondary/80 text-[10px] font-bold uppercase cursor-pointer">
                {pt ? 'Repor' : 'Restock'}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs flex flex-col overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="bg-[#fbf8fd]/80 dark:bg-[#111c3a] sticky top-0 z-10 border-b border-slate-200/50">
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="px-4 py-3.5 text-[10px] font-bold text-primary dark:text-slate-200 uppercase tracking-wider font-display">
                      <input type="checkbox" className="rounded border-slate-300 dark:border-slate-700 text-secondary focus:ring-secondary w-3.5 h-3.5" />
                    </th>
                    <th className="px-4 py-3.5 text-[10px] font-bold text-primary dark:text-slate-200 uppercase tracking-wider font-display">{pt ? 'Nome' : 'Name'}</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold text-primary dark:text-slate-200 uppercase tracking-wider font-display">SKU</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold text-primary dark:text-slate-200 uppercase tracking-wider font-display">{pt ? 'Nível' : 'Stock'}</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold text-primary dark:text-slate-200 uppercase tracking-wider font-display">{pt ? 'Compra' : 'Cost'}</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold text-primary dark:text-slate-200 uppercase tracking-wider font-display">{pt ? 'Venda' : 'Price'}</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold text-primary dark:text-slate-200 uppercase tracking-wider font-display">{pt ? 'Estado' : 'Status'}</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold text-primary dark:text-slate-200 uppercase tracking-wider font-display text-right">{pt ? 'Acções' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {currentItems.length > 0 ? currentItems.map(item => {
                    const pct = Math.min(100, Math.floor((item.stockLevel / item.maxStock) * 100));
                    const isLow = item.stockLevel <= item.maxStock * 0.35;
                    const isOut = item.stockLevel === 0;
                    const barColor = isOut ? 'bg-red-600' : isLow ? 'bg-amber-500' : 'bg-primary';
                    const badgeColor = isOut
                      ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                      : isLow
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300';
                    const margin = item.salePrice && item.price > 0
                      ? Math.round(((item.salePrice - item.price) / item.price) * 100)
                      : null;
                    const isSelected = selectedItem?.id === item.id;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => { setSelectedItem(item); setRightMode('details'); }}
                        className={`transition-smooth cursor-pointer ${isSelected ? 'bg-primary/5 dark:bg-primary/10' : isOut ? 'bg-red-500/3 hover:bg-red-500/5' : isLow ? 'bg-amber-500/3 hover:bg-amber-500/5' : 'hover:bg-slate-50/50 dark:hover:bg-slate-850/30'}`}
                      >
                        <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" className="rounded border-slate-300 dark:border-slate-700 text-secondary w-3.5 h-3.5" />
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">{item.name}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5 block">{pt ? item.warehousePt : item.warehouse}</span>
                        </td>
                        <td className="px-4 py-3.5 text-xs font-mono text-slate-500">{item.sku}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }}></div>
                            </div>
                            <span className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {item.stockLevel}/{item.maxStock}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                          {formatValue(item.price, currency)}
                        </td>
                        <td className="px-4 py-3.5">
                          {item.salePrice ? (
                            <div>
                              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                                {formatValue(item.salePrice, currency)}
                              </span>
                              {margin !== null && (
                                <span className={`ml-1.5 text-[9px] font-bold px-1 py-0.5 rounded ${margin >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-red-100 text-red-700'}`}>
                                  {margin >= 0 ? '+' : ''}{margin}%
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-1 rounded text-[9px] font-extrabold uppercase tracking-wide ${badgeColor}`}>
                            {pt ? item.statusPt : item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                          {isLow && (
                            <button onClick={() => handleRestock(item.sku)}
                              className="text-secondary hover:text-secondary/80 text-xs font-black mr-2 cursor-pointer hover:underline">
                              {pt ? 'Repor' : 'Restock'}
                            </button>
                          )}
                          <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-800 dark:hover:text-white mr-0.5 cursor-pointer">
                            <Edit3 size={13} />
                          </button>
                          <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 cursor-pointer">
                            <MoreVertical size={13} />
                          </button>
                          <button onClick={() => setDeleteTarget({ id: item.id, label: item.name })}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-950/30 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400 text-xs">
                        {pt ? 'Nenhum item encontrado.' : 'No stock records found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-slate-50 dark:bg-slate-850 px-5 py-3.5 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {pt
                  ? <><span className="font-bold text-slate-800 dark:text-slate-200">{indexOfFirstItem + 1}–{Math.min(indexOfLastItem, filteredItems.length)}</span> de {filteredItems.length}</>
                  : <><span className="font-bold text-slate-800 dark:text-slate-200">{indexOfFirstItem + 1}–{Math.min(indexOfLastItem, filteredItems.length)}</span> of {filteredItems.length}</>
                }
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer text-slate-400">
                  <ChevronLeft size={15} />
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button key={i} onClick={() => setCurrentPage(i + 1)}
                    className={`w-7 h-7 rounded text-xs font-bold cursor-pointer ${currentPage === i + 1 ? 'bg-primary text-white' : 'border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                    {i + 1}
                  </button>
                ))}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer text-slate-400">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: tabbed panel ───────────────────────────────── */}
        <div className="w-72 flex-shrink-0 space-y-2 sticky top-36 self-start">

          {/* Tab bar */}
          <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            {tabBtn('new', PackagePlus, pt ? 'Novo Item' : 'Add Item')}
            {tabBtn('details', Info, pt ? 'Detalhes' : 'Details')}
          </div>

          {/* Panel body */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">

            {/* ADD ITEM tab */}
            {rightMode === 'new' && (
              <div className="overflow-y-auto max-h-[calc(100vh-230px)]">
                <form onSubmit={handleSubmit} className="p-4 space-y-3">
                  <div>
                    <label className={labelCls}>{pt ? 'Nome do Produto' : 'Product Name'}</label>
                    <input type="text" required value={formName} onChange={e => setFormName(e.target.value)}
                      placeholder={pt ? 'Ex: Arroz Premium 5kg' : 'Ex: Intel Core i9'}
                      className={inputCls} />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>SKU</label>
                      <input type="text" required value={formSku} onChange={e => setFormSku(e.target.value)}
                        placeholder="ARR-5KG" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>{pt ? 'Categoria' : 'Category'}</label>
                      <select value={formCategory} onChange={e => setFormCategory(e.target.value)} className={inputCls}>
                        <option value="Hardware">Hardware</option>
                        <option value="Accessories">{pt ? 'Acessórios' : 'Accessories'}</option>
                        <option value="Structural">{pt ? 'Estrutural' : 'Structural'}</option>
                        <option value="Infrastructure">{pt ? 'Infraestrutura' : 'Infrastructure'}</option>
                        <option value="Dry Grocery">{pt ? 'Mercearia' : 'Dry Grocery'}</option>
                        <option value="Canned Foods">{pt ? 'Conservas' : 'Canned Foods'}</option>
                        <option value="Beverages">{pt ? 'Bebidas' : 'Beverages'}</option>
                        <option value="Dairy Products">{pt ? 'Laticínios' : 'Dairy Products'}</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>{pt ? 'Preço Compra' : 'Cost Price'}</label>
                      <input type="number" required step="any" min="0" value={formPurchasePrice}
                        onChange={e => setFormPurchasePrice(e.target.value)} placeholder="100.00"
                        className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>{pt ? 'Preço Venda' : 'Sale Price'}</label>
                      <input type="number" step="any" min="0" value={formSalePrice}
                        onChange={e => setFormSalePrice(e.target.value)} placeholder="150.00"
                        className={inputCls} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>{pt ? 'Qnt. Stock' : 'Stock Qty'}</label>
                      <input type="number" required min="0" value={formStockLevel}
                        onChange={e => setFormStockLevel(e.target.value)} placeholder="50"
                        className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>{pt ? 'Máximo' : 'Max Qty'}</label>
                      <input type="number" required min="1" value={formMaxStock}
                        onChange={e => setFormMaxStock(e.target.value)} placeholder="200"
                        className={inputCls} />
                    </div>
                  </div>

                  <button type="submit" disabled={isSubmitting || !userId}
                    className="w-full py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2">
                    <PackagePlus size={13} />
                    {isSubmitting
                      ? (pt ? 'A guardar...' : 'Saving...')
                      : (pt ? 'Catalogar Item' : 'Add to Inventory')}
                  </button>
                </form>

                {/* Live ROI preview */}
                <div className={`mx-4 mb-4 border rounded-xl overflow-hidden transition-all ${roi ? 'border-emerald-200 dark:border-emerald-900/50' : 'border-slate-200 dark:border-slate-800 opacity-50'}`}>
                  <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <TrendingUp size={13} className={roi ? 'text-emerald-600' : 'text-slate-400'} />
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {pt ? 'Prévia de Retorno' : 'ROI Preview'}
                    </span>
                  </div>
                  <div className="p-4">
                    {roi ? roiBlock(roi) : (
                      <p className="text-xs text-slate-400 text-center py-1">
                        {pt ? 'Insira os preços de compra e venda.' : 'Enter cost and sale price.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* DETAILS tab */}
            {rightMode === 'details' && (
              <div className="p-5 overflow-y-auto max-h-[calc(100vh-230px)]">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
                  {pt ? 'Detalhes do Produto' : 'Product Details'}
                </h3>
                {selectedItem ? (() => {
                  const pct = Math.min(100, Math.floor((selectedItem.stockLevel / selectedItem.maxStock) * 100));
                  const isLow = selectedItem.stockLevel <= selectedItem.maxStock * 0.35;
                  const isOut = selectedItem.stockLevel === 0;
                  const barColor = isOut ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500';
                  return (
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">{pt ? 'Produto' : 'Product'}</p>
                        <p className="font-black text-base text-primary dark:text-white mt-0.5 leading-tight">{selectedItem.name}</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{selectedItem.sku}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">{pt ? 'Categoria' : 'Category'}</p>
                          <p className="font-semibold mt-1">{pt ? selectedItem.categoryPt : selectedItem.category}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">{pt ? 'Armazém' : 'Warehouse'}</p>
                          <p className="font-semibold mt-1 text-[10px] leading-snug">{pt ? selectedItem.warehousePt : selectedItem.warehouse}</p>
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">{pt ? 'Nível de Stock' : 'Stock Level'}</p>
                          <span className="text-[10px] font-bold font-mono text-slate-600 dark:text-slate-300">
                            {selectedItem.stockLevel}/{selectedItem.maxStock}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">{pct}% {pt ? 'de capacidade' : 'capacity'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-xs">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">{pt ? 'Preço Compra' : 'Cost Price'}</p>
                          <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">{formatValue(selectedItem.price, currency)}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-xs">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">{pt ? 'Preço Venda' : 'Sale Price'}</p>
                          <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">
                            {selectedItem.salePrice ? formatValue(selectedItem.salePrice, currency) : '—'}
                          </p>
                        </div>
                      </div>
                      {selectedRoi ? (
                        <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/50 overflow-hidden">
                          <div className="px-3 py-2.5 bg-emerald-50 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/40 flex items-center gap-2">
                            <TrendingUp size={12} className="text-emerald-600" />
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                              {pt ? 'Retorno sobre Investimento' : 'Return on Investment'}
                            </span>
                          </div>
                          <div className="p-3">
                            {roiBlock({ ...selectedRoi, totalProfit: selectedRoi.totalProfit })}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 text-center">
                          <TrendingUp size={18} className="text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                          <p className="text-xs text-slate-400">
                            {pt ? 'Sem preço de venda definido.' : 'No sale price defined.'}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })() : (
                  <p className="text-xs text-slate-400">
                    {pt ? 'Clique num produto da tabela para ver os detalhes e o retorno sobre investimento.' : 'Click a product row to view its details and ROI.'}
                  </p>
                )}
              </div>
            )}
          </div>

        </div>

      </div>
    </>
  );
}

import { invalidateReads } from '../shared/pagination';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { StockItem, Transaction, Invoice, Quote, Receipt, Expense, Contact, Language, Currency, ToastMessage, CompanySettings, DocumentItem, DebtClient, GeneralSale } from './types';
import NavBar from './components/NavBar';
import Header from './components/Header';
import UpdateModal from './components/UpdateModal';
import { useUpdateDetector } from './lib/useUpdateDetector';
import DashboardView from './components/DashboardView';
import StockView from './components/StockView';
import InvoicesView from './components/InvoicesView';
import UfsaView from './components/UfsaView';
import QuotesView from './components/QuotesView';
import ReceiptsView from './components/ReceiptsView';
import ExpensesView from './components/ExpensesView';
import ContactsView from './components/ContactsView';
import ClientesView from './components/ClientesView';
import VendasView from './components/VendasView';
import AuthView from './components/AuthView';
import SettingsView from './components/SettingsView';
import ReportsView from './components/ReportsView';
import { localClient } from './lib/localClient';
import * as db from './lib/db';
import { generateInvoicePDF, generateFinancialReportPDF } from './lib/pdf';
import { uploadReceiptImage } from './lib/b2';

import { X, Check, Info, Mail, Phone, Database, Plus, Trash2, Paperclip, Upload } from 'lucide-react';
import { formatValue } from './data';
import logoUrl from './assets/Logo.webp';

export default function App() {

  const updateAvailable = useUpdateDetector();

  // ─── Preloader fixo de 3.5s — cobre todas as camadas ───────────────────
  const [showPreloader, setShowPreloader] = useState<boolean>(true);
  useEffect(() => {
    const t = setTimeout(() => setShowPreloader(false), 3500);
    return () => clearTimeout(t);
  }, []);

  // ─── Auth & Loading ──────────────────────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // ─── Preferences (localStorage only) ────────────────────────────────────
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('invstock_lang');
    return (saved === 'en' || saved === 'pt') ? (saved as Language) : 'pt';
  });

  // Always Metical (MZN/MT)
  const currency: Currency = 'MZN';

  const [darkMode, setDarkMode] = useState<boolean>(
    () => localStorage.getItem('invstock_dark') === 'true'
  );

  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem('invstock_tab') || 'dashboard';
  });

  const [searchQuery, setSearchQuery] = useState('');

  // ─── ERP Data States (start empty – loaded from SQLite local) ────────────────
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [debtClients, setDebtClients] = useState<DebtClient[]>([]);
  const [generalSales, setGeneralSales] = useState<GeneralSale[]>([]);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modal state
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Company settings & user info
  // Seed setupComplete from cache so the first-setup wizard never flashes on reload
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    companyName: '', nuit: '', address: '', city: '', phone: '', email: '',
    bankAccounts: [], mobileContacts: [],
    setupComplete: localStorage.getItem('invstock_setup') === 'true',
  });
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  // Form state – Invoice
  const [formInvoiceClient, setFormInvoiceClient] = useState('');
  const [formInvoiceClientNuit, setFormInvoiceClientNuit] = useState('');
  const [formInvoiceClientPhone, setFormInvoiceClientPhone] = useState('');
  const [formInvoiceClientEmail, setFormInvoiceClientEmail] = useState('');
  const [formInvoiceStatus, setFormInvoiceStatus] = useState<Invoice['status']>('Pending');
  const [formInvoiceDescription, setFormInvoiceDescription] = useState('');
  const [formInvoiceDueDate, setFormInvoiceDueDate] = useState('');
  const [formInvoiceItems, setFormInvoiceItems] = useState<DocumentItem[]>([
    { description: '', quantity: 1, unitPrice: 0 },
  ]);

  // Form state – Stock
  const [formStockName, setFormStockName] = useState('');
  const [formStockSku, setFormStockSku] = useState('');
  const [formStockCategory, setFormStockCategory] = useState('Hardware');
  const [formStockWarehouse, setFormStockWarehouse] = useState('NYC');
  const [formStockPrice, setFormStockPrice] = useState('');
  const [formStockLevel, setFormStockLevel] = useState('');
  const [formStockMax, setFormStockMax] = useState('');

  // Form state – Quote
  const [formQuoteClient, setFormQuoteClient] = useState('');
  const [formQuoteClientNuit, setFormQuoteClientNuit] = useState('');
  const [formQuoteClientPhone, setFormQuoteClientPhone] = useState('');
  const [formQuoteClientEmail, setFormQuoteClientEmail] = useState('');
  const [formQuoteDescription, setFormQuoteDescription] = useState('');
  const [formQuoteValidity, setFormQuoteValidity] = useState('15');
  const [formQuoteItems, setFormQuoteItems] = useState<DocumentItem[]>([
    { description: '', quantity: 1, unitPrice: 0 },
  ]);

  // Form state – Expense
  const [formExpenseMerchant, setFormExpenseMerchant] = useState('');
  const [formExpenseCategory, setFormExpenseCategory] = useState('Logistics');
  const [formExpenseAmount, setFormExpenseAmount] = useState('');
  const [formExpenseDate, setFormExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formExpenseNotes, setFormExpenseNotes] = useState('');
  const [formExpenseReceiptFile, setFormExpenseReceiptFile] = useState<File | null>(null);
  const [formExpenseUploading, setFormExpenseUploading] = useState(false);

  // Form state – Contact
  const [formContactName, setFormContactName] = useState('');
  const [formContactEmail, setFormContactEmail] = useState('');
  const [formContactPhone, setFormContactPhone] = useState('');
  const [formContactCompany, setFormContactCompany] = useState('');
  const [formContactRole, setFormContactRole] = useState('Lead Specialist');

  // Form state – DebtClient
  const [formClientName, setFormClientName] = useState('');
  const [formClientMovitel, setFormClientMovitel] = useState('');
  const [formClientVodacom, setFormClientVodacom] = useState('');
  const [formClientAddress, setFormClientAddress] = useState('');
  const [formClientStatus, setFormClientStatus] = useState<DebtClient['status']>('Pendente');

  // Form state – Receipt (manual)
  const [formReceiptClient, setFormReceiptClient] = useState('');
  const [formReceiptAmount, setFormReceiptAmount] = useState('');
  const [formReceiptMethod, setFormReceiptMethod] = useState('Bank Transfer');
  const [formReceiptInvoiceRef, setFormReceiptInvoiceRef] = useState('');
  const [formReceiptDate, setFormReceiptDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Form state – company profile & notes (shared across document modals)
  const [formInvoiceCompanyProfile, setFormInvoiceCompanyProfile] = useState<'primary' | 'secondary'>('primary');
  const [formInvoiceNotes, setFormInvoiceNotes] = useState('');
  const [formQuoteCompanyProfile, setFormQuoteCompanyProfile] = useState<'primary' | 'secondary'>('primary');
  const [formQuoteNotes, setFormQuoteNotes] = useState('');
  const [formReceiptCompanyProfile, setFormReceiptCompanyProfile] = useState<'primary' | 'secondary'>('primary');
  const [formReceiptNotes, setFormReceiptNotes] = useState('');

  const [reportProgress, setReportProgress] = useState(0);

  // Ref to prevent double-load on strict mode
  const loadedRef = useRef<string | null>(null);
  // Bloqueia o onAuthStateChange enquanto a carga inicial não terminou
  const initDoneRef = useRef(false);

  // ─── Navigation guard ─────────────────────────────────────────────────────
  const navigateTo = (tab: string) => {
    if (!companySettings.setupComplete && tab !== 'settings') return;
    setActiveTab(tab);
  };

  // ─── Derive transactions from invoices ───────────────────────────────────
  function invoicesToTransactions(invs: Invoice[]): Transaction[] {
    return invs.map(inv => ({
      id: inv.id + '-tx',
      transactionId: inv.invoiceNumber,
      client: inv.client,
      initials: inv.initials,
      amount: inv.amount,
      status: inv.status,
      statusPt: inv.statusPt,
      date: inv.date,
      datePt: inv.datePt,
      avatarBg: 'bg-emerald-100 text-emerald-800',
      avatarText: inv.initials,
    }));
  }

  // ─── Load all user data from SQLite local ────────────────────────────────────
  async function loadUserData(userId: string) {
    if (loadedRef.current === userId) return;
    loadedRef.current = userId;
    try {

    const [invs, qts, rcs, exps, stock, ctcs, dcs, genSales, settingsData] = await Promise.all([
      db.fetchInvoices(userId),
      db.fetchQuotes(userId),
      db.fetchReceipts(userId),
      db.fetchExpenses(userId),
      db.fetchStockItems(userId),
      db.fetchContacts(userId),
      db.fetchDebtClients(userId),
      db.fetchGeneralSales(userId),
      db.fetchCompanySettings(userId),
    ]);

    setInvoices(invs);
    setTransactions(invoicesToTransactions(invs));
    setQuotes(qts);
    setReceipts(rcs);
    setExpenses(exps);
    setStockItems(stock);
    setContacts(ctcs);
    setDebtClients(dcs);
    setGeneralSales(genSales);

    if (settingsData) {
      setCompanySettings(settingsData);
      localStorage.setItem('invstock_setup', settingsData.setupComplete ? 'true' : 'false');
      if (!settingsData.setupComplete) {
        setActiveTab('settings');
      }
    } else {
      // No settings yet → force setup
      localStorage.removeItem('invstock_setup');
      setActiveTab('settings');
    }

    // Get user info
    const { data: { user } } = await localClient.auth.getUser();
    if (user) {
      setUserEmail(user.email ?? '');
      setUserName((user.user_metadata?.name as string) ?? '');
    }
    } catch (error) {
      loadedRef.current = null;
      setDataError('Não foi possível carregar os dados completos.');
      triggerToast('Data unavailable', 'Dados indisponíveis', 'Could not load complete data. Reload to retry.', 'Não foi possível carregar os dados completos. Recarregue para tentar novamente.', 'error');
    }
  }

  function clearUserData() {
    loadedRef.current = null;
    setDataError(null);
    setInvoices([]);
    setTransactions([]);
    setQuotes([]);
    setReceipts([]);
    setExpenses([]);
    setStockItems([]);
    setContacts([]);
    setDebtClients([]);
    setGeneralSales([]);
    setCurrentUserId(null);
    setCompanySettings({
      companyName: '', nuit: '', address: '', city: '', phone: '', email: '',
      bankAccounts: [], mobileContacts: [], setupComplete: false,
    });
    setUserEmail('');
    setUserName('');
    localStorage.removeItem('invstock_setup');
  }

  useEffect(() => window.restDesktop.onSync(() => {
    invalidateReads();
    loadedRef.current = null;
    if(currentUserId) void loadUserData(currentUserId);
  }), [currentUserId]);

  // Favicon dinâmico com o logotipo
  useEffect(() => {
    const link: HTMLLinkElement =
      document.querySelector("link[rel~='icon']") || document.createElement('link');
    link.type = 'image/webp';
    link.rel = 'icon';
    link.href = logoUrl;
    document.head.appendChild(link);
  }, []);

  // ─── Auth lifecycle ───────────────────────────────────────────────────────
  useEffect(() => {
    // Carga inicial: aguarda dados antes de remover o preloader
    localClient.auth.getSession().then(async ({ data: { session } }) => {
      setIsAuthenticated(!!session);
      if (session) {
        setCurrentUserId(session.user.id);
        await loadUserData(session.user.id);
      }
      initDoneRef.current = true;
      setLoading(false);
    });

    // Mudanças de auth subsequentes (logout, refresh de token)
    // Ignoradas enquanto a inicialização inicial ainda não terminou
    const { data: { subscription } } = localClient.auth.onAuthStateChange((_event, session) => {
      if (!initDoneRef.current) return;
      setIsAuthenticated(!!session);
      if (session) {
        setCurrentUserId(session.user.id);
        loadUserData(session.user.id);
      } else {
        clearUserData();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ─── Preference persistence ───────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('invstock_lang', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('invstock_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('invstock_dark', darkMode ? 'true' : 'false');
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setActiveModal('new_invoice');
      }
      if (e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setLanguage(lang => lang === 'en' ? 'pt' : 'en');
        triggerToast('Locale switched', 'Idioma alterado', 'Language updated instantly.', 'Idioma actualizado de imediato.', 'info');
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, []);

  // ─── Toast ────────────────────────────────────────────────────────────────
  const triggerToast = (
    title: string,
    titlePt: string,
    desc: string,
    descPt: string,
    type: 'success' | 'info' | 'error'
  ) => {
    const id = Date.now().toString();
    const newToast: ToastMessage = { id, title, titlePt, description: desc, descriptionPt: descPt, type };
    setToasts(prev => [...prev, newToast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const handleDismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // ─── Settings handlers ─────────────────────────────────────────────────────
  const handleSaveSettings = async (updates: Partial<CompanySettings>) => {
    if (!currentUserId) return;
    const updated = await db.upsertCompanySettings(currentUserId, updates);
    if (updated) {
      setCompanySettings(updated);
      localStorage.setItem('invstock_setup', updated.setupComplete ? 'true' : 'false');
    }
  };

  const handleDeleteSecondaryCompany = async () => {
    if (!currentUserId) return;
    const updated = await db.upsertCompanySettings(currentUserId, { secondaryCompany: null });
    if (updated) setCompanySettings(updated);
  };

  const handleGenerateModel = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const sampleInvoice: Invoice = {
      id: 'sample',
      seqNumber: 1,
      invoiceNumber: 'FAC-0001',
      client: 'Cliente Exemplo',
      initials: 'CE',
      issueDate: today,
      date: new Date().toLocaleDateString('en-US'),
      datePt: new Date().toLocaleDateString('pt-MZ'),
      amount: 50000,
      status: 'Pending',
      statusPt: 'Pendente',
      logoBg: '',
    };
    const sampleItems: DocumentItem[] = [
      { description: 'Serviço de consultoria ERP', quantity: 1, unitPrice: 30000 },
      { description: 'Licença anual de software', quantity: 1, unitPrice: 20000 },
    ];
    await generateInvoicePDF(sampleInvoice, sampleItems, companySettings);
  };

  // ─── Handlers ─────────────────────────────────────────────────────────────

  async function refreshAfterSave(action: () => Promise<void>) {
    try { await action(); }
    catch { setDataError('Gravação concluída, mas não foi possível actualizar os dados. Recarregue antes de continuar.'); }
  }

  const pendingWrites = useRef(new Set<string>());
  function guardedWrite<T extends unknown[]>(key: string, action: (...args: T) => Promise<void>) {
    return async (...args: T) => {
      const event = args[0] as { preventDefault?: () => void } | undefined;
      event?.preventDefault?.();
      if (pendingWrites.current.has(key)) return;
      pendingWrites.current.add(key);
      try { await action(...args); }
      catch (error) { const message = error instanceof Error ? error.message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '') : ''; triggerToast('Error', 'Erro', message || 'Operation failed. Refresh before retrying.', message || 'A operação falhou. Actualize antes de tentar novamente.', 'error'); }
      finally { pendingWrites.current.delete(key); }
    };
  }

  // Line item helpers
  const addInvoiceItem = () => {
    setFormInvoiceItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0 }]);
  };
  const updateInvoiceItem = (idx: number, field: keyof DocumentItem, value: string | number) => {
    setFormInvoiceItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };
  const removeInvoiceItem = (idx: number) => {
    setFormInvoiceItems(prev => prev.filter((_, i) => i !== idx));
  };

  const addQuoteItem = () => {
    setFormQuoteItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0 }]);
  };
  const updateQuoteItem = (idx: number, field: keyof DocumentItem, value: string | number) => {
    setFormQuoteItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };
  const removeQuoteItem = (idx: number) => {
    setFormQuoteItems(prev => prev.filter((_, i) => i !== idx));
  };

  const calcInvoiceSubtotal = () => formInvoiceItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const calcQuoteSubtotal = () => formQuoteItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0);

  const handleCreateInvoice = guardedWrite('handleCreateInvoice', async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formInvoiceClient.trim()) {
      triggerToast('Validation Error', 'Erro de Validação', 'Please supply all parameters.', 'Por favor forneça todos os parâmetros.', 'error');
      return;
    }
    const amt = calcInvoiceSubtotal();
    if (!currentUserId) return;

    const today = new Date().toISOString().slice(0, 10);
    const defaultDue = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const newInv = await db.createInvoice({
      userId: currentUserId,
      client: formInvoiceClient.trim(),
      clientNuit: formInvoiceClientNuit.trim() || undefined,
      clientPhone: formInvoiceClientPhone.trim() || undefined,
      clientEmail: formInvoiceClientEmail.trim() || undefined,
      description: formInvoiceDescription.trim() || undefined,
      amount: amt,
      status: formInvoiceStatus,
      issueDate: today,
      dueDate: formInvoiceDueDate || defaultDue,
      logoBg: 'bg-emerald-50 text-emerald-800 border border-emerald-500',
      companyProfileId: formInvoiceCompanyProfile,
      notes: formInvoiceNotes.trim() || undefined,
    }, formInvoiceItems.filter(it => it.description.trim()));

    if (newInv) {
      await refreshAfterSave(async () => { setDebtClients(await db.fetchDebtClients(currentUserId)); });
      setInvoices(prev => [newInv, ...prev]);
      setTransactions(prev => [invoicesToTransactions([newInv])[0], ...prev]);
      if (newInv.status === 'Paid') {
        await refreshAfterSave(async () => { setStockItems(await db.fetchStockItems(currentUserId)); });
      }

      await refreshAfterSave(async () => { setQuotes(await db.fetchQuotes(currentUserId)); });

      setActiveModal(null);
      setFormInvoiceClient('');
      setFormInvoiceClientNuit('');
      setFormInvoiceClientPhone('');
      setFormInvoiceClientEmail('');
      setFormInvoiceStatus('Pending');
      setFormInvoiceDescription('');
      setFormInvoiceDueDate('');
      setFormInvoiceItems([{ description: '', quantity: 1, unitPrice: 0 }]);
      setFormInvoiceCompanyProfile('primary');
      setFormInvoiceNotes('');
      triggerToast(
        'Invoice Ledger Updated',
        'Razão de Facturação Actualizado',
        `Invoice registry ${newInv.invoiceNumber} created for client ${newInv.client}.`,
        `Registro de factura ${newInv.invoiceNumber} de ${newInv.client} adicionado.`,
        'success'
      );
    } else {
      triggerToast('Error', 'Erro', 'Failed to create invoice.', 'Falha ao criar factura.', 'error');
    }
  });

  async function refreshPaymentData() {
    if (!currentUserId) return;
    const [invs, rcs, stock, qts, clients] = await Promise.all([
      db.fetchInvoices(currentUserId), db.fetchReceipts(currentUserId), db.fetchStockItems(currentUserId),
      db.fetchQuotes(currentUserId), db.fetchDebtClients(currentUserId),
    ]);
    setInvoices(invs); setTransactions(invoicesToTransactions(invs)); setReceipts(rcs);
    setStockItems(stock); setQuotes(qts); setDebtClients(clients);
  }

  const handleMarkAsPaid = guardedWrite('handleMarkAsPaid', async (invoiceId: string, paymentMethod: string) => {
    if (!currentUserId) return;
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv || inv.status === 'Paid') return;
    const allReceipts = await db.fetchReceipts(currentUserId);
    const remaining = inv.amount - allReceipts.filter(r => r.invoiceId === inv.id).reduce((sum,r) => sum+r.amount,0);
    const result = await db.createReceipt({
      userId: currentUserId, invoiceId: inv.id, invoiceRef: inv.invoiceNumber, client: inv.client,
      amount: Number(remaining.toFixed(2)), method: paymentMethod, methodPt: paymentMethod === 'Bank Transfer' ? 'Transferência Bancária' : paymentMethod,
      paymentDate: new Date().toISOString().slice(0,10), companyProfileId: inv.companyProfileId,
    });
    if (!result) {
      triggerToast('Error', 'Erro', 'Payment was not saved. Refresh and retry.', 'Pagamento não gravado. Actualize e tente novamente.', 'error');
      return;
    }
    await refreshAfterSave(refreshPaymentData);
    triggerToast('Invoice settled', 'Factura liquidada', 'Receipt and stock saved.', 'Recibo e stock gravados.', 'success');
  });

  const handleApproveQuote = async (quoteId: string, quoteNum: string) => {
    const ok = await db.updateQuoteStatus(quoteId, 'Approved');
    if (ok) {
      setQuotes(prev => prev.map(q => q.id === quoteId
        ? { ...q, status: 'Approved', statusPt: 'Aprovado' }
        : q
      ));
      triggerToast(
        'Quote Proposal Approved',
        'Proposta Aprovada',
        `Quote ${quoteNum} has been successfully promoted to ready-to-bill.`,
        `A proposta ${quoteNum} foi promovida com sucesso para facturação.`,
        'success'
      );
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    const ok = await db.deleteExpense(expenseId);
    if (ok) {
      setExpenses(prev => prev.filter(e => e.id !== expenseId));
      triggerToast('Expense Removed', 'Despesa Removida', 'Expense record deleted.', 'Registo de despesa eliminado.', 'info');
    }
  };

  const handleCreateStockItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStockName.trim() || !formStockSku.trim() || !formStockPrice.trim() || !formStockLevel.trim() || !formStockMax.trim()) {
      triggerToast('Validation Error', 'Erro', 'Please populate all fields.', 'Por favor preencha todos os campos.', 'error');
      return;
    }
    const priceNum = parseFloat(formStockPrice);
    const levNum = parseInt(formStockLevel);
    const maxNum = parseInt(formStockMax);
    if (isNaN(priceNum) || isNaN(levNum) || isNaN(maxNum)) {
      triggerToast('Validation Error', 'Erro', 'Stock parameters must be numeric.', 'Os parâmetros numéricos de stock têm que ser válidos.', 'error');
      return;
    }
    if (!currentUserId) return;

    const warehouseStr = 'Primary Hub (Maputo)';
    const warehouseStrPt = 'Hub Principal (Maputo)';
    const categoryPtMap: Record<string, string> = {
      Hardware: 'Hardware',
      Accessories: 'Acessórios',
      Structural: 'Estrutural',
      Infrastructure: 'Infraestrutura',
    };

    const newItem = await db.createStockItem({
      userId: currentUserId,
      name: formStockName.trim(),
      sku: formStockSku.toUpperCase().trim(),
      category: formStockCategory,
      categoryPt: categoryPtMap[formStockCategory] ?? formStockCategory,
      stockLevel: levNum,
      maxStock: maxNum,
      price: priceNum,
      warehouse: warehouseStr,
      warehousePt: warehouseStrPt,
    });

    if (newItem) {
      setStockItems(prev => [newItem, ...prev]);
      setActiveModal(null);
      setFormStockName('');
      setFormStockSku('');
      setFormStockPrice('');
      setFormStockLevel('');
      setFormStockMax('');
      triggerToast(
        'Item Registered',
        'Artigo Registado',
        `SKU ${newItem.sku} successfully filed to warehouse.`,
        `Artigo SKU ${newItem.sku} catalogado com sucesso nos armazéns.`,
        'success'
      );
    } else {
      triggerToast('Error', 'Erro', 'Failed to create stock item.', 'Falha ao criar artigo.', 'error');
    }
  };

  const handleCreateQuote = guardedWrite('handleCreateQuote', async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formQuoteClient.trim()) {
      triggerToast('Validation Error', 'Erro', 'Supply parameters.', 'Por favor forneça os parâmetros.', 'error');
      return;
    }
    const amt = calcQuoteSubtotal();
    if (!currentUserId) return;

    const today = new Date().toISOString().slice(0, 10);

    const newQt = await db.createQuote({
      userId: currentUserId,
      client: formQuoteClient.trim(),
      clientNuit: formQuoteClientNuit.trim() || undefined,
      clientPhone: formQuoteClientPhone.trim() || undefined,
      clientEmail: formQuoteClientEmail.trim() || undefined,
      description: formQuoteDescription.trim() || undefined,
      amount: amt,
      issueDate: today,
      validityDays: parseInt(formQuoteValidity) || 15,
      logoBg: 'bg-amber-100 text-amber-800',
      companyProfileId: formQuoteCompanyProfile,
      notes: formQuoteNotes.trim() || undefined,
    }, formQuoteItems.filter(it => it.description.trim()));

    if (newQt) {
      await refreshAfterSave(async () => { setDebtClients(await db.fetchDebtClients(currentUserId)); });
      setQuotes(prev => [newQt, ...prev]);
      setActiveModal(null);
      setFormQuoteClient('');
      setFormQuoteClientNuit('');
      setFormQuoteClientPhone('');
      setFormQuoteClientEmail('');
      setFormQuoteDescription('');
      setFormQuoteValidity('15');
      setFormQuoteItems([{ description: '', quantity: 1, unitPrice: 0 }]);
      setFormQuoteCompanyProfile('primary');
      setFormQuoteNotes('');
      triggerToast(
        'Simulation proposal launched',
        'Proposta simulada',
        `Proposal draft ${newQt.quoteNumber} holds net status approval flow.`,
        `Criação do esboço de Cotação${newQt.quoteNumber} adicionado para autorizações.`,
        'success'
      );
    } else {
      triggerToast('Error', 'Erro', 'Failed to create quote.', 'Falha ao criar proposta.', 'error');
    }
  });

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formExpenseMerchant.trim() || !formExpenseAmount.trim()) {
      triggerToast('Validation Error', 'Erro', 'Populate all text areas.', 'Preencha todos os campos.', 'error');
      return;
    }
    const amt = parseFloat(formExpenseAmount);
    if (isNaN(amt)) return;
    if (!currentUserId) return;

    const categoryPtMap: Record<string, string> = {
      Logistics: 'Logística',
      'Raw Materials': 'Matéria Prima',
      'Communication & Internet': 'Comunicação e Internet',
      Transport: 'Transporte',
      'Office Supplies': 'Material de Escritório',
      Other: 'Outro',
    };

    let receiptImageUrl: string | undefined;
    if (formExpenseReceiptFile) {
      setFormExpenseUploading(true);
      try {
        receiptImageUrl = await uploadReceiptImage(formExpenseReceiptFile, currentUserId);
      } catch {
        triggerToast('Upload Error', 'Erro de Upload', 'Failed to upload receipt image.', 'Falha ao enviar imagem do comprovativo.', 'error');
        setFormExpenseUploading(false);
        return;
      }
      setFormExpenseUploading(false);
    }

    const newExp = await db.createExpense({
      userId: currentUserId,
      merchant: formExpenseMerchant.trim(),
      category: formExpenseCategory,
      categoryPt: categoryPtMap[formExpenseCategory] ?? formExpenseCategory,
      amount: amt,
      expenseDate: formExpenseDate || new Date().toISOString().slice(0, 10),
      notes: formExpenseNotes.trim() || undefined,
      receiptImageUrl,
    });

    if (newExp) {
      setExpenses(prev => [newExp, ...prev]);
      setActiveModal(null);
      setFormExpenseMerchant('');
      setFormExpenseAmount('');
      setFormExpenseNotes('');
      setFormExpenseDate(new Date().toISOString().slice(0, 10));
      setFormExpenseReceiptFile(null);
      triggerToast(
        'Expense Dispatched',
        'Despesa Enviada',
        `Outlay tracking file ${newExp.ref} raised for authorization review.`,
        `Documento de despesa ${newExp.ref} enviado para validação administrativa.`,
        'success'
      );
    } else {
      triggerToast('Error', 'Erro', 'Failed to create expense.', 'Falha ao criar despesa.', 'error');
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formContactName.trim() || !formContactEmail.trim() || !formContactCompany.trim()) {
      triggerToast('Validation Error', 'Erro', 'Fill required columns.', 'Preencha os campos obrigatórios.', 'error');
      return;
    }
    if (!currentUserId) return;

    const newContact = await db.createContact({
      userId: currentUserId,
      name: formContactName.trim(),
      email: formContactEmail.trim(),
      phone: formContactPhone || '+258 84 000 0000',
      company: formContactCompany.trim(),
      role: formContactRole,
      rolePt: formContactRole,
      avatarColor: 'bg-indigo-600',
    });

    if (newContact) {
      setContacts(prev => [newContact, ...prev]);
      setActiveModal(null);
      setFormContactName('');
      setFormContactEmail('');
      setFormContactPhone('');
      setFormContactCompany('');
      triggerToast(
        'Contact Listed',
        'Contacto Adicionado',
        `Corporate directory record created for ${formContactName}.`,
        `Ficha corporativa de contacto criada para ${formContactName}.`,
        'success'
      );
    } else {
      triggerToast('Error', 'Erro', 'Failed to create contact.', 'Falha ao criar contacto.', 'error');
    }
  };

  const handleCreateDebtClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientName.trim()) {
      triggerToast('Erro de Validação', 'Erro de Validação', 'Nome do cliente obrigatório.', 'Nome do cliente obrigatório.', 'error');
      return;
    }
    if (!currentUserId) return;

    const newClient = await db.createDebtClient({
      userId: currentUserId,
      fullName: formClientName.trim(),
      movitelNumber: formClientMovitel.trim(),
      vodacomNumber: formClientVodacom.trim(),
      address: formClientAddress.trim(),
      status: formClientStatus,
    });

    if (newClient) {
      setDebtClients(prev => [newClient, ...prev]);
      setActiveModal(null);
      setFormClientName('');
      setFormClientMovitel('');
      setFormClientVodacom('');
      setFormClientAddress('');
      setFormClientStatus('Pendente');
      triggerToast(
        'Client Added',
        'Cliente Adicionado',
        `${newClient.fullName} added to pending clients list.`,
        `${newClient.fullName} adicionado à lista de clientes pendentes.`,
        'success'
      );
    } else {
      triggerToast('Error', 'Erro', 'Failed to add client.', 'Falha ao adicionar cliente.', 'error');
    }
  };

  const handleMarkClientLiquidado = async (id: string) => {
    const ok = await db.updateDebtClientStatus(id, 'Liquidado');
    if (ok) {
      setDebtClients(prev => prev.map(c => c.id === id ? { ...c, status: 'Liquidado' } : c));
      triggerToast(
        'Account Settled',
        'Conta Liquidada',
        'Client account marked as settled.',
        'Conta do cliente marcada como liquidada.',
        'success'
      );
    }
  };

  const handleDeleteDebtClient = async (id: string) => {
    const ok = await db.deleteDebtClient(id);
    if (ok) {
      setDebtClients(prev => prev.filter(c => c.id !== id));
      triggerToast('Removed', 'Removido', 'Client record deleted.', 'Registo de cliente eliminado.', 'info');
    }
  };

  // Form state – General Sale
  const [formSaleProductId, setFormSaleProductId] = useState('');
  const [formSaleProductName, setFormSaleProductName] = useState('');
  const [formSaleSku, setFormSaleSku] = useState('');
  const [formSaleQuantity, setFormSaleQuantity] = useState('1');
  const [formSaleUnitPrice, setFormSaleUnitPrice] = useState('');
  const [formSalePaymentMethod, setFormSalePaymentMethod] = useState<'Físico' | 'M-Pesa' | 'E-mola' | 'Banco'>('Físico');
  const [formSaleNotes, setFormSaleNotes] = useState('');
  const [formSaleDate, setFormSaleDate] = useState(() => new Date().toISOString().slice(0, 10));

  const handleCreateSale = guardedWrite('handleCreateSale', async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSaleProductName.trim() || !formSaleUnitPrice.trim()) {
      triggerToast('Erro', 'Erro', 'Preencha produto e preço.', 'Preencha produto e preço.', 'error');
      return;
    }
    const qty = parseInt(formSaleQuantity) || 1;
    const price = parseFloat(formSaleUnitPrice);
    if (isNaN(price) || price <= 0) return;
    if (!currentUserId) return;

    const newSale = await db.createGeneralSale({
      userId: currentUserId,
      productId: formSaleProductId || undefined,
      productName: formSaleProductName.trim(),
      sku: formSaleSku.trim(),
      quantity: qty,
      unitPrice: price,
      saleDate: formSaleDate || new Date().toISOString().slice(0, 10),
      paymentMethod: formSalePaymentMethod,
      notes: formSaleNotes.trim() || undefined,
    });

    if (newSale) {
      setGeneralSales(prev => [newSale, ...prev]);
      if (formSaleProductId) {
        await refreshAfterSave(async () => { setStockItems(await db.fetchStockItems(currentUserId)); });
      }
      setActiveModal(null);
      setFormSaleProductId('');
      setFormSaleProductName('');
      setFormSaleSku('');
      setFormSaleQuantity('1');
      setFormSaleUnitPrice('');
      setFormSalePaymentMethod('Físico');
      setFormSaleNotes('');
      setFormSaleDate(new Date().toISOString().slice(0, 10));
      triggerToast('Venda Registada', 'Venda Registada', 'Venda registada com sucesso.', 'Venda registada com sucesso.', 'success');
    } else {
      triggerToast('Sale failed', 'Venda não gravada', 'Check available stock and retry.', 'Verifique o stock disponível e tente novamente.', 'error');
    }
  });

  const handleDeleteSale = async (id: string) => {
    const ok = await db.deleteGeneralSale(id);
    if (ok) {
      setGeneralSales(prev => prev.filter(s => s.id !== id));
      triggerToast('Removido', 'Removido', 'Venda eliminada.', 'Venda eliminada.', 'info');
    }
  };

  const handleCreateReceiptManual = guardedWrite('handleCreateReceiptManual', async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formReceiptClient.trim() || !formReceiptAmount.trim()) {
      triggerToast('Validation Error', 'Erro de Validação', 'Fill required fields.', 'Preencha os campos obrigatórios.', 'error');
      return;
    }
    const amt = parseFloat(formReceiptAmount);
    if (isNaN(amt) || amt <= 0) return;
    if (!currentUserId) return;

    const methodPtMap: Record<string, string> = {
      'Bank Transfer': 'Transferência Bancária',
      'M-Pesa': 'M-Pesa',
      'E-Mola': 'E-Mola',
      'Cash': 'Dinheiro',
    };

    const newReceipt = await db.createReceipt({
      userId: currentUserId,
      invoiceRef: formReceiptInvoiceRef.trim() || '—',
      client: formReceiptClient.trim(),
      amount: amt,
      method: formReceiptMethod,
      methodPt: methodPtMap[formReceiptMethod] ?? formReceiptMethod,
      paymentDate: formReceiptDate,
      companyProfileId: formReceiptCompanyProfile,
      notes: formReceiptNotes.trim() || undefined,
    });

    if (newReceipt) {
      await refreshAfterSave(refreshPaymentData);

      setActiveModal(null);
      setFormReceiptClient('');
      setFormReceiptAmount('');
      setFormReceiptInvoiceRef('');
      setFormReceiptDate(new Date().toISOString().slice(0, 10));
      setFormReceiptMethod('Bank Transfer');
      setFormReceiptCompanyProfile('primary');
      setFormReceiptNotes('');
      triggerToast(
        'Receipt Issued',
        'Recibo Emitido',
        `Receipt ${newReceipt.receiptNumber} issued. Payment recorded.`,
        `Recibo ${newReceipt.receiptNumber} emitido. Pagamento registado.`,
        'success'
      );
    } else {
      triggerToast('Error', 'Erro', 'Failed to create receipt.', 'Falha ao criar recibo.', 'error');
    }
  });

  // PDF Report generation
  const handleTriggerReportGeneration = () => {
    setActiveModal('generate_report');
    setReportProgress(5);
    const interval = setInterval(() => {
      setReportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setActiveModal(null);
            // Generate the real PDF
            generateFinancialReportPDF(invoices, quotes, receipts, expenses, companySettings);
            triggerToast(
              'PDF Summary Exported',
              'Consolidação PDF Pronta',
              'Enterprise quarterly balance consolidated successfully. Local download triggered.',
              'Equilíbrio comercial consolidado exportado com sucesso. Verifique downloads.',
              'success'
            );
          }, 400);
          return 100;
        }
        return prev + 15;
      });
    }, 150);
  };

  // ─── Preloader / Loading Screen ───────────────────────────────────────────
  // Mostra enquanto loading OU 3.5s ainda não passaram — o que durar mais
  if (loading || showPreloader) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white dark:bg-slate-950 flex flex-col items-center justify-center gap-7">
        <img src={logoUrl} alt="Logo" className="w-28 h-28 object-contain select-none" />
        <p className="font-playfair text-slate-700 dark:text-slate-300 text-xl italic font-normal tracking-wide">
          Were growth finds space
        </p>
        <div className="flex items-end gap-2">
          {[0, 1, 2, 3].map(i => (
            <span
              key={i}
              className="dot-bounce block w-2 h-2 bg-secondary rounded-full"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ─── Auth Screen ────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <AuthView
        language={language}
        setLanguage={setLanguage}
        onLoginSuccess={() => {
          setIsAuthenticated(true);
          triggerToast(
            'Welcome Back',
            'Bem-vindo de volta',
            'Connection to enterprise workspace established securely.',
            'Central de trabalho local, disponível neste computador.',
            'success'
          );
        }}
      />
    );
  }

  // ─── Main App ──────────────────────────────────────────────────────────────
  if (dataError) return <div role="alert" className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
    <p>{dataError}</p>
    <button className="bg-primary text-white px-4 py-2 rounded" onClick={() => window.location.reload()}>
      {language === 'pt' ? 'Recarregar dados' : 'Reload data'}
    </button>
  </div>;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 font-sans antialiased text-slate-800 dark:text-slate-100 transition-colors">
      <div className="flex flex-col min-h-screen">

        {/* Top header */}
        <Header
          language={language}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onNewInvoice={() => setActiveModal('new_invoice')}
          onNewQuote={() => setActiveModal('new_proposal')}
          onNewReceipt={() => setActiveModal('new_receipt')}
          onGenerateReport={handleTriggerReportGeneration}
          onNewItem={() => setActiveModal('add_item')}
          activeTab={activeTab}
          userEmail={userEmail}
          userName={userName}
          onNavigateToSettings={() => navigateTo('settings')}
        />

        {/* Unified navigation bar */}
        <NavBar
          activeTab={activeTab}
          setActiveTab={navigateTo}
          language={language}
          setLanguage={setLanguage}
          onLogout={async () => {
            if (confirm(language === 'en' ? 'Are you sure you want to log out?' : 'Tem a certeza que deseja terminar sessão?')) {
              await localClient.auth.signOut();
              setIsAuthenticated(false);
              triggerToast(
                'Logged Out Successfully',
                'Sessão Encerrada com Sucesso',
                'Your session has been terminated securely.',
                'Sua sessão foi encerrada em segurança.',
                'info'
              );
            }
          }}
        />

        {/* UFSA: full-bleed webviewer — rendered outside padded main */}
        {activeTab === 'ufsa' && (
          <div className="flex flex-col flex-1 min-h-0">
            <UfsaView />
          </div>
        )}

        {/* Central main page container */}
        {activeTab !== 'ufsa' && (
        <main className="flex-1 px-3 py-4 sm:px-5 lg:px-6 text-left h-full">
            <div className="mx-auto w-full max-w-[1440px]">

            {activeTab === 'dashboard' && (
              <DashboardView
                transactions={transactions}
                stockItems={stockItems}
                invoices={invoices}
                generalSales={generalSales}
                language={language}
                currency={currency}
                onNavigate={navigateTo}
                onNewInvoice={() => setActiveModal('new_invoice')}
                onAddStock={() => setActiveModal('add_item')}
                onGenerateReport={handleTriggerReportGeneration}
                onNavigateToVendas={() => navigateTo('vendas')}
              />
            )}

            {activeTab === 'stock' && (
              <StockView
                stockItems={stockItems}
                setStockItems={setStockItems}
                language={language}
                currency={currency}
                userId={currentUserId}
                triggerToast={triggerToast}
                searchQuery={searchQuery}
                companySettings={companySettings}
                generalSales={generalSales}
              />
            )}

            {activeTab === 'invoices' && (
              <InvoicesView
                invoices={invoices}
                setInvoices={setInvoices}
                language={language}
                currency={currency}
                onNewInvoice={() => setActiveModal('new_invoice')}
                triggerToast={triggerToast}
                searchQuery={searchQuery}
                onMarkAsPaid={handleMarkAsPaid}
                companySettings={companySettings}
                createPanel={
                  <form onSubmit={handleCreateInvoice} className="p-4 space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{language === 'en' ? 'Client / Company' : 'Companhia / Cliente'}</label>
                      <input type="text" required value={formInvoiceClient} onChange={e => setFormInvoiceClient(e.target.value)} placeholder="TechSolutions S.A."
                        className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{language === 'en' ? 'NUIT (opt.)' : 'NUIT (opc.)'}</label>
                        <input type="text" value={formInvoiceClientNuit} onChange={e => setFormInvoiceClientNuit(e.target.value)} placeholder="400261845"
                          className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{language === 'en' ? 'Status' : 'Estado'}</label>
                        <select value={formInvoiceStatus} onChange={e => setFormInvoiceStatus(e.target.value as Invoice['status'])}
                          className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none cursor-pointer text-slate-900 dark:text-slate-100 font-semibold">
                          <option value="Pending">{language === 'en' ? 'Pending' : 'Pendente'}</option>
                          <option value="Paid">{language === 'en' ? 'Paid' : 'Pago'}</option>
                          <option value="Overdue">{language === 'en' ? 'Overdue' : 'Vencido'}</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{language === 'en' ? 'Phone' : 'Telefone'}</label>
                        <input type="tel" value={formInvoiceClientPhone} onChange={e => setFormInvoiceClientPhone(e.target.value)} placeholder="+258 84 000 0000"
                          className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email</label>
                        <input type="email" value={formInvoiceClientEmail} onChange={e => setFormInvoiceClientEmail(e.target.value)} placeholder="cliente@empresa.co.mz"
                          className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400" />
                      </div>
                    </div>
                    {companySettings.secondaryCompany && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{language === 'en' ? 'Issuing Company' : 'Empresa Emissora'}</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(['primary', 'secondary'] as const).map(p => (
                            <button key={p} type="button" onClick={() => setFormInvoiceCompanyProfile(p)}
                              className={`px-2 py-1.5 rounded border text-xs font-semibold truncate transition-all ${formInvoiceCompanyProfile === p ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
                              {p === 'primary' ? (companySettings.companyName || 'Principal') : (companySettings.secondaryCompany?.companyName || 'Secundária')}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{language === 'en' ? 'Description' : 'Descrição'}</label>
                      <textarea value={formInvoiceDescription} onChange={e => setFormInvoiceDescription(e.target.value)} rows={1} placeholder={language === 'en' ? 'Service or product...' : 'Serviço ou produto...'}
                        className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100 resize-none placeholder:text-slate-400" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Line Items' : 'Itens'}</label>
                        <button type="button" onClick={addInvoiceItem} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5">
                          <Plus size={10} />Add
                        </button>
                      </div>
                      <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <table className="w-full text-[10px]">
                          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="text-left px-2 py-1 font-bold text-slate-500 uppercase">{language === 'en' ? 'Desc' : 'Desc'}</th>
                              <th className="text-center px-1 py-1 font-bold text-slate-500 uppercase w-10">Qty</th>
                              <th className="text-right px-1 py-1 font-bold text-slate-500 uppercase w-16">{language === 'en' ? 'Price' : 'Preço'}</th>
                              <th className="text-right px-1 py-1 font-bold text-slate-500 uppercase w-14">Total</th>
                              <th className="w-5"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {formInvoiceItems.map((it, idx) => (
                              <tr key={idx}>
                                <td className="px-2 py-1"><input type="text" value={it.description} onChange={e => updateInvoiceItem(idx, 'description', e.target.value)} placeholder="Item" className="w-full bg-transparent outline-none text-slate-900 dark:text-slate-100 text-[10px]" /></td>
                                <td className="px-1 py-1"><input type="number" min="0" step="any" value={it.quantity} onChange={e => updateInvoiceItem(idx, 'quantity', parseFloat(e.target.value) || 0)} className="w-full bg-transparent outline-none text-slate-900 dark:text-slate-100 text-[10px] text-center" /></td>
                                <td className="px-1 py-1"><input type="number" min="0" step="any" value={it.unitPrice} onChange={e => updateInvoiceItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} className="w-full bg-transparent outline-none text-slate-900 dark:text-slate-100 text-[10px] text-right" /></td>
                                <td className="px-1 py-1 text-right font-mono text-slate-700 dark:text-slate-300">{formatValue(it.quantity * it.unitPrice, 'MZN')}</td>
                                <td className="px-1 py-1 text-center"><button type="button" onClick={() => removeInvoiceItem(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={10} /></button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 mt-1 text-[10px]">
                        <div className="flex gap-3"><span className="text-slate-500">Subtotal:</span><span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatValue(calcInvoiceSubtotal(), 'MZN')}</span></div>
                        <div className="flex gap-3"><span className="text-slate-500">ISPC (3%):</span><span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatValue(calcInvoiceSubtotal() * 0.03, 'MZN')}</span></div>
                        <div className="flex gap-3 border-t border-slate-200 dark:border-slate-700 pt-0.5"><span className="font-bold text-slate-700 dark:text-slate-300">Total:</span><span className="font-mono font-black text-red-600">{formatValue(calcInvoiceSubtotal() * 1.03, 'MZN')}</span></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{language === 'en' ? 'Due Date (opt.)' : 'Vencimento (opc.)'}</label>
                        <input type="date" value={formInvoiceDueDate} onChange={e => setFormInvoiceDueDate(e.target.value)}
                          className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{language === 'en' ? 'Notes (opt.)' : 'Observações (opc.)'}</label>
                        <textarea value={formInvoiceNotes} onChange={e => setFormInvoiceNotes(e.target.value)} rows={1}
                          placeholder={language === 'en' ? 'Payment terms...' : 'Condições de pagamento...'}
                          className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100 resize-none placeholder:text-slate-400" />
                      </div>
                    </div>
                    <button type="submit" className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer">
                      {language === 'en' ? 'Create Invoice' : 'Criar Factura'}
                    </button>
                  </form>
                }
              />
            )}

            {activeTab === 'quotes' && (
              <QuotesView
                quotes={quotes}
                setQuotes={setQuotes}
                language={language}
                currency={currency}
                onNewQuote={() => setActiveModal('new_proposal')}
                triggerToast={triggerToast}
                searchQuery={searchQuery}
                onApproveQuote={handleApproveQuote}
                companySettings={companySettings}
                createPanel={
                  <form onSubmit={handleCreateQuote} className="p-4 space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{language === 'en' ? 'Client / Company' : 'Cliente / Empresa'}</label>
                      <input type="text" required value={formQuoteClient} onChange={e => setFormQuoteClient(e.target.value)} placeholder="Electricidade de Moçambique S.A."
                        className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{language === 'en' ? 'NUIT (optional)' : 'NUIT (opcional)'}</label>
                      <input type="text" value={formQuoteClientNuit} onChange={e => setFormQuoteClientNuit(e.target.value)} placeholder="400261845"
                        className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{language === 'en' ? 'Phone' : 'Telefone'}</label>
                        <input type="tel" value={formQuoteClientPhone} onChange={e => setFormQuoteClientPhone(e.target.value)} placeholder="+258 84 000 0000"
                          className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email</label>
                        <input type="email" value={formQuoteClientEmail} onChange={e => setFormQuoteClientEmail(e.target.value)} placeholder="cliente@empresa.co.mz"
                          className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400" />
                      </div>
                    </div>
                    {companySettings.secondaryCompany && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{language === 'en' ? 'Issuing Company' : 'Empresa Emissora'}</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(['primary', 'secondary'] as const).map(p => (
                            <button key={p} type="button" onClick={() => setFormQuoteCompanyProfile(p)}
                              className={`px-2 py-1.5 rounded border text-xs font-semibold truncate transition-all ${formQuoteCompanyProfile === p ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
                              {p === 'primary' ? (companySettings.companyName || 'Principal') : (companySettings.secondaryCompany?.companyName || 'Secundária')}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Line Items' : 'Itens'}</label>
                        <button type="button" onClick={addQuoteItem} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5">
                          <Plus size={10} />Add
                        </button>
                      </div>
                      <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <table className="w-full text-[10px]">
                          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="text-left px-2 py-1 font-bold text-slate-500 uppercase">{language === 'en' ? 'Desc' : 'Desc'}</th>
                              <th className="text-center px-1 py-1 font-bold text-slate-500 uppercase w-10">Qty</th>
                              <th className="text-right px-1 py-1 font-bold text-slate-500 uppercase w-16">{language === 'en' ? 'Price' : 'Preço'}</th>
                              <th className="text-right px-1 py-1 font-bold text-slate-500 uppercase w-14">Total</th>
                              <th className="w-5"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {formQuoteItems.map((it, idx) => (
                              <tr key={idx}>
                                <td className="px-2 py-1"><input type="text" value={it.description} onChange={e => updateQuoteItem(idx, 'description', e.target.value)} placeholder="Item" className="w-full bg-transparent outline-none text-slate-900 dark:text-slate-100 text-[10px]" /></td>
                                <td className="px-1 py-1"><input type="number" min="0" step="any" value={it.quantity} onChange={e => updateQuoteItem(idx, 'quantity', parseFloat(e.target.value) || 0)} className="w-full bg-transparent outline-none text-slate-900 dark:text-slate-100 text-[10px] text-center" /></td>
                                <td className="px-1 py-1"><input type="number" min="0" step="any" value={it.unitPrice} onChange={e => updateQuoteItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} className="w-full bg-transparent outline-none text-slate-900 dark:text-slate-100 text-[10px] text-right" /></td>
                                <td className="px-1 py-1 text-right font-mono text-slate-700 dark:text-slate-300">{formatValue(it.quantity * it.unitPrice, 'MZN')}</td>
                                <td className="px-1 py-1 text-center"><button type="button" onClick={() => removeQuoteItem(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={10} /></button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 mt-1 text-[10px]">
                        <div className="flex gap-3"><span className="text-slate-500">Subtotal:</span><span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatValue(calcQuoteSubtotal(), 'MZN')}</span></div>
                        <div className="flex gap-3"><span className="text-slate-500">ISPC (3%):</span><span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatValue(calcQuoteSubtotal() * 0.03, 'MZN')}</span></div>
                        <div className="flex gap-3 border-t border-slate-200 dark:border-slate-700 pt-0.5"><span className="font-bold text-slate-700 dark:text-slate-300">Total:</span><span className="font-mono font-black text-amber-700">{formatValue(calcQuoteSubtotal() * 1.03, 'MZN')}</span></div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{language === 'en' ? 'Validity (days)' : 'Validade (dias)'}</label>
                      <input type="number" min="1" value={formQuoteValidity} onChange={e => setFormQuoteValidity(e.target.value)} placeholder="15"
                        className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{language === 'en' ? 'Notes (opt.)' : 'Observações (opc.)'}</label>
                      <textarea value={formQuoteNotes} onChange={e => setFormQuoteNotes(e.target.value)} rows={2}
                        placeholder={language === 'en' ? 'Terms, conditions...' : 'Condições, observações...'}
                        className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100 resize-none placeholder:text-slate-400" />
                    </div>
                    <button type="submit" className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer">
                      {language === 'en' ? 'Create Proposal' : 'Gerar Proposta'}
                    </button>
                  </form>
                }
              />
            )}

            {activeTab === 'receipts' && (
              <ReceiptsView
                receipts={receipts}
                setReceipts={setReceipts}
                quotes={quotes}
                language={language}
                currency={currency}
                searchQuery={searchQuery}
                companySettings={companySettings}
                createPanel={
                  <form onSubmit={handleCreateReceiptManual} className="p-4 space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{language === 'en' ? 'Invoice Reference' : 'Referência da Factura'}</label>
                      <select value={formReceiptInvoiceRef} onChange={e => {
                        const val = e.target.value;
                        setFormReceiptInvoiceRef(val);
                        if (val) {
                          const inv = invoices.find(i => i.invoiceNumber === val);
                          if (inv) { setFormReceiptClient(inv.client); setFormReceiptAmount(String(inv.amount)); if (inv.companyProfileId) setFormReceiptCompanyProfile(inv.companyProfileId); }
                        } else { setFormReceiptClient(''); setFormReceiptAmount(''); }
                      }} className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none text-slate-900 dark:text-slate-100 font-semibold cursor-pointer">
                        <option value="">{language === 'en' ? '— Pending invoice —' : '— Factura pendente —'}</option>
                        {invoices.filter(i => i.status !== 'Paid').map(i => (
                          <option key={i.id} value={i.invoiceNumber}>{i.invoiceNumber} · {i.client}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400 mt-0.5">{language === 'en' ? 'Selecting auto-fills client and amount.' : 'Selecionar preenche cliente e valor.'}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                        {language === 'en' ? 'Client *' : 'Cliente *'}
                        {formReceiptClient && formReceiptInvoiceRef && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded">{language === 'en' ? 'auto' : 'auto'}</span>}
                      </label>
                      <input type="text" required value={formReceiptClient} onChange={e => setFormReceiptClient(e.target.value)} placeholder="TechSolutions S.A."
                        className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-emerald-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                          {language === 'en' ? 'Amount *' : 'Valor *'}
                          {formReceiptAmount && formReceiptInvoiceRef && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded">auto</span>}
                        </label>
                        <input type="number" required min="0.01" step="any" value={formReceiptAmount} onChange={e => setFormReceiptAmount(e.target.value)} placeholder="85000.00"
                          className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-emerald-500 text-slate-900 dark:text-slate-100" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{language === 'en' ? 'Date' : 'Data'}</label>
                        <input type="date" value={formReceiptDate} onChange={e => setFormReceiptDate(e.target.value)}
                          className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-emerald-500 text-slate-900 dark:text-slate-100" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{language === 'en' ? 'Payment Method' : 'Método de Pagamento'}</label>
                      <select value={formReceiptMethod} onChange={e => setFormReceiptMethod(e.target.value)}
                        className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none cursor-pointer text-slate-900 dark:text-slate-100 font-semibold">
                        <option value="Bank Transfer">{language === 'en' ? 'Bank Transfer' : 'Transferência Bancária'}</option>
                        <option value="M-Pesa">M-Pesa</option>
                        <option value="E-Mola">E-Mola</option>
                        <option value="Cash">{language === 'en' ? 'Cash' : 'Numerário'}</option>
                      </select>
                    </div>
                    {companySettings.secondaryCompany && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{language === 'en' ? 'Issuing Company' : 'Empresa Emissora'}</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(['primary', 'secondary'] as const).map(p => (
                            <button key={p} type="button" onClick={() => setFormReceiptCompanyProfile(p)}
                              className={`px-2 py-1.5 rounded border text-xs font-semibold truncate transition-all ${formReceiptCompanyProfile === p ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
                              {p === 'primary' ? (companySettings.companyName || 'Principal') : (companySettings.secondaryCompany?.companyName || 'Secundária')}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{language === 'en' ? 'Notes (opt.)' : 'Observações (opc.)'}</label>
                      <textarea value={formReceiptNotes} onChange={e => setFormReceiptNotes(e.target.value)} rows={2}
                        placeholder={language === 'en' ? 'Payment notes...' : 'Notas de pagamento...'}
                        className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-emerald-500 text-slate-900 dark:text-slate-100 resize-none placeholder:text-slate-400" />
                    </div>
                    <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer">
                      {language === 'en' ? 'Issue Receipt' : 'Emitir Recibo'}
                    </button>
                  </form>
                }
              />
            )}

            {activeTab === 'expenses' && (
              <ExpensesView
                expenses={expenses}
                setExpenses={setExpenses}
                language={language}
                currency={currency}
                onNewExpense={() => setActiveModal('file_expense')}
                triggerToast={triggerToast}
                searchQuery={searchQuery}
                onDeleteExpense={handleDeleteExpense}
              />
            )}

            {activeTab === 'contacts' && (
              <ContactsView
                contacts={contacts}
                setContacts={setContacts}
                language={language}
                onNewContact={() => setActiveModal('new_contact')}
                searchQuery={searchQuery}
              />
            )}

            {activeTab === 'clientes' && (
              <ClientesView
                clients={debtClients}
                setClients={setDebtClients}
                language={language}
                onNewClient={() => setActiveModal('new_debt_client')}
                onMarkLiquidado={handleMarkClientLiquidado}
                onDeleteClient={handleDeleteDebtClient}
                searchQuery={searchQuery}
              />
            )}

            {activeTab === 'vendas' && (
              <VendasView
                sales={generalSales}
                stockItems={stockItems}
                language={language}
                currency={currency}
                companySettings={companySettings}
                onNewSale={() => setActiveModal('new_sale')}
                onDeleteSale={handleDeleteSale}
                searchQuery={searchQuery}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                invoices={invoices}
                quotes={quotes}
                receipts={receipts}
                expenses={expenses}
                generalSales={generalSales}
                language={language}
                companySettings={companySettings}
              />
            )}

            {activeTab === 'settings' && companySettings.setupComplete && (
              <SettingsView
                language={language}
                settings={companySettings}
                onSave={handleSaveSettings}
                onComplete={() => {}}
                isFirstSetup={false}
                onGenerateModel={handleGenerateModel}
                userId={currentUserId ?? undefined}
                darkMode={darkMode}
                onToggleDarkMode={() => setDarkMode(prev => !prev)}
                onDeleteSecondaryCompany={handleDeleteSecondaryCompany}
              />
            )}

            {activeTab === 'support' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 space-y-6 max-w-4xl text-left">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Database size={18} className="text-blue-600" />
                    <span>{language === 'en' ? 'REST Desktop Support' : 'Suporte REST Desktop'}</span>
                  </h3>
                  <p className="text-xs text-slate-450 mt-1">
                    {language === 'en' ? 'Direct secure feedback loops and dynamic ERP credentials.' : 'Configurações de rede e canais de comunicação corporativos.'}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-lg">
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      {language === 'en' ? 'Local database' : 'Base de dados local'}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {language === 'en'
                        ? 'Your data is saved on this computer. Use backups to transfer or recover your information.'
                        : 'Os dados são guardados neste computador. Utilize cópias de segurança para transferir ou recuperar a sua informação.'
                      }
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-lg">
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      {language === 'en' ? 'How does language and currency scaling work?' : 'Como funciona a mudança de moedas e do idioma?'}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {language === 'en'
                        ? 'Double local state translation models provide instantaneous switching. Use Alt+L or the Sidebar buttons. Currency toggle calculates exchange ratios automatically (1 USD = 63.50 MZN).'
                        : 'A tradução ocorre instantaneamente no navegador. Use Alt+L ou mude na barra lateral. A conversão aplica rácios automáticos para Meticais (1 USD = 63.50 MZN).'
                      }
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 flex gap-3 p-4 border border-slate-200 dark:border-slate-800 rounded-lg">
                    <Mail className="text-blue-500 flex-shrink-0" size={16} />
                    <div>
                      <h5 className="font-extrabold text-[11px] text-slate-700 dark:text-slate-200 uppercase tracking-widest">IT Systems Support</h5>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">support@invstock.com</p>
                    </div>
                  </div>

                  <div className="flex-1 flex gap-3 p-4 border border-slate-200 dark:border-slate-800 rounded-lg">
                    <Phone className="text-emerald-500 flex-shrink-0" size={16} />
                    <div>
                      <h5 className="font-extrabold text-[11px] text-slate-700 dark:text-slate-200 uppercase tracking-widest">Corporate Hotline</h5>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">+258 21 000 112</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            </div>
          </main>
        )}
        </div>

      {/* FIRST-SETUP WIZARD — rendered outside all tab/layout containers */}
      {isAuthenticated && !loading && !companySettings.setupComplete && (
        <SettingsView
          language={language}
          settings={companySettings}
          onSave={handleSaveSettings}
          onComplete={() => {
            setCompanySettings(prev => ({ ...prev, setupComplete: true }));
            localStorage.setItem('invstock_setup', 'true');
          }}
          isFirstSetup={true}
          onGenerateModel={handleGenerateModel}
          userId={currentUserId ?? undefined}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(prev => !prev)}
        />
      )}

      {/* DISMISSABLE FLOATING TOASTS */}
      <div className="fixed bottom-6 left-16 z-50 space-y-3 pointer-events-none w-full max-w-[24rem]">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl p-4 shadow-2xl flex gap-3.5 items-start animation-slide-in w-full"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              toast.type === 'success'
                ? 'bg-emerald-100 text-emerald-800'
                : toast.type === 'error'
                ? 'bg-red-100 text-red-800'
                : 'bg-blue-100 text-blue-800'
            }`}>
              {toast.type === 'success' ? <Check size={16} /> : <Info size={16} />}
            </div>

            <div className="flex-1 text-left">
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                {language === 'en' ? toast.title : toast.titlePt}
              </h4>
              <p className="text-[10px] text-slate-450 mt-1 font-medium leading-relaxed">
                {language === 'en' ? toast.description : toast.descriptionPt}
              </p>
            </div>

            <button
              onClick={() => handleDismissToast(toast.id)}
              className="text-slate-400 hover:text-slate-705 p-0.5 rounded-full hover:bg-slate-100 inline-block cursor-pointer flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* MODAL DIALOGS */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">

          <div className="modal-content bg-white dark:bg-slate-955 w-full sm:w-[560px] max-w-[38rem] rounded-2xl border border-slate-300 dark:border-slate-900 shadow-2xl max-h-[90vh] flex flex-col animation-scale-up text-left">

            {/* Modal Title bar */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-900 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/40">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {activeModal === 'new_invoice' && (language === 'en' ? 'Create New Invoice Ledger' : 'Registar Nova Factura')}
                {activeModal === 'add_item' && (language === 'en' ? 'Add Inventory Item' : 'Catalogar Novo Item')}
                {activeModal === 'new_proposal' && (language === 'en' ? 'Launch Price Simulation' : 'Criar Proposta de Orçamento')}
                {activeModal === 'file_expense' && (language === 'en' ? 'Document Operational Outlay' : 'Registar Despesa Comercial')}
                {activeModal === 'new_contact' && (language === 'en' ? 'Register New Business Contact' : 'Adicionar Contacto a Directório')}
                {activeModal === 'generate_report' && (language === 'en' ? 'Consolidating Financial Aggregates' : 'Consolidando Relatórios Globais')}
                {activeModal === 'new_debt_client' && (language === 'en' ? 'Add Pending Client' : 'Adicionar Cliente Pendente')}
                {activeModal === 'new_receipt' && (language === 'en' ? 'Issue New Receipt' : 'Emitir Novo Recibo')}
                {activeModal === 'new_sale' && (language === 'en' ? 'Register General Sale' : 'Registar Venda Avulsa')}
              </h3>

              {activeModal !== 'generate_report' && (
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-full text-slate-400 cursor-pointer"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Modal Scroll body */}
            <div className="p-6 overflow-y-auto">

              {/* A. Create Invoice Form */}
              {activeModal === 'new_invoice' && (
                <form onSubmit={handleCreateInvoice} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Paying Client Company Name' : 'Companhia / Cliente'}</label>
                    <input
                      type="text"
                      required
                      value={formInvoiceClient}
                      onChange={(e) => setFormInvoiceClient(e.target.value)}
                      placeholder="TechSolutions S.A."
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Client NUIT (optional)' : 'NUIT do Cliente (opcional)'}</label>
                    <input
                      type="text"
                      value={formInvoiceClientNuit}
                      onChange={(e) => setFormInvoiceClientNuit(e.target.value)}
                      placeholder="400261845"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Client Phone (optional)' : 'Telefone do Cliente (opcional)'}</label>
                      <input
                        type="tel"
                        value={formInvoiceClientPhone}
                        onChange={(e) => setFormInvoiceClientPhone(e.target.value)}
                        placeholder="+258 84 000 0000"
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Client Email (optional)' : 'Email do Cliente (opcional)'}</label>
                      <input
                        type="email"
                        value={formInvoiceClientEmail}
                        onChange={(e) => setFormInvoiceClientEmail(e.target.value)}
                        placeholder="cliente@empresa.co.mz"
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Initial Billing Status' : 'Estado de Liquidação'}</label>
                    <select
                      value={formInvoiceStatus}
                      onChange={(e) => setFormInvoiceStatus(e.target.value as Invoice['status'])}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none cursor-pointer text-slate-900 dark:text-slate-100 font-semibold"
                    >
                      <option value="Pending">{language === 'en' ? 'Pending settlement' : 'Pendente'}</option>
                      <option value="Paid">{language === 'en' ? 'Paid completely' : 'Pago'}</option>
                      <option value="Overdue">{language === 'en' ? 'Overdue debt' : 'Vencido'}</option>
                    </select>
                  </div>

                  {/* Company selector — only when secondary company exists */}
                  {companySettings.secondaryCompany && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Issuing Company' : 'Empresa Emissora'}</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setFormInvoiceCompanyProfile('primary')}
                          className={`p-2.5 rounded-lg border text-xs font-semibold transition-all truncate ${
                            formInvoiceCompanyProfile === 'primary'
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-400'
                          }`}>
                          {companySettings.companyName || (language === 'en' ? 'Primary' : 'Principal')}
                        </button>
                        <button type="button" onClick={() => setFormInvoiceCompanyProfile('secondary')}
                          className={`p-2.5 rounded-lg border text-xs font-semibold transition-all truncate ${
                            formInvoiceCompanyProfile === 'secondary'
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-400'
                          }`}>
                          {companySettings.secondaryCompany.companyName || (language === 'en' ? 'Secondary' : 'Secundária')}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Service / Product Description' : 'Descrição do Serviço / Produto'}</label>
                    <textarea
                      value={formInvoiceDescription}
                      onChange={(e) => setFormInvoiceDescription(e.target.value)}
                      placeholder={language === 'en' ? 'Describe the service or product...' : 'Descreva o serviço ou produto...'}
                      rows={2}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100 resize-none"
                    />
                  </div>

                  {/* Line items */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Line Items' : 'Itens da Factura'}</label>
                      <button type="button" onClick={addInvoiceItem} className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800">
                        <Plus size={11} />
                        {language === 'en' ? 'Add Item' : 'Adicionar Item'}
                      </button>
                    </div>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-[10px]">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left px-2 py-1.5 font-bold text-slate-500 uppercase tracking-wider">{language === 'en' ? 'Description' : 'Descrição'}</th>
                            <th className="text-center px-2 py-1.5 font-bold text-slate-500 uppercase tracking-wider w-14">{language === 'en' ? 'Qty' : 'Qtd'}</th>
                            <th className="text-right px-2 py-1.5 font-bold text-slate-500 uppercase tracking-wider w-24">{language === 'en' ? 'Unit Price' : 'Preço Unit.'}</th>
                            <th className="text-right px-2 py-1.5 font-bold text-slate-500 uppercase tracking-wider w-20">Total</th>
                            <th className="w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {formInvoiceItems.map((it, idx) => (
                            <tr key={idx}>
                              <td className="px-2 py-1">
                                <input
                                  type="text"
                                  value={it.description}
                                  onChange={e => updateInvoiceItem(idx, 'description', e.target.value)}
                                  placeholder={language === 'en' ? 'Item description' : 'Descrição do item'}
                                  className="w-full bg-transparent outline-none text-slate-900 text-[11px]"
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={it.quantity}
                                  onChange={e => updateInvoiceItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                  className="w-full bg-transparent outline-none text-slate-900 text-[11px] text-center"
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={it.unitPrice}
                                  onChange={e => updateInvoiceItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                  className="w-full bg-transparent outline-none text-slate-900 text-[11px] text-right"
                                />
                              </td>
                              <td className="px-2 py-1 text-right font-mono text-slate-700 text-[11px]">
                                {formatValue(it.quantity * it.unitPrice, 'MZN')}
                              </td>
                              <td className="px-1 py-1 text-center">
                                <button type="button" onClick={() => removeInvoiceItem(idx)} className="text-red-400 hover:text-red-600">
                                  <Trash2 size={11} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Totals summary */}
                    <div className="flex flex-col items-end gap-0.5 text-[11px]">
                      <div className="flex gap-4">
                        <span className="text-slate-500">{language === 'en' ? 'Subtotal:' : 'Subtotal:'}</span>
                        <span className="font-mono font-bold text-slate-800">{formatValue(calcInvoiceSubtotal(), 'MZN')}</span>
                      </div>
                      <div className="flex gap-4">
                        <span className="text-slate-500">ISPC (3%):</span>
                        <span className="font-mono font-bold text-slate-800">{formatValue(calcInvoiceSubtotal() * 0.03, 'MZN')}</span>
                      </div>
                      <div className="flex gap-4 border-t border-slate-200 pt-0.5">
                        <span className="font-bold text-slate-700">Total:</span>
                        <span className="font-mono font-black text-red-600">{formatValue(calcInvoiceSubtotal() * 1.03, 'MZN')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Due Date (optional)' : 'Data de Vencimento (opcional)'}</label>
                    <input
                      type="date"
                      value={formInvoiceDueDate}
                      onChange={(e) => setFormInvoiceDueDate(e.target.value)}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Document Notes (optional)' : 'Observações do Documento (opcional)'}</label>
                    <textarea
                      value={formInvoiceNotes}
                      onChange={(e) => setFormInvoiceNotes(e.target.value)}
                      rows={2}
                      placeholder={language === 'en' ? 'Payment terms, special conditions...' : 'Condições de pagamento, observações especiais...'}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100 resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-500 font-semibold text-xs rounded-lg transition-all cursor-pointer"
                    >
                      {language === 'en' ? 'Cancel' : 'Cancelar'}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer"
                    >
                      {language === 'en' ? 'Save Invoice' : 'Confirmar Factura'}
                    </button>
                  </div>
                </form>
              )}

              {/* B. Add Stock Item Form */}
              {activeModal === 'add_item' && (
                <form onSubmit={handleCreateStockItem} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Product Name' : 'Nome do Produto'}</label>
                      <input
                        type="text"
                        required
                        value={formStockName}
                        onChange={(e) => setFormStockName(e.target.value)}
                        placeholder="Intel Core Ultra Processor"
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SKU</label>
                      <input
                        type="text"
                        required
                        value={formStockSku}
                        onChange={(e) => setFormStockSku(e.target.value)}
                        placeholder="PRC-44W-XT"
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Category' : 'Categoria'}</label>
                    <select
                      value={formStockCategory}
                      onChange={(e) => setFormStockCategory(e.target.value)}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none cursor-pointer text-slate-900 dark:text-slate-100 font-semibold"
                    >
                      <option value="Hardware">{language === 'en' ? 'Hardware' : 'Hardware Componentes'}</option>
                      <option value="Accessories">{language === 'en' ? 'Accessories' : 'Acessórios'}</option>
                      <option value="Structural">{language === 'en' ? 'Structural' : 'Estrutural'}</option>
                      <option value="Infrastructure">{language === 'en' ? 'Infrastructure' : 'Infraestrutura'}</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Unit Price' : 'Preço Unitário'}</label>
                      <input
                        type="number"
                        required
                        step="any"
                        value={formStockPrice}
                        onChange={(e) => setFormStockPrice(e.target.value)}
                        placeholder="145.00"
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-lg text-slate-955 dark:text-slate-200"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Stock level' : 'Qnt Stock'}</label>
                      <input
                        type="number"
                        required
                        value={formStockLevel}
                        onChange={(e) => setFormStockLevel(e.target.value)}
                        placeholder="15"
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-lg text-slate-955 dark:text-slate-200"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Limit Max' : 'Limite Máx'}</label>
                      <input
                        type="number"
                        required
                        value={formStockMax}
                        onChange={(e) => setFormStockMax(e.target.value)}
                        placeholder="200"
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-lg text-slate-955 dark:text-slate-200"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-900">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-855 text-slate-500 font-semibold text-xs rounded-lg transition-all cursor-pointer"
                    >
                      {language === 'en' ? 'Cancel' : 'Cancelar'}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer"
                    >
                      {language === 'en' ? 'Add Item' : 'Criar Item'}
                    </button>
                  </div>
                </form>
              )}

              {/* C. New Proposal (Quote) Form */}
              {activeModal === 'new_proposal' && (
                <form onSubmit={handleCreateQuote} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Target Company / Client' : 'Cliente'}</label>
                    <input
                      type="text"
                      required
                      value={formQuoteClient}
                      onChange={(e) => setFormQuoteClient(e.target.value)}
                      placeholder="Electricidade de Moçambique S.A."
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-lg text-slate-955 dark:text-slate-200"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Client NUIT (optional)' : 'NUIT do Cliente (opcional)'}</label>
                    <input
                      type="text"
                      value={formQuoteClientNuit}
                      onChange={(e) => setFormQuoteClientNuit(e.target.value)}
                      placeholder="400261845"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-lg text-slate-955 dark:text-slate-200"
                    />
                  </div>

                  {/* Company selector — only when secondary company exists */}
                  {companySettings.secondaryCompany && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Issuing Company' : 'Empresa Emissora'}</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setFormQuoteCompanyProfile('primary')}
                          className={`p-2.5 rounded-lg border text-xs font-semibold transition-all truncate ${
                            formQuoteCompanyProfile === 'primary'
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-400'
                          }`}>
                          {companySettings.companyName || (language === 'en' ? 'Primary' : 'Principal')}
                        </button>
                        <button type="button" onClick={() => setFormQuoteCompanyProfile('secondary')}
                          className={`p-2.5 rounded-lg border text-xs font-semibold transition-all truncate ${
                            formQuoteCompanyProfile === 'secondary'
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-400'
                          }`}>
                          {companySettings.secondaryCompany.companyName || (language === 'en' ? 'Secondary' : 'Secundária')}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Client Phone (optional)' : 'Telefone do Cliente (opcional)'}</label>
                      <input
                        type="tel"
                        value={formQuoteClientPhone}
                        onChange={(e) => setFormQuoteClientPhone(e.target.value)}
                        placeholder="+258 84 000 0000"
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-lg text-slate-955 dark:text-slate-200"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Client Email (optional)' : 'Email do Cliente (opcional)'}</label>
                      <input
                        type="email"
                        value={formQuoteClientEmail}
                        onChange={(e) => setFormQuoteClientEmail(e.target.value)}
                        placeholder="cliente@empresa.co.mz"
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-lg text-slate-955 dark:text-slate-200"
                      />
                    </div>
                  </div>

                  {/* Line items */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Line Items' : 'Itens da Proposta'}</label>
                      <button type="button" onClick={addQuoteItem} className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800">
                        <Plus size={11} />
                        {language === 'en' ? 'Add Item' : 'Adicionar Item'}
                      </button>
                    </div>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-[10px]">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left px-2 py-1.5 font-bold text-slate-500 uppercase tracking-wider">{language === 'en' ? 'Description' : 'Descrição'}</th>
                            <th className="text-center px-2 py-1.5 font-bold text-slate-500 uppercase tracking-wider w-14">{language === 'en' ? 'Qty' : 'Qtd'}</th>
                            <th className="text-right px-2 py-1.5 font-bold text-slate-500 uppercase tracking-wider w-24">{language === 'en' ? 'Unit Price' : 'Preço Unit.'}</th>
                            <th className="text-right px-2 py-1.5 font-bold text-slate-500 uppercase tracking-wider w-20">Total</th>
                            <th className="w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {formQuoteItems.map((it, idx) => (
                            <tr key={idx}>
                              <td className="px-2 py-1">
                                <input
                                  type="text"
                                  value={it.description}
                                  onChange={e => updateQuoteItem(idx, 'description', e.target.value)}
                                  placeholder={language === 'en' ? 'Item description' : 'Descrição do item'}
                                  className="w-full bg-transparent outline-none text-slate-900 text-[11px]"
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={it.quantity}
                                  onChange={e => updateQuoteItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                  className="w-full bg-transparent outline-none text-slate-900 text-[11px] text-center"
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={it.unitPrice}
                                  onChange={e => updateQuoteItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                  className="w-full bg-transparent outline-none text-slate-900 text-[11px] text-right"
                                />
                              </td>
                              <td className="px-2 py-1 text-right font-mono text-slate-700 text-[11px]">
                                {formatValue(it.quantity * it.unitPrice, 'MZN')}
                              </td>
                              <td className="px-1 py-1 text-center">
                                <button type="button" onClick={() => removeQuoteItem(idx)} className="text-red-400 hover:text-red-600">
                                  <Trash2 size={11} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Totals summary */}
                    <div className="flex flex-col items-end gap-0.5 text-[11px]">
                      <div className="flex gap-4">
                        <span className="text-slate-500">{language === 'en' ? 'Subtotal:' : 'Subtotal:'}</span>
                        <span className="font-mono font-bold text-slate-800">{formatValue(calcQuoteSubtotal(), 'MZN')}</span>
                      </div>
                      <div className="flex gap-4">
                        <span className="text-slate-500">ISPC (3%):</span>
                        <span className="font-mono font-bold text-slate-800">{formatValue(calcQuoteSubtotal() * 0.03, 'MZN')}</span>
                      </div>
                      <div className="flex gap-4 border-t border-slate-200 pt-0.5">
                        <span className="font-bold text-slate-700">Total:</span>
                        <span className="font-mono font-black text-amber-700">{formatValue(calcQuoteSubtotal() * 1.03, 'MZN')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Validity (days)' : 'Validade (dias)'}</label>
                    <input
                      type="number"
                      min="1"
                      value={formQuoteValidity}
                      onChange={(e) => setFormQuoteValidity(e.target.value)}
                      placeholder="15"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-lg text-slate-955 dark:text-slate-200"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Document Notes (optional)' : 'Observações do Documento (opcional)'}</label>
                    <textarea
                      value={formQuoteNotes}
                      onChange={(e) => setFormQuoteNotes(e.target.value)}
                      rows={2}
                      placeholder={language === 'en' ? 'Terms, special conditions, notes...' : 'Condições, observações especiais...'}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-lg text-slate-955 dark:text-slate-200 resize-none outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 hover:bg-slate-100 text-slate-500 font-semibold text-xs"
                    >
                      {language === 'en' ? 'Cancel' : 'Cancelar'}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg"
                    >
                      {language === 'en' ? 'Create Proposal' : 'Gerar Proposta'}
                    </button>
                  </div>
                </form>
              )}

              {/* D. File Expense Form */}
              {activeModal === 'file_expense' && (
                <form onSubmit={handleCreateExpense} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Merchant / Vendor Name' : 'Loja / Fornecedor'}</label>
                    <input
                      type="text"
                      required
                      value={formExpenseMerchant}
                      onChange={(e) => setFormExpenseMerchant(e.target.value)}
                      placeholder="Toyota Motors Beira"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-lg text-slate-955 dark:text-slate-200"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Category' : 'Categoria'}</label>
                      <select
                        value={formExpenseCategory}
                        onChange={(e) => setFormExpenseCategory(e.target.value)}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none cursor-pointer text-slate-900 dark:text-slate-105 font-semibold"
                      >
                        <option value="Logistics">{language === 'en' ? 'Logistics' : 'Logística'}</option>
                        <option value="Raw Materials">{language === 'en' ? 'Raw Materials' : 'Matéria Prima'}</option>
                        <option value="Communication & Internet">{language === 'en' ? 'Communication & Internet' : 'Comunicação e Internet'}</option>
                        <option value="Transport">{language === 'en' ? 'Transport' : 'Transporte'}</option>
                        <option value="Office Supplies">{language === 'en' ? 'Office Supplies' : 'Material de Escritório'}</option>
                        <option value="Other">{language === 'en' ? 'Other' : 'Outro'}</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Outlay Sum (MZN)' : 'Valor Pago (MZN)'}</label>
                      <input
                        type="number"
                        required
                        step="any"
                        value={formExpenseAmount}
                        onChange={(e) => setFormExpenseAmount(e.target.value)}
                        placeholder="450.00"
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-lg text-slate-955 dark:text-slate-200"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Expense Date' : 'Data da Despesa'}</label>
                    <input
                      type="date"
                      value={formExpenseDate}
                      onChange={(e) => setFormExpenseDate(e.target.value)}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-lg text-slate-955 dark:text-slate-200"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Notes / Observations (optional)' : 'Notas / Observações (opcional)'}</label>
                    <input
                      type="text"
                      value={formExpenseNotes}
                      onChange={(e) => setFormExpenseNotes(e.target.value)}
                      placeholder={language === 'en' ? 'Additional notes...' : 'Observações adicionais...'}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-lg text-slate-955 dark:text-slate-200"
                    />
                  </div>

                  {/* Receipt image upload */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Paperclip size={10} />
                      {language === 'en' ? 'Receipt / Proof of Payment (optional)' : 'Comprovativo / Recibo (opcional)'}
                    </label>
                    <div
                      className="relative border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors group"
                      onClick={() => document.getElementById('expense-receipt-input')?.click()}
                    >
                      {formExpenseReceiptFile ? (
                        <div className="flex items-center gap-3">
                          <img
                            src={URL.createObjectURL(formExpenseReceiptFile)}
                            alt="Receipt preview"
                            className="w-14 h-14 object-cover rounded-lg border border-slate-200 dark:border-slate-700 flex-shrink-0"
                          />
                          <div className="text-left flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{formExpenseReceiptFile.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{(formExpenseReceiptFile.size / 1024).toFixed(1)} KB</p>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setFormExpenseReceiptFile(null); }}
                              className="text-[10px] text-red-500 hover:text-red-700 mt-1 font-semibold cursor-pointer"
                            >
                              {language === 'en' ? 'Remove' : 'Remover'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 py-1 text-slate-400 group-hover:text-blue-500 transition-colors">
                          <Upload size={18} />
                          <p className="text-[10px] font-semibold">{language === 'en' ? 'Click to attach receipt image' : 'Clique para anexar imagem do comprovativo'}</p>
                          <p className="text-[9px] text-slate-300 dark:text-slate-600">PNG, JPG, WEBP — máx. 10 MB</p>
                        </div>
                      )}
                      <input
                        id="expense-receipt-input"
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setFormExpenseReceiptFile(f);
                          e.target.value = '';
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 hover:bg-slate-100 text-slate-500 font-semibold text-xs"
                    >
                      {language === 'en' ? 'Cancel' : 'Cancelar'}
                    </button>
                    <button
                      type="submit"
                      disabled={formExpenseUploading}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-xs rounded-lg flex items-center gap-2"
                    >
                      {formExpenseUploading && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                      {formExpenseUploading
                        ? (language === 'en' ? 'Uploading...' : 'A enviar...')
                        : (language === 'en' ? 'Save record' : 'Salvar Despesa')}
                    </button>
                  </div>
                </form>
              )}

              {/* E. New Contact Form */}
              {activeModal === 'new_contact' && (
                <form onSubmit={handleCreateContact} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Full Contact name' : 'Nome Completo'}</label>
                    <input
                      type="text"
                      required
                      value={formContactName}
                      onChange={(e) => setFormContactName(e.target.value)}
                      placeholder="Engenheiro Artur Tembe"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-lg text-slate-955 dark:text-slate-200"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">E-mail</label>
                      <input
                        type="email"
                        required
                        value={formContactEmail}
                        onChange={(e) => setFormContactEmail(e.target.value)}
                        placeholder="artur@empresa.co.mz"
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-lg"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Phone Number' : 'Telefone Celular'}</label>
                      <input
                        type="text"
                        value={formContactPhone}
                        onChange={(e) => setFormContactPhone(e.target.value)}
                        placeholder="+258 84 944 2333"
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Company Name' : 'Companhia / Empresa'}</label>
                      <input
                        type="text"
                        required
                        value={formContactCompany}
                        onChange={(e) => setFormContactCompany(e.target.value)}
                        placeholder="Limpopo S.A."
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-lg"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Professional Role' : 'Cargo Profissional'}</label>
                      <input
                        type="text"
                        value={formContactRole}
                        onChange={(e) => setFormContactRole(e.target.value)}
                        placeholder="Director Executivo"
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 hover:bg-slate-100 text-slate-500 font-semibold text-xs rounded-lg"
                    >
                      {language === 'en' ? 'Cancel' : 'Cancelar'}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg"
                    >
                      {language === 'en' ? 'Add Contact' : 'Guardar Ficha'}
                    </button>
                  </div>
                </form>
              )}

              {/* G. New Debt Client Form */}
              {activeModal === 'new_debt_client' && (
                <form onSubmit={handleCreateDebtClient} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {language === 'en' ? 'Full Name' : 'Nome Completo do Cliente'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formClientName}
                      onChange={(e) => setFormClientName(e.target.value)}
                      placeholder="João Manuel Machava"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {language === 'en' ? 'Movitel Number' : 'Número Movitel'}
                      </label>
                      <input
                        type="tel"
                        value={formClientMovitel}
                        onChange={(e) => setFormClientMovitel(e.target.value)}
                        placeholder="+258 86 000 0000"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-900"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {language === 'en' ? 'Vodacom Number' : 'Número Vodacom'}
                      </label>
                      <input
                        type="tel"
                        value={formClientVodacom}
                        onChange={(e) => setFormClientVodacom(e.target.value)}
                        placeholder="+258 84 000 0000"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {language === 'en' ? 'Address' : 'Morada'}
                    </label>
                    <input
                      type="text"
                      value={formClientAddress}
                      onChange={(e) => setFormClientAddress(e.target.value)}
                      placeholder="Av. 24 de Julho, Nº 123, Maputo"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-900"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {language === 'en' ? 'Account Status' : 'Estado da Conta'}
                    </label>
                    <select
                      value={formClientStatus}
                      onChange={(e) => setFormClientStatus(e.target.value as DebtClient['status'])}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none cursor-pointer text-slate-900 font-semibold"
                    >
                      <option value="Pendente">{language === 'en' ? 'Pending' : 'Pendente'}</option>
                      <option value="Liquidado">{language === 'en' ? 'Settled' : 'Liquidado'}</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 hover:bg-slate-100 text-slate-500 font-semibold text-xs rounded-lg cursor-pointer"
                    >
                      {language === 'en' ? 'Cancel' : 'Cancelar'}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-md cursor-pointer"
                    >
                      {language === 'en' ? 'Add Client' : 'Adicionar Cliente'}
                    </button>
                  </div>
                </form>
              )}

              {/* H. New Receipt (manual) Form */}
              {activeModal === 'new_receipt' && (
                <form onSubmit={handleCreateReceiptManual} className="space-y-4">

                  {/* 1. Invoice selector — first field, autofills everything below */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {language === 'en' ? 'Invoice Reference' : 'Referência da Factura'}
                    </label>
                    <select
                      value={formReceiptInvoiceRef}
                      onChange={e => {
                        const val = e.target.value;
                        setFormReceiptInvoiceRef(val);
                        if (val) {
                          const inv = invoices.find(i => i.invoiceNumber === val);
                          if (inv) {
                            setFormReceiptClient(inv.client);
                            setFormReceiptAmount(String(inv.amount));
                            if (inv.companyProfileId) setFormReceiptCompanyProfile(inv.companyProfileId);
                          }
                        } else {
                          setFormReceiptClient('');
                          setFormReceiptAmount('');
                        }
                      }}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-emerald-500 text-slate-900 dark:text-slate-100 font-semibold cursor-pointer"
                    >
                      <option value="">
                        {language === 'en' ? '— Select a pending invoice —' : '— Selecionar factura pendente —'}
                      </option>
                      {invoices.filter(i => i.status !== 'Paid').map(i => (
                        <option key={i.id} value={i.invoiceNumber}>
                          {i.invoiceNumber} · {i.client} · {formatValue(i.amount, 'MZN')}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {language === 'en'
                        ? 'Selecting an invoice auto-fills the client and amount below.'
                        : 'Selecionar uma factura preenche automaticamente o cliente e o valor.'}
                    </p>
                  </div>

                  {/* 2. Client Name (autofilled from invoice, editable) */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      {language === 'en' ? 'Client Name *' : 'Nome do Cliente *'}
                      {formReceiptClient && formReceiptInvoiceRef && (
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                          {language === 'en' ? 'auto-filled' : 'preenchido'}
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      required
                      value={formReceiptClient}
                      onChange={e => setFormReceiptClient(e.target.value)}
                      placeholder="TechSolutions S.A."
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-emerald-500 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  {/* 3. Amount + Date */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        {language === 'en' ? 'Amount (MZN) *' : 'Valor (MZN) *'}
                        {formReceiptAmount && formReceiptInvoiceRef && (
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                            {language === 'en' ? 'auto' : 'auto'}
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        required
                        min="0.01"
                        step="any"
                        value={formReceiptAmount}
                        onChange={e => setFormReceiptAmount(e.target.value)}
                        placeholder="85000.00"
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-emerald-500 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Payment Date' : 'Data de Pagamento'}</label>
                      <input
                        type="date"
                        value={formReceiptDate}
                        onChange={e => setFormReceiptDate(e.target.value)}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-emerald-500 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  {/* 4. Payment Method */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Payment Method' : 'Método de Pagamento'}</label>
                    <select
                      value={formReceiptMethod}
                      onChange={e => setFormReceiptMethod(e.target.value)}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none cursor-pointer text-slate-900 dark:text-slate-100 font-semibold"
                    >
                      <option value="Bank Transfer">{language === 'en' ? 'Bank Transfer' : 'Transferência Bancária'}</option>
                      <option value="M-Pesa">M-Pesa</option>
                      <option value="E-Mola">E-Mola</option>
                      <option value="Cash">{language === 'en' ? 'Cash' : 'Numerário'}</option>
                    </select>
                  </div>

                  {/* 5. Company selector — only when secondary company exists */}
                  {companySettings.secondaryCompany && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Issuing Company' : 'Empresa Emissora'}</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setFormReceiptCompanyProfile('primary')}
                          className={`p-2.5 rounded-lg border text-xs font-semibold transition-all truncate ${
                            formReceiptCompanyProfile === 'primary'
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                          }`}>
                          {companySettings.companyName || (language === 'en' ? 'Primary' : 'Principal')}
                        </button>
                        <button type="button" onClick={() => setFormReceiptCompanyProfile('secondary')}
                          className={`p-2.5 rounded-lg border text-xs font-semibold transition-all truncate ${
                            formReceiptCompanyProfile === 'secondary'
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                          }`}>
                          {companySettings.secondaryCompany.companyName || (language === 'en' ? 'Secondary' : 'Secundária')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 6. Notes */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Document Notes (optional)' : 'Observações do Documento (opcional)'}</label>
                    <textarea
                      value={formReceiptNotes}
                      onChange={e => setFormReceiptNotes(e.target.value)}
                      rows={2}
                      placeholder={language === 'en' ? 'Payment notes, observations...' : 'Notas de pagamento, observações...'}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-emerald-500 text-slate-900 dark:text-slate-100 resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-500 font-semibold text-xs rounded-lg transition-all cursor-pointer"
                    >
                      {language === 'en' ? 'Cancel' : 'Cancelar'}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-md transition-all cursor-pointer"
                    >
                      {language === 'en' ? 'Issue Receipt' : 'Emitir Recibo'}
                    </button>
                  </div>
                </form>
              )}

              {/* I. New General Sale Form */}
              {activeModal === 'new_sale' && (
                <form onSubmit={handleCreateSale} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {language === 'en' ? 'Select Stock Product (optional)' : 'Seleccionar Produto do Stock (opcional)'}
                    </label>
                    <select
                      value={formSaleProductId}
                      onChange={(e) => {
                        const item = stockItems.find(s => s.id === e.target.value);
                        setFormSaleProductId(e.target.value);
                        if (item) {
                          setFormSaleProductName(item.name);
                          setFormSaleSku(item.sku);
                          setFormSaleUnitPrice(String(item.price));
                        } else {
                          setFormSaleProductName('');
                          setFormSaleSku('');
                          setFormSaleUnitPrice('');
                        }
                      }}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none cursor-pointer text-slate-900 dark:text-slate-100 font-semibold"
                    >
                      <option value="">{language === 'en' ? '— Free entry (no stock link) —' : '— Entrada livre (sem ligação ao stock) —'}</option>
                      {stockItems.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.sku}) — Stock: {s.stockLevel}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {language === 'en' ? 'Product Name *' : 'Nome do Produto *'}
                      </label>
                      <input type="text" required value={formSaleProductName} onChange={(e) => setFormSaleProductName(e.target.value)}
                        placeholder="Produto..." className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SKU</label>
                      <input type="text" value={formSaleSku} onChange={(e) => setFormSaleSku(e.target.value)}
                        placeholder="SKU-001" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Quantity *' : 'Quantidade *'}</label>
                      <input type="number" required min="1" value={formSaleQuantity} onChange={(e) => setFormSaleQuantity(e.target.value)}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-lg text-slate-900 dark:text-slate-200" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Unit Price (MT) *' : 'Preço Unit. (MT) *'}</label>
                      <input type="number" required step="any" value={formSaleUnitPrice} onChange={(e) => setFormSaleUnitPrice(e.target.value)}
                        placeholder="0.00" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-lg text-slate-900 dark:text-slate-200" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Sale Date' : 'Data da Venda'}</label>
                      <input type="date" value={formSaleDate} onChange={(e) => setFormSaleDate(e.target.value)}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-lg text-slate-900 dark:text-slate-200" />
                    </div>
                  </div>

                  {formSaleQuantity && formSaleUnitPrice && (
                    <div className="text-right text-xs font-bold text-blue-600 dark:text-blue-400">
                      Total: {((parseInt(formSaleQuantity) || 0) * (parseFloat(formSaleUnitPrice) || 0)).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Payment Method' : 'Método de Pagamento'}</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['Físico', 'M-Pesa', 'E-mola', 'Banco'] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setFormSalePaymentMethod(method)}
                          className={`py-2.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                            formSalePaymentMethod === method
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-blue-400'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Notes (optional)' : 'Notas (opcional)'}</label>
                    <input type="text" value={formSaleNotes} onChange={(e) => setFormSaleNotes(e.target.value)}
                      placeholder={language === 'en' ? 'e.g. sold to street vendor...' : 'ex: vendido a cliente na rua...'}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100" />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-900">
                    <button type="button" onClick={() => setActiveModal(null)}
                      className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-500 font-semibold text-xs rounded-lg transition-all cursor-pointer">
                      {language === 'en' ? 'Cancel' : 'Cancelar'}
                    </button>
                    <button type="submit"
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer">
                      {language === 'en' ? 'Register Sale' : 'Registar Venda'}
                    </button>
                  </div>
                </form>
              )}

              {/* F. Report Generation Progress */}
              {activeModal === 'generate_report' && (
                <div className="py-8 space-y-6 text-center">
                  <div className="inline-flex w-12 h-12 rounded-full bg-blue-100 text-blue-600 items-center justify-center animate-bounce">
                    <Database size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">
                      {language === 'en'
                        ? 'Validating credit lines and regional inventories...'
                        : 'A consolidar e processar relatórios fiscais...'
                      }
                    </h4>
                    <p className="text-[10px] text-slate-450 mt-1">
                      {language === 'en'
                        ? 'Please do not interrupt server handshake protocols.'
                        : 'Por favor aguarde enquanto compilamos os gráficos consolidados.'
                      }
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-blue-600 h-full transition-all duration-150" style={{ width: `${reportProgress}%` }}></div>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-slate-400 block">{reportProgress}% CONSOLIDATED</span>
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* ── Update available modal ─────────────────────────────── */}
      {updateAvailable && <UpdateModal language={language} />}

    </div>
  );
}

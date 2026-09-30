import { mutate } from '../../shared/mutations';
import { readRows, type ReadOptions } from '../../shared/readRows';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { localClient } from './localClient';
import { Invoice, Quote, Receipt, Expense, StockItem, Contact, DocumentItem, CompanySettings, BankAccount, MobileContact, DebtClient, SecondaryCompany, GeneralSale } from '../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Format a sequential number into document reference, e.g. "FAC-0001" */
export function formatDocNumber(prefix: string, seqNumber: number): string {
  return `${prefix}-${String(seqNumber).padStart(4, '0')}`;
}

/** Check whether a document with the given seq_number already exists for a user */
export async function checkDocumentExists(
  table: string,
  seqNumber: number,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await localClient
      .from(table)
      .select('id')
      .eq('seq_number', seqNumber)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return false;
    return data !== null;
  } catch {
    return false;
  }
}

// ─── Locale helpers ─────────────────────────────────────────────────────────

function formatDateEn(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDatePt(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('pt-MZ', { day: 'numeric', month: 'short', year: 'numeric' });
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
}

// ─── Mapper functions ────────────────────────────────────────────────────────

export function mapInvoice(row: Record<string, unknown>): Invoice {
  const seqNumber = row.seq_number as number;
  const issueDate = (row.issue_date as string) ?? todayIso();
  return {
    id: row.id as string,
    seqNumber,
    invoiceNumber: formatDocNumber('FAC', seqNumber),
    client: row.client as string,
    clientNuit: (row.client_nuit as string | undefined) ?? undefined,
    clientPhone: (row.client_phone as string | undefined) ?? undefined,
    clientEmail: (row.client_email as string | undefined) ?? undefined,
    description: (row.description as string | undefined) ?? undefined,
    initials: getInitials(row.client as string),
    issueDate,
    dueDate: (row.due_date as string | undefined) ?? undefined,
    date: formatDateEn(issueDate),
    datePt: formatDatePt(issueDate),
    amount: parseFloat(String(row.amount)),
    status: row.status as Invoice['status'],
    statusPt:
      row.status === 'Paid' ? 'Pago' :
      row.status === 'Pending' ? 'Pendente' : 'Vencido',
    logoBg: (row.logo_bg as string) ?? 'bg-emerald-50 text-emerald-800 border border-emerald-500',
    companyProfileId: (row.company_profile_id as string) === 'secondary' ? 'secondary' : 'primary',
    notes: (row.notes as string | undefined) ?? undefined,
  };
}

export function mapQuote(row: Record<string, unknown>): Quote {
  const seqNumber = row.seq_number as number;
  const issueDate = (row.issue_date as string) ?? todayIso();
  return {
    id: row.id as string,
    seqNumber,
    quoteNumber: formatDocNumber('COT', seqNumber),
    client: row.client as string,
    clientNuit: (row.client_nuit as string | undefined) ?? undefined,
    clientPhone: (row.client_phone as string | undefined) ?? undefined,
    clientEmail: (row.client_email as string | undefined) ?? undefined,
    description: (row.description as string | undefined) ?? undefined,
    initials: getInitials(row.client as string),
    issueDate,
    validityDays: (row.validity_days as number) ?? 15,
    date: formatDateEn(issueDate),
    datePt: formatDatePt(issueDate),
    amount: parseFloat(String(row.amount)),
    status: row.status as Quote['status'],
    statusPt:
      row.status === 'Approved' ? 'Aprovado' :
      row.status === 'Pending' ? 'Pendente' :
      row.status === 'Liquidado' ? 'Liquidado' : 'Rejeitado',
    logoBg: (row.logo_bg as string) ?? 'bg-amber-100 text-amber-800',
    companyProfileId: (row.company_profile_id as string) === 'secondary' ? 'secondary' : 'primary',
    notes: (row.notes as string | undefined) ?? undefined,
  };
}

export function mapReceipt(row: Record<string, unknown>): Receipt {
  const seqNumber = row.seq_number as number;
  const paymentDate = (row.payment_date as string) ?? todayIso();
  return {
    id: row.id as string,
    seqNumber,
    receiptNumber: formatDocNumber('REC', seqNumber),
    invoiceId: (row.invoice_id as string | undefined) ?? undefined,
    client: row.client as string,
    initials: getInitials(row.client as string),
    paymentDate,
    date: formatDateEn(paymentDate),
    datePt: formatDatePt(paymentDate),
    amount: parseFloat(String(row.amount)),
    method: row.method as string,
    methodPt: row.method_pt as string,
    invoiceRef: (row.invoice_ref as string) ?? '',
    companyProfileId: (row.company_profile_id as string) === 'secondary' ? 'secondary' : 'primary',
    notes: (row.notes as string | undefined) ?? undefined,
  };
}

export function mapExpense(row: Record<string, unknown>): Expense {
  const seqNumber = row.seq_number as number;
  const expenseDate = (row.expense_date as string) ?? todayIso();
  return {
    id: row.id as string,
    seqNumber,
    ref: formatDocNumber('EXP', seqNumber),
    merchant: row.merchant as string,
    category: row.category as string,
    categoryPt: row.category_pt as string,
    amount: parseFloat(String(row.amount)),
    expenseDate,
    date: formatDateEn(expenseDate),
    datePt: formatDatePt(expenseDate),
    status: row.status as Expense['status'],
    statusPt:
      row.status === 'Approved' ? 'Aprovado' :
      row.status === 'Pending' ? 'Pendente' : 'Rejeitado',
    notes: (row.notes as string | undefined) ?? undefined,
    receiptImageUrl: (row.receipt_image_url as string | undefined) ?? undefined,
  };
}

export function mapStockItem(row: Record<string, unknown>): StockItem {
  const level = row.stock_level as number;
  const max = row.max_stock as number;
  let status: StockItem['status'] = 'In Stock';
  let statusPt: StockItem['statusPt'] = 'Em Stock';
  if (level === 0) { status = 'Out of Stock'; statusPt = 'Sem Stock'; }
  else if (level <= max * 0.35) { status = 'Low Stock'; statusPt = 'Stock Baixo'; }
  return {
    id: row.id as string,
    name: row.name as string,
    sku: row.sku as string,
    category: row.category as string,
    categoryPt: row.category_pt as string,
    stockLevel: level,
    maxStock: max,
    price: parseFloat(String(row.price)),
    salePrice: row.sale_price != null ? parseFloat(String(row.sale_price)) : undefined,
    status,
    statusPt,
    warehouse: row.warehouse as string,
    warehousePt: row.warehouse_pt as string,
    createdAt: (row.created_at as string | undefined) ?? undefined,
  };
}

export function mapContact(row: Record<string, unknown>): Contact {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    phone: (row.phone as string) ?? '',
    company: row.company as string,
    role: row.role as string,
    rolePt: (row.role_pt as string) ?? (row.role as string),
    avatarColor: (row.avatar_color as string) ?? 'bg-indigo-600',
  };
}

// ─── Invoice CRUD ────────────────────────────────────────────────────────────

export async function fetchInvoices(userId: string, options: ReadOptions = {}): Promise<Invoice[]> {
  const [rows, itemRows] = await Promise.all([
    readRows(localClient, 'invoices', userId, '*', ['seq_number'], options),
    readRows(localClient, 'invoice_items', userId, '*', ['invoice_id', 'sort_order']),
  ]);
  const itemsByInvoice = new Map<string, DocumentItem[]>();
  for (const item of itemRows) {
    const parent = String(item.invoice_id);
    const items = itemsByInvoice.get(parent) ?? [];
    items.push({ id: String(item.id), description: String(item.description), quantity: Number(item.quantity), unitPrice: Number(item.unit_price) });
    itemsByInvoice.set(parent, items);
  }
  return rows.map(row => ({ ...mapInvoice(row), items: itemsByInvoice.get(String(row.id)) ?? [] }));
}

export async function createInvoice(payload: {
  userId: string;
  client: string;
  clientNuit?: string;
  clientPhone?: string;
  clientEmail?: string;
  description?: string;
  amount: number;
  status: Invoice['status'];
  issueDate: string;
  dueDate?: string;
  logoBg?: string;
  companyProfileId?: 'primary' | 'secondary';
  notes?: string;
}, items: DocumentItem[] = []): Promise<Invoice | null> {
  const { data, error } = await mutate(localClient, 'rest_save_document', { p_kind: 'invoice', p_document: {
        user_id: payload.userId,
        client: payload.client,
        client_nuit: payload.clientNuit ?? null,
        client_phone: payload.clientPhone ?? null,
        client_email: payload.clientEmail ?? null,
        description: payload.description ?? null,
        amount: payload.amount,
        status: payload.status,
        issue_date: payload.issueDate,
        due_date: payload.dueDate ?? null,
        logo_bg: payload.logoBg ?? 'bg-emerald-50 text-emerald-800 border border-emerald-500',
        company_profile_id: payload.companyProfileId ?? 'primary',
        notes: payload.notes ?? null,
      }, p_items: items });
  if (error) throw new Error(error.message || "Falha ao criar factura.");
  if (!data) throw new Error("O serviço local não devolveu a factura criada.");
  return { ...mapInvoice(data), items: items.map(item => ({ ...item })) };
}

export async function updateInvoiceStatus(id: string, status: Invoice['status']): Promise<boolean> {
  try {
    const { error } = await localClient
      .from('invoices')
      .update({ status })
      .eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteInvoice(id: string): Promise<boolean> {
  try {
    const { error } = await localClient.from('invoices').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// ─── Quote CRUD ──────────────────────────────────────────────────────────────

export async function fetchQuotes(userId: string, options: ReadOptions = {}): Promise<Quote[]> {
  const rows = await readRows(localClient, 'quotes', userId, '*', ["seq_number"], options);
  return rows.map(mapQuote);
}

export async function createQuote(payload: {
  userId: string;
  client: string;
  clientNuit?: string;
  clientPhone?: string;
  clientEmail?: string;
  description?: string;
  amount: number;
  issueDate: string;
  validityDays?: number;
  logoBg?: string;
  companyProfileId?: 'primary' | 'secondary';
  notes?: string;
}, items: DocumentItem[] = []): Promise<Quote | null> {
  const { data, error } = await mutate(localClient, 'rest_save_document', { p_kind: 'quote', p_document: {
        user_id: payload.userId,
        client: payload.client,
        client_nuit: payload.clientNuit ?? null,
        client_phone: payload.clientPhone ?? null,
        client_email: payload.clientEmail ?? null,
        description: payload.description ?? null,
        amount: payload.amount,
        status: 'Pending',
        issue_date: payload.issueDate,
        validity_days: payload.validityDays ?? 15,
        logo_bg: payload.logoBg ?? 'bg-amber-100 text-amber-800',
        company_profile_id: payload.companyProfileId ?? 'primary',
        notes: payload.notes ?? null,
      }, p_items: items });
  if (error || !data) return null;
  return mapQuote(data);
}

export async function updateQuoteStatus(id: string, status: Quote['status']): Promise<boolean> {
  try {
    const { error } = await localClient
      .from('quotes')
      .update({ status })
      .eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteQuote(id: string): Promise<boolean> {
  try {
    const { error } = await localClient.from('quotes').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// ─── Receipt CRUD ────────────────────────────────────────────────────────────

export async function fetchReceipts(userId: string, options: ReadOptions = {}): Promise<Receipt[]> {
  const rows = await readRows(localClient, 'receipts', userId, '*', ["seq_number"], options);
  return rows.map(mapReceipt);
}

export async function createReceipt(payload: {
  userId: string;
  invoiceId?: string;
  invoiceRef: string;
  client: string;
  amount: number;
  method: string;
  methodPt: string;
  paymentDate: string;
  companyProfileId?: 'primary' | 'secondary';
  notes?: string;
}): Promise<Receipt | null> {
    const { data, error } = await mutate(localClient, 'rest_create_receipt', { p_receipt: {
        user_id: payload.userId,
        invoice_id: payload.invoiceId ?? null,
        invoice_ref: payload.invoiceRef,
        client: payload.client,
        amount: payload.amount,
        method: payload.method,
        method_pt: payload.methodPt,
        payment_date: payload.paymentDate,
        company_profile_id: payload.companyProfileId ?? 'primary',
        notes: payload.notes ?? null,
      } });
    if (error || !data) return null;
    return mapReceipt(data);
  }

export async function deleteReceipt(id: string): Promise<boolean> {
  try {
    const { error } = await localClient.from('receipts').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// ─── Expense CRUD ────────────────────────────────────────────────────────────

export async function fetchExpenses(userId: string, options: ReadOptions = {}): Promise<Expense[]> {
  const rows = await readRows(localClient, 'expenses', userId, '*', ["seq_number"], options);
  return rows.map(mapExpense);
}

export async function createExpense(payload: {
  userId: string;
  merchant: string;
  category: string;
  categoryPt: string;
  amount: number;
  expenseDate: string;
  notes?: string;
  receiptImageUrl?: string;
}): Promise<Expense | null> {
  try {
    const { data, error } = await localClient
      .from('expenses')
      .insert({
        user_id: payload.userId,
        merchant: payload.merchant,
        category: payload.category,
        category_pt: payload.categoryPt,
        amount: payload.amount,
        expense_date: payload.expenseDate,
        status: 'Pending',
        notes: payload.notes ?? null,
        receipt_image_url: payload.receiptImageUrl ?? null,
      })
      .select()
      .single();
    if (error || !data) return null;
    return mapExpense(data);
  } catch {
    return null;
  }
}

export async function updateExpenseStatus(id: string, status: Expense['status']): Promise<boolean> {
  try {
    const { error } = await localClient.from('expenses').update({ status }).eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteExpense(id: string): Promise<boolean> {
  try {
    const { error } = await localClient.from('expenses').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// ─── StockItem CRUD ──────────────────────────────────────────────────────────

export async function fetchStockItems(userId: string, options: ReadOptions = {}): Promise<StockItem[]> {
  const rows = await readRows(localClient, 'stock_items', userId, '*', ["created_at"], options);
  return rows.map(mapStockItem);
}

export async function createStockItem(payload: {
  userId: string;
  name: string;
  sku: string;
  category: string;
  categoryPt: string;
  stockLevel: number;
  maxStock: number;
  price: number;
  salePrice?: number;
  warehouse: string;
  warehousePt: string;
}): Promise<StockItem | null> {
  try {
    const { data, error } = await localClient
      .from('stock_items')
      .insert({
        user_id: payload.userId,
        name: payload.name,
        sku: payload.sku.toUpperCase(),
        category: payload.category,
        category_pt: payload.categoryPt,
        stock_level: payload.stockLevel,
        max_stock: payload.maxStock,
        price: payload.price,
        sale_price: payload.salePrice ?? null,
        warehouse: payload.warehouse,
        warehouse_pt: payload.warehousePt,
      })
      .select()
      .single();
    if (error || !data) {
      console.error('[createStockItem] SQLite local error:', error?.message, error?.details, error?.hint);
      return null;
    }
    return mapStockItem(data);
  } catch (e) {
    console.error('[createStockItem] Exception:', e);
    return null;
  }
}

export async function updateStockLevel(id: string, stockLevel: number): Promise<boolean> {
  try {
    const { error } = await localClient
      .from('stock_items')
      .update({ stock_level: stockLevel })
      .eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteStockItem(id: string): Promise<boolean> {
  try {
    const { error } = await localClient.from('stock_items').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// ─── GeneralSale CRUD ─────────────────────────────────────────────────────────

export function mapGeneralSale(row: Record<string, unknown>): GeneralSale {
  const seqNumber = row.seq_number as number;
  const saleDate = (row.sale_date as string) ?? todayIso();
  return {
    id: row.id as string,
    seqNumber,
    ref: formatDocNumber('VND', seqNumber),
    productId: (row.product_id as string | undefined) ?? undefined,
    productName: row.product_name as string,
    sku: (row.sku as string) ?? '',
    quantity: row.quantity as number,
    unitPrice: parseFloat(String(row.unit_price)),
    totalAmount: parseFloat(String(row.total_amount)),
    saleDate,
    date: formatDateEn(saleDate),
    datePt: formatDatePt(saleDate),
    paymentMethod: ((row.payment_method as string | undefined) ?? 'Físico') as import('../types').PaymentMethod,
    notes: (row.notes as string | undefined) ?? undefined,
    createdAt: (row.created_at as string) ?? '',
  };
}

export async function fetchGeneralSales(userId: string, options: ReadOptions = {}): Promise<GeneralSale[]> {
  const rows = await readRows(localClient, 'general_sales', userId, '*', ["sale_date","seq_number"], options);
  return rows.map(mapGeneralSale);
}

export async function createGeneralSale(payload: {
  userId: string;
  productId?: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  saleDate: string;
  paymentMethod: import('../types').PaymentMethod;
  notes?: string;
}): Promise<GeneralSale | null> {
    const { data, error } = await mutate(localClient, 'rest_create_sale', { p_sale: {
        user_id: payload.userId,
        product_id: payload.productId ?? null,
        product_name: payload.productName,
        sku: payload.sku,
        quantity: payload.quantity,
        unit_price: payload.unitPrice,

        sale_date: payload.saleDate,
        payment_method: payload.paymentMethod,
        notes: payload.notes ?? null,
      } });
    if (error || !data) return null;
    return mapGeneralSale(data);
  }

export async function deleteGeneralSale(id: string): Promise<boolean> {
  try {
    const { error } = await localClient.from('general_sales').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function decrementStockForInvoice(userId: string, invoiceId: string): Promise<void> {
    const { error } = await localClient.rpc('rest_apply_invoice_stock', { p_invoice_id: invoiceId });
    if (error) throw error;
  }

// ─── Contact CRUD ────────────────────────────────────────────────────────────

export async function fetchContacts(userId: string, options: ReadOptions = {}): Promise<Contact[]> {
  const rows = await readRows(localClient, 'contacts', userId, '*', ["created_at"], options);
  return rows.map(mapContact);
}

export async function createContact(payload: {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  company: string;
  role: string;
  rolePt?: string;
  avatarColor?: string;
}): Promise<Contact | null> {
  try {
    const { data, error } = await localClient
      .from('contacts')
      .insert({
        user_id: payload.userId,
        name: payload.name,
        email: payload.email,
        phone: payload.phone ?? '',
        company: payload.company,
        role: payload.role,
        role_pt: payload.rolePt ?? payload.role,
        avatar_color: payload.avatarColor ?? 'bg-indigo-600',
      })
      .select()
      .single();
    if (error || !data) return null;
    return mapContact(data);
  } catch {
    return null;
  }
}

export async function deleteContact(id: string): Promise<boolean> {
  try {
    const { error } = await localClient.from('contacts').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// ─── DocumentItem CRUD ───────────────────────────────────────────────────────

export async function createInvoiceItems(invoiceId: string, items: DocumentItem[]): Promise<boolean> {
  try {
    const rows = items.map((it, i) => ({
      invoice_id: invoiceId,
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unitPrice,
      sort_order: i,
    }));
    const { error } = await localClient.from('invoice_items').insert(rows);
    return !error;
  } catch { return false; }
}

export async function fetchInvoiceItems(invoiceId: string): Promise<DocumentItem[]> {
  try {
    const { data, error } = await localClient
      .from('invoice_items').select('*').eq('invoice_id', invoiceId).order('sort_order');
    if (error || !data) return [];
    return data.map(r => ({ id: r.id, description: r.description, quantity: Number(r.quantity), unitPrice: Number(r.unit_price) }));
  } catch { return []; }
}

export async function createQuoteItems(quoteId: string, items: DocumentItem[]): Promise<boolean> {
  try {
    const rows = items.map((it, i) => ({
      quote_id: quoteId,
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unitPrice,
      sort_order: i,
    }));
    const { error } = await localClient.from('quote_items').insert(rows);
    return !error;
  } catch { return false; }
}

export async function fetchQuoteItems(quoteId: string): Promise<DocumentItem[]> {
  try {
    const { data, error } = await localClient
      .from('quote_items').select('*').eq('quote_id', quoteId).order('sort_order');
    if (error || !data) return [];
    return data.map(r => ({ id: r.id, description: r.description, quantity: Number(r.quantity), unitPrice: Number(r.unit_price) }));
  } catch { return []; }
}

// ─── CompanySettings CRUD ────────────────────────────────────────────────────

export function mapSettings(row: Record<string, unknown>): CompanySettings {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    companyName: (row.company_name as string) ?? '',
    nuit: (row.nuit as string) ?? '',
    address: (row.address as string) ?? '',
    city: (row.city as string) ?? '',
    phone: (row.phone as string) ?? '',
    email: (row.email as string) ?? '',
    logoBase64: row.logo_base64 as string | undefined,
    stampBase64: row.stamp_base64 as string | undefined,
    bankAccounts: (row.bank_accounts as BankAccount[]) ?? [],
    mobileContacts: (row.mobile_contacts as MobileContact[]) ?? [],
    setupComplete: (row.setup_complete as boolean) ?? false,
    secondaryCompany: (row.secondary_company as SecondaryCompany | null | undefined) ?? undefined,
  };
}

export async function fetchCompanySettings(userId: string): Promise<CompanySettings | null> {
  try {
    const { data, error } = await localClient
      .from('company_settings').select('*').eq('user_id', userId).maybeSingle();
    if (error || !data) return null;
    return mapSettings(data);
  } catch { return null; }
}

// ─── DebtClient CRUD ─────────────────────────────────────────────────────────

export function mapDebtClient(row: Record<string, unknown>): DebtClient {
  return {
    id: row.id as string,
    fullName: row.full_name as string,
    movitelNumber: (row.movitel_number as string) ?? '',
    vodacomNumber: (row.vodacom_number as string) ?? '',
    email: (row.email as string | undefined) ?? undefined,
    address: (row.address as string) ?? '',
    status: (row.status as DebtClient['status']) ?? 'Pendente',
    createdAt: row.created_at as string | undefined,
  };
}

export async function fetchDebtClients(userId: string, options: ReadOptions = {}): Promise<DebtClient[]> {
  const rows = await readRows(localClient, 'debt_clients', userId, '*', ["created_at"], options);
  return rows.map(mapDebtClient);
}

export async function createDebtClient(payload: {
  userId: string;
  fullName: string;
  movitelNumber: string;
  vodacomNumber: string;
  email?: string;
  address: string;
  status: DebtClient['status'];
}): Promise<DebtClient | null> {
  try {
    const { data, error } = await localClient
      .from('debt_clients')
      .insert({
        user_id: payload.userId,
        full_name: payload.fullName,
        movitel_number: payload.movitelNumber,
        vodacom_number: payload.vodacomNumber,
        email: payload.email ?? null,
        address: payload.address,
        status: payload.status,
      })
      .select()
      .single();
    if (error || !data) return null;
    return mapDebtClient(data);
  } catch {
    return null;
  }
}

// Find an existing debt client by full name (case-insensitive) for a given user
export async function findDebtClientByName(userId: string, fullName: string): Promise<DebtClient | null> {
  try {
    const { data, error } = await localClient
      .from('debt_clients')
      .select('*')
      .eq('user_id', userId)
      .ilike('full_name', fullName.trim())
      .maybeSingle();
    if (error || !data) return null;
    return mapDebtClient(data);
  } catch {
    return null;
  }
}

// Upsert a client from document creation: create if not exists, update contact info if exists
export async function upsertDebtClientFromDocument(userId: string, params: {
  fullName: string;
  phone?: string;
  email?: string;
}): Promise<DebtClient | null> {
  const existing = await findDebtClientByName(userId, params.fullName);
  if (existing) {
    // Update contact info but never downgrade status
    try {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (params.phone) updates.movitel_number = params.phone;
      if (params.email) updates.email = params.email;
      const { data, error } = await localClient
        .from('debt_clients')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();
      if (error || !data) return existing;
      return mapDebtClient(data);
    } catch {
      return existing;
    }
  }
  return createDebtClient({
    userId,
    fullName: params.fullName,
    movitelNumber: params.phone ?? '',
    vodacomNumber: '',
    email: params.email,
    address: '',
    status: 'Pendente',
  });
}

// Mark all non-rejected, non-settled quotes for a client as Liquidado; returns settled IDs
export async function settleQuotesByClientName(userId: string, clientName: string): Promise<string[]> {
  try {
    const { data, error } = await localClient
      .from('quotes')
      .update({ status: 'Liquidado' })
      .eq('user_id', userId)
      .ilike('client', clientName.trim())
      .in('status', ['Pending', 'Approved'])
      .select('id');
    if (error || !data) return [];
    return data.map((r: { id: string }) => r.id);
  } catch {
    return [];
  }
}

// Settle the debt client record matching the given name
export async function settleDebtClientByName(userId: string, clientName: string): Promise<DebtClient | null> {
  try {
    const { data, error } = await localClient
      .from('debt_clients')
      .update({ status: 'Liquidado', updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .ilike('full_name', clientName.trim())
      .select()
      .maybeSingle();
    if (error || !data) return null;
    return mapDebtClient(data);
  } catch {
    return null;
  }
}

export async function updateDebtClientStatus(id: string, status: DebtClient['status']): Promise<boolean> {
  try {
    const { error } = await localClient
      .from('debt_clients')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteDebtClient(id: string): Promise<boolean> {
  try {
    const { error } = await localClient.from('debt_clients').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function upsertCompanySettings(userId: string, settings: Partial<CompanySettings>): Promise<CompanySettings | null> {
  try {
    const payload: Record<string, unknown> = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };
    if (settings.companyName !== undefined) payload.company_name = settings.companyName;
    if (settings.nuit !== undefined) payload.nuit = settings.nuit;
    if (settings.address !== undefined) payload.address = settings.address;
    if (settings.city !== undefined) payload.city = settings.city;
    if (settings.phone !== undefined) payload.phone = settings.phone;
    if (settings.email !== undefined) payload.email = settings.email;
    if (settings.logoBase64 !== undefined) payload.logo_base64 = settings.logoBase64;
    if (settings.stampBase64 !== undefined) payload.stamp_base64 = settings.stampBase64;
    if (settings.bankAccounts !== undefined) payload.bank_accounts = settings.bankAccounts;
    if (settings.mobileContacts !== undefined) payload.mobile_contacts = settings.mobileContacts;
    if (settings.setupComplete !== undefined) payload.setup_complete = settings.setupComplete;
    if ('secondaryCompany' in settings) payload.secondary_company = settings.secondaryCompany ?? null;

    const { data, error } = await localClient
      .from('company_settings')
      .upsert(payload, { onConflict: 'user_id' })
      .select().single();
    if (error || !data) return null;
    return mapSettings(data);
  } catch { return null; }
}

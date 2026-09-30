/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StockItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  categoryPt: string;
  stockLevel: number;
  maxStock: number;
  price: number; // purchase price in MZN
  salePrice?: number; // sale price in MZN
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  statusPt: 'Em Stock' | 'Stock Baixo' | 'Sem Stock';
  warehouse: string;
  warehousePt: string;
  createdAt?: string;
}

export interface Transaction {
  id: string;
  transactionId: string;
  client: string;
  initials: string;
  amount: number; // in MZN
  status: 'Paid' | 'Pending' | 'Overdue';
  statusPt: 'Pago' | 'Pendente' | 'Vencido';
  date: string;
  datePt: string;
  avatarBg: string; // css class for avatar background
  avatarText: string;
}

export interface Invoice {
  id: string;
  seqNumber: number;           // from seq_number in DB
  invoiceNumber: string;       // formatted: "FAC-0001"
  client: string;
  clientNuit?: string;
  clientPhone?: string;
  clientEmail?: string;
  description?: string;        // service/product description
  initials: string;
  issueDate: string;           // ISO date "2026-05-29"
  dueDate?: string;            // ISO date
  date: string;                // formatted for display (en)
  datePt: string;              // formatted for display (pt)
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  statusPt: 'Pago' | 'Pendente' | 'Vencido';
  logoBg: string;
  items?: DocumentItem[];
  companyProfileId?: 'primary' | 'secondary';
  notes?: string;
}

export interface Quote {
  id: string;
  seqNumber: number;
  quoteNumber: string;         // formatted: "COT-0001"
  client: string;
  clientNuit?: string;
  clientPhone?: string;
  clientEmail?: string;
  description?: string;
  initials: string;
  issueDate: string;
  validityDays: number;        // default 15
  date: string;
  datePt: string;
  amount: number;
  status: 'Approved' | 'Pending' | 'Rejected' | 'Liquidado';
  statusPt: 'Aprovado' | 'Pendente' | 'Rejeitado' | 'Liquidado';
  logoBg: string;
  items?: DocumentItem[];
  companyProfileId?: 'primary' | 'secondary';
  notes?: string;
}

export interface Receipt {
  id: string;
  seqNumber: number;
  receiptNumber: string;       // formatted: "REC-0001"
  invoiceId?: string;
  client: string;
  initials: string;
  paymentDate: string;         // ISO date
  date: string;
  datePt: string;
  amount: number;
  method: string;
  methodPt: string;
  invoiceRef: string;          // invoice number string
  companyProfileId?: 'primary' | 'secondary';
  notes?: string;
}

export interface Expense {
  id: string;
  seqNumber: number;
  ref: string;                 // formatted: "EXP-0001"
  merchant: string;
  category: string;
  categoryPt: string;
  amount: number;
  expenseDate: string;         // ISO date
  date: string;
  datePt: string;
  status: 'Approved' | 'Pending' | 'Rejected';
  statusPt: 'Aprovado' | 'Pendente' | 'Rejeitado';
  notes?: string;
  receiptImageUrl?: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  rolePt: string;
  avatarColor: string;
}

export type Language = 'en' | 'pt';
export type Currency = 'MZN';

export interface DocumentItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface BankAccount {
  bank: string;
  iban: string;
}

export interface MobileContact {
  provider: string; // "Movitel" | "Vodacom" | "M-Pesa" | "E-Mola"
  number: string;
}

export interface SecondaryCompany {
  companyName: string;
  nuit: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  logoBase64?: string;
  stampBase64?: string;
  bankAccounts: BankAccount[];
  mobileContacts: MobileContact[];
}

export interface CompanySettings {
  id?: string;
  userId?: string;
  companyName: string;
  nuit: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  logoBase64?: string;
  stampBase64?: string;
  bankAccounts: BankAccount[];
  mobileContacts: MobileContact[];
  setupComplete: boolean;
  secondaryCompany?: SecondaryCompany | null;
}

export type PaymentMethod = 'Físico' | 'M-Pesa' | 'E-mola' | 'Banco';

export interface GeneralSale {
  id: string;
  seqNumber: number;
  ref: string;
  productId?: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  saleDate: string;
  date: string;
  datePt: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  titlePt: string;
  description: string;
  descriptionPt: string;
  type: 'success' | 'error' | 'info';
}

export interface DebtClient {
  id: string;
  fullName: string;
  movitelNumber: string;
  vodacomNumber: string;
  email?: string;
  address: string;
  status: 'Pendente' | 'Liquidado';
  createdAt?: string;
}

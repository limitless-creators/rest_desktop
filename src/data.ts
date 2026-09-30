/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StockItem, Transaction, Invoice, Quote, Receipt, Expense, Contact, Currency } from './types';

// Conversions or direct formatting:
// Always format as PT with MT suffix: e.g. 2.450,00 MT
export function formatValue(amount: number, _currency?: Currency): string {
  const formatted = new Intl.NumberFormat('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} MT`;
}

export const INITIAL_STOCK_ITEMS: StockItem[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_INVOICES: Invoice[] = [];

export const INITIAL_QUOTES: Quote[] = [];

export const INITIAL_RECEIPTS: Receipt[] = [];

export const INITIAL_EXPENSES: Expense[] = [];

export const INITIAL_CONTACTS: Contact[] = [];

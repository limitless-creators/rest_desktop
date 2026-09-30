import Decimal from 'decimal.js';
import type { GeneralSale, Invoice } from '../types';

export function localDateKey(date = new Date()): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export function salesForDay(sales: GeneralSale[], invoices: Invoice[], day = localDateKey()) {
  const directSales = sales.filter(sale => sale.saleDate === day);
  const paidInvoices = invoices.filter(invoice => invoice.status === 'Paid' && invoice.issueDate === day);
  const amounts = [...directSales.map(sale => sale.totalAmount), ...paidInvoices.map(invoice => invoice.amount)];
  return {
    total: amounts.reduce((sum, amount) => sum.plus(amount), new Decimal(0)).toDecimalPlaces(2).toNumber(),
    count: directSales.length + paidInvoices.length,
  };
}

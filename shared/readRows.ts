import { cachedRead, collectPages, PAGE_SIZE } from './pagination.ts';

export interface ReadOptions {
  /** Omit to explicitly read all pages, e.g. for reports and aggregate indicators. */
  page?: number;
  search?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}
const dateColumns: Record<string, string> = {
  invoices: 'issue_date', quotes: 'issue_date', receipts: 'payment_date',
  expenses: 'expense_date', general_sales: 'sale_date',
};
const searchColumns: Record<string, string> = {
  invoices: 'client', quotes: 'client', receipts: 'client', expenses: 'merchant',
  stock_items: 'name', contacts: 'name', debt_clients: 'full_name', general_sales: 'product_name',
};

// Structural adapter supports the different supabase-js versions in web and Expo.
export function readRows(client: { from: (table: string) => any }, table: string, userId: string,
  select: string, order: string[], options: ReadOptions = {}): Promise<any[]> {
  if (options.page !== undefined && (!Number.isSafeInteger(options.page) || options.page < 0)) throw new Error('Invalid page');
  const key = JSON.stringify([table, userId, select, order, options]);
  const read = async (from: number, to: number) => {
    let query = client.from(table).select(select, from === 0 ? { count: 'exact' } : undefined).eq('user_id', userId);
    for (const column of order) query = query.order(column, { ascending: column === 'name' });
    query = query.order('id', { ascending: true });
    if (options.status) query = query.eq('status', options.status);
    if (options.search) query = query.ilike(searchColumns[table], `%${options.search.replace(/[\\%_]/g, '\\$&')}%`);
    if (options.fromDate && dateColumns[table]) query = query.gte(dateColumns[table], options.fromDate);
    if (options.toDate && dateColumns[table]) query = query.lte(dateColumns[table], options.toDate);
    const result = await query.range(from, to);
    return { ...result, data: result.data ?? [] };
  };
  return cachedRead(key, async () => {
    if (options.page === undefined) return collectPages(read);
    const result = await read(options.page * PAGE_SIZE, (options.page + 1) * PAGE_SIZE - 1);
    if (result.error) throw result.error;
    return result.data;
  });
}

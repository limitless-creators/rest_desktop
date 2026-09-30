export const PAGE_SIZE = 100;
export interface PageResult<T> { data: T[]; error: unknown; count?: number | null }
/** Explicit pagination for complete reports. Never return a successful partial result. */
export async function collectPages<T>(read: (from: number, to: number) => PromiseLike<PageResult<T>>): Promise<T[]> {
  const rows: T[] = [];
  const seen = new Set<unknown>();
  let expected: number | null = null;
  for (;;) {
    const result = await read(rows.length, rows.length + PAGE_SIZE - 1);
    if (result.error) throw result.error;
    if (expected === null && result.count != null) expected = result.count;
    if (!result.data.length) {
      if (expected !== null && rows.length < expected) throw new Error('Os dados mudaram durante a leitura. Actualize novamente.');
      return rows;
    }
    for (const row of result.data) {
      if (row && typeof row === 'object' && 'id' in row) {
        if (seen.has(row.id)) throw new Error('Os dados mudaram durante a leitura. Actualize novamente.');
        seen.add(row.id);
      }
      rows.push(row);
    }
    if (expected !== null ? rows.length >= expected : result.data.length < PAGE_SIZE) return rows;
  }
}
const cache = new Map<string, { expires: number; value: Promise<unknown[]> }>();
export function invalidateReads() { cache.clear(); }
export function cachedRead<T>(key: string, read: () => Promise<T[]>): Promise<T[]> {
  for (const [k, entry] of cache) if (entry.expires <= Date.now()) cache.delete(k);
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as Promise<T[]>;
  const value = read();
  const entry = { expires: Date.now() + 30_000, value };
  cache.set(key, entry);
  value.catch(() => { if (cache.get(key) === entry) cache.delete(key); });
  return value;
}
/** Invalidate before AND after writes, including ambiguous network responses. */
export const databaseFetch: typeof fetch = async (input, init) => {
  const method = (init?.method ?? (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')).toUpperCase();
  const write = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  if (write) invalidateReads();
  try { return await fetch(input, init); }
  finally { if (write) invalidateReads(); }
};
